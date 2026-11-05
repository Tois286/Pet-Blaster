// Konfigurasi pet, skill, evolusi, fusion, EXP, dan kartu peningkatan.
const BURN_PCT = .1;   // Bola Lava (api evolusi 3): terbakar 10 detik, tiap detik HP target berkurang 10% dari damage yang diterimanya
const SKILL_ICON = 'assets/ui/gatling-icon.png?v=1';   // gambar ikon tombol ultimate (path dihitung dari index.html, sama seperti aset lain)
let autoPlay = false; try { autoPlay = localStorage.getItem('petblaster-auto') === '1'; } catch (_) { }   // Auto Play: ultimate dipakai otomatis, kartu upgrade dipilih otomatis, kartu evolusi ditutup otomatis
const SKILL_BUFF_MS = 10000, SKILL_BUFF = 1.1;   // Badai Peluru: Tois +10% damage & +10% kecepatan tembak selama 10 detik
const MAG_SIZE = 35, RELOAD_MS = 2400;   // 35 peluru per magasin; habis -> reload 2,4 dtk -> penuh lagi, berulang sampai pertempuran selesai
const ELS = ['api', 'air', 'tanah', 'angin'];
// Ukuran pet per evolusi: evo 1 = ukuran dasar (paling kecil), evo 2 dan evo 3 makin besar. Ubah PET_GROW untuk mengatur seberapa besar.
const PET_GROW = [0.5, 0.8, 1.3];   // pengali ukuran tampil karakter untuk evo 1, 2, 3
// Ukuran karakter yang terlihat di tiap sprite sheet (px, akar dari lebar x tinggi gambar karakter di dalam frame, rata-rata frame idle);
// dipakai agar ukuran tampil tidak bergantung pada seberapa penuh gambar mengisi frame. Hitung ulang bila sprite diganti.
const PET_VIS = { pet_api1: 129.5, pet_api2: 118.8, pet_api3: 136.3, pet_air1: 117.7, pet_air2: 114.4, pet_air3: 112, pet_tanah1: 111.4, pet_tanah2: 115.4, pet_tanah3: 124.4, pet_angin1: 96.9, pet_angin2: 106.5, pet_angin3: 127.8 };
const petScale = (el, st) => PET_VIS['pet_' + el + '1'] * .5 * PET_GROW[st - 1] / PET_VIS['pet_' + el + st];   // evo 1 tetap .5 seperti semula
const petH = p => PET_VIS['pet_' + p.el + p.stage] * p.scaleY;   // tinggi karakter yang tampak di layar (px)
const EL = { api: 0xff6a2e, air: 0x3ec6ff, tanah: 0xc89a5a, angin: 0x7fe0ff };
const EVO = { api: ['Rubah', 'Srigala Api', 'Serigala Lava'], air: ['Salamander', 'Naga Air', 'Naga Es'], tanah: ['Tikus Tanah', 'Tikus Batu', 'Tikus Berlian'], angin: ['Burung Pipit', 'Burung Elang', 'Burung Garuda'] };
// ==========================================
// SISTEM SKILL PET
// n     = nama skill
// t     = jenis serangan (bolt, aoe, line)
// k     = jumlah target musuh terdepan
// sp    = tambahan jangkauan target sekitar
// m     = pengali damage
// cd    = cooldown dalam milidetik
// r     = radius area serangan
// w     = setengah lebar dasar serangan lajur
// slow  = durasi perlambatan (ms)
// stun  = durasi penghentian (ms)
// burn  = durasi terbakar (ms)
// ==========================================
const SK = {
  api: [{ n: 'Cakar Terbang', t: 'bolt', k: 1, sp: 45, m: 1.2, cd: 3500 }, { n: 'Cakar Api Membara', t: 'bolt', k: 3, sp: 45, m: 1.8, cd: 3500 }, { n: 'Bola Lava', t: 'aoe', r: 70, m: 4, burn: 10000, cd: 5000 }],
  air: [{ n: 'Gelembung Air', t: 'aoe', r: 40, m: 1.5, slow: 200, cd: 3000 }, { n: 'Bola Air', t: 'aoe', r: 60, m: 2.5, slow: 2500, cd: 3500 }, { n: 'Kristal Es', t: 'aoe', r: 80, m: 3.5, stun: 2000, cd: 5000 }],
  tanah: [{ n: 'Penggalian Lubang', t: 'aoe', r: 45, m: 1.5, stun: 500, cd: 3500 }, { n: 'Menggelinding', t: 'line', w: 40, m: 2.5, cd: 4500 }, { n: 'Gali & Tabrak', t: 'line', w: 50, m: 3, stun: 1000, cd: 5000 }],
  angin: [{ n: 'Kepakan Sayap', t: 'line', w: 10, m: 1.2, slow: 1500, cd: 2500 }, { n: 'Cakaran Terbang', t: 'bolt', k: 5, m: 1.4, cd: 3000 }, { n: 'Puting Beliung', t: 'aoe', r: 90, m: 3, slow: 3000, cd: 5000 }]
};

