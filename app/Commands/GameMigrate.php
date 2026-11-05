<?php

namespace App\Commands;

use App\Libraries\SchemaUpdater;
use CodeIgniter\CLI\BaseCommand;
use CodeIgniter\CLI\CLI;

/**
 * Jalankan SATU KALI setiap deploy/update:  php spark game:migrate
 * Menyusul skema database lama ke versi terbaru (idempoten, aman diulang).
 */
class GameMigrate extends BaseCommand
{
    protected $group       = 'Game';
    protected $name        = 'game:migrate';
    protected $description = 'Menyusul skema database Pet Blaster ke versi terbaru (idempoten).';

    public function run(array $params)
    {
        try {
            $done = SchemaUpdater::run(db_connect());
        } catch (\Throwable $e) {
            CLI::error('Migrasi gagal: ' . $e->getMessage());
            CLI::error('Pastikan user database punya izin ALTER/CREATE untuk proses ini (hanya saat migrasi).');

            return EXIT_ERROR;
        }
        if ($done === []) {
            CLI::write('Skema sudah mutakhir. Tidak ada yang diubah.', 'green');
        } else {
            CLI::write('Selesai. Perubahan:', 'green');
            foreach ($done as $d) {
                CLI::write(' - ' . $d);
            }
        }

        return EXIT_SUCCESS;
    }
}
