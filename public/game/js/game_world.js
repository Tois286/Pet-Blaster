// Konfigurasi pulau, arena, stage, wave, tingkat kesulitan, dan bintang.
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
const BOSS_ESCORT = 10;   // jumlah monster biasa yang keluar bersamaan dengan bos / elite (ubah angka ini untuk menyetel)
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
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: '.stage-node small{white-space:nowrap}' }));   // gaya kotak hasil (bintang, kartu) ada di css/game.css


