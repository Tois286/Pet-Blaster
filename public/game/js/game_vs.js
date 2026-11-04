// Pet Blaster - aturan main mode VS (1 vs 1, 2 vs Bot, 2 vs 2).
// Modul ini hanya berisi data aturan dan fungsi pemilih arena/peran; logika battle VS dipasang di game_battle.js.
// Dimuat setelah game_world.js dan sebelum game_engine.js / game_ui.js.

// Dua peran: tiap pertandingan selalu ada satu sisi penyerang dan satu sisi penahan.
const VS_ROLE = { ATTACK: 'serang', DEFEND: 'tahan' };
const VS_ROLE_NAME = { serang: 'Penyerang', tahan: 'Penahan' };

// Gambar arena VS: satu arena panjang (bisa di-scroll) dipakai semua peran.
//   Penyerang melihat bagian ATAS arena (tempat monster muncul); penahan melihat bagian BAWAH (benteng/gerbang).
//   Kunci tekstur dimuat di Base.preload (game_engine.js). File: assets/backgrounds/arena_vs_battle.jpg (dari arena_vs_battel.png, diperkecil agar aman di HP: tinggi < 4096 px).
const VS_ARENA = {
  battle: { key: 'vs_arena', src: 'assets/backgrounds/arena_vs_battle.jpg?v=1', name: 'Arena Benteng (scroll)' }
};
// Pengaturan tampilan arena panjang.
//   shift  : gambar digeser ke bawah sekian px agar gerbang benteng pas dengan titik monster berhenti (BASE_Y). Naikkan = gerbang turun.
//   margin : jarak titik muncul monster dari tepi atas gambar.
//   speed  : pengali kecepatan monster di arena panjang (jalurnya jauh lebih panjang dari arena biasa). 1 = sama seperti arena biasa.
const VS_VIEW = { shift: 60, margin: 12, speed: 2 };

// side = jumlah pemain per sisi. Di 2 vs Bot, sisi pemain berisi 2 orang dan sisi lawan dikendalikan bot.
const VS_MODES = {
  '1v1': { name: '1 vs 1', sideA: 1, sideB: 1, bot: false },
  '2vbot': { name: '2 vs Bot', sideA: 2, sideB: 2, bot: true },   // sisi B = bot
  '2v2': { name: '2 vs 2', sideA: 2, sideB: 2, bot: false },
  '1vbot': { name: '1 vs Bot', sideA: 1, sideB: 1, bot: true, test: true }   // mode uji gameplay: satu pemain melawan bot (bisa dimainkan sekarang)
};

// Aturan umum.
const VS_RULES = {
  roleFirstRound: 'random',   // peran babak pertama diundi: sisi A atau B jadi penyerang
  swapEachRound: true,        // setiap babak berikutnya peran ditukar
  rounds: 2,                  // tiap sisi sempat jadi penyerang dan penahan satu kali
  maxPets: 2                  // penahan hanya boleh memanggil 2 karakter pet per babak (berlaku di semua mode VS)
};

const vsOpposite = role => role === VS_ROLE.ATTACK ? VS_ROLE.DEFEND : VS_ROLE.ATTACK;

// Peran sisi A pada babak ke-round (mulai 0). firstA = peran sisi A di babak 0 (bila kosong, diundi).
function vsRoleOfSideA(round, firstA) {
  const f = firstA || (Math.random() < .5 ? VS_ROLE.ATTACK : VS_ROLE.DEFEND);
  return VS_RULES.swapEachRound && round % 2 ? vsOpposite(f) : f;
}

// Arena untuk satu pemain: semua peran memakai arena panjang yang sama; yang berbeda hanya posisi awal kamera (lihat VsBattle).
function vsArenaFor(mode, role) {
  if (!VS_MODES[mode]) throw new Error('Mode VS tidak dikenal: ' + mode);
  return VS_ARENA.battle;
}

// ---- Aturan wave dan kartu monster ----
// Penahan: menembaki monster yang datang (sistem tembak yang sudah ada di Battle).
// Penyerang: tidak menembak, tetapi mengatur monster yang dikirim tiap wave lewat kartu.
// Satu babak = 5 wave. Penyerang punya total 100 monster per babak: 97 monster biasa + 2 elite + 1 bos.
const VS_WAVES = 5;                 // jumlah wave dalam satu babak
const VS_BUDGET = { total: 100, elite: 2, boss: 1 };   // total termasuk elite dan bos; sisanya monster biasa (97)
const VS_HAND = 3;                  // jumlah kartu monster yang muncul tiap wave
const VS_SPECIAL_FROM = 3;          // kartu elite dan bos baru bisa muncul mulai wave ini
// Jenis kartu. Elite = monster besar (golem/naga mini/tank), bos = bos final pulau; sisanya monster biasa.
const VS_ELITE_IDS = [5, 10, 12, 14];
const VS_BOSS_IDS = [23, 24, 25, 26];
const VS_NORMAL_IDS = Object.keys(MON).map(Number).filter(id => !VS_ELITE_IDS.includes(id) && !VS_BOSS_IDS.includes(id));
const vsKind = id => VS_BOSS_IDS.includes(id) ? 'boss' : VS_ELITE_IDS.includes(id) ? 'elite' : 'normal';

