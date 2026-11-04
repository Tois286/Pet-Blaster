// Loading, kelas dasar Phaser, pemuatan aset, animasi, dan tekstur.
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
    const sk = skinOf(skinWorn());   // skin Tois yang sedang dipakai (hanya ini yang diunduh)
    if (!this.textures.exists(skinIdleKey(sk))) this.load.spritesheet(skinIdleKey(sk), sk.idle.src, { frameWidth: sk.idle.fw, frameHeight: sk.idle.fh });   // idle Tois (lobi)
    const wo = outfitWorn(); if (wo !== 'base' && !outfitHasSkin(wo) && !this.textures.exists('outfit_' + wo)) this.load.image('outfit_' + wo, outfitImg(wo));   // outfit Tois yang sedang dipakai (hanya yang sudah dibeli)
    if (!this.textures.exists(skinBattleKey(sk))) this.load.spritesheet(skinBattleKey(sk), sk.battle, { frameWidth: BATTLE_SHEET.fw, frameHeight: BATTLE_SHEET.fh });   // sprite tembak Tois (gameplay)
    if (!this.textures.exists('lobby_bg')) this.load.image('lobby_bg', 'assets/backgrounds/lobby.jpg?v=2');
    if (!this.textures.exists('lobby_door')) this.load.image('lobby_door', 'assets/backgrounds/lobby_door.png?v=1');   // potongan pintu kayu jebol (transparan) yang menutupi bos
    // Monster dan pet = sprite sheet animasi (dibuat tools/make_sprites.py; ukuran frame ada di SPR, js/sprites-data.js)
    Object.keys(MON).forEach(i => { const k = 'mon' + i, s = SPR[k]; if (!this.textures.exists(k)) this.load.spritesheet(k, 'assets/' + s.file, { frameWidth: s.fw, frameHeight: s.fh }); });
    Object.values(FUSIONS).forEach(f => {   // aset semua fusion: efek laser + sprite sheet naga / raung
      if (!this.textures.exists(f.laser.key)) this.load.spritesheet(f.laser.key, f.laser.src, { frameWidth: f.laser.fw, frameHeight: f.laser.fh });
      if (!this.textures.exists(f.naga.key)) this.load.spritesheet(f.naga.key, f.naga.src, { frameWidth: f.naga.fw, frameHeight: f.naga.fh });
      const st = f.naga.stomp; if (st && !this.textures.exists(st.key)) this.load.spritesheet(st.key, st.src, { frameWidth: st.fw, frameHeight: st.fh });
      const cr = f.naga.crystals; if (cr && !this.textures.exists(cr.key)) this.load.spritesheet(cr.key, cr.src, { frameWidth: cr.fw, frameHeight: cr.fh });   // peluru kristal angin (8 frame: 0-3 disiapkan, 4-7 melesat)
      const tn = f.naga.tornado; if (tn && !this.textures.exists(tn.key)) this.load.spritesheet(tn.key, tn.src, { frameWidth: tn.fw, frameHeight: tn.fh }); const bz = f.naga.blizzard; if (bz && !this.textures.exists(bz.key)) this.load.spritesheet(bz.key, bz.src, { frameWidth: bz.fw, frameHeight: bz.fh });   // badai salju (24 frame 322x360, 6x4, lihat NAGA_AA)   // tornado hisap (12 frame, 6x2)
      const mt = f.naga.meteor; if (mt && !this.textures.exists(mt.key)) this.load.spritesheet(mt.key, mt.src, { frameWidth: mt.fw, frameHeight: mt.fh });   // meteor: 2x2 frame (jatuh, benturan, ledakan, kawah)   // efek kristal dari tanah (hentakan)
    });
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
    if (!this.textures.exists('fire_crater')) this.load.image('fire_crater', 'assets/pet-actions/fire_crater.webp?v=1');   // kawah lava (api evolusi 3): menggantikan elips hitam di titik ledakan
    if (!this.textures.exists('fire_lava_claw')) this.load.spritesheet('fire_lava_claw', 'assets/pet-actions/fire_lava_claw.png', { frameWidth: 256, frameHeight: 256 });
    // Gambar arena (latar biasa + arena fusion, total beberapa MB) dimuat di sini, bukan saat tombol Mulai Game ditekan: ikut layar pemuatan setelah login, jadi klik Mulai tidak perlu mengunduh apa pun lagi.
    ARENAS.forEach((n, i) => { if (!this.textures.exists('arena' + i)) this.load.image('arena' + i, 'assets/backgrounds/arena' + (i + 1) + '.jpg'); });
    Object.values(FUSIONS).forEach(f => { if (!this.textures.exists(f.zone.key)) this.load.image(f.zone.key, f.zone.src); });   // arena fusion (es + lava / batu + lava)
  }
  // Pasang karakter Tois dengan tinggi tampilan h (piksel game), berpijak di (x, y).
  makeAnims() {   // animasi monster: move (loop), hit (sekali), die (sekali); pet: idle (loop), cast (sekali)
    const A = this.anims, mk = (key, k, start, end, fps, repeat) => { if (!A.exists(key)) A.create({ key, frames: A.generateFrameNumbers(k, { start, end }), frameRate: fps, repeat }); };
    Object.keys(MON).forEach(i => { const k = 'mon' + i, s = SPR[k]; mk(k + '_move', k, 0, s.move - 1, 10, -1); if (s.hit) mk(k + '_hit', k, s.move, s.move + s.hit - 1, 24, 0); mk(k + '_die', k, s.move + s.hit, s.move + s.hit + s.die - 1, 18, 0); if (s.atk) mk(k + '_atk', k, s.move + s.hit + s.die, s.move + s.hit + s.die + s.atk - 1, s.atkFps || 14, 0); });
    ELS.forEach(el => [1, 2, 3].forEach(n => { const k = 'pet_' + el + n, s = SPR[k]; const idleFps = el === 'air' ? 10 : 8; mk(k + '_idle', k, 0, s.idle - 1, idleFps, -1); mk(k + '_cast', k, s.idle, s.idle + s.cast - 1, 16, 0); }));
    Object.values(FUSIONS).forEach(f => { const L = f.laser, N = f.naga; mk(L.a + 'charge', L.key, 0, 8, 18, 0); mk(L.a + 'beam', L.key, 9, 12, 14, -1); mk(L.a + 'fade', L.key, 13, 15, 10, 0); mk(N.anim, N.key, 0, N.frames - 1, N.fps, -1); if (N.crystals) { const C = N.crystals; mk('cry_prep', C.key, 0, 3, 9, 0); mk('cry_hold', C.key, 2, 3, 8, -1); mk('cry_fly', C.key, 4, 7, 18, -1); } if (N.stomp && this.textures.exists(N.stomp.key)) mk(N.stomp.anim, N.stomp.key, 0, 15, N.stomp.fps, 0); else if (N.stomp) console.error('[ASET] sprite kristal tidak termuat:', N.stomp.src); });   // efek Laser Fusion + animasi naga / raung (satu putaran = berdiri, menggeram, kembali berdiri)
    //   // satu putaran = berdiri, menggeram (serangan), kembali berdiri
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