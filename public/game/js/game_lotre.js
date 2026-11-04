// Lotre Tarik (pull-tab) di menu Toko (Dika). Dimuat SEBELUM game_ui.js (lihat daftar modul di game.js).
// Cara main: papan berisi LOTRE.cols kolom segitiga. Tiap segitiga menyembunyikan satu nomor (1-32), nomor itu = hadiah di kotak nomor bagian atas papan.
// Pemain memilih satu segitiga, menekan Tarik, bayar LOTRE.price koin. Segitiga terbuka menjadi kertas bernomor. Jika semua segitiga sudah dibuka, papan baru dikocok otomatis.
// Papan, hadiah, dan koin/gem disimpan di DATABASE (tabel game_lotre_boards; server: ShopApi::lotrePull + Libraries/Shop.php). Papan tidak lagi diacak ulang tiap dibuka / ganti perangkat: sisa tiket terus berkurang dari 80 sampai 0, baru dikocok papan baru.
// Tabel hadiah di bawah hanya untuk TAMPILAN; hadiah & harga asli ada di Shop.php (harus sama). Susunan papan rahasia di server; game hanya tahu nomor segitiga yang sudah dibuka.
// Fungsi dari game_ui.js (say, fmtID, syncCoinsUI, goodbyeStore, noodleStore, GOODBYE, NOODLE) hanya dipakai saat dipanggil, jadi urutan muat tidak masalah.

