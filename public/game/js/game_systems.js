// State global, penyimpanan pertempuran, API, profil, autentikasi, dan event UI awal.
let game = null, profile = null;

// ---- Simpan & pulihkan pertempuran terakhir ----
// Saat halaman dimuat ulang (refresh, tab dimatikan, dsb.) pertempuran yang sedang berjalan tidak diulang dari awal:
// kondisi terakhir disimpan di perangkat (localStorage) dan dipulihkan begitu pemain masuk lagi. Dihapus saat pertempuran selesai atau pemain keluar ke lobi.
const BATTLE_SNAP_TTL = 12 * 3600e3;   // snapshot lebih tua dari 12 jam diabaikan
let resumeSnap = null;   // diisi saat akan memulihkan pertempuran; dibaca Battle.create
const battleKey = () => 'petblaster-battle-' + (profile?.username || 'guest');
function clearBattleSnap() { try { localStorage.removeItem(battleKey()); } catch (_) { } }
function loadBattleSnap() {
  try {
    const s = JSON.parse(localStorage.getItem(battleKey()) || 'null');
    if (!s || s.v !== 1 || !(Date.now() - s.t < BATTLE_SNAP_TTL)) return null;
    if (!(s.island >= 0 && s.island < ISLANDS.length && s.stage >= 1 && s.stage <= STAGES_PER_ISLAND && s.wave >= 1 && Array.isArray(s.pets) && Array.isArray(s.enemies))) return null;
    return s;
  } catch (_) { return null; }
}
function saveBattleSnap() {
  try {
    if (!game || !profile || !game.scene.isActive('Battle')) return;
    const b = game.scene.getScene('Battle');
    if (!b || b.over || !b.token || !(b.wave >= 1)) return;
    localStorage.setItem(battleKey(), JSON.stringify(b.snapshot()));
  } catch (_) { }
}
window.addEventListener('pagehide', saveBattleSnap);
window.addEventListener('beforeunload', saveBattleSnap);
document.addEventListener('visibilitychange', () => { if (document.hidden) saveBattleSnap(); });

