# Pet Blaster - Pemecahan game.js

## Isi folder
- `game.js` : loader/penghubung. Tetap gunakan file ini pada halaman game.
- `game_config.js` : konfigurasi umum dan aturan inti.
- `game_monster.js` : data monster, roster, boss, dan serangan jarak jauh.
- `game_tois.js` : skin, konfigurasi, dan rig animasi karakter Tois.
- `game_pet.js` : konfigurasi pet, skill, evolusi, fusion, EXP, dan kartu upgrade.
- `game_world.js` : pulau, arena, stage, wave, kesulitan, dan bintang.
- `game_systems.js` : API, profil, autentikasi, penyimpanan battle, serta state global.
- `game_engine.js` : Base Phaser, preload aset, animasi, tekstur, dan loading.
- `game_battle.js` : kelas Battle dan logika runtime pertempuran.
- `game_ui.js` : lobi, hasil pertempuran, toko, menu, dan inisialisasi scene Lobby.

## Cara pemasangan
1. Cadangkan `game.js` lama terlebih dahulu.
2. Salin seluruh file `.js` di folder ini ke folder yang sama dengan `game.js` lama.
3. Pastikan nama folder aset dan file pendukung tidak berubah.
4. Jangan menambahkan `<script>` terpisah untuk setiap modul. Cukup pertahankan pemanggilan `game.js` yang sudah ada di HTML.
5. Bersihkan cache browser (Ctrl+F5), lalu uji login, lobi, mulai battle, monster, pet, boss, hasil battle, toko, dan refresh saat battle.

## Catatan penting
- Pemisahan ini mempertahankan isi dan urutan kode sumber sejauh mungkin; yang berubah adalah pembagian file dan cara pemuatan.
- Semua modul dimuat sebagai classic scripts secara berurutan, bukan ES modules. Ini disengaja agar deklarasi global lama tetap kompatibel.
- `game_monster.js` memuat data dan konfigurasi monster. Perilaku monster saat pertempuran masih berada di `game_battle.js`, karena perilaku tersebut merupakan method di dalam kelas `Battle` dan saling terhubung dengan pet, proyektil, HUD, serta sistem damage. Memisahkannya lebih jauh memerlukan refactor kelas tersendiri dan sebaiknya dilakukan setelah versi modular awal lolos pengujian.
- `game_pet.js` memuat konfigurasi pet/skill/fusion. Eksekusi skill pet yang terintegrasi dengan Battle tetap berada di `game_battle.js` untuk menjaga perilaku.
- Pastikan modul-modul tetap satu folder dengan `game.js`; loader membangun URL modul dari lokasi `game.js`.
