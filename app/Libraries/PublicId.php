<?php

namespace App\Libraries;

/**
 * ID pengguna 10 karakter (huruf besar + angka, basis 36) yang dibentuk dari nomor urut akun di database
 * dan tanggal + jam pendaftarannya. Disimpan di game_users.public_id; kunci utama `id` (angka) tidak berubah,
 * jadi semua tabel lain tetap menunjuk ke `id`.
 *
 * Susunan (10 karakter):  SSSS  Y  M  D  H  mm
 *   SSSS = nomor urut akun (game_users.id) dalam basis 36, 4 karakter, diisi 0 di depan (maks 1.679.615 akun)
 *   Y    = tahun pendaftaran - 2026 (0 = 2026, 1 = 2027, ... 35 = 2061; sesudah itu berulang dari 0)
 *   M    = bulan 1-12  -> 1-9, A, B, C
 *   D    = tanggal 1-31 -> 1-9, A-V
 *   H    = jam 0-23     -> 0-9, A-N
 *   mm   = menit 00-59 (dua angka)
 *
 * Contoh: akun nomor 1, daftar 29 Okt 2026 13:35  ->  0001 0 A T D 35  =  00010ATD35
 * Karena nomor urut selalu ada di depan, dua akun tidak pernah mendapat ID yang sama.
 */
class PublicId
{
    public const LENGTH = 10;
    private const SEQ_DIGITS = 4;
    private const BASE_YEAR = 2026;

    /**
     * @param int    $seq       game_users.id
     * @param string $createdAt game_users.created_at, format "YYYY-MM-DD HH:MM:SS" (dipakai apa adanya, tanpa konversi zona waktu)
     */
    public static function make(int $seq, string $createdAt): string
    {
        if ($seq < 1 || $seq >= 36 ** self::SEQ_DIGITS) {
            throw new \RangeException('Nomor urut akun di luar batas ID 10 karakter: ' . $seq);
        }
        if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/', $createdAt, $m)) {
            throw new \InvalidArgumentException('Format tanggal pendaftaran tidak dikenal: ' . $createdAt);
        }
        [, $y, $mo, $d, $h, $mi] = array_map('intval', $m);
        if ($mo < 1 || $mo > 12 || $d < 1 || $d > 31 || $h > 23 || $mi > 59) {
            throw new \InvalidArgumentException('Tanggal pendaftaran tidak valid: ' . $createdAt);
        }
        $b36 = static fn (int $n): string => strtoupper(base_convert((string) $n, 10, 36));

        return str_pad($b36($seq), self::SEQ_DIGITS, '0', STR_PAD_LEFT)
            . $b36((($y - self::BASE_YEAR) % 36 + 36) % 36)
            . $b36($mo)
            . $b36($d)
            . $b36($h)
            . str_pad((string) $mi, 2, '0', STR_PAD_LEFT);
    }

    // Menambah kolom public_id (+ indeks unik) bila database lama belum dimigrasi (database/migration_v7.sql).
    // ALTER TABLE meng-commit otomatis, jadi jangan dipanggil di dalam transaksi. Mengembalikan false jika gagal.
    public static function ensureColumn($db): bool
    {
        try {
            if (!$db->fieldExists('public_id', 'game_users')) {
                $db->query('ALTER TABLE game_users ADD COLUMN public_id CHAR(10) NULL DEFAULT NULL, ADD UNIQUE KEY uq_game_users_public_id (public_id)');
            }
            return true;
        } catch (\Throwable $e) {
            log_message('error', 'Kolom public_id gagal dibuat: {m}', ['m' => $e->getMessage()]);
            return false;
        }
    }

    // Mengisi public_id akun lama yang masih kosong (dari id + created_at masing-masing). Aman dipanggil berulang;
    // akun yang sudah punya ID tidak disentuh. Maksimal $limit akun per panggilan.
    public static function backfill($db, int $limit = 500): void
    {
        try {
            $rows = $db->query('SELECT id, created_at FROM game_users WHERE public_id IS NULL ORDER BY id LIMIT ' . max(1, $limit))->getResultArray();
            foreach ($rows as $r) {
                try {
                    $db->query('UPDATE game_users SET public_id = ? WHERE id = ? AND public_id IS NULL', [self::make((int) $r['id'], (string) $r['created_at']), (int) $r['id']]);
                } catch (\Throwable $e) {
                    log_message('error', 'public_id akun {id} gagal diisi: {m}', ['id' => $r['id'], 'm' => $e->getMessage()]);
                }
            }
        } catch (\Throwable $e) {
            log_message('error', 'Pengisian public_id gagal: {m}', ['m' => $e->getMessage()]);
        }
    }
}
