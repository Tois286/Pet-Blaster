// Pet Blaster: tampilan portrait untuk Android. Tois, pet, monster musuh, dan latar memakai gambar PNG/JPG di assets/.
const API = '/api';
const $ = id => document.getElementById(id);
// Kanvas 390x640 (rasio latar arena baru 1270x2090). Tata letak lobi lama dirancang untuk lebar 360, jadi digeser OX = 15 px ke kanan.
const W = 390, H = 640, OX = (W - 360) / 2, HX = (W - 220) / 2, BASE_Y = 490, WAVES = 10;
// Monster yang sampai di tembok benteng berhenti dan memukul tembok berulang kali (tidak lenyap). Selama masih hidup ia terus memukul.
// dmg = HP markas yang hilang per pukulan, every = jeda antar pukulan (ms). Monster bos memukul lebih keras tetapi lebih lambat.
const WALL_HIT = { dmg: 5, bossDmg: 15, every: 1200, bossEvery: 1800 };
const COST = { damage: 100, fire_rate: 150, max_hp: 120 };      // hanya tampilan; harga asli dicek server
// Bintang pet: permanen (disimpan server per akun), semua pet mulai dari bintang 1. Biaya naik dari bintang N ke N+1 ada di STAR_COST (harga asli dicek server).
// STAR_PER = tambahan damage skill per bintang di atas 1, untuk evolusi 1, 2, 3. Evolusi 2 jauh lebih besar dari evolusi 1. Ubah angka ini untuk menyetel kekuatan.
const STAR_MAX = 5, STAR_COST = { 1: 500, 2: 1500, 3: 4000, 4: 10000 }, STAR_PER = [0.2, 0.5, 0.6];
const petStars = el => Math.min(STAR_MAX, Math.max(1, +(profile && profile.progress && profile.progress['star_' + el]) || 1));
const starMul = (el, st) => 1 + (petStars(el) - 1) * STAR_PER[st - 1];   // pengali damage skill pet; dihitung ulang tiap serangan, jadi otomatis ikut naik saat evolusi
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
const POOL = [[11, 12, 13, 14, 15, 22], [6, 7, 8, 9, 10, 21], [1, 2, 3, 4, 5], [16, 17, 18, 19, 20]];
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
const TOIS_ANIM = { src: 'assets/characters/tois-anim.webp', fw: 172, fh: 320, frames: 90, fps: 15 };   // animasi lobi dari tois.gif (latar sudah dihapus)
const HERO_KEY = 'tois', HERO_SRC = 'assets/characters/tois.png', HERO_TEX_H = 648; // karakter halaman awal tetap memakai animasi asli
// Tois khusus gameplay: spritesheet transparan dari video (latar & asap dihapus). 59 frame + 1 frame siap: 0-7 semburan tembak, 8-58 reload, 59 siaga.
const BATTLE_HERO_KEY = 'tois_battle_gatling', BATTLE_HERO_SRC = 'assets/characters/tois-gatling.webp';
const BATTLE_SHEET = { fw: 166, fh: 382, burst: 8, reload: 51, ready: 59, charH: 269.3, anchorX: .5, anchorY: .9933, tipUp: 272.5 };
const BURN_PCT = .1;   // Bola Lava (api evolusi 3): terbakar 10 detik, tiap detik HP target berkurang 10% dari damage yang diterimanya
const SKILL_ICON = 'assets/ui/gatling-icon.png?v=1';   // gambar ikon tombol ultimate (path dihitung dari index.html, sama seperti aset lain)
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
// Skill evolusi: t = jenis (bolt: k musuh terdepan, aoe: lingkaran r, line: lajur lebar w), m = pengali damage, cd = jeda (ms)
const SK = {
  api: [{ n: 'Cakar Terbang', t: 'bolt', k: 3, sp: 45, m: 1.2, cd: 3500 }, { n: 'Cakar Api Membara', t: 'bolt', k: 4, sp: 45, m: 1.8, cd: 3500 }, { n: 'Bola Lava', t: 'aoe', r: 70, m: 4, burn: 10000, cd: 5000 }],
  air: [{ n: 'Gelembung Air', t: 'aoe', r: 40, m: 1.5, slow: 200, cd: 3000 }, { n: 'Bola Air', t: 'aoe', r: 60, m: 2.5, slow: 2500, cd: 3500 }, { n: 'Kristal Es', t: 'aoe', r: 80, m: 3.5, stun: 2000, cd: 5000 }],
  tanah: [{ n: 'Penggalian Lubang', t: 'aoe', r: 45, m: 1.5, stun: 500, cd: 3500 }, { n: 'Menggelinding', t: 'line', w: 40, m: 2.5, cd: 4500 }, { n: 'Gali & Tabrak', t: 'line', w: 50, m: 3, stun: 1000, cd: 5000 }],
  angin: [{ n: 'Kepakan Sayap', t: 'line', w: 30, m: 1.2, slow: 1500, cd: 2500 }, { n: 'Cakaran Terbang', t: 'bolt', k: 5, m: 1.4, cd: 3000 }, { n: 'Puting Beliung', t: 'aoe', r: 90, m: 3, slow: 3000, cd: 5000 }]
};
// Urutan arena: normal > salju > lava > kegelapan. ARENA_AT = gelombang awal tiap arena.
const ARENAS = ['Padang Rumput', 'Benteng Salju', 'Benteng Lava', 'Arena Kegelapan'], ARENA_AT = [1, 4, 7, 9];
// Empat pulau petualangan; setiap pulau memiliki 25 stage. Stage 1-24 berisi 10 wave; Stage 25 (final) berisi 15 wave.
const ISLANDS = [
  { name: 'Pulau Terra', title: 'Pulau Terra', desc: 'Pulau awal para penjaga. Hutan hijau, dataran luas, dan monster tanah.', bg: 0, pool: [1, 11, 13, 3, 6, 22, 21], boss: 23, bossPool: [11, 12, 13, 14, 15], bossElements: ['tanah', 'hutan'], color: '#6be3a2' },
  { name: 'Pulau Aquaria', title: 'Pulau Aquaria', desc: 'Kepulauan air dengan gua pasang-surut dan monster laut.', bg: 1, pool: [6, 7, 8, 9, 17, 16, 21], boss: 24, bossPool: [6, 7, 8, 9, 10], bossElements: ['air'], color: '#55cfff' },
  { name: 'Pulau Ignis', title: 'Pulau Ignis', desc: 'Pulau vulkanik penuh lava, tulang api, dan golem raksasa.', bg: 2, pool: [1, 2, 3, 4, 5, 12], boss: 25, bossPool: [1, 2, 3, 4, 5], bossElements: ['api'], color: '#ff8755' },
  { name: 'Pulau Zephyria', title: 'Pulau Zephyria', desc: 'Pulau langit dengan badai, harpy, dan roh tornado.', bg: 3, pool: [16, 17, 18, 19, 20, 14], boss: 26, bossPool: [16, 17, 18, 19, 20], bossElements: ['angin'], color: '#b9dfff' }
];
// Stage 1-24: boss berotasi deterministik dari roster yang sesuai elemen pulau.
// Stage 25 (Boss Final) memakai island.boss: Terra = Naga Batu (23), Aquaria = Gorila Hiu (24), Ignis = Naga Neraka (25), Zephyria = Elang Hijau (26).
function getStageBoss(islandIndex, stageNo) {
  const island = ISLANDS[islandIndex];
  if (stageNo >= 25) return island.boss;
  const eligible = (island.bossPool || []).filter(id => MON[id] && island.bossElements.includes(['api', 'air', 'tanah', 'angin'][MON[id].el]));
  const pool = eligible.length ? eligible : [island.boss];
  return pool[(Math.max(1, stageNo) - 1) % pool.length];
}
const STAGES_PER_ISLAND = 25, WAVES_PER_STAGE = 10, FINAL_STAGE_WAVES = 15;
// Stage final (Stage 25 tiap pulau): 15 wave. Boss final muncul di wave terakhir (wave 15) dan lebih besar/tangguh dari boss biasa.
// Ubah FINAL_BOSS untuk menyetel: hp = pengali HP (boss biasa 7), size = pengali ukuran (boss biasa 1.7).
const FINAL_BOSS = { hp: 10, size: 1.9 };
// Kesulitan naik per stage dan per pulau. Ubah angka di bawah untuk menyetel (satu tempat, dipakai game dan label lobi).
//   stage  = tambahan pengali HP monster per stage                      (awal .22)
//   islandMul = pengali HP monster yang BERLIPAT tiap pulau (pulau ke-n x islandMul^n), agar pulau baru langsung terasa jauh lebih berat
//   speed  = tambahan kecepatan jalan monster per pulau                 (awal 0)
//   extra  = tambahan jumlah monster per wave untuk tiap pulau          (awal 0)
//   dmg    = tambahan damage monster ke markas per pulau (pulau ke-n x (1 + n*dmg))
const DIFF = { stage: .10, islandMul: 5, speed: .012, extra: 10, dmg: .5 };
const difficultyOf = (island, stage) => (1 + (stage - 1) * DIFF.stage) * Math.pow(DIFF.islandMul, island);
const wallDmgMul = island => 1 + island * DIFF.dmg;   // damage monster ke markas naik tiap pulau
const monstersPerWave = (island, wave) => 4 + wave * 2 + island * DIFF.extra;
const wavesFor = stage => stage >= STAGES_PER_ISLAND ? FINAL_STAGE_WAVES : WAVES_PER_STAGE;
const isFinalWave = (stage, wave) => stage >= STAGES_PER_ISLAND && wave === FINAL_STAGE_WAVES;
// Stage final (Stage 25): elite muncul di wave 3, 6, 9 (tiap kali satu elite, bergiliran dari roster elemen pulau), lalu Boss Final di wave 15.
// Stage 1-24 tidak berubah: monster besar muncul di tiap kelipatan wave 5.
const FINAL_ELITE_WAVES = [3, 6, 9];
// Jenis wave: 'final' = Boss Final, 'elite' = elite stage final, 'boss' = monster besar stage biasa, null = wave biasa
function waveKind(stage, wave) {
  if (stage >= STAGES_PER_ISLAND) return wave === FINAL_STAGE_WAVES ? 'final' : FINAL_ELITE_WAVES.includes(wave) ? 'elite' : null;
  return wave % 5 === 0 ? 'boss' : null;
}
function getWaveBoss(islandIndex, stageNo, wave) {
  if (waveKind(stageNo, wave) === 'elite') return getStageBoss(islandIndex, STAGES_PER_ISLAND - 4 + wave / 3);   // wave 3, 6, 9 -> tiga elite berbeda
  return getStageBoss(islandIndex, stageNo);
}
let selectedIsland = 0, selectedStage = 1;
const progressKey = () => 'petblaster-world-' + (profile?.username || 'guest');
function worldProgress() { try { return JSON.parse(localStorage.getItem(progressKey()) || '{}'); } catch (_) { return {}; } }
function saveWorldProgress() { const p = worldProgress(); p[selectedIsland] = Math.max(+p[selectedIsland] || 1, selectedStage); localStorage.setItem(progressKey(), JSON.stringify(p)); }
function stageUnlocked(island, stage) {
  if (island === 0 && stage === 1) return true;
  const p = worldProgress();
  if (stage > 1) return (+p[island] || 0) >= stage - 1;
  return (+p[island - 1] || 0) >= STAGES_PER_ISLAND;
}

// ---- Sistem bintang stage (1-3 bintang) ----
// Bintang dihitung dari sisa HP markas saat menang: menang = 1, sisa HP >= two = 2, sisa HP >= three = 3. Ubah STAR_RULES untuk menyetel.
const STAR_RULES = { two: .5, three: .8 };
const starsKey = () => 'petblaster-stars-' + (profile?.username || 'guest');
function starData() { try { return JSON.parse(localStorage.getItem(starsKey()) || '{}'); } catch (_) { return {}; } }
// Stage yang sudah ditaklukkan sebelum sistem bintang ada dihitung minimal 1 bintang.
const stageStars = (island, stage) => +starData()[island + '-' + stage] || (stage <= (+worldProgress()[island] || 0) ? 1 : 0);
function saveStageStars(island, stage, n) { const d = starData(), k = island + '-' + stage; if (n > (+d[k] || 0)) { d[k] = n; try { localStorage.setItem(starsKey(), JSON.stringify(d)); } catch (_) { } } }
function islandStars(island) { let t = 0; for (let s = 1; s <= STAGES_PER_ISLAND; s++) t += stageStars(island, s); return t; }
const calcStars = ratio => ratio >= STAR_RULES.three ? 3 : ratio >= STAR_RULES.two ? 2 : 1;
const starStr = n => '★'.repeat(n) + '☆'.repeat(3 - n);
document.head.appendChild(Object.assign(document.createElement('style'), {
  textContent: '#resultStars{display:flex;justify-content:center;gap:6px;font-size:42px;line-height:1;margin:6px 0 8px}'
    + '#resultStars span{color:#5b4a7a;opacity:0;transform:scale(.4);animation:starpop .45s ease-out forwards}'
    + '#resultStars span.on{color:#ffd34d;text-shadow:0 0 10px rgba(255,211,77,.7)}'
    + '@keyframes starpop{60%{transform:scale(1.25);opacity:1}100%{transform:scale(1);opacity:1}}'
    + '.stage-node small{white-space:nowrap}'
}));

let game = null, profile = null;

