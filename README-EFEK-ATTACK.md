# Pet Blaster — Perbaikan Efek Attack

Perubahan pada versi ini difokuskan pada feedback saat skill mengenai musuh tanpa mengubah damage, cooldown, aturan evolusi, atau gameplay.

## Yang diubah
- Menambahkan impact flash putih singkat, shock-ring berwarna elemen, dan burst partikel saat serangan mengenai target.
- Memperkuat efek kontak pada skill cakar api dan cakar angin.
- Mempertegas ledakan Bola Lava, Bola Air, Kristal Es, serangan tanah, dan Puting Beliung.
- Mengubah kristal pada skill tahap ketiga pet tanah dari cyan menjadi warna batu/tanah agar identitas elemennya lebih konsisten.
- Objek efek sementara dibersihkan setelah tween selesai untuk mengurangi penumpukan objek.

## File yang diubah
`public/game/js/game.js`

## Cara memasang
1. Buat backup folder game yang sedang dipakai.
2. Ekstrak ZIP ini.
3. Salin folder `pet-blaster` dari ZIP ke lokasi proyek kamu, atau salin `public/game/js/game.js` jika ingin menerapkan hanya perbaikannya.
4. Jika menyalin seluruh folder, pilih merge/replace sesuai struktur proyek dan jangan menimpa file server/backend yang sudah kamu ubah sendiri.
5. Buka game dan lakukan hard refresh browser (Ctrl+F5), lalu uji skill keempat pet pada setiap tahap evolusi.

Catatan: perubahan ini adalah peningkatan VFX berbasis Phaser pada kode yang tersedia; hasil visual akhir tetap perlu diuji di browser game kamu.
