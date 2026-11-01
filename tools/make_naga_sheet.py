#!/usr/bin/env python3
"""Membuat sprite sheet Naga Fusion (pertempuran) dari video MP4.

Pakai:  python3 tools/make_naga_sheet.py [video.mp4] [--preview folder]
Bawaan: tools/source/fusion_gerakan_baru.mp4  ->  public/game/assets/pets/fusion_api_air_battle.webp

Video: latar putih dengan pita hitam di atas dan bawah (area gambar baris 105-744 pada 478x850), 408 frame @ 30 fps,
dan sudah hampir membentuk loop sempurna (frame terakhir ~ frame pertama). Skrip ini:
  1. memotong pita hitam, mengambil tiap STEP frame (STEP=2 -> 15 fps, 204 frame),
  2. menghapus latar putih (hanya yang tersambung ke tepi atau kantong putih besar, jadi putih di dalam tanduk tidak ikut hilang)
     dengan tepi halus dan warna dibersihkan dari sisa putih,
  3. memakai SATU skala dan SATU posisi untuk semua frame (kaki di y=196), sehingga gerak badan asli video tetap utuh,
  4. menyusun frame 160x204 dalam sheet 20 kolom (3200 px, di bawah batas tekstur 4096).
Setelah itu pastikan NAGA di game.js: fw 160, fh 204, frames 204, fps 15 (skrip mencetak angkanya).
Butuh numpy, scipy, opencv-python, pillow.
"""
import os, sys
import numpy as np, cv2
from scipy import ndimage
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'source', 'fusion_gerakan_baru.mp4')
OUT = os.path.join(ROOT, 'public', 'game', 'assets', 'pets', 'fusion_api_air_battle.webp')
CROP_Y0, CROP_Y1 = 105, 745     # area gambar di dalam video (di luar ini pita hitam)
STEP = 2                        # ambil tiap 2 frame video (30 fps) -> 15 fps
FW, FH, COLS = 160, 204, 20     # ukuran satu frame dan jumlah kolom sheet
FEET_SRC, FEET_DST = 597, 196   # baris kaki di video (rata-rata) dan di frame hasil, sama dengan sheet lama
WHITE = 240                     # piksel dianggap latar bila ketiga kanal >= angka ini
POCKET = 600                    # kantong putih di dalam badan dianggap latar bila luasnya >= ini (piksel video)
PURE, PURE_AREA = 234, 40       # kantong kecil (celah sempit di pinggang) hanya dibuang bila PUTIH MURNI (>= PURE) dan luasnya >= PURE_AREA; kilau tanduk tidak seputih itu
EDGE_PX, OUTLINE = 2, 40        # lebar pita tepi yang dihaluskan; kecerahan garis tepi hitam karakter


def matte(rgb):
    rgb = rgb.copy(); rgb[:, :2] = 255; rgb[:, -2:] = 255   # buang garis tipis di tepi video
    white = rgb.min(axis=2) >= WHITE
    lab, n = ndimage.label(white)
    if n == 0:
        return rgb.astype(np.float32) / 255, np.ones(white.shape, np.float32)
    area = ndimage.sum(white, lab, index=np.arange(1, n + 1))
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    keep = [l for l in range(1, n + 1) if l in border or area[l - 1] >= POCKET]
    bg = np.isin(lab, keep)
    pl, pn = ndimage.label(rgb.min(axis=2) >= PURE)   # celah kecil putih murni di dalam badan
    if pn:
        pa = ndimage.sum(np.ones_like(pl), pl, index=np.arange(1, pn + 1))
        bg |= np.isin(pl, [l for l in range(1, pn + 1) if pa[l - 1] >= PURE_AREA])
    band = ndimage.binary_dilation(bg, iterations=EDGE_PX) & ~bg
    mn = rgb.min(axis=2).astype(np.float32)
    a = np.ones(bg.shape, np.float32); a[bg] = 0
    a[band] = np.clip((255 - mn[band]) / (255 - OUTLINE), 0, 1)
    c = rgb.astype(np.float32)
    ab = np.maximum(a[..., None], 0.05)
    c = np.where(band[..., None], np.clip((c - 255 * (1 - a[..., None])) / ab, 0, 255), c)
    c[bg] = 0
    return c / 255, a


def main():
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    src = args[0] if args and args[0].endswith('.mp4') else SRC
    cap = cv2.VideoCapture(src); frames = []
    while True:
        ok, bgr = cap.read()
        if not ok: break
        frames.append(cv2.cvtColor(bgr[CROP_Y0:CROP_Y1], cv2.COLOR_BGR2RGB))
    use = frames[::STEP]
    n = len(use); rows = -(-n // COLS)
    h0, w0 = use[0].shape[:2]
    s = FW / w0                                   # satu skala untuk semua frame (lebar badan memenuhi frame)
    rh = int(round(h0 * s)); top = int(round(FEET_SRC * s - FEET_DST))   # baris ke-top hasil resize menjadi baris 0 frame
    sheet = np.zeros((rows * FH, COLS * FW, 4), np.uint8)
    for i, rgb in enumerate(use):
        c, a = matte(rgb)
        p = np.concatenate([c * a[..., None], a[..., None]], axis=2)             # premultiplied
        p = cv2.resize(p, (FW, rh), interpolation=cv2.INTER_AREA)
        p = np.pad(p, ((max(0, -top), 0), (0, 0), (0, 0)))[max(0, top):max(0, top) + FH]
        if p.shape[0] < FH: p = np.pad(p, ((0, FH - p.shape[0]), (0, 0), (0, 0)))
        al = np.clip(p[..., 3:4], 0, 1)
        rgb8 = np.clip(p[..., :3] / np.maximum(al, 1e-4), 0, 1)
        out = np.concatenate([rgb8, al], axis=2)
        x, y = (i % COLS) * FW, (i // COLS) * FH
        sheet[y:y + FH, x:x + FW] = (out * 255 + .5).astype(np.uint8)
    Image.fromarray(sheet, 'RGBA').save(OUT, quality=85, alpha_quality=90, method=6)
    print('video: %d frame -> dipakai %d | sheet %dx%d | NAGA: fw %d, fh %d, frames %d, fps %d' % (len(frames), n, sheet.shape[1], sheet.shape[0], FW, FH, n, round(30 / STEP)))
    if '--preview' in sys.argv:
        d = sys.argv[sys.argv.index('--preview') + 1]; os.makedirs(d, exist_ok=True)
        im = Image.open(OUT).convert('RGBA')
        for name, bg in (('hijau', (90, 150, 90, 255)), ('gelap', (24, 20, 40, 255))):
            pv = Image.new('RGBA', (FW * 12, FH), bg)
            for k, i in enumerate(np.linspace(0, n - 1, 12).astype(int)):
                x, y = (i % COLS) * FW, (i // COLS) * FH
                pv.alpha_composite(im.crop((x, y, x + FW, y + FH)), (k * FW, 0))
            pv.convert('RGB').save(os.path.join(d, 'pratinjau_%s.png' % name))


if __name__ == '__main__':
    main()