async function api(path, method = 'GET', body = null) {
  const o = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (body !== null) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
  const res = await fetch(API + path, o);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.message || 'Permintaan gagal.');
  return data;
}
// Info progres lobi mengikuti pulau & stage terpilih (progres per pulau dari worldProgress)
function updateLobbyInfo() {
  if (!profile) return;
  const isl = ISLANDS[selectedIsland], done = Math.min(STAGES_PER_ISLAND, +worldProgress()[selectedIsland] || 0), cleared = done >= selectedStage;
  $('xpBar').style.width = done / STAGES_PER_ISLAND * 100 + '%';
  $('stageNo').textContent = selectedStage;
  $('stageTitle').textContent = 'Boss: ' + MON[getStageBoss(selectedIsland, selectedStage)].n;
  $('bestWave').textContent = done;
  $('stageSub').textContent = isl.name + ' · ' + (done >= STAGES_PER_ISLAND ? 'Pulau tamat! ★' + islandStars(selectedIsland) : cleared ? 'Stage ' + selectedStage + ' ditaklukkan ' + starStr(stageStars(selectedIsland, selectedStage)) : 'Stage ' + selectedStage + ' belum ditaklukkan');
  $('goalTxt').textContent = 'Taklukkan ' + STAGES_PER_ISLAND + ' stage ' + isl.name + ' (' + done + '/' + STAGES_PER_ISLAND + ')';
  $('miles').innerHTML = [5, 10, 25].map(n => `<div class="m${done >= n ? ' on' : ''}"><i>${done >= n ? '✅' : '🎁'}</i><span>Stage ${n}</span></div>`).join('');
}
function refreshLobbyScene() {   // bangun ulang lobi (bos & tampilan) setelah pulau/stage berubah
  updateLobbyInfo();
  if (game && game.scene.isActive('Lobby')) game.scene.getScene('Lobby').scene.restart();
}
function showProfile(d) {
  profile = d; const p = d.progress;
  $('playerName').textContent = d.username; $('coins').textContent = p.coins;
  $('level').textContent = p.level; $('bestWave').textContent = p.best_wave;
  const bw = +p.best_wave;
  updateLobbyInfo();
  const afk = +d.afk || 0; $('afkAmt').textContent = afk; $('afkBtn').disabled = afk < 1;
  document.querySelectorAll('[data-upgrade]').forEach(b => {
    const t = b.dataset.upgrade;
    b.querySelector('.val').textContent = p[t]; b.querySelector('.cost').textContent = '🪙 ' + COST[t];
    b.disabled = +p.coins < COST[t];
  });
  $('hubCoins').textContent = p.coins; if (!$('hub').hidden) renderHub();   // panel menu bawah ikut diperbarui
}
async function refreshProfile() { showProfile(await api('/profile')); }
// Setelah login/refresh: langsung arahkan pilihan ke stage berikutnya yang belum ditaklukkan
function resumeSelection() {
  const p = worldProgress();
  let isl = 0;
  ISLANDS.forEach((_, i) => { if ((+p[i] || 0) > 0) isl = i; });
  let done = Math.min(STAGES_PER_ISLAND, +p[isl] || 0);
  if (done >= STAGES_PER_ISLAND && isl < ISLANDS.length - 1) { isl++; done = 0; }   // pulau tamat -> pulau berikutnya
  selectedIsland = isl; selectedStage = Math.min(STAGES_PER_ISLAND, done + 1);
}
async function enterGame() {
  await refreshProfile();
  resumeSelection(); updateLobbyInfo();
  $('authPanel').hidden = true; $('gamePanel').hidden = false;   // halaman login ditutup (lihat aturan [hidden] di game.css)
  $('password').value = '';
  if (!game) startGame();
}
function setAuthBusy(busy) { document.querySelectorAll('#authForm button').forEach(b => { b.disabled = busy; }); }
$('authForm').addEventListener('submit', async e => {
  e.preventDefault();
  const mode = e.submitter?.dataset.mode || 'login';
  const username = $('username').value.trim(), email = $('email').value.trim(), password = $('password').value;
  $('authMessage').textContent = 'Memproses...'; setAuthBusy(true);
  try {
    if (mode === 'register') await api('/register', 'POST', { username, email, password });
    await api('/login', 'POST', { identity: mode === 'register' ? username : (username || email), password });
    await enterGame(); $('authMessage').textContent = '';
  } catch (err) { $('authMessage').textContent = err.message; }
  finally { setAuthBusy(false); }
});
$('logoutButton').addEventListener('click', async () => {
  if (game) { game.destroy(true); game = null; }
  try { await api('/logout', 'POST', {}); } catch (err) { console.error(err); }
  $('result').hidden = true; $('gamePanel').classList.remove('battle'); $('gamePanel').hidden = true; $('authPanel').hidden = false;
});
$('fsBtn').addEventListener('click', () => { if (game) game.scale.toggleFullscreen(); });
$('afkBtn').addEventListener('click', async () => {
  $('afkBtn').disabled = true;
  try { const r = await api('/afk/claim', 'POST', {}); say('Hadiah AFK: +' + r.coins + ' koin!'); } catch (err) { say(err.message); }
  try { await refreshProfile(); } catch (err) { console.error(err); }
});
document.querySelectorAll('[data-upgrade]').forEach(b => b.addEventListener('click', async () => {
  b.disabled = true;
  try { await api('/upgrade', 'POST', { type: b.dataset.upgrade }); say('Upgrade berhasil! Berlaku di pertempuran berikutnya.'); }
  catch (err) { say(err.message); }
  try { await refreshProfile(); } catch (err) { console.error(err); }
}));
$('againButton').addEventListener('click', () => {
  $('result').hidden = true; say('Tahan layar untuk menembak 2x lebih cepat.');
  game.scene.start('Battle');
});

