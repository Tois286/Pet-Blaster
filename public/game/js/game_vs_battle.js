// Pet Blaster - pertempuran mode VS (dimuat setelah game_battle.js dan game_vs.js).
// VsBattle = Battle biasa dengan aturan VS: tanpa server, arena sesuai peran, monster dikirim penyerang lewat kartu.
//  - Penahan: menembaki monster yang datang (alur Battle yang sudah ada).
//  - Penyerang: tiap wave memilih sampai VS_PICKS kartu monster dan mengatur jumlahnya dalam VS_PLAN_SEC detik.
//  - Lawan dikendalikan bot (mode 1 vs Bot): bot penyerang memilih kartu sendiri, bot penahan = auto play.
//  - Benteng hancur = penyerang menang total; bertahan 5 wave = babak berikutnya (peran ditukar); setelah 2 babak: sisa HP terbanyak menang.

// ---- Gaya kartu VS (kartu memakai kelas .ucard yang sama dengan kartu upgrade; hanya tata letak overlay yang ditambah di sini) ----
(function () {
  if (document.getElementById('vsStyle')) return;
  const st = document.createElement('style'); st.id = 'vsStyle';
  st.textContent = `
  .vsplan{position:absolute;inset:0;z-index:20;font-size:3.9cqw;display:flex;align-items:center;justify-content:center;background:rgba(15,8,35,.86);padding:0.657em;box-sizing:border-box;font-family:inherit}
  .vsplan[hidden]{display:none}
  .vsbox{width:100%;max-width:28.928em;max-height:100%;overflow:auto;color:#fff;text-align:center}
  .vsbox header{display:flex;justify-content:space-between;align-items:center;gap:0.526em;font-size:1.183em;margin-bottom:0.263em}
  .vsbox .vst{background:#1b1230;border:0.131em solid #ffd34d;border-radius:0.789em;padding:0.197em 0.657em;font-weight:700;color:#ffd34d}
  .vsbox .vst.low{color:#ff6b6b;border-color:#ff6b6b}
  .vsbox .vsinfo{margin:0.131em 0 0.526em;font-size:0.789em;opacity:.85}
  .vscards{display:grid;grid-template-columns:repeat(3,1fr);gap:0.526em}
  .vscards .ucard.vscard{width:auto;min-width:0;margin:0;cursor:default;display:flex;flex-direction:column;align-items:center;gap:0.197em;padding:0.526em 0.263em}
  .vscards .ucard.vscard.on{outline:0.197em solid #6be3a2;box-shadow:0 0 0.789em 0.131em rgba(107,227,162,.7)}
  .vscards .ucard.vscard.sp{border:0.131em solid #ffd34d}
  .vscards .ucard.vscard img{width:3.682em;height:3.682em;object-fit:contain}
  .vscards .ucard.vscard b{font-size:0.789em}.vscards .ucard.vscard span{font-size:0.657em;line-height:1.25}
  .vsq{display:flex;align-items:center;justify-content:center;gap:0.263em;margin-top:0.263em}
  .vsq button{width:1.972em;height:1.972em;border-radius:50%;border:0.131em solid #2b1d4a;background:#ffd34d;color:#2b1d4a;font-weight:800;font-size:1.183em;line-height:1;padding:0;cursor:pointer}
  .vsq button:disabled{opacity:.35;cursor:default}
  .vsq output{min-width:2.104em;font-size:1.315em;font-weight:800;color:#fff;text-shadow:0 0.131em 0 #2b1d4a}
  .vsmax{margin-top:0.197em;font-size:0.657em;padding:0.131em 0.526em;border-radius:0.657em;border:0.066em solid #6be3a2;background:transparent;color:#6be3a2;cursor:pointer}
  .vsbox footer{display:flex;justify-content:space-between;align-items:center;gap:0.526em;margin-top:0.657em}
  .vscards.pets{grid-template-columns:repeat(2,1fr)}
  .vscards.pets .ucard.vscard{cursor:pointer}
  .vscards.deckpick{grid-template-columns:repeat(4,1fr);gap:.4em}
  .vscards.deckpick .ucard.vscard{cursor:pointer;padding:.4em .15em}
  .vscards.deckpick .ucard.vscard img{width:3.2em;height:3.2em}
  .vscards.deckpick .ucard.vscard b{font-size:.72em}.vscards.deckpick .ucard.vscard span{font-size:.58em}
  .vsbox .vsh{margin:.5em 0 .25em;font-size:.85em;color:#ffd34d;text-align:left}
  .vsrow{display:flex;gap:.4em;align-items:flex-start}
  .vsmain{flex:1;min-width:0}
  .vsmain .vscards{gap:.4em}
  .vsmain .ucard.vscard{padding:.5em .2em}
  .vsmain .vsq{gap:.15em}
  .vsmain .vsq button{width:1.7em;height:1.7em;font-size:1em}
  .vsmain .vsq output{min-width:1.3em;font-size:1.1em}
  .vsdeck{flex:0 0 4.6em;display:flex;flex-direction:column;gap:.35em}
  .vsdeck .ucard.vscard{position:relative;flex:none;width:auto;max-width:none;min-width:0;min-height:0;margin:0;padding:.3em .1em;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:.05em;border:2px solid #ffd34d;border-radius:.7em;animation:none}
  .vsdeck .ucard.vscard img{width:2.6em;height:2.6em;object-fit:contain}
  .vsdeck .ucard.vscard b{font-size:.58em;line-height:1.1;text-align:center}
  .vsdeck .ucard.vscard em{font-size:.5em;margin:0;color:#ffd34d;font-weight:800}
  .vsdeck .ucard.vscard .dkq{font-size:.55em;opacity:.9}
  .vsdeck .ucard.vscard.on{box-shadow:0 0 10px 2px rgba(107,227,162,.7);border-color:#6be3a2}
  .vsdeck .ucard.vscard.sel{outline:3px solid #ffd34d}
  .vsdeck .ucard.vscard.lock{opacity:.45;cursor:default}
  .vsdetail{margin-top:.5em;padding:.4em .5em;border:2px solid #ffd34d;border-radius:.7em;background:#1b1230;display:flex;align-items:center;gap:.5em;text-align:left}
  .vsdetail img{width:2.6em;height:2.6em;object-fit:contain}
  .vsdetail .dtx{flex:1;min-width:0;font-size:.8em;line-height:1.25}
  .vsdetail .dtx b{display:block;color:#ffd34d;font-size:1.05em}
  .vsdetail .vsq{margin:0}
  .vsdetail .vsmax{margin:0}
  .vsbox footer .vssum{font-size:0.855em;text-align:left}
  #gamePanel.vsatk .bxp,#gamePanel.vsatk .sbars,#gamePanel.vsatk #skillBtn,#gamePanel.vsatk #ubar,#gamePanel.vsatk #fbar{display:none!important}
  #gamePanel.vsatk #upgrade,#gamePanel.vsatk #evo{opacity:0!important;pointer-events:none!important}
  .vswait{position:absolute;left:50%;top:38%;transform:translateX(-50%);z-index:19;max-width:86%;padding:.7em 1.1em;border:.131em solid #ffd34d;border-radius:.9em;background:rgba(27,18,48,.92);color:#fff;font-size:3.9cqw;font-weight:700;text-align:center;pointer-events:none;font-family:inherit}
  .vswait[hidden]{display:none}
  `;
  document.head.appendChild(st);
})();

