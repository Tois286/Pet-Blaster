// Pet Blaster - pemuat modul game.
// File modul harus berada satu folder dengan game.js.
// Modul dimuat berurutan sebagai classic scripts agar deklarasi global lama
// (const, let, class, function) tetap saling terlihat tanpa refactor perilaku.
(() => {
  const current = document.currentScript;
  const baseUrl = new URL('.', current.src);
  const modules = [
    'game_config.js',
    'game_monster.js',
    'game_tois.js',
    'game_pet.js',
    'game_world.js',
    'game_systems.js',
    'game_engine.js',
    'game_battle.js',
    'game_ui.js'
  ];

  console.log('[GAME] game.js modular loader dimuat');

  (async () => {
    for (const file of modules) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL(file, baseUrl).href;
        script.async = false;
        script.onload = resolve;
        script.onerror = () => reject(new Error('Gagal memuat modul: ' + file));
        document.head.appendChild(script);
      });
      console.log('[GAME] modul dimuat:', file);
    }
    console.log('[GAME] seluruh modul game berhasil dimuat');
  })().catch(error => {
    console.error('[GAME] pemuatan modul gagal:', error);
    const msg = document.getElementById('gameMessage');
    if (msg) msg.textContent = 'Game gagal dimuat: ' + error.message;
  });
})();
