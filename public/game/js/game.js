// Pet Blaster: tampilan portrait untuk Android. Tois, pet, monster musuh, dan latar memakai gambar PNG/JPG di assets/.
const API = '/api';
const $ = id => document.getElementById(id);
const W = 360, H = 640, BASE_Y = 490, WAVES = 10;
const COST = { damage: 100, fire_rate: 150, max_hp: 120 };      // hanya tampilan; harga asli dicek server
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
  20: { f: '20_tornado_spirit', n: 'Roh Tornado', el: 3, h: 52, hp: 1.1, sp: 1.1, fly: 1 }
};
// Monster yang muncul di tiap arena (indeks sama dengan ARENAS) dan bos gelombang 5 dan 10.
const POOL = [[1, 11, 13, 3, 6], [6, 7, 8, 9, 17, 16], [2, 4, 12, 15, 18, 20], [4, 9, 14, 19, 12, 2, 20]];
const BOSS = { 5: 10, 10: 5 };
const TOIS_ANIM = { src: 'assets/characters/tois-anim.webp', fw: 172, fh: 320, frames: 90, fps: 15 };   // animasi lobi dari tois.gif (latar sudah dihapus)
const HERO_KEY = 'tois', HERO_SRC = 'assets/characters/tois.png', HERO_TEX_H = 648; // karakter halaman awal tetap memakai animasi asli
// Tois khusus gameplay: spritesheet transparan dari video (latar & asap dihapus). 59 frame + 1 frame siap: 0-7 semburan tembak, 8-58 reload, 59 siaga.
const BATTLE_HERO_KEY = 'tois_battle_gatling', BATTLE_HERO_SRC = 'assets/characters/tois-gatling.webp';
const BATTLE_SHEET = { fw: 166, fh: 382, burst: 8, reload: 51, ready: 59, charH: 269.3, anchorX: .5, anchorY: .9933, tipUp: 272.5 };
const MAG_SIZE = 35, RELOAD_MS = 2400;   // 35 peluru per magasin; habis -> reload 2,4 dtk -> penuh lagi, berulang sampai pertempuran selesai
const ELS = ['api', 'air', 'tanah', 'angin'];
const EL = { api: 0xff6a2e, air: 0x3ec6ff, tanah: 0xc89a5a, angin: 0x7fe0ff };
const EVO = { api: ['Rubah', 'Srigala Api', 'Serigala Lava'], air: ['Salamander', 'Naga Air', 'Naga Es'], tanah: ['Tikus Tanah', 'Tikus Batu', 'Tikus Berlian'], angin: ['Burung Pipit', 'Burung Elang', 'Burung Garuda'] };
// Skill evolusi: t = jenis (bolt: k musuh terdepan, aoe: lingkaran r, line: lajur lebar w), m = pengali damage, cd = jeda (ms)
const SK = {
  api: [{ n: 'Cakar Terbang', t: 'bolt', k: 3, m: 1.2, cd: 3500 }, { n: 'Cakar Api Membara', t: 'bolt', k: 4, m: 1.8, cd: 3500 }, { n: 'Bola Lava', t: 'aoe', r: 70, m: 4, cd: 5000 }],
  air: [{ n: 'Gelembung Air', t: 'aoe', r: 40, m: 1.5, slow: 2000, cd: 3000 }, { n: 'Bola Air', t: 'aoe', r: 60, m: 2.5, slow: 2500, cd: 3500 }, { n: 'Kristal Es', t: 'aoe', r: 80, m: 3.5, stun: 2000, cd: 5000 }],
  tanah: [{ n: 'Penggalian Lubang', t: 'aoe', r: 45, m: 1.5, stun: 1500, cd: 3500 }, { n: 'Menggelinding', t: 'line', w: 40, m: 2.5, cd: 4500 }, { n: 'Gali & Tabrak', t: 'line', w: 50, m: 3, stun: 1000, cd: 5000 }],
  angin: [{ n: 'Kepakan Sayap', t: 'line', w: 30, m: 1.2, slow: 1500, cd: 2500 }, { n: 'Cakaran Terbang', t: 'bolt', k: 5, m: 1.4, cd: 3000 }, { n: 'Puting Beliung', t: 'aoe', r: 90, m: 3, slow: 3000, cd: 5000 }]
};
// Urutan arena: normal > salju > lava > kegelapan. ARENA_AT = gelombang awal tiap arena.
const ARENAS = ['Padang Rumput', 'Benteng Salju', 'Benteng Lava', 'Arena Kegelapan'], ARENA_AT = [1, 4, 7, 9];
let game = null, profile = null;

async function api(path, method = 'GET', body = null) {
  const o = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (body !== null) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
  const res = await fetch(API + path, o);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.message || 'Permintaan gagal.');
  return data;
}
function showProfile(d) {
  profile = d; const p = d.progress;
  $('playerName').textContent = d.username; $('coins').textContent = p.coins;
  $('level').textContent = p.level; $('bestWave').textContent = p.best_wave;
  const bw = +p.best_wave;
  $('xpBar').style.width = (bw % 3) / 3 * 100 + '%'; $('stageNo').textContent = Math.min(WAVES, bw + 1);
  $('stageSub').textContent = bw >= WAVES ? 'Sudah ditaklukkan!' : 'Belum ditaklukkan';
  $('goalTxt').textContent = 'Capai gelombang ' + WAVES + ' (' + bw + '/' + WAVES + ')';
  $('miles').innerHTML = [3, 6, 10].map(n => `<div class="m${bw >= n ? ' on' : ''}"><i>${bw >= n ? '✅' : '🎁'}</i><span>Gel. ${n}</span></div>`).join('');
  const afk = +d.afk || 0; $('afkAmt').textContent = afk; $('afkBtn').disabled = afk < 1;
  document.querySelectorAll('[data-upgrade]').forEach(b => {
    const t = b.dataset.upgrade;
    b.querySelector('.val').textContent = p[t]; b.querySelector('.cost').textContent = '🪙 ' + COST[t];
    b.disabled = +p.coins < COST[t];
  });
  $('hubCoins').textContent = p.coins; if (!$('hub').hidden) renderHub();   // panel menu bawah ikut diperbarui
}
async function refreshProfile() { showProfile(await api('/profile')); }
async function enterGame() {
  await refreshProfile();
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
    this.sprite.setTint(this.hurtT > 0 ? 0xff9b9b : 0xffffff);
  }
  // Koordinat perkiraan laras dan tempat selongsong keluar pada sprite gameplay baru.
  tip() { return { x: this.sprite.x + this.aim * 8, y: this.sprite.y - BATTLE_SHEET.tipUp * this.k }; }
  eject() { return { x: this.sprite.x + 8, y: this.sprite.y - this.h * .5 }; }
}

