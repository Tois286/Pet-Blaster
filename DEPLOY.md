# Panduan Deploy Pet Blaster

Kebutuhan server: PHP 8.2+ (ekstensi intl, mbstring, mysqli), MySQL/MariaDB, Apache dengan `mod_rewrite` (atau Nginx), HTTPS aktif.

## 1. Document root = `public/`
Arahkan document root domain ke folder **`public/`**, bukan ke folder proyek. Dengan begitu `app/`, `writable/`,
`database/`, dan `.env` tidak bisa diakses lewat web.

Jika hosting tidak mengizinkan mengubah document root, file `.htaccess` di root proyek bertindak sebagai pengaman
(memblokir folder internal dan meneruskan sisanya ke `public/`). Ini cadangan, bukan cara utama.

Nginx: `root /path/ke/pet-blaster/public;` dan `try_files $uri $uri/ /index.php?$query_string;`

## 2. Pasang dependensi
```
composer install --no-dev --optimize-autoloader
```

## 3. Konfigurasi `.env` (di server, jangan di-commit)
```
cp env.production.example .env
```
Isi `app.baseURL` (https + garis miring di akhir) dan kredensial database. Template ini sudah mengatur
`CI_ENVIRONMENT = production`, `forceGlobalSecureRequests`, dan `cookie.secure`.

Pastikan folder `writable/` dapat ditulis oleh user web server (`chmod -R 775 writable`).

## 4. Database
- **Database baru:** impor `database/pet_blaster.sql` (skema sudah lengkap).
- **Database lama:** jalankan sekali setiap update:
  ```
  php spark game:migrate
  ```
  Perintah ini idempoten (aman diulang) dan menggantikan `database/migration_v4.sql` sampai `migration_v8.sql`.
  Server tidak lagi mengubah struktur tabel saat game berjalan, jadi **wajib dijalankan sebelum game dibuka**.
- Untuk akses sehari-hari pakai user database khusus game dengan hak SELECT/INSERT/UPDATE/DELETE saja.
  Hak ALTER/CREATE cukup diberikan sementara saat `game:migrate`.

## 5. Cek setelah deploy
1. `https://domain-anda/` otomatis pindah ke `/game/`.
2. Daftar akun baru, login, mulai battle, dan selesaikan satu battle (koin bertambah).
3. Buka Toko, coba pakai skin Elite/Epic/Master/Legendary/Mythical (animasi idle tampil di lobi).
4. Buka Mode VS (latar arena panjang tampil dan bisa di-scroll).
5. Coba `https://domain-anda/.env` dan `https://domain-anda/app/Config/App.php`: keduanya harus **ditolak** (403/404).

## Catatan
- Aset idle skin (`tois-idle-*.webp`), avatar skin, dan `arena_vs_battle.jpg` disusun ulang dari GIF, kartu, dan PNG yang ada.
  Jika Anda punya file aslinya, timpa saja dengan nama yang sama.
- Phaser dimuat dari CDN (jsdelivr). Untuk lebih tahan gangguan, unduh `phaser.min.js` dan hosting sendiri.
- CSRF belum diaktifkan: API memakai cookie `SameSite=Lax` dan body JSON, yang sudah menahan serangan lintas situs untuk POST.
  Mengaktifkan filter CSRF memerlukan perubahan di sisi game (kirim token di setiap request).
