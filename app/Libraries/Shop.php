<?php

namespace App\Libraries;

/**
 * Katalog + logika Toko (Goodbye, Mie Kari, outfit/skin) dan Lotre Tarik. Semua harga, hadiah, dan pengocokan papan dihitung di sini
 * (server), jadi pemain tidak bisa mengubahnya dari browser. Data tersimpan di tabel game_inventory, game_outfits, game_lotre_boards,
 * game_purchases dan kolom game_progress.worn_outfit (disiapkan oleh `php spark game:migrate`, lihat SchemaUpdater).
 *
 * PENTING: katalog di bawah harus sama dengan tabel di game_ui.js (GOODBYE, NOODLE, OUTFITS) dan game_lotre.js (LOTRE.prizes).
 * JS hanya untuk tampilan; harga dan hadiah asli selalu dari file ini.
 */
class Shop
{
    public const GOODBYE_PRICE = 500;
    public const GOODBYE_PACKS = [1, 6, 10];
    public const NOODLE_PRICE  = 1000;
    public const NOODLE_ITEMS  = ['biasa', 'double', 'telur'];

    // Outfit yang dijual di Toko. cur: coin | gem. 'soon' = belum dijual (hanya bisa didapat dari hadiah Lotre).
    public const OUTFITS = [
        'elite'     => ['cur' => 'coin', 'price' => 5000],
        'master'    => ['cur' => 'coin', 'price' => 15000],
        'epic'      => ['cur' => 'gem', 'price' => 150],
        'legendary' => ['cur' => 'gem', 'price' => 500],
        'mythical'  => ['cur' => 'gem', 'price' => 1200],
    ];

    public const LOTRE_PRICE = 250;
    public const LOTRE_COLS  = 8;

    /**
     * Hadiah Lotre. n = nomor kotak, stock = jumlah segitiga di papan yang menyimpan nomor ini, t = jenis hadiah:
     * coin (amt) | gem (amt) | goodbye (amt gelas) | noodle (id, amt) | skin (id outfit, dup = gem pengganti bila skin sudah dimiliki).
     * Total stock = jumlah segitiga per papan (sekarang 80). Mengubah tabel ini otomatis mengocok ulang papan pemain yang sedang berjalan.
     */
    public static function lotrePrizes(): array
    {
        $p = [
            ['n' => 1, 't' => 'skin', 'id' => 'epic', 'dup' => 75, 'stock' => 1],
            ['n' => 2, 't' => 'gem', 'amt' => 50, 'stock' => 1],
            ['n' => 3, 't' => 'noodle', 'id' => 'telur', 'amt' => 1, 'stock' => 1],
            ['n' => 4, 't' => 'gem', 'amt' => 25, 'stock' => 1],
            ['n' => 5, 't' => 'goodbye', 'amt' => 2, 'stock' => 1],
            ['n' => 6, 't' => 'coin', 'amt' => 750, 'stock' => 1],
        ];
        // [nomor, jenis, jumlah, stock]
        foreach (
            [
                [7, 'coin', 50, 3],
                [8, 'coin', 50, 3],
                [9, 'coin', 75, 3],
                [10, 'coin', 75, 3],
                [11, 'coin', 100, 3],
                [12, 'coin', 100, 3],
                [13, 'gem', 3, 3],
                [14, 'gem', 5, 3],
                [15, 'coin', 125, 3],
                [16, 'coin', 150, 3],
                [17, 'coin', 50, 3],
                [18, 'coin', 50, 3],
                [19, 'coin', 75, 3],
                [20, 'coin', 75, 3],
                [21, 'coin', 100, 3],
                [22, 'gem', 3, 3],
                [23, 'gem', 5, 3],
                [24, 'coin', 150, 3],
                [25, 'coin', 50, 3],
                [26, 'coin', 75, 3],
                [27, 'coin', 100, 3],
                [28, 'coin', 100, 3],
                [29, 'gem', 4, 3],
                [30, 'coin', 200, 3],
                [31, 'coin', 300, 1],
                [32, 'goodbye', 1, 1],
            ] as [$n, $t, $amt, $stock]
        ) {
            $p[] = ['n' => $n, 't' => $t, 'amt' => $amt, 'stock' => $stock];
        }
        return $p;
    }

    public static function lotreTotal(): int
    {
        return array_sum(array_column(self::lotrePrizes(), 'stock'));
    }

    // Kode tabel hadiah; berubah bila hadiah / jumlah kolom diubah, sehingga papan lama dikocok ulang.
    public static function lotreSig(): int
    {
        return crc32(json_encode(self::lotrePrizes()) . self::LOTRE_COLS);
    }

    public static function lotrePrize(int $n): ?array
    {
        foreach (self::lotrePrizes() as $z) {
            if ($z['n'] === $n) {
                return $z;
            }
        }
        return null;
    }

