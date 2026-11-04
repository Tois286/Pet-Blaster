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
  .vsplan{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;background:rgba(15,8,35,.86);padding:10px;box-sizing:border-box;font-family:inherit}
  .vsplan[hidden]{display:none}
  .vsbox{width:100%;max-width:440px;max-height:100%;overflow:auto;color:#fff;text-align:center}
  .vsbox header{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:18px;margin-bottom:4px}
  .vsbox .vst{background:#1b1230;border:2px solid #ffd34d;border-radius:12px;padding:3px 10px;font-weight:700;color:#ffd34d}
  .vsbox .vst.low{color:#ff6b6b;border-color:#ff6b6b}
  .vsbox .vsinfo{margin:2px 0 8px;font-size:12px;opacity:.85}
  .vscards{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
  .vscards .ucard.vscard{width:auto;min-width:0;margin:0;cursor:default;display:flex;flex-direction:column;align-items:center;gap:3px;padding:8px 4px}
  .vscards .ucard.vscard.on{outline:3px solid #6be3a2;box-shadow:0 0 12px 2px rgba(107,227,162,.7)}
  .vscards .ucard.vscard.sp{border:2px solid #ffd34d}
  .vscards .ucard.vscard img{width:56px;height:56px;object-fit:contain}
  .vscards .ucard.vscard b{font-size:12px}.vscards .ucard.vscard span{font-size:10px;line-height:1.25}
  .vsq{display:flex;align-items:center;justify-content:center;gap:4px;margin-top:4px}
  .vsq button{width:30px;height:30px;border-radius:50%;border:2px solid #2b1d4a;background:#ffd34d;color:#2b1d4a;font-weight:800;font-size:18px;line-height:1;padding:0;cursor:pointer}
  .vsq button:disabled{opacity:.35;cursor:default}
  .vsq output{min-width:32px;font-size:20px;font-weight:800;color:#fff;text-shadow:0 2px 0 #2b1d4a}
  .vsmax{margin-top:3px;font-size:10px;padding:2px 8px;border-radius:10px;border:1px solid #6be3a2;background:transparent;color:#6be3a2;cursor:pointer}
  .vsbox footer{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:10px}
  .vsbox footer .vssum{font-size:13px;text-align:left}
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
    this.role = vsRoleOf(vsMatch); this.botDef = this.role === VS_ROLE.ATTACK;
  }
  makeWorld() {   // arena panjang (bisa di-scroll). Dibuat juga alias 'arenavs' agar kode arena lama (fusion) tetap berjalan
    const a = vsArenaFor(vsMatch.mode, this.role), tall = this.textures.exists(a.key), key = tall ? a.key : 'arena0';
    if (this.textures.exists('arenavs')) this.textures.remove('arenavs');
    this.textures.addImage('arenavs', this.textures.get(key).getSourceImage());
    this.arena = 'vs'; this.fusionBg = null;
    const src = this.textures.get(key).getSourceImage();
    const bgH = tall ? Math.max(H, Math.round(W * src.height / src.width)) : H;   // tinggi gambar pada lebar layar
    const bot = H + (tall ? VS_VIEW.shift : 0), top = bot - bgH;                   // koordinat dunia: bagian bawah gambar sejajar dengan area benteng
    this.arenaTop = top; this.topY = bgH > H ? top + VS_VIEW.margin : -20;         // topY = titik muncul monster (tepi atas arena)
    this.bg = this.add.image(W / 2, (top + bot) / 2, key).setDisplaySize(W, bgH).setDepth(-100000);   // depth sangat rendah: monster memakai depth = y (bisa negatif)
    const cam = this.cameras.main;
    if (bgH > H) cam.setBounds(0, top, W, H - top);   // kamera hanya bisa naik ke atas (scrollY dari top sampai 0)
    cam.scrollY = this.role === VS_ROLE.ATTACK ? Math.min(0, top) : 0;   // penyerang mulai di atas arena, penahan mulai di bawah (benteng)
  }
  create() {
    this.prevAuto = autoPlay;
    if (this.botDef) { autoPlay = true; const ab = $('autoBtn'); if (ab) ab.hidden = true; }   // bot menahan = auto play; tombol AUTO disembunyikan
    super.create();
    [this.hud, this.hpTxt, this.ammoTxt, this.waveTxt, this.killTxt, this.banner].forEach(o => o && o.setScrollFactor(0));   // HUD tetap di layar saat arena digulir
    this.vsScrollSetup();
    this.events.once('shutdown', () => { autoPlay = this.prevAuto; const ab = $('autoBtn'); if (ab) ab.hidden = false; this.vsTeardown(); });
  }
  addEnemy(o) {   // jalur arena panjang jauh lebih panjang: monster dipercepat VS_VIEW.speed
    super.addEnemy(o); const e = this.enemies[this.enemies.length - 1]; if (e && this.arenaTop < 0) e.sp *= VS_VIEW.speed;
  }
  // ---- Batas pet penahan: maksimal VS_RULES.maxPets karakter pet per babak (di semua mode VS) ----
  vsPetCount() { return this.pets.filter(p => p.on || p.fused).length; }   // pet yang sedang melebur (fusion) tetap dihitung agar tidak bisa dipanggil ulang
  petFull() { return this.vsPetCount() >= VS_RULES.maxPets; }
  addPet(el) {   // jaga-jaga bila ada jalur lain yang memanggil pet: tolak pet baru kalau jatah penuh
    const p = this.pets.find(o => o.el === el);
    if (!p || p.on || p.fused || this.petFull()) return;
    super.addPet(el);
  }
  // ---- Pencatat penentu cadangan (dipakai vsJudge saat HP kedua benteng sama) ----
  vsScanReach() {   // hitung tiap monster satu kali begitu ia mulai memukul tembok (atau menembak dari jarak jauh)
    (this.enemies || []).forEach(e => { if (e.atk && !e._vr && !e.dead) { e._vr = 1; this.vsReach++; } });
  }
  update(time, dt) {
    super.update(time, dt);
    if (!this.over) this.vsScanReach();
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
  boot() { this.token = 'vs'; this.begin(); }   // tanpa server: pertandingan VS tidak menyimpan hadiah (mode uji)

  begin() {
    this.vsSt = vsNewAttackState(); this.queue = []; this._done = false;
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
    const st = this.vsSt, hand = st.hand.slice(), qty = {};
    hand.forEach(id => { qty[id] = 0; });
    this.choosing = true; this.vsTeardown();
    const box = document.createElement('div'); box.className = 'vsplan'; box.id = 'vsPlan';
    box.innerHTML = `<div class="vsbox"><header><span>⚔️ Wave ${st.wave}/${VS_WAVES} · Atur serangan</span><span class="vst">⏱ ${VS_PLAN_SEC}</span></header>
      <p class="vsinfo"></p><div class="vscards"></div>
      <footer><span class="vssum"></span><button type="button" class="btn main" data-go>🚀 Kirim Wave</button></footer></div>`;
    document.body.appendChild(box); this.planBox = box;
    const cards = box.querySelector('.vscards'), info = box.querySelector('.vsinfo'), sum = box.querySelector('.vssum'), go = box.querySelector('[data-go]'), tmr = box.querySelector('.vst');
    const plan = () => hand.filter(id => qty[id] > 0).map(id => ({ id, qty: qty[id] }));
    hand.forEach(id => {
      const k = vsKind(id), c = document.createElement('div'); c.className = 'ucard vscard' + (k !== 'normal' ? ' sp' : ''); c.dataset.id = id;
      c.innerHTML = `<img src="assets/monsters/${MON[id].f}.png" alt=""><b>${MON[id].n}</b><span>${vsMonInfo(id, this.vsHp(id))}</span>${k !== 'normal' ? `<em>${k === 'boss' ? 'BOS' : 'ELITE'}</em>` : ''}
        <div class="vsq"><button type="button" data-d="-1" aria-label="Kurangi">−</button><output>0</output><button type="button" data-d="1" aria-label="Tambah">+</button></div>
        <button type="button" class="vsmax" data-max>Maks</button>`;
      cards.appendChild(c);
    });
    const refresh = () => {
      const p = plan(), picked = p.length, total = vsSum(p);
      info.textContent = `HP monster setara ${ISLANDS[this.vsTier.island].name} stage ${this.vsTier.stage} · Sisa ${st.left} monster · Elite ${st.eliteLeft} · Bos ${st.bossLeft} · Batas wave ini ${vsWaveCap(st)} · Pilih sampai ${VS_PICKS} kartu`;
      sum.textContent = `Dipilih: ${total} monster (${picked} kartu)`;
      go.disabled = total < 1;
      cards.querySelectorAll('.vscard').forEach(c => {
        const id = +c.dataset.id, r = vsQtyRange(st, id, p), q = qty[id];
        c.classList.toggle('on', q > 0); c.querySelector('output').textContent = q;
        c.querySelector('[data-d="-1"]').disabled = q <= 0;
        c.querySelector('[data-d="1"]').disabled = q >= r.max;
        c.querySelector('[data-max]').disabled = r.max <= q;
      });
    };
    cards.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; const c = b.closest('.vscard'), id = +c.dataset.id, r = vsQtyRange(st, id, plan());
      if (b.dataset.max !== undefined) qty[id] = r.max; else qty[id] = Math.max(0, Math.min(r.max, qty[id] + +b.dataset.d));
      refresh();
    };
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