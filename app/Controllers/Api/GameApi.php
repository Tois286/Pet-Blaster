<?php

namespace App\Controllers\Api;

use App\Libraries\PublicId;

class GameApi extends ApiController
{
    private const MAX_WAVE = 10;
    private const AFK_CAP = 28800; // hadiah AFK menumpuk maksimal 8 jam

    // Aturan upgrade: harga dasar (cost), tambahan per pembelian (step), batas nilai (max), nilai awal (start),
    // dan kenaikan harga per pembelian dalam persen dari harga dasar (grow). Harga = cost x (1 + grow% x jumlah pembelian).
    // Ubah juga UPG_RULE di game.js (hanya tampilan; harga asli selalu dihitung di sini).
    private const UPGRADES = [
        'damage'    => ['cost' => 100, 'step' => 5,  'max' => 1000,  'start' => 10,  'grow' => 10],
        'fire_rate' => ['cost' => 150, 'step' => 1,  'max' => 10,    'start' => 1,   'grow' => 35],
        'max_hp'    => ['cost' => 120, 'step' => 10, 'max' => 10000, 'start' => 100, 'grow' => 2],
    ];

    // Harga upgrade berikutnya berdasarkan nilai saat ini (perhitungan bilangan bulat, sama persis dengan di game.js).
    private function upgradeCost(string $type, int $value): int
    {
        $r = self::UPGRADES[$type];
        $bought = intdiv(max(0, $value - $r['start']), $r['step']);
        return intdiv($r['cost'] * (100 + $r['grow'] * $bought) + 50, 100);
    }

    // Bintang pet (permanen, tersimpan di database per akun). Semua pet mulai dari bintang 1.
    private const PET_ELEMENTS = ['api', 'air', 'tanah', 'angin'];
    private const PET_STAR_MAX = 5;
    // Biaya koin untuk naik dari bintang N ke N+1 (indeks = bintang saat ini). Ubah juga STAR_COST di game.js (hanya tampilan).
    private const PET_STAR_COST = [1 => 500, 2 => 1500, 3 => 4000, 4 => 10000];

    // Menambah kolom bintang jika database lama belum dimigrasi (database/migration_v5.sql). Mengembalikan false jika gagal.
    private function ensurePetStarColumns($db): bool
    {
        try {
            foreach (self::PET_ELEMENTS as $el) {
                if (!$db->fieldExists('star_' . $el, 'game_progress')) {
                    $db->query('ALTER TABLE game_progress ADD COLUMN star_' . $el . ' TINYINT UNSIGNED NOT NULL DEFAULT 1');
                }
            }
            return true;
        } catch (\Throwable $e) {
            log_message('error', 'Kolom bintang pet gagal dibuat: {m}', ['m' => $e->getMessage()]);
            return false;
        }
    }

    // ---- Sistem gem ----
    // Gem HANYA didapat saat bos stage 5, 10, 15, 20 (dan stage 25 = Boss Final) dikalahkan, yaitu saat stage itu dimenangkan.
    // Pulau 1 (Terra): stage 5/10/15/20 = 50 gem, stage 25 = 100 gem.
    // Tiap pulau berikutnya: stage 5/10/15/20 bertambah 25 gem (Aquaria 75, Ignis 100, Zephyria 125), stage 25 bertambah 35 gem (135, 170, 205).
    // Ubah juga GEM_RULE di game.js (hanya tampilan; jumlah gem asli selalu dihitung di sini).
    private const GEM_RULE = ['base' => 50, 'island' => 25, 'final_base' => 100, 'final_island' => 35];
    private const ISLAND_COUNT = 4;
    private const STAGES_PER_ISLAND = 25;
    private const WAVES_PER_STAGE = 10;
    private const FINAL_STAGE_WAVES = 15;
    // true = gem tiap bos hanya didapat SEKALI per akun (kemenangan pertama). false = gem didapat lagi setiap bos dikalahkan ulang.
    private const GEM_ONLY_FIRST_CLEAR = true;

    // Jumlah gem untuk bos stage tertentu (island dihitung dari 0 = Terra). 0 bila stage itu bukan stage bos.
    private function gemReward(int $island, int $stage): int
    {
        if ($island < 0 || $island >= self::ISLAND_COUNT || $stage < 5 || $stage > self::STAGES_PER_ISLAND || $stage % 5 !== 0) {
            return 0;
        }
        $r = self::GEM_RULE;
        return $stage === self::STAGES_PER_ISLAND
            ? $r['final_base'] + $r['final_island'] * $island
            : $r['base'] + $r['island'] * $island;
    }