class Base extends Phaser.Scene {
  preload() {
    if (!this.textures.exists(HERO_KEY)) this.load.image(HERO_KEY, HERO_SRC);
    if (!this.textures.exists(BATTLE_HERO_KEY)) this.load.spritesheet(BATTLE_HERO_KEY, BATTLE_HERO_SRC, { frameWidth: BATTLE_SHEET.fw, frameHeight: BATTLE_SHEET.fh });
    if (!this.textures.exists('lobby_bg')) this.load.image('lobby_bg', 'assets/backgrounds/lobby.jpg');
    if (!this.textures.exists('tois_anim')) this.load.spritesheet('tois_anim', TOIS_ANIM.src, { frameWidth: TOIS_ANIM.fw, frameHeight: TOIS_ANIM.fh });
    // Monster dan pet = sprite sheet animasi (dibuat tools/make_sprites.py; ukuran frame ada di SPR, js/sprites-data.js)
    Object.keys(MON).forEach(i => { const k = 'mon' + i, s = SPR[k]; if (!this.textures.exists(k)) this.load.spritesheet(k, 'assets/' + s.file, { frameWidth: s.fw, frameHeight: s.fh }); });
    ELS.forEach(el => [1, 2, 3].forEach(n => { const k = 'pet_' + el + n, s = SPR[k]; if (!this.textures.exists(k)) this.load.spritesheet(k, 'assets/' + s.file, { frameWidth: s.fw, frameHeight: s.fh }); }));
    // Efek skill api custom: tebasan untuk evolusi 1-2, bola api untuk evolusi 3.
    if (!this.textures.exists('fire_slash')) this.load.spritesheet('fire_slash', 'assets/pet-actions/fire_slash.png', { frameWidth: 256, frameHeight: 256 });
    if (!this.textures.exists('fire_orb')) this.load.spritesheet('fire_orb', 'assets/pet-actions/fire_orb.png', { frameWidth: 128, frameHeight: 455 });
  }
  // Pasang karakter Tois dengan tinggi tampilan h (piksel game), berpijak di (x, y).
  heroAnim() { if (!this.anims.exists('tois_idle')) this.anims.create({ key: 'tois_idle', frames: this.anims.generateFrameNumbers('tois_anim', { start: 0, end: TOIS_ANIM.frames - 1 }), frameRate: TOIS_ANIM.fps, repeat: -1 }); }
  addHero(x, y, h) {
    const s = h / HERO_TEX_H, img = this.add.image(x, y, HERO_KEY).setOrigin(.5, 1).setScale(s);
    img.baseScale = s; return img;
  }
  makeAnims() {   // animasi monster: move (loop), hit (sekali), die (sekali); pet: idle (loop), cast (sekali)
    const A = this.anims, mk = (key, k, start, end, fps, repeat) => { if (!A.exists(key)) A.create({ key, frames: A.generateFrameNumbers(k, { start, end }), frameRate: fps, repeat }); };
    Object.keys(MON).forEach(i => { const k = 'mon' + i, s = SPR[k]; mk(k + '_move', k, 0, s.move - 1, 10, -1); mk(k + '_hit', k, s.move, s.move + s.hit - 1, 24, 0); mk(k + '_die', k, s.move + s.hit, s.move + s.hit + s.die - 1, 18, 0); });
    ELS.forEach(el => [1, 2, 3].forEach(n => { const k = 'pet_' + el + n, s = SPR[k]; const idleFps = el === 'air' ? 10 : 8; mk(k + '_idle', k, 0, s.idle - 1, idleFps, -1); mk(k + '_cast', k, s.idle, s.idle + s.cast - 1, 16, 0); }));
    // Animasi frame-by-frame dari sprite sheet efek skill api.
    mk('fire_slash_anim', 'fire_slash', 0, 5, 18, 0);
    mk('fire_orb_anim', 'fire_orb', 0, 7, 18, 0);
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
const PET_Y = 568, PET_SLOTS = [140, 220, 88, 272];   // kaki pet berpijak di jalan kayu benteng (y 537-575, x 57-302); tengah dikosongkan untuk Tois
const ELNAME = { api: '🔥 Api', air: '💧 Air', tanah: '🪨 Tanah', angin: '🌪️ Angin' };
// Deskripsi karakter pet per tahap evolusi
const PET_DESC = {
  api: ['Rubah kecil berbulu jingga yang lincah. Cakarnya melesat jauh sebagai Cakar Terbang.', 'Srigala berapi dengan cakar membara. Menyambar lebih banyak musuh sekaligus.', 'Serigala lava berbadan magma. Melontarkan Bola Lava yang meledak di kerumunan musuh.'],
  air: ['Salamander mungil yang meniup gelembung air. Musuh yang terkena bergerak lambat.', 'Naga air yang melontarkan bola air besar. Area lebih luas, musuh makin lambat.', 'Naga es penguasa dingin. Kristal Es membekukan musuh di area luas.'],
  tanah: ['Tikus tanah penggali. Lubang galiannya membuat musuh terjebak sesaat.', 'Tikus berkulit batu yang menggelinding seperti trenggiling, menghantam satu lajur musuh.', 'Tikus berlian yang menggali lalu menabrak. Kuat, menyetrum, dan membuat musuh terhenti.'],
  angin: ['Burung pipit mungil. Kepakan sayapnya menghempas satu lajur musuh dan memperlambatnya.', 'Elang yang tajam. Cakaran Terbang mengincar banyak musuh sekaligus.', 'Garuda penguasa langit. Puting beliung bersayatan menyapu area sangat luas.']
};
const skillInfo = (p, sk) => sk.t === 'bolt' ? 'Menyerang ' + (sk.k + p.extra) + ' musuh terdepan' : sk.t === 'aoe' ? 'Ledakan area (radius ' + Math.round(sk.r * p.reach) + ')' : 'Menghantam satu lajur (lebar ' + Math.round(sk.w * 2 * p.reach) + ')';
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
  { id: 'storm', ic: '🌪️', n: 'Badai Peluru Cepat', d: 'Cooldown Badai Peluru -2 dtk', ok: b => b.skillMax > 5000, go: b => { b.skillMax -= 2000; } }
];

class Battle extends Base {
  constructor() { super('Battle'); }