// ---- Tabel hadiah: n = nomor kotak, stock = berapa segitiga di papan yang menyimpan nomor ini, t = jenis hadiah:
//   'coin' (amt koin) | 'gem' (amt gem) | 'goodbye' (amt gelas) | 'noodle' (id: 'biasa' | 'double' | 'telur', amt mangkuk) | 'skin' (id outfit, gems = nilai dalam gem, dup = gem pengganti bila skin sudah dimiliki).
// Total stock = jumlah segitiga di papan (sekarang 80 = 8 kolom x 10). Ubah angka di sini untuk menyetel hadiah; papan lama otomatis dikocok ulang bila tabel berubah.
// gemValue = perkiraan nilai 1 gem dalam koin, HANYA untuk warna kotak & hitungan RTP di console (tidak mempengaruhi game). Skin Epic hanya bisa didapat di sini (di Toko masih soon).
const LOTRE_C = (n, amt, stock) => ({ n, t: 'coin', amt, stock });
const LOTRE_G = (n, amt, stock) => ({ n, t: 'gem', amt, stock });
const LOTRE = {
  name: 'Lotre Tarik', price: 250, cols: 8, gemValue: 30,
  prizes: [
    // 1-6: kotak besar (hadiah utama), tiap nomor hanya 1 segitiga
    { n: 1, t: 'skin', id: 'epic', gems: 150, dup: 75, stock: 1 }, LOTRE_G(2, 50, 1),
    { n: 3, t: 'noodle', id: 'telur', amt: 1, stock: 1 }, LOTRE_G(4, 25, 1),
    { n: 5, t: 'goodbye', amt: 2, stock: 1 }, LOTRE_C(6, 750, 1),
    // 7-16: kotak kecil
    LOTRE_C(7, 50, 3), LOTRE_C(8, 50, 3), LOTRE_C(9, 75, 3), LOTRE_C(10, 75, 3), LOTRE_C(11, 100, 3),
    LOTRE_C(12, 100, 3), LOTRE_G(13, 3, 3), LOTRE_G(14, 5, 3), LOTRE_C(15, 125, 3), LOTRE_C(16, 150, 3),
    // 17-24
    LOTRE_C(17, 50, 3), LOTRE_C(18, 50, 3), LOTRE_C(19, 75, 3), LOTRE_C(20, 75, 3),
    LOTRE_C(21, 100, 3), LOTRE_G(22, 3, 3), LOTRE_G(23, 5, 3), LOTRE_C(24, 150, 3),
    // 25-32
    LOTRE_C(25, 50, 3), LOTRE_C(26, 75, 3), LOTRE_C(27, 100, 3), LOTRE_C(28, 100, 3),
    LOTRE_G(29, 4, 3), LOTRE_C(30, 200, 3), LOTRE_C(31, 300, 1), { n: 32, t: 'goodbye', amt: 1, stock: 1 }
  ]
};
const LOTRE_BY_N = Object.fromEntries(LOTRE.prizes.map(z => [z.n, z]));
const LOTRE_TOTAL = LOTRE.prizes.reduce((a, z) => a + z.stock, 0);
const LOTRE_ROWS = Math.ceil(LOTRE_TOTAL / LOTRE.cols);
const LOTRE_LAYOUT = [[1, 6], [7, 16], [17, 24], [25, 32]];   // baris kotak nomor di atas papan: [nomor awal, nomor akhir]
const lotreVal = z => z.t === 'coin' ? z.amt : z.t === 'gem' ? z.amt * LOTRE.gemValue : z.t === 'skin' ? z.gems * LOTRE.gemValue : z.t === 'goodbye' ? z.amt * GOODBYE.price : z.amt * NOODLE.price;   // nilai dalam koin (hanya untuk warna kotak & RTP)
const lotreSkin = z => (typeof SKINS !== 'undefined' && SKINS.find(k => k.outfit === z.id)) || null;
const lotreSkinName = z => (OUTFITS.find(o => o.id === z.id) || { name: z.id }).name;
const lotreName = z => z.t === 'coin' ? fmtID(z.amt) + ' koin' : z.t === 'gem' ? fmtID(z.amt) + ' gem' : z.t === 'skin' ? 'Skin ' + lotreSkinName(z) : z.t === 'goodbye' ? 'Goodbye ×' + z.amt : NOODLE.items.find(x => x.id === z.id).name + ' ×' + z.amt;
const lotreEmoji = z => ({ coin: '🪙', gem: '💎', skin: '👑', goodbye: '🥤', noodle: '🍜' })[z.t];
const lotreText = z => lotreEmoji(z) + ' ' + lotreName(z);
const lotreCap = z => z.t === 'coin' ? '🪙' + (z.amt >= 1000 ? z.amt / 1000 + 'K' : z.amt) : z.t === 'gem' ? '💎' + z.amt : z.t === 'skin' ? '👑' + lotreSkinName(z) : lotreEmoji(z) + '×' + z.amt;
const lotreImg = z => { if (z.t === 'goodbye') return GOODBYE.icon; if (z.t === 'noodle') return NOODLE.items.find(x => x.id === z.id).img; if (z.t === 'skin') { const k = lotreSkin(z); return k ? (k.png || k.avatar) : outfitImg(z.id); } return ''; };
// Peluang kembali ke pemain (RTP) = total nilai hadiah / total harga semua segitiga. Cek di console; sesuaikan hadiah atau gemValue bila perlu.
console.log('[LOTRE] ' + LOTRE_TOTAL + ' segitiga, harga ' + LOTRE.price + ' koin, RTP ≈ ' + (LOTRE.prizes.reduce((a, z) => a + z.stock * (z.t === 'coin' ? z.amt : z.t === 'gem' ? z.amt * LOTRE.gemValue : z.t === 'skin' ? z.gems * LOTRE.gemValue : z.t === 'goodbye' ? z.amt * 500 : z.amt * 1000), 0) / (LOTRE_TOTAL * LOTRE.price) * 100).toFixed(1) + '% (1 gem = ' + LOTRE.gemValue + ' koin, Goodbye 500, Mie Kari 1000)');

// ---- Status papan (dari server, profile.lotre) ----
// torn = indeks segitiga yang sudah dibuka; board[i] = nomor di segitiga itu (hanya yang sudah dibuka yang diketahui game); renewed = papan baru baru saja dikocok.
function lotreStore() {
  const o = profile?.lotre || {}, board = [], torn = [];
  (Array.isArray(o.torn) ? o.torn : []).forEach(([i, n]) => { if (Number.isInteger(i) && LOTRE_BY_N[n]) { board[i] = n; torn.push(i); } });
  return { board, torn, rounds: +o.rounds || 0, last: o.last || null, renewed: !!o.renewed };
}