async function api(path, method = 'GET', body = null) {
  const o = { method, credentials: 'same-origin', headers: { Accept: 'application/json' } };
  if (body !== null) { o.headers['Content-Type'] = 'application/json'; o.body = JSON.stringify(body); }
  const res = await fetch(API + path, o);
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) throw new Error(data.message || 'Permintaan gagal.');
  return data;
}
// Info progres lobi mengikuti pulau & stage terpilih (progres per pulau dari worldProgress)
function updateLobbyInfo() {
  if (!profile) return;
  const isl = ISLANDS[selectedIsland], done = Math.min(STAGES_PER_ISLAND, +worldProgress()[selectedIsland] || 0), cleared = done >= selectedStage;
  $('xpBar').style.width = done / STAGES_PER_ISLAND * 100 + '%';
  $('stageNo').textContent = selectedStage;
  $('stageTitle').textContent = 'Boss: ' + MON[getStageBoss(selectedIsland, selectedStage)].n;
  $('bestWave').textContent = done;
  $('stageSub').textContent = isl.name + ' · ' + (done >= STAGES_PER_ISLAND ? 'Pulau tamat! ★' + islandStars(selectedIsland) : cleared ? 'Stage ' + selectedStage + ' ditaklukkan ' + starStr(stageStars(selectedIsland, selectedStage)) : 'Stage ' + selectedStage + ' belum ditaklukkan');
  $('goalTxt').textContent = 'Taklukkan ' + STAGES_PER_ISLAND + ' stage ' + isl.name + ' (' + done + '/' + STAGES_PER_ISLAND + ')';
  $('miles').innerHTML = [5, 10, 25].map(n => `<div class="m${done >= n ? ' on' : ''}"><i>${done >= n ? '✅' : '🎁'}</i><span>Stage ${n}</span></div>`).join('');
}
function refreshLobbyScene() {   // bangun ulang lobi (bos & tampilan) setelah pulau/stage berubah
  updateLobbyInfo();
  if (game && game.scene.isActive('Lobby')) game.scene.getScene('Lobby').scene.restart();
}
function showProfile(d) {
  profile = d; const p = d.progress;
  if (OUTFIT_LOCAL) { const sp = outfitStore().spent; p.coins = Math.max(0, (+p.coins || 0) - sp.coin); p.gems = Math.max(0, (+p.gems || 0) - sp.gem); }   // pembelian outfit (lokal) dikurangkan dari saldo server
  $('playerName').textContent = d.username; $('coins').textContent = p.coins; $('gems').textContent = +p.gems || 0;
  $('level').textContent = p.level; $('bestWave').textContent = p.best_wave;
  const bw = +p.best_wave;
  updateLobbyInfo();
  const afk = +d.afk || 0; $('afkAmt').textContent = afk; $('afkBtn').disabled = afk < 1;
  $('hubCoins').textContent = p.coins; $('hubGems').textContent = +p.gems || 0; if (!$('hub').hidden) renderHub();   // panel menu bawah ikut diperbarui
}
async function refreshProfile() { showProfile(await api('/profile')); }
// Setelah login/refresh: langsung arahkan pilihan ke stage berikutnya yang belum ditaklukkan
function resumeSelection() {
  const p = worldProgress();
  let isl = 0;
  ISLANDS.forEach((_, i) => { if ((+p[i] || 0) > 0) isl = i; });
  let done = Math.min(STAGES_PER_ISLAND, +p[isl] || 0);
  if (done >= STAGES_PER_ISLAND && isl < ISLANDS.length - 1) { isl++; done = 0; }   // pulau tamat -> pulau berikutnya
  selectedIsland = isl; selectedStage = Math.min(STAGES_PER_ISLAND, done + 1);
}
async function enterGame() {
  await refreshProfile();
  resumeSelection(); updateLobbyInfo();
  $('authPanel').hidden = true; $('gamePanel').hidden = false;   // halaman login ditutup (lihat aturan [hidden] di game.css)
  $('password').value = '';
  if (!game) startGame();
  const snap = loadBattleSnap();   // ada pertempuran yang belum selesai (mis. setelah refresh): langsung masuk lagi ke pertempuran itu
  if (snap && !NAGA_TEST && !window.__resumeAuto) {
    window.__resumeAuto = 1; let tries = 0;
    const t = setInterval(() => {
      if (++tries > 200) { clearInterval(t); return; }
      if (game && game.scene.isActive('Lobby')) {
        clearInterval(t); selectedIsland = snap.island; selectedStage = snap.stage; updateLobbyInfo();
        resumeSnap = snap; startBattle();
      }
    }, 100);
  }
  if (NAGA_TEST && !window.__nagaAuto) {   // uji ?naga=N: langsung masuk gameplay (tanpa menekan Main) begitu lobi siap
    window.__nagaAuto = 1; let tries = 0;
    const t = setInterval(() => {
      if (++tries > 100) { clearInterval(t); return; }
      if (game && game.scene.isActive('Lobby')) { clearInterval(t); startBattle(); }
    }, 300);
  }
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
$('logoutButton').addEventListener('click', () => { $('rest').hidden = false; });   // tombol istirahat: tanya dulu, belum langsung keluar
$('restNo').addEventListener('click', () => { $('rest').hidden = true; });   // Lanjut: tutup dialog, tetap di lobi
$('rest').addEventListener('click', e => { if (e.target === $('rest')) $('rest').hidden = true; });   // klik di luar kartu = Lanjut
$('restYes').addEventListener('click', async () => {   // Istirahat = keluar akun
  $('rest').hidden = true;
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
$('againButton').addEventListener('click', () => {
  $('result').hidden = true; say('Tahan layar untuk menembak 2x lebih cepat.');
  startBattle();
});