  makeWorld() { this.arena = -1; this.bg = null; this.setArena(0); }
  setArena(i) {   // arena berganti mengikuti gelombang (ARENA_AT) dengan transisi pudar
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
    this.hero = new HeroRig(this, 180, 632, 98);   // Tois tampak belakang, tubuh lentur
    this.shells = this.add.particles(0, 0, 'shell', { speedX: { min: 30, max: 90 }, speedY: { min: -110, max: -40 }, gravityY: 420, lifespan: 650, rotate: { start: 0, end: 540 }, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(705);
    this.mflash = this.add.image(0, 0, 'mflash').setOrigin(.08, .5).setDepth(710).setAlpha(0);
    this.pets = ELS.map((el, i) => { const p = this.add.sprite(PET_SLOTS[i], PET_Y, 'pet_' + el + '1').setOrigin(.5, this.petOrigin('pet_' + el + '1')).setScale(.5).setDepth(699); p.play({ key: 'pet_' + el + '1_idle', startFrame: i * 2 }); p.el = el; p.cd = 1500 + i * 700; p.by = p.y; p.on = false; p.setVisible(false); Object.assign(p, { stage: 1, prog: 0, pow: 1, cdMul: 1, volley: 0, reach: 1, extra: 0 }); p.lbl = this.add.text(p.x, PET_Y + 7, '', TS(9, '#ffffff')).setOrigin(.5).setDepth(702).setVisible(false); return p; });   // pet baru muncul setelah dipilih lewat kartu
    $('skillBtn').onclick = () => this.skill();
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
    this.wave = 0; this.kills = 0; this.enemies = []; this.bullets = []; this.spawnT = 0; this.shotT = 0; this.petT = 0; this.skillCd = 0; this.over = false;
    this.ammo = MAG_SIZE; this.reloading = false; this.reloadT = 0; this.hero.reset();
    this.evoQ = []; this.level = 1; this.petsSeen = false; this.xp = 0; this.xpNeed = XP_BASE; this.skillMax = 15000;   // status khusus satu pertempuran
    this.nextWave();
  }
  showEvo(p) {   // kartu detail setiap evolusi; game berhenti sampai pemain menekan Lanjut
    const sk = SK[p.el][p.stage - 1], old = SK[p.el][p.stage - 2], st = p.stage, box = $('evoCard');
    const eff = [sk.stun ? 'Menyetrum ' + sk.stun / 1000 + ' dtk' : '', sk.slow ? 'Memperlambat ' + sk.slow / 1000 + ' dtk' : ''].filter(Boolean).join(', ') || '-';
    const next = st >= 3 ? 'Evolusi maksimal tercapai!' : 'Evolusi berikutnya: kumpulkan ' + EVO_NEED[st - 1] + ' kartu ' + EVO[p.el][st - 1];
    box.innerHTML = `<h3>Evolusi ${st}!</h3>
      <div class="evoimg"><img src="assets/pets/${p.el}${st - 1}.png" alt=""><span>➜</span><img class="big" src="assets/pets/${p.el}${st}.png" alt=""></div>
      <h4>${EVO[p.el][st - 2]} ➜ ${EVO[p.el][st - 1]}</h4><p class="tag">${ELNAME[p.el]}</p>
      <p class="desc">${PET_DESC[p.el][st - 1]}</p>
      <dl><dt>Skill</dt><dd>${old.n} ➜ <b>${sk.n}</b></dd><dt>Serangan</dt><dd>${skillInfo(p, sk)}</dd>
      <dt>Damage</dt><dd>${Math.ceil(this.dmg * sk.m * .6 * p.pow)} per serangan</dd><dt>Cooldown</dt><dd>${(sk.cd * p.cdMul / 1000).toFixed(1)} detik</dd>
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
  addXp(n) { this.xp += n; this.checkLevel(); }
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
        this.pop(180, 300, u.n + '!', '#ffd34d', 18);
        if (this.evoQ.length) this.showEvo(this.evoQ.shift()); else this.checkLevel();   // evolusi: tampilkan kartu detail dulu
      };
      box.appendChild(b);
    });
    $('upgrade').hidden = false;
  }
  nextWave() {
    this.wave++;
    if (this.wave > WAVES) return this.end(true);
    this.toSpawn = 4 + this.wave * 2;
    this.setArena(ARENA_AT.filter(w => this.wave >= w).length - 1);
    this.banner.setText('Gelombang ' + this.wave + (this.wave % 5 === 0 ? '\nBOSS: ' + MON[BOSS[this.wave] || 5].n : '')).setAlpha(1).setScale(.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.Out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1200, duration: 300 });
  }
  spawn() {
    const big = this.toSpawn === 1 && this.wave % 5 === 0; this.toSpawn--;
    const pool = POOL[this.arena] || POOL[0], id = big ? (BOSS[this.wave] || 5) : Phaser.Utils.Array.GetRandom(pool), m = MON[id];
    const h = big ? m.h * 1.7 : m.h, sc = h / SPR['mon' + id].ih;   // ih = tinggi gambar karakter di dalam frame sprite
    const x = Phaser.Math.Between(44, W - 44), hp = Math.ceil((20 + this.wave * 12) * (big ? 7 : m.hp)), bw = Math.max(34, h * .7);
    const sh = this.add.image(x, -20, 'shadow').setScale(h / 46), s = this.add.sprite(x, -20, 'mon' + id).setScale(sc); s.play({ key: 'mon' + id + '_move', startFrame: Phaser.Math.Between(0, 7) });
    const bg = this.add.rectangle(x, -20, bw, 5, 0x2b1d4a).setDepth(950);
    const fg = this.add.rectangle(x - bw / 2, -20, bw, 5, 0x6be3a2).setOrigin(0, .5).setDepth(951);
    this.enemies.push({ s, sh, bg, fg, hp, mhp: hp, bw, k: m.el, id, h, big, sc, x0: x, py: -20, ph: Math.random() * 6.283, fly: !!m.fly, hitT: 0, r: h * .42, sp: (.03 + this.wave * .004) * m.sp * (big ? .6 : 1) });
  }
  ui() {   // HUD DOM: timer, judul stage, progres gelombang
    const s = Math.floor(this.clock / 1000), w = Math.min(this.wave, WAVES), tot = 4 + this.wave * 2, left = this.toSpawn + this.enemies.length;
    $('bTime').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    $('bStage').textContent = w + '. ' + (w % 5 === 0 ? 'Pertarungan Bos' : 'Garis Pertahanan');
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
    const tip = this.hero.tip(); this.shoot(tip.x, tip.y, t, this.dmg);
    this.hero.aimGoal = Phaser.Math.Clamp((t.s.x - 180) / 150, -1, 1); this.hero.fireKick();
    this.hero.shootAnim();   // kilatan moncong sudah ada di animasi Tois
    const ej = this.hero.eject(); this.shells.emitParticleAt(ej.x, ej.y, 1);
    if (--this.ammo <= 0) this.startReload();   // peluru di bar status habis -> reload
  }
  startReload() {
    this.reloading = true; this.reloadT = 0; this.hero.startReload();
    this.pop(180, 548, 'RELOAD', '#8fd8ff', 13);
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
      p.stage++; p.prog = 0; p.setOrigin(.5, this.petOrigin('pet_' + p.el + p.stage)); p.play('pet_' + p.el + p.stage + '_idle');
      this.flash.emitParticleAt(p.x, p.y - 30, 24); this.pop(p.x, p.y - 64, 'Evolusi ' + p.stage + '!', '#ffd34d', 13); this.evoQ.push(p);
    }
    this.petLbl(p);
  }
  cast(p, sk, quiet) {
    const col = EL[p.el], lst = this.enemies.filter(e => !e.dead && e.s.y > 10); if (!lst.length) return;   // hanya musuh yang sudah terlihat di layar
    const pk = 'pet_' + p.el + p.stage; p.play(pk + '_cast').chain(pk + '_idle');   // animasi serang pet (bersiap, melonjak, kembali)
    if (!quiet) this.pop(p.x, p.by - 64, sk.n, '#' + col.toString(16).padStart(6, '0'), 11);
    // SPR[pk].rel = frame animasi serang tempat serangan dilepas (mis. saat mulut terbuka). Animasi pet berjalan 16 fps dan tidak ikut x2.
    const rel = SPR[pk].rel;
    if (rel) this.time.delayedCall(rel * 1000 / 16, () => { if (!this.over && p.active) this.release(p, sk); });
    else this.release(p, sk);
  }
  release(p, sk) {   // bagian serangan yang benar-benar melepas efek + damage (musuh dipilih ulang pada saat dilepas)
    const lst = this.enemies.filter(e => !e.dead && e.s.y > 10); if (!lst.length) return;
    const d = Math.ceil(this.dmg * sk.m * .6 * p.pow);
    let hit, cx = 0, cy = 0, lx = 0;
    if (sk.t === 'bolt') {
      hit = [...lst].sort((a, b) => b.s.y - a.s.y).slice(0, (sk.k || 0) + p.extra);
    } else if (sk.t === 'aoe') {
      const near = (a, b) => Math.hypot(a.s.x - b.s.x, a.s.y - b.s.y) < sk.r * p.reach;
      const c = lst.reduce((b, e) => { const n = lst.filter(o => near(o, e)).length; return n > b.n ? { e, n } : b; }, { e: lst[0], n: 0 }).e;
      hit = lst.filter(e => near(e, c)); cx = c.s.x; cy = c.s.y;
    } else {
      lx = lst.reduce((b, e) => e.s.y > b.s.y ? e : b).s.x;
      hit = lst.filter(e => Math.abs(e.s.x - lx) < sk.w * p.reach);
    }
    const targets = hit.map(e => ({ x: e.s.x, y: e.s.y }));   // posisi saat dilepas (musuh bisa mati/bergeser)
    this.skillFx(p, sk, targets, cx, cy, lx);
    hit.forEach(e => {
      this.dmgTo(e, d);
      if (e.dead) return;
      if (sk.stun) { e.stun = sk.stun; this.tintFor(e, p.el === 'air' ? 0x9fdcff : 0xc9a06a, sk.stun); }   // beku (es) atau terjebak tanah
      if (sk.slow) { e.slow = sk.slow; this.tintFor(e, p.el === 'angin' ? 0xdff6ff : 0x8fd0ff, sk.slow); }
    });
  }
  tintFor(e, color, ms) {   // warnai musuh selama efek status (slow/stun), setelah kilatan kena-tembak selesai
    this.time.delayedCall(80, () => { if (e.s.active && !e.dead) e.s.setTint(color); });
    this.time.delayedCall(ms, () => { if (e.s.active && !e.dead) e.s.clearTint(); });
  }
  // Efek visual tiap skill pet. targets = posisi musuh yang kena (bolt), (cx, cy) = pusat ledakan (aoe), lx = lajur (line).
  skillFx(p, sk, targets, cx, cy, lx) {
    const el = p.el, st = p.stage, ox = p.x, oy = p.y - 34, R = (sk.r || 0) * p.reach, rnd = (a, b) => Phaser.Math.FloatBetween(a, b);
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
        const big = st > 1;
        targets.forEach((t, i) => {
          this.time.delayedCall(i * 55 / this.speed, () => {
            // Efek sabetan muncul tepat di monster yang sudah ditargetkan.
            const slash = this.add.sprite(t.x, t.y, 'fire_slash', 0)
              .setOrigin(.5, .5)
              .setDepth(870)
              .setBlendMode(Phaser.BlendModes.ADD)
              .setRotation(-.22)
              .setScale(big ? .38 : .32)
              .setAlpha(0);
            // Sprite sheet diputar frame demi frame; posisi tetap di target.
            slash.play('fire_slash_anim');
            this.tweens.add({
              targets: slash,
              alpha: { from: 0, to: 1 },
              duration: 70,
              yoyo: true,
              hold: 230,
              repeat: 0,
              onComplete: () => { if (slash.active) slash.destroy(); }
            });
            claw(t.x, t.y, big ? 0xff5a1e : 0xffd34d, big ? 1.5 : 1.1);
          });
        });
      } else {   // Evolusi 3 saja: proyektil bola api custom, lalu ledakan area
        const o = this.add.sprite(ox, oy, 'fire_orb', 0).setOrigin(.5, .15).setDepth(860).setScale(.30);
        o.play('fire_orb_anim');
        this.tweens.add({
          targets: o, scale: .34, x: cx, y: cy, duration: 420, ease: 'Quad.In', onUpdate: () => burst(o.x, o.y + 20, 1), onComplete: () => {
            o.destroy(); ring(cx, cy, R * 1.3, 0xff6a2e, 480); ring(cx, cy, R * .7, 0xffd34d, 320); impact(cx, cy, 0xff762e, 2.0); burst(cx, cy, 28); area(0xff6a2e, .3);
            const cr = this.add.ellipse(cx, cy + 6, R * 1.5, R * .6, 0x2b1208, .65).setDepth(840); fade(cr, 500, 350); this.cameras.main.shake(90, .004);
          }
        });
        this.tweens.add({ targets: o, angle: 12, duration: 420 });
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
        fly('orb', ox, oy, cx, cy, 440, { rot: 0, sc: 1.2, tint: 0x3ec6ff, ease: 'Sine.In', spin: 360, trail: s => burst(s.x, s.y, 1), done: () => { ring(cx, cy, R * 1.3, 0x7fdcff, 480); ring(cx, cy, R * .7, 0xffffff, 300); impact(cx, cy, 0x63d9ff, 1.8); burst(cx, cy, 20); targetImpacts(0.75); area(0x3ec6ff, .28); } });
      } else {   // Kristal Es: pecahan es mencuat dari tanah, embun beku menyebar
        ring(cx, cy, R * 1.25, 0xcdf3ff, 520); ring(cx, cy, R * .6, 0xffffff, 340); impact(cx, cy, 0x9fdcff, 1.8); burst(cx, cy, 16); targetImpacts(0.8); area(0x9fdcff, .3);
        for (let i = 0; i < 9; i++) {
          const a = i / 9 * 6.283 + rnd(-.3, .3), rr = R * (i % 2 ? .35 : .72), sx = cx + Math.cos(a) * rr, sy = cy + Math.sin(a) * rr * .55 + 8;
          const sh = this.add.image(sx, sy, 'shard').setOrigin(.5, 1).setTint(i % 3 ? 0xbfeaff : 0xffffff).setDepth(855 + sy / 1000).setScale(.3, 0).setRotation(rnd(-.35, .35));
          const k = rnd(.8, 1.5); this.tweens.add({ targets: sh, scaleX: k * .8, scaleY: k, delay: i * 28, duration: 200, ease: 'Back.Out', onComplete: () => fade(sh, 400, 450) });
        }
      }
    } else if (el === 'tanah') {
      if (st === 1) {   // Penggalian Lubang: lubang gelap muncul, tanah & batu terlempar
        const hole = this.add.ellipse(cx, cy + 6, R * 1.6, R * .65, 0x24140a, .92).setDepth(845).setScale(0);
        this.tweens.add({ targets: hole, scale: 1, duration: 160, ease: 'Back.Out' }); fade(hole, 300, 650);
        ring(cx, cy + 6, R * 1.2, 0xc89a5a, 380); impact(cx, cy + 6, 0xd6a56a, 1.5); burst(cx, cy, 18); targetImpacts(.7); area(0xc89a5a, .25);
        for (let i = 0; i < 5; i++) {
          const r = this.add.image(cx, cy, 'rock').setScale(rnd(.35, .6)).setDepth(856);
          this.tweens.add({ targets: r, y: cy - rnd(26, 52), duration: 240, yoyo: true, ease: 'Quad.Out' });
          this.tweens.add({ targets: r, x: cx + rnd(-R, R), angle: rnd(-200, 200), duration: 480, onComplete: () => r.destroy() });
        }
      } else if (st === 2) {   // Menggelinding: batu besar menggelinding di sepanjang lajur sambil berdebu
        const bl = this.add.image(ox, oy + 12, 'rock').setScale(1.5).setDepth(860);
        this.tweens.add({ targets: bl, x: lx, y: 10, angle: 900, duration: 560, ease: 'Quad.In', onUpdate: () => burst(bl.x, bl.y + 12, 1), onComplete: () => { burst(lx, 14, 16); bl.destroy(); } });
        this.time.delayedCall(80 / this.speed, () => { const lane = this.add.rectangle(lx, BASE_Y / 2, sk.w * p.reach * 2, BASE_Y, 0xc89a5a, .16).setDepth(850); fade(lane, 400, 200); });
      } else {   // Gali & Tabrak: tikus berlian menyeruduk lewat tanah; kristal mencuat di sepanjang lajur
        const n = 9;
        for (let i = 0; i < n; i++) {
          const f = i / (n - 1), sx = ox + (lx - ox) * f + rnd(-8, 8), sy = oy + 20 - (oy + 10) * f;
          const sh = this.add.image(sx, sy, 'shard').setOrigin(.5, 1).setTint(i % 3 ? 0xc89a5a : 0xf0d19a).setDepth(855 + sy / 1000).setScale(.3, 0).setRotation(rnd(-.3, .3));
          this.tweens.add({ targets: sh, scaleX: 1, scaleY: rnd(1.1, 1.6), delay: i * 45, duration: 180, ease: 'Back.Out', onStart: () => burst(sx, sy, 5), onComplete: () => fade(sh, 350, 380) });
        }
        this.time.delayedCall(n * 45 / this.speed, () => { ring(lx, 20, sk.w * p.reach * 1.6, 0xd6a56a, 420); impact(lx, 26, 0xd6a56a, 1.8); targetImpacts(0.9); this.cameras.main.shake(100, .004); });
      }
    } else {   // angin
      if (sk.t === 'line') {   // Kepakan Sayap: gelombang angin berbentuk bulan sabit melesat ke atas
        for (let i = 0; i < 3; i++) fly('slash', lx + rnd(-5, 5), BASE_Y - 24, lx, -12, 520, { rot: -Math.PI / 2, sc: Math.max(1, sk.w * p.reach * 2 / 56), tint: 0xe6fbff, delay: i * 110, ease: 'Quad.Out', trail: s => burst(s.x, s.y, 1) });
        this.time.delayedCall(60 / this.speed, () => { const lane = this.add.rectangle(lx, BASE_Y / 2, sk.w * p.reach * 2, BASE_Y, 0xdff6ff, .10).setDepth(850); fade(lane, 350, 100); targetImpacts(.65); });
      } else if (sk.t === 'bolt') {   // Cakaran Terbang: bulu dan sabetan angin menukik ke tiap target
        targets.forEach((t, i) => {
          fly('slash', ox, oy, t.x, t.y, 230 + i * 25, { sc: 1.1, tint: 0xbff0ff, delay: i * 50, done: () => claw(t.x, t.y, 0xcdf3ff, 1.2) });
          for (let k = 0; k < 3; k++) fly('feather', ox, oy, t.x + rnd(-14, 14), t.y + rnd(-14, 14), 300 + rnd(0, 140), { rot: rnd(0, 6.28), tint: 0xeafcff, delay: i * 50 + k * 40, ease: 'Sine.In', spin: rnd(-260, 260) });
        });
      } else {   // Puting Beliung: tornado berputar menyapu area
        ring(cx, cy, R * 1.2, 0xdff8ff, 520); impact(cx, cy, 0xb9f4ff, 1.7); burst(cx, cy, 12); targetImpacts(.75); area(0xaee6ff, .2);
        for (let k = 0; k < 8; k++) {
          const w = 16 + k * 10, y = cy + 26 - k * 15, amp = 4 + k * 1.6;
          const r = this.add.image(cx, y, 'ring').setTint(k % 2 ? 0xffffff : 0xaee6ff).setScale(w / 64, .28).setAlpha(0).setDepth(855 + k * .01);
          this.tweens.add({ targets: r, alpha: .85, duration: 120, delay: k * 25 });
          this.tweens.add({ targets: r, x: { from: cx - amp, to: cx + amp }, duration: 170 + k * 12, yoyo: true, repeat: 3, delay: k * 25, ease: 'Sine.InOut' });
          fade(r, 300, 760 + k * 15);
        }
      }
    }
  }
  skill() {     // Badai Peluru: 4x damage ke semua musuh di layar, cooldown 15 detik
    if (this.over || this.paused || this.choosing || this.skillCd > 0) return;
    this.skillCd = this.skillMax; this.cameras.main.flash(150, 255, 230, 120);
    this.hero.jump();
    [...this.enemies].forEach(e => this.dmgTo(e, this.dmg * 4));
  }
  pop(x, y, txt, color, sz = 16) {
    const t = this.add.text(x, y, txt, TS(sz, color)).setOrigin(.5).setDepth(900);
    this.tweens.add({ targets: t, y: y - 36, alpha: 0, duration: 700, onComplete: () => t.destroy() });
  }
  kill(e) {   // mati: animasi khas tiap monster (hancur, jatuh, meleleh, menguap), lalu sprite dihapus
    e.dead = true;[e.sh, e.bg, e.fg].forEach(o => o.destroy());
    e.s.clearTint(); e.s.setAngle(0).setScale(e.sc); e.s.anims.timeScale = this.speed;
    e.s.play('mon' + e.id + '_die'); e.s.once('animationcomplete', () => e.s.destroy());
  }
  drop(e) { e.dead = true;[e.s, e.sh, e.bg, e.fg].forEach(o => o.destroy()); }
  hit(e, b) {
    b.dead = true; b.s.destroy(); this.dmgTo(e, b.d || this.dmg);
  }
  dmgTo(e, d) {
    if (e.dead) return; const gain = Math.max(0, Math.min(d, e.hp)); e.hp -= d;   // EXP = damage nyata (kelebihan damage tidak dihitung)
    this.pop(e.s.x + Phaser.Math.Between(-12, 12), e.s.y - e.h * .5, d, '#ffffff', 11);
    e.s.setTintFill(0xffffff); this.time.delayedCall(60, () => e.s.active && e.s.clearTint());
    e.fg.width = e.bw * Math.max(0, e.hp / e.mhp); e.hitT = 140; e.py = Math.max(-20, e.py - (e.big ? 1 : 3));   // terpental sedikit
    if (e.hp > 0 && !(e.s.anims.currentAnim && e.s.anims.currentAnim.key.endsWith('_hit'))) e.s.play('mon' + e.id + '_hit').chain('mon' + e.id + '_move');   // sentakan saat kena tembak, lalu lanjut jalan
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
      if (this.reloadT >= RELOAD_MS) { this.reloading = false; this.reloadT = 0; this.ammo = MAG_SIZE; this.hero.endReload(); }
    }
    if (this.toSpawn > 0 && this.spawnT >= Math.max(500, 1400 - this.wave * 70)) { this.spawnT = 0; this.spawn(); }
    this.pets.forEach(p => this.petTick(p, dt));
    this.skillCd = Math.max(0, this.skillCd - dt);
    const sb = $('skillBtn'), st = this.skillCd > 0 ? Math.ceil(this.skillCd / 1000) + 's' : '💥';
    if (sb.textContent !== st) { sb.textContent = st; sb.disabled = this.skillCd > 0; }
    if (!this.reloading && this.shotT >= Math.max(120, 700 / this.rate) / (this.manual ? 2 : 1)) { this.shotT = 0; this.fire(); }
    for (const b of this.bullets) { b.s.x += b.vx * dt; b.s.y += b.vy * dt; }
    for (const e of this.enemies) {
      if (e.dead) continue;
      e.stun = Math.max(0, (e.stun || 0) - dt); e.slow = Math.max(0, (e.slow || 0) - dt); e.hitT = Math.max(0, e.hitT - dt);
      const mv = e.stun > 0 ? 0 : e.slow > 0 ? .4 : 1;
      e.py += e.sp * dt * mv; e.ph += dt * (e.big ? .007 : .012) * mv;
      const s = Math.sin(e.ph), hop = Math.abs(s);   // gerak badan (kaki, sayap, tentakel) sudah ada di frame sprite; di sini hanya jalur melayang
      let x = e.x0, yo, ang;
      if (e.fly) { x += Math.sin(e.ph * .6) * 14; yo = s * e.h * .05; ang = Math.cos(e.ph * .6) * 4; }   // terbang: menyamping dan sedikit miring
      else { x += Math.sin(e.ph * .5) * 4; yo = -hop * e.h * .015; ang = 0; }
      if (e.stun > 0) { x += Phaser.Math.Between(-2, 2); ang = 0; }   // tersetrum: bergetar kaku
      e.s.anims.timeScale = (e.stun > 0 ? 0 : mv * (e.big ? .7 : 1)) * this.speed;   // tersetrum: animasi berhenti; melambat: animasi ikut pelan
      e.s.setPosition(x, e.py + yo).setScale(e.sc).setAngle(ang).setDepth(e.py);
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
    for (const e of this.enemies) {
      if (!e.dead && e.py > BASE_Y) {
        this.baseHp -= e.big ? 30 : 10; this.drop(e);
        this.hero.hurt();
        this.cameras.main.shake(120, .01); this.cameras.main.flash(120, 255, 80, 80); navigator.vibrate && navigator.vibrate(40);
      }
    }
    this.bullets = this.bullets.filter(b => !b.dead); this.enemies = this.enemies.filter(e => !e.dead);
    const r = Math.max(0, this.baseHp / this.baseMax);
    this.hud.clear().fillStyle(0x1b1230, .9).fillRoundedRect(70, 59, 220, 14, 7)
      .fillStyle(r > .35 ? 0x4cd964 : 0xff6b6b).fillRoundedRect(72, 61, Math.max(0, 216 * r), 10, 5);
    const ar = this.reloading ? this.reloadT / RELOAD_MS : this.ammo / MAG_SIZE;
    this.hud.fillStyle(0x1b1230, .9).fillRoundedRect(70, 77, 220, 13, 6)
      .fillStyle(this.reloading ? 0x5ec8ff : 0xffc233).fillRoundedRect(72, 79, Math.max(0, 216 * ar), 9, 4);
    for (let i = 5; i < MAG_SIZE; i += 5) this.hud.fillStyle(0x1b1230, .7).fillRect(72 + 216 * i / MAG_SIZE - .5, 79, 1, 9);
    this.ammoTxt.setText(this.reloading ? 'RELOAD...' : '🔫 ' + this.ammo + '/' + MAG_SIZE);
    this.hpTxt.setText('❤ ' + Math.max(0, this.baseHp)); this.waveTxt.setText(''); this.killTxt.setText('💀 ' + this.kills);
    this.ui();
    if (this.baseHp <= 0) return this.end(false);
    if (this.toSpawn === 0 && this.enemies.length === 0) this.nextWave();
  }
  async end(win) {
    this.over = true; this.banner.setText(win ? 'MENANG!' : 'KALAH').setAlpha(1).setScale(1);
    $('resultTitle').textContent = win ? 'Menang! 🎉' : 'Markas jebol 😵';
    $('resultText').textContent = 'Menyimpan hadiah...'; $('againButton').hidden = true; $('result').hidden = false;
    try {
      const r = await api('/battle/finish', 'POST', { session: this.token, wave: win ? WAVES : Math.max(1, this.wave - 1), kills: this.kills });
      await refreshProfile();
      $('resultText').textContent = 'Kamu mengalahkan ' + this.kills + ' monster dan mendapat ' + r.coins + ' koin.';
    } catch (err) { $('resultText').textContent = err.message; }
    $('againButton').hidden = false;
  }
}

function startGame() {
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
const evoStage = bw => bw >= 8 ? 3 : bw >= 4 ? 2 : 1;   // sama dengan evolusi pet di lobi
const HUB_VIEW = {
  pet() {
    const bw = +profile.progress.best_wave, st = evoStage(bw);
    return `<p class="hint">Tahap evolusi di lobi mengikuti rekor gelombang: tahap 2 di gelombang 4, tahap 3 di gelombang 8. Saat bertempur, evolusi didapat lewat kartu upgrade.</p>` + ELS.map(el => `
      <article class="pcard" style="--c:${hex(EL[el])}"><h4>${ELNAME[el]}</h4>
        <div class="evos">${[1, 2, 3].map(n => `<div class="evo${n > st ? ' lock' : ''}${n === st ? ' cur' : ''}"><img src="assets/pets/${el}${n}.png" alt=""><b>${EVO[el][n - 1]}</b><small>${n > st ? '🔒 Gel. ' + (n === 2 ? 4 : 8) : SK[el][n - 1].n}</small></div>`).join('')}</div>
        <p>${PET_DESC[el][st - 1]}</p></article>`).join('');
  },
  char() {
    const p = profile.progress, bar = (ic, n, v, max) => `<div class="stat"><i>${ic}</i><span>${n}</span><div class="sbar"><i style="width:${Math.min(100, v / max * 100)}%"></i></div><b>${v}</b></div>`;
    return `<article class="ccard"><img src="assets/characters/tois-avatar.png" alt="Tois"><div><h4>Tois</h4><span class="tag">Level ${p.level}</span><p>Penjaga markas yang menembak otomatis dengan gatling.</p></div></article>
      <h5>Statistik</h5><div class="stats">${bar('💥', 'Damage', +p.damage, 1000)}${bar('⚡', 'Kecepatan', +p.fire_rate, 10)}${bar('🛡️', 'HP markas', +p.max_hp, 10000)}</div>
      <h5>Senjata & skill</h5>
      <ul class="shoplist">
        <li><i>🔫</i><span><b>Gatling</b>Magasin ${MAG_SIZE} peluru, reload ${RELOAD_MS / 1000} detik. Tahan layar untuk menembak 2x lebih cepat.</span></li>
        <li><i>💥</i><span><b>Badai Peluru</b>4x damage ke semua musuh di layar. Cooldown 15 detik.</span></li>
        <li><i>⭐</i><span><b>Level</b>Naik setiap kelipatan 3 gelombang yang dicapai.</span></li>
      </ul>`;
  },
  zone() {
    const bw = +profile.progress.best_wave;
    return `<p class="hint">Arena berganti mengikuti gelombang. Rekor kamu: gelombang ${bw}.</p>` + ARENAS.map((n, i) => {
      const from = ARENA_AT[i], to = (ARENA_AT[i + 1] || WAVES + 1) - 1, done = bw >= to, open = bw >= from - 1, boss = Object.keys(BOSS).map(Number).find(w => w >= from && w <= to);
      const mons = [...new Set(POOL[i])].slice(0, 6).map(id => `<img src="assets/monsters/${MON[id].f}.png" alt="${MON[id].n}" title="${MON[id].n}">`).join('');
      return `<article class="zcard${open ? '' : ' lock'}" style="background-image:linear-gradient(90deg,#150d2bee 30%,#150d2b66),url(assets/backgrounds/arena${i + 1}.jpg)">
        <h4>${n}</h4><span class="tag">Gelombang ${from}${to > from ? '–' + to : ''}</span>
        <div class="mons">${mons}</div>
        <small>${boss ? '👑 Bos gelombang ' + boss + ': ' + MON[BOSS[boss]].n : 'Tanpa bos'}</small>
        <em>${done ? '✅ Ditaklukkan' : open ? '⚔️ Terbuka' : '🔒 Selesaikan gelombang ' + (from - 1)}</em></article>`;
    }).join('');
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
  if (HUB_VIEW[key] && profile) $('v-' + key).innerHTML = HUB_VIEW[key]();
  document.querySelectorAll('#hubTabs button').forEach(b => b.classList.toggle('on', b.dataset.k === key));
}
function openHub(key) { $('hub').hidden = false; $('hubBody').scrollTop = 0; renderHub(key); }
$('hubTabs').innerHTML = HUB.map(([k, ic, n]) => `<button data-k="${k}"><i>${ic}</i><span>${n}</span></button>`).join('');
$('hubTabs').onclick = e => { const b = e.target.closest('button'); if (b) { $('hubBody').scrollTop = 0; renderHub(b.dataset.k); } };
$('hubClose').onclick = () => { $('hub').hidden = true; };
$('startBtn').onclick = () => { $('gamePanel').classList.add('battle'); game.scene.stop('Lobby'); game.scene.start('Battle'); };
$('quitBtn').onclick = toLobby; $('lobbyBtn').onclick = toLobby;

class Lobby extends Base {
  constructor() { super('Lobby'); }
  create() {
    this.makeTextures();
    // Latar lobi: gerbang kastil (bos), jembatan, panggung kayu (karakter), lantai batu (tombol). Gambar 720x1280 = 2x kanvas 360x640.
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
    const glow = this.add.image(180, 372, 'glow').setScale(3.4, 1.7).setAlpha(.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(-800);
    this.tweens.add({ targets: glow, alpha: .18, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const FEET = 402, PFEET = 396;                                  // garis pijak di papan panggung
    this.add.image(180, FEET - 3, 'shadow').setScale(1.1).setAlpha(.9);
    const bw = profile ? +profile.progress.best_wave : 0, st = bw >= 8 ? 3 : bw >= 4 ? 2 : 1;   // evolusi mengikuti rekor gelombang
    const PX = [52, 110, 250, 308];
    const pets = ELS.map((el, i) => { this.add.image(PX[i], PFEET - 2, 'shadow').setScale(.7).setAlpha(.8); return this.add.sprite(PX[i], PFEET, 'pet_' + el + st).setOrigin(.5, this.petOrigin('pet_' + el + st)).setScale(.5).play({ key: 'pet_' + el + st + '_idle', startFrame: i * 2 }); });
    this.heroAnim();
    this.add.sprite(180, FEET, 'tois_anim').setOrigin(.5, 1).setScale(118 / TOIS_ANIM.fh).play('tois_idle');   // Tois animasi (GIF), berpijak di panggung
    // bos berdiri di depan gerbang
    const bs = 118 / SPR.mon5.ih, boss = this.add.sprite(180, 176, 'mon5').setScale(bs).play('mon5_move');   // golem lava animasi (langkah, lengan, api)
    this.add.particles(180, 120, 'spark', { x: { min: -48, max: 48 }, speedY: { min: -120, max: -45 }, speedX: { min: -22, max: 22 }, lifespan: 900, scale: { start: 1.5, end: 0 }, tint: [0xff7a2e, 0xffc233, 0xff4d2e], frequency: 38, blendMode: 'ADD' });
    // daun yang melayang dan debu cahaya
    this.add.particles(0, 0, 'leaf', { x: { min: -20, max: W }, y: -10, speedX: { min: 12, max: 38 }, speedY: { min: 20, max: 40 }, rotate: { start: 0, end: 360 }, lifespan: 9000, scale: { start: 1, end: .7 }, alpha: { start: .95, end: .25 }, tint: [0x8fd36a, 0xc8e07a, 0xf2c14e, 0x6fbf5a], frequency: 1400 }).setDepth(900);
    this.add.particles(0, 0, 'spark', { x: { min: 0, max: W }, y: { min: 250, max: 640 }, speedY: { min: -40, max: -15 }, lifespan: 3000, scale: { start: .5, end: 0 }, alpha: { start: .7, end: 0 }, tint: 0xffe3b8, frequency: 160 });
  }
}

// Jika sesi login masih aktif (mis. halaman dimuat ulang), langsung masuk game dan tutup halaman login.
enterGame().catch(() => { $('authPanel').hidden = false; $('gamePanel').hidden = true; });
