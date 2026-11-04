USE pet_blaster;
-- Migrasi v8: pembelian Toko (Goodbye, Mie Kari, outfit/skin) dan Lotre Tarik disimpan di database, bukan lagi di localStorage perangkat.
-- Catatan: server membuat tabel/kolom ini otomatis saat game dibuka (App\Libraries\Shop::ensureSchema), jadi file ini opsional.

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

-- Outfit yang sedang dipakai.
ALTER TABLE game_progress ADD COLUMN worn_outfit VARCHAR(30) NOT NULL DEFAULT 'base';

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
