# Tools sprite

`python3 tools/make_sprites.py` membuat ulang semua sprite sheet di `public/game/assets/sprites/`
dan `public/game/js/sprites-data.js` dari PNG statis di `assets/monsters` dan `assets/pets`.
Butuh `numpy`, `opencv-python`, `pillow`. Gerakan tiap karakter diatur di tabel `MON` dan `PET`
dalam `make_sprites.py` (bagian tubuh memakai koordinat u,v 0..1). Argumen opsional: `mon5 pet_api2`.

`pet_api1`, `pet_api2`, dan `pet_api3` dilewati oleh `make_sprites.py` karena sheet-nya dibuat dari animasi sendiri.

## Srigala Api dan Serigala Lava (pet_api2, pet_api3)

`python3 tools/make_wolf_sheets.py --api tools/source/srigala_api.gif --lava tools/source/serigala_lava.gif`

Membaca dua GIF di `tools/source/`, menghapus latarnya (abu-krem untuk Srigala Api, hitam untuk Serigala Lava),
lalu menulis `pet_api2.webp`, `pet_api3.webp`, `pets/api2.png`, `pets/api3.png`, dan memperbarui entri di `sprites-data.js`.
Tambahkan `--preview folder` untuk menyimpan GIF pratinjau, `--only api` atau `--only lava` untuk satu karakter saja.
Pilihan frame idle/serang, skala, dan ukuran frame ada di tabel `CFG` di atas skrip.
Butuh `numpy`, `scipy`, `opencv-python`, `pillow`.