    // Menyiapkan tabel/kolom gem jika database lama belum dimigrasi (database/migration_v6.sql). Mengembalikan false jika gagal;
    // dalam kasus itu game tetap jalan normal, hanya saja gem tidak diberikan. Jangan dipanggil di dalam transaksi (ALTER TABLE meng-commit otomatis).
    private function ensureGemSchema($db): bool
    {
        try {
            if (!$db->fieldExists('gems', 'game_progress')) {
                $db->query('ALTER TABLE game_progress ADD COLUMN gems BIGINT UNSIGNED NOT NULL DEFAULT 0');
            }
            if (!$db->fieldExists('island', 'game_sessions')) {
                $db->query('ALTER TABLE game_sessions ADD COLUMN island TINYINT UNSIGNED NULL DEFAULT NULL, ADD COLUMN stage TINYINT UNSIGNED NULL DEFAULT NULL, ADD COLUMN gems_awarded INT UNSIGNED NOT NULL DEFAULT 0');
            }
            $db->query(
                'CREATE TABLE IF NOT EXISTS game_boss_clears (
                    user_id BIGINT UNSIGNED NOT NULL,
                    island TINYINT UNSIGNED NOT NULL,
                    stage TINYINT UNSIGNED NOT NULL,
                    gems INT UNSIGNED NOT NULL,
                    cleared_at INT UNSIGNED NOT NULL,
                    PRIMARY KEY (user_id, island, stage),
                    CONSTRAINT fk_bossclear_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
                )'
            );
            return true;
        } catch (\Throwable $e) {
            log_message('error', 'Skema gem gagal disiapkan: {m}', ['m' => $e->getMessage()]);
            return false;
        }
    }

    public function profile()
    {
        $uid = $this->userId();
        if (!$uid) {
            return $this->fail('Silakan login.', 401);
        }
        $db = db_connect();
        $this->ensurePetStarColumns($db);
        $gemOk = $this->ensureGemSchema($db);
        if (PublicId::ensureColumn($db)) {
            PublicId::backfill($db);   // akun lama (sebelum ada public_id) diberi ID dari nomor urut + tanggal/jam daftarnya
        }
        $user = $db->table('game_users')->select('username')->where('id', $uid)->get()->getRowArray();
        $pub = null;
        try {
            $row = $db->query('SELECT public_id FROM game_users WHERE id = ?', [$uid])->getRowArray();
            $pub = $row['public_id'] ?? null;
        } catch (\Throwable $e) {
            log_message('error', 'public_id gagal dibaca: {m}', ['m' => $e->getMessage()]);
        }
        $progress = $db->table('game_progress')->where('user_id', $uid)->get()->getRowArray();
        if (!$user || !$progress) {
            return $this->fail('Data tidak ditemukan.', 404);
        }
        // Bos yang gemnya sudah diambil, format "pulau-stage" (pulau dari 0). Dipakai tampilan untuk menandai hadiah yang sudah didapat.
        $gemClears = [];
        if ($gemOk) {
            try {
                foreach ($db->table('game_boss_clears')->select('island, stage')->where('user_id', $uid)->get()->getResultArray() as $c) {
                    $gemClears[] = (int) $c['island'] . '-' . (int) $c['stage'];
                }
            } catch (\Throwable $e) {
                log_message('error', 'Daftar bos gagal dibaca: {m}', ['m' => $e->getMessage()]);
            }
        }
        return $this->respond(['success' => true, 'username' => $user['username'], 'progress' => $progress, 'afk' => $this->afkPending($progress), 'gemClears' => $gemClears, 'publicId' => $pub]);
    }

    // Koin AFK = menit berlalu (maks 8 jam) x (1 + rekor gelombang). Dihitung penuh di server.
    private function afkPending(array $p): int
    {
        $last = (int) ($p['last_claim'] ?? 0);
        if ($last <= 0) {
            return 0;
        }
        $secs = min(self::AFK_CAP, max(0, time() - $last));
        return intdiv($secs, 60) * (1 + (int) $p['best_wave']);
    }

    public function afkClaim()
    {
        $uid = $this->userId();
        if (!$uid) {
            return $this->fail('Silakan login.', 401);
        }
        $db = db_connect();
        $db->transBegin();
        try {
            $p = $db->query('SELECT * FROM game_progress WHERE user_id = ? FOR UPDATE', [$uid])->getRowArray();
            if (!$p) {
                throw new \RuntimeException('Progres tidak ditemukan.');
            }
            $coins = $this->afkPending($p);
            if ($coins < 1) {
                $db->transRollback();
                return $this->fail('Belum ada hadiah AFK. Coba lagi nanti.');
            }
            $db->query('UPDATE game_progress SET coins = coins + ?, last_claim = ? WHERE user_id = ?', [$coins, time(), $uid]);
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Gagal klaim AFK.');
            }
            $db->transCommit();
            return $this->respond(['success' => true, 'coins' => $coins]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'AFK gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Gagal klaim AFK.', 500);
        }
    }

    public function upgrade()
    {
        $uid = $this->userId();
        if (!$uid) {
            return $this->fail('Silakan login.', 401);
        }
        $type = $this->body()['type'] ?? '';
        if (!is_string($type) || !isset(self::UPGRADES[$type])) {
            return $this->fail('Upgrade tidak valid.');
        }
        $rule = self::UPGRADES[$type];

        $db = db_connect();
        $db->transBegin();
        try {
            $p = $db->query('SELECT * FROM game_progress WHERE user_id = ? FOR UPDATE', [$uid])->getRowArray();
            if (!$p) {
                throw new \RuntimeException('Progres tidak ditemukan.');
            }
            if ((int) $p[$type] >= $rule['max']) {
                $db->transRollback();
                return $this->fail('Upgrade mencapai batas.');
            }
            $cost = $this->upgradeCost($type, (int) $p[$type]);
            if ((int) $p['coins'] < $cost) {
                $db->transRollback();
                return $this->fail('Koin tidak cukup.');
            }
            $db->table('game_progress')->where('user_id', $uid)->update([
                'coins' => (int) $p['coins'] - $cost,
                $type   => min($rule['max'], (int) $p[$type] + $rule['step']),
            ]);
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Upgrade gagal.');
            }
            $db->transCommit();
            return $this->respond(['success' => true, 'message' => 'Upgrade berhasil.']);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Upgrade gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Upgrade gagal.', 500);
        }
    }

    // Naikkan bintang satu pet (api/air/tanah/angin). Biaya dan batas dicek penuh di server; hasilnya permanen.
    public function petStar()
    {
        $uid = $this->userId();
        if (!$uid) {
            return $this->fail('Silakan login.', 401);
        }
        $el = $this->body()['el'] ?? '';
        if (!is_string($el) || !in_array($el, self::PET_ELEMENTS, true)) {
            return $this->fail('Pet tidak valid.');
        }
        $col = 'star_' . $el;

        $db = db_connect();
        if (!$this->ensurePetStarColumns($db)) {
            return $this->fail('Database belum diperbarui. Jalankan database/migration_v5.sql.', 500);
        }
        $db->transBegin();
        try {
            $p = $db->query('SELECT * FROM game_progress WHERE user_id = ? FOR UPDATE', [$uid])->getRowArray();
            if (!$p) {
                throw new \RuntimeException('Progres tidak ditemukan.');
            }
            $star = max(1, (int) $p[$col]);
            if ($star >= self::PET_STAR_MAX) {
                $db->transRollback();
                return $this->fail('Bintang pet sudah maksimal.');
            }
            $cost = self::PET_STAR_COST[$star];
            if ((int) $p['coins'] < $cost) {
                $db->transRollback();
                return $this->fail('Koin tidak cukup.');
            }
            $db->table('game_progress')->where('user_id', $uid)->update([
                'coins' => (int) $p['coins'] - $cost,
                $col    => $star + 1,
            ]);
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Upgrade bintang gagal.');
            }
            $db->transCommit();
            return $this->respond(['success' => true, 'el' => $el, 'star' => $star + 1]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Upgrade bintang gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Upgrade bintang gagal.', 500);
        }
    }

    // Membuka sesi pertempuran; token dipakai untuk memvalidasi hadiah.
    public function battleStart()
    {
        $uid = $this->userId();
        if (!$uid) {
            return $this->fail('Silakan login.', 401);
        }
        $token = bin2hex(random_bytes(16));
        $db = db_connect();
        $row = ['user_id' => $uid, 'token' => $token, 'started_at' => time()];
        // Pulau dan stage yang dimainkan disimpan di sesi supaya gem bisa dihitung server saat pertempuran selesai.
        $d = $this->body();
        $island = is_numeric($d['island'] ?? null) ? (int) $d['island'] : -1;
        $stage  = is_numeric($d['stage'] ?? null) ? (int) $d['stage'] : -1;
        if ($island >= 0 && $island < self::ISLAND_COUNT && $stage >= 1 && $stage <= self::STAGES_PER_ISLAND && $this->ensureGemSchema($db)) {
            $row['island'] = $island;
            $row['stage']  = $stage;
        }
        $db->table('game_sessions')->insert($row);
        return $this->respond(['success' => true, 'session' => $token]);
    }

    // Server menghitung hadiah sendiri dan membatasi klaim sesuai durasi sesi.
    public function battleFinish()
    {
        $uid = $this->userId();
        if (!$uid) {
            return $this->fail('Silakan login.', 401);
        }
        $d = $this->body();
        $token = (string) ($d['session'] ?? '');
        $wave  = (int) ($d['wave'] ?? 0);
        $kills = (int) ($d['kills'] ?? 0);
        if (!preg_match('/^[a-f0-9]{32}$/', $token) || $wave < 1 || $wave > self::MAX_WAVE || $kills < 0) {
            return $this->fail('Data pertempuran tidak valid.');
        }

        $db = db_connect();
        $db->transBegin();
        try {
            $s = $db->query(
                'SELECT * FROM game_sessions WHERE token = ? AND user_id = ? AND finished = 0 FOR UPDATE',
                [$token, $uid]
            )->getRowArray();
            if (!$s) {
                $db->transRollback();
                return $this->fail('Sesi tidak ditemukan atau sudah selesai.', 404);
            }
            $elapsed = max(0, time() - (int) $s['started_at']);
            $wave    = min($wave, intdiv($elapsed, 5) + 1);        // minimal ~5 detik per gelombang (mode x2)
            $kills   = min($kills, $elapsed * 3 + 3, 400);         // batas wajar jumlah kill
            $coins   = $kills * 5 + $wave * 10;

            // Gem: hanya bila stage dimenangkan, stage itu stage bos (5/10/15/20/25), dan durasi sesi masuk akal untuk jumlah wave stage itu.
            $gems = 0;
            $gemClaimed = false;   // true = bos ini sudah pernah memberi gem (mode sekali per akun), jadi kali ini tidak ada gem
            $island = isset($s['island']) ? (int) $s['island'] : -1;
            $stage  = isset($s['stage']) ? (int) $s['stage'] : -1;
            $reward = !empty($d['won']) ? $this->gemReward($island, $stage) : 0;
            if ($reward > 0) {
                $stageWaves = $stage >= self::STAGES_PER_ISLAND ? self::FINAL_STAGE_WAVES : self::WAVES_PER_STAGE;
                if ($elapsed >= ($stageWaves - 1) * 5) {   // sama dengan batas ~5 detik per gelombang di atas
                    $db->query(
                        'INSERT IGNORE INTO game_boss_clears (user_id, island, stage, gems, cleared_at) VALUES (?, ?, ?, ?, ?)',
                        [$uid, $island, $stage, $reward, time()]
                    );
                    $firstTime = $db->affectedRows() > 0;
                    if ($firstTime || !self::GEM_ONLY_FIRST_CLEAR) {
                        $gems = $reward;
                    } else {
                        $gemClaimed = true;
                    }
                }
            }

            $db->query('UPDATE game_sessions SET finished = 1, coins_awarded = ? WHERE id = ?', [$coins, $s['id']]);
            $db->query(
                'UPDATE game_progress SET coins = coins + ?, level = GREATEST(level, ?), best_wave = GREATEST(best_wave, ?) WHERE user_id = ?',
                [$coins, 1 + intdiv($wave, 3), $wave, $uid]
            );
            if ($gems > 0) {
                $db->query('UPDATE game_progress SET gems = gems + ? WHERE user_id = ?', [$gems, $uid]);
                $db->query('UPDATE game_sessions SET gems_awarded = ? WHERE id = ?', [$gems, $s['id']]);
            }
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Gagal menyimpan hadiah.');
            }
            $db->transCommit();
            return $this->respond(['success' => true, 'coins' => $coins, 'wave' => $wave, 'gems' => $gems, 'gemClaimed' => $gemClaimed]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Hadiah gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Gagal menyimpan hadiah.', 500);
        }
    }
}
