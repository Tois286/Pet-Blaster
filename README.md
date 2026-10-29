# Pet Blaster: Wild Guardians

Implementasi MVP dari dokumen "Rancangan Game Website Pet Blaster": game 2D idle shooter + tower defense di browser.
Teknologi: **Phaser 3 + JavaScript** (klien), **CodeIgniter 4 + PHP** (API), **MySQL** (database).

Paket ini berisi file kustom saja. File ini ditumpuk di atas proyek CodeIgniter 4 yang baru.

## Isi paket
```
app/Config/Routes.php                 Route API (menimpa Routes.php bawaan appstarter)
app/Controllers/Api/ApiController.php Basis: respons JSON, body, user id sesi
app/Controllers/Api/AuthApi.php       register, login (dengan throttle), logout
app/Controllers/Api/GameApi.php       profile, upgrade, battle/start, battle/finish
database/pet_blaster.sql              Tabel game_users, game_progress, game_sessions
env.example                           Contoh konfigurasi .env
public/game/                          index.html, css/game.css, js/game.js, assets/
```

## Cara memasang
1. Pastikan PHP, Composer, dan MySQL tersedia (misalnya lewat Laragon).
2. Buat proyek: `composer create-project codeigniter4/appstarter pet-blaster`
3. Ekstrak zip ini ke dalam folder `pet-blaster` dan izinkan penimpaan `app/Config/Routes.php`.
4. Jalankan `database/pet_blaster.sql` lewat phpMyAdmin atau MySQL client.
5. Salin `env.example` menjadi `.env`, lalu sesuaikan username/password database.
6. Jalankan `php spark serve`, lalu buka `http://localhost:8080/game/`.

## Konsep game
- **Karakter:** Riko, hewan penjaga yang menembak otomatis. Musuh: 20 monster elemen (lihat v10).
- **Pertempuran:** 10 gelombang. Gelombang N berisi 4 + 2N slime dengan HP dan kecepatan yang naik tiap gelombang. Slime yang melewati garis pertahanan mengurangi HP markas 10. Menang bila 10 gelombang selesai, kalah bila HP markas habis. Sentuh atau klik arena untuk menembak 2x lebih cepat.
- **Ekonomi:** hadiah = 5 koin per kill + 10 koin per gelombang. Dihitung dan disimpan oleh server.
- **Upgrade:** Damage +5 (100 koin), Fire rate +1 (150 koin), HP markas +10 (120 koin). Saldo dan batas dicek server dengan transaksi.
- **Level:** naik setiap kelipatan 3 gelombang yang dicapai.

## Keamanan hadiah
Klien tidak pernah menentukan saldo. Alurnya: `battle/start` membuat token sesi, lalu `battle/finish` menerima token, gelombang, dan jumlah kill. Server membatasi klaim sesuai durasi sesi (minimal sekitar 8 detik per gelombang dan maksimal 3 kill per detik), memakai token hanya sekali, lalu menambahkan koin. Ini pengaman dasar, bukan anti-cheat penuh, karena pertempuran masih disimulasikan di klien. Sebelum rilis publik, tambahkan HTTPS, proteksi CSRF, konfigurasi cookie sesi yang aman, log aktivitas, dan sebaiknya simulasi di sisi server.

## Catatan pengujian
Kode JavaScript sudah lolos pemeriksaan sintaks. Kode PHP dan integrasi dengan CI4 serta MySQL **belum dijalankan** karena lingkungan pembuatan tidak memiliki PHP. Ikuti checklist di dokumen rancangan (halaman 13) setelah dipasang.

## Pengembangan berikutnya
Koleksi pet, boss, evolusi, misi harian, leaderboard, dan event sengaja tidak masuk MVP (sesuai rancangan).

## Pembaruan tampilan (v2)
Layout portrait penuh layar untuk Android, dock upgrade di bawah (tombol besar untuk jempol), tombol layar penuh, karakter Riko dan slime yang digambar lewat kode (tanpa file aset), latar bertingkat dengan awan bergerak, efek partikel, goyangan layar, dan getar saat markas terkena serangan. Gelombang 5 dan 10 memiliki slime bos.

