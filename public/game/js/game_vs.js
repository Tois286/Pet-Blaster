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
// Tata letak di arena panjang, HANYA untuk mode VS (battle pulau memakai arena lama dan tidak berubah).
//   Semua angka = jarak ke atas dari TEPI BAWAH gambar arena (px pada lebar layar 390), jadi ikut bergeser otomatis bila VS_VIEW.shift diubah.
//   wall  : garis tembok. Kaki monster berhenti di puncak gerigi tembok atas lalu memukul dari situ (monster tidak lagi masuk ke jalan kayu).
//   hero  : pijakan kaki Tois di jalan kayu benteng (di antara tembok atas dan tembok bawah).
//   pet   : pijakan kaki pet, sedikit di belakang Tois.
//   petX  : slot pet (yang dipanggil pertama = kiri, kedua = kanan); Tois di tengah (x 195). Jalan kayu membentang x 62-328.
const VS_LAYOUT = { wall: 262, hero: 154, pet: 162, petX: [104, 286, 104, 286] };   // hanya 2 pet yang dibawa: satu di kiri dan satu di kanan Tois (dua angka terakhir cadangan, tidak terpakai)
const vsLayout = bot => ({ wallY: bot - VS_LAYOUT.wall, heroY: bot - VS_LAYOUT.hero, petY: bot - VS_LAYOUT.pet, petX: VS_LAYOUT.petX });

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
  rounds: 2                   // tiap sisi sempat jadi penyerang dan penahan satu kali
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
// Satu babak = 5 wave. Penyerang punya total 100 monster per babak: 85 monster biasa + 10 elite + 5 bos final.
const VS_WAVES = 5;                 // jumlah wave dalam satu babak
const VS_BUDGET = { total: 100, elite: 10, boss: 5 };   // total termasuk elite dan bos; sisanya monster biasa (85)
const VS_PET_MAX = 2;               // penahan hanya boleh membawa 2 pet; dipilih sebelum babak dimulai (pilih 2 dari 4 pet)
const VS_PET_SEC = 10;              // waktu penahan memilih pet (detik); habis = sisa pilihan diundi otomatis. Penyerang menunggu selama itu juga (layar "Menunggu musuh") tanpa melihat pilihan penahan
const VS_HAND = 3;                  // jumlah kartu monster BIASA yang muncul tiap wave (elite dan bos final tidak diundi: penyerang memilihnya sendiri di awal, lihat VS_SPECIAL_PICK)
const VS_SPECIAL_PICK = 2;          // di awal babak penyerang hanya boleh memilih 2 JENIS dari gabungan 4 elite + 4 bos final (bebas campuran: 2 elite, 2 bos, atau 1 elite + 1 bos); kartunya tersimpan dan bisa dipakai kapan saja mulai VS_SPECIAL_FROM
const VS_WAVE_MAX = { elite: 5, boss: 2 };   // batas kiriman dalam SATU wave: maksimal 5 elite dan 2 bos final (semua jenis dihitung bersama)
const VS_SPECIAL_FROM = 1;          // kartu elite/bos final pilihan penyerang bisa dikirim mulai wave ini (1 = sejak awal; naikkan bila ingin dikunci, mis. 3)
// Jenis kartu. Elite = monster besar (golem/naga mini/tank), bos = bos final pulau; sisanya monster biasa.
const VS_ELITE_IDS = [5, 10, 12, 14];
const VS_BOSS_IDS = [23, 24, 25, 26];
const VS_NORMAL_IDS = Object.keys(MON).map(Number).filter(id => !VS_ELITE_IDS.includes(id) && !VS_BOSS_IDS.includes(id));
const vsKind = id => VS_BOSS_IDS.includes(id) ? 'boss' : VS_ELITE_IDS.includes(id) ? 'elite' : 'normal';

// State penyerang untuk satu babak. sent = daftar kiriman per wave: [{ wave, id, qty }].
function vsNewAttackState() {
  return { wave: 1, left: VS_BUDGET.total, eliteLeft: VS_BUDGET.elite, bossLeft: VS_BUDGET.boss, sent: [], hand: [], deck: [] };   // deck = id elite + bos final yang dipilih penyerang
}
// Deck acak (dipakai bot penyerang): VS_SPECIAL_PICK jenis dari gabungan elite + bos final.
function vsRandomDeck() {
  return [...VS_ELITE_IDS, ...VS_BOSS_IDS].sort(() => Math.random() - .5).slice(0, VS_SPECIAL_PICK);
}