    public static function lotrePrizeName(array $z): string
    {
        switch ($z['t']) {
            case 'coin':
                return $z['amt'] . ' koin';
            case 'gem':
                return $z['amt'] . ' gem';
            case 'skin':
                return 'Skin ' . $z['id'];
            case 'goodbye':
                return 'Goodbye x' . $z['amt'];
            default:
                return 'Mie Kari ' . $z['id'] . ' x' . $z['amt'];
        }
    }

    // Papan baru: tiap nomor muncul sebanyak stock-nya, posisinya diacak dengan random_int.
    public static function lotreShuffle(): array
    {
        $b = [];
        foreach (self::lotrePrizes() as $z) {
            for ($k = 0; $k < $z['stock']; $k++) {
                $b[] = $z['n'];
            }
        }
        for ($i = count($b) - 1; $i > 0; $i--) {
            $j = random_int(0, $i);
            [$b[$i], $b[$j]] = [$b[$j], $b[$i]];
        }
        return $b;
    }

    // ---- Pembaca ----

    // Status Toko pemain untuk dikirim ke game: barang, outfit, dan papan lotre. Papan penuh/rusak/lama tidak dikocok di sini (hanya saat menarik).
    public static function state($db, int $uid): array
    {
        $out = [
            'goodbye' => 0,
            'noodle'  => array_fill_keys(self::NOODLE_ITEMS, 0),
            'outfits' => [],
            'worn'    => 'base',
            'lotre'   => ['total' => self::lotreTotal(), 'torn' => [], 'rounds' => 0, 'last' => null, 'renewed' => false],
        ];
        try {
            foreach ($db->query('SELECT item_type, item_id, qty FROM game_inventory WHERE user_id = ?', [$uid])->getResultArray() as $r) {
                if ($r['item_type'] === 'goodbye') {
                    $out['goodbye'] += (int) $r['qty'];
                } elseif ($r['item_type'] === 'noodle' && isset($out['noodle'][$r['item_id']])) {
                    $out['noodle'][$r['item_id']] = (int) $r['qty'];
                }
            }
            foreach ($db->query('SELECT outfit_id FROM game_outfits WHERE user_id = ?', [$uid])->getResultArray() as $r) {
                $out['outfits'][] = $r['outfit_id'];
            }
            $w = $db->query('SELECT worn_outfit FROM game_progress WHERE user_id = ?', [$uid])->getRowArray();
            $worn = $w['worn_outfit'] ?? 'base';
            $out['worn'] = ($worn === 'base' || in_array($worn, $out['outfits'], true)) ? $worn : 'base';

            $b = $db->query('SELECT sig, board, torn, rounds, last_n FROM game_lotre_boards WHERE user_id = ?', [$uid])->getRowArray();
            if ($b && (int) $b['sig'] === self::lotreSig()) {
                $board = json_decode($b['board'], true);
                $torn  = json_decode($b['torn'], true);
                if (is_array($board) && is_array($torn) && count($board) === self::lotreTotal()) {
                    // Hanya nomor yang SUDAH dibuka yang dikirim: pasangan [indeks segitiga, nomor]. Susunan papan lainnya tetap rahasia di server.
                    foreach ($torn as $i) {
                        if (is_int($i) && isset($board[$i])) {
                            $out['lotre']['torn'][] = [$i, (int) $board[$i]];
                        }
                    }
                    $out['lotre']['rounds'] = (int) $b['rounds'];
                    $out['lotre']['last']   = $b['last_n'] !== null ? (int) $b['last_n'] : null;
                }
            }
        } catch (\Throwable $e) {
            log_message('error', 'Status Toko gagal dibaca: {m}', ['m' => $e->getMessage()]);
        }
        return $out;
    }

    // ---- Penulis (panggil di dalam transaksi) ----

    public static function addInventory($db, int $uid, string $type, string $id, int $qty): void
    {
        $db->query(
            'INSERT INTO game_inventory (user_id, item_type, item_id, qty) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE qty = qty + VALUES(qty)',
            [$uid, $type, $id, $qty]
        );
    }

    public static function ownsOutfit($db, int $uid, string $id): bool
    {
        if ($id === 'base') {
            return true;
        }
        return (bool) $db->query('SELECT 1 FROM game_outfits WHERE user_id = ? AND outfit_id = ?', [$uid, $id])->getRowArray();
    }

    public static function logPurchase($db, int $uid, string $kind, string $item, int $qty, int $coinsSpent, int $gemsSpent, int $coinsWon = 0, int $gemsWon = 0, ?string $detail = null): void
    {
        $db->query(
            'INSERT INTO game_purchases (user_id, kind, item, qty, coins_spent, gems_spent, coins_won, gems_won, detail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [$uid, $kind, $item, $qty, $coinsSpent, $gemsSpent, $coinsWon, $gemsWon, $detail]
        );
    }
}
