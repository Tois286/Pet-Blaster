// Hasil pertempuran, inisialisasi game, lobi, toko, menu, dan scene Lobby.
// Kotak hasil pertempuran (menang / kalah). first = true: gambar bintang + confetti (animasi hanya sekali); panggilan berikutnya hanya memperbarui angka hadiah.
function showResult(R, first) {
  const win = R.win, card = $('resultCard'), pend = R.coins === undefined && !R.error;
  card.classList.toggle('win', win); card.classList.toggle('lose', !win);
  $('resultIcon').textContent = win ? '🏆' : '💥';
  $('resultTitle').textContent = win ? 'Menang!' : 'Markas jebol';
  $('resultSub').textContent = R.island + ' · Stage ' + R.stage;
  if (first) {
    $('resultStars').innerHTML = win ? [1, 2, 3].map(i => `<span class="${i <= R.stars ? 'on' : ''}" style="animation-delay:${(.25 + i * .22).toFixed(2)}s">★</span>`).join('') : '';
    const fx = $('resultFx'); fx.textContent = '';
    if (win) for (let i = 0; i < 22; i++) {
      const c = document.createElement('i'), col = ['#ffd34d', '#6be3a2', '#7fd8ff', '#ff8fb1', '#ffffff'][i % 5];
      c.style.cssText = `left:${(Math.random() * 100).toFixed(1)}%;background:${col};animation-delay:${(Math.random() * .9).toFixed(2)}s;animation-duration:${(2.2 + Math.random() * 1.6).toFixed(2)}s;--dx:${Math.round(Math.random() * 80 - 40)}px;--rot:${Math.round(360 + Math.random() * 540)}deg`;
      fx.appendChild(c);
    }
  }
  const tile = (ic, lab, val, cls = '') => `<div class="rt ${cls}"><i>${ic}</i><b>${val}</b><span>${lab}</span></div>`;
  let tiles = tile('💀', 'Monster', R.kills) + tile('🪙', 'Koin', R.error ? '-' : pend ? '…' : '+' + R.coins);
  if (R.gems > 0) tiles += tile('💎', 'Gem bos', '+' + R.gems, 'gem'); else if (R.gemClaimed) tiles += tile('💎', 'Gem bos', 'Sudah diambil', 'dim');
  $('resultStats').innerHTML = tiles;
  const hp = $('resultHp'); hp.hidden = !win;
  if (win) hp.innerHTML = `<div class="rhp-h"><span>❤ Sisa HP markas</span><b>${R.hpPct}%</b></div><div class="rhp-bar"><i style="width:${R.hpPct}%"></i><u style="left:${STAR_RULES.two * 100}%"></u><u style="left:${STAR_RULES.three * 100}%"></u></div>`;
  const notes = [];
  if (R.error) notes.push(R.error);
  else if (pend) notes.push('Menyimpan hadiah...');
  else {
    if (win && R.stage < STAGES_PER_ISLAND) notes.push('🔓 Stage berikutnya kini terbuka.');
    if (win) notes.push(R.stars < 3 ? 'Butuh sisa HP ≥ ' + Math.round((R.stars < 2 ? STAR_RULES.two : STAR_RULES.three) * 100) + '% untuk ' + (R.stars + 1) + ' bintang.' : 'Sempurna, 3 bintang! ✨');
    else notes.push('Perkuat Tois dan pet, lalu coba lagi.');
  }
  $('resultText').replaceChildren(...notes.map(t => { const d = document.createElement('div'); d.textContent = t; return d; }));
}

function startGame() {
  showLoading();
  Object.assign($('game-container').style, { backgroundImage: "url('assets/backgrounds/lobby.jpg?v=2')", backgroundSize: 'cover', backgroundPosition: 'center' });   // latar cadangan saat scene berganti
  game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game-container', width: W, height: H, transparent: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [Lobby, Battle, VsBattle]
  });
}

