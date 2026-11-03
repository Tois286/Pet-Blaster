USE pet_blaster;
-- Absensi harian 7 hari yang berulang. attendance_day = hari terakhir yang diklaim (0 = belum pernah, 1-7);
-- attendance_date = tanggal klaim terakhir (hari dihitung menurut WIB di server).
-- Catatan: server juga menambah kolom ini otomatis saat game dibuka, jadi file ini opsional.
ALTER TABLE game_progress
  ADD COLUMN attendance_day TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD COLUMN attendance_date DATE NULL DEFAULT NULL;