// State penyerang untuk satu babak. sent = daftar kiriman per wave: [{ wave, id, qty }].
function vsNewAttackState() {
  return { wave: 1, left: VS_BUDGET.total, eliteLeft: VS_BUDGET.elite, bossLeft: VS_BUDGET.boss, sent: [], hand: [] };
}

// Tarik 3 kartu berbeda untuk wave saat ini. Kartu elite/bos hanya bila jatahnya masih ada dan wave >= VS_SPECIAL_FROM.
// Di wave terakhir, bos yang belum terpakai dijamin muncul agar jatah monster terpakai penuh.
function vsDrawHand(st, rnd = Math.random) {
  const pool = VS_NORMAL_IDS.slice();
  if (st.wave >= VS_SPECIAL_FROM) {
    if (st.eliteLeft > 0) pool.push(...VS_ELITE_IDS);
    if (st.bossLeft > 0) pool.push(...VS_BOSS_IDS);
  }
  const hand = [];
  if (st.wave === VS_WAVES && st.bossLeft > 0) hand.push(VS_BOSS_IDS[Math.floor(rnd() * VS_BOSS_IDS.length)]);
  while (hand.length < VS_HAND && pool.length) {
    const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    if (!hand.includes(id)) hand.push(id);
  }
  st.hand = hand;
  return hand;
}

// Perencanaan penyerang tiap wave: maksimal VS_PICKS kartu (dari 3 kartu di tangan) dengan jumlah masing-masing, dalam VS_PLAN_SEC detik.
// plan = [{ id, qty }]. Total qty wave ini dibatasi VS_waveCap: sisa monster dikurangi 1 untuk tiap wave yang belum jalan (wave berikutnya tidak kosong).
const VS_PICKS = 3;                 // jumlah kesempatan memilih kartu tiap wave
const VS_PLAN_SEC = 40;             // batas waktu mengatur serangan tiap wave (detik); habis = terkirim otomatis

// HP monster VS = HP monster pulau terakhir yang dikunjungi pemain yang MENAHAN (pulau tertinggi yang sudah dimainkan, stage tertinggi di pulau itu).
// prog = worldProgress() milik penahan ({ indeksPulau: stage tertinggi }). Mengembalikan pulau, stage, dan pengali HP (sama dengan difficultyOf yang dipakai battle pulau).
function vsDefenderTier(prog) {
  let island = 0; ISLANDS.forEach((_, i) => { if ((+prog[i] || 0) > 0) island = i; });
  const stage = Math.max(1, Math.min(STAGES_PER_ISLAND, +prog[island] || 0));
  return { island, stage, mul: difficultyOf(island, stage) };
}
const vsWaveCap = st => Math.max(1, st.left - (VS_WAVES - st.wave));
const vsSum = (plan, f = () => true) => plan.filter(f).reduce((a, p) => a + p.qty, 0);

// Rentang jumlah yang boleh diisi untuk kartu id, dengan memperhitungkan kartu lain yang sudah diatur di plan.
function vsQtyRange(st, id, plan = []) {
  const others = plan.filter(p => p.id !== id), k = vsKind(id);
  let max = vsWaveCap(st) - vsSum(others);
  if (k === 'elite') max = Math.min(max, st.eliteLeft - vsSum(others, p => vsKind(p.id) === 'elite'));
  if (k === 'boss') max = Math.min(max, st.bossLeft - vsSum(others, p => vsKind(p.id) === 'boss'));
  return { min: 0, max: Math.max(0, max) };
}

function vsCheckPlan(st, plan) {
  if (!plan.length || plan.length > VS_PICKS) throw new Error('Pilih 1 sampai ' + VS_PICKS + ' kartu.');
  if (new Set(plan.map(p => p.id)).size !== plan.length) throw new Error('Kartu tidak boleh dobel.');
  plan.forEach(p => {
    if (!st.hand.includes(p.id)) throw new Error('Kartu tidak ada di tangan wave ini.');
    const r = vsQtyRange(st, p.id, plan);
    if (!(Number.isInteger(p.qty) && p.qty >= 1 && p.qty <= r.max)) throw new Error('Jumlah ' + MON[p.id].n + ' harus 1 sampai ' + r.max + '.');
  });
}

// Rencana otomatis (waktu habis dan belum memilih): kartu monster biasa pertama di tangan, sejumlah rata-rata sisa per wave.
function vsAutoPlan(st) {
  const id = st.hand.find(i => vsKind(i) === 'normal') || st.hand[0];
  const avg = Math.ceil(st.left / (VS_WAVES - st.wave + 1));
  return [{ id, qty: Math.max(1, Math.min(avg, vsQtyRange(st, id).max)) }];
}

