// Kelas Battle: alur pertempuran dan runtime monster, pet, proyektil, fusion, damage, HUD.
class Battle extends Base {
  constructor() { super('Battle'); }

  makeWorld() { this.arena = -1; this.bg = null; this.fusionBg = null; this.setArena(selectedIsland); }
  setArena(i) {   // arena dikunci berdasarkan pulau; semua stage memakai arena pulau tersebut
    if (i === this.arena) return;
    const first = this.arena < 0; this.arena = i; if (this.fusionBg) return;   // arena fusion (es + lava) sedang aktif: latar tidak diganti
    const img = this.add.image(W / 2, H / 2, 'arena' + i).setDisplaySize(W, H).setDepth(-1000);
    if (first) { this.bg = img; return; }
    const old = this.bg; this.bg = img; img.setAlpha(0).setDepth(-999);
    this.tweens.add({ targets: img, alpha: 1, duration: 900, onComplete: () => { old.destroy(); img.setDepth(-1000); } });
    this.pop(W / 2, 250, ARENAS[i], '#ffffff', 22);
  }
  preload() {
    this.load.once('start', showLoading);   // 'start' hanya terjadi bila memang ada aset yang harus diunduh: bila semuanya sudah siap (kasus normal) layar pemuatan tidak berkedip
    super.preload();   // aset arena sudah ikut dimuat di Base.preload
  }

  create() {
    this.over = true; checkFusionAssets(); hideLoading();
    this.makeTextures(); this.makeWorld();
    this.hero = new HeroRig(this, W / 2, 632, 98);   // Tois tampak belakang, tubuh lentur
    this.shells = this.add.particles(0, 0, 'shell', { speedX: { min: 30, max: 90 }, speedY: { min: -110, max: -40 }, gravityY: 420, lifespan: 650, rotate: { start: 0, end: 540 }, alpha: { start: 1, end: 0 }, emitting: false }).setDepth(705);
    this.mflash = this.add.image(0, 0, 'mflash').setOrigin(.08, .5).setDepth(710).setAlpha(0);
    this.pets = ELS.map((el, i) => { const p = this.add.sprite(PET_SLOTS[i], PET_Y, 'pet_' + el + '1').setOrigin(.5, this.petOrigin('pet_' + el + '1')).setScale(petScale(el, 1)).setDepth(699); p.play({ key: 'pet_' + el + '1_idle', startFrame: i * 2 }); p.el = el; p.cd = 1500 + i * 700; p.by = p.y; p.on = false; p.setVisible(false); Object.assign(p, { stage: 1, prog: 0, pow: 1, cdMul: 1, volley: 0, reach: 1, extra: 0 }); p.lbl = this.add.text(p.x, PET_Y + 7, '', TS(9, '#ffffff')).setOrigin(.5).setDepth(702).setVisible(false); return p; });   // pet baru muncul setelah dipilih lewat kartu
    this.nagaSh = this.add.image(NAGA.x, NAGA.y - 2, 'shadow').setScale(2.1, 1.3).setAlpha(.85).setVisible(false);
    this.naga = this.add.sprite(NAGA.x, NAGA.y, 'naga_fusion').setOrigin(.5, NAGA.anchorY).setScale(NAGA.h / NAGA.fh).setVisible(false);   // depth 0 seperti monster dan dibuat lebih dulu: monster yang memukul tembok tampil di depannya
    this.naga.on(Phaser.Animations.Events.SPRITE_ANIMATION_UPDATE, (a, f) => { const n = +f.textureFrame; this.laserFrame(n); if (NAGA.stomp || NAGA.meteor || NAGA.tornado || NAGA.blizzard || NAGA.crystals) { this.stompCheck(n); return; } if (NAGA.fireFrames.includes(n)) this.nagaRoar(); });   // hentakan: terdeteksi saat frame MELEWATI titik hentak, jadi tidak terlewat bila ada frame yang dilompati
    $('skillBtn').onclick = () => this.skill(); $('skillBtn').style.backgroundImage = "url('" + SKILL_ICON + "')";
    this.choosing = false; $('upgrade').hidden = true; $('evo').hidden = true;
    this.events.once('shutdown', () => { this.choosing = false; $('upgrade').hidden = true; $('evo').hidden = true; });
    this.speed = 1; this.paused = false; this.clock = 0; this.tweens.timeScale = 1;
    $('speedBtn').textContent = 'x1'; $('pauseBtn').textContent = '⏸';
    $('speedBtn').onclick = () => { this.speed = this.speed === 1 ? 2 : 1; this.tweens.timeScale = this.speed; $('speedBtn').textContent = 'x' + this.speed; };
    const autoB = $('autoBtn'), autoSync = () => autoB.classList.toggle('on', autoPlay);   // tombol AUTO: nyala = auto play aktif
    autoSync(); autoB.onclick = () => { autoPlay = !autoPlay; try { localStorage.setItem('petblaster-auto', autoPlay ? '1' : '0'); } catch (_) { } autoSync(); say(autoPlay ? 'Auto play aktif' : 'Auto play mati'); if (autoPlay && this.choosing) this.autoPick(this.cardBtns || []); };
    $('pauseBtn').onclick = () => { if (this.choosing) return; this.paused = !this.paused; $('pauseBtn').textContent = this.paused ? '▶' : '⏸'; if (this.paused) { this.tweens.pauseAll(); this.anims.pauseAll(); } else { this.tweens.resumeAll(); this.anims.resumeAll(); } };
    const mk = c => this.add.particles(0, 0, 'spark', { speed: { min: 50, max: 170 }, lifespan: 400, scale: { start: 1, end: 0 }, tint: c, emitting: false }).setDepth(900);
    this.burst = ELS.map(el => mk(EL[el])); this.flash = mk(0xffe27a);
    this.hud = this.add.graphics().setDepth(1000);
    this.hpTxt = this.add.text(W / 2, 45, '', TS(10, '#ffffff')).setOrigin(.5).setDepth(1001);
    this.ammoTxt = this.add.text(W / 2, 62.5, '', TS(9, '#ffffff')).setOrigin(.5).setDepth(1001);
    this.waveTxt = this.add.text(W - 12, 10, '', TS(15, '#ffffff')).setOrigin(1, 0).setDepth(1001);
    this.killTxt = this.add.text(W - 12, 23, '', TS(13, '#ffd34d')).setOrigin(1, .5).setDepth(1001);
    this.banner = this.add.text(W / 2, 230, '', TS(28, '#ffffff')).setAlign('center').setOrigin(.5).setDepth(1001).setAlpha(0);
    this.manual = false;
    this.input.on('pointerdown', () => { this.manual = true; });
    this.input.on('pointerup', () => { this.manual = false; });
    const req = battleReq || api('/battle/start', 'POST', { island: selectedIsland, stage: selectedStage }); battleReq = null;   // permintaan sudah dikirim saat tombol ditekan (startBattle); bila tidak ada (mis. mulai ulang) kirim sekarang
    const snap = resumeSnap; resumeSnap = null;   // ada snapshot = pertempuran terakhir dipulihkan, bukan mulai dari awal
    req.then(r => { this.token = r.session; snap ? this.resume(snap) : this.begin(); })
      .catch(err => { say(err.message); if (snap) { clearBattleSnap(); toLobby(); } });
  }