const TS = (size, color) => ({ fontFamily: 'system-ui, sans-serif', fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#2b1d4a', strokeThickness: 4, resolution: 2 });

// Rig Tois khusus gameplay: sprite baru, dengan gerak lembut untuk napas, bidikan, recoil, dan terkena serangan.
// Halaman lobi tidak memakai rig ini sehingga animasi sebelum mulai tetap persis seperti semula.
class HeroRig {
  constructor(scene, x, feetY, h) {
    this.sc = scene; this.x = x; this.y = feetY; this.h = h;
    this.k = h / BATTLE_SHEET.charH; this.baseScale = this.k;
    this.t = 0; this.kick = 0; this.hurtT = 0; this.shake = 0;
    this.aim = 0; this.aimGoal = 0; this.lift = 0; this.reloading = false;
    const A = scene.anims, K = BATTLE_HERO_KEY, B = BATTLE_SHEET;
    if (!A.exists('tois_b_burst')) A.create({ key: 'tois_b_burst', frames: A.generateFrameNumbers(K, { start: 0, end: B.burst - 1 }), frameRate: 30, repeat: 0 });
    if (!A.exists('tois_b_reload')) A.create({ key: 'tois_b_reload', frames: A.generateFrameNumbers(K, { start: B.burst, end: B.burst + B.reload - 1 }), frameRate: B.reload / (RELOAD_MS / 1000), repeat: 0 });
    if (!A.exists('tois_b_ready')) A.create({ key: 'tois_b_ready', frames: [{ key: K, frame: B.ready }], frameRate: 1, repeat: -1 });
    this.sprite = scene.add.sprite(x, feetY, K, B.ready)
      .setOrigin(B.anchorX, B.anchorY).setScale(this.k).setDepth(700);
    this.sprite.play('tois_b_ready');
  }
  // Satu semburan api per peluru yang ditembakkan; di antara tembakan Tois kembali ke pose siaga.
  shootAnim() {
    if (this.reloading) return;
    const a = this.sprite.anims;
    if (a.isPlaying && a.currentAnim && a.currentAnim.key === 'tois_b_burst') return;
    this.sprite.play('tois_b_burst').chain('tois_b_ready');
  }
  startReload() { this.reloading = true; this.sprite.play('tois_b_reload').chain('tois_b_ready'); }
  endReload() { this.reloading = false; this.sprite.play('tois_b_ready'); }
  reset() { this.reloading = false; this.sprite.play('tois_b_ready'); }
  fireKick() { this.kick = this.reloading ? this.kick : Math.min(1.15, this.kick + .78); this.shake = this.reloading ? 0 : 85; }
  hurt() { this.hurtT = 170; this.kick = -1.0; }
  jump() {
    this.sc.tweens.killTweensOf(this);
    this.sc.tweens.add({ targets: this, lift: 9, duration: 130, yoyo: true, ease: 'Sine.Out' });
  }
  update(dt) {
    const d = Math.min(dt, 50); // cegah lonjakan posisi setelah tab browser tertahan
    this.t += d / 1000;
    this.kick *= Math.exp(-d / 125);
    this.shake = Math.max(0, this.shake - d);
    this.hurtT = Math.max(0, this.hurtT - d);
    // Interpolasi eksponensial menjaga bidikan tetap halus di FPS yang berbeda.
    this.aim += (this.aimGoal - this.aim) * (1 - Math.exp(-d / 135));
    const breathe = Math.sin(this.t * 2.15) * .65;
    const recoil = this.kick * 1.7 + (this.shake > 0 ? Math.sin(this.t * 68) * .18 : 0);
    this.sprite.setPosition(this.x + this.aim * 1.8, this.y - this.lift + breathe - recoil);
    this.sprite.setRotation(this.aim * .085 - this.kick * .014);
    const pulse = 1 + Math.sin(this.t * 2.15) * .0025 - Math.max(0, this.kick) * .006;
    this.sprite.setScale(this.baseScale * pulse);
    this.sprite.setTint(this.hurtT > 0 ? 0xff9b9b : this.buffed ? 0xffe9a0 : 0xffffff);
  }
  // Koordinat perkiraan laras dan tempat selongsong keluar pada sprite gameplay baru.
  tip() { return { x: this.sprite.x + this.aim * 8, y: this.sprite.y - BATTLE_SHEET.tipUp * this.k }; }
  eject() { return { x: this.sprite.x + 8, y: this.sprite.y - this.h * .5 }; }
}

// Layar pemuatan: menutup kanvas yang masih kosong selama aset (puluhan MB) diunduh setelah login, lalu hilang saat lobi siap.
function setLoading(p) {
  const bar = $('loadBar'), txt = $('loadTxt'), pct = Math.round(Math.max(0, Math.min(1, p)) * 100);
  if (bar) bar.style.width = pct + '%';
  if (txt) txt.textContent = 'Memuat dunia Pet Blaster… ' + pct + '%';
}
function showLoading() { setLoading(0); const el = $('loading'); if (el) el.hidden = false; }
function hideLoading() { const el = $('loading'); if (el) el.hidden = true; }

class Base extends Phaser.Scene {
  preload() {
    this.load.on('progress', setLoading);
    if (!this.textures.exists(HERO_KEY)) this.load.image(HERO_KEY, HERO_SRC);
    if (!this.textures.exists(BATTLE_HERO_KEY)) this.load.spritesheet(BATTLE_HERO_KEY, BATTLE_HERO_SRC, { frameWidth: BATTLE_SHEET.fw, frameHeight: BATTLE_SHEET.fh });
    if (!this.textures.exists('lobby_bg')) this.load.image('lobby_bg', 'assets/backgrounds/lobby.jpg');
    if (!this.textures.exists('tois_anim')) this.load.spritesheet('tois_anim', TOIS_ANIM.src, { frameWidth: TOIS_ANIM.fw, frameHeight: TOIS_ANIM.fh });
    // Monster dan pet = sprite sheet animasi (dibuat tools/make_sprites.py; ukuran frame ada di SPR, js/sprites-data.js)
    Object.keys(MON).forEach(i => { const k = 'mon' + i, s = SPR[k]; if (!this.textures.exists(k)) this.load.spritesheet(k, 'assets/' + s.file, { frameWidth: s.fw, frameHeight: s.fh }); });
    ELS.forEach(el => [1, 2, 3].forEach(n => { const k = 'pet_' + el + n, s = SPR[k]; if (!this.textures.exists(k)) this.load.spritesheet(k, 'assets/' + s.file, { frameWidth: s.fw, frameHeight: s.fh }); }));
    // Efek skill api custom: tebasan untuk evolusi 1-2, bola api untuk evolusi 3.
    if (!this.textures.exists('fire_slash')) this.load.spritesheet('fire_slash', 'assets/pet-actions/fire_slash.png', { frameWidth: 256, frameHeight: 256 });
    if (!this.textures.exists('fire_orb')) this.load.spritesheet('fire_orb', 'assets/pet-actions/fire_orb.png', { frameWidth: 160, frameHeight: 400 });
    if (!this.textures.exists('ice_arrow')) this.load.spritesheet('ice_arrow', 'assets/pet-actions/ice_arrow.png', { frameWidth: 320, frameHeight: 240 });   // efek Kristal Es (air evolusi 3)
    if (!this.textures.exists('ice_freeze')) this.load.spritesheet('ice_freeze', 'assets/pet-actions/ice_freeze.png', { frameWidth: 320, frameHeight: 300 });
    if (!this.textures.exists('water_fx')) this.load.spritesheet('water_fx', 'assets/pet-actions/water_fx.png', { frameWidth: 320, frameHeight: 240 });   // efek Bola Air (air evolusi 2)
    console.log('[GAME] game.js build boss25; sprite slime air/lumpur:', !!SPR.mon21, !!SPR.mon22);
    this.load.on('loaderror', f => console.warn('[GAME] gagal memuat aset:', f && f.src));
    if (!this.textures.exists('wind_blade')) this.load.spritesheet('wind_blade', 'assets/pet-actions/wind_blade.png?v=w2', { frameWidth: 384, frameHeight: 216 });   // efek Cakaran Terbang (angin evolusi 2)
    if (!this.textures.exists('wind_tornado')) this.load.spritesheet('wind_tornado', 'assets/pet-actions/wind_tornado.png?v=w3', { frameWidth: 452, frameHeight: 252 });   // efek Puting Beliung (angin evolusi 3)
    if (!this.textures.exists('earth_hole')) this.load.image('earth_hole', 'assets/pet-actions/earth_hole.png?v=t1');   // lubang Penggalian Lubang (tanah evolusi 1)
    if (!this.textures.exists('earth_ball')) this.load.spritesheet('earth_ball', 'assets/pet-actions/earth_ball.png?v=t2', { frameWidth: 280, frameHeight: 280 });   // bola batu Menggelinding (tanah evolusi 2)
    if (!this.textures.exists('earth_crystal')) this.load.spritesheet('earth_crystal', 'assets/pet-actions/earth_crystal.png?v=t3', { frameWidth: 500, frameHeight: 440 });   // efek kristal Gali & Tabrak (tanah evolusi 3)
    if (!this.textures.exists('fire_lava_claw')) this.load.spritesheet('fire_lava_claw', 'assets/pet-actions/fire_lava_claw.png', { frameWidth: 256, frameHeight: 256 });
  }
  // Pasang karakter Tois dengan tinggi tampilan h (piksel game), berpijak di (x, y).
  heroAnim() { if (!this.anims.exists('tois_idle')) this.anims.create({ key: 'tois_idle', frames: this.anims.generateFrameNumbers('tois_anim', { start: 0, end: TOIS_ANIM.frames - 1 }), frameRate: TOIS_ANIM.fps, repeat: -1 }); }
  addHero(x, y, h) {
    const s = h / HERO_TEX_H, img = this.add.image(x, y, HERO_KEY).setOrigin(.5, 1).setScale(s);
    img.baseScale = s; return img;
  }
  makeAnims() {   // animasi monster: move (loop), hit (sekali), die (sekali); pet: idle (loop), cast (sekali)
    const A = this.anims, mk = (key, k, start, end, fps, repeat) => { if (!A.exists(key)) A.create({ key, frames: A.generateFrameNumbers(k, { start, end }), frameRate: fps, repeat }); };
    Object.keys(MON).forEach(i => { const k = 'mon' + i, s = SPR[k]; mk(k + '_move', k, 0, s.move - 1, 10, -1); if (s.hit) mk(k + '_hit', k, s.move, s.move + s.hit - 1, 24, 0); mk(k + '_die', k, s.move + s.hit, s.move + s.hit + s.die - 1, 18, 0); if (s.atk) mk(k + '_atk', k, s.move + s.hit + s.die, s.move + s.hit + s.die + s.atk - 1, s.atkFps || 14, 0); });
    ELS.forEach(el => [1, 2, 3].forEach(n => { const k = 'pet_' + el + n, s = SPR[k]; const idleFps = el === 'air' ? 10 : 8; mk(k + '_idle', k, 0, s.idle - 1, idleFps, -1); mk(k + '_cast', k, s.idle, s.idle + s.cast - 1, 16, 0); }));
    // Animasi frame-by-frame dari sprite sheet efek skill api.
    mk('fire_slash_anim', 'fire_slash', 0, 4, 16, 0);   // fire_slash.png = 5 frame @ 256x256
    mk('fire_orb_anim', 'fire_orb', 0, 5, 14, -1);   // bola magma terbang: 6 frame diulang selama meluncur
    mk('ice_charge_anim', 'ice_arrow', 0, 2, 18, 0); mk('ice_arrow_anim', 'ice_arrow', 3, 14, 28, -1); mk('ice_burst_anim', 'ice_arrow', 15, 18, 16, 0);
    mk('ice_freeze_anim', 'ice_freeze', 0, 12, 24, 0); mk('ice_glow_anim', 'ice_freeze', 13, 15, 6, -1);
    mk('water_charge_anim', 'water_fx', 0, 5, 24, 0); mk('water_muzzle_anim', 'water_fx', 6, 7, 20, 0); mk('water_bullet_anim', 'water_fx', 8, 16, 24, -1);
    mk('water_hit_anim', 'water_fx', 17, 18, 20, 0); mk('water_splash_anim', 'water_fx', 19, 22, 14, 0);
    // wind_blade.png = 16 frame (384x216, 4 kolom): 0-3 pusaran terbentuk, 4-11 bilah angin melesat (ujung di x=335), 12-15 serpihan daun pecah (pusat di tengah frame).
    mk('wind_charge_anim', 'wind_blade', 0, 3, 22, 0); mk('wind_fly_anim', 'wind_blade', 4, 11, 28, -1); mk('wind_hit_anim', 'wind_blade', 12, 15, 20, 0);
    // wind_tornado.png = 16 frame (452x252, 4 kolom): 0-2 pusaran di tanah, 3-12 tornado tumbuh & berputar (ujung bawah di y=240), 13-15 buyar.
    mk('wind_tornado_anim', 'wind_tornado', 0, 15, 18, 0);
    mk('earth_ball_anim', 'earth_ball', 0, 3, 20, -1);   // bola batu berputar: 4 frame diulang selama menggelinding
    mk('fire_lava_claw_anim', 'fire_lava_claw', 0, 4, 16, 0);   // cakar lava: 5 frame, sekali
  }
  petOrigin(k) { const s = SPR[k]; return (s.fh + s.ih) / 2 / s.fh; }   // kaki pet ada di bawah gambar asli, bukan di dasar frame yang berbantalan
  makeTextures() {
    this.makeAnims();
    if (this.textures.exists('bullet')) return;
    const T = (k, w, h, f) => { const g = this.make.graphics({ add: false }); f(g); g.generateTexture(k, w, h); g.destroy(); };
    T('bullet', 20, 20, g => { g.fillStyle(0xffd34d, .35).fillCircle(10, 10, 10); g.fillStyle(0xffe27a).fillCircle(10, 10, 6); g.fillStyle(0xffffff).fillCircle(10, 10, 3); });
    T('mflash', 64, 40, g => { g.fillStyle(0xff9a2e, .35).fillCircle(46, 20, 17); g.fillStyle(0xff9a2e, .95).fillTriangle(0, 20, 44, 5, 44, 35); g.fillStyle(0xffe27a).fillTriangle(10, 20, 44, 11, 44, 29); g.fillStyle(0xffffff).fillCircle(44, 20, 7); });
    T('shell', 6, 3, g => { g.fillStyle(0xe6b84a).fillRect(0, 0, 6, 3); g.fillStyle(0xfff0a8).fillRect(0, 0, 6, 1); });
    T('spark', 8, 8, g => g.fillStyle(0xffffff).fillCircle(4, 4, 4));
    T('shadow', 60, 14, g => g.fillStyle(0x000000, .25).fillEllipse(30, 7, 56, 12));
    // tekstur efek skill (putih, diwarnai lewat tint saat dipakai)
    const para = (g, x0, w, h, bulgeO, bulgeI, a) => { const pts = []; for (let i = 0; i <= 12; i++) { const t = i / 6 - 1; pts.push({ x: x0 + bulgeO * (1 - t * t), y: h / 2 + t * w / 2 }); } for (let i = 12; i >= 0; i--) { const t = i / 6 - 1; pts.push({ x: x0 + bulgeI * (1 - t * t), y: h / 2 + t * w / 2 }); } g.fillStyle(0xffffff, a).fillPoints(pts, true); };
    T('slash', 72, 64, g => { para(g, 6, 60, 64, 58, 26, .3); para(g, 6, 56, 64, 52, 40, 1); });                  // sabetan bulan sabit (menghadap kanan)
    T('claw', 48, 48, g => { g.fillStyle(0xffffff);[0, 1, 2].forEach(i => g.fillTriangle(6 + i * 13, 2, 13 + i * 13, 2, 20 + i * 13 - 8, 46)); });   // tiga bekas cakar
    T('bubble', 28, 28, g => { g.fillStyle(0xbdefff, .3).fillCircle(14, 14, 13); g.lineStyle(2, 0xffffff, .95).strokeCircle(14, 14, 12); g.fillStyle(0xffffff, .95).fillCircle(9, 9, 3); });
    T('orb', 56, 56, g => { g.fillStyle(0xffffff, .22).fillCircle(28, 28, 27); g.fillStyle(0xffffff, .55).fillCircle(28, 28, 19); g.fillStyle(0xffffff).fillCircle(28, 28, 11); });
    T('shard', 22, 48, g => { g.fillStyle(0xffffff).fillTriangle(11, 0, 22, 42, 0, 42); g.fillStyle(0xffffff, .55).fillTriangle(11, 0, 11, 48, 0, 42); g.lineStyle(1, 0x6fb8e8, .8).strokeTriangle(11, 0, 22, 42, 0, 42); });
    T('rock', 40, 40, g => { const p = [[6, 12], [18, 3], [33, 8], [38, 22], [31, 36], [14, 38], [3, 27]].map(a => ({ x: a[0], y: a[1] })); g.fillStyle(0x9a7a56).fillPoints(p, true); g.lineStyle(2, 0x4a3320).strokePoints(p, true); g.fillStyle(0xc9a878).fillTriangle(10, 12, 20, 6, 24, 16); g.fillStyle(0x6b4f33).fillTriangle(20, 36, 33, 30, 36, 20); });
    T('feather', 14, 34, g => { g.fillStyle(0xffffff).fillEllipse(7, 17, 9, 32); g.lineStyle(1, 0x9fd8ee).lineBetween(7, 2, 7, 32); });
    T('arrow', 40, 10, g => { g.fillStyle(0xffffff).fillRect(4, 4, 28, 2); g.fillTriangle(40, 5, 30, 0, 30, 10); g.fillStyle(0xffffff, .6).fillTriangle(0, 0, 9, 5, 0, 5).fillTriangle(0, 10, 9, 5, 0, 5); });   // panah (menghadap kanan)
    T('ring', 64, 64, g => { g.lineStyle(5, 0xffffff, 1).strokeCircle(32, 32, 28); g.lineStyle(2, 0xffffff, .4).strokeCircle(32, 32, 22); });
    T('cloud', 120, 50, g => { g.fillStyle(0xffffff, .85).fillEllipse(40, 30, 60, 30).fillEllipse(72, 24, 56, 34).fillEllipse(92, 32, 50, 24); });
  }

}

// ---- Aturan EXP & kartu upgrade ----
// EXP terisi dari damage yang diberikan ke musuh. Tiap bar penuh -> game berhenti & muncul 3 kartu pilihan.
// Target EXP berikutnya = target sebelumnya x XP_GROWTH (naik 20%).
const XP_BASE = 150, XP_GROWTH = 1.2, XP_CARDS = 3;
// Evolusi pet: jumlah kartu milik pet itu sendiri yang dibutuhkan. Evolusi 1 -> 2 butuh 4 kartu, lalu 2 -> 3 butuh 6 kartu baru.
const EVO_NEED = [4, 6];
const PET_Y = 568, PET_SLOTS = [151, 239, 95, 295];   // urutan: api, air, tanah, angin. Kaki pet berpijak di jalan kayu benteng arena baru (y 540-572, x 63-325); tengah (x 195) dikosongkan untuk Tois
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

class Battle extends Base {
  constructor() { super('Battle'); }

  makeWorld() { this.arena = -1; this.bg = null; this.setArena(selectedIsland); }
  setArena(i) {   // arena dikunci berdasarkan pulau; semua stage memakai arena pulau tersebut
    if (i === this.arena) return;
    const first = this.arena < 0; this.arena = i;
    const img = this.add.image(W / 2, H / 2, 'arena' + i).setDisplaySize(W, H).setDepth(-1000);
    if (first) { this.bg = img; return; }
    const old = this.bg; this.bg = img; img.setAlpha(0).setDepth(-999);
    this.tweens.add({ targets: img, alpha: 1, duration: 900, onComplete: () => { old.destroy(); img.setDepth(-1000); } });
    this.pop(W / 2, 250, ARENAS[i], '#ffffff', 22);
  }
  preload() {
    super.preload();
    ARENAS.forEach((n, i) => { if (!this.textures.exists('arena' + i)) this.load.image('arena' + i, 'assets/backgrounds/arena' + (i + 1) + '.jpg'); });
  }

  create() {
    this.over = true;
    this.makeTextures(); this.makeWorld();
    this.hero = new HeroRig(this, W / 2, 632, 98);   // Tois tampak belakang, tubuh lentur
    this.shells = this.add.particles(0, 0, 'shell', { speedX: { min: 30, max: 90 }, speedY: { min: -110, max: -40 }, gravityY: 420, lifespan: 650, rotate: { start: 0, end: 540 }, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(705);
    this.mflash = this.add.image(0, 0, 'mflash').setOrigin(.08, .5).setDepth(710).setAlpha(0);
    this.pets = ELS.map((el, i) => { const p = this.add.sprite(PET_SLOTS[i], PET_Y, 'pet_' + el + '1').setOrigin(.5, this.petOrigin('pet_' + el + '1')).setScale(petScale(el, 1)).setDepth(699); p.play({ key: 'pet_' + el + '1_idle', startFrame: i * 2 }); p.el = el; p.cd = 1500 + i * 700; p.by = p.y; p.on = false; p.setVisible(false); Object.assign(p, { stage: 1, prog: 0, pow: 1, cdMul: 1, volley: 0, reach: 1, extra: 0 }); p.lbl = this.add.text(p.x, PET_Y + 7, '', TS(9, '#ffffff')).setOrigin(.5).setDepth(702).setVisible(false); return p; });   // pet baru muncul setelah dipilih lewat kartu
    $('skillBtn').onclick = () => this.skill(); $('skillBtn').style.backgroundImage = "url('" + SKILL_ICON + "')";
    this.choosing = false; $('upgrade').hidden = true; $('evo').hidden = true;
    this.events.once('shutdown', () => { this.choosing = false; $('upgrade').hidden = true; $('evo').hidden = true; });
    this.speed = 1; this.paused = false; this.clock = 0; this.tweens.timeScale = 1;
    $('speedBtn').textContent = 'x1'; $('pauseBtn').textContent = '⏸';
    $('speedBtn').onclick = () => { this.speed = this.speed === 1 ? 2 : 1; this.tweens.timeScale = this.speed; $('speedBtn').textContent = 'x' + this.speed; };
    $('pauseBtn').onclick = () => { if (this.choosing) return; this.paused = !this.paused; $('pauseBtn').textContent = this.paused ? '▶' : '⏸'; if (this.paused) { this.tweens.pauseAll(); this.anims.pauseAll(); } else { this.tweens.resumeAll(); this.anims.resumeAll(); } };
    const mk = c => this.add.particles(0, 0, 'spark', { speed: { min: 50, max: 170 }, lifespan: 400, scale: { start: 1, end: 0 }, tint: c, emitting: false }).setDepth(900);
    this.burst = ELS.map(el => mk(EL[el])); this.flash = mk(0xffe27a);
    this.hud = this.add.graphics().setDepth(1000);
    this.hpTxt = this.add.text(W / 2, 66, '', TS(10, '#ffffff')).setOrigin(.5).setDepth(1001);
    this.ammoTxt = this.add.text(W / 2, 83.5, '', TS(9, '#ffffff')).setOrigin(.5).setDepth(1001);
    this.waveTxt = this.add.text(W - 12, 10, '', TS(15, '#ffffff')).setOrigin(1, 0).setDepth(1001);
    this.killTxt = this.add.text(W - 12, 64, '', TS(13, '#ffd34d')).setOrigin(1, 0).setDepth(1001);
    this.banner = this.add.text(W / 2, 230, '', TS(28, '#ffffff')).setAlign('center').setOrigin(.5).setDepth(1001).setAlpha(0);
    this.manual = false;
    this.input.on('pointerdown', () => { this.manual = true; });
    this.input.on('pointerup', () => { this.manual = false; });
    api('/battle/start', 'POST', {}).then(r => { this.token = r.session; this.begin(); })
      .catch(err => { say(err.message); });
  }

  begin() {
    const p = profile.progress;
    this.dmg = +p.damage; this.rate = +p.fire_rate; this.baseMax = this.baseHp = +p.max_hp;
    this.wave = 0; this.islandIndex = selectedIsland; this.stageNo = selectedStage; this.kills = 0; this.enemies = []; this.bullets = []; this.spawnT = 0; this.shotT = 0; this.petT = 0; this.skillCd = 0; this.over = false;
    this.magMax = MAG_SIZE; this.ammo = MAG_SIZE; this.reloading = false; this.reloadT = 0; this.hero.reset();
    this.evoQ = []; this.level = 1; this.petsSeen = false; this.xp = 0; this.xpNeed = XP_BASE; this.skillMax = 25000; this.buffT = 0;   // status khusus satu pertempuran
    this.nextWave();
  }
  showEvo(p) {   // kartu detail setiap evolusi; game berhenti sampai pemain menekan Lanjut
    const sk = SK[p.el][p.stage - 1], old = SK[p.el][p.stage - 2], st = p.stage, box = $('evoCard');
    const eff = [sk.stun ? (p.el === 'air' ? 'Membekukan ' : 'Menyetrum ') + sk.stun / 1000 + ' dtk' : '', sk.slow ? 'Memperlambat ' + sk.slow / 1000 + ' dtk' : '', sk.burn ? 'Membakar ' + sk.burn / 1000 + ' dtk' : ''].filter(Boolean).join(', ') || '-';
    const next = st >= 3 ? 'Evolusi maksimal tercapai!' : 'Evolusi berikutnya: kumpulkan ' + EVO_NEED[st - 1] + ' kartu ' + EVO[p.el][st - 1];
    box.innerHTML = `<h3>Evolusi ${st}!</h3>
      <div class="evoimg"><img src="assets/pets/${p.el}${st - 1}.png" alt=""><span>➜</span><img class="big" src="assets/pets/${p.el}${st}.png" alt=""></div>
      <h4>${EVO[p.el][st - 2]} ➜ ${EVO[p.el][st - 1]}</h4><p class="tag">${ELNAME[p.el]}</p>
      <p class="desc">${PET_DESC[p.el][st - 1]}</p>
      <dl><dt>Skill</dt><dd>${old.n} ➜ <b>${sk.n}</b></dd><dt>Serangan</dt><dd>${skillInfo(p, sk)}</dd>
      <dt>Damage</dt><dd>${Math.ceil(this.dmg * sk.m * .6 * p.pow * starMul(p.el, p.stage))} per serangan</dd><dt>Cooldown</dt><dd>${(sk.cd * p.cdMul / 1000).toFixed(1)} detik</dd>
      <dt>Efek</dt><dd>${eff}</dd><dt>Tembakan</dt><dd>${p.volley + 1}x beruntun</dd></dl>
      <p class="next">${next}</p><button class="btn main" id="evoOk">Lanjut</button>`;
    this.choosing = true; this.tweens.pauseAll(); this.anims.pauseAll(); $('evo').hidden = false;
    $('evoOk').onclick = () => { $('evo').hidden = true; this.choosing = false; if (!this.paused) { this.tweens.resumeAll(); this.anims.resumeAll(); } this.checkLevel(); };
  }
  hasPet() { return this.pets.some(p => p.on); }
  addPet(el) {   // pet pendukung muncul di slot kosong berikutnya (kiri ke kanan)
    const p = this.pets.find(o => o.el === el), n = this.pets.filter(o => o.on).length;
    p.on = true; p.cd = 1000; p.x = PET_SLOTS[n]; p.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: p, alpha: 1, duration: 300 }); this.flash.emitParticleAt(p.x, p.y - 30, 18); this.petLbl(p);
  }
  xpMul() {   // EXP dinormalkan per pulau: HP monster berlipat dan jumlah monster naik, jadi EXP per damage diperkecil agar laju naik level sama seperti Pulau Terra
    const w = Math.max(1, this.wave), isl = this.islandIndex;
    return monstersPerWave(0, w) / monstersPerWave(isl, w) / Math.pow(DIFF.islandMul, isl);
  }
  addXp(n) { this.xp += n * this.xpMul(); this.checkLevel(); }
  checkLevel() {   // bar penuh -> naik level, target berikutnya x1.2, tampilkan kartu
    if (this.choosing || this.xp < this.xpNeed) return;
    this.xp -= this.xpNeed; this.xpNeed = Math.ceil(this.xpNeed * XP_GROWTH); this.level++;
    this.showCards();
  }
  showCards() {
    const sh = a => Phaser.Utils.Array.Shuffle([...a]);
    const petCards = this.pets.filter(p => !p.on).map(p => ({ img: 'assets/pets/' + p.el + '1.png', n: 'Panggil ' + EVO[p.el][0], d: 'Skill: ' + SK[p.el][0].n, go: b => b.addPet(p.el) }));
    const upCards = this.pets.filter(p => p.on && p.stage < 3).flatMap(p => PET_CARDS.filter(c => c.ok(p)).map(c => ({
      img: 'assets/pets/' + p.el + p.stage + '.png', n: EVO[p.el][p.stage - 1] + ': ' + c.n, d: c.d(p), tag: 'Evolusi ' + (p.prog + 1) + '/' + EVO_NEED[p.stage - 1], go: b => b.petCard(p, c)
    })));
    const stat = UPGRADES.filter(u => u.ok(this));
    let picks = sh([...petCards, ...upCards, ...stat]).slice(0, XP_CARDS);
    if (!this.petsSeen && petCards.length && !picks.some(u => u.img)) picks = sh([petCards[0], ...picks.slice(1)]);   // undian pertama pasti ada kartu pet
    this.petsSeen = true;
    const box = $('cards');
    this.choosing = true; this.tweens.pauseAll(); this.anims.pauseAll(); this.manual = false;
    $('upLv').textContent = 'Lv ' + this.level; box.textContent = '';
    picks.forEach(u => {
      const b = document.createElement('button'); b.className = 'ucard';
      b.innerHTML = (u.img ? `<img src="${u.img}" alt="">` : `<i>${u.ic}</i>`) + `<b>${u.n}</b><span>${u.d}</span>` + (u.tag ? `<em>${u.tag}</em>` : '');
      b.onclick = () => {
        if (!this.choosing) return;
        this.choosing = false; $('upgrade').hidden = true;
        if (!this.paused) { this.tweens.resumeAll(); this.anims.resumeAll(); }
        u.go(this);
        this.pop(W / 2, 300, u.n + '!', '#ffd34d', 18);
        if (this.evoQ.length) this.showEvo(this.evoQ.shift()); else this.checkLevel();   // evolusi: tampilkan kartu detail dulu
      };
      box.appendChild(b);
    });
    $('upgrade').hidden = false;
  }
  nextWave() {
    this.wave++;
    if (this.wave > wavesFor(this.stageNo)) return this.end(true);
    this.toSpawn = monstersPerWave(this.islandIndex, this.wave);
    this.setArena(ISLANDS[this.islandIndex].bg);
    this.banner.setText('Gelombang ' + this.wave + (waveKind(this.stageNo, this.wave) ? ({ final: '\nBOSS FINAL: ', elite: '\nELIT: ' }[waveKind(this.stageNo, this.wave)] || '\nBOSS: ') + MON[getWaveBoss(this.islandIndex, this.stageNo, this.wave)].n : '')).setAlpha(1).setScale(.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.Out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1200, duration: 300 });
  }
  spawn() {
    const big = this.toSpawn === 1 && !!waveKind(this.stageNo, this.wave); this.toSpawn--;
    const island = ISLANDS[this.islandIndex], pool = island.pool, id = big ? getWaveBoss(this.islandIndex, this.stageNo, this.wave) : Phaser.Utils.Array.GetRandom(pool), m = MON[id], fin = big && isFinalWave(this.stageNo, this.wave);
    const h = big ? m.h * (fin ? FINAL_BOSS.size : 1.7) : m.h, sc = h / SPR['mon' + id].ih;   // ih = tinggi gambar karakter di dalam frame sprite
    const difficulty = difficultyOf(this.islandIndex, this.stageNo);
    const x = fin ? Phaser.Math.Between(115, W - 115) : Phaser.Math.Between(44, W - 44), hp = Math.ceil((20 + this.wave * 12) * difficulty * (big ? (fin ? FINAL_BOSS.hp : 7) : m.hp)), bw = Math.max(34, h * .7);
    const sh = this.add.image(x, -20, 'shadow').setScale(h / 46), s = this.add.sprite(x, -20, 'mon' + id).setScale(sc); s.play({ key: 'mon' + id + '_move', startFrame: Phaser.Math.Between(0, 7) });
    const bg = this.add.rectangle(x, -20, bw, 5, 0x2b1d4a).setDepth(950);
    const fg = this.add.rectangle(x - bw / 2, -20, bw, 5, 0x6be3a2).setOrigin(0, .5).setDepth(951);
    this.enemies.push({ s, sh, bg, fg, rg: RANGED[id] || null, stopY: RANGED[id] ? BASE_Y - RANGED[id].stop : BASE_Y, hp, mhp: hp, bw, k: m.el, id, h, big, sc, x0: x, py: -20, ph: Math.random() * 6.283, fly: !!m.fly, hitT: 0, r: h * .42, sp: (.03 + this.wave * .004 + (this.stageNo - 1) * .0015 + this.islandIndex * DIFF.speed) * m.sp * (big ? .6 : 1) });
  }
  ui() {   // HUD DOM: timer, judul stage, progres gelombang
    const s = Math.floor(this.clock / 1000), w = Math.min(this.wave, wavesFor(this.stageNo)), tot = monstersPerWave(this.islandIndex, this.wave), left = this.toSpawn + this.enemies.length;
    $('bTime').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    $('bStage').textContent = ISLANDS[this.islandIndex].name + ' · Stage ' + this.stageNo + ' · Wave ' + w + '/' + wavesFor(this.stageNo) + ({ final: ' · BOS FINAL', elite: ' · ELIT', boss: ' · BOS' }[waveKind(this.stageNo, w)] || '');
    $('bXpBar').style.width = Math.max(0, Math.min(100, this.xp / this.xpNeed * 100)) + '%';
    $('bXpTxt').textContent = 'Lv ' + this.level + ' · ' + Math.floor(this.xp) + '/' + this.xpNeed;
  }
  shoot(mx, my, t, d) {
    const dx = t.s.x - mx, dy = t.s.y - my, len = Math.hypot(dx, dy) || 1;
    this.bullets.push({ s: this.add.image(mx, my, 'bullet').setDepth(600), vx: dx / len * .75, vy: dy / len * .75, d });
    this.flash.emitParticleAt(mx, my, 4);
  }
  fire() {
    if (this.reloading || this.ammo <= 0) return;
    let t = null;
    for (const e of this.enemies) if (!t || e.s.y > t.s.y) t = e;
    if (!t) return;
    const tip = this.hero.tip(); this.shoot(tip.x, tip.y, t, this.heroDmg);
    this.hero.aimGoal = Phaser.Math.Clamp((t.s.x - W / 2) / 150, -1, 1); this.hero.fireKick();
    this.hero.shootAnim();   // kilatan moncong sudah ada di animasi Tois
    const ej = this.hero.eject(); this.shells.emitParticleAt(ej.x, ej.y, 1);
    if (--this.ammo <= 0) this.startReload();   // peluru di bar status habis -> reload
  }
  startReload() {
    this.reloading = true; this.reloadT = 0; this.hero.startReload();
    this.pop(W / 2, 548, 'RELOAD', '#8fd8ff', 13);
  }
  petTick(p, dt) {
    if (!p.on) return; p.cd -= dt; if (p.cd > 0 || !this.enemies.length) return;
    const sk = SK[p.el][p.stage - 1]; p.cd = sk.cd * p.cdMul; this.cast(p, sk);
    for (let v = 1; v <= p.volley; v++) this.time.delayedCall(260 * v / this.speed, () => { if (!this.over && !this.paused && !this.choosing) this.cast(p, sk, true); });   // tembakan ganda
  }
  petLbl(p) { p.lbl.setText(p.stage >= 3 ? 'MAX' : p.prog + '/' + EVO_NEED[p.stage - 1]).setPosition(p.x, PET_Y + 7).setVisible(p.on); }
  petCard(p, c) {   // 1 kartu = 1 progres evolusi pet; cukup kartu -> evolusi (stage berikutnya, progres mulai dari 0 lagi)
    c.go(p); p.prog++;
    if (p.prog >= EVO_NEED[p.stage - 1]) {
      p.stage++; p.prog = 0; p.setOrigin(.5, this.petOrigin('pet_' + p.el + p.stage)).setScale(petScale(p.el, p.stage)); p.play('pet_' + p.el + p.stage + '_idle');
      this.tweens.add({ targets: p, scaleX: p.scaleX * 1.25, scaleY: p.scaleY * 1.25, duration: 160, yoyo: true, ease: 'Quad.Out' });   // sedikit membesar sesaat saat evolusi
      this.flash.emitParticleAt(p.x, p.y - petH(p) * .47, 24); this.pop(p.x, p.y - petH(p) - 2, 'Evolusi ' + p.stage + '!', '#ffd34d', 13); this.evoQ.push(p);
    }
    this.petLbl(p);
  }
  cast(p, sk, quiet) {
    const col = EL[p.el], lst = this.enemies.filter(e => !e.dead && e.s.y > 10); if (!lst.length) return;   // hanya musuh yang sudah terlihat di layar
    const pk = 'pet_' + p.el + p.stage; p.play(pk + '_cast').chain(pk + '_idle');   // animasi serang pet (bersiap, melonjak, kembali)
    if (!quiet) this.pop(p.x, p.by - petH(p) - 2, sk.n, '#' + col.toString(16).padStart(6, '0'), 11);
    // SPR[pk].rel = frame animasi serang tempat serangan dilepas (mis. saat mulut terbuka). Animasi pet berjalan 16 fps dan tidak ikut x2.
    const rel = SPR[pk].rel;
    if (rel) this.time.delayedCall(rel * 1000 / 16, () => { if (!this.over && p.active) this.release(p, sk); });
    else this.release(p, sk);
  }
  release(p, sk) {   // bagian serangan yang benar-benar melepas efek + damage (musuh dipilih ulang pada saat dilepas)
    const lst = this.enemies.filter(e => !e.dead && e.s.y > 10); if (!lst.length) return;
    const d = Math.ceil(this.dmg * sk.m * .6 * p.pow * starMul(p.el, p.stage));
    let hit, front = null, cx = 0, cy = 0, lx = 0;
    if (sk.t === 'bolt') {
      front = [...lst].sort((a, b) => b.s.y - a.s.y).slice(0, (sk.k || 0) + p.extra);   // musuh terdepan = titik sabetan
      const sp = (sk.sp || 0) * p.reach;   // sp = radius percikan: musuh di dekat sabetan ikut terkena
      hit = sp ? lst.filter(e => front.includes(e) || front.some(f => Math.hypot(e.s.x - f.s.x, e.s.y - f.s.y) < sp)) : front;
    } else if (sk.t === 'aoe') {
      const near = (a, b) => Math.hypot(a.s.x - b.s.x, a.s.y - b.s.y) < sk.r * p.reach;
      const c = lst.reduce((b, e) => { const n = lst.filter(o => near(o, e)).length; return n > b.n ? { e, n } : b; }, { e: lst[0], n: 0 }).e;
      hit = lst.filter(e => near(e, c)); cx = c.s.x; cy = c.s.y;
    } else {
      lx = lst.reduce((b, e) => e.s.y > b.s.y ? e : b).s.x;
      hit = lst.filter(e => Math.abs(e.s.x - lx) < sk.w * p.reach);
    }
    const targets = (front || hit).map(e => ({ x: e.s.x, y: e.s.y }));   // posisi saat dilepas (musuh bisa mati/bergeser)
    this.skillFx(p, sk, targets, cx, cy, lx, hit);
    hit.forEach(e => {
      this.dmgTo(e, d);
      if (e.dead) return;
      if (sk.burn) this.ignite(e, d, sk.burn);   // api: target terbakar
      if (sk.stun && p.el === 'air') e.frz = sk.stun;   // air: terkunci dalam es (balok es mengikuti musuh sampai pecah)
      if (sk.stun) { e.stun = sk.stun; this.tintFor(e, p.el === 'air' ? 0x9fdcff : 0xc9a06a, sk.stun); }   // beku (es) atau terjebak tanah
      if (sk.slow) { e.slow = sk.slow; this.tintFor(e, p.el === 'angin' ? 0xdff6ff : 0x8fd0ff, sk.slow); }
    });
  }
  ignite(e, d, ms) {   // terbakar: tiap detik HP berkurang BURN_PCT dari damage yang baru diterima; terbakar lagi = durasi diulang (tidak menumpuk)
    const bd = Math.max(1, Math.ceil(d * BURN_PCT));
    if (e.burn) { e.burn.left = ms / 1000; e.burn.d = Math.max(e.burn.d, bd); } else e.burn = { left: ms / 1000, tick: 0, fx: 0, d: bd };
  }
  burnTo(e, d) {   // damage terbakar: tanpa sentakan dan tanpa terpental
    if (e.dead) return; const gain = Math.max(0, Math.min(d, e.hp)); e.hp -= d;
    this.pop(e.s.x + Phaser.Math.Between(-12, 12), e.s.y - e.h * .5, d, '#ff8a3d', 11);
    e.fg.width = e.bw * Math.max(0, e.hp / e.mhp); this.burst[0].emitParticleAt(e.s.x, e.s.y - e.h * .3, 3);
    if (e.hp <= 0) {
      this.kills++; this.burst[e.k].emitParticleAt(e.s.x, e.s.y, e.big ? 26 : 12);
      this.pop(e.s.x, e.s.y - e.h * .55, '+5 🪙', '#ffd34d'); navigator.vibrate && navigator.vibrate(10); this.kill(e);
    }
    this.addXp(gain);
  }
  tintFor(e, color, ms) {   // warnai musuh selama efek status (slow/stun), setelah kilatan kena-tembak selesai
    this.time.delayedCall(80, () => { if (e.s.active && !e.dead) e.s.setTint(color); });
    this.time.delayedCall(ms, () => { if (e.s.active && !e.dead) e.s.clearTint(); });
  }
  // Efek visual tiap skill pet. targets = posisi musuh yang kena (bolt), (cx, cy) = pusat ledakan (aoe), lx = lajur (line).
  thaw(e) {   // balok es pecah: serpihan beterbangan lalu menghilang
    const ic = e.ice; if (!ic) return; e.ice = null;
    this.burst[1].emitParticleAt(ic.x, ic.y - 14, 12);
    this.tweens.add({ targets: ic, alpha: 0, scaleX: ic.scaleX * 1.12, scaleY: ic.scaleY * 1.12, duration: 160, onComplete: () => ic.destroy() });
  }
  skillFx(p, sk, targets, cx, cy, lx, ens = []) {   // ens = musuh yang benar-benar terkena (untuk efek yang menempel di musuh, mis. beku)
    const el = p.el, st = p.stage, ox = p.x, oy = p.y - petH(p) * .52, R = (sk.r || 0) * p.reach, rnd = (a, b) => Phaser.Math.FloatBetween(a, b);
    const bi = ELS.indexOf(el), burst = (x, y, n) => this.burst[bi].emitParticleAt(x, y, n);
    const ring = (x, y, r, color, ms = 380) => { const g = this.add.image(x, y, 'ring').setTint(color).setDepth(852).setScale(.15).setAlpha(.95); this.tweens.add({ targets: g, scale: r / 32, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => g.destroy() }); };
    const fade = (o, ms = 300, delay = 0) => this.tweens.add({ targets: o, alpha: 0, delay, duration: ms, onComplete: () => o.destroy() });
    // benda yang meluncur dari (x0,y0) ke (x1,y1)
    const fly = (tex, x0, y0, x1, y1, ms, o = {}) => {
      const s = this.add.image(x0, y0, tex).setDepth(860).setScale(o.sc || 1).setRotation(o.rot !== undefined ? o.rot : Math.atan2(y1 - y0, x1 - x0));
      if (o.tint) s.setTint(o.tint); if (o.delay) s.setAlpha(0);
      this.tweens.add({ targets: s, x: x1, y: y1, delay: o.delay || 0, duration: ms, ease: o.ease || 'Quad.In', onStart: () => s.setAlpha(1), onUpdate: () => o.trail && o.trail(s), onComplete: () => { if (o.done) o.done(s); s.destroy(); } });
      if (o.spin) this.tweens.add({ targets: s, angle: s.angle + o.spin, delay: o.delay || 0, duration: ms });
      return s;
    };
    const claw = (x, y, color, sc) => {   // bekas cakar + kilatan saat serangan benar-benar mengenai target
      const c = this.add.image(x, y, 'claw').setTint(color).setDepth(861).setRotation(-.5).setScale(sc * .5);
      this.tweens.add({ targets: c, scale: sc, alpha: 0, delay: 45, duration: 290, ease: 'Quad.Out', onComplete: () => c.destroy() });
      impact(x, y, color, Math.min(1.35, sc));
    };
    const area = (color, a = .22) => { if (!R) return; const o = this.add.circle(cx, cy, R, color, a).setDepth(850); this.tweens.add({ targets: o, scale: 1.15, alpha: 0, duration: 520, onComplete: () => o.destroy() }); };
    // Impact yang konsisten: kilatan inti, shock-ring, dan partikel sesuai elemen.
    // Semua objek sementara dihancurkan setelah tween agar tidak menumpuk selama wave panjang.
    const impact = (x, y, color, power = 1) => {
      const core = this.add.circle(x, y, 5, 0xffffff, .95).setDepth(875).setScale(.5);
      this.tweens.add({ targets: core, scale: 2.8 * power, alpha: 0, duration: 150, ease: 'Quad.Out', onComplete: () => core.destroy() });
      ring(x, y, 20 * power, color, 260);
      burst(x, y, Math.round(5 + 5 * power));
    };
    const hitColor = { api: 0xff762e, air: 0x63d9ff, tanah: 0xd6a56a, angin: 0xb9f4ff }[el];
    const targetImpacts = (power = 1) => targets.slice(0, 8).forEach((t, i) => {
      this.time.delayedCall(i * 24 / this.speed, () => impact(t.x, t.y, hitColor, power));
    });

    if (el === 'api') {
      if (sk.t === 'bolt') {   // Cakar Api: berkedip langsung pada posisi target, tanpa animasi meluncur
        // Ukuran efek sama untuk evolusi 1 dan 2 (ubah FIRE_SLASH_SCALE untuk membesarkan/mengecilkan keduanya).
        const FIRE_SLASH_SCALE = .5;
        targets.forEach((t, i) => {
          this.time.delayedCall(i * 55 / this.speed, () => {
            // Satu sabetan per target, muncul tepat di monster yang dituju; sprite sheet diputar frame demi frame.
            const slash = this.add.sprite(t.x, t.y, 'fire_slash', 0)
              .setDepth(870)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setScale(FIRE_SLASH_SCALE);
            slash.play('fire_slash_anim');
            slash.once('animationcomplete', () => this.tweens.add({ targets: slash, alpha: 0, duration: 80, onComplete: () => { if (slash.active) slash.destroy(); } }));
            impact(t.x, t.y, 0xff762e, 1.2);   // kilatan + percikan, ukuran sama untuk semua evolusi
          });
        });
      } else {   // Evolusi 3 saja: proyektil bola api custom, lalu ledakan area
        // Bola magma: fire_orb.png = 6 frame (160x400), bola ada di titik (80,56) tiap frame, ekor ke arah bawah -> diputar agar kepala bola menghadap target.
        const FIRE_ORB_SCALE = .6, LAVA_CLAW_SCALE = .7;
        const o = this.add.sprite(ox, oy, 'fire_orb', 0).setOrigin(.5, 56 / 400).setDepth(860).setScale(FIRE_ORB_SCALE).setRotation(Math.atan2(cx - ox, oy - cy));
        o.play('fire_orb_anim');
        // Cakar lava: satu sabetan di tiap monster yang terkena ledakan (maks 6), yang di pusat ledakan lebih besar.
        const lavaClaw = (x, y, sc, delay) => this.time.delayedCall(delay / this.speed, () => {
          const c = this.add.sprite(x, y, 'fire_lava_claw', 0).setDepth(871).setScale(sc).setRotation(rnd(-.12, .12));
          c.play('fire_lava_claw_anim');
          c.once('animationcomplete', () => this.tweens.add({ targets: c, alpha: 0, duration: 80, onComplete: () => { if (c.active) c.destroy(); } }));
        });
        this.tweens.add({
          targets: o, scale: FIRE_ORB_SCALE * 1.15, x: cx, y: cy, duration: 420, ease: 'Quad.In', onUpdate: () => burst(o.x, o.y + 20, 1), onComplete: () => {
            o.destroy(); ring(cx, cy, R * 1.3, 0xff6a2e, 480); ring(cx, cy, R * .7, 0xffd34d, 320); impact(cx, cy, 0xff762e, 2.0); burst(cx, cy, 28); area(0xff6a2e, .3);
            const cr = this.add.ellipse(cx, cy + 6, R * 1.5, R * .6, 0x2b1208, .65).setDepth(840); fade(cr, 500, 350); this.cameras.main.shake(90, .004);
            lavaClaw(cx, cy, LAVA_CLAW_SCALE * 1.2, 0);
            targets.filter(t => Math.hypot(t.x - cx, t.y - cy) > 4).slice(0, 5).forEach((t, i) => lavaClaw(t.x, t.y, LAVA_CLAW_SCALE, 70 + i * 55));
          }
        });
      }
    } else if (el === 'air') {
      if (st === 1) {   // Gelembung Air: rentetan gelembung, pecah menjadi percikan lalu melayang naik
        for (let i = 0; i < 6; i++) {
          const tx = cx + rnd(-R * .7, R * .7), ty = cy + rnd(-R * .5, R * .5);
          fly('bubble', ox, oy, tx, ty, 380 + i * 30, {
            rot: 0, sc: rnd(.7, 1.2), tint: 0xbdefff, delay: i * 70, ease: 'Sine.Out', done: s => {
              ring(s.x, s.y, 26, 0x9fe6ff, 300); burst(s.x, s.y, 5);
              const b = this.add.image(s.x, s.y, 'bubble').setScale(.5).setAlpha(.85).setDepth(861); this.tweens.add({ targets: b, y: s.y - 26, alpha: 0, duration: 700, onComplete: () => b.destroy() });
            }
          });
        }
        this.time.delayedCall(500 / this.speed, () => area(0x3ec6ff, .18));
      } else if (st === 2) {   // Bola Air: bola air besar, pecah menjadi cipratan
        // water_fx.png = 23 frame (320x240, 6 kolom): 0-5 pusaran, 6-7 semburan awal, 8-16 peluru air, 17-18 benturan, 19-22 cipratan mahkota.
        // Titik jangkar tiap jenis frame sudah dibakar di sheet: peluru/benturan = kepala di (290,120), semburan = pangkal di (30,120), cipratan = dasar di (160,200).
        const WATER_SCALE = .32, wr = Math.atan2(cy - oy, cx - ox);
        const wfx = (frame, x, y, anim, origin, rot, sc, depth) => {   // sprite sekali-putar yang menghilang sendiri
          const s = this.add.sprite(x, y, 'water_fx', frame).setOrigin(origin[0], origin[1]).setRotation(rot).setScale(sc).setDepth(depth);
          s.play(anim); s.once('animationcomplete', () => this.tweens.add({ targets: s, alpha: 0, duration: 90, onComplete: () => { if (s.active) s.destroy(); } }));
          return s;
        };
        wfx(0, ox, oy, 'water_charge_anim', [.5, .5], 0, WATER_SCALE, 862);                       // pusaran air terbentuk di depan mulut naga
        wfx(6, ox, oy, 'water_muzzle_anim', [30 / 320, .5], wr, WATER_SCALE, 862);                // semburan awal ke arah target
        this.time.delayedCall(130 / this.speed, () => {   // peluru air melesat setelah pusaran terkumpul
          if (this.over) return;
          const b = this.add.sprite(ox, oy, 'water_fx', 8).setOrigin(290 / 320, .5).setRotation(wr).setScale(WATER_SCALE).setDepth(861);
          b.play('water_bullet_anim');
          this.tweens.add({
            targets: b, x: cx, y: cy, duration: 380, ease: 'Sine.In', onUpdate: () => burst(b.x, b.y, 1), onComplete: () => {
              b.destroy();
              wfx(17, cx, cy, 'water_hit_anim', [290 / 320, .5], wr, WATER_SCALE * 1.2, 872);       // peluru menghantam
              const crown = (x, y, sc, delay) => this.time.delayedCall(delay / this.speed, () => wfx(19, x, y + 6, 'water_splash_anim', [.5, 200 / 240], 0, sc, 873));
              crown(cx, cy, Math.max(.3, R * 2.4 / 300), 60);                                       // cipratan besar menutupi area
              targets.filter(t => Math.hypot(t.x - cx, t.y - cy) > 4).slice(0, 5).forEach((t, i) => crown(t.x, t.y, WATER_SCALE * .9, 110 + i * 45));   // cipratan kecil di tiap monster lain
              ring(cx, cy, R * 1.3, 0x7fdcff, 480); ring(cx, cy, R * .7, 0xffffff, 300); impact(cx, cy, 0x63d9ff, 1.4); burst(cx, cy, 14); targetImpacts(0.6); area(0x3ec6ff, .22);
            }
          });
        });
      } else {   // Kristal Es: panah es melesat, meledak jadi kristal, lalu tiap musuh yang kena terkurung balok es
        // ice_arrow.png = 19 frame (320x240, 6 kolom): 0-2 pusaran dingin, 3-14 panah terbang (ujung di (290,120)), 15-18 ledakan kristal (pusat di (160,120)).
        // ice_freeze.png = 16 frame (320x300, 4 kolom): 0-12 es tumbuh, 13-15 kubah es berkilau (dasar di (160,270)).
        const ICE_SCALE = .34, ar = Math.atan2(cy - oy, cx - ox);
        const ifx = (frame, x, y, anim, origin, rot, sc, depth) => {   // sprite sekali-putar yang menghilang sendiri
          const s = this.add.sprite(x, y, 'ice_arrow', frame).setOrigin(origin[0], origin[1]).setRotation(rot).setScale(sc).setDepth(depth);
          s.play(anim); s.once('animationcomplete', () => this.tweens.add({ targets: s, alpha: 0, duration: 90, onComplete: () => { if (s.active) s.destroy(); } }));
          return s;
        };
        const freezeIce = e => {   // balok es menempel di musuh; posisinya diikuti di update() dan pecah saat beku habis
          if (e.dead || !e.s.active || !(e.frz > 600)) return;
          if (e.ice) e.ice.destroy();
          const ic = this.add.sprite(e.s.x, e.py + e.h * .46, 'ice_freeze', 0).setOrigin(.5, 270 / 300).setScale(Math.max(e.h * 1.45, 52) / 270).setDepth(e.py + 2).setAlpha(.95);
          e.ice = ic; ic.play('ice_freeze_anim');
          ic.once('animationcomplete', () => { if (ic.active) ic.play('ice_glow_anim'); });
        };
        ifx(0, ox, oy, 'ice_charge_anim', [.5, .5], 0, ICE_SCALE, 862);   // pusaran dingin di depan mulut naga
        this.time.delayedCall(110 / this.speed, () => {
          if (this.over) return;
          const b = this.add.sprite(ox, oy, 'ice_arrow', 3).setOrigin(290 / 320, .5).setRotation(ar).setScale(ICE_SCALE).setDepth(861);
          b.play('ice_arrow_anim');
          this.tweens.add({
            targets: b, x: cx, y: cy, duration: 360, ease: 'Sine.In', onUpdate: () => burst(b.x, b.y, 1), onComplete: () => {
              b.destroy();
              ifx(15, cx, cy, 'ice_burst_anim', [.5, .5], 0, Math.max(.45, R * 2.4 / 220), 873);   // ledakan kristal menutupi area
              ring(cx, cy, R * 1.25, 0xcdf3ff, 520); impact(cx, cy, 0x9fdcff, 1.5); burst(cx, cy, 12); targetImpacts(0.7); area(0x9fdcff, .22);
              ens.slice(0, 10).forEach((e, i) => this.time.delayedCall((90 + i * 35) / this.speed, () => freezeIce(e)));
            }
          });
        });
      }
    } else if (el === 'tanah') {
      if (st === 1) {   // Penggalian Lubang: lubang gelap muncul, tanah & batu terlempar
        // Lubang: gambar earth_hole.png (287x94). Ubah EARTH_HOLE_W untuk melebarkan/menyempitkan lubang (dalam piksel game).
        const EARTH_HOLE_W = R * 1.9;
        let hole;
        if (this.textures.exists('earth_hole')) {
          const hs = EARTH_HOLE_W / 287;
          hole = this.add.image(cx, cy + 8, 'earth_hole').setOrigin(.5, .6).setDepth(845).setScale(0, 0);
          this.tweens.add({ targets: hole, scaleX: hs, scaleY: hs, duration: 170, ease: 'Back.Out' });
        } else {   // cadangan bila gambar belum termuat
          hole = this.add.ellipse(cx, cy + 6, R * 1.6, R * .65, 0x24140a, .92).setDepth(845).setScale(0);
          this.tweens.add({ targets: hole, scale: 1, duration: 160, ease: 'Back.Out' });
        }
        fade(hole, 300, 650);
        ring(cx, cy + 6, R * 1.2, 0xc89a5a, 380); impact(cx, cy + 6, 0xd6a56a, 1.5); burst(cx, cy, 18); targetImpacts(.7); area(0xc89a5a, .25);
        for (let i = 0; i < 5; i++) {
          const r = this.add.image(cx, cy, 'rock').setScale(rnd(.35, .6)).setDepth(856);
          this.tweens.add({ targets: r, y: cy - rnd(26, 52), duration: 240, yoyo: true, ease: 'Quad.Out' });
          this.tweens.add({ targets: r, x: cx + rnd(-R, R), angle: rnd(-200, 200), duration: 480, onComplete: () => r.destroy() });
        }
      } else if (st === 2) {   // Menggelinding: batu besar menggelinding di sepanjang lajur sambil berdebu
        // Bola batu berputar: earth_ball.png = 4 frame (280x280, bola berdiameter ~245). Ubah EARTH_BALL_D untuk besar-kecilnya bola (piksel game).
        const EARTH_BALL_D = 62;
        let bl;
        if (this.textures.exists('earth_ball') && this.anims.exists('earth_ball_anim')) {
          bl = this.add.sprite(ox, oy + 12, 'earth_ball', 0).setScale(EARTH_BALL_D / 245).setDepth(860);
          bl.play('earth_ball_anim');
          this.tweens.add({ targets: bl, x: lx, y: 10, angle: 360, duration: 560, ease: 'Quad.In', onUpdate: () => burst(bl.x, bl.y + 12, 1), onComplete: () => { burst(lx, 14, 16); bl.destroy(); } });
        } else {   // cadangan bila gambar belum termuat
          bl = this.add.image(ox, oy + 12, 'rock').setScale(1.5).setDepth(860);
          this.tweens.add({ targets: bl, x: lx, y: 10, angle: 900, duration: 560, ease: 'Quad.In', onUpdate: () => burst(bl.x, bl.y + 12, 1), onComplete: () => { burst(lx, 14, 16); bl.destroy(); } });
        }
        this.time.delayedCall(80 / this.speed, () => { const lane = this.add.rectangle(lx, BASE_Y / 2, sk.w * p.reach * 2, BASE_Y, 0xc89a5a, .16).setDepth(850); fade(lane, 400, 200); });
      } else {   // Gali & Tabrak: pet masuk ke tanah (lubang), kristal melesat dari lubang ke tiap musuh lalu pecah ke kanan-kiri + knockback
        const useCrystal = this.textures.exists('earth_crystal');
        this.pop(p.x, p.y - petH(p) - 16, 'tanah3 v3e crystal:' + (useCrystal ? 'ok' : 'HILANG'), useCrystal ? '#7dff9a' : '#ff6b6b', 10);   // DIAGNOSA sementara: hapus bila sudah tampil benar
        if (useCrystal) {
          // earth_crystal.png = 4 frame (500x440): 0 lubang berdebu (dasar di y=430), 1 kristal menyembul, 2 kristal melesat (kepala ke kanan-atas), 3 kilau.
          const HOLE_SCALE = .22, CRYSTAL_SCALE = .17, SIDE_SCALE = .12;   // ukuran lubang, kristal utama, kristal samping
          const KB_Y = 55, KB_X = 30, SIDE_DIST = 170;                      // knockback ke belakang (atas), geser samping, jarak lesatan kristal samping
          const sp = this.speed, D = ms => ms / sp;
          const gx = p.x, gy = p.y + 4;   // posisi lubang = tempat pet masuk tanah
          // 1) Lubang di posisi pet (pengganti kristal yang meloncat di pet)
          const hole = this.add.sprite(gx, gy, 'earth_crystal', 0).setOrigin(.5, 430 / 440).setDepth(p.depth + 2).setScale(0);
          this.tweens.add({ targets: hole, scale: HOLE_SCALE, duration: 150, ease: 'Back.Out' }); burst(gx, gy - 6, 8);
          fade(hole, 320, D(650));
          // 2) Kristal melesat dari lubang ke tiap musuh (kepala kristal dihadapkan ke arah tujuan; seni asli menghadap kanan-atas = -45 derajat)
          const aim = (x0, y0, x1, y1) => Math.atan2(y1 - y0, x1 - x0) + Math.PI / 4;
          const shootSide = (t, dir) => {   // kristal pecahan: melesat jauh ke kanan / kiri setelah mengenai musuh
            const tx = Phaser.Math.Clamp(t.x + dir * SIDE_DIST, -40, W + 40), ty = t.y - rnd(40, 110);
            const c = this.add.sprite(t.x, t.y, 'earth_crystal', 2).setScale(SIDE_SCALE).setRotation(aim(t.x, t.y, tx, ty)).setDepth(876);
            this.tweens.add({ targets: c, x: tx, y: ty, alpha: 0, duration: 340, ease: 'Quad.Out', onUpdate: () => { if (Math.random() < .4) burst(c.x, c.y, 1); }, onComplete: () => c.destroy() });
          };
          targets.slice(0, 8).forEach((t, i) => {
            const e = ens[i], dir = i % 2 ? 1 : -1;   // selang-seling: ke kanan / ke kiri
            this.time.delayedCall(D(160 + i * 60), () => {
              if (this.over) return;
              const sx = gx, sy = gy - 14, c = this.add.sprite(sx, sy, 'earth_crystal', 2).setScale(CRYSTAL_SCALE).setRotation(aim(sx, sy, t.x, t.y)).setDepth(875);
              const dist = Math.hypot(t.x - sx, t.y - sy);
              this.tweens.add({
                targets: c, x: t.x, y: t.y, duration: 140 + Math.min(180, dist * .38), ease: 'Quad.In', onUpdate: () => { if (Math.random() < .5) burst(c.x, c.y, 1); }, onComplete: () => {
                  c.destroy();
                  const k = this.add.sprite(t.x, t.y - 8, 'earth_crystal', 3).setBlendMode(Phaser.BlendModes.ADD).setScale(CRYSTAL_SCALE * 1.1).setDepth(877);   // kilau pecah saat kena
                  this.tweens.add({ targets: k, alpha: 0, scale: CRYSTAL_SCALE * 1.5, duration: 300, onComplete: () => k.destroy() });
                  impact(t.x, t.y, 0x8fd8ff, 1.2); shootSide(t, 1); shootSide(t, -1);
                  if (i === 0) this.cameras.main.shake(90, .004);
                  // 3) Knockback: monster terpental ke belakang (atas layar) dan bergeser ke samping
                  if (e && !e.dead && e.s && e.s.active) this.tweens.add({ targets: e, py: Math.max(-20, e.py - KB_Y), x0: Phaser.Math.Clamp(e.x0 + dir * KB_X, OX + 16, OX + 344), duration: 260, ease: 'Quad.Out' });
                }
              });
            });
          });
        } else {   // cadangan bila earth_crystal.png belum termuat: serpihan lama
          const n = 9;
          for (let i = 0; i < n; i++) {
            const f = i / (n - 1), sx = ox + (lx - ox) * f + rnd(-8, 8), sy = oy + 20 - (oy + 10) * f;
            const sh = this.add.image(sx, sy, 'shard').setOrigin(.5, 1).setTint(i % 3 ? 0xc89a5a : 0xf0d19a).setDepth(855 + sy / 1000).setScale(.3, 0).setRotation(rnd(-.3, .3));
            this.tweens.add({ targets: sh, scaleX: 1, scaleY: rnd(1.1, 1.6), delay: i * 45, duration: 180, ease: 'Back.Out', onStart: () => burst(sx, sy, 5), onComplete: () => fade(sh, 350, 380) });
          }
          this.time.delayedCall(n * 45 / this.speed, () => { ring(lx, 20, sk.w * p.reach * 1.6, 0xd6a56a, 420); impact(lx, 26, 0xd6a56a, 1.8); targetImpacts(0.9); this.cameras.main.shake(100, .004); });
        }
      }
    } else {   // angin
      // DIAGNOSA sementara (hapus baris ini kalau efek sudah muncul): menampilkan status efek angin di atas pet.
      const DEBUG_WIND = true;
      if (DEBUG_WIND) { const okB = this.textures.exists('wind_blade') && this.anims.exists('wind_fly_anim'), okT = this.textures.exists('wind_tornado') && this.anims.exists('wind_tornado_anim'); this.pop(p.x, p.y - petH(p) - 16, 'v3c ' + sk.t + ' blade:' + (okB ? 'ok' : 'HILANG') + ' tornado:' + (okT ? 'ok' : 'HILANG'), okB && okT ? '#7dff9a' : '#ff6b6b', 10); }
      if (sk.t === 'line') {   // Kepakan Sayap: gelombang angin berbentuk bulan sabit melesat ke atas
        for (let i = 0; i < 3; i++) fly('slash', lx + rnd(-5, 5), BASE_Y - 24, lx, -12, 520, { rot: -Math.PI / 2, sc: Math.max(1, sk.w * p.reach * 2 / 56), tint: 0xe6fbff, delay: i * 110, ease: 'Quad.Out', trail: s => burst(s.x, s.y, 1) });
        this.time.delayedCall(60 / this.speed, () => { const lane = this.add.rectangle(lx, BASE_Y / 2, sk.w * p.reach * 2, BASE_Y, 0xdff6ff, .10).setDepth(850); fade(lane, 350, 100); targetImpacts(.65); });
      } else if (sk.t === 'bolt') {   // Cakaran Terbang: bilah angin hijau melesat dari pet ke tiap target, lalu pecah jadi daun
        const WIND_SCALE = .3, WIND_HIT_SCALE = .34;   // ubah untuk membesarkan/mengecilkan efek
        const wfx = (frame, x, y, anim, origin, rot, sc, depth) => {   // sprite sekali-putar yang menghilang sendiri
          const w = this.add.sprite(x, y, 'wind_blade', frame).setOrigin(origin[0], origin[1]).setRotation(rot).setScale(sc).setDepth(depth);
          w.play(anim); w.once('animationcomplete', () => this.tweens.add({ targets: w, alpha: 0, duration: 80, onComplete: () => { if (w.active) w.destroy(); } }));
          return w;
        };
        targets.forEach((t, i) => {
          this.time.delayedCall(i * 50 / this.speed, () => {
            if (this.over) return;
            const ar = Math.atan2(t.y - oy, t.x - ox), dist = Math.hypot(t.x - ox, t.y - oy);
            wfx(0, ox, oy, 'wind_charge_anim', [335 / 384, .5], ar, WIND_SCALE, 862);   // pusaran angin terbentuk di depan pet
            this.time.delayedCall(90 / this.speed, () => {
              if (this.over) return;
              const b = this.add.sprite(ox, oy, 'wind_blade', 4).setOrigin(335 / 384, .5).setRotation(ar).setScale(WIND_SCALE).setDepth(861);
              b.play('wind_fly_anim');
              this.tweens.add({
                targets: b, x: t.x, y: t.y, duration: 170 + Math.min(150, dist * .35), ease: 'Sine.In', onUpdate: () => { if (Math.random() < .5) burst(b.x, b.y, 1); }, onComplete: () => {
                  b.destroy();
                  wfx(12, t.x, t.y, 'wind_hit_anim', [.5, .5], rnd(-.3, .3), WIND_HIT_SCALE, 873);   // bilah pecah jadi daun & pusaran
                  claw(t.x, t.y, 0xcdf3ff, 1.1);
                }
              });
            });
          });
        });
      } else {   // Puting Beliung: tornado berputar menyapu area
        ring(cx, cy, R * 1.2, 0xdff8ff, 520); impact(cx, cy, 0xb9f4ff, 1.7); burst(cx, cy, 12); targetImpacts(.75); area(0xaee6ff, .2);
        // Tornado sprite: berdiri di tengah area, ukurannya mengikuti radius ledakan (ubah WIND_TORNADO_SCALE untuk menyetel).
        const WIND_TORNADO_SCALE = Math.max(.5, R * 2.2 / 250);
        if (!this.textures.exists('wind_tornado') || !this.anims.exists('wind_tornado_anim')) { console.warn('[GAME] wind_tornado belum termuat; cek assets/pet-actions/wind_tornado.png'); return; }
        const tor = this.add.sprite(cx, cy + 26, 'wind_tornado', 0).setOrigin(.5, 240 / 252).setScale(WIND_TORNADO_SCALE).setDepth(1000).setAlpha(1).setVisible(true);
        tor.play('wind_tornado_anim');
        tor.once('animationcomplete', () => this.tweens.add({ targets: tor, alpha: 0, duration: 120, onComplete: () => { if (tor.active) tor.destroy(); } }));
      }
    }
  }
  get heroDmg() { return this.buffT > 0 ? Math.ceil(this.dmg * SKILL_BUFF - 1e-9) : this.dmg; }   // damage peluru Tois (pet tidak ikut terpengaruh)
  skill() {     // Badai Peluru: Tois +10% damage & +10% kecepatan tembak selama 10 detik, cooldown 25 detik (tanpa damage ke musuh)
    if (this.over || this.paused || this.choosing || this.skillCd > 0) return;
    this.skillCd = this.skillMax; this.buffT = SKILL_BUFF_MS; this.cameras.main.flash(150, 255, 230, 120);
    this.hero.jump(); this.hero.buffed = true;
    const tip = this.hero.tip(); this.pop(tip.x, tip.y - 24, 'Damage & Kecepatan +10%', '#ffd34d', 12);
  }
  pop(x, y, txt, color, sz = 16) {
    const t = this.add.text(x, y, txt, TS(sz, color)).setOrigin(.5).setDepth(900);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }
  kill(e) {   // mati: animasi khas tiap monster (hancur, jatuh, meleleh, menguap), lalu sprite dihapus
    e.dead = true;[e.sh, e.bg, e.fg].forEach(o => o.destroy()); if (e.chg) { e.chg.destroy(); e.chg = null; } this.thaw(e);
    e.s.clearTint(); e.s.setAngle(0).setScale(e.sc); e.s.anims.timeScale = this.speed;
    e.s.play('mon' + e.id + '_die'); e.s.once('animationcomplete', () => e.s.destroy());
  }
  drop(e) { e.dead = true;[e.s, e.sh, e.bg, e.fg].forEach(o => o.destroy()); if (e.chg) { e.chg.destroy(); e.chg = null; } }
  rangedFire(e, mx, my) {   // monster jarak jauh melepas serangan: proyektil terbang ke tembok benteng, begitu sampai baru HP markas berkurang
    const R = e.rg, k = e.k, ox = mx, oy = my + e.h * .12, boss = e.big ? 1.5 : 1;
    if (e.chg) { e.chg.destroy(); e.chg = null; }
    this.flash.emitParticleAt(ox, oy, e.big ? 10 : 5);   // kilatan di moncong saat melepas
    const n = R.n || 1;
    for (let i = 0; i < n; i++) {
      const tx = Phaser.Math.Clamp(ox + (W / 2 - ox) * .25 + (i - (n - 1) / 2) * 16, 26, W - 26), ty = BASE_Y + 6;
      const dist = Phaser.Math.Distance.Between(ox, oy, tx, ty), dur = dist / R.v;
      const spr = this.add.image(ox, oy, R.tex).setTint(R.col).setScale(R.sc * boss).setDepth(880).setAlpha(0);
      if (R.add) spr.setBlendMode(Phaser.BlendModes.ADD);
      const o = { t: 0 }; let lx = ox, ly = oy;
      this.tweens.add({
        targets: o, t: 1, duration: dur, delay: i * 90,
        onStart: () => spr.setAlpha(1),
        onUpdate: () => {
          const px = Phaser.Math.Linear(ox, tx, o.t), py = Phaser.Math.Linear(oy, ty, o.t) - (R.arc ? Math.sin(o.t * Math.PI) * R.arc : 0);
          spr.setPosition(px, py);
          if (R.spin) spr.rotation += R.spin;
          else if (R.tor) spr.setScale(R.sc * boss, R.sc * boss * (.45 + .25 * Math.sin(o.t * 40))).rotation += .25;   // pusaran: menggepeng bergantian
          else if (Math.abs(px - lx) + Math.abs(py - ly) > .01) spr.rotation = Math.atan2(py - ly, px - lx) + (R.rot || 0);   // menghadap arah terbang
          if (R.tr) this.burst[k].emitParticleAt(px, py, R.tr);   // jejak partikel elemen
          lx = px; ly = py;
        },
        onComplete: () => {
          spr.destroy(); this.impactFx(tx, ty, R, boss);
          if (i === 0 && !this.over) this.wallHit(e, tx, R);   // satu serangan = satu kali damage (bulu kedua dan ketiga hanya visual)
        }
      });
    }
  }
  impactFx(x, y, R, boss) {   // cincin kejut di titik tembok yang terkena
    const r = this.add.image(x, y, 'ring').setTint(R.col).setDepth(890).setScale(.2).setAlpha(.9);
    this.tweens.add({ targets: r, scale: .9 * boss, alpha: 0, duration: 300, onComplete: () => r.destroy() });
  }
  wallHit(e, ix, R) {   // satu serangan monster ke tembok benteng (pukulan atau proyektil): kurangi HP markas, guncangan, percikan elemen, angka damage merah
    const d = Math.round((R ? R.dmg : (e.big ? WALL_HIT.bossDmg : WALL_HIT.dmg)) * wallDmgMul(this.islandIndex)), x = ix != null ? ix : e.s.x; this.baseHp -= d;
    this.hero.hurt(); this.cameras.main.shake(90, e.big ? .009 : .004);
    if (e.big) this.cameras.main.flash(100, 255, 80, 80);
    this.burst[e.k].emitParticleAt(x, BASE_Y + 6, e.big ? 12 : 5);
    this.pop(x, BASE_Y + 16, '-' + d, '#ff6b6b', e.big ? 15 : 12);
    navigator.vibrate && navigator.vibrate(e.big ? 30 : 15);
  }
  hit(e, b) {
    b.dead = true; b.s.destroy(); this.dmgTo(e, b.d || this.dmg, true);
  }
  dmgTo(e, d, fromHero) {   // fromHero = peluru Tois: terpental hanya saat ultimate (Badai Peluru) aktif
    if (e.dead) return; const gain = Math.max(0, Math.min(d, e.hp)); e.hp -= d;   // EXP = damage nyata (kelebihan damage tidak dihitung)
    this.pop(e.s.x + Phaser.Math.Between(-12, 12), e.s.y - e.h * .5, d, '#ffffff', 11);
    e.s.setTintFill(0xffffff); this.time.delayedCall(60, () => e.s.active && e.s.clearTint());
    e.fg.width = e.bw * Math.max(0, e.hp / e.mhp); e.hitT = 140; if (!e.atk && (!fromHero || this.buffT > 0)) e.py = Math.max(-20, e.py - (e.big ? 1 : 3));   // terpental sedikit (tidak bila sedang memukul tembok)
    if (e.hp > 0 && this.anims.exists('mon' + e.id + '_hit') && !(e.s.anims.currentAnim && (e.s.anims.currentAnim.key.endsWith('_hit') || e.s.anims.currentAnim.key.endsWith('_atk')))) e.s.play('mon' + e.id + '_hit').chain('mon' + e.id + '_move');   // sentakan saat kena tembak, lalu lanjut jalan
    if (e.hp <= 0) {
      this.kills++; this.burst[e.k].emitParticleAt(e.s.x, e.s.y, e.big ? 26 : 12);
      this.pop(e.s.x, e.s.y - e.h * .55, '+5 🪙', '#ffd34d'); navigator.vibrate && navigator.vibrate(10); this.kill(e);
    }
    this.addXp(gain);
  }
  update(time, dt) {
    if (this.over || this.paused || this.choosing) return;
    dt *= this.speed; this.clock += dt;
    if (!this.enemies.length) this.hero.aimGoal = 0;
    this.hero.update(dt); this.hero.sprite.anims.timeScale = this.speed;
    this.spawnT += dt; this.shotT += dt;
    if (this.reloading) {   // magasin kosong: Tois isi ulang, lalu menembak lagi sampai pertempuran berakhir
      this.reloadT += dt;
      if (this.reloadT >= RELOAD_MS) { this.reloading = false; this.reloadT = 0; this.ammo = this.magMax; this.hero.endReload(); }
    }
    if (this.toSpawn > 0 && this.spawnT >= Math.max(500, 1400 - this.wave * 70)) { this.spawnT = 0; this.spawn(); }
    this.pets.forEach(p => this.petTick(p, dt));
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.buffT = Math.max(0, this.buffT - dt); this.hero.buffed = this.buffT > 0;   // waktu buff ikut kecepatan game (x2)
    const sb = $('skillBtn'), st = this.skillCd > 0 ? Math.ceil(this.skillCd / 1000) + 's' : '';   // siap = tampil gambar ikon dari CSS (.skill), cooldown = hitungan detik
    if (sb.textContent !== st) { sb.textContent = st; sb.disabled = this.skillCd > 0; }
    if (!this.reloading && this.shotT >= Math.max(120, 700 / this.rate) / (this.buffT > 0 ? SKILL_BUFF : 1) / (this.manual ? 2 : 1)) { this.shotT = 0; this.fire(); }
    for (const b of this.bullets) { b.s.x += b.vx * dt; b.s.y += b.vy * dt; }
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.stun = Math.max(0, (e.stun || 0) - dt); e.frz = Math.max(0, (e.frz || 0) - dt); e.slow = Math.max(0, (e.slow || 0) - dt); e.hitT = Math.max(0, e.hitT - dt);
      const mv = e.stun > 0 ? 0 : e.slow > 0 ? .4 : 1;
      if (e.burn) {   // terbakar: percikan api terus muncul, damage tiap 1 detik (waktu ikut kecepatan game)
        e.burn.tick += dt; e.burn.fx += dt;
        if (e.burn.fx >= 250) { e.burn.fx -= 250; this.burst[0].emitParticleAt(e.s.x + Phaser.Math.Between(-8, 8), e.s.y - e.h * .3, 1); }
        while (e.burn.tick >= 1000 && e.burn.left > 0 && !e.dead) { e.burn.tick -= 1000; e.burn.left--; this.burnTo(e, e.burn.d); }
        if (e.dead) continue;
        if (e.burn.left <= 0) e.burn = null;
      }
      if (e.atk && e.py < e.stopY - 2) e.atk = false;
      if (!e.atk && e.chg) { e.chg.destroy(); e.chg = null; }   // terdorong mundur (mis. knockback skill tanah): berhenti memukul dan berjalan maju lagi
      if (!e.atk) { e.py += e.sp * dt * mv; if (e.py >= e.stopY) { e.py = e.stopY; e.atk = true; e.atT = 0; e.hitDone = false; } }   // sampai tembok: berhenti dan mulai memukul
      e.ph += dt * (e.big ? .007 : .012) * mv;
      const s = Math.sin(e.ph), hop = Math.abs(s);   // gerak badan (kaki, sayap, tentakel) sudah ada di frame sprite; di sini hanya jalur melayang
      let x = e.x0, yo, ang, sx = 1, sy = 1;
      if (e.fly) { x += Math.sin(e.ph * .6) * 14; yo = s * e.h * .05; ang = Math.cos(e.ph * .6) * 4; }   // terbang: menyamping dan sedikit miring
      else { x += Math.sin(e.ph * .5) * 4; yo = -hop * e.h * .015; ang = 0; }
      if (e.stun > 0) { if (!(e.frz > 0)) x += Phaser.Math.Between(-2, 2); ang = 0; }   // tersetrum: bergetar kaku (beku: diam total)
      if (e.atk) {   // memukul tembok: mundur sedikit (bersiap), menghantam ke arah tembok, lalu kembali. Tersetrum/beku = berhenti, melambat = memukul lebih pelan
        const cyc = e.rg ? e.rg.every : e.big ? WALL_HIT.bossEvery : WALL_HIT.every; e.atT += dt * mv; if (e.atT >= cyc) { e.atT -= cyc; e.hitDone = false; }
        const f = e.atT / cyc;
        if (e.rg) {   // JARAK JAUH: 1) membidik (badan menarik ke belakang, bola tenaga membesar)  2) melepas proyektil  3) hentakan ke depan
          if (SPR['mon' + e.id].atk) { if (f < .45) e.atkAnim = false; else if (!e.atkAnim) { e.atkAnim = true; e.s.play('mon' + e.id + '_atk').chain('mon' + e.id + '_move'); } }   // sprite bos jarak jauh punya animasi serang: diputar saat membidik sampai melepas
          if (f >= .5 && f < .8) {
            const w = (f - .5) / .3; yo -= e.h * .07 * w; sx = 1 - .1 * w; sy = 1 + .12 * w; if (!e.fly) ang = -4 * w;
            if (!e.chg) e.chg = this.add.image(x, e.py, 'orb').setTint(e.rg.col).setBlendMode(Phaser.BlendModes.ADD).setDepth(e.py + 3);
            e.chg.setPosition(x, e.py + yo + e.h * .12).setScale(e.rg.cs * (.2 + w) * (e.big ? 1.8 : 1)).setAlpha(.5 + .5 * w);
          }
          if (f >= .8 && !e.hitDone) { e.hitDone = true; this.rangedFire(e, x, e.py + yo); }
          if (f >= .8) { const r = 1 - (f - .8) / .2; yo += e.h * .07 * r; sx = 1 + .14 * r; sy = 1 - .12 * r; }
        } else {
          if (SPR['mon' + e.id].atk) { if (f < .35) e.atkAnim = false; else if (!e.atkAnim) { e.atkAnim = true; e.s.play('mon' + e.id + '_atk').chain('mon' + e.id + '_move'); } }
          yo += e.h * (f < .6 ? -.07 * (f / .6) : f < .75 ? -.07 + .15 * ((f - .6) / .15) : .08 * (1 - (f - .75) / .25));
          if (f >= .65 && !e.hitDone) { e.hitDone = true; this.wallHit(e); }
        }
      }
      if (e.ice) { if (e.frz > 0) e.ice.setPosition(x, e.py + e.h * .46).setDepth(e.py + 2); else this.thaw(e); }
      e.s.anims.timeScale = (e.stun > 0 ? 0 : mv * (e.big ? .7 : 1)) * this.speed;   // tersetrum: animasi berhenti; melambat: animasi ikut pelan
      e.s.setPosition(x, e.py + yo).setScale(e.sc * sx, e.sc * sy).setAngle(ang).setDepth(e.py);
      e.sh.setPosition(x, e.py + e.h * .42).setScale(e.h / 46 * (1 - .18 * (e.fly ? Math.abs(s) : hop))).setDepth(e.py - 1);
      e.bg.setPosition(x, e.py - e.h * .56); e.fg.setPosition(x - e.bw / 2, e.py - e.h * .56);
    }
    for (const b of this.bullets) {
      for (const e of this.enemies) {
        if (b.dead || e.dead) continue;
        if (Phaser.Math.Distance.Between(b.s.x, b.s.y, e.s.x, e.s.y) < e.r + 8) { this.hit(e, b); break; }
      }
      if (!b.dead && (b.s.y < -20 || b.s.x < -20 || b.s.x > W + 20)) { b.dead = true; b.s.destroy(); }
    }
    this.bullets = this.bullets.filter(b => !b.dead); this.enemies = this.enemies.filter(e => !e.dead);
    const r = Math.max(0, this.baseHp / this.baseMax);
    this.hud.clear().fillStyle(0x1b1230, .9).fillRoundedRect(HX, 59, 220, 14, 7)
      .fillStyle(r > .35 ? 0x4cd964 : 0xff6b6b).fillRoundedRect(HX + 2, 61, Math.max(0, 216 * r), 10, 5);
    const ar = this.reloading ? this.reloadT / RELOAD_MS : this.ammo / this.magMax;
    this.hud.fillStyle(0x1b1230, .9).fillRoundedRect(HX, 77, 220, 13, 6)
      .fillStyle(this.reloading ? 0x5ec8ff : 0xffc233).fillRoundedRect(HX + 2, 79, Math.max(0, 216 * ar), 9, 4);
    for (let i = 5; i < this.magMax; i += 5) this.hud.fillStyle(0x1b1230, .7).fillRect(HX + 2 + 216 * i / this.magMax - .5, 79, 1, 9);
    this.ammoTxt.setText(this.reloading ? 'RELOAD...' : '🔫 ' + this.ammo + '/' + this.magMax);
    this.hpTxt.setText('❤ ' + Math.max(0, this.baseHp)); this.waveTxt.setText(''); this.killTxt.setText('💀 ' + this.kills);
    this.ui();
    if (this.baseHp <= 0) return this.end(false);
    if (this.toSpawn === 0 && this.enemies.length === 0) this.nextWave();
  }
  async end(win) {
    const hpRatio = Math.max(0, this.baseHp) / this.baseMax, stars = win ? calcStars(hpRatio) : 0, hpPct = Math.round(hpRatio * 100);
    this.over = true; if (win) { saveWorldProgress(); saveStageStars(this.islandIndex, this.stageNo, stars); } this.banner.setText(win ? 'MENANG!' : 'KALAH').setAlpha(1).setScale(1);
    $('resultTitle').textContent = win ? 'Menang! 🎉' : 'Markas jebol 😵';
    let rs = $('resultStars'); if (!rs) { rs = document.createElement('div'); rs.id = 'resultStars'; $('resultTitle').after(rs); }
    rs.innerHTML = win ? [1, 2, 3].map(i => `<span class="${i <= stars ? 'on' : ''}" style="animation-delay:${(i * .25).toFixed(2)}s">★</span>`).join('') : '';
    $('resultText').textContent = 'Menyimpan hadiah...'; $('againButton').hidden = true; $('result').hidden = false;
    try {
      const r = await api('/battle/finish', 'POST', { session: this.token, wave: win ? WAVES : Math.min(WAVES, Math.max(1, this.wave - 1)), kills: this.kills });
      if (win && this.stageNo < STAGES_PER_ISLAND) selectedStage = this.stageNo + 1;
      await refreshProfile();
      $('resultText').textContent = 'Pulau ' + ISLANDS[this.islandIndex].name + ' · Stage ' + this.stageNo + '. Kamu mengalahkan ' + this.kills + ' monster dan mendapat ' + r.coins + ' koin.' + (win && this.stageNo < 25 ? ' Stage berikutnya kini terbuka.' : '') + (win ? ' Sisa HP markas ' + hpPct + '%.' + (stars < 3 ? ' Butuh sisa HP ≥ ' + Math.round((stars < 2 ? STAR_RULES.two : STAR_RULES.three) * 100) + '% untuk ' + (stars + 1) + ' bintang.' : ' Sempurna, 3 bintang!') : '');
    } catch (err) { $('resultText').textContent = err.message; }
    $('againButton').hidden = false;
  }
}