// Rencana bot penyerang: elite/bos yang muncul dikirim 1 dulu, sisanya dibagi ke 1-2 kartu monster biasa.
function vsBotPlan(st, rnd = Math.random) {
  const cap = vsWaveCap(st), target = st.wave === VS_WAVES ? st.left : Math.max(1, Math.min(cap, Math.round(st.left / (VS_WAVES - st.wave + 1)) + Math.floor(rnd() * 5) - 2));
  const plan = [];
  st.hand.filter(i => vsKind(i) !== 'normal').forEach(id => { if (vsSum(plan) < target && vsQtyRange(st, id, plan).max > 0) plan.push({ id, qty: 1 }); });
  const normals = st.hand.filter(i => vsKind(i) === 'normal').sort(() => rnd() - .5).slice(0, Math.max(1, Math.min(2, VS_PICKS - plan.length)));
  let rest = Math.max(1, target - vsSum(plan));
  normals.forEach((id, i) => { const q = i === normals.length - 1 ? rest : Math.max(1, Math.floor(rest / 2)); plan.push({ id, qty: q }); rest -= q; });
  return plan.filter(p => p.qty > 0);
}

// Kirim rencana wave ini: kurangi jatah, maju ke wave berikutnya, lalu kembalikan antrean id monster (urut sesuai kartu).
function vsSendPlan(st, plan) {
  vsCheckPlan(st, plan);
  plan.forEach(p => { st.left -= p.qty; if (vsKind(p.id) === 'elite') st.eliteLeft -= p.qty; if (vsKind(p.id) === 'boss') st.bossLeft -= p.qty; st.sent.push({ wave: st.wave, id: p.id, qty: p.qty }); });
  st.wave++; st.hand = [];
  return plan.flatMap(p => Array(p.qty).fill(p.id));
}

// ---- Alur pertandingan: 2 babak, peran ditukar ----
// Penyerang menang total bila benteng penahan hancur dalam satu babak. Bila bertahan, lanjut babak 2 dengan peran tertukar.
// Setelah 2 babak tanpa benteng hancur, pemenang diputuskan berurutan (lihat vsJudge); semua sama = seri.
let vsMatch = null;   // pertandingan yang sedang berjalan (null = tidak ada)
function vsNewMatch(mode) {
  return { mode, round: 0, first: Math.random() < .5 ? VS_ROLE.ATTACK : VS_ROLE.DEFEND, results: [], active: true };
}
const vsRoleOf = m => m.round % 2 ? vsOpposite(m.first) : m.first;   // peran pemain pada babak saat ini

// Keputusan akhir setelah 2 babak. res = [{ defender: 'human'|'bot', hp, max, reach, depth }]; tiap babak dicatat dari sisi PENAHAN.
// Kalau kedua benteng sama-sama utuh (kasus paling umum), pemenang ditentukan berurutan:
//   1) sisa HP benteng: lebih banyak lebih baik.
//   2) monster yang sampai ke tembok (reach): lebih sedikit lebih baik. Mencerminkan juga kekuatan serangan lawan (penyerang yang bagus meloloskan lebih banyak).
//   3) jarak maju rata-rata monster sebelum mati (depth, persen jalur dari titik muncul ke tembok): lebih kecil = penahan menembak lebih jauh / serangan lawan lebih lemah.
// Jumlah monster yang terbunuh sengaja tidak dipakai: bila benteng bertahan, semua monster yang dikirim pasti terbunuh, jadi angkanya hanya mengikuti jumlah kiriman penyerang.
// Mengembalikan { winner: 'human'|'bot'|'draw', by: kunci penentu | null, label, mine, theirs } (mine/theirs = nilai kamu vs bot untuk penentu itu).
const VS_TIEBREAKS = [
  { key: 'hp', label: 'sisa HP benteng', higher: true, fmt: v => String(v) },
  { key: 'reach', label: 'monster yang sampai ke tembok', higher: false, fmt: v => String(v) },
  { key: 'depth', label: 'jarak monster maju sebelum mati', higher: false, fmt: v => v + '%' }
];
function vsJudge(res) {
  const get = who => res.find(r => r.defender === who) || { hp: 0, reach: 0, depth: 0 }, h = get('human'), b = get('bot');
  for (const t of VS_TIEBREAKS) {
    const a = +h[t.key] || 0, c = +b[t.key] || 0;
    if (a === c) continue;
    const humanWins = t.higher ? a > c : a < c;
    return { winner: humanWins ? 'human' : 'bot', by: t.key, label: t.label, mine: t.fmt(a), theirs: t.fmt(c) };
  }
  return { winner: 'draw', by: null, label: '', mine: '', theirs: '' };
}
const vsFinalWinner = res => vsJudge(res).winner;