// Ringkasan sifat monster untuk kartu.
function vsMonInfo(id, hp) {
  const m = MON[id], bits = [ELNAME[ELS[m.el]], 'HP ' + hp];
  bits.push(m.sp >= 1.15 ? 'Cepat' : m.sp <= .7 ? 'Lambat' : 'Sedang');
  if (m.fly) bits.push('Terbang'); if (RANGED[id]) bits.push('Jarak jauh');
  return bits.join(' · ');
}

let vsAgainLabel = null;   // teks asli tombol "main lagi" (dipulihkan saat keluar dari VS)
function vsCleanup() {   // dipanggil toLobby: bersihkan sisa pertandingan VS
  vsMatch = null;
  const ag = $('againButton'); if (ag && vsAgainLabel !== null) { ag.textContent = vsAgainLabel; vsAgainLabel = null; }
}

// Kotak hasil VS memakai elemen kotak hasil yang sudah ada.
function showVsResult(o) {
  const card = $('resultCard'); card.classList.toggle('win', !!o.win); card.classList.toggle('lose', !o.win);
  $('resultIcon').textContent = o.icon; $('resultTitle').textContent = o.title; $('resultSub').textContent = o.sub;
  $('resultStars').innerHTML = ''; $('resultFx').textContent = '';
  $('resultStats').innerHTML = (o.tiles || []).map(([ic, lab, val]) => `<div class="rt"><i>${ic}</i><b>${val}</b><span>${lab}</span></div>`).join('');
  const hp = $('resultHp'); hp.hidden = !(o.bars && o.bars.length);
  hp.innerHTML = (o.bars || []).map(([lab, pct, hpv]) => `<div class="rhp-h"><span>❤ ${lab}</span><b>${hpv} (${pct}%)</b></div><div class="rhp-bar"><i style="width:${pct}%"></i></div>`).join('');
  $('resultText').replaceChildren(...(o.notes || []).map(t => { const d = document.createElement('div'); d.textContent = t; return d; }));
  const ag = $('againButton'); if (vsAgainLabel === null) vsAgainLabel = ag.textContent;
  ag.hidden = !o.next; if (o.next) ag.textContent = o.next;
  $('result').hidden = false;
}

class VsBattle extends Battle {
  constructor() { super('VsBattle'); }