// ---- Aturan EXP & kartu upgrade ----
// EXP terisi dari damage yang diberikan ke musuh. Tiap bar penuh -> game berhenti & muncul 3 kartu pilihan.
// Target EXP berikutnya = target sebelumnya x XP_GROWTH (naik 10%). XP_GAIN = pengali EXP yang didapat dari damage (naikkan agar kartu lebih sering muncul). ISLAND_XP = EXP berlipat tiap pulau (pulau ke-n x ISLAND_XP^n), jadi makin jauh makin banyak EXP.
// Kartu Emas (fusion): syarat pet evolusi 3 saja tidak cukup, kartunya muncul secara acak tiap naik level.
// GOLD_CHANCE = peluang dasar per naik level; GOLD_PITY = tambahan peluang tiap naik level yang gagal (reset saat kartu emas didapat). Ubah dua angka ini untuk mengatur tingkat kesulitan.
const GOLD_CHANCE = .10, GOLD_PITY = .03;
const XP_BASE = 150, XP_GROWTH = 1.1, XP_GAIN = 1.3, ISLAND_XP = 2, XP_CARDS = 3;
// Evolusi pet: jumlah kartu milik pet itu sendiri yang dibutuhkan. Evolusi 1 -> 2 butuh 4 kartu, lalu 2 -> 3 butuh 6 kartu baru.
const EVO_NEED = [4, 6];
let PET_Y = 568; const PET_SLOTS = [151, 239, 95, 295];   // urutan: api, air, tanah, angin. Kaki pet berpijak di jalan kayu benteng arena baru (y 540-572, x 63-325); tengah (x 195) dikosongkan untuk Tois
// ---- Naga Fusion Api + Air di pertempuran. Syarat pemanggilan: (1) pet Api dan Air sama-sama evolusi 3, (2) mendapatkan KARTU EMAS Fusion saat naik level.
// Bila kartu emas dipilih: pet Api dan Air menghilang, lalu naga turun dari atas ke rumput tepat di depan tembok benteng, di tengah layar.
// Uji cepat lewat URL: ?naga=1 = Api dan Air langsung evolusi 3 (kartu emas muncul di naik level pertama); ?naga=2 = naga langsung muncul.
// x / y (garis pijak kaki) / h (tinggi tampil, px) mengatur posisi dan ukuran. fireFrames = frame saat kepala terangkat dan mulut terbuka lebar (serangan dilepas), satu per geraman di dalam satu putaran animasi (sheet 475 frame, 30 fps = 15,8 detik per putaran; geraman 1 puncak di frame 96, geraman 2 di frame 344). lead = berapa frame sebelum titik tembak animasi dimulai ulang bila naga baru siap menembak (agar menunggu paling lama sekitar 2 detik). cardChance 1 = kartu emas pasti muncul di undian berikutnya setelah syarat 1 terpenuhi (turunkan, mis. .5, agar acak).
const NAGA_AIR = { id: 'api+air', depth: 880, els: ['api', 'air'], key: 'naga_fusion', anim: 'naga_fusion_idle', title: 'Fusion Naga Api & Es', cardDesc: 'Api dan Air evolusi 3 melebur jadi satu naga. Pet Api dan Air menghilang.', roarName: 'Napas Api & Es', tint: 0x9fdcff, ring: [0xff762e, 0x7fd8ff], shadow: [2.1, 1.3], c2: 0x8fdcff, halo: 0x0b1f4a, dc: '#bfefff', src: 'assets/pets/fusion_api_air_battle.webp?v=n4', card: 'assets/pets/fusion_api_air.gif', fw: 160, fh: 204, frames: 475, fps: 30, x: W / 2, y: BASE_Y - 6, h: 140, anchorY: .985, fireFrames: [96, 344], lead: 48, m: 5, burn: 8000, stun: 1500, cardChance: 1 };
// ---- Raung Lava-Batu (Fusion Api + Tanah): aturan sama persis dengan Naga Api + Air (syarat, kartu emas, arena zona, Laser Fusion, geraman). Sprite sheet 12x10 = 120 frame @ 240x344 (serigala kristal api, video PixVerse baru); kepala terangkat dan mulut terbuka lebar di frame 60 (pengisian laser mulai frame 48). anchorY = garis pijak kaki (ekor yang menyabet ke bawah ikut muat di sel); mouth = tinggi mulut dari kaki sebagai pecahan NAGA.h (titik keluar laser).
const NAGA_TANAH = { id: 'api+tanah', depth: 880, els: ['api', 'tanah'], key: 'naga_raung', anim: 'naga_raung_idle', title: 'Fusion Raung Lava & Batu', cardDesc: 'Api dan Tanah evolusi 3 melebur jadi satu raung. Pet Api dan Tanah menghilang.', roarName: 'Hujan Meteor', tint: 0xd9a35c, ring: [0xff762e, 0xc79a5a], shadow: [1.5, 1.1], c2: 0xe0a85a, halo: 0x2b1707, dc: '#ffd9a0', src: 'assets/pets/fusion_api_tanah_battle.webp?v=r2', card: 'assets/pets/fusion_api_tanah.png', fw: 240, fh: 344, frames: 120, fps: 24, x: W / 2, y: BASE_Y - 6, h: 150, anchorY: .793, mouth: .74, fireFrames: [60], noLaser: true, meteor: { key: 'fusion_meteor', src: 'assets/pet-actions/fusion_meteor_tanah.webp?v=m1', fw: 400, fh: 336, sc: .3, ang: -44, dx: 70, max: 8, gap: 130, splash: 70, hit: 900 }, lead: 36, m: 5, burn: 8000, stun: 1500, cardChance: 1 };
// ---- Raksasa Kristal (Fusion Air + Tanah): aturan sama persis dengan fusion lain (syarat: pet Air dan Tanah sama-sama evolusi 3 + KARTU EMAS). Sprite sheet 19x10 = 190 frame @ 150x219 (tampak dari belakang; tangan terangkat di frame 32-90, hentakan ke tanah = frame 100: gempa + kristal muncul dari tanah, tanpa laser). Arena dan efek laser memakai aset Es yang sudah ada; ganti src di ZONE_AT / LASER_AT bila sudah punya gambar khusus Air + Tanah.
const NAGA_AT = { id: 'air+tanah', els: ['air', 'tanah'], key: 'naga_air_tanah', anim: 'naga_air_tanah_idle', title: 'Fusion Raksasa Kristal', cardDesc: 'Air dan Tanah evolusi 3 melebur jadi satu raksasa kristal. Pet Air dan Tanah menghilang.', roarName: 'Hentakan Kristal', tint: 0x7fb6ff, ring: [0x7fd8ff, 0xc79a5a], shadow: [1.6, 1.1], c2: 0x8fc4ff, halo: 0x0b1f4a, dc: '#bfdfff', src: 'assets/pets/fusion_air_tanah_battle.webp?v=a2', card: 'assets/pets/fusion_air_tanah.png', fw: 150, fh: 219, frames: 190, fps: 36, x: W / 2, y: BASE_Y - 6, h: 140, anchorY: .93, mouth: .85, fireFrames: [100], noLaser: true, stomp: { key: 'fusion_crystal', anim: 'fusion_crystal_grow', src: 'assets/pet-actions/fusion_crystal_tanah.webp', fw: 400, fh: 300, fps: 20, oy: .8, hit: 200, quake: [520, .009] }, lead: 36, m: 5, burn: 8000, stun: 1500, cardChance: 1 };
// ---- Phoenix Api & Angin (Fusion Api + Angin): aturan sama dengan fusion lain (syarat: pet Api dan Angin sama-sama evolusi 3 + KARTU EMAS). Sprite sheet 14x14 = 190 frame @ 240x252, 24 fps (serigala phoenix terbang, tampak dari belakang; sayap terpotong di video ditutup efek api). Kepakan kuat (serangan) = frame 66 dan 176, tepat setelah sayap terangkat tertinggi (frame 58 dan 168). Tanpa laser: memakai geraman standar (nagaRoar) = semua musuh yang tampil terkena damage + terbakar + terhenti sebentar. Arena memakai aset Arena Es & Lava yang sudah ada; ganti src di ZONE_ANGIN bila sudah punya gambar khusus.
const NAGA_ANGIN = { id: 'api+angin', depth: 880, els: ['api', 'angin'], key: 'naga_api_angin', anim: 'naga_api_angin_idle', title: 'Fusion Phoenix Api & Angin', cardDesc: 'Api dan Angin evolusi 3 melebur jadi satu phoenix. Pet Api dan Angin menghilang.', roarName: 'Kepakan Badai Api', tint: 0xffa04a, ring: [0xff762e, 0x7fe0ff], shadow: [1.6, 1.0], c2: 0xffc27a, halo: 0x2b1707, dc: '#ffd9a0', src: 'assets/pets/fusion_api_angin_battle.webp?v=p1', card: 'assets/pets/fusion_api_angin.png', fw: 240, fh: 252, frames: 190, fps: 24, x: W / 2, y: BASE_Y - 6, h: 150, anchorY: .92, mouth: .6, fireFrames: [66, 176], noLaser: true, tornado: { key: 'fusion_tornado_api_angin', src: 'assets/pet-actions/fusion_tornado_api_angin.webp?v=t1', fw: 222, fh: 372, x: W / 2, y: 320, h: 260, anchorY: .93, dur: 3200, drift: [0, -100], sway: 10, range: 760, pull: [.05, .55], tick: 350, m: .16, radius: 150, bossPull: .45 }, lead: 36, m: 5, burn: 8000, stun: 1500, cardChance: 1 };
// ---- Griffin Tanah & Angin (Fusion Tanah + Angin): aturan sama dengan fusion lain (syarat: pet Tanah dan Angin sama-sama evolusi 3 + KARTU EMAS). Sprite sheet 8x7 = 52 frame @ 480x270, 24 fps, loop mulus (dipotong dari video sayap mengepak: puncak sayap -> puncak sayap berikutnya). Tampak dari belakang, sayap lebar; kaki di anchorY .79 (ekor menjuntai ke bawah ikut muat di sel). Kepakan kuat (serangan) = frame 8, tepat setelah sayap terangkat tertinggi (frame 0-4). Tanpa laser: memakai geraman standar (nagaRoar). Arena memakai aset Arena Es & Lava yang sudah ada; ganti src di ZONE_TA bila sudah punya gambar khusus.
const NAGA_TA = { id: 'tanah+angin', depth: 880, els: ['tanah', 'angin'], key: 'naga_tanah_angin', anim: 'naga_tanah_angin_idle', title: 'Fusion Griffin Tanah & Angin', cardDesc: 'Tanah dan Angin evolusi 3 melebur jadi satu griffin. Pet Tanah dan Angin menghilang.', roarName: 'Badai Pasir', tint: 0xd9b36b, ring: [0xc79a5a, 0x7fe0ff], shadow: [1.9, 1.0], c2: 0xe0c080, halo: 0x2b1f10, dc: '#ffe6b0', src: 'assets/pets/fusion_tanah_angin_battle.webp?v=ta1', card: 'assets/pets/fusion_tanah_angin.png', fw: 480, fh: 270, frames: 52, fps: 24, x: W / 2, y: BASE_Y - 6, h: 135, anchorY: .79, mouth: .5, fireFrames: [8], noLaser: true, crystals: { key: 'fusion_peluru_ta', src: 'assets/pet-actions/fusion_peluru_tanah_angin.webp?v=c1', fw: 288, fh: 480, ox: .5, oy: .4167, sc: .26, n: 10, prep: [28], spread: 130, fan: 9, k: .35, hit: 26, stun: 450, stagger: 55, flight: 620 }, lead: 24, m: 5, burn: 8000, stun: 1500, cardChance: 1 };
// ---- Naga Es & Badai (Fusion Air + Angin): aturan sama dengan fusion lain (syarat: pet Air dan Angin sama-sama evolusi 3 + KARTU EMAS). Sprite sheet 10x10 = 92 frame @ 384x252, 24 fps, loop mulus (frame 0 = frame 92 pada video; 2 kepakan sayap per putaran = 3,8 detik). Sayap terangkat tertinggi di frame 28 dan 62, ayunan ke bawah paling kuat di frame 35 dan 70. Tanpa laser: kepakan kuat (fireFrames = 35, sekali per putaran) memanggil BADAI SALJU (efek 24 frame 322x360, 20 fps).
// blizzard: grow = lama tumbuh (frame 0-8), hold = frame pusaran penuh yang diulang bolak-balik tiap step ms, fade = lama memudar (frame 16-23), dur = total (3600 ms, sedikit lebih pendek dari 1 putaran naga 3833 ms, jadi badai berikutnya muncul tepat saat naga mengepak lagi). tick = jeda damage (ms), m = pengali damage per tick dari damage Tois x NAGA.m, slow = lama perlambatan (ms) tiap tick, freeze = lama beku pada kena pertama (bos tidak beku, hanya melambat). x / y = titik dasar badai (tengah badan naga, setinggi sayap; badai keluar dari sini lalu naik ke arah monster, jauh dari benteng), h = tinggi akhir (400 px: dari sayap naga sampai baris Wave di atas layar), w = lebar akhir (layar + 40 px, agar badai menyentuh sisi kiri dan kanan layar; tepi sprite yang memudar ikut terpotong layar), s0 = skala awal saat baru keluar dari kepakan (.25 lalu membesar selama grow), depth / alpha = lapisan dan transparansi, top / bot / rx = batas area damage (y layar dan setengah lebar).
const NAGA_AA = { id: 'air+angin', depth: 880, els: ['air', 'angin'], key: 'naga_air_angin', anim: 'naga_air_angin_idle', title: 'Fusion Naga Es & Badai', cardDesc: 'Air dan Angin evolusi 3 melebur jadi satu naga es. Pet Air dan Angin menghilang.', roarName: 'Badai Salju', tint: 0x9fdcff, ring: [0x7fd8ff, 0xdff6ff], shadow: [1.9, 1.0], c2: 0x9fdcff, halo: 0x0b1f4a, dc: '#bfefff', src: 'assets/pets/fusion_air_angin_battle.webp?v=e1', card: 'assets/pets/fusion_air_angin.png', fw: 384, fh: 252, frames: 92, fps: 24, x: W / 2, y: BASE_Y - 6, h: 160, anchorY: .84, mouth: .70, fireFrames: [35], noLaser: true, blizzard: { key: 'fusion_blizzard_air_angin', src: 'assets/pet-actions/fusion_blizzard_air_angin.webp?v=b1', fw: 322, fh: 360, x: W / 2, y: 400, h: 400, w: W + 40, s0: .25, depth: 690, alpha: .9, dur: 3600, grow: 450, gf: 9, hold: [9, 10, 11, 12, 13, 14, 15, 14, 13, 12, 11, 10], step: 90, fadeFrom: 16, fadeN: 8, fade: 450, tick: 400, m: .14, slow: 1000, freeze: 800, top: 10, bot: 420, rx: W }, lead: 30, m: 5, burn: 8000, stun: 1500, cardChance: 1 };
const NAGA_TEST = +((location.search.match(/[?&]naga=(\d+)/) || [])[1] || 0);   // 1 = Api+Air evolusi 3, 2 = naga langsung muncul, 3 = Api+Tanah evolusi 3, 4 = raung langsung muncul, 5 = Air+Tanah evolusi 3, 6 = raksasa kristal langsung muncul, 7 = Api+Angin evolusi 3, 8 = phoenix langsung muncul, 9 = Tanah+Angin evolusi 3, 10 = griffin langsung muncul, 11 = Air+Angin evolusi 3, 12 = naga es langsung muncul
// ---- Efek saat Naga Fusion dipanggil ----
// 1) Arena berubah jadi es + lava (FUSION_ZONE.src) dan semua monster yang tampil kehilangan FUSION_ZONE.dot HP tiap detik, sampai pertempuran selesai.
// 2) Skill Laser Fusion (FUSION_LASER): aktif dur ms, menembak monster paling depan, pindah target saat target mati, lalu cooldown cd ms (dihitung setelah laser selesai).
//    Sprite sheet fusion_laser.webp (transparan) = 4x4 frame (483x269): 0-8 pengisian tenaga, 9-12 pilar laser (diulang), 13-15 memudar. tick = jeda damage (ms), m = pengali damage per tick dari damage Tois.
//    SINKRON DENGAN NAGA: pengisian tenaga mulai sync frame sebelum salah satu NAGA.fireFrames (mulut terbuka), laser keluar tepat di titik itu, naga menahan pose itu selama laser, lalu melanjutkan animasi. sync = durasi charge (ms) x NAGA.fps / 1000.
// Tiap fusion punya arena sendiri (780x1280, sama seperti arena pulau): Api+Air = es & lava, Api+Tanah = batu & lava, Air+Tanah = es retak, Api+Angin = lava berangin, Tanah+Angin = kristal malam, Air+Angin = salju berangin.
const ZONE_AIR = { key: 'arena_fusion', src: 'assets/backgrounds/arena_fusion.jpg?v=2', name: 'Arena Es & Lava', dot: 10, every: 1000, fade: 900 };
const ZONE_TANAH = { key: 'arena_fusion_tanah', src: 'assets/backgrounds/arena_fusion_tanah.jpg?v=2', name: 'Arena Batu & Lava', dot: 10, every: 1000, fade: 900 };
const LASER_AIR = { key: 'fusion_laser', a: 'fz_', src: 'assets/pet-actions/fusion_laser.webp', fw: 483, fh: 269, dur: 10000, cd: 7000, charge: 500, sync: 15, tick: 250, m: 1.5, sc: .38, anchorY: .86, bw: .4, bodyH: 190 };   // sc = skala ledakan di mulut, bw = lebar sinar, bodyH = tinggi badan sinar di frame (px) yang diregangkan sampai target
const LASER_TANAH = { key: 'fusion_laser_tanah', a: 'fzt_', src: 'assets/pet-actions/fusion_laser_tanah.webp', fw: 483, fh: 269, dur: 10000, cd: 7000, charge: 500, sync: 12, tick: 250, m: 1.5, sc: .38, anchorY: .86, bw: .4, bodyH: 190 };   // sync = durasi charge (ms) x fps naga / 1000 (500 ms x 24 fps = 12 frame)
// Fusion aktif: NAGA / FUSION_ZONE / FUSION_LASER menunjuk ke set milik fusion yang sedang dipanggil (default Api + Air). Fusion baru = tambah satu set NAGA_x + ZONE_x + LASER_x lalu daftarkan di FUSIONS.
const ZONE_AT = { ...ZONE_AIR, key: 'arena_fusion_air_tanah', src: 'assets/backgrounds/arena_fusion_tanah_air.jpg?v=2', name: 'Arena Es Retak' };
const ZONE_ANGIN = { ...ZONE_AIR, key: 'arena_fusion_api_angin', src: 'assets/backgrounds/arena_fusion_api_angin.jpg?v=2', name: 'Arena Badai & Lava' };
const LASER_ANGIN = { ...LASER_AIR, sync: 12 };   // tidak dipakai (noLaser), hanya agar struktur FUSIONS lengkap
const ZONE_TA = { ...ZONE_AIR, key: 'arena_fusion_tanah_angin', src: 'assets/backgrounds/arena_fusion_tanah_angin.jpg?v=2', name: 'Arena Kristal Malam' };
const LASER_TA = { ...LASER_AIR, sync: 12 };   // tidak dipakai (noLaser), hanya agar struktur FUSIONS lengkap
const LASER_AT = { ...LASER_AIR, sync: 12 };   // sync = durasi charge (500 ms) x fps raksasa (24) / 1000 = 12 frame; key + prefix animasi sama dengan LASER_AIR sehingga sprite sheet tidak dimuat dua kali
const ZONE_AA = { ...ZONE_AIR, key: 'arena_fusion_air_angin', src: 'assets/backgrounds/arena_fusion_air_angin.jpg?v=2', name: 'Arena Badai Es' };
const LASER_AA = { ...LASER_AIR, sync: 12 };   // tidak dipakai (noLaser), hanya agar struktur FUSIONS lengkap
const FUSIONS = { 'api+air': { naga: NAGA_AIR, zone: ZONE_AIR, laser: LASER_AIR }, 'api+tanah': { naga: NAGA_TANAH, zone: ZONE_TANAH, laser: LASER_TANAH }, 'air+tanah': { naga: NAGA_AT, zone: ZONE_AT, laser: LASER_AT }, 'api+angin': { naga: NAGA_ANGIN, zone: ZONE_ANGIN, laser: LASER_ANGIN }, 'tanah+angin': { naga: NAGA_TA, zone: ZONE_TA, laser: LASER_TA }, 'air+angin': { naga: NAGA_AA, zone: ZONE_AA, laser: LASER_AA } };
const FUSION_TIME = 45000;   // lama fusion aktif (ms, waktu game: berhenti saat pilih kartu, ikut x2). Habis -> fusion berakhir, pet kembali ke posisi semula, semua efek dihapus
let NAGA = NAGA_AIR, FUSION_ZONE = ZONE_AIR, FUSION_LASER = LASER_AIR;
function useFusion(id) { const f = FUSIONS[id] || FUSIONS['api+air']; NAGA = f.naga; FUSION_ZONE = f.zone; FUSION_LASER = f.laser; }
NAGA_AIR.b = [0, 1]; NAGA_TANAH.b = [0, 2]; NAGA_AT.b = [1, 2]; NAGA_ANGIN.b = [0, 3]; NAGA_TA.b = [2, 3]; NAGA_AA.b = [1, 3];   // indeks ELS (api, air, tanah, angin) untuk partikel burst
const ELNAME = { api: '🔥 Api', air: '💧 Air', tanah: '🪨 Tanah', angin: '🌪️ Angin' };
// Deskripsi karakter pet per tahap evolusi
const PET_DESC = {
  api: ['Rubah kecil berbulu jingga yang lincah. Cakarnya melesat jauh sebagai Cakar Terbang.', 'Srigala berapi dengan cakar membara. Menyambar lebih banyak musuh sekaligus.', 'Serigala lava berbadan magma. Melontarkan Bola Lava yang meledak di kerumunan musuh.'],
  air: ['Salamander mungil yang meniup gelembung air. Musuh yang terkena bergerak lambat.', 'Naga air yang melontarkan bola air besar. Area lebih luas, musuh makin lambat.', 'Naga es penguasa dingin. Kristal Es membekukan musuh di area luas.'],
  tanah: ['Tikus tanah penggali. Lubang galiannya membuat musuh terjebak sesaat.', 'Tikus berkulit batu yang menggelinding seperti trenggiling, menghantam satu lajur musuh.', 'Tikus berlian yang menggali lalu menabrak. Kuat, menyetrum, dan membuat musuh terhenti.'],
  angin: ['Burung pipit mungil. Kepakan sayapnya menghempas satu lajur musuh dan memperlambatnya.', 'Elang yang tajam. Cakaran Terbang mengincar banyak musuh sekaligus.', 'Garuda penguasa langit. Puting beliung bersayatan menyapu area sangat luas.']
};
const skillInfo = (p, sk) => sk.t === 'bolt' ? 'Menyerang ' + (sk.k + p.extra) + ' musuh terdepan' + (sk.sp ? ' + musuh di sekitarnya' : '') : sk.t === 'aoe' ? 'Ledakan area (radius ' + Math.round(sk.r * p.reach) + ')' : 'Menghantam satu lajur (lebar ' + Math.round(sk.w * 2 * p.reach) + ')';
// Kartu upgrade khusus per pet (tiap kartu dihitung sebagai 1 progres evolusi pet tersebut)
const PET_CARDS = [
  { ic: '💥', n: 'Damage', d: p => 'Damage skill +25%', ok: p => true, go: p => { p.pow *= 1.25; } },
  { ic: '⏱️', n: 'Cooldown', d: p => 'Cooldown skill -15%', ok: p => p.cdMul > .45, go: p => { p.cdMul *= .85; } },
  { ic: '✌️', n: 'Tembakan Ganda', d: p => 'Skill ditembakkan ' + (p.volley + 2) + 'x beruntun', ok: p => p.volley < 2, go: p => { p.volley++; } },
  { ic: '🎯', n: 'Jangkauan', d: p => SK[p.el][p.stage - 1].t === 'bolt' ? '+1 target tembakan' : 'Area serangan +20%', ok: p => p.extra + p.reach < 4, go: p => { if (SK[p.el][p.stage - 1].t === 'bolt') p.extra++; else p.reach *= 1.2; } }
];
const UPGRADES = [
  { id: 'dmg', ic: '💥', n: 'Damage', d: 'Damage tembakan +20%', ok: b => true, go: b => { b.dmg = Math.ceil(b.dmg * 1.2); } },
  { id: 'rate', ic: '⚡', n: 'Kecepatan Tembak', d: 'Tembak 15% lebih cepat', ok: b => 700 / b.rate > 125, go: b => { b.rate *= 1.15; } },
  { id: 'hp', ic: '🛡️', n: 'HP Markas', d: 'HP maks +20 dan pulih +20', ok: b => true, go: b => { b.baseMax += 20; b.baseHp += 20; } },
  { id: 'heal', ic: '❤️', n: 'Pulihkan Markas', d: 'Pulihkan 40% HP maks', ok: b => b.baseHp < b.baseMax, go: b => { b.baseHp = Math.min(b.baseMax, b.baseHp + Math.ceil(b.baseMax * .4)); } },
  { id: 'mag', ic: '🎟️', n: 'Tiket Peluru', d: 'Magasin +10 peluru dan isi +10 peluru', ok: b => true, go: b => { b.magMax += 10; if (!b.reloading) b.ammo += 10; } },
  { id: 'storm', ic: '🌪️', n: 'Badai Peluru Cepat', d: 'Cooldown Badai Peluru -2 dtk', ok: b => b.skillMax > 5000, go: b => { b.skillMax -= 2000; } }
];

