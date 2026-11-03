<?php

namespace App\Libraries;

/**
 * Absensi harian 7 hari yang berulang terus: hari 1 -> 7, sesudah hari 7 kembali ke hari 1, dan seterusnya.
 * Satu klaim per hari kalender (zona waktu TIMEZONE, pergantian hari pukul 00:00 WIB). Semua dihitung di server.
 *
 * Yang tersimpan per akun (game_progress): attendance_day = hari terakhir yang diklaim (0 = belum pernah, 1-7),
 * attendance_date = tanggal klaim terakhir. Dari dua nilai itu state() menentukan hari berikutnya.
 */
class Attendance
{
    public const CYCLE = 7;
    public const TIMEZONE = 'Asia/Jakarta';

    // Hadiah KOIN tiap hari (hari 7 = hadiah besar). GEM SENGAJA TIDAK ADA di sini: gem hanya didapat dari bos stage 5/10/15/20/25.
    // Ubah angka ini untuk menyetel hadiah; tampilan game membaca daftar ini dari server, jadi tidak perlu diubah di tempat lain.
    public const REWARDS = [1 => 500, 2 => 750, 3 => 1000, 4 => 1500, 5 => 2000, 6 => 3000, 7 => 5000];

    // false = hari yang terlewat tidak menghapus kemajuan (lanjut dari hari berikutnya).
    // true  = bila ada hari yang terlewat, siklus kembali ke hari 1.
    public const RESET_ON_MISS = false;

    // Tanggal hari ini (Y-m-d) menurut TIMEZONE.
    public static function today(?\DateTimeInterface $now = null): string
    {
        $tz = new \DateTimeZone(self::TIMEZONE);
        $d = $now ? \DateTimeImmutable::createFromInterface($now)->setTimezone($tz) : new \DateTimeImmutable('now', $tz);
        return $d->format('Y-m-d');
    }

    /**
     * @param string|null $lastDate tanggal klaim terakhir (Y-m-d) atau null bila belum pernah
     * @param int         $lastDay  hari terakhir yang diklaim (0-7)
     * @param string      $today    tanggal hari ini (Y-m-d)
     * @return array{day:int,canClaim:bool,claimedToday:bool,reward:int,missed:bool,rewards:int[]}
     *   day = hari yang sedang aktif (yang bisa diklaim sekarang, atau yang baru saja diklaim hari ini)
     */
    public static function state(?string $lastDate, int $lastDay, string $today): array
    {
        $rewards = array_values(self::REWARDS);
        $lastDay = max(0, min(self::CYCLE, $lastDay));
        $isDate  = static fn (?string $s): bool => $s !== null && (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) && strtotime($s . ' 00:00:00 UTC') !== false;

        if (!$isDate($today)) {
            throw new \InvalidArgumentException('Tanggal hari ini tidak valid: ' . $today);
        }
        if (!$isDate($lastDate) || $lastDay < 1) {   // belum pernah absen
            return ['day' => 1, 'canClaim' => true, 'claimedToday' => false, 'reward' => self::REWARDS[1], 'missed' => false, 'rewards' => $rewards];
        }

        $gap = intdiv(strtotime($today . ' 00:00:00 UTC') - strtotime($lastDate . ' 00:00:00 UTC'), 86400);   // selisih hari kalender
        if ($gap <= 0) {   // sudah klaim hari ini (atau tanggal klaim di masa depan: tetap ditolak)
            return ['day' => $lastDay, 'canClaim' => false, 'claimedToday' => true, 'reward' => self::REWARDS[$lastDay], 'missed' => false, 'rewards' => $rewards];
        }

        $missed = $gap > 1;
        $next   = ($missed && self::RESET_ON_MISS) || $lastDay >= self::CYCLE ? 1 : $lastDay + 1;
        return ['day' => $next, 'canClaim' => true, 'claimedToday' => false, 'reward' => self::REWARDS[$next], 'missed' => $missed, 'rewards' => $rewards];
    }
}