function startGame() {
  showLoading();
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game-container', width: W, height: H, backgroundColor: '#6ec1ea',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [Lobby, Battle]
  });
}

// ---- Lobi ----
let sayT;
function say(t) { const m = $('gameMessage'); m.textContent = t; clearTimeout(sayT); if (t) sayT = setTimeout(() => { m.textContent = ''; }, 3000); }
function toLobby() { $('result').hidden = true; $('gamePanel').classList.remove('battle'); game.scene.stop('Battle'); game.scene.start('Lobby'); }
const menu = (el, items) => items.forEach(([ic, label, act]) => {
  const b = document.createElement('button'); b.className = 'ico'; b.innerHTML = `<i>${ic}</i><span>${label}</span>`;
  b.onclick = () => act ? openHub(act) : say('Fitur ' + label + ' segera hadir.'); $(el).appendChild(b);
});
menu('sideL', [['🎖️', 'Battle Pass'], ['🎁', 'Hadiah'], ['📜', 'Event']]);
menu('sideR', [['📢', 'Info'], ['✉️', 'Surat'], ['👥', 'Teman'], ['📋', 'Misi']]);
const HUB = [['shop', '🛒', 'Toko'], ['pet', '🐾', 'Pet'], ['char', '🎸', 'Karakter'], ['zone', '🏰', 'Wilayah'], ['guild', '🛡️', 'Guild']];
menu('botNav', HUB.map(([k, ic, n]) => [ic, n, k]));

