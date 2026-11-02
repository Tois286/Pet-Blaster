USE pet_blaster;
-- Sistem gem: gem hanya didapat dari bos stage 5, 10, 15, 20 dan 25 (Boss Final) tiap pulau.
-- Catatan: server juga membuat kolom/tabel ini otomatis saat pertama kali dipakai, jadi file ini opsional.
ALTER TABLE game_progress
  ADD COLUMN gems BIGINT UNSIGNED NOT NULL DEFAULT 0;
-- Pulau dan stage yang dimainkan dicatat di sesi agar server bisa menghitung gem sendiri.
ALTER TABLE game_sessions
  ADD COLUMN island TINYINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN stage TINYINT UNSIGNED NULL DEFAULT NULL,
  ADD COLUMN gems_awarded INT UNSIGNED NOT NULL DEFAULT 0;
-- Bos yang gemnya sudah diambil (satu baris per akun, pulau, stage).
CREATE TABLE IF NOT EXISTS game_boss_clears (
  user_id BIGINT UNSIGNED NOT NULL,
  island TINYINT UNSIGNED NOT NULL,
  stage TINYINT UNSIGNED NOT NULL,
  gems INT UNSIGNED NOT NULL,
  cleared_at INT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, island, stage),
  CONSTRAINT fk_bossclear_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);
