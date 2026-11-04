<?php

namespace App\Controllers\Api;

use App\Libraries\Shop;

/**
 * Toko (Dika) + Lotre Tarik. Setiap aksi berjalan dalam satu transaksi dengan baris game_progress dikunci (FOR UPDATE),
 * sehingga koin/gem tidak bisa terpotong dua kali atau minus walau tombol ditekan berulang. Balasan sukses selalu berisi
 * koin & gem terbaru + status Toko (Shop::state), jadi game cukup menimpa datanya tanpa menghitung sendiri.
 */
class ShopApi extends ApiController
{
    // Balasan standar setelah transaksi berhasil.
    private function done($db, int $uid, array $extra = [])
    {
        $p = $db->query('SELECT coins, gems FROM game_progress WHERE user_id = ?', [$uid])->getRowArray();
        return $this->respond(array_merge(
            ['success' => true, 'coins' => (int) $p['coins'], 'gems' => (int) $p['gems']],
            Shop::state($db, $uid),
            $extra
        ));
    }

    // Mulai transaksi + kunci baris progres. Mengembalikan baris progres, atau null bila tidak ada.
    private function lockProgress($db, int $uid): ?array
    {
        $db->transBegin();
        $p = $db->query('SELECT * FROM game_progress WHERE user_id = ? FOR UPDATE', [$uid])->getRowArray();
        return $p ?: null;
    }

    private function prepare(): array
    {
        $uid = $this->userId();
        if (!$uid) {
            return [null, null, $this->fail('Silakan login.', 401)];
        }
        $db = db_connect();
        if (!Shop::ensureSchema($db)) {
            return [null, null, $this->fail('Database Toko belum siap. Jalankan database/migration_v8.sql.', 500)];
        }
        return [$uid, $db, null];
    }