## Pembaruan lobi (v3)
Setelah login, pemain masuk ke **lobi** bergaya game mobile: bar profil (level, koin, rekor, XP), Raja Slime Api sebagai latar, Riko dan dua pendamping di panggung, target gelombang, tombol **Mulai Game**, dan menu bawah. **Toko** membuka panel upgrade. Menu lain (Pet, Karakter, Wilayah, Guild, Battle Pass, Surat, Teman, Misi) masih placeholder. Setelah pertempuran, pemain bisa **Main lagi** atau kembali **Ke lobi**. Backend tidak berubah.

## Pembaruan v4 (AFK, pendamping, skill)
- **Hadiah AFK:** koin menumpuk saat offline (maks 8 jam) sebesar menit x (1 + rekor gelombang), diklaim lewat tombol di lobi (`POST /api/afk/claim`). Dihitung penuh di server. **Jalankan `database/migration_v4.sql` jika database sudah ada.**
- **Pendamping:** dua slime di sisi Riko menembak musuh acak dengan separuh damage.
- **Skill Badai Peluru:** tombol di kiri bawah saat bertempur, 4x damage ke semua musuh, cooldown 15 detik.
- **Perbaikan:** kalah di gelombang N kini hanya dibayar untuk gelombang yang selesai (N-1).

## Pembaruan v5 (HUD pertempuran)
Tampilan pertempuran mengikuti referensi: padang rumput pandangan atas, tembok benteng dengan tiga pendamping di atasnya, bar HP markas di bawah, timer, judul stage + progres gelombang di atas, tombol jeda dan kecepatan x1/x2, angka damage melayang, skill di kolom kanan. Batas server diubah ke ~5 detik/gelombang agar mode x2 tidak terpotong.

## Pembaruan v6 (karakter elemen Tois)
Pendamping kini 4 karakter elemen dari lembar desain: **Api** (Rubah > Srigala Api > Serigala Lava), **Air** (Salamander > Naga Air > Naga Es), **Tanah** (Tikus Tanah > Tikus Batu > Tikus Berlian), **Angin** (Burung Pipit > Elang > Garuda). Mereka berdiri di tembok dan menembakkan skill evolusi secara otomatis (3 skill per elemen, 12 total). Di pertempuran evolusi terjadi di gelombang 4 dan 8; di lobi tahap evolusi mengikuti rekor gelombang. Slime tetap menjadi musuh sementara.
Gambar `assets/pets/*.png` dipotong dari lembar desain sebagai medali bulat. Ganti dengan PNG transparan per karakter (nama file sama, 96x96 atau lebih) untuk tampilan akhir.

## Pembaruan v7 (arena)
Empat arena buatan sendiri (`assets/backgrounds/arena1-4.jpg`) menggantikan latar kode: Padang Rumput (gelombang 1-3), Benteng Salju (4-6), Benteng Lava (7-8), Arena Kegelapan (9-10), berganti dengan transisi pudar. Atur pembagiannya lewat `ARENA_AT` di `game.js`. Garis pertahanan (`BASE_Y`), posisi pet, hero, dan bar HP disesuaikan dengan tembok pada gambar.

## Pembaruan v9
Sprite pet kini PNG transparan asli dari folder karakter (di-trim dan diseragamkan ke 128x128 di `assets/pets/`; ukuran tumbuh tiap evolusi). Tombol keluar dipindah ke kolom kiri di bawah jeda dan kecepatan, berikon exit.

