// Data skin Tois dan rig animasi karakter Tois saat gameplay.
// Tois khusus gameplay: spritesheet transparan dari video (latar & asap dihapus). 59 frame + 1 frame siap: 0-7 semburan tembak, 8-58 reload, 59 siaga.
const TOIS_IDLE = { src: 'assets/characters/tois-anim.webp', fw: 172, fh: 320, frames: 90, fps: 15 };   // idle lobi skin SWAT: sheet 14 kolom x 7 baris (2408x2240), 90 frame terisi
// preload
// this.load.spritesheet('tois_idle', TOIS_IDLE.src, { frameWidth: TOIS_IDLE.fw, frameHeight: TOIS_IDLE.fh });
// animasi
// this.anims.create({ key: 'tois_idle_loop', frames: this.anims.generateFrameNumbers('tois_idle', { start: 0, end: 237 }), frameRate: 12, repeat: -1 });
// pakai
// this.add.sprite(x, FEET, 'tois_idle').setOrigin(.42, 1).setScale(118 / TOIS_IDLE.fh).play('tois_idle_loop');
const BATTLE_HERO_SRC = 'assets/characters/tois-gatling.webp?v=3';   // outfit baru (SWAT biru gelap): 10 kolom x 6 baris = 60 frame
const BATTLE_SHEET = { fw: 182, fh: 415, burst: 8, reload: 51, ready: 59, charH: 288, anchorX: .5275, anchorY: .9928, tipUp: 300 };   // frame 0-7 tembak (kilatan), 8-58 reload, 59 siaga
// ---- Skin Tois (menu Karakter): tiap skin = spritesheet idle (lobi) + spritesheet tembak (gameplay) + avatar. Tambah skin baru cukup menambah satu baris di SKINS. ----
// idleOX = titik tengah badan di frame idle (0-1); battle = spritesheet gameplay (10 kolom x 6 baris, ukuran frame sama dengan BATTLE_SHEET).
// Ukuran frame sheet tembak bisa berbeda per skin: tambahkan `sheet: { fw, fh, charH, anchorX, anchorY, tipUp }` di baris SKINS bila sheet-nya tidak 182x415.
const battleSheet = k => Object.assign({}, BATTLE_SHEET, (k && k.sheet) || {});
const SKINS = [
  { id: 'swat', outfit: 'base', name: 'SWAT', rarity: 'Standar', color: '#4b7bd8', avatar: 'assets/characters/tois-avatar.png', idle: TOIS_IDLE, idleOX: .5, gif: 'assets/characters/tois-swat.gif', png: 'assets/characters/tois-swat-card.png', battle: BATTLE_HERO_SRC, sheet: { fw: 166, fh: 382, charH: 270, anchorX: .515, anchorY: .9948, tipUp: 281 } },   // sheet SWAT 1660x2292 = 10x6 frame @166x382
  { id: 'elite', outfit: 'elite', name: 'Elite', rarity: 'Langka', color: '#e0a82e', avatar: 'assets/characters/tois-elite-avatar.png', idle: { src: 'assets/characters/tois-idle-elite.webp', fw: 170, fh: 320, frames: 238, fps: 12 }, idleOX: .5, gif: 'assets/characters/tois-elite.gif', png: 'assets/characters/tois-elite-card.png', battle: 'assets/characters/tois-gatling-elite.webp' },
  { id: 'master', outfit: 'master', name: 'Master', rarity: 'Master', color: '#1fb8d6', avatar: 'assets/characters/tois-master-avatar.png', idle: { src: 'assets/characters/tois-idle-master.webp', fw: 172, fh: 320, frames: 120, fps: 12 }, idleOX: .5, gif: 'assets/characters/tois-master.gif', png: 'assets/characters/tois-master-card.png', battle: 'assets/characters/tois-gatling-master.webp' },   // idle: 12 kolom x 10 baris (2064x3200), 120 frame; battle: 10 kolom x 6 baris (1820x2490)
  // gif = GIF idle transparan untuk pratinjau Toko; png = gambar badan penuh transparan untuk menu Karakter (assets/characters/tois-<id>-card.png); avatar = ikon kecil cadangan.
  // Epic / Legendary / Mythical: sheet tembak gameplay khusus tiap skin (10 kolom x 6 baris, frame 182x415, transparan; urutan frame sama dengan BATTLE_SHEET: 0-7 tembak, 8-58 reload, 59 siaga).
  { id: 'epic', outfit: 'epic', name: 'Epic', rarity: 'Epik', color: '#c04bd8', avatar: 'assets/characters/tois-epic-avatar.png', idle: { src: 'assets/characters/tois-idle-epic.webp', fw: 236, fh: 320, frames: 95, fps: 12 }, idleOX: .5, gif: 'assets/characters/tois-epic.gif', png: 'assets/characters/tois-epic-card.png', battle: 'assets/characters/tois-gatling-epic.webp?v=1' },
  { id: 'legendary', outfit: 'legendary', name: 'Legendary', rarity: 'Legendaris', color: '#e8a31c', avatar: 'assets/characters/tois-legendary-avatar.png', idle: { src: 'assets/characters/tois-idle-legendary.webp', fw: 190, fh: 320, frames: 95, fps: 12 }, idleOX: .5, gif: 'assets/characters/tois-legendary.gif', png: 'assets/characters/tois-legendary-card.png', battle: 'assets/characters/tois-gatling-legendary.webp?v=1' },
  { id: 'mythical', outfit: 'mythical', name: 'Mythical', rarity: 'Mitos', color: '#7a4be0', avatar: 'assets/characters/tois-mythical-avatar.png', idle: { src: 'assets/characters/tois-idle-mythical.webp', fw: 230, fh: 320, frames: 95, fps: 12 }, idleOX: .5, gif: 'assets/characters/tois-mythical.gif', png: 'assets/characters/tois-mythical-card.png', battle: 'assets/characters/tois-gatling-mythical.webp?v=1' }
];
// ---- Peluru & damage per skin. dmgMul = pengali damage peluru Tois menurut rank skin (pet tidak ikut). Tiap skin punya tekstur, jejak, kilatan moncong, efek benturan, dan satu keunikan sendiri. ----
// tex = tekstur peluru (dibuat di game_engine.js makeTextures); align = peluru menghadap arah terbang; spin = putaran (rad/detik); speed = kecepatan terbang (px/ms).
// trail = jejak (every ms, life ms, s skala, color satu/daftar warna, drift = melayang ke atas). muz = warna kilatan di moncong. imp = efek benturan (ring, glow, n percikan, tex, r jarak, rise, life).
// Keunikan: elite = tracer emas cepat; master = plasma menembus 1 musuh; epic = kristal, 15% CRIT; legendary = bola api, membakar 3 detik; mythical = bintang galaksi, menembus 2 musuh.
const SKIN_FX = {
  swat: { rank: 'Standar', dmgMul: 1, tex: 'bullet', speed: .75 },
  elite: {
    rank: 'Langka', dmgMul: 1.12, tex: 'bul_elite', align: 1, speed: .88, muz: 0xffd34d,
    trail: { every: 26, life: 230, s: .45, color: 0xffd34d },
    imp: { n: 6, color: [0xffd34d, 0xfff3b0], s: .5, r: 30, life: 240 }
  },
  master: {
    rank: 'Master', dmgMul: 1.25, tex: 'bul_master', spin: 7, speed: .8, muz: 0x4fe6ff, pierce: { n: 1, m: .5 },
    trail: { every: 22, life: 260, s: .4, tex: 'orb', color: 0x4fe6ff, a: .6 },
    imp: { ring: 0x4fe6ff, rs: .7, glow: 0x9ff3ff, n: 6, color: 0x4fe6ff, s: .5, r: 26, life: 260 }
  },
  epic: {
    rank: 'Epik', dmgMul: 1.45, tex: 'bul_epic', align: 1, speed: .8, muz: 0xff5bd8, crit: { p: .15, m: 1.6, color: '#ff7be8' },
    trail: { every: 24, life: 280, s: .5, color: [0xff5bd8, 0xb04bff], jit: 4 },
    imp: { n: 6, tex: 'shard', color: [0xff5bd8, 0xffa6f0], s: .55, r: 34, life: 300 }
  },
  legendary: {
    rank: 'Legendaris', dmgMul: 1.7, tex: 'bul_legendary', align: 1, speed: .72, muz: 0xff8a1e, burn: 3000,
    trail: { every: 18, life: 340, s: .7, color: [0xff8a1e, 0xffd34d, 0xff4a1e], drift: -16, jit: 6 },
    imp: { ring: 0xff8a1e, rs: .8, glow: 0xffc928, n: 10, color: [0xff8a1e, 0xffd34d, 0xff4a1e], s: .6, r: 30, rise: 18, life: 380 }
  },
  mythical: {
    rank: 'Mitos', dmgMul: 2, tex: 'bul_mythical', spin: 4, speed: .9, muz: 0xb98aff, pierce: { n: 2, m: .7 },
    trail: { every: 16, life: 320, s: .55, color: [0xffd34d, 0xb98aff, 0x7ad8ff], jit: 8 },
    imp: { ring: 0xffd34d, rs: .9, glow: 0xb98aff, n: 8, tex: 'arrow', color: [0xffd34d, 0xb98aff], s: .6, r: 36, life: 320 }
  }
};
const skinFx = (id) => SKIN_FX[id || skinWorn()] || SKIN_FX.swat;
const skinOf = id => SKINS.find(k => k.id === id) || SKINS[0];
const skinWorn = () => { const w = outfitWorn(), k = SKINS.find(x => x.outfit === w); return k ? k.id : SKINS[0].id; };   // skin = outfit Toko yang punya animasi (base = SWAT, elite = Elite)
const skinOfOutfit = id => SKINS.find(k => k.outfit === id), outfitHasSkin = id => !!skinOfOutfit(id);   // outfit dengan spritesheet animasi tidak memakai gambar diam
const skinIdleKey = k => 'tois_idle_' + k.id, skinBattleKey = k => 'tois_battle_' + k.id;
(() => {   // gaya kartu pilihan skin (menu Karakter)
  const st = document.createElement('style');
  st.textContent = '.sknrow{display:flex;flex-wrap:wrap;gap:10px;margin:8px 0 16px}.skn{flex:1 1 28%;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 6px 10px;border-radius:14px;border:2px solid rgba(128,128,128,.35);background:rgba(0,0,0,.15);color:inherit;font:inherit;cursor:pointer}'
    + '.skn img{width:auto;max-width:100%;height:110px;object-fit:contain}.skn b{font-size:14px}.skn small{font-size:11px;opacity:.9}.skn em{font-style:normal;font-size:11px;color:var(--rc)}'
    + '.skn.on{border-color:var(--rc);box-shadow:0 0 12px var(--rc)}.skn i{font-style:normal;font-size:12px;font-weight:700;margin-top:4px;padding:3px 12px;border-radius:10px;background:rgba(128,128,128,.3)}.skn.on i{background:var(--rc);color:#1d1330}';
  document.head.appendChild(st);
})();

