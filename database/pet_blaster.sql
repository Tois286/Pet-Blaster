CREATE DATABASE IF NOT EXISTS pet_blaster CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pet_blaster;
CREATE TABLE IF NOT EXISTS game_users (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 username VARCHAR(30) NOT NULL UNIQUE,
 email VARCHAR(150) NOT NULL UNIQUE,
 password_hash VARCHAR(255) NOT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 -- ID 10 karakter: nomor urut (4, basis 36) + tahun/bulan/tanggal/jam (4, basis 36) + menit (2). Diisi server saat pendaftaran.
 public_id CHAR(10) NULL DEFAULT NULL,
 UNIQUE KEY uq_game_users_public_id (public_id)
);
CREATE TABLE IF NOT EXISTS game_progress (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL UNIQUE,
 coins BIGINT UNSIGNED NOT NULL DEFAULT 0,
 level INT UNSIGNED NOT NULL DEFAULT 1,
 damage INT UNSIGNED NOT NULL DEFAULT 10,
 fire_rate INT UNSIGNED NOT NULL DEFAULT 1,
 max_hp INT UNSIGNED NOT NULL DEFAULT 100,
 best_wave INT UNSIGNED NOT NULL DEFAULT 0,
 last_claim INT UNSIGNED NOT NULL DEFAULT 0,
 gems BIGINT UNSIGNED NOT NULL DEFAULT 0,
 star_api TINYINT UNSIGNED NOT NULL DEFAULT 1,
 star_air TINYINT UNSIGNED NOT NULL DEFAULT 1,
 star_tanah TINYINT UNSIGNED NOT NULL DEFAULT 1,
 star_angin TINYINT UNSIGNED NOT NULL DEFAULT 1,
 worn_outfit VARCHAR(30) NOT NULL DEFAULT 'base',
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);
-- Sesi pertempuran: dipakai server untuk memvalidasi hadiah koin.
CREATE TABLE IF NOT EXISTS game_sessions (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 token CHAR(32) NOT NULL UNIQUE,
 started_at INT UNSIGNED NOT NULL,
 finished TINYINT(1) NOT NULL DEFAULT 0,
 coins_awarded INT UNSIGNED NOT NULL DEFAULT 0,
 island TINYINT UNSIGNED NULL DEFAULT NULL,
 stage TINYINT UNSIGNED NULL DEFAULT NULL,
 gems_awarded INT UNSIGNED NOT NULL DEFAULT 0,
 CONSTRAINT fk_session_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);
-- Bos yang gemnya sudah diambil (gem hanya dari bos stage 5, 10, 15, 20, 25 tiap pulau).
CREATE TABLE IF NOT EXISTS game_boss_clears (
 user_id BIGINT UNSIGNED NOT NULL,
 island TINYINT UNSIGNED NOT NULL,
 stage TINYINT UNSIGNED NOT NULL,
 gems INT UNSIGNED NOT NULL,
 cleared_at INT UNSIGNED NOT NULL,
 PRIMARY KEY (user_id, island, stage),
 CONSTRAINT fk_bossclear_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);

-- ---- Toko & Lotre (migration_v8.sql) ----
-- Barang yang dimiliki pemain. goodbye: item_id 'gelas'. noodle: item_id 'biasa' | 'double' | 'telur'.
CREATE TABLE IF NOT EXISTS game_inventory (
 user_id BIGINT UNSIGNED NOT NULL,
 item_type VARCHAR(20) NOT NULL,
 item_id VARCHAR(30) NOT NULL,
 qty INT UNSIGNED NOT NULL DEFAULT 0,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, item_type, item_id),
 CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);

-- Skin / outfit Tois yang sudah dimiliki (dari Toko atau hadiah Lotre). Outfit 'base' selalu dimiliki, tidak perlu baris.
CREATE TABLE IF NOT EXISTS game_outfits (
 user_id BIGINT UNSIGNED NOT NULL,
 outfit_id VARCHAR(30) NOT NULL,
 source VARCHAR(20) NOT NULL DEFAULT 'shop',
 acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, outfit_id),
 CONSTRAINT fk_outfit_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);

-- Papan Lotre Tarik tiap pemain. Susunan nomor (board) hanya ada di server; pemain baru melihat nomor yang sudah ia buka (torn).
-- Papan tidak diacak ulang tiap dibuka / ganti perangkat: sisa tiket terus berkurang sampai habis, baru dikocok papan baru.
CREATE TABLE IF NOT EXISTS game_lotre_boards (
 user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
 sig INT UNSIGNED NOT NULL,
 board TEXT NOT NULL,
 torn TEXT NOT NULL,
 rounds INT UNSIGNED NOT NULL DEFAULT 0,
 last_n TINYINT UNSIGNED NULL DEFAULT NULL,
 updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 CONSTRAINT fk_lotre_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);

-- Riwayat semua pembelian (satu baris per transaksi). kind: goodbye | noodle | outfit | lotre.
-- Untuk lotre: item = nomor yang terbuka, coins_won / gems_won = hadiah koin / gem, detail = nama hadiah.
CREATE TABLE IF NOT EXISTS game_purchases (
 id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
 user_id BIGINT UNSIGNED NOT NULL,
 kind VARCHAR(20) NOT NULL,
 item VARCHAR(40) NOT NULL,
 qty INT UNSIGNED NOT NULL DEFAULT 1,
 coins_spent BIGINT UNSIGNED NOT NULL DEFAULT 0,
 gems_spent BIGINT UNSIGNED NOT NULL DEFAULT 0,
 coins_won BIGINT UNSIGNED NOT NULL DEFAULT 0,
 gems_won BIGINT UNSIGNED NOT NULL DEFAULT 0,
 detail VARCHAR(120) NULL DEFAULT NULL,
 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 KEY idx_purchases_user (user_id, created_at),
 CONSTRAINT fk_purchase_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
);
