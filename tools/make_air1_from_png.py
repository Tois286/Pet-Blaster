#!/usr/bin/env python3
"""Buat sprite sheet pet_air1 (Salamander) dari satu PNG sheet jadi (tools/source/air/pet_air1_sheet.png).

Susunan sama dengan Rubah Api (pet_api1): 35 frame, 6 kolom, frame 272x174, frame 0-13 idle (14), frame 14-34 serang (21),
gelembung dilepas di frame serang ke-REL (rel) saat mulut terbuka; sebelumnya tanpa rel sehingga damage baru keluar setelah animasi selesai.
  - Frame serang (14-34) = dari PNG sumber apa adanya: bintik samar dibuang, diskala supaya tinggi karakter idle sama dengan
    Rubah Api (128 px), kaki di garis dasar yang sama dan tengah-x di tengah frame (lihat petOrigin di game.js).
  - Frame idle (0-13): PNG sumber tidak punya gerakan idle (14 frame pertamanya gambar yang sama), jadi idle dibuat dari 16 frame
    idle asli di tools/source/air/air_evol1_idle.jpg (napas, goyang api ekor, kedip sekali per putaran), disisipi frame optical flow
    agar mulus, diberi ukuran dan bayangan tanah yang sama dengan frame serang.
Hasil: sprites/pet_air1.webp, pets/air1.png (128x128), dan entri pet_air1 di js/sprites-data.js.
Pemakaian:  python3 tools/make_air1_from_png.py [--preview folder]
"""
import argparse, os, re
import importlib.util
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools/source/air/pet_air1_sheet.png')
OUT = os.path.join(ROOT, 'public/game/assets/sprites/pet_air1.webp')
STILL = os.path.join(ROOT, 'public/game/assets/pets/air1.png')
DATA_JS = os.path.join(ROOT, 'public/game/js/sprites-data.js')
FW, FH, COLS, N, IDLE, CAST = 272, 174, 6, 35, 14, 21
TARGET_H = 126                       # tinggi gambar karakter idle, sama dengan pet_api1 (ih = 128 di sprites-data)
ROWS = [(0, 175), (175, 352), (352, 525), (525, 700), (700, 875), (875, 1044)]   # baris di PNG sumber tidak rata
VERSION = 'air6'
REL = 10                             # frame serang (0-20) tempat gelembung dilepas = saat mulut mulai terbuka lebar
IDLE_SRC = os.path.join(ROOT, 'tools/source/air')
IDLE_ORDER = list(range(0, 4)) + list(range(5, 16)) + [14, 13, 12, 11, 10, 9, 8, 7, 6, 4, 2, 1]   # satu kedip (frame 3 dan 5) per putaran


def extract(A, i):
    r, c = divmod(i, COLS)
    y0, y1 = ROWS[r]; x0 = max(0, c * FW - 10); x1 = c * FW + FW + 10
    sub = A[y0:y1, x0:x1].copy()
    m = sub[..., 3] > 60
    lab, n = ndi.label(m, structure=np.ones((3, 3)))
    areas = ndi.sum(m, lab, range(1, n + 1)); big = int(np.argmax(areas)) + 1
    main = lab == big
    keep = main.copy(); near = ndi.binary_dilation(main, iterations=30)
    for k in range(1, n + 1):                      # serpihan api/percikan dekat badan ikut, bintik samar dibuang
        if k != big and areas[k - 1] >= 40 and (near & (lab == k)).any():
            keep |= lab == k
    keep = ndi.binary_dilation(keep, iterations=3)
    sub[..., 3] = np.where(keep, sub[..., 3], 0)
    sub[sub[..., 3] < 25] = 0
    ys, xs = np.nonzero(main); b = ys.max()
    xb = np.nonzero(main[b - 4:b + 1].any(0))[0]
    return sub, ((xb.min() + xb.max()) / 2, b)    # titik kaki = tengah-x dan dasar bayangan


def scale(rgba, s):
    f = rgba.astype(np.float32) / 255.
    f[..., :3] *= f[..., 3:4]
    h, w = rgba.shape[:2]
    r = np.clip(cv2.resize(f, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA), 0, 1)
    al = r[..., 3:4]
    rgb = np.where(al > 1e-4, r[..., :3] / np.maximum(al, 1e-4), 0)
    return (np.dstack([rgb, al]) * 255 + .5).astype(np.uint8)