  init() {   // dipanggil Phaser sebelum preload/create: peran pemain pada babak ini
    this.role = vsRoleOf(vsMatch); this.botDef = this.role === VS_ROLE.ATTACK; this.vsDeck = null;   // deck elite/bos dipilih ulang tiap babak
  }
  makeWorld() {   // arena panjang (bisa di-scroll). Dibuat juga alias 'arenavs' agar kode arena lama (fusion) tetap berjalan
    const a = vsArenaFor(vsMatch.mode, this.role), tall = this.textures.exists(a.key), key = tall ? a.key : 'arena0';
    if (this.textures.exists('arenavs')) this.textures.remove('arenavs');
    this.textures.addImage('arenavs', this.textures.get(key).getSourceImage());
    this.arena = 'vs'; this.fusionBg = null;
    const src = this.textures.get(key).getSourceImage();
    const bgH = tall ? Math.max(H, Math.round(W * src.height / src.width)) : H;   // tinggi gambar pada lebar layar
    const bot = H + (tall ? VS_VIEW.shift : 0), top = bot - bgH;                   // koordinat dunia: bagian bawah gambar sejajar dengan area benteng
    this.vsBot = bot; this.arenaTop = top; this.topY = bgH > H ? top + VS_VIEW.margin : -20;         // topY = titik muncul monster (tepi atas arena)
    this.bg = this.add.image(W / 2, (top + bot) / 2, key).setDisplaySize(W, bgH).setDepth(-100000);   // depth sangat rendah: monster memakai depth = y (bisa negatif)
    const cam = this.cameras.main;
    if (bgH > H) cam.setBounds(0, top, W, H - top);   // kamera hanya bisa naik ke atas (scrollY dari top sampai 0)
    cam.scrollY = this.role === VS_ROLE.ATTACK ? Math.min(0, top) : 0;   // penyerang mulai di atas arena, penahan mulai di bawah (benteng)
  }
  create() {
    this.prevAuto = autoPlay;
    if (this.botDef) { autoPlay = true; const ab = $('autoBtn'); if (ab) ab.hidden = true; }   // bot menahan = auto play; tombol AUTO disembunyikan
    const gp = $('gamePanel'); if (gp) gp.classList.toggle('vsatk', this.botDef);   // penyerang tidak melihat bar XP/evolusi, bar fusion/ulti, tombol skill, dan kartu pilihan penahan
    this.vsWait = null;
    this.vsLayoutApply();   // BASE_Y dan slot pet dipindah ke arena panjang SEBELUM Battle.create membuat pet
    this.vsFusionPlace();   // posisi naga fusion mengikuti tembok arena VS (nilai asli dikembalikan saat keluar)
    super.create();
    if (this.vsL) { this.hero.y = this.vsL.heroY; this.hero.sprite.setPosition(this.hero.x, this.hero.y); }   // Tois berdiri di jalan kayu benteng
    [this.hud, this.hpTxt, this.ammoTxt, this.waveTxt, this.killTxt, this.banner].forEach(o => o && o.setScrollFactor(0));   // HUD tetap di layar saat arena digulir
    this.vsScrollSetup();
    if (this.botDef) this.vsAtkHud(true);
    console.log('[VS] build vs4'); say('Build VS vs4 (' + VS_ROLE_NAME[this.role] + ')');   // penanda sementara: bila tulisan ini tidak muncul saat babak mulai, file lama yang terpakai (hapus baris ini bila sudah beres)
    this.events.once('shutdown', () => { this.vsAtkHud(false); autoPlay = this.prevAuto; const ab = $('autoBtn'); if (ab) ab.hidden = false; this.vsTeardown(); const g = $('gamePanel'); if (g) g.classList.remove('vsatk'); this.vsWaitNote(false); });
  }
  // ---- Fusion di arena VS ----
  vsFusionPlace() {   // NAGA.y dihitung saat file dimuat dari BASE_Y lama (490); di VS tembok ada di tempat lain, jadi y semua fusion digeser ke tembok VS
    if (!this.vsL) return;
    const all = Object.values(FUSIONS).map(f => f.naga), old = all.map(n => n.y);
    all.forEach(n => { n.y = BASE_Y - 6; });
    this.events.once('shutdown', () => { all.forEach((n, i) => { n.y = old[i]; }); });
  }
  vsFusionBlend(zone) {   // gambar arena fusion versi lembut: diburamkan, tepi atas dan sampingnya memudar supaya menyatu dengan arena VS
    const key = 'vsfz_' + zone.key; if (this.textures.exists(key)) return key;
    const src = this.textures.get(zone.key).getSourceImage(), cw = W, ch = H + 40;
    const cv = this.textures.createCanvas(key, cw, ch), c = cv.getContext();
    const sc = Math.max(cw / src.width, ch / src.height) * 1.08, dw = src.width * sc, dh = src.height * sc;   // sedikit diperbesar agar tepi blur tidak menggelap
    const tmp = document.createElement('canvas'); tmp.width = cw; tmp.height = ch; const t = tmp.getContext('2d');
    t.drawImage(src, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
    const sm = document.createElement('canvas'); sm.width = Math.ceil(cw / 8); sm.height = Math.ceil(ch / 8); const s = sm.getContext('2d');   // blur: perkecil lalu perbesar kembali (jalan di semua browser/HP)
    s.imageSmoothingQuality = 'high'; s.drawImage(tmp, 0, 0, sm.width, sm.height);
    c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(sm, 0, 0, cw, ch);
    c.globalCompositeOperation = 'destination-in';   // tepi atas memudar (arena VS tembus ke atas), lalu tepi kiri dan kanan
    let g = c.createLinearGradient(0, 0, 0, ch); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.35, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,1)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    g = c.createLinearGradient(0, 0, cw, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(.14, 'rgba(0,0,0,1)'); g.addColorStop(.86, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, cw, ch);
    c.globalCompositeOperation = 'source-over'; cv.refresh();
    return key;
  }
  fusionArenaOn() {   // VS: arena VS tidak diganti; arena fusion yang diburamkan ditumpuk di atasnya (depth di bawah monster) dan damage zona tetap berjalan
    if (this.fusionBg) return;
    this.zoneOn = true; this.zoneT = 0; this.pop(W / 2, 250, FUSION_ZONE.name, '#ffd0ff', 22);
    if (!this.textures.exists(FUSION_ZONE.key) || this.vsBot == null) { console.warn('[ASET] arena fusion tidak termuat:', FUSION_ZONE.src); return; }   // tanpa gambar: damage zona tetap jalan
    const key = this.vsFusionBlend(FUSION_ZONE), ch = H + 40, bot = this.vsBot;
    const img = this.add.image(W / 2, bot - ch / 2, key).setDisplaySize(W, ch).setDepth(-99999).setAlpha(0); this.fusionBg = img;   // monster memakai depth = y (bisa sangat negatif), jadi lapisan ini sedikit di atas arena VS (-100000)
    this.tweens.add({ targets: img, alpha: .88, duration: FUSION_ZONE.fade });
  }
  fusionArenaOff() {   // fusion berakhir: lapisan arena fusion memudar, arena VS tetap utuh
    this.zoneOn = false; this.zoneT = 0;
    const fb = this.fusionBg; this.fusionBg = null; if (!fb || !fb.active) return;
    this.tweens.killTweensOf(fb);
    this.tweens.add({ targets: fb, alpha: 0, duration: FUSION_ZONE.fade, onComplete: () => fb.destroy() });
  }
  nagaSummon() {   // bayangan naga ikut posisi VS (di Battle biasa bayangan dibuat sekali di create)
    this.nagaSh.setPosition(NAGA.x, NAGA.y - 2);
    super.nagaSummon();
  }

  // ---- Tata letak VS: tembok, Tois, dan pet disesuaikan dengan gambar arena panjang (angka ada di VS_LAYOUT, game_vs.js) ----
  vsLayoutApply() {
    if (!this.textures.exists(vsArenaFor(vsMatch.mode, this.role).key)) return;   // gambar panjang belum termuat: pakai tata letak lama
    const L = this.vsL = vsLayout(H + VS_VIEW.shift);
    const o = this.vsOrig = { baseY: BASE_Y, petY: PET_Y, slots: PET_SLOTS.slice() };
    BASE_Y = L.wallY; PET_Y = L.petY; L.petX.forEach((x, i) => { PET_SLOTS[i] = x; });
    this.events.once('shutdown', () => { BASE_Y = o.baseY; PET_Y = o.petY; o.slots.forEach((x, i) => { PET_SLOTS[i] = x; }); });   // battle pulau kembali memakai nilai lama
  }
  addEnemy(o) {   // jalur arena panjang jauh lebih panjang: monster dipercepat VS_VIEW.speed
    super.addEnemy(o); const e = this.enemies[this.enemies.length - 1]; if (e && this.arenaTop < 0) e.sp *= VS_VIEW.speed;
    // py = titik tengah badan, kaki = py + 0.42 x tinggi. Monster berhenti saat KAKINYA menyentuh tembok; penyerang jarak jauh berhenti sejauh jangkauannya dari tembok.
    if (e && this.vsL) e.stopY = this.vsL.wallY - e.h * .42 - (e.rg ? e.rg.stop : 0);
  }
  // ---- Pencatat penentu cadangan (dipakai vsJudge saat HP kedua benteng sama) ----
  vsScanReach() {   // hitung tiap monster satu kali begitu ia mulai memukul tembok (atau menembak dari jarak jauh)
    (this.enemies || []).forEach(e => { if (e.atk && !e._vr && !e.dead) { e._vr = 1; this.vsReach++; } });
  }
  update(time, dt) {
    super.update(time, dt);
    if (this.vsL) { this.hero.x = W / 2; this.hero.y = this.vsL.heroY; }   // Tois selalu di tempatnya (tidak ikut berpindah saat fusion / efek lain)
    if (!this.over) this.vsScanReach();
    if (this.botDef) { this.vsAtkHud(true); this.vsWaitNote(!!this.choosing && !this.over); }   // penyerang hanya melihat pemberitahuan saat bot penahan memilih kartu
  }
  vsAtkHud(hide) {   // sembunyikan tampilan penahan dari penyerang lewat style langsung (tidak bergantung pada CSS/cache): tombol ulti, bar ulti, bar fusion, bar XP, dan kartu pilihan
    const hid = [$('skillBtn'), ...document.querySelectorAll('.bxp, .sbars, #ubar, #fbar')].filter(Boolean);
    hid.forEach(n => { n.style.setProperty('display', hide ? 'none' : '', hide ? 'important' : ''); });
    [$('upgrade'), $('evo')].filter(Boolean).forEach(n => { n.style.opacity = hide ? '0' : ''; n.style.pointerEvents = hide ? 'none' : ''; });
  }
  vsWaitNote(on) {   // pemberitahuan "tunggu musuh memilih kartu" untuk penyerang (kartu aslinya disembunyikan lewat CSS, bot tetap memilih otomatis)
    if (on) {
      if (!this.vsWait) { const d = document.createElement('div'); d.className = 'vswait'; d.textContent = '⏳ Tunggu musuh memilih kartu...'; (document.querySelector('.frame') || document.body).appendChild(d); this.vsWait = d; }
    } else if (this.vsWait) { this.vsWait.remove(); this.vsWait = null; }
  }
  kill(e) {   // semua kematian monster lewat sini: catat seberapa jauh ia sempat maju
    if (!e.dead) {
      if (e.atk && !e._vr) { e._vr = 1; this.vsReach++; }
      const span = (e.stopY - this.topY) || 1;
      this.vsDepthSum += Phaser.Math.Clamp((e.py - this.topY) / span, 0, 1); this.vsDepthN++;
    }
    super.kill(e);
  }
  fire() {   // penahan hanya menembak monster yang sudah masuk jangkauan (area layar bawah); monster yang masih jauh di atas arena belum ditembak
    if (!this.enemies.some(e => !e.dead && e.s.y > 10)) return;
    super.fire();
  }

  // ---- Scroll arena: geser dengan jari/mouse (tarik) atau roda mouse; batang di kanan menunjukkan posisi ----
  vsScrollSetup() {
    const cam = this.cameras.main, minY = this.arenaTop, maxY = 0;
    if (!(maxY - minY > 1)) return;   // arena tidak lebih tinggi dari layar: tidak perlu scroll
    const bar = this.add.graphics().setScrollFactor(0).setDepth(1002), TR_Y = 84, TR_H = 440;
    const draw = () => {
      const f = (cam.scrollY - minY) / (maxY - minY), th = Math.max(26, TR_H * H / (H - minY)), ty = TR_Y + (TR_H - th) * f;
      bar.clear().fillStyle(0x1b1230, .45).fillRoundedRect(W - 8, TR_Y, 4, TR_H, 2).fillStyle(0xffd34d, .9).fillRoundedRect(W - 8, ty, 4, th, 2);
    };
    const move = y => { cam.scrollY = Phaser.Math.Clamp(y, minY, maxY); draw(); };
    let drag = null;
    this.input.on('pointerdown', p => { drag = { y: p.y, sy: cam.scrollY, moved: false }; });
    this.input.on('pointermove', p => {
      if (!drag || !p.isDown) return;
      const dy = p.y - drag.y; if (!drag.moved && Math.abs(dy) < 8) return;
      if (!drag.moved) { drag.moved = true; this.manual = false; }   // sedang menggeser layar, bukan menahan tembak
      move(drag.sy - dy);
    });
    this.input.on('pointerup', () => { drag = null; });
    this.input.on('wheel', (p, o, dx, dy) => move(cam.scrollY + dy * .6));
    this.events.once('shutdown', () => { bar.destroy(); });
    draw();
  }
  boot() {   // tanpa server: pertandingan VS tidak menyimpan hadiah (mode uji)
    this.token = 'vs';
    if (this.role === VS_ROLE.DEFEND) { this.vsPickPets(els => { this.vsApplyPets(els); this.begin(); }); return; }   // penahan (kamu) wajib memilih pet dulu, baru babak dimulai
    this.vsApplyPets(Phaser.Utils.Array.Shuffle(ELS.slice()).slice(0, VS_PET_MAX));   // bot yang bertahan: 2 pet diundi diam-diam
    this.vsPickDeck((deck, t0) => {   // penyerang (kamu) memilih elite + bos final selama lawan memilih pet; total tunggu tetap VS_PET_SEC detik, pilihan lawan tidak terlihat
      this.vsDeck = deck; this.vsWaitEnemy(() => this.begin(), VS_PET_SEC - Math.floor((Date.now() - t0) / 1000));
    });
  }
  vsApplyPets(els) {   // hanya pet terpilih yang boleh dipanggil (kartu pet lain disaring di Battle.showCards lewat p.banned)
    this.vsPets = els; this.pets.forEach(p => { p.banned = !els.includes(p.el); });
  }
  vsPickPets(done) {   // layar pilih pet sebelum babak penahan: tepat VS_PET_MAX pet dalam VS_PET_SEC detik
    this.vsTeardown(); const sel = [];
    const box = document.createElement('div'); box.className = 'vsplan'; box.id = 'vsPlan';
    box.innerHTML = `<div class="vsbox"><header><span>🐾 Pilih ${VS_PET_MAX} pet</span><span class="vst">⏱ ${VS_PET_SEC}</span></header>
      <p class="vsinfo">Kamu bertahan di babak ini. Hanya ${VS_PET_MAX} pet yang boleh dibawa; pet lain tidak bisa dipanggil sampai babak selesai. Waktu habis, pet yang kurang diundi otomatis.</p><div class="vscards pets"></div>
      <footer><span class="vssum"></span><button type="button" class="btn main" data-go>⚔️ Mulai Babak</button></footer></div>`;
    (document.querySelector('.frame') || document.body).appendChild(box); this.planBox = box;
    const cards = box.querySelector('.vscards'), sum = box.querySelector('.vssum'), go = box.querySelector('[data-go]'), tmr = box.querySelector('.vst');
    ELS.forEach(el => {
      const c = document.createElement('div'); c.className = 'ucard vscard'; c.dataset.el = el;
      c.innerHTML = `<img src="assets/pets/${el}1.png" alt=""><b>${EVO[el][0]}</b><span>Skill: ${SK[el][0].n}</span>`;
      cards.appendChild(c);
    });
    const refresh = () => {
      cards.querySelectorAll('.vscard').forEach(c => c.classList.toggle('on', sel.includes(c.dataset.el)));
      sum.textContent = 'Dipilih: ' + sel.length + '/' + VS_PET_MAX; go.disabled = sel.length !== VS_PET_MAX;
    };
    const finish = auto => {
      clearInterval(this.planTimer); this.planTimer = null;
      while (sel.length < VS_PET_MAX) sel.push(Phaser.Utils.Array.GetRandom(ELS.filter(x => !sel.includes(x))));   // waktu habis: sisa pilihan diundi
      box.remove(); this.planBox = null; if (auto) say('Waktu habis, pet dipilih otomatis.');
      done(sel.slice());
    };
    cards.onclick = e => {
      const c = e.target.closest('.vscard'); if (!c) return; const el = c.dataset.el, i = sel.indexOf(el);
      if (i >= 0) sel.splice(i, 1); else { sel.push(el); if (sel.length > VS_PET_MAX) sel.shift(); }   // pilihan ke-3 menggantikan pilihan tertua
      refresh();
    };
    go.onclick = () => { if (sel.length === VS_PET_MAX) finish(false); };
    const t0 = Date.now();
    this.planTimer = setInterval(() => {
      const left = Math.max(0, VS_PET_SEC - Math.floor((Date.now() - t0) / 1000));
      tmr.textContent = '⏱ ' + left; tmr.classList.toggle('low', left <= 3);
      if (left <= 0) finish(true);
    }, 250);
    refresh();
  }
  vsPickDeck(done) {   // layar penyerang di awal babak: pilih VS_SPECIAL_PICK jenis (elite / bos final, bebas campuran) dalam VS_PET_SEC detik
    this.vsTeardown(); const t0 = Date.now(), sel = [], need = VS_SPECIAL_PICK, pool = { elite: VS_ELITE_IDS, boss: VS_BOSS_IDS };
    const box = document.createElement('div'); box.className = 'vsplan'; box.id = 'vsPlan';
    box.innerHTML = `<div class="vsbox"><header><span>🗡️ Pilih bos</span><span class="vst">⏱ ${VS_PET_SEC}</span></header>
      <p class="vsinfo">Pilih hanya ${VS_SPECIAL_PICK} jenis dari elite / bos final yang kamu bawa (bebas campuran). Kartunya tersimpan di sudut kiri layar atur serangan dan bisa dikirim ${VS_SPECIAL_FROM > 1 ? 'mulai wave ' + VS_SPECIAL_FROM : 'kapan saja'} (maks ${VS_WAVE_MAX.elite} elite dan ${VS_WAVE_MAX.boss} bos final per wave). Waktu habis, sisa pilihan diundi.</p>
      <h5 class="vsh">Elite</h5><div class="vscards deckpick" data-k="elite"></div>
      <h5 class="vsh">Bos Final</h5><div class="vscards deckpick" data-k="boss"></div>
      <footer><span class="vssum"></span><button type="button" class="btn main" data-go>✔ Siap</button></footer></div>`;
    (document.querySelector('.frame') || document.body).appendChild(box); this.planBox = box;
    const sum = box.querySelector('.vssum'), go = box.querySelector('[data-go]'), tmr = box.querySelector('.vst');
    const trait = id => { const m = MON[id]; return [ELNAME[ELS[m.el]], m.fly ? 'Terbang' : '', RANGED[id] ? 'Jarak jauh' : ''].filter(Boolean).join(' · '); };
    ['elite', 'boss'].forEach(k => {
      const wrap = box.querySelector('[data-k="' + k + '"]');
      pool[k].forEach(id => {
        const c = document.createElement('div'); c.className = 'ucard vscard sp'; c.dataset.id = id; c.dataset.k = k;
        c.innerHTML = `<img src="assets/monsters/${MON[id].f}.png" alt=""><b>${MON[id].n}</b><span>${trait(id)}</span>`;
        wrap.appendChild(c);
      });
    });
    const refresh = () => {
      box.querySelectorAll('.vscard').forEach(c => c.classList.toggle('on', sel.includes(+c.dataset.id)));
      sum.textContent = `Dipilih ${sel.length}/${need} (elite ${sel.filter(i => vsKind(i) === 'elite').length} · bos ${sel.filter(i => vsKind(i) === 'boss').length})`;
      go.disabled = sel.length !== need;
    };
    box.querySelectorAll('.vscards').forEach(w => {
      w.onclick = e => {
        const c = e.target.closest('.vscard'); if (!c) return; const id = +c.dataset.id, i = sel.indexOf(id);
        if (i >= 0) sel.splice(i, 1); else { sel.push(id); if (sel.length > need) sel.shift(); }   // pilihan berlebih menggantikan yang tertua
        refresh();
      };
    });
    const finish = auto => {
      clearInterval(this.planTimer); this.planTimer = null;
      const all = [...pool.elite, ...pool.boss]; while (sel.length < need) sel.push(Phaser.Utils.Array.GetRandom(all.filter(x => !sel.includes(x))));   // waktu habis: sisa pilihan diundi
      box.remove(); this.planBox = null; if (auto) say('Waktu habis, bos dipilih otomatis.');
      done(sel.slice(), t0);
    };
    go.onclick = () => { if (!go.disabled) finish(false); };
    this.planTimer = setInterval(() => {
      const left = Math.max(0, VS_PET_SEC - Math.floor((Date.now() - t0) / 1000));
      tmr.textContent = '⏱ ' + left; tmr.classList.toggle('low', left <= 3);
      if (left <= 0) finish(true);
    }, 250);
    refresh();
  }
  vsWaitEnemy(done, sec = VS_PET_SEC) {   // layar penyerang selama penahan memilih pet: pilihan lawan dirahasiakan; total waktu (memilih bos + menunggu) selalu penuh VS_PET_SEC detik, jadi tidak membocorkan dari lamanya
    if (sec <= 0) { done(); return; }
    this.vsTeardown();
    const box = document.createElement('div'); box.className = 'vsplan'; box.id = 'vsPlan';
    box.innerHTML = `<div class="vsbox"><header><span>⏳ Menunggu musuh</span><span class="vst">⏱ ${sec}</span></header>
      <p class="vsinfo">Lawan sedang memilih ${VS_PET_MAX} pet untuk bertahan. Pilihannya dirahasiakan sampai babak dimulai.</p></div>`;
    (document.querySelector('.frame') || document.body).appendChild(box); this.planBox = box;
    const tmr = box.querySelector('.vst'), t0 = Date.now();
    this.planTimer = setInterval(() => {
      const left = Math.max(0, sec - Math.floor((Date.now() - t0) / 1000));
      tmr.textContent = '⏱ ' + left; tmr.classList.toggle('low', left <= 3);
      if (left <= 0) { clearInterval(this.planTimer); this.planTimer = null; box.remove(); this.planBox = null; done(); }
    }, 250);
  }

  begin() {
    this.vsSt = vsNewAttackState(); this.vsSt.deck = this.vsDeck || vsRandomDeck(); this.queue = []; this._done = false;   // deck pilihanmu; bot penyerang memakai deck acak
    this.vsReach = 0; this.vsDepthSum = 0; this.vsDepthN = 0;   // penentu cadangan: monster yang sampai ke tembok, dan jarak maju monster saat mati (0 = titik muncul, 1 = tembok)
    this.vsTier = vsDefenderTier(worldProgress());   // HP monster mengikuti pulau terakhir penahan (bot menahan = meniru profil pemain)
    super.begin();
    this.islandIndex = 0; this.stageNo = 1;   // kecepatan monster dan damage tembok memakai nilai dasar; hanya HP yang mengikuti pulau penahan
  }
  vsHp(id) {   // HP monster id pada wave ini, setara HP monster di pulau terakhir penahan
    const k = vsKind(id);
    return Math.ceil((20 + this.wave * 12) * this.vsTier.mul * (k === 'normal' ? MON[id].hp : k === 'boss' ? FINAL_BOSS.hp : 7));
  }
  xpMul() {   // HP monster berlipat per pulau, jadi EXP per damage dinormalkan seperti di battle pulau
    const i = this.vsTier.island; return Math.pow(ISLAND_XP, i) / Math.pow(DIFF.islandMul, i);
  }

  // ---- Wave: penyerang mengatur monster, penahan menembak ----
  nextWave() {
    this.wave++;
    if (this.wave > VS_WAVES) return this.finishRound(false);   // semua wave habis dan benteng masih berdiri
    const st = this.vsSt; st.wave = this.wave; vsDrawHand(st);
    if (this.role === VS_ROLE.ATTACK) this.openPlan(); else this.launchWave(vsSendPlan(st, vsBotPlan(st)));
  }
  launchWave(queue) {
    this.queue = queue; this.toSpawn = queue.length; this.spawnT = 99999;   // monster pertama langsung keluar
    const kinds = {}; queue.forEach(id => { kinds[id] = (kinds[id] || 0) + 1; });
    const sum = Object.entries(kinds).map(([id, n]) => n + '× ' + MON[id].n).join(', ');
    const head = (this.wave === 1 ? 'Babak ' + (vsMatch.round + 1) + ' · ' + VS_ROLE_NAME[this.role] + '\nHP monster: ' + ISLANDS[this.vsTier.island].name + ' stage ' + this.vsTier.stage + '\n' : '') + 'Gelombang ' + this.wave + '/' + VS_WAVES;
    this.banner.setText(head + '\n' + (this.role === VS_ROLE.DEFEND ? 'Bot kirim: ' : 'Kamu kirim: ') + queue.length + ' monster').setFontSize(22).setAlpha(1).setScale(.6);
    this.tweens.add({ targets: this.banner, scale: 1, duration: 250, ease: 'Back.Out' });
    this.tweens.add({ targets: this.banner, alpha: 0, delay: 1800, duration: 300 });
    console.log('[VS] wave', this.wave, sum);
  }
  spawn() {
    const id = this.queue.shift(); this.toSpawn--;
    const k = vsKind(id), big = k !== 'normal', fin = k === 'boss', m = MON[id];
    const x = fin ? Phaser.Math.Between(115, W - 115) : Phaser.Math.Between(44, W - 44);
    this.addEnemy({ id, big, fin, x, py: this.topY, hp: this.vsHp(id) });   // muncul di tepi atas arena panjang
  }

  // ---- Kartu penyerang ----
  openPlan() {
    const st = this.vsSt, hand = st.hand.slice(), deck = st.deck.slice(), qty = {};
    let sel = null;   // id kartu elite/bos final yang sedang diatur jumlahnya
    [...hand, ...deck].forEach(id => { qty[id] = 0; });
    this.choosing = true; this.vsTeardown();
    const box = document.createElement('div'); box.className = 'vsplan'; box.id = 'vsPlan';
    box.innerHTML = `<div class="vsbox"><header><span>⚔️ Wave ${st.wave}/${VS_WAVES} · Atur serangan</span><span class="vst">⏱ ${VS_PLAN_SEC}</span></header>
      <p class="vsinfo"></p><div class="vsrow"><div class="vsdeck"></div><div class="vsmain"><div class="vscards"></div></div></div>
      <div class="vsdetail"></div>
      <footer><span class="vssum"></span><button type="button" class="btn main" data-go>🚀 Kirim Wave</button></footer></div>`;
    (document.querySelector('.frame') || document.body).appendChild(box); this.planBox = box;
    const cards = box.querySelector('.vscards'), dk = box.querySelector('.vsdeck'), row = box.querySelector('.vsrow'), det = box.querySelector('.vsdetail'), info = box.querySelector('.vsinfo'), sum = box.querySelector('.vssum'), go = box.querySelector('[data-go]'), tmr = box.querySelector('.vst');
    const plan = () => [...hand, ...deck].filter(id => qty[id] > 0).map(id => ({ id, qty: qty[id] }));
    const left = id => vsKind(id) === 'boss' ? st.bossLeft : st.eliteLeft;
    hand.forEach(id => {
      const c = document.createElement('div'); c.className = 'ucard vscard'; c.dataset.id = id;
      c.innerHTML = `<img src="assets/monsters/${MON[id].f}.png" alt=""><b>${MON[id].n}</b><span>${vsMonInfo(id, this.vsHp(id))}</span>
        <div class="vsq"><button type="button" data-d="-1" aria-label="Kurangi">−</button><output>0</output><button type="button" data-d="1" aria-label="Tambah">+</button></div>
        <button type="button" class="vsmax" data-max>Maks</button>`;
      cards.appendChild(c);
    });
    deck.forEach(id => {   // kartu elite/bos final pilihanmu: kolom kiri; klik kartu lalu atur jumlahnya di panel bawah
      const c = document.createElement('div'); c.className = 'ucard vscard sp dk'; c.dataset.id = id;
      c.innerHTML = `<img src="assets/monsters/${MON[id].f}.png" alt=""><b>${MON[id].n}</b><em>${vsKind(id) === 'boss' ? 'BOS FINAL' : 'ELITE'}</em><small class="dkq"></small>`;
      dk.appendChild(c);
    });
    const refresh = () => {
      const p = plan(), total = vsSum(p), picked = p.filter(x => vsKind(x.id) === 'normal').length;
      info.textContent = `HP monster setara ${ISLANDS[this.vsTier.island].name} stage ${this.vsTier.stage} · Sisa ${st.left} monster (elite ${st.eliteLeft}, bos final ${st.bossLeft}) · Batas wave ini ${vsWaveCap(st)}`;
      sum.textContent = `Dipilih: ${total} monster`;
      go.disabled = total < 1;
      box.querySelectorAll('.vscard').forEach(c => {
        const id = +c.dataset.id, r = vsQtyRange(st, id, p), q = qty[id];
        c.classList.toggle('on', q > 0);
        if (c.classList.contains('dk')) {
          c.classList.toggle('sel', sel === id); c.classList.toggle('lock', st.wave < VS_SPECIAL_FROM);
          c.querySelector('.dkq').textContent = st.wave < VS_SPECIAL_FROM ? 'Wave ' + VS_SPECIAL_FROM : q > 0 ? '×' + q + ' dikirim' : 'Sisa ' + left(id);
        } else {
          c.querySelector('output').textContent = q;
          c.querySelector('[data-d="-1"]').disabled = q <= 0;
          c.querySelector('[data-d="1"]').disabled = q >= r.max;
          c.querySelector('[data-max]').disabled = r.max <= q;
        }
      });
      if (sel == null) det.innerHTML = `<span class="dtx">Klik kartu elite / bos final di kiri untuk mengatur jumlah yang dikirim (maks ${VS_WAVE_MAX.elite} elite dan ${VS_WAVE_MAX.boss} bos final per wave).</span>`;
      else {
        const r = vsQtyRange(st, sel, p), q = qty[sel], k = vsKind(sel);
        det.innerHTML = `<img src="assets/monsters/${MON[sel].f}.png" alt=""><span class="dtx"><b>${MON[sel].n}</b>${k === 'boss' ? 'Bos final' : 'Elite'} · sisa ${left(sel)} · maks ${VS_WAVE_MAX[k]} per wave</span>
          <div class="vsq"><button type="button" data-d="-1" aria-label="Kurangi" ${q <= 0 ? 'disabled' : ''}>−</button><output>${q}</output><button type="button" data-d="1" aria-label="Tambah" ${q >= r.max ? 'disabled' : ''}>+</button></div>
          <button type="button" class="vsmax" data-max ${r.max <= q ? 'disabled' : ''}>Maks</button>`;
      }
    };
    const step = (id, b) => {   // ubah jumlah kartu id lewat tombol − / + / Maks
      const r = vsQtyRange(st, id, plan());
      if (b.dataset.max !== undefined) qty[id] = r.max; else qty[id] = Math.max(0, Math.min(r.max, qty[id] + +b.dataset.d));
      refresh();
    };
    row.onclick = e => {
      const c = e.target.closest('.vscard'); if (!c) return; const id = +c.dataset.id, b = e.target.closest('button');
      if (c.classList.contains('dk')) { if (!c.classList.contains('lock')) { sel = sel === id ? null : id; refresh(); } return; }   // klik kartu elite/bos: pilih untuk diatur
      if (b) step(id, b);
    };
    det.onclick = e => { const b = e.target.closest('button'); if (b && sel != null && !b.disabled) step(sel, b); };
    const send = auto => {
      clearInterval(this.planTimer); this.planTimer = null;
      let p = plan(); if (!p.length) p = vsAutoPlan(st);
      box.remove(); this.planBox = null;
      if (auto) say('Waktu habis, monster dikirim otomatis.');
      this.choosing = false; this.launchWave(vsSendPlan(st, p));
    };
    go.onclick = () => send(false);
    const t0 = Date.now();
    this.planTimer = setInterval(() => {
      const left = Math.max(0, VS_PLAN_SEC - Math.floor((Date.now() - t0) / 1000));
      tmr.textContent = '⏱ ' + left; tmr.classList.toggle('low', left <= 10);
      if (left <= 0) send(true);
    }, 250);
    refresh();
  }
  vsTeardown() {
    if (this.planTimer) { clearInterval(this.planTimer); this.planTimer = null; }
    if (this.planBox) { this.planBox.remove(); this.planBox = null; }
    document.querySelectorAll('#vsPlan').forEach(n => n.remove());
  }

  ui() {   // HUD DOM: timer, judul, bar EXP
    const s = Math.floor(this.clock / 1000);
    $('bTime').textContent = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
    $('bStage').textContent = 'VS ' + VS_MODES[vsMatch.mode].name + ' · Babak ' + (vsMatch.round + 1) + '/2 · Wave ' + Math.min(this.wave, VS_WAVES) + '/' + VS_WAVES + ' · ' + VS_ROLE_NAME[this.role];
    $('bXpBar').style.width = Math.max(0, Math.min(100, this.xp / this.xpNeed * 100)) + '%';
    $('bXpTxt').textContent = 'Lv ' + this.level + ' · ' + Math.floor(this.xp) + '/' + this.xpNeed;
  }

  // ---- Akhir babak ----
  end() { this.finishRound(true); }   // dipanggil Battle.update saat HP benteng habis
  finishRound(destroyed) {
    if (this._done) return; this._done = true; this.vsScanReach(); this.over = true; this.vsTeardown();
    const M = vsMatch, hp = Math.max(0, Math.round(this.baseHp)), max = this.baseMax, defender = this.role === VS_ROLE.DEFEND ? 'human' : 'bot';
    const reach = this.vsReach, depth = this.vsDepthN ? Math.round(this.vsDepthSum / this.vsDepthN * 100) : 0;   // depth dalam persen jalur menuju tembok
    M.results.push({ round: M.round, defender, hp, max, destroyed, reach, depth });
    this.banner.setText(destroyed ? 'BENTENG HANCUR!' : 'BENTENG BERTAHAN!').setFontSize(24).setAlpha(1).setScale(1);
    const pct = v => Math.round(Math.max(0, v.hp) / v.max * 100), meIsAtk = this.role === VS_ROLE.ATTACK;
    const tiles = [['💀', 'Monster', this.kills], ['❤', 'Sisa HP benteng', hp + '/' + max], ['🧱', 'Sampai tembok', reach], ['📏', 'Jarak maju', depth + '%']];
    let o;
    if (destroyed) {   // penyerang menang total
      const humanWins = meIsAtk; M.active = false;
      o = {
        win: humanWins, icon: humanWins ? '🏆' : '💥', title: humanWins ? 'Kamu menang total!' : 'Benteng jebol - kalah', sub: 'Babak ' + (M.round + 1) + ' · benteng ' + (meIsAtk ? 'bot' : 'kamu') + ' hancur',
        tiles, notes: [humanWins ? 'Serangan monstermu berhasil menghancurkan benteng.' : 'Bot berhasil menghancurkan bentengmu.'], next: null
      };
    } else if (M.round === 0) {   // benteng bertahan: lanjut babak 2
      const nextRole = vsOpposite(this.role); M.round = 1;
      o = {
        win: true, icon: '🛡️', title: 'Babak 1 selesai', sub: 'Benteng ' + (meIsAtk ? 'bot' : 'kamu') + ' bertahan', tiles,
        bars: [[meIsAtk ? 'Benteng bot' : 'Benteng kamu', pct(M.results[0]), hp + '/' + max]],
        notes: ['Babak 2: kamu jadi ' + VS_ROLE_NAME[nextRole] + '.'], next: 'Lanjut Babak 2 ▶'
      };
    } else {   // dua babak selesai tanpa benteng hancur: bandingkan sisa HP
      M.active = false;
      const hum = M.results.find(r => r.defender === 'human'), bot = M.results.find(r => r.defender === 'bot'), j = vsJudge(M.results), w = j.winner;
      const why = w === 'draw' ? 'Seri: sisa HP, monster yang sampai ke tembok, dan jarak maju monster sama persis.'
        : j.by === 'hp' ? 'Pemenang = sisa HP benteng paling banyak (' + j.mine + ' vs ' + j.theirs + ').'
          : 'HP benteng sama. Penentu: ' + j.label + ' (kamu ' + j.mine + ' vs bot ' + j.theirs + '), ' + (w === 'human' ? 'lebih baik di pihakmu.' : 'lebih baik di pihak bot.');
      o = {
        win: w === 'human', icon: w === 'human' ? '🏆' : w === 'bot' ? '💥' : '🤝', title: w === 'human' ? 'Kamu menang!' : w === 'bot' ? 'Bot menang' : 'Seri', sub: 'Dua babak selesai · HP benteng, lalu penentu cadangan',
        tiles, bars: [['Benteng kamu', pct(hum), hum.hp + '/' + hum.max], ['Benteng bot', pct(bot), bot.hp + '/' + bot.max]],
        notes: [why], next: null
      };
    }
    showVsResult(o);
  }
}