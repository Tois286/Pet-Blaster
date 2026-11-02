USE pet_blaster;
-- ID pengguna 10 karakter (huruf besar + angka) = nomor urut akun (4 karakter, basis 36) + tahun, bulan, tanggal, jam (masing-masing 1 karakter basis 36) + menit (2 angka).
-- Contoh: akun nomor 1 yang daftar 29 Okt 2026 pukul 13:35 -> 00010ATD35. Kunci utama `id` (angka) tidak berubah; ID ini disimpan di kolom terpisah.
-- Catatan: server menambah kolom ini dan mengisi ID akun lama otomatis saat game dibuka, jadi file ini opsional.
ALTER TABLE game_users
  ADD COLUMN public_id CHAR(10) NULL DEFAULT NULL,
  ADD UNIQUE KEY uq_game_users_public_id (public_id);