# ---------------------------------------------------------------- idle dari JPG asli
def _gray(f):
    a = f[..., 3:4].astype(np.float32) / 255.
    rgb = f[..., :3].astype(np.float32) * a + 128. * (1 - a)
    return np.clip(0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2], 0, 255).astype(np.uint8)


_DIS = None


def flow_interp(a, b, t):
    """Frame perantara a -> b pada waktu t (0..1) dengan optical flow DIS: kedua frame digeser ke posisi tengah lalu dicampur."""
    global _DIS
    if _DIS is None:
        _DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
        _DIS.setFinestScale(0); _DIS.setPatchSize(12); _DIS.setPatchStride(4)
    ga, gb = _gray(a), _gray(b)
    f_ab, f_ba = _DIS.calc(ga, gb, None), _DIS.calc(gb, ga, None)
    h, w = ga.shape
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))

    def pm(f):
        x = f.astype(np.float32) / 255.
        x[..., :3] *= x[..., 3:4]
        return x
    wa = cv2.remap(pm(a), gx + t * f_ba[..., 0], gy + t * f_ba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    wb = cv2.remap(pm(b), gx + (1 - t) * f_ab[..., 0], gy + (1 - t) * f_ab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    r = wa * (1 - t) + wb * t
    al = r[..., 3:4]
    rgb = np.where(al > 1e-4, r[..., :3] / np.maximum(al, 1e-4), 0)
    al = np.where(al < 0.04, 0, np.clip(al, 0, 1))
    return (np.dstack([np.clip(rgb, 0, 1), al]) * 255 + .5).astype(np.uint8)


def split_shadow(cell):
    """Pisahkan bayangan tanah (abu-abu polos di dasar) dari karakter pada satu frame hasil. Kembalikan (bayangan, kaki_y, kaki_x)."""
    rgb = cell[..., :3].astype(int); a = cell[..., 3]
    sh = (a > 60) & ((rgb.max(-1) - rgb.min(-1)) < 22) & (rgb.mean(-1) < 150)
    sh[:int(np.nonzero(a > 60)[0].max()) - 18] = False
    ys, xs = np.nonzero(sh)
    hull = cv2.convexHull(np.stack([xs, ys], 1).astype(np.int32))
    m = np.zeros(a.shape, np.uint8); cv2.fillConvexPoly(m, hull, 1)
    col = rgb[sh].mean(0); al = float(a[sh].mean()) / 255.
    alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.8) * al
    shadow = np.dstack([np.broadcast_to(col, a.shape + (3,)).astype(np.float32) / 255., alpha])
    body = (a > 60) & ~sh
    fy = int(np.nonzero(body.any(1))[0].max())
    band = np.nonzero(body[max(0, fy - 8):fy + 1].any(0))[0]
    return shadow, fy, float(np.median(band)), (np.nonzero(body.any(1))[0].min(), fy)


def over(top_u8, under_f):
    """Tumpuk frame uint8 (di atas) di atas lapisan float (di bawah), hasil uint8."""
    t = top_u8.astype(np.float32) / 255.
    ta = t[..., 3:4]
    r_a = ta + under_f[..., 3:4] * (1 - ta)
    r_rgb = t[..., :3] * ta + under_f[..., :3] * under_f[..., 3:4] * (1 - ta)
    rgb = np.where(r_a > 1e-4, r_rgb / np.maximum(r_a, 1e-4), 0)
    return (np.dstack([np.clip(rgb, 0, 1), np.clip(r_a, 0, 1)]) * 255 + .5).astype(np.uint8)


def build_idle(ref_cell, n):
    """n frame idle dari JPG asli, ukuran dan bayangan dicocokkan dengan ref_cell (frame idle dari PNG)."""
    spec = importlib.util.spec_from_file_location('make_air_sheets', os.path.join(ROOT, 'tools/make_air_sheets.py'))
    mas = importlib.util.module_from_spec(spec); spec.loader.exec_module(mas)
    raw = mas.load_sheet(IDLE_SRC, 1, 'idle')
    shadow, fy, fx, (top, _) = split_shadow(ref_cell)
    s = (fy - top + 1) / float(np.median([r.shape[0] for r, _ in raw]))
    cells = []
    for i in IDLE_ORDER:
        r, ax = raw[i]
        sm = scale(r, s)
        ox, oy = round(fx - ax * s), fy + 1 - sm.shape[0]
        can = np.zeros((FH, FW, 4), np.uint8)
        h, w = sm.shape[:2]
        x0, y0, x1, y1 = max(ox, 0), max(oy, 0), min(ox + w, FW), min(oy + h, FH)
        can[y0:y1, x0:x1] = sm[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        cells.append(can)
    L = len(cells); out = []
    for k in range(n):                                   # n titik rata sepanjang siklus, frame di antaranya dari optical flow
        q = k * L / n; i0 = int(q); t = q - i0
        out.append(cells[i0] if t < 1e-6 else flow_interp(cells[i0], cells[(i0 + 1) % L], t))
    return [over(c, shadow) for c in out]


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--preview'); args = ap.parse_args()
    A = np.array(Image.open(SRC).convert('RGBA'))
    fr = [extract(A, i) for i in range(N)]
    ys, xs = np.nonzero(fr[0][0][..., 3] > 128)
    s = TARGET_H / (ys.max() - ys.min() + 1)
    ih = 128; base = (FH + ih) // 2           # kaki di baris base-1, sama dengan petOrigin
    cells = []
    for sub, (ax, ay) in fr:
        sm = scale(sub, s)
        ox, oy = round(FW / 2 - ax * s), round(base - 1 - ay * s)
        can = np.zeros((FH, FW, 4), np.uint8)
        h, w = sm.shape[:2]
        x0, y0, x1, y1 = max(ox, 0), max(oy, 0), min(ox + w, FW), min(oy + h, FH)
        can[y0:y1, x0:x1] = sm[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
        cells.append(can)
    cells[:IDLE] = build_idle(cells[0], IDLE)       # idle dari JPG asli; frame serang (14-34) tetap dari PNG
    sheet = np.zeros((6 * FH, COLS * FW, 4), np.uint8)
    for n, cell in enumerate(cells):
        r, c = divmod(n, COLS); sheet[r * FH:(r + 1) * FH, c * FW:(c + 1) * FW] = cell
    Image.fromarray(sheet, 'RGBA').save(OUT, 'WEBP', quality=92, method=6, alpha_quality=100)
    ys, xs = np.nonzero(cells[0][..., 3] > 128)
    iw = int(xs.max() - xs.min() + 1)
    # gambar statis 128x128 dari frame idle pertama
    st = Image.fromarray(cells[0], 'RGBA'); st = st.crop(st.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    k = min(124 / st.width, 122 / st.height)
    st = st.resize((max(1, round(st.width * k)), max(1, round(st.height * k))), Image.LANCZOS)
    png = Image.new('RGBA', (128, 128), (0, 0, 0, 0)); png.alpha_composite(st, ((128 - st.width) // 2, 126 - st.height)); png.save(STILL)
    js = open(DATA_JS, encoding='utf-8').read()
    block = (' "pet_air1": {\n  "file": "sprites/pet_air1.webp?v=%s",\n  "fw": %d,\n  "fh": %d,\n  "iw": %d,\n  "ih": %d,\n'
             '  "idle": %d,\n  "cast": %d,\n  "rel": %d\n }') % (VERSION, FW, FH, iw, ih, IDLE, CAST, REL)
    js, n = re.subn(r' "pet_air1": \{.*?\n \}', lambda m: block, js, count=1, flags=re.S)
    assert n == 1, 'entri pet_air1 tidak ditemukan'
    open(DATA_JS, 'w', encoding='utf-8').write(js)
    print('pet_air1: %d idle + %d serang, frame %dx%d, karakter %dx%d, skala %.3f' % (IDLE, CAST, FW, FH, iw, ih, s))
    if args.preview:
        os.makedirs(args.preview, exist_ok=True)
        for tag, rng, ms in (('idle', range(0, IDLE), 125), ('serang', range(IDLE, N), 62)):
            g = []
            for n in rng:
                bg = Image.new('RGBA', (FW, FH), (58, 110, 58, 255)); bg.alpha_composite(Image.fromarray(cells[n], 'RGBA')); g.append(bg.convert('P', palette=Image.ADAPTIVE))
            g[0].save(os.path.join(args.preview, 'pet_air1_%s.gif' % tag), save_all=True, append_images=g[1:], duration=ms, loop=0)


if __name__ == '__main__':
    main()
