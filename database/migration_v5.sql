USE pet_blaster;
-- Bintang pet (1-5) per elemen. Permanen per akun. Semua pet mulai dari bintang 1.
-- Catatan: server juga menambahkan kolom ini otomatis saat pertama kali dipakai, jadi file ini opsional.
ALTER TABLE game_progress
  ADD COLUMN star_api TINYINT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN star_air TINYINT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN star_tanah TINYINT UNSIGNED NOT NULL DEFAULT 1,
  ADD COLUMN star_angin TINYINT UNSIGNED NOT NULL DEFAULT 1;