// ---- Lobi ----
let sayT;
function say(t) { const m = $('gameMessage'); m.textContent = t; clearTimeout(sayT); if (t) sayT = setTimeout(() => { m.textContent = ''; }, 3000); }
// Mulai pertempuran. Permintaan /battle/start dikirim bersamaan dengan pergantian scene (sebelumnya baru dikirim setelah scene Battle selesai dibuat, jadi dua jeda berurutan). Klik ganda diabaikan selama permintaan belum dipakai Battle.create.
let battleReq = null;
function startBattle() {
  if (vsMatch && vsMatch.active) return startVsRound();   // pertandingan VS sedang berjalan: tombol lanjut memulai babak berikutnya
  if (!game || battleReq) return;
  battleReq = api('/battle/start', 'POST', { island: selectedIsland, stage: selectedStage });   // pulau + stage dikirim agar server bisa menghitung gem bos
  battleReq.catch(() => { });   // galat ditampilkan oleh Battle.create lewat say(); ini hanya mencegah peringatan "unhandled rejection"
  $('gamePanel').classList.add('battle'); game.scene.stop('Lobby'); game.scene.start('Battle');
}
// ---- Mode VS: mulai pertandingan (hanya mode yang punya bot yang sudah bisa dimainkan) dan mulai tiap babak ----
function startVsMatch(mode) {
  if (!game) return;
  vsMatch = vsNewMatch(mode); $('hub').hidden = true; startVsRound();
}
function startVsRound() {
  if (!game || !vsMatch) return;
  $('result').hidden = true; $('gamePanel').classList.add('battle'); game.scene.stop('Lobby'); game.scene.start('VsBattle');
  say('Mode VS (uji): hadiah tidak disimpan.');
}
function toLobby() { clearBattleSnap(); vsCleanup(); $('result').hidden = true; $('gamePanel').classList.remove('battle'); game.scene.stop('Battle'); game.scene.stop('VsBattle'); game.scene.start('Lobby'); }
const menu = (el, items) => items.forEach(([ic, label, act]) => {
  const b = document.createElement('button'); b.className = 'ico'; b.innerHTML = `<i>${ic}</i><span>${label}</span>`;
  b.onclick = () => act ? openHub(act) : say('Fitur ' + label + ' segera hadir.'); $(el).appendChild(b);
});
menu('sideL', [['🎖️', 'Battle Pass'], ['🎁', 'Hadiah'], ['📜', 'Event']]);
menu('sideR', [['📢', 'Info'], ['✉️', 'Surat'], ['👥', 'Teman'], ['📋', 'Misi']]);
// Menu penjualan Dika di halaman Toko: klik satu menu -> menu lain tertutup, yang dipilih mengecil, panel isi (sementara putih) tampil; klik lagi untuk kembali
function resetShopMenu() {
  const m = $('shopMenu'); if (!m) return;
  m.classList.remove('open'); m.querySelectorAll('[data-shop]').forEach(b => b.classList.remove('sel')); $('shopPanel').innerHTML = ''; $('shopPanel').classList.remove('outfit', 'goodbye', 'lotre', 'ltlock');
}
// ---- Menu Upgrade Toko (Dika): Goodbye + Mie Kari. Goodbye: Harga per gelas = GOODBYE.price koin; 3 kotak paket: 1, 6, 10 gelas. Jumlah gelas disimpan di database (POST /shop/goodbye); harga dicek ulang di server (Shop.php). ----
const GOODBYE = {
  name: 'Goodbye', price: 500, icon: 'assets/shop/goodbye-icon.webp?v=1',
  packs: [
    { qty: 1, img: 'assets/shop/goodbye-1.webp?v=1', color: '#c98a4b' },
    { qty: 6, img: 'assets/shop/goodbye-6.webp?v=1', color: '#4b9be0' },
    { qty: 10, img: 'assets/shop/goodbye-10.webp?v=1', color: '#e0a82e' }
  ]
};
const applyShop = d => {   // balasan server setelah beli / tarik / pakai: timpa koin, gem, dan status Toko (barang, outfit, papan lotre)
  profile.progress.coins = d.coins; profile.progress.gems = d.gems;
  for (const k of ['goodbye', 'noodle', 'outfits', 'worn', 'lotre']) if (d[k] !== undefined) profile[k] = d[k];
  syncCoinsUI();
};
const goodbyeStore = () => ({ qty: +profile?.goodbye || 0 });   // jumlah gelas dari database (profile.goodbye)
let goodbyeBusy = false;
// ---- Mie Kari: produk kedua di menu Upgrade, ditaruh di bawah Goodbye. Harga per mangkuk = NOODLE.price koin. Jumlah per varian disimpan di database (POST /shop/noodle). ----
const NOODLE = {
  name: 'Mie Kari', price: 1000, icon: 'assets/shop/noodle-biasa.webp?v=1',
  items: [
    { id: 'biasa', name: 'Mie Kari Biasa', img: 'assets/shop/noodle-biasa.webp?v=1', color: '#e0a82e' },
    { id: 'double', name: 'Mie Kari Double', img: 'assets/shop/noodle-double.webp?v=1', color: '#ee7a2e' },
    { id: 'telur', name: 'Mie Kari Double Extra Telur', img: 'assets/shop/noodle-telur.webp?v=1', color: '#e0483a' }
  ]
};
const noodleStore = () => { const q = profile?.noodle || {}; return { q: { biasa: +q.biasa || 0, double: +q.double || 0, telur: +q.telur || 0 } }; };   // jumlah per varian dari database (profile.noodle)
const noodleTotal = () => Object.values(noodleStore().q).reduce((a, b) => a + b, 0);
(() => {
  const st = document.createElement('style'); st.textContent =
    // Panel Upgrade: dua menu (Goodbye, Mie Kari) disusun padat; ukuran gambar & jarak mengikuti tinggi layar (vh) supaya keduanya terlihat tanpa scroll
    '#shopPanel.goodbye{display:flex;flex-direction:column;justify-content:space-evenly;gap:clamp(6px,1.4vh,12px);background:linear-gradient(180deg,#2b1d4a,#1d1330);color:#fff;border-radius:16px;padding:clamp(6px,1.4vh,12px) 10px;overflow:auto;box-sizing:border-box}'
    + '.upsec{display:flex;flex-direction:column;gap:clamp(3px,.8vh,8px);padding-bottom:clamp(4px,1vh,10px);border-bottom:1px dashed rgba(255,255,255,.18)}.upsec:last-of-type{border-bottom:0;padding-bottom:0}'
    + '.uphead{display:flex;align-items:center;gap:8px}.uphead>img{width:clamp(28px,4.6vh,40px);height:clamp(28px,4.6vh,40px);object-fit:contain;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45))}'
    + '.uphead h4{margin:0;font-size:15px;line-height:1.1}.uphead p{margin:1px 0 0;font-size:11px;opacity:.85}'
    + '.upown{margin-left:auto;text-align:center;padding:2px 10px;border-radius:10px;background:rgba(255,255,255,.1);font-size:10px;line-height:1.15}.upown b{display:block;font-size:16px;color:#ffd34d}'
    + '.upown.pop b{animation:uppop .4s ease-out}@keyframes uppop{0%{transform:scale(1)}40%{transform:scale(1.35)}100%{transform:scale(1)}}'
    + '.upgrid{display:flex;gap:10px;overflow-x:auto;overflow-y:hidden;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;scrollbar-width:none;touch-action:pan-x pan-y;padding:12px 6px 6px;margin:0 -4px;cursor:grab}'
    + '.upgrid::-webkit-scrollbar{display:none}.upgrid.drag{cursor:grabbing;scroll-snap-type:none}'
    + '.upcard{position:relative;flex:0 0 clamp(120px,40%,152px);scroll-snap-align:start;display:flex;flex-direction:column;align-items:center;gap:3px;padding:10px 4px 6px;min-width:0;box-sizing:border-box;border-radius:12px;border:2px solid var(--rc);background:radial-gradient(circle at 50% 40%,rgba(255,255,255,.15),rgba(0,0,0,.25));box-shadow:0 3px 0 rgba(0,0,0,.35)}'
    + '.upqty{position:absolute;top:-10px;left:50%;transform:translateX(-50%);padding:0 10px;border-radius:9px;background:var(--rc);color:#1d1330;font-style:normal;font-weight:800;font-size:12px;line-height:17px;white-space:nowrap}'
    + '.upbadge{position:absolute;top:-9px;right:-5px;min-width:19px;height:19px;padding:0 5px;box-sizing:border-box;border-radius:10px;background:#2fa84f;color:#fff;font:800 11px/19px system-ui,sans-serif;text-align:center}'
    + '.upart{width:100%;height:clamp(52px,11.5vh,100px);display:flex;align-items:center;justify-content:center}.upart img{max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 3px 3px rgba(0,0,0,.45));transition:transform .15s}'
    + '.upcard:active .upart img{transform:scale(.93)}'
    + '.upname{display:flex;align-items:center;justify-content:center;min-height:2.3em;font-size:11px;line-height:1.15;text-align:center}'
    + '.upbuy{width:100%;min-width:0;padding:5px 2px;font-size:12px;white-space:nowrap}.upbuy:disabled{opacity:.5}'
    + '.upcoin{margin:0;text-align:center;font-size:11px;opacity:.9}.upcoin b{color:#ffd34d}';
  document.head.appendChild(st);
})();
const isShopUpgrade = b => /upgrade/i.test([b.dataset.shop || '', b.getAttribute('aria-label') || '', b.textContent, ...[...b.querySelectorAll('img')].map(i => i.alt)].join(' '));
(() => {   // Goodbye tampil di menu "Upgrade" Toko. Bila menu Upgrade belum ada di index.html, tombolnya dibuat dengan meniru tombol menu yang sudah ada.
  const m = $('shopMenu'); if (!m) return;
  const btns = [...m.querySelectorAll('[data-shop]')]; if (!btns.length || btns.some(isShopUpgrade)) return;
  const nb = btns[0].cloneNode(true); nb.dataset.shop = 'upgrade'; nb.classList.remove('sel');
  const img = nb.querySelector('img'); if (img) { img.src = GOODBYE.icon; img.srcset = ''; img.alt = 'Upgrade'; }
  const leaf = [...nb.querySelectorAll('*')].find(e => !e.children.length && e.tagName !== 'IMG' && e.textContent.trim());
  if (leaf) leaf.textContent = 'Upgrade';
  else { const t = [...nb.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = 'Upgrade'; else if (!img) nb.textContent = '⬆️ Upgrade'; }
  btns[0].parentNode.appendChild(nb);
})();
const fmtID = n => n.toLocaleString('id-ID');
async function buyGoodbye(qty) {
  const pk = GOODBYE.packs.find(x => x.qty === qty); if (goodbyeBusy || !pk) return;
  const cost = qty * GOODBYE.price;
  if ((+profile.progress.coins || 0) < cost) { say('Koin tidak cukup untuk ' + qty + ' gelas Goodbye.'); return; }
  goodbyeBusy = true;
  try { applyShop(await api('/shop/goodbye', 'POST', { qty })); say('Berhasil membeli ' + qty + ' gelas Goodbye!'); }   // harga dicek ulang di server
  catch (err) { say(err.message); }
  goodbyeBusy = false; renderUpgradePanel('goodbye');
}
async function buyNoodle(id) {
  const it = NOODLE.items.find(x => x.id === id); if (goodbyeBusy || !it) return;
  if ((+profile.progress.coins || 0) < NOODLE.price) { say('Koin tidak cukup untuk ' + it.name + '.'); return; }
  goodbyeBusy = true;
  try { applyShop(await api('/shop/noodle', 'POST', { id })); say('Berhasil membeli ' + it.name + '!'); }
  catch (err) { say(err.message); }
  goodbyeBusy = false; renderUpgradePanel('noodle');
}
function renderUpgradePanel(pop) {   // menu Upgrade Toko: Goodbye di atas, Mie Kari di bawah; keduanya terlihat tanpa scroll
  const p = $('shopPanel'), coins = +profile?.progress?.coins || 0, nq = noodleStore().q;
  p.classList.remove('outfit'); p.classList.add('goodbye');
  const keepX = [...p.querySelectorAll('.upgrid')].map(g => g.scrollLeft);   // posisi geser tiap baris dipertahankan setelah membeli
  const head = (icon, title, sub, total, key) => `<div class="uphead"><img src="${icon}" alt=""><div><h4>${title}</h4><p>${sub}</p></div><div class="upown${pop === key ? ' pop' : ''}">Dimiliki<b>${fmtID(total)}</b></div></div>`;
  p.innerHTML = `<section class="upsec">${head(GOODBYE.icon, GOODBYE.name, '🪙 ' + fmtID(GOODBYE.price) + ' / gelas', goodbyeStore().qty, 'goodbye')}<div class="upgrid">`
    + GOODBYE.packs.map(k => {
      const cost = k.qty * GOODBYE.price;
      return `<article class="upcard" style="--rc:${k.color}"><em class="upqty">×${k.qty}</em><div class="upart"><img src="${k.img}" alt="${k.qty} gelas ${GOODBYE.name}"></div><b class="upname">${k.qty} Gelas</b><button type="button" class="btn main upbuy" data-gbuy="${k.qty}" ${coins < cost ? 'disabled' : ''}>🪙 ${fmtID(cost)}</button></article>`;
    }).join('')
    + `</div></section><section class="upsec">${head(NOODLE.icon, NOODLE.name, '🪙 ' + fmtID(NOODLE.price) + ' / mangkuk', noodleTotal(), 'noodle')}<div class="upgrid">`
    + NOODLE.items.map(k =>
      `<article class="upcard" style="--rc:${k.color}">${nq[k.id] ? `<i class="upbadge">${fmtID(nq[k.id])}</i>` : ''}<div class="upart"><img src="${k.img}" alt="${k.name}"></div><b class="upname">${k.name}</b><button type="button" class="btn main upbuy" data-nbuy="${k.id}" ${coins < NOODLE.price ? 'disabled' : ''}>🪙 ${fmtID(NOODLE.price)}</button></article>`).join('')
    + `</div></section><p class="upcoin">Koinmu: 🪙 <b>${fmtID(coins)}</b></p>`;
  p.querySelectorAll('.upgrid').forEach((g, i) => {
    g.scrollLeft = keepX[i] || 0;
    let down = false, moved = false, x0 = 0, s0 = 0;   // geser dengan mouse (di layar sentuh sudah otomatis)
    g.onpointerdown = e => { if (e.pointerType !== 'mouse') return; down = true; moved = false; x0 = e.clientX; s0 = g.scrollLeft; };
    g.onpointermove = e => { if (!down) return; const dx = e.clientX - x0; if (Math.abs(dx) > 5) { moved = true; g.classList.add('drag'); } if (moved) g.scrollLeft = s0 - dx; };
    const end = () => { down = false; g.classList.remove('drag'); };
    g.onpointerup = end; g.onpointerleave = end; g.onpointercancel = end;
    g.onclickcapture = e => { if (moved) { e.stopPropagation(); e.preventDefault(); moved = false; } };   // seret tidak dihitung sebagai klik beli
  });
  p.querySelectorAll('[data-gbuy]').forEach(b => b.onclick = () => buyGoodbye(+b.dataset.gbuy));
  p.querySelectorAll('[data-nbuy]').forEach(b => b.onclick = () => buyNoodle(b.dataset.nbuy));
}
ensureLotreButton();   // tombol menu Lotre (game_lotre.js) dibuat dulu supaya ikut diberi onclick di bawah
document.querySelectorAll('#shopMenu [data-shop]').forEach(b => b.onclick = () => {
  const m = $('shopMenu');
  if (b.classList.contains('sel')) { resetShopMenu(); return; }
  resetShopMenu(); m.classList.add('open'); b.classList.add('sel');
  if (b.dataset.shop === 'outfit') renderOutfitPanel();
  else if (isShopUpgrade(b)) renderUpgradePanel();   // menu Upgrade Toko = produk Goodbye
  else if (isShopLotre(b)) openLotrePanel();   // menu Lotre Toko = Lotre Tarik (game_lotre.js)
});
// ---- Outfit Tois: dibeli di Toko (Dika), setelah dibeli baru bisa dipakai dan tampil di lobi/menu Karakter ----
// cur 'coin' = koin, 'gem' = gem, price 0 = gratis. soon:true = belum dijual (gambar ada, tombol beli dikunci). Untuk membuka outfit lain cukup hapus soon:true.
const OUTFITS = [
  { id: 'base', name: 'Base', rarity: 'Biasa', color: '#8a8a8a', cur: 'coin', price: 0 },
  { id: 'elite', name: 'Elite', rarity: 'Langka', color: '#3f7fd8', cur: 'coin', price: 5000 },
  { id: 'master', name: 'Master', rarity: 'Master', color: '#1fb8d6', cur: 'coin', price: 15000 },
  { id: 'epic', name: 'Epic', rarity: 'Epik', color: '#c04bd8', cur: 'gem', price: 150 },
  { id: 'legendary', name: 'Legendary', rarity: 'Legendaris', color: '#e8a31c', cur: 'gem', price: 500 },
  { id: 'mythical', name: 'Mythical', rarity: 'Mitos', color: '#7a4be0', cur: 'gem', price: 1200 }
];
// Kepemilikan outfit/skin + outfit yang dipakai tersimpan di database (tabel game_outfits, game_progress.worn_outfit) dan datang lewat profile.outfits / profile.worn.

const outfitOwned = id => id === 'base' || !!(profile && Array.isArray(profile.outfits) && profile.outfits.includes(id));
const outfitWorn = () => { const w = profile?.worn || 'base'; return OUTFITS.some(o => o.id === w) && outfitOwned(w) ? w : 'base'; };   // outfit hanya tampil bila sudah dibeli
// GIF idle transparan per outfit untuk pratinjau Toko. Outfit tanpa entri di sini memakai canvas spritesheet / gambar diam seperti sebelumnya.
const OUTFIT_GIF = Object.fromEntries(SKINS.filter(k => k.gif).map(k => [k.outfit, k.gif]));   // diambil dari SKINS (game_tois.js, field gif)
const outfitImg = id => 'assets/outfits/' + id + '.webp?v=2';
let outfitSel = 'base', outfitLobbyDirty = false, outfitBusy = false;
(() => { const st = document.createElement('style'); st.textContent = '.oact{display:flex;gap:8px;align-items:center;justify-content:center;margin:8px 0}.oact .btn{min-width:150px}.othumbs .ocard{position:relative}.obdg{position:absolute;top:3px;right:3px;font-style:normal;font-size:11px;line-height:1;padding:2px 4px;border-radius:8px;background:rgba(0,0,0,.7);color:#fff}.obdg.worn{background:#2fa84f}.oinfo .ostat{display:block;margin-top:2px;font-size:12px;font-weight:700}'; document.head.appendChild(st); })();
function syncCoinsUI() {
  const p = profile.progress; $('coins').textContent = p.coins; $('gems').textContent = +p.gems || 0; $('hubCoins').textContent = p.coins; $('hubGems').textContent = +p.gems || 0;
}
async function buyOutfit(id) {
  const o = OUTFITS.find(x => x.id === id);
  if (outfitBusy || !o || o.soon || outfitOwned(id)) return;
  const key = o.cur === 'gem' ? 'gems' : 'coins';
  if ((+profile.progress[key] || 0) < o.price) { say((o.cur === 'gem' ? 'Gem' : 'Koin') + ' tidak cukup untuk outfit ' + o.name + '.'); return; }
  outfitBusy = true;
  try {
    applyShop(await api('/outfit/buy', 'POST', { id }));   // server memotong koin/gem, menyimpan outfit, dan langsung memakainya
    outfitLobbyDirty = true;
    say('Outfit ' + o.name + ' berhasil dibeli dan sedang dipakai!');
  } catch (err) { say(err.message); }
  outfitBusy = false; renderOutfitPanel();
}
async function wearOutfit(id) {
  if (outfitBusy || !outfitOwned(id)) return;
  outfitBusy = true;
  try { applyShop(await api('/outfit/wear', 'POST', { id })); outfitLobbyDirty = true; say('Outfit ' + OUTFITS.find(o => o.id === id).name + ' dipakai.'); }
  catch (err) { say(err.message); }
  outfitBusy = false; renderOutfitPanel();
}
const outfitPrice = o => o.price ? `<span class="oprice">${o.cur === 'gem' ? '💎' : '🪙'} <b>${o.price.toLocaleString('id-ID')}</b></span>` : '<span class="oprice free">Gratis</span>';
let outfitAnimTimer = 0;
function startOutfitAnim(cv, sk) {   // pratinjau Toko: putar spritesheet idle skin (grid kolom x baris) di canvas; berhenti sendiri saat panel diganti
  clearInterval(outfitAnimTimer); if (!cv || !sk) return;
  const img = new Image(), I = sk.idle; let f = 0;
  img.onload = () => {
    const cols = Math.round(img.naturalWidth / I.fw), ctx = cv.getContext('2d');
    outfitAnimTimer = setInterval(() => {
      if (!cv.isConnected) { clearInterval(outfitAnimTimer); return; }
      ctx.clearRect(0, 0, cv.width, cv.height); ctx.drawImage(img, (f % cols) * I.fw, Math.floor(f / cols) * I.fh, I.fw, I.fh, 0, 0, cv.width, cv.height);
      f = (f + 1) % I.frames;
    }, 1000 / I.fps);
  };
  img.src = I.src;
}
function renderOutfitPanel() {
  const p = $('shopPanel'), cur = OUTFITS.find(o => o.id === outfitSel) || OUTFITS[0], worn = outfitWorn(), own = outfitOwned(cur.id);
  const status = cur.id === worn ? '✔ Sedang dipakai' : own ? 'Dimiliki' : cur.soon ? '🔒 Segera hadir' : '';
  const have = +profile?.progress?.[cur.cur === 'gem' ? 'gems' : 'coins'] || 0;
  const act = cur.id === worn ? '<button type="button" class="btn alt" disabled>✔ Dipakai</button>'
    : own ? `<button type="button" class="btn main" data-wear="${cur.id}">👕 Pakai</button>`
      : cur.soon ? '<button type="button" class="btn alt" disabled>🔒 Segera hadir</button>'
        : `<button type="button" class="btn main" data-buy="${cur.id}" ${have < cur.price ? 'disabled' : ''}>${cur.cur === 'gem' ? '💎' : '🪙'} Beli · ${cur.price.toLocaleString('id-ID')}</button>`;
  p.classList.add('outfit');
  p.innerHTML = `<div class="ofull" style="--rc:${cur.color}">${OUTFIT_GIF[cur.id] ? `<img class="oanim" src="${OUTFIT_GIF[cur.id]}" alt="Outfit ${cur.name}" style="height:100%;max-height:260px;width:auto;max-width:100%;object-fit:contain">` : outfitHasSkin(cur.id) ? `<canvas class="oanim" width="${skinOfOutfit(cur.id).idle.fw}" height="${skinOfOutfit(cur.id).idle.fh}" style="height:100%;max-height:260px;width:auto;max-width:100%;object-fit:contain"></canvas>` : `<img src="${outfitImg(cur.id)}" alt="Outfit ${cur.name}">`}<div class="oinfo"><b>${cur.name}</b><em>${cur.rarity}</em>${own ? '' : outfitPrice(cur)}${status ? `<span class="ostat">${status}</span>` : ''}</div></div>`
    + `<div class="oact">${act}</div>`
    + '<div class="othumbs">' + OUTFITS.map(o => `<button type="button" class="ocard${o.id === cur.id ? ' on' : ''}" data-outfit="${o.id}" style="--rc:${o.color}" aria-label="${o.name}"><img src="${OUTFIT_GIF[o.id] ? OUTFIT_GIF[o.id].replace('.gif', '-thumb.gif') : outfitImg(o.id)}" alt="" loading="lazy">${o.id === worn ? '<i class="obdg worn">✔</i>' : outfitOwned(o.id) ? '<i class="obdg">Milik</i>' : o.soon ? '<i class="obdg">🔒</i>' : ''}</button>`).join('') + '</div>';
  startOutfitAnim(p.querySelector('canvas.oanim'), skinOfOutfit(cur.id));
  p.querySelectorAll('[data-outfit]').forEach(c => c.onclick = () => { outfitSel = c.dataset.outfit; renderOutfitPanel(); });
  p.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyOutfit(b.dataset.buy));
  p.querySelectorAll('[data-wear]').forEach(b => b.onclick = () => wearOutfit(b.dataset.wear));
}
// Ikon Rank: tameng dengan dua pedang bersilang di belakangnya (SVG inline, ikut ukuran font tombol).
const RANK_ICON = '<svg viewBox="0 0 32 32" width="1.15em" height="1.15em" style="vertical-align:-.2em" aria-hidden="true">'
  + '<g stroke-linecap="round"><path d="M4 4L28 28M28 4L4 28" stroke="#2b1d4a" stroke-width="4.6" fill="none"/><path d="M4 4L28 28M28 4L4 28" stroke="#e6edf5" stroke-width="2.6" fill="none"/>'
  + '<path d="M5.2 10.8L10.8 5.2M21.2 5.2L26.8 10.8" stroke="#2b1d4a" stroke-width="4.2" fill="none"/><path d="M5.2 10.8L10.8 5.2M21.2 5.2L26.8 10.8" stroke="#ffd34d" stroke-width="2.2" fill="none"/></g>'
  + '<path d="M16 7L25 10V17C25 23 20.5 26.5 16 28.5C11.5 26.5 7 23 7 17V10Z" fill="#3b6fd8" stroke="#2b1d4a" stroke-width="3.4" stroke-linejoin="round"/>'
  + '<path d="M16 7L25 10V17C25 23 20.5 26.5 16 28.5C11.5 26.5 7 23 7 17V10Z" fill="#3b6fd8" stroke="#ffd34d" stroke-width="1.6" stroke-linejoin="round"/>'
  + '<path d="M16 9V26C12.8 24.2 9 21.2 9 17V11.2Z" fill="#6f9bff"/><path d="M16 12.2l1.5 3 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z" fill="#ffd34d"/></svg>';
