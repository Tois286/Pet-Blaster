# Tois sprite baru + animasi halus

Perubahan:
- Mengganti rig Tois lama dengan ilustrasi Tois baru dari gambar yang diberikan.
- Menghapus latar krem di sekitar karakter dan menyimpan sprite transparan di `public/game/assets/characters/tois-new.png`.
- Menambahkan animasi halus untuk napas, gerak membidik, hentakan saat menembak, sedikit getaran, efek terkena serangan, dan lompatan.
- Efek peluru, muzzle flash, selongsong, serta efek skill pet tetap menggunakan sistem game yang sudah ada.

File utama yang berubah: `public/game/js/game.js`.

Catatan: gambar sumber berisi beberapa pose statis, bukan sprite sheet frame animasi berurutan. Versi ini memakai pose belakang yang paling cocok untuk gameplay dan membuat geraknya terasa lebih hidup lewat animasi transformasi. Untuk animasi berjalan/menembak yang benar-benar frame-by-frame, diperlukan frame karakter yang terpisah dengan posisi tubuh dan senjata yang konsisten.