  begin() {
    const p = profile.progress;
    this.dmg = +p.damage; this.rate = +p.fire_rate; this.baseMax = this.baseHp = +p.max_hp;
    this.wave = 0; this.islandIndex = selectedIsland; this.stageNo = selectedStage; this.kills = 0; this.enemies = []; this.bullets = []; this.spawnT = 0; this.shotT = 0; this.petT = 0; this.skillCd = 0; this.over = false;
    this.magMax = MAG_SIZE; this.ammo = MAG_SIZE; this.reloading = false; this.reloadT = 0; this.hero.reset();
    this.evoQ = []; this.level = 1; this.petsSeen = false; this.xp = 0; this.xpNeed = XP_BASE; this.skillMax = 25000; this.buffT = 0;   // status khusus satu pertempuran
    this.nagaStart();
    this.nextWave();
  }
  resume(s) {   // pulihkan pertempuran terakhir dari snapshot (setelah halaman dimuat ulang); pemain dijeda dulu agar sempat bersiap
    this.baseHp = s.baseHp; this.baseMax = s.baseMax; this.dmg = s.dmg; this.rate = s.rate;
    this.wave = s.wave; this.islandIndex = selectedIsland; this.stageNo = selectedStage; this.kills = s.kills; this.enemies = []; this.bullets = []; this.spawnT = s.spawnT || 0; this.shotT = 0; this.petT = 0; this.skillCd = s.skillCd; this.over = false; this.toSpawn = s.toSpawn;
    this.magMax = s.magMax; this.ammo = s.ammo; this.reloading = false; this.reloadT = 0; this.hero.reset();
    if (s.reloading) { this.reloading = true; this.reloadT = s.reloadT || 0; this.hero.startReload(); }
    this.evoQ = []; this.evoCur = null; this.level = s.level; this.petsSeen = !!s.petsSeen; this.xp = s.xp; this.xpNeed = s.xpNeed; this.skillMax = s.skillMax; this.buffT = s.buffT || 0; this.clock = s.clock || 0;
    this.nagaStart();
    if (s.speed === 2) { this.speed = 2; this.tweens.timeScale = 2; $('speedBtn').textContent = 'x2'; }
    s.pets.forEach(d => {   // pet: tahap evolusi, kartu upgrade, dan slot dipulihkan
      const p = this.pets.find(o => o.el === d.el); if (!p) return;
      Object.assign(p, { stage: d.stage, prog: d.prog, pow: d.pow, cdMul: d.cdMul, volley: d.volley, reach: d.reach, extra: d.extra });
      if (!(d.on || d.fused)) return;
      p.on = true; p.cd = Math.max(500, d.cd || 1000); p.x = d.x;
      p.setOrigin(.5, this.petOrigin('pet_' + p.el + p.stage)).setScale(petScale(p.el, p.stage)).setPosition(d.x, p.by).setVisible(true).setAlpha(1);
      p.play('pet_' + p.el + p.stage + '_idle'); this.petLbl(p);
    });
    s.enemies.filter(d => MON[d.id] && SPR['mon' + d.id]).forEach(d => this.addEnemy(d));
    if (s.nagaId && FUSIONS[s.nagaId] && s.nagaT > 1500 && FUSIONS[s.nagaId].naga.els.every(el => this.pets.find(o => o.el === el).on)) {   // fusion masih aktif saat refresh: naga dipanggil lagi dengan sisa waktu yang sama
      this.fuseNaga(s.nagaId);
      this.time.delayedCall(520, () => { if (this.nagaOn) this.nagaT = s.nagaT; });
    }
    this.ui();
    const evoEls = (s.evo || []).map(el => this.pets.find(o => o.el === el)).filter(Boolean);
    if (evoEls.length) { this.evoQ = evoEls; this.showEvo(this.evoQ.shift()); }
    else if (s.needCards) this.showCards();
    else this.time.delayedCall(s.nagaId ? 1100 : 150, () => { if (!this.over && !this.paused && !this.choosing) $('pauseBtn').click(); });   // jeda otomatis; pemain menekan ▶ untuk lanjut
    say('Pertempuran terakhir dipulihkan' + (this.choosing ? '.' : ' - tekan ▶ untuk lanjut.'));
  }
  snapshot() {   // keadaan pertempuran yang cukup untuk dipulihkan setelah refresh (peluru, proyektil, dan efek sesaat tidak ikut disimpan)
    const pk = ['stage', 'prog', 'pow', 'cdMul', 'volley', 'reach', 'extra'];
    return {
      v: 1, t: Date.now(), island: this.islandIndex, stage: this.stageNo, wave: this.wave, toSpawn: this.toSpawn, spawnT: this.spawnT, kills: this.kills, clock: this.clock,
      baseHp: this.baseHp, baseMax: this.baseMax, dmg: this.dmg, rate: this.rate, magMax: this.magMax, ammo: this.ammo, reloading: this.reloading, reloadT: this.reloadT,
      level: this.level, xp: this.xp, xpNeed: this.xpNeed, skillMax: this.skillMax, skillCd: this.skillCd, buffT: this.buffT, petsSeen: this.petsSeen, speed: this.speed,
      needCards: !!this.choosing && !$('upgrade').hidden, evo: [this.evoCur, ...this.evoQ].filter(Boolean).map(p => p.el),
      nagaId: this.nagaOn ? NAGA.id : null, nagaT: this.nagaT,
      pets: this.pets.map(p => Object.assign({ el: p.el, on: !!p.on, fused: !!p.fused, x: p.fused ? p.fx : p.x, cd: p.cd }, Object.fromEntries(pk.map(k => [k, p[k]])))),
      enemies: this.enemies.filter(e => !e.dead).map(e => ({ id: e.id, big: !!e.big, fin: !!e.fin, x: e.x0, py: e.py, hp: e.hp, mhp: e.mhp, ph: e.ph }))
    };
  }
  showEvo(p) {   // kartu detail setiap evolusi; game berhenti sampai pemain menekan Lanjut
    this.evoCur = p;
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
    if (autoPlay) setTimeout(() => { if (autoPlay && this.choosing && !this.over && !$('evo').hidden) $('evoOk').click(); }, 1600);
    $('evoOk').onclick = () => { $('evo').hidden = true; this.evoCur = null; this.choosing = false; if (!this.paused) { this.tweens.resumeAll(); this.anims.resumeAll(); } this.checkLevel(); };
  }
  hasPet() { return this.pets.some(p => p.on); }
  addPet(el) {   // pet pendukung muncul di slot kosong berikutnya (kiri ke kanan)
    const p = this.pets.find(o => o.el === el), used = this.pets.filter(o => o.on || o.fused).map(o => o.x), n = Math.max(0, PET_SLOTS.findIndex(x => !used.includes(x)));   // slot kosong pertama; slot pet yang sedang melebur dicadangkan agar saat fusion berakhir ia kembali ke posisi aslinya
    p.on = true; p.cd = 1000; p.x = PET_SLOTS[n]; p.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: p, alpha: 1, duration: 300 }); this.flash.emitParticleAt(p.x, p.y - 30, 18); this.petLbl(p);
  }
  xpMul() {   // EXP dinormalkan per pulau: HP monster berlipat dan jumlah monster naik, jadi EXP per damage diperkecil agar laju naik level sama seperti Pulau Terra
    const w = Math.max(1, this.wave), isl = this.islandIndex;
    return monstersPerWave(0, w) / monstersPerWave(isl, w) / Math.pow(DIFF.islandMul, isl) * Math.pow(ISLAND_XP, isl);
  }
  addXp(n) { this.xp += n * this.xpMul() * XP_GAIN; this.checkLevel(); }
  checkLevel() {   // bar penuh -> naik level, target berikutnya x1.2, tampilkan kartu
    if (this.choosing || this.xp < this.xpNeed) return;
    this.xp -= this.xpNeed; this.xpNeed = Math.ceil(this.xpNeed * XP_GROWTH); this.level++;
    this.showCards();
  }
  showCards() {
    const sh = a => Phaser.Utils.Array.Shuffle([...a]);
    const petCards = this.pets.filter(p => !p.on && !p.fused).map(p => ({ img: 'assets/pets/' + p.el + '1.png', n: 'Panggil ' + EVO[p.el][0], d: 'Skill: ' + SK[p.el][0].n, go: b => b.addPet(p.el) }));
    const upCards = this.pets.filter(p => p.on && p.stage < 3).flatMap(p => PET_CARDS.filter(c => c.ok(p)).map(c => ({
      img: 'assets/pets/' + p.el + p.stage + '.png', n: EVO[p.el][p.stage - 1] + ': ' + c.n, d: c.d(p), tag: 'Evolusi ' + (p.prog + 1) + '/' + EVO_NEED[p.stage - 1], go: b => b.petCard(p, c)
    })));
    const stat = UPGRADES.filter(u => u.ok(this));
    let picks = sh([...petCards, ...upCards, ...stat]).slice(0, XP_CARDS);
    if (!this.petsSeen && petCards.length && !picks.some(u => u.img)) picks = sh([petCards[0], ...picks.slice(1)]);   // undian pertama pasti ada kartu pet
    Object.values(FUSIONS).map(f => f.naga).forEach(f => console.log('[KARTU] ' + f.id + ': ' + f.els.map(el => { const p = this.pets.find(o => o.el === el); return el + ' (' + (p.on ? 'aktif' : p.fused ? 'sudah melebur' : 'belum dipanggil') + ', evolusi ' + p.stage + ')'; }).join(' + ') + (this.nagaReady(f) ? ' -> SYARAT TERPENUHI, kartu emas dibagikan' : ' -> belum terpenuhi (' + (this.nagaOn ? 'fusion lain sedang aktif' : 'kedua pet harus aktif dan evolusi 3') + ')')));
    const readyF = Object.values(FUSIONS).map(f => f.naga).filter(f => this.nagaReady(f)), gp = Math.min(1, GOLD_CHANCE + (this.goldMiss || 0) * GOLD_PITY);
    const gold = readyF.filter(f => Math.random() < gp * f.cardChance).map(f => ({ img: f.card, n: f.title, d: f.cardDesc, tag: 'Kartu Emas', gold: 1, go: b => b.fuseNaga(f.id) }));   // satu kartu emas tiap fusion yang syaratnya terpenuhi
    if (readyF.length) this.goldMiss = gold.length ? 0 : (this.goldMiss || 0) + 1;   // kartu emas belum keluar: peluang naik sedikit di level berikutnya
    if (gold.length) picks = sh([...gold, ...picks.slice(0, Math.max(0, XP_CARDS - gold.length))]);   // kartu emas: syarat ke-2 fusion
    this.petsSeen = true;
    const box = $('cards');
    this.choosing = true; this.tweens.pauseAll(); this.anims.pauseAll(); this.manual = false;
    $('upLv').textContent = 'Lv ' + this.level; box.textContent = '';
    this.cardBtns = [];
    picks.forEach(u => {
      const b = document.createElement('button'); b.className = 'ucard'; this.cardBtns.push([u, b]);
      b.innerHTML = (u.img ? `<img src="${u.img}" alt="" onerror="this.onerror=null;this.src='assets/pets/api3.png'">` : `<i>${u.ic}</i>`) + `<b>${u.n}</b><span>${u.d}</span>` + (u.tag ? `<em>${u.tag}</em>` : '');
      if (u.gold) { b.style.cssText = 'background:linear-gradient(160deg,#fff3b0,#ffd34d 45%,#d89a1c);border:2px solid #fff3b0;box-shadow:0 0 16px 4px rgba(255,211,77,.85)'; b.querySelectorAll('b,span,em').forEach(x => x.style.color = '#4a2f00'); }
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
    if (autoPlay) this.autoPick(this.cardBtns);
  }
  autoScore(u) {   // prioritas auto play: kartu emas fusion > pulihkan HP bila kritis > panggil pet > evolusi pet > upgrade Tois
    if (u.gold) return 100;
    const low = this.baseHp / this.baseMax < .5;
    if (u.id === 'heal') return low ? 95 : 30;
    if (u.id === 'hp') return low ? 70 : 45;
    if (u.img && !u.tag) return 85;
    if (u.tag) return 80;
    return { dmg: 60, rate: 58, storm: 55, mag: 50 }[u.id] || 40;
  }
  autoPick(list) {   // pilih kartu terbaik setelah jeda singkat supaya pemain sempat melihat pilihannya
    if (!list.length) return;
    const best = list.reduce((a, c) => this.autoScore(c[0]) > this.autoScore(a[0]) ? c : a);
    setTimeout(() => { if (autoPlay && this.choosing && !this.over && best[1].isConnected) best[1].click(); }, 900);
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
    const difficulty = difficultyOf(this.islandIndex, this.stageNo);
    const x = fin ? Phaser.Math.Between(115, W - 115) : Phaser.Math.Between(44, W - 44), hp = Math.ceil((20 + this.wave * 12) * difficulty * (big ? (fin ? FINAL_BOSS.hp : 7) : m.hp));
    this.addEnemy({ id, big, fin, x, py: -20, hp });
    if (big) for (let i = 0; i < BOSS_ESCORT; i++) {   // bos tidak pernah keluar sendirian: 10 monster biasa muncul bersamanya (tambahan di luar jumlah wave), disebar di belakang/sekitar bos
      const eid = Phaser.Utils.Array.GetRandom(pool), em = MON[eid];
      this.addEnemy({ id: eid, big: false, fin: false, x: Phaser.Math.Between(44, W - 44), py: -20 - (i % 5) * 26 - Phaser.Math.Between(0, 14), hp: Math.ceil((20 + this.wave * 12) * difficulty * em.hp) });
    }
  }
  addEnemy(o) {   // buat satu monster; o.py / o.hp / o.mhp / o.ph dipakai saat memulihkan pertempuran dari snapshot
    const { id, big, fin, x } = o, m = MON[id], py = o.py ?? -20, hp = o.hp, mhp = o.mhp || hp;
    const h = big ? m.h * (fin ? FINAL_BOSS.size : 1.7) : m.h, sc = h / SPR['mon' + id].ih, bw = Math.max(34, h * .7);   // ih = tinggi gambar karakter di dalam frame sprite
    const sh = this.add.image(x, py, 'shadow').setScale(h / 46), s = this.add.sprite(x, py, 'mon' + id).setScale(sc); s.play({ key: 'mon' + id + '_move', startFrame: Phaser.Math.Between(0, 7) });
    const bg = this.add.rectangle(x, py, bw, 5, 0x2b1d4a).setDepth(950);
    const fg = this.add.rectangle(x - bw / 2, py, bw * Math.max(0, Math.min(1, hp / mhp)), 5, 0x6be3a2).setOrigin(0, .5).setDepth(951);
    this.enemies.push({ s, sh, bg, fg, rg: RANGED[id] || null, stopY: RANGED[id] ? BASE_Y - RANGED[id].stop : BASE_Y, hp, mhp, bw, k: m.el, id, h, big: !!big, fin: !!fin, sc, x0: x, py, ph: o.ph ?? Math.random() * 6.283, fly: !!m.fly, hitT: 0, r: h * .42, sp: (.03 + this.wave * .004 + (this.stageNo - 1) * .0015 + this.islandIndex * DIFF.speed) * m.sp * (big ? .6 : 1) });
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
    const f = skinFx(), sp = f.speed || .75, s = this.add.image(mx, my, f.tex).setDepth(600);
    if (f.align) s.setRotation(Math.atan2(dy, dx) + Math.PI / 2);
    let crit = false; if (f.crit && Math.random() < f.crit.p) { crit = true; d = Math.ceil(d * f.crit.m); s.setScale(1.35); }   // peluru kritis (Epic): lebih besar dan lebih sakit
    this.bullets.push({ s, vx: dx / len * sp, vy: dy / len * sp, d, fx: f, tr: 0, pl: f.pierce ? f.pierce.n : 0, crit });
    this.flash.emitParticleAt(mx, my, 4); this.muzzleFx(mx, my, f);
  }
  muzzleFx(x, y, f) {   // kilatan warna skin di moncong
    if (!f.muz) return;
    const o = this.add.image(x, y, 'orb').setTint(f.muz).setScale(.55).setDepth(610).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: o, scale: .08, alpha: 0, duration: 140, onComplete: () => o.destroy() });
  }
  bulletFx(b, dt) {   // putaran + jejak peluru tiap skin
    const f = b.fx; if (!f || !b.s.active) return;
    if (f.spin) b.s.rotation += f.spin * dt / 1000;
    const T = f.trail; if (!T) return;
    b.tr += dt; if (b.tr < T.every) return; b.tr = 0;
    const col = Array.isArray(T.color) ? T.color[Math.floor(Math.random() * T.color.length)] : T.color, j = T.jit || 0;
    const p = this.add.image(b.s.x + (j ? Phaser.Math.Between(-j, j) : 0), b.s.y + 8, T.tex || 'spark').setTint(col).setScale(T.s).setAlpha(T.a || .85).setDepth(590).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: p, alpha: 0, scale: 0, y: p.y + (T.drift || 0), duration: T.life, onComplete: () => p.destroy() });
  }
  impactFx(x, y, f) {   // efek benturan peluru: cincin, cahaya, dan percikan sesuai skin
    const I = f && f.imp; if (!I) return;
    const col = c => Array.isArray(c) ? c[Math.floor(Math.random() * c.length)] : c, add = (k, c, sc) => this.add.image(x, y, k).setTint(c).setScale(sc).setDepth(610).setBlendMode(Phaser.BlendModes.ADD);
    if (I.ring) { const r = add('ring', I.ring, .15); this.tweens.add({ targets: r, scale: I.rs || .6, alpha: 0, duration: 260, onComplete: () => r.destroy() }); }
    if (I.glow) { const o = add('orb', I.glow, .25); this.tweens.add({ targets: o, scale: .9, alpha: 0, duration: 200, onComplete: () => o.destroy() }); }
    const n = I.n || 0, tex = I.tex || 'spark';
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2 + Math.random() * .4, dist = (I.r || 26) * (.6 + Math.random() * .6), p = add(tex, col(I.color), I.s || .5);
      if (tex === 'shard') p.setRotation(a + Math.PI / 2); else if (tex === 'arrow') p.setRotation(a);
      this.tweens.add({ targets: p, x: x + Math.cos(a) * dist, y: y + Math.sin(a) * dist - (I.rise || 0), alpha: 0, scale: (I.s || .5) * .3, duration: I.life || 260, ease: 'Quad.Out', onComplete: () => p.destroy() });
    }
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
  nagaStart() {   // awal pertempuran: naga belum ada (baru muncul lewat kartu emas); pet Api dan Air belum melebur
    this.fusionReset(); useFusion('api+air'); this.nagaOn = false; this.pets.forEach(p => { p.fused = false; }); this.tweens.killTweensOf([this.naga, this.nagaSh]); this.naga.setVisible(false).anims.stop(); this.nagaSh.setVisible(false);
    if (NAGA_TEST === 1 || NAGA_TEST === 3 || NAGA_TEST === 5 || NAGA_TEST === 7 || NAGA_TEST === 9 || NAGA_TEST === 11) (NAGA_TEST === 1 ? ['api', 'air'] : NAGA_TEST === 5 ? ['air', 'tanah'] : NAGA_TEST === 7 ? ['api', 'angin'] : NAGA_TEST === 9 ? ['tanah', 'angin'] : NAGA_TEST === 11 ? ['air', 'angin'] : ['api', 'tanah']).forEach(el => { this.addPet(el); const p = this.pets.find(o => o.el === el); p.stage = 3; p.prog = 0; p.setOrigin(.5, this.petOrigin('pet_' + el + '3')).setScale(petScale(el, 3)); p.play('pet_' + el + '3_idle'); this.petLbl(p); });   // uji: Api + Air langsung evolusi 3
    if (NAGA_TEST === 2 || NAGA_TEST === 4 || NAGA_TEST === 6 || NAGA_TEST === 8 || NAGA_TEST === 10 || NAGA_TEST === 12) { useFusion(NAGA_TEST === 12 ? 'air+angin' : NAGA_TEST === 10 ? 'tanah+angin' : NAGA_TEST === 8 ? 'api+angin' : NAGA_TEST === 6 ? 'air+tanah' : NAGA_TEST === 4 ? 'api+tanah' : 'api+air'); this.time.delayedCall(800, () => this.nagaSummon()); }
  }
  fusionReset() {   // awal pertempuran: arena fusion dan laser dikembalikan ke keadaan awal
    this.fusionBg = null; this.zoneOn = false; this.zoneT = 0; this.nagaLanded = false; this.nagaT = 0;
    this.fusionFxClear();
  }
  fusionFxClear() {   // hapus semua efek skill fusion yang masih ada: laser, tornado, badai salju, peluru kristal, label timer
    if (this.vortex && this.vortex.sp && this.vortex.sp.active) this.vortex.sp.destroy(); this.vortex = null;
    if (this.blizz && this.blizz.sp && this.blizz.sp.active) this.blizz.sp.destroy(); this.blizz = null;
    if (this.cry) this.cry.forEach(c => { if (c && c.active) { c.hover && c.hover.stop(); c.destroy(); } }); this.cry = null;
    this.fusionBar(null);
    const o = this.lz; if (o) [o.gfx, o.charge, o.imp, o.base].forEach(x => x && x.active && x.destroy());
    this.lz = { ph: 'idle', cd: 0, t: 0, tick: 0, target: null, x: 0, y: 0, gfx: null, charge: null, imp: null, base: null };   // ph: idle -> charge -> beam -> idle
  }
  fusionArenaOff() {   // fusion berakhir: damage zona berhenti dan latar es + lava memudar kembali ke arena pulau semula
    this.zoneOn = false; this.zoneT = 0;
    const fb = this.fusionBg; this.fusionBg = null; if (!fb || !fb.active) return;
    this.tweens.killTweensOf(fb);
    if (this.bg !== fb) { this.tweens.add({ targets: fb, alpha: 0, duration: FUSION_ZONE.fade, onComplete: () => fb.destroy() }); return; }   // latar semula belum sempat diganti: cukup pudarkan latar fusion
    const img = this.add.image(W / 2, H / 2, 'arena' + this.arena).setDisplaySize(W, H).setDepth(-999).setAlpha(0);   // arena pulau saat ini (aman bila pulau berganti selama fusion)
    this.tweens.add({ targets: img, alpha: 1, duration: FUSION_ZONE.fade, onComplete: () => { fb.destroy(); img.setDepth(-1000); this.bg = img; } });
  }
  ultBar() {   // bar durasi ultimate (Badai Peluru) di kanan layar, di samping bar fusion: tampil selama buff aktif dan menyusut dari atas ke bawah
    const b = $('ubar'), on = this.buffT > 0; if (!b) return; if (b.hidden === on) b.hidden = !on; if (!on) return;
    $('uFill').style.height = Math.round(this.buffT / SKILL_BUFF_MS * 1000) / 10 + '%'; $('uSec').textContent = Math.ceil(this.buffT / 1000); b.classList.toggle('low', this.buffT <= 3000);
    if (!$('uIc').style.backgroundImage) $('uIc').style.backgroundImage = $('skillBtn').style.backgroundImage;
  }
  fusionBar(r, sec) {   // bar waktu fusion tegak di kanan layar: r = sisa waktu 0..1 (null = sembunyikan), sec = sisa detik; <= 10 detik berubah merah
    const b = $('fbar'); if (!b) return; if (r === null) { b.hidden = true; return; }
    b.hidden = false; $('fFill').style.height = Math.round(r * 1000) / 10 + '%'; $('fSec').textContent = sec; b.classList.toggle('low', sec <= 10);
  }
  nagaEnd() {   // waktu fusion habis (FUSION_TIME): naga hilang, efek dihapus, arena kembali, kedua pet muncul lagi di slot semula
    if (!this.nagaOn) return;
    this.nagaOn = false; this.nagaLanded = false; this.nagaT = 0; console.log('[FUSION] waktu habis:', NAGA.id);
    this.fusionFxClear(); this.fusionArenaOff();
    const n = this.naga; this.tweens.killTweensOf([n, this.nagaSh]); n.anims.resume();
    this.flash.emitParticleAt(NAGA.x, NAGA.y - NAGA.h * .5, 24); this.cameras.main.flash(200, 255, 235, 200);
    this.tweens.add({ targets: [n, this.nagaSh], alpha: 0, duration: 450, onComplete: () => { if (this.nagaOn) return; n.setVisible(false).anims.stop(); this.nagaSh.setVisible(false); } });
    this.pop(W / 2, 250, 'Fusion berakhir', '#ffd0ff', 18);
    this.pets.filter(p => p.fused && NAGA.els.includes(p.el)).forEach(p => {   // pet kembali: posisi, ukuran, level, dan progres evolusi tetap seperti sebelum fusion
      this.tweens.killTweensOf(p); p.fused = false; p.on = true; p.cd = 1000;
      p.setPosition(p.fx, p.by).setScale(p.fsx, p.fsy).setVisible(true).setAlpha(0);
      this.tweens.add({ targets: p, alpha: 1, duration: 400 }); this.flash.emitParticleAt(p.x, p.y - petH(p) * .5, 24); this.burst[ELS.indexOf(p.el)].emitParticleAt(p.x, p.y - petH(p) * .5, 16); this.petLbl(p);
    });
  }
  fusionArenaOn() {   // naga dipanggil: arena berubah jadi es + lava (memudar di atas latar lama) dan damage zona mulai berjalan
    if (this.fusionBg) return;
    if (!this.textures.exists(FUSION_ZONE.key)) { console.warn('[ASET] arena fusion tidak termuat:', FUSION_ZONE.src); this.zoneOn = true; this.zoneT = 0; this.pop(W / 2, 250, FUSION_ZONE.name, '#ffd0ff', 22); return; }   // tanpa gambar: damage zona tetap jalan
    const img = this.add.image(W / 2, H / 2, FUSION_ZONE.key).setDisplaySize(W, H).setDepth(-999).setAlpha(0); this.fusionBg = img;
    this.tweens.add({ targets: img, alpha: 1, duration: FUSION_ZONE.fade, onComplete: () => { if (this.bg && this.bg !== img) this.bg.destroy(); this.bg = img; img.setDepth(-1000); } });
    this.zoneOn = true; this.zoneT = 0;
    this.pop(W / 2, 250, FUSION_ZONE.name, '#ffd0ff', 22);
  }
  tickTo(e, d, color) {   // damage berkala (zona arena fusion dan laser): tanpa sentakan dan tanpa terpental, sama seperti damage terbakar
    if (e.dead) return; const gain = Math.max(0, Math.min(d, e.hp)); e.hp -= d;
    this.pop(e.s.x + Phaser.Math.Between(-12, 12), e.s.y - e.h * .5, d, color, 11);
    e.fg.width = e.bw * Math.max(0, e.hp / e.mhp);
    if (e.hp <= 0) {
      this.kills++; this.burst[e.k].emitParticleAt(e.s.x, e.s.y, e.big ? 26 : 12);
      this.pop(e.s.x, e.s.y - e.h * .55, '+5 🪙', '#ffd34d'); navigator.vibrate && navigator.vibrate(10); this.kill(e);
    }
    this.addXp(gain);
  }
  stompCheck(n) {   // raksasa kristal: hentakan terpicu saat frame animasi melewati NAGA.fireFrames (dipanggil dari event animasi DAN dari fusionTick agar tidak pernah terlewat)
    const pv = this.lastNF; this.lastNF = n;
    if (pv === undefined || pv === n || !(NAGA.stomp || NAGA.meteor || NAGA.tornado || NAGA.blizzard || NAGA.crystals) || !this.nagaOn) return;
    const d = (n - pv + NAGA.frames) % NAGA.frames; if (d > 30) return;   // lompatan jauh (animasi diulang dari frame lain) tidak dihitung
    if (NAGA.crystals && NAGA.crystals.prep.some(q => ((q - pv + NAGA.frames) % NAGA.frames) <= d && ((q - pv + NAGA.frames) % NAGA.frames) > 0)) this.crystalPrep();   // sayap mulai terangkat: peluru disiapkan
    if (NAGA.fireFrames.some(q => ((q - pv + NAGA.frames) % NAGA.frames) <= d && ((q - pv + NAGA.frames) % NAGA.frames) > 0)) this.nagaRoar();
  }
  fusionTick(dt) {
    if (this.nagaOn) {   // hitung mundur fusion (waktu game); habis -> fusion berakhir
      this.nagaT -= dt; const sec = Math.max(0, Math.ceil(this.nagaT / 1000));
      this.nagaSec = sec; this.fusionBar(Math.max(0, this.nagaT / FUSION_TIME), sec);
      if (this.nagaT <= 0) { this.nagaEnd(); return; }
    }
    if ((NAGA.stomp || NAGA.meteor || NAGA.tornado || NAGA.blizzard || NAGA.crystals) && this.nagaOn && this.naga.visible) {
      this.stompCheck(this.laserFrameNo());
      this.stompClk = (this.stompClk || 0) + dt;   // waktu game (berhenti saat pilih kartu); cadangan bila deteksi frame gagal
      if (this.nagaLanded && this.stompClk > NAGA.frames / NAGA.fps * 1300) { console.warn('[HENTAKAN] dipicu oleh timer cadangan (deteksi frame tidak jalan)'); this.nagaRoar(); this.stompClk = 0; }
    }
    if (this.zoneOn) {   // zona es + lava: tiap detik semua monster yang sudah tampil kehilangan FUSION_ZONE.dot HP (waktu ikut kecepatan game)
      this.zoneT += dt;
      while (this.zoneT >= FUSION_ZONE.every) { this.zoneT -= FUSION_ZONE.every; this.enemies.filter(e => !e.dead && e.s.y > 10).forEach(e => this.tickTo(e, FUSION_ZONE.dot, '#ffb36b')); }
    }
    this.vortexTick(dt); this.blizzTick(dt);
    this.laserTick(dt);
  }
  // ---- Tornado Penghisap (Fusion Api + Angin): muncul tepat saat kepakan sayap kuat (NAGA.fireFrames). Semua monster tersedot ke pusat tornado; makin dekat makin kencang (kecepatan = pull[0] + pull[1] x (1 - jarak/range)^2 px per ms). Bos tersedot lebih pelan (bossPull). Monster di dekat pusat terputar dan terkena damage berkala yang makin besar bila makin dekat. Sprite 12 frame: 0-4 tumbuh, 5-7 berputar (diulang), 8-11 memudar.
  nagaTornado() {   // pembungkus: kesalahan tampil di console dan layar
    this.stompClk = 0;
    try { this.nagaTornadoFx(); } catch (err) { console.error('[TORNADO] error:', err); say('Error tornado: ' + (err && err.message)); }
  }
  nagaTornadoFx() {
    const T = NAGA.tornado; if (!T) return;
    if (!this.textures.exists(T.key)) { console.error('[TORNADO] sprite tidak ada:', T.src); return; }
    if (this.vortex && this.vortex.sp && this.vortex.sp.active) this.vortex.sp.destroy();
    const sp = this.add.sprite(T.x, T.y, T.key, 0).setOrigin(.5, T.anchorY).setScale(T.h / T.fh).setDepth(860);
    this.vortex = { sp, x: T.x, y: T.y - T.h * .2, t: 0, dur: T.dur, tick: 0 };   // y = titik hisap (badan tornado, bukan tanah)
    const ox = NAGA.x, oy = NAGA.y - NAGA.h * (NAGA.mouth || .6);
    this.pop(T.x, T.y - T.h - 6, NAGA.roarName, '#ffb36b', 12);
    const ring = (r, color, ms) => { const g = this.add.image(ox, oy, 'ring').setTint(color).setDepth(852).setScale(.15).setAlpha(.95); this.tweens.add({ targets: g, scale: r / 32, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => g.destroy() }); };
    ring(150, NAGA.ring[0], 420); ring(110, NAGA.ring[1], 520);
    this.burst[0].emitParticleAt(ox + 8, oy, 14); this.burst[3].emitParticleAt(ox - 8, oy, 14);
    this.cameras.main.shake(220, .004);
    console.log('[TORNADO] muncul di frame', this.laserFrameNo(), '| monster:', this.enemies.filter(e => !e.dead).length);
  }
  vortexTick(dt) {   // animasi tornado (ikut waktu game: berhenti saat pilih kartu, ikut x2) + damage berkala
    const V = this.vortex, T = NAGA.tornado; if (!V || !T) return;
    V.t += dt;
    if (!V.sp.active) { this.vortex = null; return; }
    const pr = Math.min(1, V.t / V.dur), ez = pr * pr * (3 - 2 * pr);   // gerak pelan: mulai dan berhenti halus
    const gx = T.x + T.drift[0] * ez + Math.sin(V.t * .0016) * T.sway, gy = T.y + T.drift[1] * ez;   // tornado melayang perlahan ke arah monster (drift) + goyang halus (sway)
    V.sp.setPosition(gx, gy); V.x = gx; V.y = gy - T.h * .2;   // titik hisap ikut bergerak
    const G = 450, F = 520, t = V.t;
    let f; if (t < G) f = Math.floor(t / G * 5); else if (t < V.dur - F) f = [5, 6, 7, 6][Math.floor((t - G) / 110) % 4]; else f = 8 + Math.min(3, Math.floor((t - (V.dur - F)) / F * 4));
    V.sp.setFrame(f);
    V.on = t > 80 && t < V.dur - F * .6;   // hisapan aktif dari awal sampai tornado mulai memudar
    V.ramp = Math.min(1, t / G);           // hisapan menguat selagi tornado tumbuh
    if (V.on) {
      V.tick += dt;
      while (V.tick >= T.tick) {
        V.tick -= T.tick;
        this.enemies.forEach(e => {
          if (e.dead) return;
          const d = Math.hypot(e.x0 - V.x, e.py - V.y); if (d > T.radius) return;
          const c = 1 - d / T.radius;   // 0 di tepi radius damage, 1 tepat di pusat
          let dmg = Math.ceil(this.dmg * NAGA.m * T.m * (.4 + 1.6 * c)); try { dmg = Math.ceil(dmg * this.fzMul()); } catch (err) { /* pengali bintang tidak tersedia */ }
          this.tickTo(e, dmg, '#ffb36b');
        });
      }
    }
    if (t >= V.dur) { V.sp.destroy(); this.vortex = null; }
  }
  vortexPull(e, dt) {   // dipanggil tiap monster tiap frame: true = sedang tersedot (jalan maju dan memukul tembok ditahan)
    const V = this.vortex, T = NAGA.tornado; if (!V || !V.on || !T) return false;
    const dx = V.x - e.x0, dy = V.y - e.py, d = Math.hypot(dx, dy), f = Math.max(0, 1 - d / T.range);
    e.atk = false;
    if (d < 34) {   // sudah di pusat: berputar mengelilingi tornado
      const th = Math.atan2(e.py - V.y, e.x0 - V.x) + .012 * dt * (1 + V.ramp), r = Math.max(4, d * .985);
      e.x0 = V.x + Math.cos(th) * r; e.py = V.y + Math.sin(th) * r * .55; return true;
    }
    let spd = (T.pull[0] + T.pull[1] * f * f) * V.ramp * (e.big ? T.bossPull : 1);   // makin dekat makin kuat
    const step = Math.min(spd * dt, d - 30);
    e.x0 += dx / d * step; e.py += dy / d * step;
    e.x0 = Math.max(16, Math.min(W - 16, e.x0));
    return true;
  }
  // ---- Badai Salju (Fusion Air + Angin): muncul tepat saat kepakan sayap kuat (NAGA.fireFrames). Sprite 24 frame: 0-8 tumbuh, 9-15 pusaran penuh (diulang bolak-balik), 16-23 memudar. Semua monster yang tampil di area badai terkena damage berkala (NAGA.blizzard.m), diperlambat, dan yang kena pertama kali (bukan bos) dibekukan sebentar. Waktu ikut game (berhenti saat pilih kartu, ikut x2).
  nagaBlizzard() {   // pembungkus: kesalahan tampil di console dan layar
    this.stompClk = 0;
    try { this.nagaBlizzardFx(); } catch (err) { console.error('[BLIZZARD] error:', err); say('Error blizzard: ' + (err && err.message)); }
  }
  nagaBlizzardFx() {
    const B = NAGA.blizzard; if (!B) return;
    if (!this.textures.exists(B.key)) { console.error('[BLIZZARD] sprite tidak ada:', B.src); return; }
    if (this.blizz && this.blizz.sp && this.blizz.sp.active) this.blizz.sp.destroy();
    const S = B.h / B.fh, SX = B.w / B.fw, sp = this.add.sprite(B.x, B.y, B.key, 0).setOrigin(.5, 1).setScale(SX * B.s0, S * B.s0).setDepth(B.depth).setAlpha(0);   // badai keluar kecil dari kepakan sayap naga (dasar di tengah badan naga), membesar ke atas ke arah monster; depth 690 = di atas monster tapi di bawah pet dan Tois
    this.blizz = { sp, S, SX, t: 0, tick: 0, hit: new Set() };
    const ox = NAGA.x, oy = NAGA.y - NAGA.h * (NAGA.mouth || .7);
    this.pop(W / 2, 230, NAGA.roarName, '#bfefff', 12);
    const ring = (r, color, ms) => { const g = this.add.image(ox, oy, 'ring').setTint(color).setDepth(852).setScale(.15).setAlpha(.95); this.tweens.add({ targets: g, scale: r / 32, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => g.destroy() }); };
    ring(150, NAGA.ring[0], 420); ring(110, NAGA.ring[1], 520);
    this.burst[NAGA.b[0]].emitParticleAt(ox + 8, oy, 14); this.burst[NAGA.b[1]].emitParticleAt(ox - 8, oy, 14);
    this.cameras.main.shake(220, .004);
    console.log('[BLIZZARD] muncul di frame', this.laserFrameNo(), '| monster:', this.enemies.filter(e => !e.dead).length);
  }
  blizzTick(dt) {   // animasi badai + damage berkala + perlambatan
    const V = this.blizz, B = NAGA.blizzard; if (!V || !B) return;
    if (!V.sp.active || this.over) { if (V.sp.active) V.sp.destroy(); this.blizz = null; return; }
    V.t += dt; const t = V.t;
    let f;
    if (t < B.grow) f = Math.min(B.gf - 1, Math.floor(t / B.grow * B.gf));   // tumbuh dari tanah
    else if (t < B.dur - B.fade) f = B.hold[Math.floor((t - B.grow) / B.step) % B.hold.length];   // pusaran penuh
    else f = B.fadeFrom + Math.min(B.fadeN - 1, Math.floor((t - (B.dur - B.fade)) / B.fade * B.fadeN));   // memudar
    V.sp.setFrame(f);
    const k = Math.min(1, t / B.grow), ez = 1 - (1 - k) * (1 - k);   // keluar dari kepakan: kecil -> penuh, melambat di akhir (ikut waktu game)
    V.sp.setScale(V.SX * (B.s0 + (1 - B.s0) * ez), V.S * (B.s0 + (1 - B.s0) * ez)).setAlpha(B.alpha * Math.min(1, t / 160));
    if (t > 150 && t < B.dur - B.fade * .5) {   // aktif dari awal tumbuh sampai mulai memudar
      V.tick += dt;
      while (V.tick >= B.tick) {
        V.tick -= B.tick;
        this.enemies.forEach(e => {
          if (e.dead || e.s.y <= B.top || e.s.y >= B.bot || Math.abs(e.s.x - B.x) > B.rx) return;
          let dmg = Math.ceil(this.dmg * NAGA.m * B.m); try { dmg = Math.ceil(dmg * this.fzMul()); } catch (err) { /* pengali bintang tidak tersedia */ }
          this.tickTo(e, dmg, '#bfefff'); if (e.dead) return;
          e.slow = Math.max(e.slow || 0, B.slow);
          if (!V.hit.has(e)) {   // kena pertama kali: membeku sebentar (bos hanya melambat) dan berwarna es sampai badai selesai
            V.hit.add(e);
            if (!e.big) { e.frz = Math.max(e.frz || 0, B.freeze); e.stun = Math.max(e.stun || 0, B.freeze); }
            this.tintFor(e, NAGA.tint, Math.max(B.slow, B.dur - t));
          }
        });
      }
    }
    if (t >= B.dur) { V.sp.destroy(); this.blizz = null; }
  }
  laserPick() { let t = null; for (const e of this.enemies) if (!e.dead && e.s.y > 10 && (!t || e.s.y > t.s.y)) t = e; return t; }   // musuh paling depan (paling dekat tembok)
  nagaRestart(start = 0) {   // ulang animasi naga dari frame start tanpa lompatan pose: bayangan frame terakhir memudar sebentar di atas pose baru
    const n = this.naga, cfg = { key: NAGA.anim, startFrame: start }; if (!n.visible || !n.frame) { n.play(cfg); return; }
    const g = this.add.sprite(n.x, n.y, NAGA.key, n.frame.name).setOrigin(n.originX, n.originY).setScale(n.scaleX, n.scaleY).setAlpha(n.alpha).setDepth(n.depth);
    n.play(cfg);
    this.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }
  nextFire(n) { return NAGA.fireFrames.reduce((b, f) => ((f - n + NAGA.frames) % NAGA.frames < (b - n + NAGA.frames) % NAGA.frames ? f : b)); }   // titik tembak (frame geraman) terdekat berikutnya
  inCharge(n) { return NAGA.fireFrames.some(f => n >= f - FUSION_LASER.sync && n < f); }   // frame sedang berada di jendela pengisian tenaga
  laserFrameNo() { const cf = this.naga.anims.currentFrame; return cf ? +cf.textureFrame : 0; }   // nomor frame animasi naga saat ini
  laserFx(x, y, frame, anim) {   // sprite efek laser; bila sprite sheet gagal dimuat, laser (sinar) tetap jalan tanpa sprite
    if (!this.textures.exists(FUSION_LASER.key) || !this.anims.exists(anim)) { if (!this.lzWarned) { this.lzWarned = true; console.warn('[LASER] sprite sheet/animasi tidak ada:', FUSION_LASER.src); } return null; }
    return this.add.sprite(x, y, FUSION_LASER.key, frame).setDepth(851).play(anim);
  }
  laserFrame(n) {   // dipanggil tiap frame animasi naga: laser mengikuti gerakan naga (mulut terbuka di NAGA.fireFrames)
    const L = this.lz, F = FUSION_LASER; if (!L || !this.nagaOn || NAGA.noLaser) return;
    if (L.ph === 'wait' && NAGA.fireFrames.includes(n + F.sync)) this.laserCharge();
    else if (L.ph === 'charge' && NAGA.fireFrames.includes(n)) this.laserBeam();
  }
  laserCharge() {   // naga mulai mengumpulkan tenaga (bola es dan api menyatu di mulut)
    const L = this.lz, F = FUSION_LASER, mx = NAGA.x, my = NAGA.y - NAGA.h * (NAGA.mouth || .85);
    if (L.ph !== 'wait') return;
    console.log('[LASER] charge');
    L.ph = 'charge'; L.t = F.charge + 400; L.tick = 0; L.x = mx; L.y = my;   // +400 = cadangan bila frame terlewat
    L.gfx = this.add.graphics().setDepth(850);   // blend normal: ADD tidak terlihat di salju/es yang putih
    L.charge = this.laserFx(mx, my, 0, FUSION_LASER.a + 'charge'); if (L.charge) L.charge.setScale(.45);
    this.pop(mx, NAGA.y - NAGA.h - 4, 'Laser Fusion', '#ffd0ff', 12);
  }
  laserBeam() {   // mulut naga terbuka: sinar keluar dari mulut ke target, naga menahan pose menyembur sampai laser habis
    const L = this.lz, F = FUSION_LASER, mx = NAGA.x, my = NAGA.y - NAGA.h * (NAGA.mouth || .85);
    if (L.ph !== 'charge') return;
    console.log('[LASER] beam');
    if (L.charge) { L.charge.destroy(); L.charge = null; }
    L.ph = 'beam'; L.t = F.dur; L.tick = 0;
    // badan sinar = bagian atas frame (tanpa ledakan di dasar), diputar dan diregangkan dari mulut naga sampai target.
    L.imp = this.laserFx(mx, my, 9, FUSION_LASER.a + 'beam'); if (L.imp) L.imp.setOrigin(.5, F.bodyH / F.fh).setCrop(0, 0, F.fw, F.bodyH).setScale(F.bw, 1).setVisible(false);
    // ledakan di mulut naga = bagian bawah frame yang sama (tidak ikut berputar)
    L.base = this.laserFx(mx, my, 9, FUSION_LASER.a + 'beam'); if (L.base) L.base.setOrigin(.5, F.anchorY).setCrop(0, F.bodyH - 25, F.fw, F.fh - (F.bodyH - 25)).setScale(F.sc).setDepth(852);
    this.naga.anims.pause();
  }
  laserTick(dt) {   // Laser Fusion: menunggu pose naga -> isi tenaga -> menembak 10 detik (target paling depan, pindah saat mati) -> cooldown 7 detik
    const L = this.lz, F = FUSION_LASER; if (!L || !this.nagaOn || !this.nagaLanded || NAGA.noLaser) return;
    const mx = NAGA.x, my = NAGA.y - NAGA.h * (NAGA.mouth || .85);   // titik keluar laser (mulut naga)
    if (L.ph === 'idle') {
      L.cd = Math.max(0, L.cd - dt); if (L.cd > 0 || !this.laserPick()) return;
      L.ph = 'wait'; L.w = 0; L.target = null; L.x = mx; L.y = my;
      console.log('[LASER] siap, frame naga', this.laserFrameNo());
      const n0 = this.laserFrameNo(), f = this.nextFire(n0);
      if ((f - n0 + NAGA.frames) % NAGA.frames > NAGA.lead * 1.5) this.nagaRestart((f - NAGA.lead + NAGA.frames) % NAGA.frames);   // geraman berikutnya masih jauh: lompat ke NAGA.lead frame sebelumnya (dengan bayangan memudar) agar tidak menunggu setengah putaran
      return;
    }
    if (L.ph === 'wait') {   // menunggu naga mencapai frame awal pengisian tenaga (dicek tiap frame game, tidak hanya lewat event); batas tunggu 4 detik
      L.w += dt; const n = this.laserFrameNo();
      if (this.inCharge(n) || L.w > 4000) this.laserCharge();
      return;
    }
    [L.charge, L.imp, L.base].forEach(o => { if (o) o.anims.timeScale = this.speed; });
    if (L.ph === 'charge') {
      L.t -= dt; const n = this.laserFrameNo();
      if (L.t <= 0 || !this.inCharge(n)) this.laserBeam();
      return;
    }
    if (!this.naga.anims.isPaused) this.naga.anims.pause();   // tahan pose menyembur (pause global bisa melanjutkan animasi)
    L.t -= dt;
    if (L.t <= 0) {   // laser habis: sinar hilang, ledakan di mulut memudar, naga melanjutkan animasi, cooldown mulai dihitung
      console.log('[LASER] selesai');
      L.gfx.destroy(); L.gfx = null; if (L.imp) { L.imp.destroy(); L.imp = null; }
      const base = L.base; L.base = null;
      if (base) base.play(FUSION_LASER.a + 'fade').once('animationcomplete', () => base.destroy());
      this.naga.anims.resume(); L.ph = 'idle'; L.cd = F.cd; L.target = null; return;
    }
    if (!L.target || L.target.dead) L.target = this.laserPick();   // target mati -> pindah ke monster paling depan yang baru
    const t = L.target;
    L.gfx.clear();
    if (!t) { if (L.imp) L.imp.setVisible(false); return; }   // tidak ada monster: laser menunggu sampai ada yang muncul (waktu tetap berjalan)
    const k = 1 - Math.exp(-dt / 70), tx = t.s.x, ty = t.s.y - t.h * .4;
    L.x += (tx - L.x) * k; L.y += (ty - L.y) * k;   // ujung laser meluncur ke target (terlihat berpindah saat target baru)
    if (L.imp) { const dx = L.x - mx, dy = L.y - my; L.imp.setVisible(true).setPosition(mx, my).setRotation(Math.atan2(dx, -dy)).setScale(F.bw, Math.max(.2, Math.hypot(dx, dy) / F.bodyH)); }
    this.laserDraw(L, mx, my);
    L.tick += dt;
    while (L.tick >= F.tick) {
      L.tick -= F.tick;
      this.burst[NAGA.b[0]].emitParticleAt(L.x + Phaser.Math.Between(-6, 6), L.y, 2); this.burst[NAGA.b[1]].emitParticleAt(L.x + Phaser.Math.Between(-6, 6), L.y, 2);
      if (L.target && !L.target.dead) this.tickTo(L.target, Math.ceil(this.dmg * F.m * this.fzMul()), NAGA.dc);
    }
  }
  laserDraw(L, mx, my) {   // halo gelap di bawah sinar (kontras di salju) + titik kena di target; bila sprite tidak termuat, sinar digambar penuh dengan garis
    const g = L.gfx, pulse = 1 + .12 * Math.sin(this.clock * .03);
    g.lineStyle(30 * pulse, NAGA.halo, .30); g.beginPath(); g.moveTo(mx, my); g.lineTo(L.x, L.y); g.strokePath();
    if (!L.imp) {
      const dx = L.x - mx, dy = L.y - my, len = Math.hypot(dx, dy) || 1, nx = -dy / len, ny = dx / len, n = Math.max(8, Math.ceil(len / 12)), ph = this.clock * .012, amp = 7;
      const line = (w, col, a, off) => {
        g.lineStyle(w * pulse, col, a); g.beginPath();
        for (let i = 0; i <= n; i++) { const u = i / n, o = off === null ? 0 : Math.sin(u * 14 + ph + off) * amp * Math.min(1, u * 6), x = mx + dx * u + nx * o, y = my + dy * u + ny * o; i ? g.lineTo(x, y) : g.moveTo(x, y); }
        g.strokePath();
      };
      line(20, 0x5fa8ff, .35, null); line(12, 0xffb066, .30, null); line(7, NAGA.c2, 1, 0); line(7, 0xff7a2e, 1, Math.PI); line(6, 0xffffff, 1, null);
    }
    g.fillStyle(0xff7a2e, .28); g.fillCircle(L.x, L.y, 24 * pulse); g.fillStyle(NAGA.c2, .4); g.fillCircle(L.x, L.y, 16 * pulse); g.fillStyle(0xffffff, .95); g.fillCircle(L.x, L.y, 6 * pulse);
  }
  fzMul() { return NAGA.els.reduce((s, el) => s + starMul(el, 3), 0) / NAGA.els.length; }   // rata-rata pengali bintang kedua pet penyusun fusion
  nagaReady(f = NAGA) { return !this.nagaOn && f.els.every(el => { const p = this.pets.find(o => o.el === el); return p.on && p.stage >= 3; }); }   // syarat ke-1: Api dan Air sama-sama evolusi 3
  fuseNaga(id = 'api+air') {   // kartu emas dipilih: kedua pet penyusun melebur (menghilang), naga / raung muncul
    useFusion(id); console.log('[FUSION] dipanggil:', id, '| stomp:', !!NAGA.stomp);
    this.pets.filter(p => NAGA.els.includes(p.el)).forEach(p => {
      p.fx = p.x; p.fsx = p.scaleX; p.fsy = p.scaleY;   // ingat slot dan ukuran asli untuk dikembalikan saat fusion berakhir
      p.on = false; p.fused = true; p.lbl.setVisible(false); this.flash.emitParticleAt(p.x, p.y - petH(p) * .5, 24); this.burst[ELS.indexOf(p.el)].emitParticleAt(p.x, p.y - petH(p) * .5, 16);
      this.tweens.add({ targets: p, alpha: 0, scaleX: p.scaleX * 1.3, scaleY: p.scaleY * 1.3, duration: 450, onComplete: () => p.setVisible(false) });
    });
    this.time.delayedCall(420, () => { if (!this.over) this.nagaSummon(); });
  }
  nagaSummon() {   // naga turun dari atas ke rumput di depan benteng (tengah), lalu menggeram dan menyerang tiap putaran animasi
    this.fusionArenaOn(); this.nagaOn = true; this.nagaT = FUSION_TIME; this.lastNF = undefined; this.stompClk = 0;
    this.nagaSec = Math.ceil(FUSION_TIME / 1000); this.fusionBar(1, this.nagaSec);   // bar waktu fusion di kanan layar muncul penuh console.log('[FUSION] muncul di arena:', NAGA.id);
    this.naga.setTexture(NAGA.key, 0).setOrigin(.5, NAGA.anchorY).setScale(NAGA.h / NAGA.fh); this.nagaSh.setScale(NAGA.shadow[0], NAGA.shadow[1]);   // pakai sprite fusion yang dipanggil
    this.naga.setDepth(NAGA.depth || 0); this.nagaSh.setDepth(NAGA.depth ? NAGA.depth - 1 : 0);   // depth 880 = fusion tampil di atas efek (laser / tornado / meteor / badai, semuanya <= 875) dan monster (depth = y); fusion tanpa depth (Air + Tanah) tetap di lapisan 0 seperti monster
    this.naga.setVisible(true).setPosition(NAGA.x, NAGA.y - 160).setAlpha(0).play(NAGA.anim); this.nagaSh.setVisible(true).setAlpha(0);
    this.cameras.main.flash(260, 255, 235, 200);
    this.tweens.add({ targets: this.naga, y: NAGA.y, alpha: 1, duration: 700, ease: 'Bounce.Out', onComplete: () => { this.nagaLanded = true; this.flash.emitParticleAt(NAGA.x, NAGA.y, 18); this.cameras.main.shake(170, .004); } });
    this.tweens.add({ targets: this.nagaSh, alpha: .85, duration: 700 });
  }
  waitMs(ms, fn) { this.time.delayedCall(ms / this.speed, fn); }   // jeda ikut kecepatan game (x1 / x2)
  crystalAt(x, y, sc, delay) {   // kristal tumbuh dari tanah di titik (x, y): sprite sheet 16 frame, ditahan sebentar lalu memudar
    const S = NAGA.stomp; if (!this.textures.exists(S.key) || !this.anims.exists(S.anim)) { console.error('[HENTAKAN] sprite kristal / animasi tidak ada:', S.src); return; }
    const sp = this.add.sprite(x, y, S.key, 0).setOrigin(.5, S.oy).setScale(sc).setDepth(850).setVisible(false);
    this.waitMs(delay, () => {
      if (this.over) { sp.destroy(); return; }
      sp.setVisible(true).play(S.anim); sp.anims.timeScale = this.speed;
      sp.once('animationcomplete', () => this.tweens.add({ targets: sp, alpha: 0, delay: 450, duration: 350, onComplete: () => sp.destroy() }));
    });
  }
  nagaStomp() {   // pembungkus: apa pun yang error di dalam, kesalahannya tampil di console dan di layar (bukan diam-diam)
    this.stompClk = 0;
    try { this.nagaStompFx(); } catch (err) { console.error('[HENTAKAN] error:', err); say('Error hentakan: ' + (err && err.message)); }
  }
  nagaStompFx() {   // hentakan raksasa kristal (frame NAGA.fireFrames): gempa -> gelombang kristal merambat dari kaki ke tiap musuh -> damage + beku tepat saat kristal meletus (frame S.hit)
    console.log('[HENTAKAN] frame', this.laserFrameNo(), '- musuh tampil:', this.enemies.filter(e => !e.dead && e.s.y > 10).length);
    const S = NAGA.stomp, ox = NAGA.x, oy = NAGA.y; let d = Math.ceil(this.dmg * NAGA.m * .6); try { d = Math.ceil(d * this.fzMul()); } catch (err) { console.warn('[HENTAKAN] pengali bintang gagal dihitung:', err.message); }
    const ring = (r, color, ms) => { const g = this.add.image(ox, oy - 4, 'ring').setTint(color).setDepth(852).setScale(.15, .08).setAlpha(.95); this.tweens.add({ targets: g, scaleX: r / 32, scaleY: r / 80, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => g.destroy() }); };
    this.pop(ox, oy - NAGA.h - 4, NAGA.roarName, '#bfe6ff', 11);
    this.cameras.main.shake(S.quake[0], S.quake[1]);   // gempa
    ring(300, NAGA.ring[1], 520); ring(220, NAGA.ring[0], 420);
    this.burst[2].emitParticleAt(ox - 20, oy - 6, 12); this.burst[2].emitParticleAt(ox + 20, oy - 6, 12); this.burst[1].emitParticleAt(ox, oy - 10, 10);
    this.crystalAt(ox, oy + 2, .5, 0);   // kristal besar di bawah kaki raksasa, muncul bersamaan dengan hentakan
    const lst = this.enemies.filter(e => !e.dead && e.s.y > 10).sort((a, b) => Math.hypot(a.s.x - ox, a.s.y - oy) - Math.hypot(b.s.x - ox, b.s.y - oy));
    lst.forEach(e => {
      const dist = Math.hypot(e.s.x - ox, e.s.y - oy), delay = Math.min(450, 80 + dist * .9);   // gempa merambat: yang dekat kena duluan
      this.crystalAt(e.s.x, e.s.y, Math.max(.2, Math.min(.38, (e.h || 50) / 150)), delay);
      this.waitMs(delay + S.hit, () => {   // damage tepat saat kristal meletus keluar (frame 4 dari 16)
        if (e.dead || this.over) return;
        this.burst[1].emitParticleAt(e.s.x, e.s.y - (e.h || 40) * .4, 6); this.burst[2].emitParticleAt(e.s.x, e.s.y - 4, 6);
        this.dmgTo(e, d); if (e.dead) return;
        e.frz = NAGA.stun; e.stun = NAGA.stun; this.tintFor(e, NAGA.tint, NAGA.stun);   // terkunci kristal sebentar
      });
    });
  }
  nagaMeteor() {   // pembungkus: kesalahan tampil di console dan layar
    this.stompClk = 0;
    try { this.nagaMeteorFx(); } catch (err) { console.error('[METEOR] error:', err); say('Error meteor: ' + (err && err.message)); }
  }
  nagaMeteorFx() {   // raung (frame NAGA.fireFrames): cincin api di mulut -> meteor jatuh dari atas ke tiap monster (yang terdepan dulu) -> ledakan + damage tepat saat meteor menghantam
    const M = NAGA.meteor, ox = NAGA.x, oy = NAGA.y - NAGA.h * (NAGA.mouth || .85);
    console.log('[METEOR] raung, frame', this.laserFrameNo(), '- musuh tampil:', this.enemies.filter(e => !e.dead && e.s.y > 10).length);
    let d = Math.ceil(this.dmg * NAGA.m * .6); try { d = Math.ceil(d * this.fzMul()); } catch (err) { console.warn('[METEOR] pengali bintang gagal dihitung:', err.message); }
    const ring = (r, color, ms) => { const g = this.add.image(ox, oy, 'ring').setTint(color).setDepth(852).setScale(.15).setAlpha(.95); this.tweens.add({ targets: g, scale: r / 32, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => g.destroy() }); };
    this.pop(ox, NAGA.y - NAGA.h - 4, NAGA.roarName, '#ffb36b', 11); ring(150, NAGA.ring[0], 420); ring(110, NAGA.ring[1], 520);
    this.burst[0].emitParticleAt(ox + 8, oy, 14); this.burst[2].emitParticleAt(ox - 8, oy, 14);
    this.cameras.main.shake(260, .005);
    this.enemies.filter(e => !e.dead && e.s.y > 10).sort((a, b) => b.s.y - a.s.y).slice(0, M.max).forEach((e, i) => this.meteorAt(e, 120 + i * M.gap, d));   // yang paling dekat markas kena duluan
  }
  meteorAt(e, delay, d) {   // satu meteor: jatuh dari atas (agak miring) ke posisi monster, ekor api mengarah ke atas
    const M = NAGA.meteor; if (!this.textures.exists(M.key)) { console.error('[METEOR] sprite tidak ada:', M.src); return; }
    const tx = e.s.x, ty = e.s.y, sx = tx + M.dx, sy = -40, dur = Math.min(720, 260 + Math.hypot(sx - tx, ty - sy) * .55);
    const m = this.add.sprite(sx, sy, M.key, 0).setOrigin(.38, .6).setScale(M.sc).setAngle(M.ang).setDepth(853).setVisible(false);
    this.tweens.add({ targets: m, x: tx, y: ty - (e.h || 40) * .25, delay, duration: dur, ease: 'Quad.In', onStart: () => m.setVisible(true), onComplete: () => { m.destroy(); if (!this.over) this.meteorImpact(tx, ty, e, d); } });
  }
  meteorImpact(x, y, e, d) {   // meteor menghantam: kilatan benturan (frame 1) -> ledakan (frame 2) -> kawah lava + kristal (frame 3) memudar pelan; damage + terbakar + terhenti sebentar
    const M = NAGA.meteor, fx = (frame, ox, oy, sc, depth) => this.add.sprite(x, y, M.key, frame).setOrigin(ox, oy).setScale(sc).setDepth(depth);
    const fade = (o, delay, ms) => this.tweens.add({ targets: o, alpha: 0, delay, duration: ms, onComplete: () => o.destroy() });
    fade(fx(3, .5, .68, M.sc, 840), 1100, 500);   // kawah tertinggal
    fade(fx(1, .5, .88, M.sc, 855), 40, 110);   // benturan
    this.waitMs(60, () => { if (this.over) return; const b = fx(2, .47, .76, M.sc * .55, 856); this.tweens.add({ targets: b, scale: M.sc * 1.15, duration: 380, ease: 'Quad.Out' }); fade(b, 120, 300); });
    this.cameras.main.shake(110, .004);
    this.burst[0].emitParticleAt(x, y - 8, 10); this.burst[2].emitParticleAt(x, y - 4, 8);
    this.enemies.forEach(o => {
      if (o.dead || o.s.y <= 10) return;
      const isT = o === e, near = Math.hypot(o.s.x - x, o.s.y - y) <= M.splash; if (!isT && !near) return;
      const dd = isT ? d : Math.ceil(d * .4);   // sasaran langsung 100%, percikan di sekitarnya 40%
      this.dmgTo(o, dd); if (o.dead) return;
      this.ignite(o, dd, NAGA.burn); o.stun = Math.max(o.stun || 0, M.hit); this.tintFor(o, NAGA.tint, M.hit);
    });
  }
  // ---- Peluru Kristal Angin (Fusion Tanah + Angin): sayap terangkat (NAGA.crystals.prep) -> n butir kristal muncul melengkung di atas sayap dan berputar (frame 0-3 sheet) -> kepakan kuat (NAGA.fireFrames) -> semuanya dihempaskan LURUS KE ATAS (frame 4-7), menembus musuh di jalurnya. Tiap peluru melukai tiap musuh sekali: damage = dmg x NAGA.m x .6 x pengali bintang x C.k. spread = lebar sebaran (px), fan = sudut kipas maks (derajat), hit = radius kena, flight = durasi terbang (ms).
  crystalSlots() { const C = NAGA.crystals, n = C.n; return Array.from({ length: n }, (_, i) => { const t = n > 1 ? (i - (n - 1) / 2) / ((n - 1) / 2) : 0; return { t, x: NAGA.x + t * C.spread, y: NAGA.y - NAGA.h * .8 - (1 - t * t) * 26 + (i % 2) * 10 }; }); }
  crystalPrep() {
    const C = NAGA.crystals; if (!C || !this.nagaOn || this.over || !this.textures.exists(C.key)) return;
    if (this.cry && this.cry.length) return;   // sudah siap
    const list = this.cry = [];
    this.crystalSlots().forEach((p, i) => this.waitMs(i * C.stagger, () => {
      if (this.over || !this.nagaOn || this.cry !== list) return;
      const s = this.add.sprite(p.x, p.y, C.key, 0).setOrigin(C.ox, C.oy).setScale(0).setDepth(853); s.t = p.t; s.alpha = 0;
      this.tweens.add({ targets: s, scale: C.sc, alpha: 1, duration: 260, ease: 'Back.Out' });
      s.play('cry_prep'); s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (s.active && !s.flying) s.play('cry_hold'); });
      s.hover = this.tweens.add({ targets: s, y: p.y - 4, duration: 420 + (i % 3) * 80, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      list.push(s);
      this.waitMs(4200, () => { if (s.active && !s.flying) { s.hover && s.hover.stop(); s.destroy(); } });   // cadangan bila tidak pernah dilepas
    }));
  }
  nagaCrystals() {   // pembungkus: kesalahan tampil di console dan layar
    this.stompClk = 0;
    try { this.nagaCrystalsFx(); } catch (err) { console.error('[PELURU] error:', err); say('Error peluru: ' + (err && err.message)); }
  }
  nagaCrystalsFx() {
    const C = NAGA.crystals; if (!this.textures.exists(C.key)) { console.error('[PELURU] sprite tidak ada:', C.src); return; }
    let list = this.cry && this.cry.length ? this.cry : null;
    if (!list) { this.cry = null; this.crystalPrep(); list = this.cry; this.waitMs(C.n * C.stagger + 320, () => this.crystalLaunch(list)); }   // belum sempat disiapkan: siapkan cepat lalu lepas
    else this.crystalLaunch(list);
    this.pop(NAGA.x, NAGA.y - NAGA.h - 4, NAGA.roarName, '#ffe6b0', 11);
  }
  crystalLaunch(list) {
    if (this.over || !list) return; if (this.cry === list) this.cry = null;
    const C = NAGA.crystals; let d = Math.ceil(this.dmg * NAGA.m * .6 * C.k); try { d = Math.ceil(d * this.fzMul()); } catch (err) { console.warn('[PELURU] pengali bintang gagal:', err.message); }
    this.cameras.main.shake(200, .004);
    list.filter(s => s.active).forEach((s, i) => this.waitMs(i * 35, () => {
      if (!s.active || this.over) return; s.flying = true; s.hover && s.hover.stop(); this.tweens.killTweensOf(s);
      const a = (s.t || 0) * C.fan, rad = a * Math.PI / 180, dist = (s.y + 90) / Math.cos(rad), tx = s.x + Math.sin(rad) * dist;
      s.setAngle(a).setScale(C.sc).setAlpha(1).play('cry_fly'); s.hitSet = new Set();
      this.burst[NAGA.b[0]].emitParticleAt(s.x, s.y, 5); this.burst[NAGA.b[1]].emitParticleAt(s.x, s.y, 5);
      this.tweens.add({
        targets: s, x: tx, y: -90, duration: C.flight, ease: 'Quad.In',
        onUpdate: () => {
          if (this.over) return; const hx = s.x + Math.sin(rad) * 18, hy = s.y - Math.cos(rad) * 18;
          this.enemies.forEach(e => { if (e.dead || e.s.y <= 10 || s.hitSet.has(e)) return; if (Math.abs(e.s.x - hx) > C.hit || Math.abs((e.s.y - e.h * .4) - hy) > C.hit + 14) return; s.hitSet.add(e); this.crystalHit(e, d, C); });
        },
        onComplete: () => s.destroy()
      });
    }));
  }
  crystalHit(e, d, C) {
    this.burst[NAGA.b[0]].emitParticleAt(e.s.x - 5, e.s.y - e.h * .4, 6); this.burst[NAGA.b[1]].emitParticleAt(e.s.x + 5, e.s.y - e.h * .4, 6);
    this.dmgTo(e, d); if (e.dead) return;
    e.stun = Math.max(e.stun || 0, C.stun); this.tintFor(e, NAGA.tint, C.stun);
  }
  nagaRoar() {   // geraman naga: napas api + es mengenai semua musuh yang sudah tampil; musuh terbakar dan membeku sebentar
    if (!this.naga.visible || this.over || this.paused || this.choosing) return;
    if (NAGA.crystals) { this.nagaCrystals(); return; }   // griffin tanah & angin: 10 peluru kristal melesat ke atas
    if (NAGA.stomp) { this.nagaStomp(); return; }   // raksasa kristal: hentakan tanah
    if (NAGA.blizzard) { this.nagaBlizzard(); return; }   // naga es & badai: kepakan kuat memanggil badai salju
    if (NAGA.tornado) { this.nagaTornado(); return; }   // phoenix api & angin: kepakan kuat memanggil tornado penghisap
    if (NAGA.meteor) { this.nagaMeteor(); return; }   // raung lava & batu: hujan meteor   // raksasa kristal: hentakan tanah, bukan napas
    const ox = NAGA.x, oy = NAGA.y - NAGA.h * (NAGA.mouth || .85), ring = (r, color, ms) => { const g = this.add.image(ox, oy, 'ring').setTint(color).setDepth(852).setScale(.15).setAlpha(.95); this.tweens.add({ targets: g, scale: r / 32, alpha: 0, duration: ms, ease: 'Quad.Out', onComplete: () => g.destroy() }); };
    this.pop(ox, NAGA.y - NAGA.h - 4, NAGA.roarName, '#ffd0ff', 11); ring(150, NAGA.ring[0], 420); ring(110, NAGA.ring[1], 520);
    this.burst[NAGA.b[0]].emitParticleAt(ox + 8, oy, 14); this.burst[NAGA.b[1]].emitParticleAt(ox - 8, oy, 14);
    const lst = this.enemies.filter(e => !e.dead && e.s.y > 10); if (!lst.length) return;
    const d = Math.ceil(this.dmg * NAGA.m * .6 * this.fzMul());
    lst.forEach(e => {
      this.burst[NAGA.b[0]].emitParticleAt(e.s.x - 6, e.s.y - e.h * .4, 6); this.burst[NAGA.b[1]].emitParticleAt(e.s.x + 6, e.s.y - e.h * .4, 6);
      this.dmgTo(e, d); if (e.dead) return;
      this.ignite(e, d, NAGA.burn); e.frz = NAGA.stun; e.stun = NAGA.stun; this.tintFor(e, NAGA.tint, NAGA.stun);   // terbakar + terkunci es, sama seperti Bola Lava dan Kristal Es evolusi 3
    });
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
  // Kawah lava di titik ledakan Bola Lava (api evolusi 3). Gambar assets/pet-actions/fire_crater.webp (480x358, latar transparan):
  // tanah retak berlava di bagian bawah, asap + api di atasnya. Titik (CR.gx, CR.gy) = pusat tanah di gambar; lebar tanah (CR.gw) disamakan dengan lebar area ledakan.
  // Waktu (ms, ikut kecepatan x1/x2): muncul tepat saat bola menghantam (0 - in), bertahan (hold) selagi cakar lava menyambar dan monster terbakar, lalu memudar (out).
  lavaCrater(cx, cy, R) {
    const CR = { gx: 241, gy: 240, gw: 469, w: 480, h: 358, span: 2.1, in: 160, hold: 1000, out: 450 };
    if (!this.textures.exists('fire_crater')) {   // gambar gagal dimuat: pakai elips gelap seperti semula
      const cr = this.add.ellipse(cx, cy + 6, R * 1.5, R * .6, 0x2b1208, .65).setDepth(840);
      this.tweens.add({ targets: cr, alpha: 0, delay: 350, duration: 500, onComplete: () => cr.destroy() }); return;
    }
    const sc = R * CR.span / CR.gw;   // lebar tanah kawah = span x radius ledakan
    const img = this.add.image(cx, cy + 6, 'fire_crater').setOrigin(CR.gx / CR.w, CR.gy / CR.h).setDepth(840).setScale(sc * .55).setAlpha(0);
    this.tweens.add({ targets: img, scale: sc, alpha: .95, duration: CR.in, ease: 'Back.Out' });   // menghantam: membesar cepat
    this.tweens.add({ targets: img, alpha: 0, delay: CR.in + CR.hold, duration: CR.out, ease: 'Quad.In', onComplete: () => img.destroy() });   // lalu memudar
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
            this.lavaCrater(cx, cy, R); this.cameras.main.shake(90, .004);
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
  get heroDmg() { const base = this.buffT > 0 ? Math.ceil(this.dmg * SKILL_BUFF - 1e-9) : this.dmg; return Math.ceil(base * skinFx().dmgMul - 1e-9); }   // damage peluru Tois (pet tidak ikut terpengaruh)
  skill() {     // Badai Peluru: Tois +10% damage & +10% kecepatan tembak selama 10 detik, cooldown 25 detik (tanpa damage ke musuh)
    if (this.over || this.paused || this.choosing || this.skillCd > 0) return;
    this.skillCd = this.skillMax; this.buffT = SKILL_BUFF_MS;
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
    const f = b.fx, d = b.d || this.dmg, x = b.s.x, y = b.s.y;
    if (f && f.pierce && b.pl > 0) { b.pl--; (b.hitSet = b.hitSet || new Set()).add(e); b.d = Math.ceil(d * f.pierce.m); }   // menembus: lanjut ke musuh berikutnya dengan damage berkurang
    else { b.dead = true; b.s.destroy(); }
    this.dmgTo(e, d, true);
    if (!f) return;
    this.impactFx(x, y, f);
    if (b.crit) this.pop(e.s.x, e.s.y - e.h * .8, 'CRIT!', f.crit.color, 13);
    if (f.burn && !e.dead) this.ignite(e, d, f.burn);   // Legendary: target terbakar
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
    if (!this.over && this.wave >= 1 && time - (this.lastSave || 0) > 2000) { this.lastSave = time; saveBattleSnap(); }   // simpan kondisi terakhir tiap 2 detik (juga saat dijeda)
    if (this.over || this.paused || this.choosing) return;
    dt *= this.speed; this.clock += dt;
    if (!this.enemies.length) this.hero.aimGoal = 0;
    this.hero.update(dt); this.hero.sprite.anims.timeScale = this.speed; this.naga.anims.timeScale = this.speed;
    this.spawnT += dt; this.shotT += dt;
    if (this.reloading) {   // magasin kosong: Tois isi ulang, lalu menembak lagi sampai pertempuran berakhir
      this.reloadT += dt;
      if (this.reloadT >= RELOAD_MS) { this.reloading = false; this.reloadT = 0; this.ammo = this.magMax; this.hero.endReload(); }
    }
    if (this.toSpawn > 0 && this.spawnT >= Math.max(500, 1400 - this.wave * 70)) { this.spawnT = 0; this.spawn(); }
    this.pets.forEach(p => this.petTick(p, dt));
    this.fusionTick(dt);   // damage zona arena fusion + skill Laser Fusion
    this.skillCd = Math.max(0, this.skillCd - dt);
    this.buffT = Math.max(0, this.buffT - dt); this.hero.buffed = this.buffT > 0; this.ultBar();
    if (autoPlay && this.skillCd <= 0 && this.enemies.some(e => !e.dead && e.s.y > 10)) this.skill();   // auto play: ultimate dipakai begitu siap dan ada musuh   // waktu buff ikut kecepatan game (x2)
    const sb = $('skillBtn'), st = this.skillCd > 0 ? Math.ceil(this.skillCd / 1000) + 's' : '';   // siap = tampil gambar ikon dari CSS (.skill), cooldown = hitungan detik
    if (sb.textContent !== st) { sb.textContent = st; sb.disabled = this.skillCd > 0; }
    if (!this.reloading && this.shotT >= Math.max(120, 700 / this.rate) / (this.buffT > 0 ? SKILL_BUFF : 1) / (this.manual ? 2 : 1)) { this.shotT = 0; this.fire(); }
    for (const b of this.bullets) { b.s.x += b.vx * dt; b.s.y += b.vy * dt; this.bulletFx(b, dt); }
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
      const pulled = this.vortexPull(e, dt);   // tornado penghisap: tersedot ke pusat
      if (e.atk && e.py < e.stopY - 2) e.atk = false;
      if (!e.atk && e.chg) { e.chg.destroy(); e.chg = null; }   // terdorong mundur (mis. knockback skill tanah): berhenti memukul dan berjalan maju lagi
      if (!e.atk && !pulled) { e.py += e.sp * dt * mv; if (e.py >= e.stopY) { e.py = e.stopY; e.atk = true; e.atT = 0; e.hitDone = false; } }   // sampai tembok: berhenti dan mulai memukul
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
        if (b.dead || e.dead || (b.hitSet && b.hitSet.has(e))) continue;
        if (Phaser.Math.Distance.Between(b.s.x, b.s.y, e.s.x, e.s.y) < e.r + 8) { this.hit(e, b); break; }
      }
      if (!b.dead && (b.s.y < -20 || b.s.x < -20 || b.s.x > W + 20)) { b.dead = true; b.s.destroy(); }
    }
    this.bullets = this.bullets.filter(b => !b.dead); this.enemies = this.enemies.filter(e => !e.dead);
    const r = Math.max(0, this.baseHp / this.baseMax);
    this.hud.clear().fillStyle(0x1b1230, .9).fillRoundedRect(HX, 38, 220, 14, 7)
      .fillStyle(r > .35 ? 0x4cd964 : 0xff6b6b).fillRoundedRect(HX + 2, 40, Math.max(0, 216 * r), 10, 5);
    const ar = this.reloading ? this.reloadT / RELOAD_MS : this.ammo / this.magMax;
    this.hud.fillStyle(0x1b1230, .9).fillRoundedRect(HX, 56, 220, 13, 6)
      .fillStyle(this.reloading ? 0x5ec8ff : 0xffc233).fillRoundedRect(HX + 2, 58, Math.max(0, 216 * ar), 9, 4);
    for (let i = 5; i < this.magMax; i += 5) this.hud.fillStyle(0x1b1230, .7).fillRect(HX + 2 + 216 * i / this.magMax - .5, 58, 1, 9);
    this.ammoTxt.setText(this.reloading ? 'RELOAD...' : '🔫 ' + this.ammo + '/' + this.magMax);
    this.hpTxt.setText('❤ ' + Math.max(0, this.baseHp)); this.waveTxt.setText(''); this.killTxt.setText('💀 ' + this.kills);
    this.ui();
    if (this.baseHp <= 0) return this.end(false);
    if (this.toSpawn === 0 && this.enemies.length === 0) this.nextWave();
  }
  async end(win) {
    const hpRatio = Math.max(0, this.baseHp) / this.baseMax, stars = win ? calcStars(hpRatio) : 0, hpPct = Math.round(hpRatio * 100);
    this.over = true; clearBattleSnap(); if (win) { saveWorldProgress(); saveStageStars(this.islandIndex, this.stageNo, stars); } this.banner.setText(win ? 'MENANG!' : 'KALAH').setAlpha(1).setScale(1);
    const R = { win, stars, hpPct, kills: this.kills, island: ISLANDS[this.islandIndex].name, stage: this.stageNo };
    showResult(R, true); $('againButton').hidden = true; $('result').hidden = false;   // kotak hasil tampil dulu; hadiah menyusul setelah server membalas
    try {
      const r = await api('/battle/finish', 'POST', { session: this.token, wave: win ? WAVES : Math.min(WAVES, Math.max(1, this.wave - 1)), kills: this.kills, won: !!win });
      if (win && this.stageNo < STAGES_PER_ISLAND) selectedStage = this.stageNo + 1;
      await refreshProfile();
      showResult({ ...R, coins: r.coins, gems: +r.gems || 0, gemClaimed: !!r.gemClaimed });
    } catch (err) { showResult({ ...R, error: err.message }); }
    $('againButton').hidden = false;
  }
}