const HUB = [['shop', '🛒', 'Toko'], ['pet', '🐾', 'Pet'], ['char', '👤', 'Karakter'], ['zone', '🗺️', 'Wilayah'], ['guild', RANK_ICON, 'VS']];
menu('botNav', HUB.map(([k, ic, n]) => [ic, n, k]));

// ---- Panel menu bawah: Toko, Pet, Karakter, Wilayah, VS (hanya tampilan; data dari profil dan konstanta game) ----
let hubKey = 'shop';
const hex = n => '#' + n.toString(16).padStart(6, '0');
const LOBBY_PET_STAGE = 1;   // pet teman Tois di lobi selalu tampil sebagai tahap 1 (vol 1); tahap 2-3 didapat saat bertempur lewat kartu upgrade
// ---- Fusion pet: jika 2 pet sudah ★MAX, keduanya bisa digabung menjadi satu karakter fusion (menu Pet) ----
// Kunci = dua elemen sesuai urutan ELS (api, air, tanah, angin). Isi n (nama), img (gambar), d (deskripsi) tiap fusion di sini.
const FUSION = {
  'api+air': { n: 'Fusion Api + Air', img: 'assets/pets/fusion_api_air.gif', d: 'Naga berkaki empat hasil peleburan Api dan Air: separuh kristal es, separuh lava.' },
  'api+tanah': { n: 'Fusion Api + Tanah', img: 'assets/pets/fusion_api_tanah.png', d: 'Raung berkaki dua hasil peleburan Api dan Tanah: bersisik kristal biru, berbulu coklat, ekor dan surai menyala lava.' },
  'api+angin': { n: 'Fusion Api + Angin', img: 'assets/pets/fusion_api_angin.png', d: 'Phoenix serigala hasil peleburan Api dan Angin: sayap hitam berujung api, retakan lava di tubuh, ekor menyala.' },
  'air+tanah': { n: 'Fusion Air + Tanah', img: 'assets/pets/fusion_air_tanah.png', d: 'Gabungan kekuatan Air dan Tanah.' },
  'air+angin': { n: 'Fusion Air + Angin', img: 'assets/pets/fusion_air_angin.png', d: 'Gabungan kekuatan Air dan Angin.' },
  'tanah+angin': { n: 'Fusion Tanah + Angin', img: 'assets/pets/fusion_tanah_angin.png', d: 'Griffin berkaki dua hasil peleburan Tanah dan Angin: sayap lebar berbulu coklat, punggung dan ekor bersisik kristal biru.' }
};
const FUSION_NEED = 2;   // jumlah pet ★MAX yang dibutuhkan agar fusion terbuka
const fusionKey = (a, b) => [a, b].sort((x, y) => ELS.indexOf(x) - ELS.indexOf(y)).join('+');
const fusionStoreKey = () => 'petblaster-fusion-' + (profile?.username || 'guest');   // sementara disimpan di perangkat (seperti progres dunia); pindahkan ke server bila perlu
function fusionOwned() { try { return JSON.parse(localStorage.getItem(fusionStoreKey()) || '{}'); } catch (_) { return {}; } }
const maxedPets = () => ELS.filter(el => petStars(el) >= STAR_MAX);
let fusionPick = [];   // dua pet yang sedang dipilih untuk digabung
function fusionImg(k) { const f = FUSION[k], a = k.split('+')[0]; return `<img src="${f.img}" alt="" onerror="this.onerror=null;this.src='assets/pets/${a}3.png'">`; }   // gambar cadangan: evo 3 elemen pertama
function fusionHTML() {
  const maxed = maxedPets(), own = fusionOwned(), open = maxed.length >= FUSION_NEED;
  fusionPick = fusionPick.filter(el => maxed.includes(el));
  const grid = `<div class="evos">${Object.keys(FUSION).map(k => { const [a, b] = k.split('+'), got = own[k]; return `<div class="evo${got ? '' : ' lock'}">${fusionImg(k)}<b>${got ? FUSION[k].n : '???'}</b><small>${ELNAME[a]} + ${ELNAME[b]}</small></div>`; }).join('')}</div>`;
  if (!open) return `<article class="pcard fusion" style="--c:#b784ff"><h4>🔒 Fusion Pet</h4><p>Naikkan ${FUSION_NEED} pet sampai ★${STAR_MAX} (MAX) untuk membuka fusion. Saat ini: <b>${maxed.length}/${FUSION_NEED}</b> pet MAX.</p>${grid}</article>`;
  let res = '<p>Pilih 2 pet MAX yang ingin digabung.</p>';
  if (fusionPick.length === FUSION_NEED) {
    const k = fusionKey(...fusionPick), f = FUSION[k], got = own[k];
    res = `<div class="fres">${fusionImg(k)}<div><b>${f.n}</b><p>${f.d}</p></div></div><button class="btn main" data-fuse ${got ? 'disabled' : ''}>${got ? '✔ Sudah dimiliki' : '✨ Gabungkan'}</button>`;
  }
  return `<article class="pcard fusion" style="--c:#b784ff"><h4>✨ Fusion Pet</h4><p>Fusion terbuka! Pilih dua pet yang sudah ★MAX lalu gabungkan.</p>
    <div class="frow">${maxed.map(el => `<button class="btn alt fpick${fusionPick.includes(el) ? ' on' : ''}" data-fpick="${el}">${ELNAME[el]}</button>`).join('')}</div>${res}<h5>Koleksi fusion</h5>${grid}</article>`;
}
let charShown = false;   // kartu Karakter + pilihan skin disembunyikan sampai tombol ditekan
const HUB_VIEW = {
  pet() {
    const st = LOBBY_PET_STAGE, coins = +profile.progress.coins || 0;
    const info = STAR_PER.map((v, i) => 'Evo ' + (i + 1) + ' +' + Math.round(v * 100) + '%').join(' · ');
    return `<p class="hint">Di lobi, pet menemani Tois sebagai tahap 1. Tahap 2 dan 3 didapat saat bertempur lewat kartu upgrade. Bintang pet bersifat permanen dan menambah damage skill, paling besar di evolusi 2 ke atas.</p>` + ELS.map(el => {
      const s = petStars(el), cost = STAR_COST[s];
      return `
      <article class="pcard" style="--c:${hex(EL[el])}"><h4>${ELNAME[el]}</h4>
        <div class="evos">${[1, 2, 3].map(n => `<div class="evo${n === st ? ' cur' : ''}"><img src="assets/pets/${el}${n}.png" alt=""><b>${EVO[el][n - 1]}</b><small>${SK[el][n - 1].n}</small><em class="stm">×${starMul(el, n).toFixed(2)}</em></div>`).join('')}</div>
        <div class="starrow"><span class="stars" aria-label="Bintang ${s} dari ${STAR_MAX}">${'★'.repeat(s)}${'☆'.repeat(STAR_MAX - s)}</span>${s >= STAR_MAX ? '<b class="smax">MAX</b>' : `<button class="btn main sbtn" data-star="${el}" ${coins < cost ? 'disabled' : ''}>⬆ ★${s + 1} · 🪙 ${cost}</button>`}</div>
        <p class="sinfo">Bonus damage skill per ★: ${info}</p>
        <p>${PET_DESC[el][st - 1]}</p></article>`;
    }).join('') + fusionHTML();
  },
  char() {
    const p = profile.progress, bar = (ic, n, v, max) => `<div class="stat"><i>${ic}</i><span>${n}</span><div class="sbar"><i style="width:${Math.min(100, v / max * 100)}%"></i></div><b>${v}</b></div>`;
    return `<h5>Statistik</h5><div class="stats">${bar('💥', 'Damage', +p.damage, 1000)}${bar('⚡', 'Kecepatan', +p.fire_rate, 10)}${bar('🛡️', 'HP markas', +p.max_hp, 10000)}</div>
      <h5>Senjata & skill</h5>
      <ul class="shoplist">
        <li><i>🔫</i><span><b>Gatling</b>Magasin ${MAG_SIZE} peluru, reload ${RELOAD_MS / 1000} detik. Tahan layar untuk menembak 2x lebih cepat.</span></li>
        <li><i>💥</i><span><b>Badai Peluru</b>Tois +10% damage dan kecepatan tembak selama 10 detik. Cooldown 25 detik.</span></li>
        <li><i>⭐</i><span><b>Level</b>Naik setiap kelipatan 3 gelombang yang dicapai.</span></li>
      </ul>
      <h5>Upgrade Tois</h5>
      <p class="hint">Upgrade berlaku di pertempuran berikutnya.</p>
      <nav class="dock">${UPG.map(([t, ic, n]) => { const full = +p[t] >= UPG_MAX[t], cost = upgCost(t, +p[t]); return `<button data-upgrade="${t}" ${full || +p.coins < cost ? 'disabled' : ''}><i>${ic}</i><span>${n}</span><b class="val">${p[t]}</b><em class="cost">${full ? 'MAX' : '🪙 ' + cost}</em></button>`; }).join('')}</nav>
      <ul class="shoplist">
        <li><i>💥</i><span><b>Damage +5</b>Tiap peluru Tois lebih kuat. Maksimal 1000.</span></li>
        <li><i>⚡</i><span><b>Kecepatan +1</b>Tois menembak lebih sering. Maksimal 10.</span></li>
        <li><i>🛡️</i><span><b>HP markas +10</b>Markas lebih tahan serangan monster. Maksimal 10000.</span></li>
      </ul>
      <button type=\"button\" class=\"btn main\" data-togglechar style=\"width:100%;margin:12px 0\">${charShown ? '🙈 Sembunyikan Karakter' : '👤 Tampilkan Karakter'}</button>
      ${charShown ? `<article class="ccard"><img src="${outfitWorn() === 'base' || outfitHasSkin(outfitWorn()) ? (skinOf(skinWorn()).png || skinOf(skinWorn()).avatar) : outfitImg(outfitWorn())}" alt="Tois" style="object-fit:contain"><div><h4>Tois</h4><span class="tag">Level ${p.level}</span>${outfitWorn() === 'base' || outfitHasSkin(outfitWorn()) ? ` <span class="tag">Skin ${skinOf(skinWorn()).name}</span>` : ` <span class="tag">Outfit ${OUTFITS.find(o => o.id === outfitWorn()).name}</span>`}<p>Penjaga markas yang menembak otomatis dengan gatling.</p></div></article>
      <h5>Skin / Outfit</h5>
      <p class="hint">Pilih tampilan Tois. Berlaku di lobi dan saat bertempur.</p>
      <div class="sknrow">${SKINS.map(k => { const on = k.outfit === outfitWorn(), own = outfitOwned(k.outfit); return `<button type="button" class="skn${on ? ' on' : ''}" data-skin="${k.id}" style="--rc:${k.color}" aria-label="Skin ${k.name}"><img src="${k.png || k.avatar}" alt=""><b>${k.name}</b><em>${k.rarity}</em><small>💥 ${Math.round((skinFx(k.id).dmgMul - 1) * 100) ? '+' + Math.round((skinFx(k.id).dmgMul - 1) * 100) + '% damage' : 'Damage dasar'}</small><i>${on ? '✔ Dipakai' : own ? 'Pakai' : '🔒 Beli di Toko'}</i></button>`; }).join('')}</div>` : ''}`;
  },
  zone() {
    const island = ISLANDS[selectedIsland], unlocked = stageUnlocked(selectedIsland, selectedStage);
    const progress = worldProgress();
    const mapMarkers = [
      { i: 0, x: 43, y: 37, ic: '🌿' }, { i: 1, x: 38, y: 83, ic: '🌊' },
      { i: 2, x: 16, y: 57, ic: '🌋' }, { i: 3, x: 16, y: 17, ic: '🌪️' }
    ].map(m => `<button class="map-pin ${m.i === selectedIsland ? 'selected' : ''}" data-island="${m.i}" style="left:${m.x}%;top:${m.y}%" aria-label="Pilih ${ISLANDS[m.i].name}"><span>${m.ic}</span><b>${ISLANDS[m.i].name}</b></button>`).join('');
    const stageButtons = Array.from({ length: STAGES_PER_ISLAND }, (_, i) => {
      const n = i + 1, ok = stageUnlocked(selectedIsland, n), active = n === selectedStage;
      return `<button class="stage-node ${active ? 'active' : ''} ${ok ? '' : 'locked'}" data-stage="${n}" ${ok ? '' : 'disabled'}><b>${n}</b><small>${(+progress[selectedIsland] || 0) >= n ? (n % 5 === 0 ? '👑' : '') + starStr(stageStars(selectedIsland, n)) : n === STAGES_PER_ISLAND ? '👑 FINAL' : n % 5 === 0 ? '👑 BOS' : 'Stage'}</small></button>`;
    }).join('');
    const monsters = island.pool.map(id => `<div class="monster-detail"><img src="assets/monsters/${MON[id].f}.png"><span><b>${MON[id].n}</b><small>${MON[id].fly ? 'Monster terbang' : MON[id].hp >= 2 ? 'Monster tangguh' : 'Monster biasa'}</small></span></div>`).join('');
    const bossId = getStageBoss(selectedIsland, selectedStage);
    return `<div class="world-map-viewport" id="worldMapViewport"><div class="world-map" id="worldMap" role="group" aria-label="Peta dunia Pet Blaster" style="background-image:url('assets/peta/indonesia maps.jpg')">${mapMarkers}</div></div>
      
      <div class="island-popup-backdrop" id="islandPopup" hidden>
        <article class="island-popup" role="dialog" aria-modal="true" aria-labelledby="islandPopupTitle">
          <header class="island-popup-head"><div><small>WILAYAH TERPILIH</small><h3 id="islandPopupTitle">${island.title}</h3></div><button class="icon" id="closeIslandPopup" aria-label="Tutup detail pulau">✕</button></header>
          <div class="island-popup-content">
            <p class="island-description">${island.desc}</p>
            <p class="island-arena">🗺️ Arena tetap: <b>${ARENAS[island.bg]} (Arena ${island.bg + 1})</b><br><small>Seluruh 25 stage di pulau ini hanya menggunakan arena tersebut.</small></p>
            <div class="island-progress">Progress terbaik: <b>${+progress[selectedIsland] || 0}/25 stage</b> · <b>★ ${islandStars(selectedIsland)}/${STAGES_PER_ISLAND * 3}</b></div>
            <h5>Stage Pulau ${island.name.replace('Pulau ', '')}</h5><div class="stage-grid">${stageButtons}</div>
            <section class="zone-detail"><h4>📍 ${island.name} — Stage ${selectedStage}</h4><p class="hint">${wavesFor(selectedStage)} wave${selectedStage >= STAGES_PER_ISLAND ? ' · STAGE FINAL' : ''} · Pengali kekuatan monster ×${difficultyOf(selectedIsland, selectedStage).toFixed(2)}.</p><p class="hint">★ Bintang: menang = 1, sisa HP markas ≥ ${Math.round(STAR_RULES.two * 100)}% = 2, ≥ ${Math.round(STAR_RULES.three * 100)}% = 3. Ditampilkan di tiap stage yang sudah ditaklukkan.</p>
            <h5>Monster di pulau ini</h5><div class="monster-grid">${monsters}</div>
            <div class="boss-detail"><img src="assets/monsters/${MON[bossId].f}.png"><div><b>👑 ${selectedStage >= STAGES_PER_ISLAND ? 'Boss Final' : 'Boss Stage ' + selectedStage}: ${MON[bossId].n}</b><small>Elemen: ${island.bossElements.join(' / ')}. ${gemReward(selectedIsland, selectedStage) ? '💎 Hadiah gem: <b>' + gemReward(selectedIsland, selectedStage) + '</b> ' + (gemClaimed(selectedIsland, selectedStage) ? '(sudah kamu ambil)' : '(didapat sekali, saat stage ini dimenangkan)') + '. ' : ''}${selectedStage < 25 ? 'Dipilih bergiliran dari roster Boss yang cocok dengan elemen pulau. Muncul pada wave 5 dan wave 10.' : 'Stage final: 15 wave. Elite muncul di wave 3, 6, dan 9, lalu Boss Final di wave 15 dengan HP dan ukuran lebih besar.'}</small></div></div>
            <button class="btn main zone-play" id="zonePlay" ${unlocked ? '' : 'disabled'}>⚔️ Mulai Stage ${selectedStage}</button>
            </section>
          </div>
        </article>
      </div>`;
  },
  guild() {   // key 'guild' dipertahankan agar cocok dengan <div id="v-guild"> di HTML; isinya sekarang menu VS
    const ico = { '1v1': '⚔️', '2vbot': '🤖', '2v2': '🛡️', '1vbot': '🧪' };
    const desc = {
      '1v1': 'Duel satu lawan satu. Satu pemain menyerang, satu lagi menahan.',
      '2vbot': 'Berdua melawan tim bot. Peran diundi: tim kamu menyerang atau menahan.',
      '2v2': 'Dua pemain melawan dua pemain. Satu tim menyerang, tim lain menahan.',
      '1vbot': 'Uji gameplay: kamu melawan bot. Peran diundi, lalu bertukar di babak kedua.'
    };
    const roleRow = (mode, role) => `<li><i>${role === VS_ROLE.ATTACK ? '🗡️' : '🏰'}</i><span><b>${VS_ROLE_NAME[role]}</b>${vsArenaFor(mode, role).name}</span></li>`;
    return Object.keys(VS_MODES).map(k => `<article class="gcard"><i>${ico[k]}</i><h4>${VS_MODES[k].name}</h4><p>${desc[k]}</p>
      <ul class="shoplist">${roleRow(k, VS_ROLE.ATTACK)}${roleRow(k, VS_ROLE.DEFEND)}</ul>
      <div class="row"><button type="button" class="btn main" data-vs="${k}" data-vsname="${VS_MODES[k].name}">${VS_MODES[k].test ? '🧪 ' : ''}Mulai ${VS_MODES[k].name}</button></div><small>${VS_MODES[k].test ? 'Mode uji gameplay: hadiah tidak disimpan.' : 'Mode ' + VS_MODES[k].name + ' segera hadir.'}</small></article>`).join('')
      + `<h5>Aturan main</h5>
      <ul class="shoplist">
        <li><i>🎲</i><span><b>Peran diundi</b>Satu sisi penyerang, satu sisi penahan. Babak 2 peran ditukar.</span></li>
        <li><i>🏰</i><span><b>Penahan</b>Menembaki monster yang datang. Arena penahan, atau arena penahan tim bila berdua.</span></li>
        <li><i>🗡️</i><span><b>Penyerang</b>Tidak menembak; mengatur monster yang dikirim. Selalu memakai arena penyerang.</span></li>
        <li><i>🃏</i><span><b>Kartu monster</b>Satu babak = ${VS_WAVES} wave. Tiap wave muncul ${VS_HAND} kartu berbeda; kamu punya ${VS_PICKS} kesempatan memilih kartu dan mengatur jumlah tiap kartu.</span></li>
        <li><i>⏱️</i><span><b>Waktu ${VS_PLAN_SEC} detik</b>Waktu mengatur serangan tiap wave. Habis waktu, monster terkirim otomatis.</span></li>
        <li><i>❤️</i><span><b>HP monster</b>Setara HP monster di pulau terakhir yang dikunjungi penahan.</span></li>
        <li><i>👹</i><span><b>${VS_BUDGET.total} monster per babak</b>Termasuk ${VS_BUDGET.elite} elite dan ${VS_BUDGET.boss} bos. Kartu elite dan bos muncul mulai wave ${VS_SPECIAL_FROM}.</span></li>
        <li><i>🐾</i><span><b>Maksimal ${VS_RULES.maxPets} pet</b>Penahan hanya boleh memanggil ${VS_RULES.maxPets} karakter pet per babak. Setelah itu kartu "Panggil" tidak muncul lagi.</span></li>
        <li><i>🏆</i><span><b>Cara menang</b>Benteng penahan hancur dalam satu babak = penyerang menang total. Bila bertahan, lanjut babak 2. Setelah 2 babak, sisa HP benteng terbanyak menang; bila sama, dilihat monster yang sampai ke tembok lalu seberapa jauh monster sempat maju.</span></li>
      </ul>`;
  }
};
async function wearSkin(id) {   // pakai skin Tois; skin = outfit Toko, jadi hanya yang sudah dimiliki. Lobi dibangun ulang saat menu ditutup
  const k = skinOf(id);
  if (!outfitOwned(k.outfit)) { say('Skin ' + k.name + ' belum dimiliki. Beli dulu di Toko (Dika).'); return; }
  try { applyShop(await api('/outfit/wear', 'POST', { id: k.outfit })); outfitLobbyDirty = true; say('Skin ' + k.name + ' dipakai.'); }
  catch (err) { say(err.message); }
  renderHub('char');
}
function renderHub(key = hubKey) {
  hubKey = key; const t = HUB.find(h => h[0] === key);
  if (key === 'shop') resetShopMenu();
  $('hubTitle').textContent = t[2];
  document.querySelectorAll('.hview').forEach(v => { v.hidden = v.id !== 'v-' + key; });
  if (HUB_VIEW[key] && profile) {
    $('v-' + key).innerHTML = HUB_VIEW[key]();
    if (key === 'guild') {   // menu VS: hanya mode uji (1 vs Bot) yang sudah bisa dimainkan; sisanya memberi info
      $('v-guild').querySelectorAll('[data-vs]').forEach(b => b.onclick = () => VS_MODES[b.dataset.vs].test ? startVsMatch(b.dataset.vs) : say('Mode ' + b.dataset.vsname + ' segera hadir.'));
    }
    if (key === 'char') {
      $('v-char').querySelectorAll('[data-togglechar]').forEach(b => b.onclick = () => { charShown = !charShown; renderHub('char'); });
      $('v-char').querySelectorAll('[data-skin]').forEach(b => b.onclick = () => wearSkin(b.dataset.skin));
      $('v-char').querySelectorAll('[data-upgrade]').forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await api('/upgrade', 'POST', { type: b.dataset.upgrade }); say('Upgrade berhasil! Berlaku di pertempuran berikutnya.'); } catch (err) { say(err.message); }
        try { await refreshProfile(); } catch (err) { console.error(err); }
      });
    }
    if (key === 'pet') {
      $('v-pet').querySelectorAll('[data-star]').forEach(b => b.onclick = async () => {
        b.disabled = true;
        try { await api('/pet/star', 'POST', { el: b.dataset.star }); say('Bintang pet naik! Tersimpan permanen.'); } catch (err) { say(err.message); }
        try { await refreshProfile(); } catch (err) { console.error(err); }
      });
      $('v-pet').querySelectorAll('[data-fpick]').forEach(b => b.onclick = () => {
        const el = b.dataset.fpick;
        fusionPick = fusionPick.includes(el) ? fusionPick.filter(x => x !== el) : [...fusionPick, el].slice(-FUSION_NEED);   // pilihan ke-3 menggantikan yang paling lama
        renderHub('pet');
      });
      const fuse = $('v-pet').querySelector('[data-fuse]');
      if (fuse) fuse.onclick = () => {
        const k = fusionKey(...fusionPick), o = fusionOwned(); o[k] = 1;
        try { localStorage.setItem(fusionStoreKey(), JSON.stringify(o)); } catch (_) { }
        say('Fusion berhasil: ' + FUSION[k].n + '!'); renderHub('pet');
      };
    }
    if (key === 'zone') {
      const view = $('v-zone');
      const popup = view.querySelector('#islandPopup');
      view.querySelectorAll('[data-island]').forEach(b => b.onclick = () => { selectedIsland = +b.dataset.island; selectedStage = 1; renderHub('zone'); $('islandPopup').hidden = false; });
      view.querySelectorAll('[data-stage]').forEach(b => b.onclick = () => { selectedStage = +b.dataset.stage; renderHub('zone'); $('islandPopup').hidden = false; });
      const close = view.querySelector('#closeIslandPopup'); if (close) close.onclick = () => { popup.hidden = true; };
      popup?.addEventListener('click', e => { if (e.target === popup) popup.hidden = true; });
      const play = $('zonePlay'); if (play) play.onclick = () => { $('hub').hidden = true; startBattle(); };
      const map = view.querySelector('#worldMap'), viewport = view.querySelector('#worldMapViewport');
      if (map && viewport) {
        viewport.scrollLeft = Math.min(120, Math.max(0, viewport.scrollWidth - viewport.clientWidth));
        let down = false, x = 0, y = 0, sx = 0, sy = 0, moved = false;
        map.onpointerdown = e => { if (e.target.closest('.map-pin')) return; down = true; moved = false; x = e.clientX; y = e.clientY; sx = viewport.scrollLeft; sy = viewport.scrollTop; map.setPointerCapture(e.pointerId); };
        map.onpointermove = e => { if (down) { const dx = e.clientX - x, dy = e.clientY - y; if (Math.abs(dx) + Math.abs(dy) > 4) moved = true; viewport.scrollLeft = sx - dx; viewport.scrollTop = sy - dy; } };
        map.onpointerup = map.onpointercancel = () => { down = false; };
      }
    }
  }
  document.querySelectorAll('#hubTabs button').forEach(b => b.classList.toggle('on', b.dataset.k === key));
}
let hubOpenSnap = '';   // pulau/stage saat hub dibuka; dipakai untuk menentukan perlu tidaknya lobi dibangun ulang
function openHub(key) { charShown = false; setLobbyGifHidden(true); hubOpenSnap = selectedIsland + '-' + selectedStage; $('hub').hidden = false; $('hubBody').scrollTop = 0; renderHub(key); }
$('hubTabs').innerHTML = HUB.map(([k, ic, n]) => `<button data-k="${k}"><i>${ic}</i><span>${n}</span></button>`).join('');
$('hubTabs').onclick = e => { const b = e.target.closest('button'); if (b) { $('hubBody').scrollTop = 0; renderHub(b.dataset.k); } };
$('hubClose').onclick = () => {
  $('hub').hidden = true; setLobbyGifHidden(false);
  if (hubOpenSnap !== selectedIsland + '-' + selectedStage || outfitLobbyDirty) { outfitLobbyDirty = false; refreshLobbyScene(); }   // restart hanya bila pulau/stage berubah (hindari kedip biru)
  else updateLobbyInfo();
};
$('startBtn').onclick = startBattle;
$('quitBtn').onclick = toLobby; $('lobbyBtn').onclick = toLobby;

