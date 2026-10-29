# Tois gameplay dari video + sistem reload 35 peluru

Hanya bagian **pertempuran** yang berubah. Lobi (sebelum tombol Mulai) tetap memakai `tois-anim.webp`.

## Yang berubah
- `public/game/assets/characters/tois-gatling.webp` (baru): spritesheet transparan 60 frame (166x382 px) dari video.
  Latar putih, asap, dan selongsong melayang sudah dihapus; kilatan moncong dipertahankan.
  Frame 0-7 = semburan tembak, 8-58 = animasi reload, 59 = pose siaga.
- `public/game/js/game.js`:
  - `HeroRig` memakai sprite animasi baru (tembak / reload / siaga), bukan `tois-new.png`.
  - Magasin `MAG_SIZE = 35`. Setiap peluru Tois mengurangi 1. Saat habis, Tois reload `RELOAD_MS = 2400` ms,
    magasin penuh lagi, lalu menembak lagi; berulang sampai pertempuran selesai.
  - Bar peluru (kuning, garis tiap 5 peluru) di bawah bar HP; saat reload berubah biru dan terisi sesuai progres.
  - Tombol x2 dan jeda ikut memengaruhi animasi serta timer reload.
- `public/game/index.html`: `game.js?v=gatling1` agar cache browser diperbarui.

## Mengatur
Ubah `MAG_SIZE` (jumlah peluru) dan `RELOAD_MS` (lama reload) di bagian atas `game.js`.
Pet dan skill Badai Peluru tidak memakai magasin ini.