const TS = (size, color) => ({ fontFamily: 'system-ui, sans-serif', fontSize: size + 'px', fontStyle: 'bold', color, stroke: '#2b1d4a', strokeThickness: 4, resolution: 2 });

// Rig Tois khusus gameplay: sprite baru, dengan gerak lembut untuk napas, bidikan, recoil, dan terkena serangan.
// Halaman lobi tidak memakai rig ini sehingga animasi sebelum mulai tetap persis seperti semula.
class HeroRig {
  constructor(scene, x, feetY, h) {
    this.sc = scene; this.x = x; this.y = feetY; this.h = h;
    const sk0 = skinOf(skinWorn()), B0 = battleSheet(sk0); this.B = B0;
    this.k = h / B0.charH; this.baseScale = this.k;
    this.t = 0; this.kick = 0; this.hurtT = 0; this.shake = 0;
    this.aim = 0; this.aimGoal = 0; this.lift = 0; this.reloading = false;
    const A = scene.anims, sk = sk0, K = skinBattleKey(sk), B = B0;
    this.an = { burst: 'tois_b_burst_' + sk.id, reload: 'tois_b_reload_' + sk.id, ready: 'tois_b_ready_' + sk.id };   // animasi per skin
    if (!A.exists(this.an.burst)) A.create({ key: this.an.burst, frames: A.generateFrameNumbers(K, { start: 0, end: B.burst - 1 }), frameRate: 30, repeat: 0 });
    if (!A.exists(this.an.reload)) A.create({ key: this.an.reload, frames: A.generateFrameNumbers(K, { start: B.burst, end: B.burst + B.reload - 1 }), frameRate: B.reload / (RELOAD_MS / 1000), repeat: 0 });
    if (!A.exists(this.an.ready)) A.create({ key: this.an.ready, frames: [{ key: K, frame: B.ready }], frameRate: 1, repeat: -1 });
    this.sprite = scene.add.sprite(x, feetY, K, B.ready)
      .setOrigin(B.anchorX, B.anchorY).setScale(this.k).setDepth(700);
    this.sprite.play(this.an.ready);
  }
  // Satu semburan api per peluru yang ditembakkan; di antara tembakan Tois kembali ke pose siaga.
  shootAnim() {
    if (this.reloading) return;
    const a = this.sprite.anims;
    if (a.isPlaying && a.currentAnim && a.currentAnim.key === this.an.burst) return;
    this.sprite.play(this.an.burst).chain(this.an.ready);
  }
  startReload() { this.reloading = true; this.sprite.play(this.an.reload).chain(this.an.ready); }
  endReload() { this.reloading = false; this.sprite.play(this.an.ready); }
  reset() { this.reloading = false; this.sprite.play(this.an.ready); }
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
  tip() { return { x: this.sprite.x + this.aim * 8, y: this.sprite.y - this.B.tipUp * this.k }; }
  eject() { return { x: this.sprite.x + 8, y: this.sprite.y - this.h * .5 }; }
}