// ---- Tois di lobi: GIF transparan sebagai elemen <img> di atas canvas Phaser (Phaser tidak bisa memutar GIF). Posisi & ukuran mengikuti skala canvas (mode FIT). ----
// Hanya dipakai bila skin punya field gif; bila GIF gagal dimuat otomatis kembali ke spritesheet. Letak: tengah x = W/2, telapak kaki y = LOBBY_FEET, tinggi 118 (sama seperti sprite lama).
const LOBBY_FEET = 390;
let lobbyGifEl = null, lobbyGifSk = null;
function placeLobbyGif() {
  if (!lobbyGifEl || !lobbyGifSk || !game || !game.canvas) return;
  const cv = game.canvas, s = cv.clientWidth / W, I = lobbyGifSk.idle, h = 118 * s, w = h * I.fw / I.fh;
  Object.assign(lobbyGifEl.style, { left: (cv.offsetLeft + W / 2 * s - lobbyGifSk.idleOX * w) + 'px', top: (cv.offsetTop + LOBBY_FEET * s - h) + 'px', width: w + 'px', height: h + 'px' });
}
function hideLobbyGif() {
  if (lobbyGifEl) { lobbyGifEl.remove(); lobbyGifEl = null; }
  if (game && game.scale) game.scale.off('resize', placeLobbyGif);
}
function showLobbyGif(sk, fallback) {
  hideLobbyGif(); lobbyGifSk = sk;
  const box = $('game-container'); if (getComputedStyle(box).position === 'static') box.style.position = 'relative';
  const im = document.createElement('img'); im.src = sk.gif; im.alt = ''; im.draggable = false;
  im.style.cssText = 'position:absolute;pointer-events:none;user-select:none;z-index:1';
  im.onerror = () => { console.error('[LOBI] GIF gagal dimuat, pakai spritesheet:', sk.gif); hideLobbyGif(); fallback(); };
  box.appendChild(im); lobbyGifEl = im;
  game.scale.on('resize', placeLobbyGif); placeLobbyGif(); requestAnimationFrame(placeLobbyGif);
}
window.addEventListener('resize', placeLobbyGif);
const setLobbyGifHidden = hide => { if (lobbyGifEl) lobbyGifEl.style.display = hide ? 'none' : ''; };   // disembunyikan saat menu hub terbuka

