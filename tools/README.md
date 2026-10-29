# Tools sprite

`python3 tools/make_sprites.py` membuat ulang semua sprite sheet di `public/game/assets/sprites/`
dan `public/game/js/sprites-data.js` dari PNG statis di `assets/monsters` dan `assets/pets`.
Butuh `numpy`, `opencv-python`, `pillow`. Gerakan tiap karakter diatur di tabel `MON` dan `PET`
dalam `make_sprites.py` (bagian tubuh memakai koordinat u,v 0..1). Argumen opsional: `mon5 pet_api2`.
