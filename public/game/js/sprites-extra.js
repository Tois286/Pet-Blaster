// Data sprite untuk monster tambahan (Slime Air = mon21, Slime Lumpur = mon22) dan 4 Boss Final stage 25
// (Naga Batu = mon23, Gorila Hiu = mon24, Naga Neraka = mon25, Elang Hijau = mon26). Dimuat setelah sprites-data.js.
// Urutan frame tiap sheet: move (jalan, loop) -> hit (0 = tidak ada, bos hanya berkedip putih) -> die -> atk (serang).
// ih = tinggi badan karakter di dalam frame (dipakai game untuk skala), fw/fh = ukuran satu frame. File sheet ada di assets/monsters/.
Object.assign(SPR, {
  mon21: {"file": "monsters/sheet_21_water_slime.png", "fw": 192, "fh": 192, "ih": 95, "move": 8, "hit": 3, "die": 6},
  mon22: {"file": "monsters/sheet_22_mud_slime.png", "fw": 192, "fh": 192, "ih": 93, "move": 8, "hit": 3, "die": 6},
  mon23: {"file": "monsters/sheet_23_rock_dragon.webp", "fw": 292, "fh": 204, "ih": 180, "move": 8, "hit": 0, "die": 8, "atk": 10},
  mon24: {"file": "monsters/sheet_24_shark_gorila.webp", "fw": 332, "fh": 260, "ih": 180, "move": 8, "hit": 0, "die": 8, "atk": 10},
  mon25: {"file": "monsters/sheet_25_dragon_hell.webp", "fw": 318, "fh": 210, "ih": 180, "move": 8, "hit": 0, "die": 8, "atk": 10},
  mon26: {"file": "monsters/sheet_26_green_falcon.webp", "fw": 340, "fh": 242, "ih": 180, "move": 8, "hit": 0, "die": 8, "atk": 10}
});
