# Pet Blaster: Panel Menu Bawah (v16)

Kelima tombol menu bawah di lobi kini membuka panel layar penuh dengan tab untuk berpindah antar menu tanpa menutup panel.

- **Toko:** tombol upgrade Damage, Kecepatan, dan HP markas (tetap memakai API `/upgrade`) plus penjelasan tiap upgrade.
- **Pet:** 4 elemen dengan 3 tahap evolusi, gambar, skill, deskripsi, dan tahap yang masih terkunci (tahap 2 di gelombang 4, tahap 3 di gelombang 8).
- **Karakter:** profil Tois, level, bar statistik (damage, kecepatan, HP markas), Gatling, Badai Peluru.
- **Wilayah:** 4 arena dengan rentang gelombang, monster, bos, dan status (terkunci, terbuka, ditaklukkan).
- **Guild:** tampilan awal "belum bergabung", tombol nonaktif, dan daftar fitur yang akan hadir. Belum ada backend guild.

## File yang diubah
`public/game/index.html`, `public/game/css/game.css`, `public/game/js/game.js`

Backend tidak berubah. Panel hanya menampilkan data dari `/profile` dan konstanta game.
Setelah menyalin, lakukan hard refresh (Ctrl+F5). Versi cache sudah dinaikkan menjadi `menu1`.