// ---- Tarik tiket ----
let lotreSel = -1, lotreBusy = false, lotreList = false;   // lotreList = daftar hadiah sedang dibuka
async function lotrePull(i) {   // minta server: bayar + buka segitiga ke-i + beri hadiah. Balas { n, z, dup, gemGain } atau null bila gagal
  const coins = +profile?.progress?.coins || 0;
  if (!(i >= 0 && i < LOTRE_TOTAL) || lotreStore().torn.includes(i)) return null;
  if (coins < LOTRE.price) { say('Koin tidak cukup untuk menarik tiket (🪙 ' + fmtID(LOTRE.price) + ').'); return null; }
  try {
    const d = await api('/lotre/pull', 'POST', { i });
    applyShop(d);   // koin, gem, barang, skin, dan papan terbaru dari server
    if (d.renewed) profile.lotre.renewed = true;
    return { n: d.n, z: LOTRE_BY_N[d.n], dup: !!d.dup, gemGain: +d.gemGain || 0 };
  } catch (err) { say(err.message); return null; }
}

// ---- Tampilan ----
(() => {
  // Semua aturan memakai awalan #v-shop #shopPanel.lotre (2 id) agar menang atas aturan umum game.css
  // ("#v-shop .shopmenu button", "#v-shop .shopmenu .shoppanel") yang kalau tidak ditimpa membuat tombol & panel berantakan.
  // Ukuran memakai cqw (lebar bingkai game) karena panel Toko hanya selebar +-45% layar.
  const P = '#v-shop #shopPanel.lotre', HW = '"Segoe Print","Bradley Hand","Chalkboard SE","Comic Sans MS",cursive', GOLDBTN = 'background:linear-gradient(#ffe27a,#f5a623);color:#3a2400;font-weight:800';
  const R = {
    '': 'position:relative;display:flex;flex-direction:column;flex:1;gap:1.6cqw;padding:1.6cqw;overflow-x:hidden;overflow-y:auto;background:linear-gradient(180deg,#2b1d4a,#1d1330);color:#fff;border-radius:2.4cqw',
    '.ltlock': 'overflow:hidden',
    ' button': 'display:block;flex:none;width:auto;max-height:none;margin:0;padding:0;border:0;border-radius:0;background:none;color:inherit;font:inherit;text-align:center;cursor:pointer',
    ' .lthead': 'display:flex;align-items:center;gap:1.6cqw',
    ' .lthead h4': 'margin:0;font-size:4cqw;line-height:1.1;color:#ffd34d',
    ' .lthead p': 'margin:.3cqw 0 0;font-size:2.8cqw;opacity:.85',
    ' .ltleft': 'margin-left:auto;padding:.4cqw 2cqw;border-radius:2cqw;background:rgba(255,255,255,.1);text-align:center;font-size:2.6cqw;line-height:1.15',
    ' .ltleft b': 'display:block;font-size:3.8cqw;color:#ffd34d',
    ' .ltboard': 'display:flex;flex-direction:column;gap:1.3cqw;padding:2cqw 1.6cqw 1.4cqw;border:.7cqw solid #7a2a12;border-radius:2.4cqw;background:linear-gradient(180deg,#ea7a43,#c84c2c);box-shadow:0 .8cqw 0 rgba(0,0,0,.4),inset 0 0 0 .5cqw #f2b13d',
    ' .ltrow': 'display:grid;gap:.9cqw',
    ' .ltrow.r6': 'grid-template-columns:repeat(6,minmax(0,1fr))',
    ' .ltrow.r10': 'grid-template-columns:repeat(10,minmax(0,1fr));gap:.5cqw',
    ' .ltrow.r8': 'grid-template-columns:repeat(8,minmax(0,1fr))',
    ' .lttile': 'position:relative;display:flex;align-items:center;justify-content:center;min-width:0;border:.4cqw solid #7a2a12;border-radius:1.4cqw;background:linear-gradient(180deg,#fffaf0,#efe2cc);color:#5a1a1a;box-shadow:0 .5cqw 0 #a8744a;font-family:' + HW,
    ' .lttile b': 'display:block;margin:0;line-height:1;font-weight:700',
    ' .r6 .lttile': 'height:7.6cqw', ' .r6 .lttile b': 'font-size:4.4cqw',
    ' .r10 .lttile': 'height:5.6cqw;border-width:.3cqw;border-radius:1cqw', ' .r10 .lttile b': 'font-size:2.8cqw',
    ' .r8 .lttile': 'height:6.6cqw', ' .r8 .lttile b': 'font-size:3.6cqw',
    ' .lttile.big': 'border-color:#d99a14;background:linear-gradient(180deg,#fff6c8,#ffe08a);box-shadow:0 .5cqw 0 #b27a10,0 0 1.6cqw rgba(255,211,77,.8)',
    ' .lttile.out': 'opacity:.35;filter:grayscale(.7)',
    ' .lttile.hit': 'z-index:3;outline:.7cqw solid #fff;outline-offset:.2cqw;animation:lthit .9s ease-in-out 3',
    ' .ltcols': '--h:5.6cqw;--st:calc(var(--h)*.56);display:grid;grid-template-columns:repeat(8,minmax(0,1fr));gap:.9cqw;padding-top:.4cqw',
    ' .ltcol': 'display:flex;flex-direction:column;padding-bottom:calc(var(--h) - var(--st))',
    ' .ltcell': 'position:relative;height:var(--st)',
    ' .lttab': 'position:absolute;left:0;top:0;width:100%;height:var(--h);background:#7a2a12;clip-path:polygon(0 0,100% 0,50% 100%);-webkit-tap-highlight-color:transparent;transition:transform .12s',
    ' .lttab::before': 'content:"";position:absolute;inset:.5cqw .7cqw 1.2cqw;background:linear-gradient(180deg,#ffdc62,#f0a41f);clip-path:polygon(0 0,100% 0,50% 100%)',
    ' .lttab.sel': 'z-index:99!important;transform:translateY(-1cqw) scale(1.15);background:#fff',
    ' .lttab.sel::before': 'background:linear-gradient(180deg,#fff,#ff8fa3);animation:ltsel .7s ease-in-out infinite alternate',
    ' .lttab.tear': 'z-index:99!important;pointer-events:none;animation:lttear .45s ease-in forwards',
    ' .ltpaper': 'position:absolute;z-index:60;inset:.2cqw .7cqw;display:flex;align-items:center;justify-content:center;border:.25cqw solid #a8744a;border-radius:.8cqw;background:#fff6e5;color:#5a1a1a;font:700 2.7cqw/1 ' + HW,
    ' .ltpaper.big': 'background:#ffe08a;border-color:#d99a14',
    ' .ltpaper.new': 'outline:.5cqw solid #fff;animation:lthit .9s ease-in-out 2',
    ' .ltinfo': 'margin:0;min-height:2.6em;text-align:center;font-size:2.9cqw;line-height:1.3;opacity:.95',
    ' .ltinfo b': 'color:#ffd34d',
    ' .ltlisttoggle': 'width:100%;padding:1.4cqw;border-radius:2cqw;background:rgba(255,255,255,.1);font-size:2.8cqw;font-weight:700',
    ' .ltlist': 'display:grid;grid-template-columns:1fr 1fr;gap:.9cqw',
    ' .ltrw': 'display:flex;align-items:center;gap:1cqw;min-width:0;padding:.9cqw 1.3cqw;border-radius:1.4cqw;background:rgba(255,255,255,.08);font-size:2.7cqw;line-height:1.1;white-space:nowrap',
    ' .ltrw b': 'min-width:3.2cqw;color:#ffd34d;text-align:right',
    ' .ltrw span': 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis',
    ' .ltrw em': 'font-style:normal;font-size:.9em;opacity:.7',
    ' .ltrw.big': 'box-shadow:inset 0 0 0 .3cqw #d99a14',
    ' .ltrw.out': 'opacity:.35',
    ' .ltbar': 'position:sticky;bottom:-1.6cqw;z-index:5;flex:none;margin:0 -1.6cqw;padding:1.6cqw;background:#1d1330;box-shadow:0 -1.4cqw 1.6cqw -.4cqw #1d1330',
    ' .ltgo': 'width:100%;padding:2.6cqw 1cqw;border-radius:3cqw;font-size:3.8cqw;white-space:nowrap;border-bottom:.8cqw solid #b86d10;' + GOLDBTN,
    ' .ltgo:disabled': 'opacity:.5;filter:grayscale(.6)',
    ' .ltpop': 'position:absolute;inset:0;z-index:200;display:flex;align-items:center;justify-content:center;padding:2cqw;border-radius:2.4cqw;background:rgba(10,5,25,.8);animation:ltfade .2s ease-out',
    ' .ltcard': 'display:flex;flex-direction:column;align-items:center;gap:1.6cqw;width:100%;padding:3.4cqw 2cqw;border:.8cqw solid #f2b13d;border-radius:3.4cqw;background:linear-gradient(180deg,#ea7a43,#c84c2c);box-shadow:0 1.2cqw 0 rgba(0,0,0,.4),0 0 5cqw rgba(255,211,77,.5);text-align:center;animation:ltpopin .35s cubic-bezier(.2,1.4,.4,1)',
    ' .ltcard small': 'font-size:2.8cqw;opacity:.9',
    ' .ltbig': 'min-width:16cqw;padding:1cqw 3cqw;border:.7cqw solid #7a2a12;border-radius:3cqw;background:linear-gradient(180deg,#fffaf0,#efe2cc);color:#5a1a1a;font:700 10cqw/1.05 ' + HW + ';box-shadow:0 .8cqw 0 #a8744a;animation:ltflip .6s ease-out',
    ' .ltart': 'display:flex;align-items:center;justify-content:center;height:16cqw;font-size:12cqw;line-height:1',
    ' .ltart.skin': 'height:30cqw',
    ' .ltart img': 'max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 .8cqw .8cqw rgba(0,0,0,.45))',
    ' .ltwin': 'font-size:3.8cqw;color:#fff3b0;text-shadow:0 .5cqw 0 rgba(0,0,0,.4)',
    ' .ltok': 'width:100%;margin-top:.8cqw;padding:2.4cqw 1cqw;border-radius:3cqw;font-size:3.6cqw;border-bottom:.8cqw solid #b86d10;' + GOLDBTN
  };
  const KF = '@keyframes lthit{50%{transform:scale(1.18)}}@keyframes ltsel{to{filter:brightness(1.15)}}@keyframes lttear{0%{transform:translateY(-1cqw) scale(1.15)}35%{transform:translateY(-2cqw) rotate(-10deg) scale(1.2)}100%{transform:translateY(9cqw) rotate(30deg) scale(.9);opacity:0}}@keyframes ltfade{from{opacity:0}}@keyframes ltpopin{from{transform:scale(.6);opacity:0}}@keyframes ltflip{from{transform:rotateY(90deg)}}';
  const st = document.createElement('style');
  st.textContent = Object.entries(R).map(([k, v]) => P + k + '{' + v + '}').join('\n') + '\n' + KF;
  document.head.appendChild(st);
})();

