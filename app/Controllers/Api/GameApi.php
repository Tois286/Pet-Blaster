<?php

namespace App\Controllers\Api;

class GameApi extends ApiController
{
    private const MAX_WAVE = 10;
    private const AFK_CAP = 28800; // hadiah AFK menumpuk maksimal 8 jam

    // Aturan upgrade: biaya koin, tambahan per pembelian, dan batas nilai.
    private const UPGRADES = [
        'damage'    => ['cost' => 100, 'step' => 5,  'max' => 1000],
        'fire_rate' => ['cost' => 150, 'step' => 1,  'max' => 10],
        'max_hp'    => ['cost' => 120, 'step' => 10, 'max' => 10000],
    ];

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

    public function profile()
    {
        $uid = $this->userId();
        if (!$uid) {
            return $this->fail('Silakan login.', 401);
        }
        $db = db_connect();
        $this->ensurePetStarColumns($db);
        $user = $db->table('game_users')->select('username')->where('id', $uid)->get()->getRowArray();
        $progress = $db->table('game_progress')->where('user_id', $uid)->get()->getRowArray();
        if (!$user || !$progress) {
            return $this->fail('Data tidak ditemukan.', 404);
        }
        return $this->respond(['success' => true, 'username' => $user['username'], 'progress' => $progress, 'afk' => $this->afkPending($progress)]);
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
            if ((int) $p['coins'] < $rule['cost']) {
                $db->transRollback();
                return $this->fail('Koin tidak cukup.');
            }
            $db->table('game_progress')->where('user_id', $uid)->update([
                'coins' => (int) $p['coins'] - $rule['cost'],
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
        db_connect()->table('game_sessions')->insert([
            'user_id' => $uid, 'token' => $token, 'started_at' => time(),
        ]);
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

            $db->query('UPDATE game_sessions SET finished = 1, coins_awarded = ? WHERE id = ?', [$coins, $s['id']]);
            $db->query(
                'UPDATE game_progress SET coins = coins + ?, level = GREATEST(level, ?), best_wave = GREATEST(best_wave, ?) WHERE user_id = ?',
                [$coins, 1 + intdiv($wave, 3), $wave, $uid]
            );
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Gagal menyimpan hadiah.');
            }
            $db->transCommit();
            return $this->respond(['success' => true, 'coins' => $coins, 'wave' => $wave]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Hadiah gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Gagal menyimpan hadiah.', 500);
        }
    }
}
