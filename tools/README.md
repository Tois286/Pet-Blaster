# Tools sprite

`python3 tools/make_sprites.py` membuat ulang semua sprite sheet di `public/game/assets/sprites/`
dan `public/game/js/sprites-data.js` dari PNG statis di `assets/monsters` dan `assets/pets`.
Butuh `numpy`, `opencv-python`, `pillow`. Gerakan tiap karakter diatur di tabel `MON` dan `PET`
dalam `make_sprites.py` (bagian tubuh memakai koordinat u,v 0..1). Argumen opsional: `mon5 pet_api2`.

`pet_api1`, `pet_api2`, `pet_api3`, `pet_air1`, `pet_air2`, dan `pet_air3` dilewati oleh `make_sprites.py` karena sheet-nya dibuat dari animasi sendiri.

## Srigala Api dan Serigala Lava (pet_api2, pet_api3)

`python3 tools/make_wolf_sheets.py --api tools/source/srigala_api.gif --lava tools/source/serigala_lava.gif`

Membaca dua GIF di `tools/source/`, menghapus latarnya (abu-krem untuk Srigala Api, hitam untuk Serigala Lava),
lalu menulis `pet_api2.webp`, `pet_api3.webp`, `pets/api2.png`, `pets/api3.png`, dan memperbarui entri di `sprites-data.js`.
Tambahkan `--preview folder` untuk menyimpan GIF pratinjau, `--only api` atau `--only lava` untuk satu karakter saja.
Pilihan frame idle/serang, skala, dan ukuran frame ada di tabel `CFG` di atas skrip.
Butuh `numpy`, `scipy`, `opencv-python`, `pillow`.

## Salamander, Naga Air, dan Naga Es (pet_air1, pet_air2, pet_air3)

`python3 tools/make_air_sheets.py`

Membaca enam sprite sheet JPG di `tools/source/air/` (`air_evol1_idle.jpg`, `air_evol1_attack.jpg`, ... `air_evol3_attack.jpg`),
menghapus latar dan bayangan tanahnya, memisahkan tiap frame, menyamakan ukuran idle dan serang, lalu menulis
`pet_air1.webp`, `pet_air2.webp`, `pet_air3.webp`, `pets/air1.png`, `pets/air2.png`, `pets/air3.png`, dan memperbarui entri di `sprites-data.js`.
Idle dibuat bolak-balik dari sebagian frame (`idle_step` di tabel `CFG` di atas skrip), serang memakai semua frame sheet attack.
Tinggi karakter (`ih`) dan batas lebar (`iw_cap`) tiap evolusi juga ada di `CFG`.
Tambahkan `--preview folder` untuk GIF pratinjau, `--only 1|2|3` untuk satu evolusi saja, `--src folder` bila sumbernya di tempat lain.
Butuh `numpy`, `scipy`, `scikit-image`, `opencv-python`, `pillow`.

## Naga Air (pet_air2) - format sama dengan Srigala Api (pet_api2)

`python3 tools/make_air2_sheet.py [--src sheet.png] [--preview folder]`

Membaca satu sprite sheet PNG transparan `tools/source/air/air_evol2_sheet.png` (38 frame: 18 idle + 20 serang, 6 kolom x 7 baris),
lalu menulis `pet_air2.webp`, `pets/air2.png`, dan entri `pet_air2` di `sprites-data.js` dengan format yang sama dengan `pet_api2`:
frame 224x116, karakter maks 102 px, kaki di baris (fh+ih)/2, idle 18 frame (ping-pong dari 10 frame tenang), serang 20 frame,
gambar statis 128x128 lebar 122, tanpa `rel`. Satu skala dipakai untuk semua frame. `make_air_sheets.py` tidak lagi membuat evolusi 2 kecuali `--only 2`.