const LOTRE_ICON = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M6 16h52v10a6 6 0 0 0 0 12v10H6V38a6 6 0 0 0 0-12z" fill="#ffd34d" stroke="#7a2a12" stroke-width="4" stroke-linejoin="round"/><path d="M40 18v28" stroke="#7a2a12" stroke-width="3" stroke-dasharray="4 4"/><path d="M23 24l3 6.5 7 .8-5.2 4.8 1.4 7-6.2-3.6-6.2 3.6 1.4-7L13 31.3l7-.8z" fill="#e8683a" stroke="#7a2a12" stroke-width="2" stroke-linejoin="round"/></svg>');
const isShopLotre = b => /lotre|lottery|undian/i.test([b.dataset.shop || '', b.getAttribute('aria-label') || '', b.textContent, ...[...b.querySelectorAll('img')].map(i => i.alt)].join(' '));
function ensureLotreButton() {   // dipanggil game_ui.js tepat sebelum tombol menu Toko diberi onclick. Bila tombol Lotre belum ada di index.html, dibuat dengan meniru tombol menu yang sudah ada.
  const m = $('shopMenu'); if (!m) return;
  const btns = [...m.querySelectorAll('[data-shop]')]; if (!btns.length || btns.some(isShopLotre)) return;
  const nb = btns[0].cloneNode(true); nb.dataset.shop = 'lotre'; nb.classList.remove('sel');
  const img = nb.querySelector('img'); if (img) { img.src = LOTRE_ICON; img.srcset = ''; img.alt = 'Lotre'; }
  const leaf = [...nb.querySelectorAll('*')].find(e => !e.children.length && e.tagName !== 'IMG' && e.textContent.trim());
  if (leaf) leaf.textContent = 'Lotre';
  else { const t = [...nb.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (t) t.textContent = 'Lotre'; else if (!img) nb.textContent = '🎟️ Lotre'; }
  btns[0].parentNode.appendChild(nb);
}
function openLotrePanel() { lotreSel = -1; lotreBusy = false; renderLotrePanel(); }
function lotreUpdateBar(p) {   // perbarui tombol Tarik + info tanpa membangun ulang papan (posisi gulir tetap)
  const coins = +profile?.progress?.coins || 0, go = p.querySelector('.ltgo'), info = p.querySelector('.ltinfo'); if (!go) return;
  go.disabled = lotreSel < 0 || coins < LOTRE.price || lotreBusy;
  go.innerHTML = coins < LOTRE.price ? 'Koin tidak cukup' : lotreSel < 0 ? 'Pilih satu segitiga' : '🎟️ Tarik tiket · 🪙 ' + fmtID(LOTRE.price);
  if (lotreSel >= 0 && info) info.innerHTML = 'Segitiga terpilih. Tekan <b>Tarik tiket</b> untuk membukanya.';
}
function renderLotrePanel(res) {   // res = { n, i } bila baru saja menarik tiket (menyorot nomor & kertas yang terbuka, lalu menampilkan hasil)
  const p = $('shopPanel'); if (!p || !profile) return;
  p.classList.remove('outfit', 'goodbye'); p.classList.add('lotre');
  const s = lotreStore(), renewed = s.renewed, coins = +profile.progress.coins || 0, keepY = p.scrollTop;
  if (renewed) profile.lotre.renewed = false;   // pesan 'Papan baru' hanya tampil sekali
  const tornSet = new Set(s.torn), drawn = {}; s.torn.forEach(i => { const n = s.board[i]; drawn[n] = (drawn[n] || 0) + 1; });
  const tile = z => { const left = z.stock - (drawn[z.n] || 0);
    return `<button type="button" class="lttile${lotreVal(z) >= 1000 ? ' big' : ''}${left < 1 ? ' out' : ''}${res && res.n === z.n ? ' hit' : ''}" data-n="${z.n}" aria-label="Nomor ${z.n}: ${lotreName(z)}"><b>${z.n}</b></button>`; };
  const rows = LOTRE_LAYOUT.map(([a, b]) => `<div class="ltrow r${b - a + 1}">` + LOTRE.prizes.filter(z => z.n >= a && z.n <= b).map(tile).join('') + '</div>').join('');
  let cols = '';
  for (let c = 0; c < LOTRE.cols; c++) {
    cols += '<div class="ltcol">';
    for (let r = 0; r < LOTRE_ROWS; r++) {
      const i = c * LOTRE_ROWS + r; if (i >= LOTRE_TOTAL) break;
      if (tornSet.has(i)) { const z = LOTRE_BY_N[s.board[i]]; cols += `<div class="ltcell"><div class="ltpaper${lotreVal(z) >= 1000 ? ' big' : ''}${res && res.i === i ? ' new' : ''}">${s.board[i]}</div></div>`; }
      else cols += `<div class="ltcell"><button type="button" class="lttab${lotreSel === i ? ' sel' : ''}" data-i="${i}" style="z-index:${LOTRE_ROWS - r}" aria-label="Segitiga ${i + 1}"></button></div>`;
    }
    cols += '</div>';
  }
  const lastZ = s.last && LOTRE_BY_N[s.last];
  const listHTML = lotreList ? '<div class="ltlist">' + LOTRE.prizes.map(z => { const left = z.stock - (drawn[z.n] || 0); return `<div class="ltrw${lotreVal(z) >= 1000 ? ' big' : ''}${left < 1 ? ' out' : ''}"><b>${z.n}</b><span>${lotreCap(z)}</span><em>${left}/${z.stock}</em></div>`; }).join('') + '</div>' : '';
  p.innerHTML = `<div class="lthead"><div><h4>${LOTRE.name}</h4><p>🪙 ${fmtID(LOTRE.price)} / tiket</p></div><div class="ltleft">Sisa tiket<b>${LOTRE_TOTAL - s.torn.length}/${LOTRE_TOTAL}</b></div></div>`
    + `<div class="ltboard">${rows}<div class="ltcols">${cols}</div></div>`
    + `<p class="ltinfo">${renewed ? '<b>Papan baru!</b> Semua tiket sudah dibuka, ' + LOTRE_TOTAL + ' tiket baru sudah dikocok.' : lastZ ? `Tiket terakhir: <b>No. ${s.last}</b> → ${lotreText(lastZ)}` : 'Pilih satu segitiga di bawah, lalu tekan Tarik. Ketuk kotak nomor untuk melihat hadiahnya.'}</p>`
    + `<button type="button" class="ltlisttoggle" data-ltlist>📋 ${lotreList ? 'Tutup' : 'Lihat'} daftar hadiah</button>${listHTML}<div class="ltbar"><button type="button" class="btn main ltgo"></button></div>`;
  p.scrollTop = keepY;
  const info = p.querySelector('.ltinfo');
  p.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {   // ketuk kotak nomor: tampilkan hadiah + sisa tiketnya
    const z = LOTRE_BY_N[+b.dataset.n], left = z.stock - (drawn[z.n] || 0);
    info.innerHTML = `<b>No. ${z.n}</b> → ${lotreText(z)}<br>Sisa ${left} dari ${z.stock} tiket`;
  });
  p.querySelectorAll('.lttab').forEach(b => b.onclick = () => {   // pilih segitiga (belum membayar)
    if (lotreBusy) return;
    p.querySelectorAll('.lttab.sel').forEach(x => x.classList.remove('sel'));
    lotreSel = lotreSel === +b.dataset.i ? -1 : +b.dataset.i;
    if (lotreSel >= 0) b.classList.add('sel'); else info.textContent = 'Pilih satu segitiga di bawah, lalu tekan Tarik.';
    lotreUpdateBar(p);
  });
  p.querySelector('[data-ltlist]').onclick = () => { lotreList = !lotreList; renderLotrePanel(); };
  p.querySelector('.ltgo').onclick = lotreGo;
  lotreUpdateBar(p);
  if (res) lotrePop(p, res);
}
async function lotreGo() {
  const p = $('shopPanel'); if (lotreBusy || lotreSel < 0 || !profile) return;
  const i = lotreSel; lotreBusy = true; p.querySelector('.ltgo').disabled = true;
  const r = await lotrePull(i);   // hadiah sudah masuk ke akun (database) begitu server menjawab; sisanya animasi
  if (!r) { lotreBusy = false; lotreSel = -1; if ($('shopPanel').classList.contains('lotre')) renderLotrePanel(); return; }
  lotreSel = -1;
  const el = p.querySelector(`.lttab[data-i="${i}"]`); if (el) { el.classList.remove('sel'); el.classList.add('tear'); }
  say('Tiket terbuka: nomor ' + r.n + ' → ' + (r.dup ? lotreName(r.z) + ' (sudah dimiliki, diganti ' + r.gemGain + ' gem)' : lotreName(r.z)) + '!');
  setTimeout(() => {
    lotreBusy = false;
    if ($('shopPanel').classList.contains('lotre')) renderLotrePanel({ n: r.n, i, dup: r.dup, gemGain: r.gemGain });
  }, 460);
}
function lotrePop(p, res) {
  const n = res.n, z = LOTRE_BY_N[n], img = lotreImg(z), box = document.createElement('div');
  const win = z.t === 'coin' || z.t === 'gem' ? '+' + lotreName(z) : 'Dapat ' + lotreName(z) + '!';
  const note = z.t === 'skin' ? (res.dup ? 'Sudah dimiliki, diganti 💎 ' + fmtID(res.gemGain) + ' gem.' : 'Skin masuk koleksimu. Pakai di menu Karakter.') : 'Hadiah sudah masuk ke akunmu.';
  box.className = 'ltpop'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-label', 'Hasil tiket nomor ' + n);
  box.innerHTML = `<div class="ltcard"><small>Tiketmu membuka nomor</small><div class="ltbig">${n}</div><div class="ltart${z.t === 'skin' ? ' skin' : ''}">${img ? `<img src="${img}" alt="">` : lotreEmoji(z)}</div><b class="ltwin">${win}</b><small>${note}</small><button type="button" class="btn main ltok">Mantap!</button></div>`;
  const close = () => { box.remove(); p.classList.remove('ltlock'); };
  box.onclick = e => { if (e.target === box) close(); };
  box.querySelector('.ltok').onclick = close;
  p.scrollTop = 0; p.classList.add('ltlock'); p.appendChild(box);
}