// Tarik 3 kartu monster biasa yang berbeda untuk wave saat ini. Elite dan bos final tidak ikut diundi: kartunya ada di st.deck (dipilih di awal, hanya VS_SPECIAL_PICK jenis).
function vsDrawHand(st, rnd = Math.random) {
  const pool = VS_NORMAL_IDS.slice(), hand = [];
  while (hand.length < VS_HAND && pool.length) hand.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0]);
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
// Elite/bos hanya bisa dikirim dari st.deck, mulai wave VS_SPECIAL_FROM, dan per wave dibatasi VS_WAVE_MAX (5 elite, 2 bos final).
function vsQtyRange(st, id, plan = []) {
  const others = plan.filter(p => p.id !== id), k = vsKind(id);
  let max = vsWaveCap(st) - vsSum(others);
  if (k !== 'normal' && (st.wave < VS_SPECIAL_FROM || !st.deck.includes(id))) return { min: 0, max: 0 };
  if (k === 'elite') { const o = vsSum(others, p => vsKind(p.id) === 'elite'); max = Math.min(max, st.eliteLeft - o, VS_WAVE_MAX.elite - o); }
  if (k === 'boss') { const o = vsSum(others, p => vsKind(p.id) === 'boss'); max = Math.min(max, st.bossLeft - o, VS_WAVE_MAX.boss - o); }
  return { min: 0, max: Math.max(0, max) };
}

function vsCheckPlan(st, plan) {
  const normals = plan.filter(p => vsKind(p.id) === 'normal');
  if (!plan.length || normals.length > VS_PICKS) throw new Error('Pilih 1 sampai ' + VS_PICKS + ' kartu monster biasa.');
  if (new Set(plan.map(p => p.id)).size !== plan.length) throw new Error('Kartu tidak boleh dobel.');
  plan.forEach(p => {
    if (vsKind(p.id) === 'normal' ? !st.hand.includes(p.id) : !st.deck.includes(p.id)) throw new Error('Kartu tidak tersedia pada wave ini.');
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

// Rencana bot penyerang: mulai wave VS_SPECIAL_FROM mengirim elite/bos dari deck-nya (sisa jatah dibagi rata ke wave yang tersisa, tetap dalam batas per wave), sisanya 1-2 kartu monster biasa.
function vsBotPlan(st, rnd = Math.random) {
  const cap = vsWaveCap(st), target = st.wave === VS_WAVES ? st.left : Math.max(1, Math.min(cap, Math.round(st.left / (VS_WAVES - st.wave + 1)) + Math.floor(rnd() * 5) - 2));
  const plan = [];
  if (st.wave >= VS_SPECIAL_FROM) {
    const wl = VS_WAVES - st.wave + 1;
    ['elite', 'boss'].forEach(k => {
      let want = Math.min(Math.ceil((k === 'elite' ? st.eliteLeft : st.bossLeft) / wl), VS_WAVE_MAX[k]);
      const ids = st.deck.filter(i => vsKind(i) === k).sort(() => rnd() - .5);
      ids.forEach((id, i) => { const q = Math.min(vsQtyRange(st, id, plan).max, Math.ceil(want / (ids.length - i))); if (q > 0) { plan.push({ id, qty: q }); want -= q; } });
    });
  }
  const normals = st.hand.filter(i => vsKind(i) === 'normal').sort(() => rnd() - .5).slice(0, 2);
  let rest = Math.min(Math.max(1, target - vsSum(plan)), vsWaveCap(st) - vsSum(plan));
  if (rest > 0) normals.forEach((id, i) => { const q = i === normals.length - 1 ? rest : Math.max(1, Math.floor(rest / 2)); plan.push({ id, qty: q }); rest -= q; });
  return plan.filter(p => p.qty > 0);
}

// Kirim rencana wave ini: kurangi jatah, maju ke wave berikutnya, lalu kembalikan antrean id monster (urutan keluar diacak).
function vsSendPlan(st, plan) {
  vsCheckPlan(st, plan);
  plan.forEach(p => { st.left -= p.qty; if (vsKind(p.id) === 'elite') st.eliteLeft -= p.qty; if (vsKind(p.id) === 'boss') st.bossLeft -= p.qty; st.sent.push({ wave: st.wave, id: p.id, qty: p.qty }); });
  st.wave++; st.hand = [];
  const q = plan.flatMap(p => Array(p.qty).fill(p.id));
  for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[q[i], q[j]] = [q[j], q[i]]; }   // urutan keluar diacak (bukan per kartu), jumlah tiap jenis tetap
  return q;
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