// Pemeriksa aset fusion: dijalankan sekali saat pertempuran dibuka. Hasil tampil di console ([ASET] ...) dan, bila ada yang hilang, juga sebagai pesan di layar.
let fusionAssetsChecked = false;
function checkFusionAssets() {
  if (fusionAssetsChecked) return; fusionAssetsChecked = true;
  const list = Object.values(FUSIONS).flatMap(f => [f.zone.src, f.laser.src, f.naga.src, f.naga.card].concat(f.naga.stomp ? [f.naga.stomp.src] : []).concat(f.naga.meteor ? [f.naga.meteor.src] : []).concat(f.naga.tornado ? [f.naga.tornado.src] : []).concat(f.naga.blizzard ? [f.naga.blizzard.src] : []).concat(f.naga.crystals ? [f.naga.crystals.src] : [])).concat(Object.keys(FUSIONS).map(k => FUSION[k].img));
  Promise.all(list.map(u => fetch(u, { method: 'GET', cache: 'no-store' }).then(r => ({ u, ok: r.ok, st: r.status })).catch(() => ({ u, ok: false, st: 'error' })))).then(rs => {
    rs.forEach(r => console[r.ok ? 'log' : 'error']('[ASET] ' + (r.ok ? 'OK ' : 'HILANG (' + r.st + ') ') + r.u + '  -> ' + new URL(r.u, location.href).href));
    const bad = rs.filter(r => !r.ok); if (bad.length) say('Aset tidak terbaca: ' + bad.map(r => r.u.split('/').pop()).join(', '));
  });
}