// ---- Panel menu bawah: Toko, Pet, Karakter, Wilayah, Guild (hanya tampilan; data dari profil dan konstanta game) ----
let hubKey = 'shop';
const hex = n => '#' + n.toString(16).padStart(6, '0');
const LOBBY_PET_STAGE = 1;   // pet teman Tois di lobi selalu tampil sebagai tahap 1 (vol 1); tahap 2-3 didapat saat bertempur lewat kartu upgrade
const HUB_VIEW = {
  pet() {
    const st = LOBBY_PET_STAGE, coins = +profile.progress.coins || 0;
    const info = STAR_PER.map((v, i) => 'Evo ' + (i + 1) + ' +' + Math.round(v * 100) + '%').join(' · ');
    return `<p class="hint">Di lobi, pet menemani Tois sebagai tahap 1. Tahap 2 dan 3 didapat saat bertempur lewat kartu upgrade. Bintang pet bersifat permanen dan menambah damage skill, paling besar di evolusi 2 ke atas.</p>` + ELS.map(el => {
      const s = petStars(el), cost = STAR_COST[s];
      return `
      <article class="pcard" style="--c:${hex(EL[el])}"><h4>${ELNAME[el]}</h4>
        <div class="evos">${[1, 2, 3].map(n => `<div class="evo${n === st ? ' cur' : ''}"><img src="assets/pets/${el}${n}.png" alt=""><b>${EVO[el][n - 1]}</b><small>${SK[el][n - 1].n}</small><em class="stm">×${starMul(el, n).toFixed(2)}</em></div>`).join('')}</div>
        <div class="starrow"><span class="stars" aria-label="Bintang ${s} dari ${STAR_MAX}">${'★'.repeat(s)}${'☆'.repeat(STAR_MAX - s)}</span>${s >= STAR_MAX ? '<b class="smax">MAX</b>' : `<button class="btn main sbtn" data-star="${el}" ${coins < cost ? 'disabled' : ''}>⬆ ★${s + 1} · 🪙 ${cost}</button>`}</div>
        <p class="sinfo">Bonus damage skill per ★: ${info}</p>
        <p>${PET_DESC[el][st - 1]}</p></article>`;
    }).join('');
  },
  char() {
    const p = profile.progress, bar = (ic, n, v, max) => `<div class="stat"><i>${ic}</i><span>${n}</span><div class="sbar"><i style="width:${Math.min(100, v / max * 100)}%"></i></div><b>${v}</b></div>`;
    return `<article class="ccard"><img src="assets/characters/tois-avatar.png" alt="Tois"><div><h4>Tois</h4><span class="tag">Level ${p.level}</span><p>Penjaga markas yang menembak otomatis dengan gatling.</p></div></article>
      <h5>Statistik</h5><div class="stats">${bar('💥', 'Damage', +p.damage, 1000)}${bar('⚡', 'Kecepatan', +p.fire_rate, 10)}${bar('🛡️', 'HP markas', +p.max_hp, 10000)}</div>
      <h5>Senjata & skill</h5>
      <ul class="shoplist">
        <li><i>🔫</i><span><b>Gatling</b>Magasin ${MAG_SIZE} peluru, reload ${RELOAD_MS / 1000} detik. Tahan layar untuk menembak 2x lebih cepat.</span></li>
        <li><i>💥</i><span><b>Badai Peluru</b>Tois +10% damage dan kecepatan tembak selama 10 detik. Cooldown 25 detik.</span></li>
        <li><i>⭐</i><span><b>Level</b>Naik setiap kelipatan 3 gelombang yang dicapai.</span></li>
      </ul>`;
  },
  zone() {
    const island = ISLANDS[selectedIsland], unlocked = stageUnlocked(selectedIsland, selectedStage);
    const progress = worldProgress();
    const mapMarkers = [
      { i: 0, x: 43, y: 37, ic: '🌿' }, { i: 1, x: 38, y: 83, ic: '🌊' },
      { i: 2, x: 16, y: 57, ic: '🌋' }, { i: 3, x: 16, y: 17, ic: '🌪️' }
    ].map(m => `<button class="map-pin ${m.i === selectedIsland ? 'selected' : ''}" data-island="${m.i}" style="left:${m.x}%;top:${m.y}%" aria-label="Pilih ${ISLANDS[m.i].name}"><span>${m.ic}</span><b>${ISLANDS[m.i].name}</b></button>`).join('');
    const stageButtons = Array.from({ length: STAGES_PER_ISLAND }, (_, i) => {
      const n = i + 1, ok = stageUnlocked(selectedIsland, n), active = n === selectedStage;
      return `<button class="stage-node ${active ? 'active' : ''} ${ok ? '' : 'locked'}" data-stage="${n}" ${ok ? '' : 'disabled'}><b>${n}</b><small>${(+progress[selectedIsland] || 0) >= n ? (n % 5 === 0 ? '👑' : '') + starStr(stageStars(selectedIsland, n)) : n === STAGES_PER_ISLAND ? '👑 FINAL' : n % 5 === 0 ? '👑 BOS' : 'Stage'}</small></button>`;
    }).join('');
    const monsters = island.pool.map(id => `<div class="monster-detail"><img src="assets/monsters/${MON[id].f}.png"><span><b>${MON[id].n}</b><small>${MON[id].fly ? 'Monster terbang' : MON[id].hp >= 2 ? 'Monster tangguh' : 'Monster biasa'}</small></span></div>`).join('');
    const bossId = getStageBoss(selectedIsland, selectedStage);
    return `<div class="world-map-viewport" id="worldMapViewport"><div class="world-map" id="worldMap" role="group" aria-label="Peta dunia Pet Blaster" style="background-image:url('assets/peta/indonesia maps.jpg')">${mapMarkers}</div></div>
      
      <div class="island-popup-backdrop" id="islandPopup" hidden>
        <article class="island-popup" role="dialog" aria-modal="true" aria-labelledby="islandPopupTitle">
          <header class="island-popup-head"><div><small>WILAYAH TERPILIH</small><h3 id="islandPopupTitle">${island.title}</h3></div><button class="icon" id="closeIslandPopup" aria-label="Tutup detail pulau">✕</button></header>
          <div class="island-popup-content">
            <p class="island-description">${island.desc}</p>
            <p class="island-arena">🗺️ Arena tetap: <b>${ARENAS[island.bg]} (Arena ${island.bg + 1})</b><br><small>Seluruh 25 stage di pulau ini hanya menggunakan arena tersebut.</small></p>
            <div class="island-progress">Progress terbaik: <b>${+progress[selectedIsland] || 0}/25 stage</b> · <b>★ ${islandStars(selectedIsland)}/${STAGES_PER_ISLAND * 3}</b></div>
            <h5>Stage Pulau ${island.name.replace('Pulau ', '')}</h5><div class="stage-grid">${stageButtons}</div>
            <section class="zone-detail"><h4>📍 ${island.name} — Stage ${selectedStage}</h4><p class="hint">${wavesFor(selectedStage)} wave${selectedStage >= STAGES_PER_ISLAND ? ' · STAGE FINAL' : ''} · Pengali kekuatan monster ×${difficultyOf(selectedIsland, selectedStage).toFixed(2)}.</p><p class="hint">★ Bintang: menang = 1, sisa HP markas ≥ ${Math.round(STAR_RULES.two * 100)}% = 2, ≥ ${Math.round(STAR_RULES.three * 100)}% = 3. Ditampilkan di tiap stage yang sudah ditaklukkan.</p>
            <h5>Monster di pulau ini</h5><div class="monster-grid">${monsters}</div>
            <div class="boss-detail"><img src="assets/monsters/${MON[bossId].f}.png"><div><b>👑 ${selectedStage >= STAGES_PER_ISLAND ? 'Boss Final' : 'Boss Stage ' + selectedStage}: ${MON[bossId].n}</b><small>Elemen: ${island.bossElements.join(' / ')}. ${selectedStage < 25 ? 'Dipilih bergiliran dari roster Boss yang cocok dengan elemen pulau. Muncul pada wave 5 dan wave 10.' : 'Stage final: 15 wave. Elite muncul di wave 3, 6, dan 9, lalu Boss Final di wave 15 dengan HP dan ukuran lebih besar.'}</small></div></div>
            <button class="btn main zone-play" id="zonePlay" ${unlocked ? '' : 'disabled'}>⚔️ Mulai Stage ${selectedStage}</button>
            </section>
          </div>
        </article>
      </div>`;
  },
  guild() {
    return `<article class="gcard"><i>🛡️</i><h4>Belum bergabung guild</h4><p>Berkumpul dengan pemain lain, selesaikan misi bersama, dan raih hadiah guild.</p>
      <div class="row"><button class="btn main" disabled>Buat Guild</button><button class="btn alt" disabled>Cari Guild</button></div><small>Fitur guild segera hadir.</small></article>
      <h5>Yang akan hadir</h5>
      <ul class="shoplist">
        <li><i>📋</i><span><b>Misi guild</b>Selesaikan target mingguan bersama anggota.</span></li>
        <li><i>🪙</i><span><b>Bonus koin</b>Hadiah koin tambahan dari kontribusi guild.</span></li>
        <li><i>💬</i><span><b>Obrolan guild</b>Ngobrol dan saling bantu strategi.</span></li>
        <li><i>🏆</i><span><b>Peringkat</b>Bandingkan guild kamu dengan guild lain.</span></li>
      </ul>`;
  }
};
function renderHub(key = hubKey) {
  hubKey = key; const t = HUB.find(h => h[0] === key);
  $('hubTitle').textContent = t[2];
  document.querySelectorAll('.hview').forEach(v => { v.hidden = v.id !== 'v-' + key; });
  if (HUB_VIEW[key] && profile) {
    $('v-' + key).innerHTML = HUB_VIEW[key]();
    if (key === 'pet') {
      $('v-pet').querySelectorAll('[data-star]').forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await api('/pet/star', 'POST', { el: b.dataset.star }); say('Bintang pet naik! Tersimpan permanen.'); } catch (err) { say(err.message); }
        try { await refreshProfile(); } catch (err) { console.error(err); }
      });
    }
    if (key === 'zone') {
      const view = $('v-zone');
      const popup = view.querySelector('#islandPopup');
      view.querySelectorAll('[data-island]').forEach(b => b.onclick = () => { selectedIsland = +b.dataset.island; selectedStage = 1; renderHub('zone'); $('islandPopup').hidden = false; });
      view.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { selectedStage = +b.dataset.stage; renderHub('zone'); $('islandPopup').hidden = false; });
      const close = view.querySelector('#closeIslandPopup'); if (close) close.onclick = () => { popup.hidden = true; };
      popup?.addEventListener('click', e => { if (e.target === popup) popup.hidden = true; });
      const play = $('zonePlay'); if (play) play.onclick = () => { $('hub').hidden = true; $('gamePanel').classList.add('battle'); game.scene.stop('Lobby'); game.scene.start('Battle'); };
      const map = view.querySelector('#worldMap'), viewport = view.querySelector('#worldMapViewport');
      if (map && viewport) {
        viewport.scrollLeft = Math.min(120, Math.max(0, viewport.scrollWidth - viewport.clientWidth));
        let down = false, x = 0, y = 0, sx = 0, sy = 0, moved = false;
        map.onpointerdown = e => { if (e.target.closest('.map-pin')) return; down = true; moved = false; x = e.clientX; y = e.clientY; sx = viewport.scrollLeft; sy = viewport.scrollTop; map.setPointerCapture(e.pointerId); };
        map.onpointermove = e => { if (down) { const dx = e.clientX - x, dy = e.clientY - y; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; viewport.scrollLeft = sx - dx; viewport.scrollTop = sy - dy; } };
        map.onpointerup = map.onpointercancel = () => { down = false; };
      }
    }
  }
  document.querySelectorAll('#hubTabs button').forEach(b => b.classList.toggle('on', b.dataset.k === key));
}
function openHub(key) { $('hub').hidden = false; $('hubBody').scrollTop = 0; renderHub(key); }
$('hubTabs').innerHTML = HUB.map(([k, ic, n]) => `<button data-k="${k}"><i>${ic}</i><span>${n}</span></button>`).join('');
$('hubTabs').onclick = e => { const b = e.target.closest('button'); if (b) { $('hubBody').scrollTop = 0; renderHub(b.dataset.k); } };
$('hubClose').onclick = () => { $('hub').hidden = true; refreshLobbyScene(); };
$('startBtn').onclick = () => { $('gamePanel').classList.add('battle'); game.scene.stop('Lobby'); game.scene.start('Battle'); };
$('quitBtn').onclick = toLobby; $('lobbyBtn').onclick = toLobby;

