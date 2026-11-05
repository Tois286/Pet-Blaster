<?php

namespace App\Libraries;

use CodeIgniter\Database\BaseConnection;

/**
 * Penyiap skema database yang dijalankan SATU KALI saat deploy/update (php spark game:migrate),
 * bukan lagi di setiap request. Aman dijalankan berulang (idempoten): hanya menambah yang belum ada.
 * Menggantikan database/migration_v4.sql sampai migration_v8.sql untuk database lama.
 * Database baru cukup mengimpor database/pet_blaster.sql (sudah berisi skema lengkap).
 */
class SchemaUpdater
{
    private const PET_ELEMENTS = ['api', 'air', 'tanah', 'angin'];

    /**
     * @return list<string> daftar langkah yang dijalankan (kosong = skema sudah mutakhir)
     */
    public static function run(BaseConnection $db): array
    {
        $done = [];

        // v4: klaim AFK
        if (!$db->fieldExists('last_claim', 'game_progress')) {
            $db->query('ALTER TABLE game_progress ADD COLUMN last_claim INT UNSIGNED NOT NULL DEFAULT 0');
            $db->query('UPDATE game_progress SET last_claim = UNIX_TIMESTAMP()');
            $done[] = 'game_progress.last_claim';
        }

        // v5: bintang pet
        foreach (self::PET_ELEMENTS as $el) {
            if (!$db->fieldExists('star_' . $el, 'game_progress')) {
                $db->query('ALTER TABLE game_progress ADD COLUMN star_' . $el . ' TINYINT UNSIGNED NOT NULL DEFAULT 1');
                $done[] = 'game_progress.star_' . $el;
            }
        }

        // v6: sistem gem
        if (!$db->fieldExists('gems', 'game_progress')) {
            $db->query('ALTER TABLE game_progress ADD COLUMN gems BIGINT UNSIGNED NOT NULL DEFAULT 0');
            $done[] = 'game_progress.gems';
        }
        if (!$db->fieldExists('island', 'game_sessions')) {
            $db->query('ALTER TABLE game_sessions ADD COLUMN island TINYINT UNSIGNED NULL DEFAULT NULL, ADD COLUMN stage TINYINT UNSIGNED NULL DEFAULT NULL, ADD COLUMN gems_awarded INT UNSIGNED NOT NULL DEFAULT 0');
            $done[] = 'game_sessions.island/stage/gems_awarded';
        }
        $done = array_merge($done, self::createTable($db, 'game_boss_clears',
            'CREATE TABLE game_boss_clears (
                user_id BIGINT UNSIGNED NOT NULL,
                island TINYINT UNSIGNED NOT NULL,
                stage TINYINT UNSIGNED NOT NULL,
                gems INT UNSIGNED NOT NULL,
                cleared_at INT UNSIGNED NOT NULL,
                PRIMARY KEY (user_id, island, stage),
                CONSTRAINT fk_bossclear_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
            )'));

        // v7: ID publik 10 karakter + isi untuk akun lama
        if (!$db->fieldExists('public_id', 'game_users')) {
            $db->query('ALTER TABLE game_users ADD COLUMN public_id CHAR(10) NULL DEFAULT NULL, ADD UNIQUE KEY uq_game_users_public_id (public_id)');
            $done[] = 'game_users.public_id';
        }
        $before = (int) $db->query('SELECT COUNT(*) AS c FROM game_users WHERE public_id IS NULL')->getRow()->c;
        while ($before > 0) {
            PublicId::backfill($db, 500);
            $after = (int) $db->query('SELECT COUNT(*) AS c FROM game_users WHERE public_id IS NULL')->getRow()->c;
            if ($after >= $before) {
                break;   // tidak ada kemajuan (mis. akun melebihi batas ID); hentikan agar tidak berputar
            }
            $done[] = 'public_id diisi untuk ' . ($before - $after) . ' akun';
            $before = $after;
        }

        // v8: Toko, outfit, lotre
        if (!$db->fieldExists('worn_outfit', 'game_progress')) {
            $db->query("ALTER TABLE game_progress ADD COLUMN worn_outfit VARCHAR(30) NOT NULL DEFAULT 'base'");
            $done[] = 'game_progress.worn_outfit';
        }
        $done = array_merge($done, self::createTable($db, 'game_inventory',
            'CREATE TABLE game_inventory (
                user_id BIGINT UNSIGNED NOT NULL,
                item_type VARCHAR(20) NOT NULL,
                item_id VARCHAR(30) NOT NULL,
                qty INT UNSIGNED NOT NULL DEFAULT 0,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, item_type, item_id),
                CONSTRAINT fk_inventory_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
            )'));
        $done = array_merge($done, self::createTable($db, 'game_outfits',
            'CREATE TABLE game_outfits (
                user_id BIGINT UNSIGNED NOT NULL,
                outfit_id VARCHAR(30) NOT NULL,
                source VARCHAR(20) NOT NULL DEFAULT \'shop\',
                acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, outfit_id),
                CONSTRAINT fk_outfit_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
            )'));
        $done = array_merge($done, self::createTable($db, 'game_lotre_boards',
            'CREATE TABLE game_lotre_boards (
                user_id BIGINT UNSIGNED NOT NULL PRIMARY KEY,
                sig INT UNSIGNED NOT NULL,
                board TEXT NOT NULL,
                torn TEXT NOT NULL,
                rounds INT UNSIGNED NOT NULL DEFAULT 0,
                last_n TINYINT UNSIGNED NULL DEFAULT NULL,
                updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT fk_lotre_user FOREIGN KEY (user_id) REFERENCES game_users(id) ON DELETE CASCADE
            )'));
        $done = array_merge($done, self::createTable($db, 'game_purchases',
            'CREATE TABLE game_purchases (
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
            )'));

        return $done;
    }

    /** @return list<string> */
    private static function createTable(BaseConnection $db, string $table, string $sql): array
    {
        if ($db->tableExists($table)) {
            return [];
        }
        $db->query($sql);

        return ['tabel ' . $table];
    }
}