## Pembaruan v10 (monster musuh)
Slime digantikan **20 monster elemen** dari `assets/monsters/` (Api, Air, Tanah, Angin; 5 monster per elemen). Tiap arena punya kumpulan monster sendiri (`POOL` di `game.js`): Padang Rumput berisi goblin, tikus tanah, slime api, dan fishman; Benteng Salju berisi monster air dan angin; Benteng Lava dan Arena Kegelapan berisi imp, skeleton, dan monster yang lebih tangguh. Tiap monster punya tinggi tampil, pengali HP, dan pengali kecepatan di tabel `MON`; monster terbang (Imp, Harpy, Burung Nasar, Roh Tornado) bergoyang saat melayang. Bos gelombang 5 adalah **Naga Laut Mini** dan bos gelombang 10 adalah **Golem Lava Mini**, dan namanya muncul di spanduk gelombang. Golem Lava Mini juga tampil sebagai Raja di lobi. Partikel saat monster kalah mengikuti warna elemennya. Backend tidak berubah.

## Pembaruan v11 (gerak lebih hidup)
Gerak monster kini dihitung per frame (bukan lagi satu goyangan skala yang seragam). Monster darat melompat-lompat, gepeng saat mendarat, dan tubuhnya berayun. Monster terbang melayang naik-turun, bergeser ke samping, miring, dan sayapnya mengepak. Setiap monster punya fase gerak acak sehingga tidak serempak. Saat terkena tembakan monster tersentak dan terpental sedikit, saat tersetrum bergetar, dan saat mati gepeng, berputar, lalu memudar. Pet di tembok bernapas dengan jeda berbeda dan melompat kecil tiap melepas skill; di lobi hero dan pet bergerak bergantian, tidak lagi sama persis. Semua pengaturan ada di loop `update` kelas `Battle` di `game.js`.

## Pembaruan v12 (Tois animasi di lobi)
Tois di lobi kini memakai animasi dari `tois.gif` (90 frame, 15 fps, loop) dengan latar dan bayangan sudah dihapus, jadi transparan dan menyatu dengan panggung. GIF tidak bisa dimainkan langsung di kanvas Phaser, maka frame-nya disusun menjadi spritesheet `assets/characters/tois-anim.webp` (14 kolom, tiap frame 172x320, WebP transparan, sekitar 1 MB) dan dimainkan sebagai animasi Phaser (`tois_idle`). Ukuran tampil dan kecepatan diatur lewat `TOIS_ANIM` dan skala di `Lobby.create` pada `game.js`. Tois di pertempuran dan avatar di HUD/halaman login belum diubah.

## Pembaruan v13 (lobi lebih lega)
Tata letak lobi dirapikan dari atas ke bawah tanpa tumpang tindih: HUD, Raja Golem Lava (diperkecil), judul stage, panggung berisi Tois dan 4 pet (diperkecil), tombol Hadiah AFK, panel target gelombang (milestone dibuat satu baris), tombol Mulai Game, dan menu bawah (tinggi dikurangi agar tombol Mulai tidak terpotong). Ukuran teks judul, ikon menu samping, dan panel target diperkecil. Posisi elemen kanvas ada di `Lobby.create` pada `game.js`; posisi elemen HTML ada di blok "v13" di akhir `game.css`.

## Pembaruan v14 (latar lobi baru)
Lobi memakai latar gerbang kastil `assets/backgrounds/lobby.jpg` (720x1280, 2x kanvas). Dari gambar asli (688x1553) bagian jembatan batu yang polos dipadatkan secara halus agar rasionya 9:16 dan panggung kayu naik ke posisi karakter, lalu ditambah sedikit olahan: warna lebih hidup dan hangat, berkas cahaya dari kiri atas, cahaya hangat di panggung, kabut tipis, dan vinyet lembut di atas dan bawah supaya HUD, tombol, dan menu tetap terbaca. Di dalam game ada efek ambient: daun melayang, awan bergeser, debu cahaya, dan cahaya hangat berdenyut di belakang karakter. Posisi: Raja Golem Lava di depan gerbang, Tois di tengah panggung kayu dengan 4 pet berjajar, bayangan di bawah tiap karakter (`FEET`, `PFEET`, `PX` di `Lobby.create`).
#   P e t - B l a s t e r  
 #   P e t - B l a s t e r  
 