# Boss Final Stage 25 — Pet Blaster

Stage 25 tiap pulau sekarang punya Boss Final sendiri (muncul di wave 15):

| Pulau | Boss Final | ID | Tipe serangan |
|---|---|---|---|
| Terra | Naga Batu | mon23 | jarak dekat, memukul tembok |
| Aquaria | Gorila Hiu | mon24 | jarak dekat, pukulan air |
| Ignis | Naga Neraka | mon25 | jarak jauh, bola api raksasa |
| Zephyria | Elang Hijau | mon26 | terbang, jarak jauh, 3 bulu racun |

## Cara pasang
1. Salin isi folder `js/` (`game.js`, `sprites-extra.js`) ke folder tempat `game.js` lama berada. Timpa file lama.
2. Salin isi folder `assets/monsters/` ke `assets/monsters/` di proyek. Isinya 4 sprite sheet (`sheet_23..26_*.webp`) dan 4 gambar potret (`23..26_*.png`).
3. Muat ulang halaman dengan hard refresh (Ctrl+F5) agar cache lama tidak terpakai.

File `sheet_23_rock_dragon.png` lama tidak dipakai lagi dan boleh dihapus.

## Yang diubah di game.js
- `MON`: tambah monster 24, 25, 26.
- `RANGED`: tambah serangan jarak jauh untuk 25 dan 26.
- `ISLANDS`: `boss` Aquaria = 24, Ignis = 25, Zephyria = 26 (Terra tetap 23).
- `makeAnims`: animasi `hit` bersifat opsional. Bos tidak memakainya, hanya berkedip putih saat kena tembak.
- Monster jarak jauh yang punya animasi `atk` kini memutar animasi itu saat membidik.
- Boss Final muncul di tengah layar (tidak terlalu dekat tepi) karena sayapnya lebar.

## Cara menyetel
- Kekuatan: `FINAL_BOSS = { hp: 10, size: 1.9 }` di `game.js` (berlaku untuk keempat bos).
- Jadikan bos jarak dekat: hapus baris `25:` atau `26:` di `RANGED`.
- Kecepatan animasi serang: tambah `"atkFps": 14` di data sprite `sprites-extra.js` (makin besar makin cepat).
