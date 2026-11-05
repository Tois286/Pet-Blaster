// Data monster, roster wave, boss, dan konfigurasi serangan jarak jauh.
// Monster musuh (20 sprite di assets/monsters). el = indeks ELS, h = tinggi tampil (px), hp/sp = pengali HP dan kecepatan, fly = melayang.
const MON = {
  1: { f: '01_goblin_api', n: 'Goblin Api', el: 0, h: 52, hp: 1, sp: 1 },
  2: { f: '02_imp', n: 'Imp', el: 0, h: 54, hp: 1.1, sp: 1.1, fly: 1 },
  3: { f: '03_fire_slime', n: 'Slime Api', el: 0, h: 46, hp: .8, sp: 1.2 },
  4: { f: '04_skeleton_api', n: 'Skeleton Api', el: 0, h: 58, hp: 1.4, sp: .9 },
  5: { f: '05_lava_golem_mini', n: 'Golem Lava Mini', el: 0, h: 64, hp: 2.5, sp: .6 },
  6: { f: '06_fishman', n: 'Fishman', el: 1, h: 52, hp: 1, sp: 1 },
  7: { f: '07_water_imp', n: 'Imp Air', el: 1, h: 54, hp: 1.1, sp: 1.1, fly: 1 },
  8: { f: '08_octopus', n: 'Gurita', el: 1, h: 48, hp: 1.2, sp: .9 },
  9: { f: '09_water_skeleton', n: 'Skeleton Air', el: 1, h: 58, hp: 1.4, sp: .9 },
  10: { f: '10_sea_serpent_mini', n: 'Naga Laut Mini', el: 1, h: 62, hp: 2.5, sp: .6 },
  11: { f: '11_goblin_tanah', n: 'Goblin Tanah', el: 2, h: 52, hp: 1, sp: 1 },
  12: { f: '12_rock_golem_mini', n: 'Golem Batu Mini', el: 2, h: 60, hp: 2.2, sp: .55 },
  13: { f: '13_mole', n: 'Tikus Tanah', el: 2, h: 40, hp: .7, sp: 1.35 },
  14: { f: '14_skeleton_tank', n: 'Skeleton Tank', el: 2, h: 58, hp: 1.9, sp: .7 },
  15: { f: '15_earth_worm', n: 'Cacing Tanah', el: 2, h: 56, hp: 1.3, sp: .9 },
  16: { f: '16_harpy', n: 'Harpy', el: 3, h: 52, hp: 1, sp: 1.15, fly: 1 },
  17: { f: '17_wind_imp', n: 'Imp Angin', el: 3, h: 50, hp: 1, sp: 1.2, fly: 1 },
  18: { f: '18_vulture', n: 'Burung Nasar', el: 3, h: 50, hp: 1.1, sp: 1.15, fly: 1 },
  19: { f: '19_wind_skeleton', n: 'Skeleton Angin', el: 3, h: 58, hp: 1.4, sp: .9 },
  20: { f: '20_tornado_spirit', n: 'Roh Tornado', el: 3, h: 52, hp: 1.1, sp: 1.1, fly: 1 },
  21: { f: '21_water_slime', n: 'Slime Air', el: 1, h: 46, hp: .8, sp: 1.15 },
  22: { f: '22_mud_slime', n: 'Slime Lumpur', el: 2, h: 48, hp: 1.1, sp: .85 },
  23: { f: '23_rock_dragon', n: 'Naga Batu', el: 2, h: 62, hp: 1, sp: 1 },   // Boss Final Pulau Terra (sprite punya animasi serang 'atk')
  24: { f: '24_shark_gorila', n: 'Gorila Hiu', el: 1, h: 62, hp: 1, sp: 1 },   // Boss Final Pulau Aquaria: memukul tembok (animasi 'atk' = pukulan air)
  25: { f: '25_dragon_hell', n: 'Naga Neraka', el: 0, h: 62, hp: 1, sp: 1 },   // Boss Final Pulau Ignis: jarak jauh, melempar bola api raksasa
  26: { f: '26_green_falcon', n: 'Elang Hijau', el: 3, h: 62, hp: 1, sp: 1, fly: 1 }   // Boss Final Pulau Zephyria: terbang, jarak jauh, menembakkan bulu racun
};
// Monster yang muncul di tiap arena (indeks sama dengan ARENAS) dan bos gelombang 5 dan 10.
// Monster wave normal wajib mengikuti elemen pulau. Boss ditangani terpisah oleh ISLANDS.bossPool.
// Terra = tanah/hutan (saat ini roster hutan belum tersedia, gunakan monster tanah).
// Aquaria = air, Ignis = api, Zephyria = angin.
const BOSS = { 5: 10, 10: 5 };
// Monster JARAK JAUH: tidak jalan sampai tembok, berhenti 'stop' px di depan tembok lalu menembakkan proyektil ke benteng.
// tex = tekstur proyektil, col = warna, sc = skala, v = kecepatan (px/ms), arc = tinggi lengkung lemparan, spin = putaran, n = jumlah proyektil,
// every = jeda antar serangan (ms), dmg = HP markas hilang per serangan, cs = ukuran bola tenaga saat membidik, tr = partikel jejak, tor = efek pusaran.
const RANGED = {
  19: { tex: 'arrow', col: 0xe9dfb8, sc: 1, v: .75, rot: 0, stop: 150, every: 1500, dmg: 4, cs: .4 },                                    // Skeleton Angin: pemanah, panah lurus cepat
  2: { tex: 'orb', col: 0xff6a2e, sc: .55, v: .45, arc: 55, spin: .2, stop: 125, every: 1500, dmg: 4, cs: .6, tr: 1, add: 1 },        // Imp: lempar bola api
  7: { tex: 'bubble', col: 0x7fd8ff, sc: 1.3, v: .45, arc: 50, stop: 125, every: 1500, dmg: 4, cs: .6, tr: 1 },                        // Imp Air: lempar gelembung air
  17: { tex: 'slash', col: 0xcff6ff, sc: .6, v: .6, spin: .4, stop: 125, every: 1500, dmg: 4, cs: .55, tr: 1, add: 1 },                // Imp Angin: bilah angin berputar
  8: { tex: 'orb', col: 0x7a3fc9, sc: .75, v: .4, arc: 70, stop: 110, every: 1700, dmg: 4, cs: .7, tr: 1 },                             // Gurita: semprot tinta
  15: { tex: 'rock', col: 0xb08850, sc: .45, v: .42, arc: 60, spin: .3, stop: 100, every: 1700, dmg: 4, cs: .6 },                        // Cacing Tanah:ludah batu
  16: { tex: 'feather', col: 0xd9b38c, sc: 1.1, v: .7, rot: Math.PI / 2, n: 3, stop: 130, every: 1600, dmg: 4, cs: .5 },                // Harpy: 3 bulu tajam
  18: { tex: 'feather', col: 0x5a4a40, sc: 1.2, v: .7, rot: Math.PI / 2, n: 3, stop: 135, every: 1600, dmg: 4, cs: .5 },               // Burung Nasar: 3 bulu tajam
  20: { tex: 'ring', col: 0xcff6ff, sc: .45, v: .5, tor: 1, stop: 120, every: 1500, dmg: 4, cs: .6, tr: 1, add: 1 },                    // Roh Tornado: pusaran mini
  10: { tex: 'bubble', col: 0x3ec6ff, sc: 2.6, v: .4, arc: 40, stop: 170, every: 2000, dmg: 12, cs: 1, tr: 2 },                         // BOS Naga Laut Mini: semburan bola air raksasa
  5: { tex: 'rock', col: 0xff7a3a, sc: 1.1, v: .38, arc: 90, spin: .12, stop: 170, every: 2000, dmg: 12, cs: 1, tr: 2 },                 // BOS Golem Lava Mini: lempar bongkahan lava
  25: { tex: 'orb', col: 0xff6a2e, sc: 1.3, v: .42, arc: 80, spin: .15, stop: 165, every: 2000, dmg: 12, cs: 1, tr: 2, add: 1 },          // BOSS FINAL Naga Neraka: bola api raksasa (animasi 'atk' = semburan api)
  26: { tex: 'feather', col: 0x8dff5a, sc: 1.6, v: .72, rot: Math.PI / 2, n: 3, stop: 170, every: 2000, dmg: 12, cs: .9, tr: 2, add: 1 }   // BOSS FINAL Elang Hijau: tiga bulu racun (satu volley = 12 damage)
};
