PATCH ANIMASI SKILL API — PET BLASTER
=====================================

Isi patch:
- public/game/js/game.js
- public/game/assets/pet-actions/fire_slash.png (6 frame animasi)
- public/game/assets/pet-actions/fire_orb.png (8 frame animasi)

Perbaikan pada versi ini:
- Efek Cakar Api tetap muncul langsung di posisi monster yang ditargetkan (TIDAK meluncur).
- Cakar sekarang benar-benar memainkan 6 frame sprite sheet, bukan menampilkan satu gambar statis.
- Lava Ball evolusi 3 memainkan 8 frame sprite sheet selama bergerak dan meledak saat tiba.
- Latar hitam/abu dari sprite sheet dibuat transparan.
- File gambar diperkecil agar ZIP patch tetap ringan.

Cara memasang:
1. Cadangkan project Pet Blaster.
2. Ekstrak ZIP ini.
3. Salin folder public dari dalam folder patch ke folder utama project pet-blaster.
4. Izinkan penggantian public/game/js/game.js dan penambahan/penggantian kedua PNG.
5. Jalankan ulang game, lalu tekan Ctrl+F5 di browser.

Catatan:
- Patch ini hanya berisi file yang perlu diganti, bukan seluruh project.
- Sintaks JavaScript telah diperiksa dengan Node.js.
- Silakan uji di gameplay; durasi/ukuran visual bisa disesuaikan lagi jika diperlukan.