class Lobby extends Base {
  constructor() { super('Lobby'); }
  create() {
    this.makeTextures();
    // Latar lobi: gerbang kastil (bos), jembatan, panggung kayu (karakter), lantai batu (tombol). Gambar 780x1280 = 2x kanvas 390x640 (asli 720x1280 dilebarkan dengan cermin, cadangan di tools/).
    this.add.image(W / 2, H / 2, 'lobby_bg').setDisplaySize(W, H).setDepth(-1000);
    const mkTex = (k, w, h, f) => { if (this.textures.exists(k)) return; const g = this.make.graphics({ add: false }); f(g); g.generateTexture(k, w, h); g.destroy(); };
    mkTex('leaf', 10, 6, g => { g.fillStyle(0xffffff).fillEllipse(5, 3, 10, 5); g.fillStyle(0x000000, .25).fillRect(1, 3, 8, 1); });
    if (!this.textures.exists('glow')) {
      const c = this.textures.createCanvas('glow', 128, 128), x = c.getContext(), gr = x.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,214,140,1)'); gr.addColorStop(.5, 'rgba(255,190,110,.35)'); gr.addColorStop(1, 'rgba(255,180,100,0)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128); c.refresh();
    }
    // awan yang pelan bergeser di langit
    [[62, .9, 70000, 0, -90], [104, .6, 52000, 22000, -90]].forEach(([y, sc, dur, delay]) => {
      const c = this.add.image(-90, y, 'cloud').setScale(sc).setAlpha(.32).setDepth(-900);
      this.tweens.add({ targets: c, x: W + 90, duration: dur, delay, repeat: -1 });
    });
    // cahaya hangat di belakang karakter (berdenyut pelan)
    const glow = this.add.image(W / 2, 372, 'glow').setScale(3.4, 1.7).setAlpha(.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(-800);
    this.tweens.add({ targets: glow, alpha: .18, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const FEET = 402, PFEET = 396;                                  // garis pijak di papan panggung
    this.add.image(W / 2, FEET - 3, 'shadow').setScale(1.1).setAlpha(.9);
    const st = LOBBY_PET_STAGE;   // selalu pet tahap 1
    const PX = [52, 110, 250, 308].map(x => x + OX);   // tata letak lama (lebar 360) digeser ke tengah
    const pets = ELS.map((el, i) => { this.add.image(PX[i], PFEET - 2, 'shadow').setScale(.7).setAlpha(.8); return this.add.sprite(PX[i], PFEET, 'pet_' + el + st).setOrigin(.5, this.petOrigin('pet_' + el + st)).setScale(petScale(el, st)).play({ key: 'pet_' + el + st + '_idle', startFrame: i * 2 }); });
    this.heroAnim();
    this.add.sprite(W / 2, FEET, 'tois_anim').setOrigin(.5, 1).setScale(118 / TOIS_ANIM.fh).play('tois_idle');   // Tois animasi (GIF), berpijak di panggung
    // bos berdiri di depan gerbang
    const bossId = getStageBoss(selectedIsland, selectedStage), bs = 118 / SPR['mon' + bossId].ih, boss = this.add.sprite(W / 2, 176, 'mon' + bossId).setScale(bs).play('mon' + bossId + '_move');   // golem lava animasi (langkah, lengan, api)
    this.add.particles(W / 2, 120, 'spark', { x: { min: -48, max: 48 }, speedY: { min: -120, max: -45 }, speedX: { min: -22, max: 22 }, lifespan: 900, scale: { start: 1.5, end: 0 }, tint: [0xff7a2e, 0xffc233, 0xff4d2e], frequency: 38, blendMode: 'ADD' });
    // daun yang melayang dan debu cahaya
    this.add.particles(0, 0, 'leaf', { x: { min: -20, max: W }, y: -10, speedX: { min: 12, max: 38 }, speedY: { min: 20, max: 40 }, rotate: { start: 0, end: 360 }, lifespan: 9000, scale: { start: 1, end: .7 }, alpha: { start: .95, end: .25 }, tint: [0x8fd36a, 0xc8e07a, 0xf2c14e, 0x6fbf5a], frequency: 1400 }).setDepth(900);
    this.add.particles(0, 0, 'spark', { x: { min: 0, max: W }, y: { min: 250, max: 640 }, speedY: { min: -40, max: -15 }, lifespan: 3000, scale: { start: .5, end: 0 }, alpha: { start: .7, end: 0 }, tint: 0xffe3b8, frequency: 160 });
    hideLoading();   // lobi sudah tergambar penuh, buka layar pemuatan
  }
}

// Selagi pemain masih di halaman login, unduh aset game di latar belakang (sedikit demi sedikit) agar masuk lobi tidak menunggu lama.
function prefetchAssets() {
  const urls = ['assets/backgrounds/lobby.jpg', TOIS_ANIM.src, BATTLE_HERO_SRC];
  Object.keys(MON).forEach(i => { const s = SPR['mon' + i]; if (s) urls.push('assets/' + s.file); });
  ELS.forEach(el => [1, 2, 3].forEach(n => { const s = SPR['pet_' + el + n]; if (s) urls.push('assets/' + s.file); }));
  ['fire_slash.png', 'fire_orb.png', 'ice_arrow.png', 'ice_freeze.png', 'water_fx.png', 'wind_blade.png?v=w2', 'wind_tornado.png?v=w3',
    'earth_hole.png?v=t1', 'earth_ball.png?v=t2', 'earth_crystal.png?v=t3', 'fire_lava_claw.png'].forEach(f => urls.push('assets/pet-actions/' + f));
  const next = () => { const u = urls.shift(); if (!u) return; fetch(u).catch(() => { }).finally(next); };   // maksimal 3 unduhan bersamaan
  setTimeout(() => { next(); next(); next(); }, 800);
}

// Jika sesi login masih aktif (mis. halaman dimuat ulang), langsung masuk game dan tutup halaman login.
enterGame().catch(() => { $('authPanel').hidden = false; $('gamePanel').hidden = true; prefetchAssets(); });