// Konfigurasi inti dan aturan umum game.
// Pet Blaster: tampilan portrait untuk Android. Tois, pet, monster musuh, dan latar memakai gambar PNG/JPG di assets/.
console.log('[GAME] game.js build meteor-v1 dimuat');   // jika baris ini TIDAK muncul di console, browser masih memakai game.js lama (cache)
const API = '/api';
const $ = id => document.getElementById(id);
// Kanvas 390x640 (rasio latar arena baru 1270x2090). Tata letak lobi lama dirancang untuk lebar 360, jadi digeser OX = 15 px ke kanan.
const W = 390, H = 640, OX = (W - 360) / 2, HX = (W - 220) / 2, BASE_Y = 490, WAVES = 10;
// Monster yang sampai di tembok benteng berhenti dan memukul tembok berulang kali (tidak lenyap). Selama masih hidup ia terus memukul.
// dmg = HP markas yang hilang per pukulan, every = jeda antar pukulan (ms). Monster bos memukul lebih keras tetapi lebih lambat.
const WALL_HIT = { dmg: 5, bossDmg: 15, every: 1200, bossEvery: 1800 };
// Aturan harga upgrade Tois (hanya tampilan; harga asli dihitung server, samakan dengan UPGRADES di GameApi.php).
// Harga = cost x (1 + grow% x jumlah pembelian), dengan jumlah pembelian = (nilai sekarang - start) / step. Perhitungan bilangan bulat agar sama persis dengan server.
const UPG_RULE = { damage: { cost: 100, step: 5, start: 10, grow: 10 }, fire_rate: { cost: 150, step: 1, start: 1, grow: 35 }, max_hp: { cost: 120, step: 10, start: 100, grow: 2 } };
const upgCost = (t, v) => { const r = UPG_RULE[t]; return Math.floor((r.cost * (100 + r.grow * Math.floor(Math.max(0, v - r.start) / r.step)) + 50) / 100); };
const UPG = [['damage', '💥', 'Damage'], ['fire_rate', '⚡', 'Kecepatan'], ['max_hp', '🛡️', 'HP markas']], UPG_MAX = { damage: 1000, fire_rate: 10, max_hp: 10000 };   // upgrade Tois (menu Karakter); batas asli dicek server
// Bintang pet: permanen (disimpan server per akun), semua pet mulai dari bintang 1. Biaya naik dari bintang N ke N+1 ada di STAR_COST (harga asli dicek server).
// STAR_PER = tambahan damage skill per bintang di atas 1, untuk evolusi 1, 2, 3. Evolusi 2 jauh lebih besar dari evolusi 1. Ubah angka ini untuk menyetel kekuatan.
const STAR_MAX = 5, STAR_COST = { 1: 500, 2: 1500, 3: 4000, 4: 10000 }, STAR_PER = [0.2, 0.5, 0.6];
const petStars = el => Math.min(STAR_MAX, Math.max(1, +(profile && profile.progress && profile.progress['star_' + el]) || 1));
const starMul = (el, st) => 1 + (petStars(el) - 1) * STAR_PER[st - 1];   // pengali damage skill pet; dihitung ulang tiap serangan, jadi otomatis ikut naik saat evolusi
// Gem: HANYA dari bos stage 5, 10, 15, 20 dan stage 25 (Boss Final) tiap pulau, didapat saat stage itu dimenangkan.
// Terra: stage 5/10/15/20 = 50 gem, stage 25 = 100 gem. Tiap pulau berikutnya +25 gem (stage biasa) dan +35 gem (stage 25). Ini hanya tampilan; jumlah asli dihitung server (GEM_RULE di GameApi.php).
const GEM_RULE = { base: 50, island: 25, finalBase: 100, finalIsland: 35 };
const gemReward = (island, stage) => (stage < 5 || stage > 25 || stage % 5) ? 0 : stage === 25 ? GEM_RULE.finalBase + GEM_RULE.finalIsland * island : GEM_RULE.base + GEM_RULE.island * island;
const gemClaimed = (island, stage) => !!(profile && Array.isArray(profile.gemClears) && profile.gemClears.includes(island + '-' + stage));   // gem bos ini sudah diambil (server hanya memberi sekali per bos)