class Lobby extends Base {
  constructor() { super('Lobby'); }
  create() {
    this.makeTextures();
    // Latar lobi: gerbang kastil (bos), jembatan, panggung kayu (karakter), lantai batu (tombol). Gambar 1570x2576 (rasio sama dengan kanvas 390x640): gerbang kastil rusak (bos), panggung kayu y~345-393 (karakter), lantai batu (tombol).
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
    const glow = this.add.image(W / 2, 340, 'glow').setScale(3.4, 1.7).setAlpha(.3).setBlendMode(Phaser.BlendModes.ADD).setDepth(-800);
    this.tweens.add({ targets: glow, alpha: .18, duration: 2200, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    const FEET = 390, PFEET = 386;                                  // garis pijak di papan panggung
    this.add.image(W / 2, FEET - 3, 'shadow').setScale(1.1).setAlpha(.9);
    const st = LOBBY_PET_STAGE;   // selalu pet tahap 1
    const PX = [52, 110, 250, 308].map(x => x + OX);   // tata letak lama (lebar 360) digeser ke tengah
    const pets = ELS.map((el, i) => { this.add.image(PX[i], PFEET - 2, 'shadow').setScale(.7).setAlpha(.8); return this.add.sprite(PX[i], PFEET, 'pet_' + el + st).setOrigin(.5, this.petOrigin('pet_' + el + st)).setScale(petScale(el, st)).play({ key: 'pet_' + el + st + '_idle', startFrame: i * 2 }); });
    const wo = outfitWorn(), sk = skinOf(skinWorn());
    if (wo !== 'base' && !outfitHasSkin(wo) && this.textures.exists('outfit_' + wo)) {   // outfit yang dibeli: gambar penuh, bernapas pelan (ganti dengan spritesheet bila sudah ada animasinya)
      const src = this.textures.get('outfit_' + wo).getSourceImage(), sc = Math.min(138 / src.height, 170 / src.width);
      const im = this.add.image(W / 2, FEET + 2, 'outfit_' + wo).setOrigin(.5, 1).setScale(sc);
      im.setOrigin(.5, 1);   // gerak buatan (gambar diam): napas (tinggi naik-turun), melayang, dan goyang tipis
      this.tweens.add({ targets: im, scaleY: sc * 1.035, scaleX: sc * .985, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: im, y: im.y - 4, duration: 1700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
      this.tweens.add({ targets: im, angle: { from: -1.2, to: 1.2 }, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
    } else {   // Tois idle sesuai skin yang dipakai: GIF transparan bila ada (sk.gif), jika tidak spritesheet webp
      const makeSheet = () => {
        try {
          const ik = skinIdleKey(sk), ak = 'tois_idle_loop_' + sk.id;
          if (!this.textures.exists(ik)) throw new Error('tekstur idle belum termuat: ' + sk.idle.src);
          const total = this.textures.get(ik).frameTotal - 1;   // frameTotal ikut menghitung frame __BASE
          if (total < 2) throw new Error('sheet idle hanya terbaca ' + total + ' frame, cek ukuran frame ' + sk.idle.fw + 'x' + sk.idle.fh + ' vs ukuran file: ' + sk.idle.src);
          if (!this.anims.exists(ak)) this.anims.create({ key: ak, frames: this.anims.generateFrameNumbers(ik, { start: 0, end: Math.min(sk.idle.frames, total) - 1 }), frameRate: sk.idle.fps, repeat: -1 });
          this.add.sprite(W / 2, FEET, ik).setOrigin(sk.idleOX, 1).setScale(118 / sk.idle.fh).play(ak);
        } catch (err) { console.error('[LOBI] idle Tois gagal:', err.message); }
      };   // jangan sampai lobi macet di layar pemuatan
      if (sk.gif) { showLobbyGif(sk, makeSheet); this.events.once('shutdown', hideLobbyGif); } else makeSheet();
    }
    // bos berdiri di depan gerbang
    const bossId = getStageBoss(selectedIsland, selectedStage), bs = 118 / SPR['mon' + bossId].ih, boss = this.add.sprite(W / 2 + 10, 160, 'mon' + bossId).setScale(bs).play('mon' + bossId + '_move');   // golem lava animasi (langkah, lengan, api)
    this.add.particles(W / 2 + 10, 108, 'spark', { x: { min: -40, max: 40 }, speedY: { min: -120, max: -45 }, speedX: { min: -22, max: 22 }, lifespan: 900, scale: { start: 1.5, end: 0 }, tint: [0xff7a2e, 0xffc233, 0xff4d2e], frequency: 38, blendMode: 'ADD' });
    // pintu kayu jebol di depan bos: bos tampak berdiri di balik pintu (potongan dari lobby.jpg, posisi piksel bbox 535,590 ukuran 580x412 pada gambar 1570 lebar)
    const K = 1570 / 390;
    this.add.image(535 / K, 590 / K, 'lobby_door').setOrigin(0, 0).setDisplaySize(580 / K, 412 / K).setDepth(2);
    // daun yang melayang dan debu cahaya
    this.add.particles(0, 0, 'leaf', { x: { min: -20, max: W }, y: -10, speedX: { min: 12, max: 38 }, speedY: { min: 20, max: 40 }, rotate: { start: 0, end: 360 }, lifespan: 9000, scale: { start: 1, end: .7 }, alpha: { start: .95, end: .25 }, tint: [0x8fd36a, 0xc8e07a, 0xf2c14e, 0x6fbf5a], frequency: 1400 }).setDepth(900);
    this.add.particles(0, 0, 'spark', { x: { min: 0, max: W }, y: { min: 250, max: 640 }, speedY: { min: -40, max: -15 }, lifespan: 3000, scale: { start: .5, end: 0 }, alpha: { start: .7, end: 0 }, tint: 0xffe3b8, frequency: 160 });
    hideLoading();   // lobi sudah tergambar penuh, buka layar pemuatan
  }
}

// Selagi pemain masih di halaman login, unduh aset game di latar belakang (sedikit demi sedikit) agar masuk lobi tidak menunggu lama.
function prefetchAssets() {
  const urls = [FUSION_ZONE.src, FUSION_LASER.src, 'assets/backgrounds/lobby.jpg?v=2', 'assets/backgrounds/lobby_door.png?v=1', 'assets/backgrounds/toko.jpg', 'assets/characters/dika.webp', TOIS_IDLE.src, BATTLE_HERO_SRC];
  Object.keys(MON).forEach(i => { const s = SPR['mon' + i]; if (s) urls.push('assets/' + s.file); });
  ELS.forEach(el => [1, 2, 3].forEach(n => { const s = SPR['pet_' + el + n]; if (s) urls.push('assets/' + s.file); }));
  ['fire_slash.png', 'fire_orb.png', 'ice_arrow.png', 'ice_freeze.png', 'water_fx.png', 'wind_blade.png?v=w2', 'wind_tornado.png?v=w3',
    'earth_hole.png?v=t1', 'earth_ball.png?v=t2', 'earth_crystal.png?v=t3', 'fire_lava_claw.png', 'fire_crater.webp?v=1'].forEach(f => urls.push('assets/pet-actions/' + f));
  const next = () => { const u = urls.shift(); if (!u) return; fetch(u).catch(() => { }).finally(next); };   // maksimal 3 unduhan bersamaan
  setTimeout(() => { next(); next(); next(); }, 800);
}

// Jika sesi login masih aktif (mis. halaman dimuat ulang), langsung masuk game dan tutup halaman login.
enterGame().catch(() => { $('authPanel').hidden = false; $('gamePanel').hidden = true; prefetchAssets(); });