    // POST /shop/goodbye {qty: 1|6|10}
    public function goodbye()
    {
        [$uid, $db, $err] = $this->prepare();
        if ($err) {
            return $err;
        }
        $qty = $this->body()['qty'] ?? null;
        if (!is_int($qty) || !in_array($qty, Shop::GOODBYE_PACKS, true)) {
            return $this->fail('Paket Goodbye tidak valid.');
        }
        $cost = $qty * Shop::GOODBYE_PRICE;
        try {
            $p = $this->lockProgress($db, $uid);
            if (!$p) {
                throw new \RuntimeException('Progres tidak ditemukan.');
            }
            if ((int) $p['coins'] < $cost) {
                $db->transRollback();
                return $this->fail('Koin tidak cukup untuk ' . $qty . ' gelas Goodbye.');
            }
            $db->query('UPDATE game_progress SET coins = coins - ? WHERE user_id = ?', [$cost, $uid]);
            Shop::addInventory($db, $uid, 'goodbye', 'gelas', $qty);
            Shop::logPurchase($db, $uid, 'goodbye', 'gelas', $qty, $cost, 0);
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Pembelian gagal.');
            }
            $db->transCommit();
            return $this->done($db, $uid);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Beli Goodbye gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Pembelian gagal.', 500);
        }
    }

    // POST /shop/noodle {id: biasa|double|telur}
    public function noodle()
    {
        [$uid, $db, $err] = $this->prepare();
        if ($err) {
            return $err;
        }
        $id = $this->body()['id'] ?? '';
        if (!is_string($id) || !in_array($id, Shop::NOODLE_ITEMS, true)) {
            return $this->fail('Mie Kari tidak valid.');
        }
        try {
            $p = $this->lockProgress($db, $uid);
            if (!$p) {
                throw new \RuntimeException('Progres tidak ditemukan.');
            }
            if ((int) $p['coins'] < Shop::NOODLE_PRICE) {
                $db->transRollback();
                return $this->fail('Koin tidak cukup untuk Mie Kari.');
            }
            $db->query('UPDATE game_progress SET coins = coins - ? WHERE user_id = ?', [Shop::NOODLE_PRICE, $uid]);
            Shop::addInventory($db, $uid, 'noodle', $id, 1);
            Shop::logPurchase($db, $uid, 'noodle', $id, 1, Shop::NOODLE_PRICE, 0);
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Pembelian gagal.');
            }
            $db->transCommit();
            return $this->done($db, $uid);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Beli Mie Kari gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Pembelian gagal.', 500);
        }
    }

    // POST /outfit/buy {id}. Outfit langsung dipakai setelah dibeli (sama seperti perilaku game sebelumnya).
    public function outfitBuy()
    {
        [$uid, $db, $err] = $this->prepare();
        if ($err) {
            return $err;
        }
        $id = $this->body()['id'] ?? '';
        if (!is_string($id) || !isset(Shop::OUTFITS[$id])) {
            return $this->fail('Outfit tidak valid.');
        }
        $o = Shop::OUTFITS[$id];
        if (!empty($o['soon'])) {
            return $this->fail('Outfit ini belum dijual.');
        }
        $col = $o['cur'] === 'gem' ? 'gems' : 'coins';
        try {
            $p = $this->lockProgress($db, $uid);
            if (!$p) {
                throw new \RuntimeException('Progres tidak ditemukan.');
            }
            if (Shop::ownsOutfit($db, $uid, $id)) {
                $db->transRollback();
                return $this->fail('Outfit sudah dimiliki.');
            }
            if ((int) $p[$col] < $o['price']) {
                $db->transRollback();
                return $this->fail(($o['cur'] === 'gem' ? 'Gem' : 'Koin') . ' tidak cukup.');
            }
            $db->query("UPDATE game_progress SET $col = $col - ?, worn_outfit = ? WHERE user_id = ?", [$o['price'], $id, $uid]);
            $db->query('INSERT INTO game_outfits (user_id, outfit_id, source) VALUES (?, ?, ?)', [$uid, $id, 'shop']);
            Shop::logPurchase($db, $uid, 'outfit', $id, 1, $o['cur'] === 'coin' ? $o['price'] : 0, $o['cur'] === 'gem' ? $o['price'] : 0);
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Pembelian gagal.');
            }
            $db->transCommit();
            return $this->done($db, $uid);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Beli outfit gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Pembelian gagal.', 500);
        }
    }

    // POST /outfit/wear {id}. Hanya outfit yang sudah dimiliki (atau 'base').
    public function outfitWear()
    {
        [$uid, $db, $err] = $this->prepare();
        if ($err) {
            return $err;
        }
        $id = $this->body()['id'] ?? '';
        if (!is_string($id) || ($id !== 'base' && !isset(Shop::OUTFITS[$id]))) {
            return $this->fail('Outfit tidak valid.');
        }
        try {
            if (!Shop::ownsOutfit($db, $uid, $id)) {
                return $this->fail('Outfit belum dimiliki.');
            }
            $db->query('UPDATE game_progress SET worn_outfit = ? WHERE user_id = ?', [$id, $uid]);
            return $this->done($db, $uid);
        } catch (\Throwable $e) {
            log_message('error', 'Pakai outfit gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Gagal memakai outfit.', 500);
        }
    }

    // POST /lotre/pull {i: indeks segitiga 0..79}. Bayar tiket, buka segitiga, beri hadiah, simpan papan, semuanya satu transaksi.
    public function lotrePull()
    {
        [$uid, $db, $err] = $this->prepare();
        if ($err) {
            return $err;
        }
        $i     = $this->body()['i'] ?? null;
        $total = Shop::lotreTotal();
        if (!is_int($i) || $i < 0 || $i >= $total) {
            return $this->fail('Segitiga tidak valid.');
        }
        try {
            $p = $this->lockProgress($db, $uid);
            if (!$p) {
                throw new \RuntimeException('Progres tidak ditemukan.');
            }
            if ((int) $p['coins'] < Shop::LOTRE_PRICE) {
                $db->transRollback();
                return $this->fail('Koin tidak cukup untuk menarik tiket.');
            }

            // Papan pemain (dikunci). Dibuat bila belum ada, atau dikocok ulang bila rusak / tabel hadiah berubah / sudah habis.
            $row    = $db->query('SELECT sig, board, torn, rounds FROM game_lotre_boards WHERE user_id = ? FOR UPDATE', [$uid])->getRowArray();
            $sig    = Shop::lotreSig();
            $board  = $row ? json_decode($row['board'], true) : null;
            $torn   = $row ? json_decode($row['torn'], true) : null;
            $rounds = $row ? (int) $row['rounds'] : 0;
            $valid  = $row && (int) $row['sig'] === $sig && is_array($board) && is_array($torn) && count($board) === $total
                && !array_diff($torn, range(0, $total - 1)) && count($torn) < $total && count($torn) === count(array_unique($torn));
            if (!$valid) {
                $board = Shop::lotreShuffle();
                $torn  = [];
            }
            if (in_array($i, $torn, true)) {
                $db->transRollback();
                return $this->fail('Segitiga ini sudah dibuka.');
            }

            $n = (int) $board[$i];
            $z = Shop::lotrePrize($n);
            if (!$z) {
                throw new \RuntimeException('Hadiah nomor ' . $n . ' tidak ada.');
            }

            // Hadiah.
            $coinsWon = 0;
            $gemsWon  = 0;
            $dup      = false;
            if ($z['t'] === 'coin') {
                $coinsWon = $z['amt'];
            } elseif ($z['t'] === 'gem') {
                $gemsWon = $z['amt'];
            } elseif ($z['t'] === 'skin') {
                if (Shop::ownsOutfit($db, $uid, $z['id'])) {
                    $dup     = true;
                    $gemsWon = $z['dup'] ?? 0;   // skin sudah dimiliki: diganti gem
                } else {
                    $db->query('INSERT INTO game_outfits (user_id, outfit_id, source) VALUES (?, ?, ?)', [$uid, $z['id'], 'lotre']);
                }
            } elseif ($z['t'] === 'goodbye') {
                Shop::addInventory($db, $uid, 'goodbye', 'gelas', $z['amt']);
            } else {
                Shop::addInventory($db, $uid, 'noodle', $z['id'], $z['amt']);
            }

            $db->query(
                'UPDATE game_progress SET coins = coins - ? + ?, gems = gems + ? WHERE user_id = ?',
                [Shop::LOTRE_PRICE, $coinsWon, $gemsWon, $uid]
            );

            // Simpan papan. Bila segitiga ini yang terakhir, papan langsung diganti papan baru (putaran + 1).
            $torn[]  = $i;
            $renewed = count($torn) >= $total;
            if ($renewed) {
                $rounds++;
                $newBoard = Shop::lotreShuffle();
                $newTorn  = [];
            }
            $db->query(
                'INSERT INTO game_lotre_boards (user_id, sig, board, torn, rounds, last_n) VALUES (?, ?, ?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE sig = VALUES(sig), board = VALUES(board), torn = VALUES(torn), rounds = VALUES(rounds), last_n = VALUES(last_n)',
                [$uid, $sig, json_encode($renewed ? $newBoard : $board), json_encode($renewed ? $newTorn : array_values($torn)), $rounds, $n]
            );

            Shop::logPurchase($db, $uid, 'lotre', (string) $n, 1, Shop::LOTRE_PRICE, 0, $coinsWon, $gemsWon, Shop::lotrePrizeName($z) . ($dup ? ' (sudah dimiliki)' : ''));
            if ($db->transStatus() === false) {
                throw new \RuntimeException('Tarik tiket gagal.');
            }
            $db->transCommit();
            return $this->done($db, $uid, ['n' => $n, 'dup' => $dup, 'gemGain' => $gemsWon, 'renewed' => $renewed]);
        } catch (\Throwable $e) {
            $db->transRollback();
            log_message('error', 'Tarik lotre gagal: {m}', ['m' => $e->getMessage()]);
            return $this->fail('Tarik tiket gagal.', 500);
        }
    }
}
