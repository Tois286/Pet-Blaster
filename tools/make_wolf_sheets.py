#!/usr/bin/env python3
"""Buat sprite sheet pet_api2 (Srigala Api) dan pet_api3 (Serigala Lava) dari dua GIF animasi.

Pemakaian (dari folder proyek):
    python3 tools/make_wolf_sheets.py --api tools/source/srigala_api.gif --lava tools/source/serigala_lava.gif
    python3 tools/make_wolf_sheets.py --api ... --lava ... --only api     # hanya Srigala Api
    python3 tools/make_wolf_sheets.py --api ... --lava ... --preview /tmp/preview   # simpan GIF pratinjau

Hasil:
    public/game/assets/sprites/pet_api2.webp, pet_api3.webp     sprite sheet (idle dulu, lalu serang)
    public/game/assets/pets/api2.png, api3.png                  gambar statis 128x128 (kartu, evolusi, menu Pet)
    public/game/js/sprites-data.js                              entri pet_api2 / pet_api3 diperbarui

Langkah: (1) hapus latar GIF jadi transparan, (2) pilih frame idle (bolak-balik supaya mulus) dan frame serang,
(3) skala + susun ke sheet, kaki tiap frame berpijak di garis dasar yang sama (lihat petOrigin di game.js).
Butuh numpy, scipy, opencv-python, pillow.
"""
import argparse, os, re, sys
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SPR_DIR = os.path.join(ROOT, 'public/game/assets/sprites')
PET_DIR = os.path.join(ROOT, 'public/game/assets/pets')
DATA_JS = os.path.join(ROOT, 'public/game/js/sprites-data.js')
COLS = 6


def load_gif(path):
    im = Image.open(path)
    out = []
    for i in range(im.n_frames):
        im.seek(i)
        out.append(np.array(im.convert('RGB')))
    return out


# ---------------------------------------------------------------- hapus latar: Serigala Lava (latar hitam)
def matte_lava(rgb, t_bg=14, lo=14, hi=46, erode=2):
    rgb = rgb.copy()
    rgb[40:100, 462:] = 0                           # bola coklat kecil di tepi kanan GIF sumber (artefak)
    maxc = rgb.max(2).astype(np.float32)
    lab, n = ndi.label(maxc <= t_bg)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    area = ndi.sum(maxc <= t_bg, lab, range(1, n + 1))
    big = np.where(area >= 40)[0] + 1
    bg = np.isin(lab, np.union1d(border[border > 0], big))   # hitam di tepi gambar + celah hitam di antara kaki
    lab2, n2 = ndi.label(~bg, structure=np.ones((3, 3)))
    areas = ndi.sum(~bg, lab2, range(1, n2 + 1))
    body = lab2 == (1 + int(np.argmax(areas)))
    core = ndi.binary_erosion(body, iterations=erode)
    a_lum = np.clip((maxc - lo) / (hi - lo), 0, 1)  # tepi dan efek (api, kilau) transparan menurut kecerahan
    a_lum[bg] = 0
    alpha = np.where(core, 1.0, a_lum)
    a3 = np.maximum(alpha, 1e-3)[..., None]
    col = np.where((alpha < 1)[..., None], np.clip(rgb / a3, 0, 255), rgb)
    return np.dstack([col, alpha * 255]).astype(np.uint8)


# ---------------------------------------------------------------- hapus latar: Srigala Api (latar abu-krem + bayangan)
KLO, KHI, TAU = 0.45, 1.07, 9.0


def _analyse(rgb):
    P = rgb.astype(np.float32)
    B = ((np.median(P[:, :8], axis=1) + np.median(P[:, -8:], axis=1)) / 2)[:, None, :]   # warna latar tiap baris
    k = (P * B).sum(2) / (B * B).sum(2)             # k = tingkat gelap/terang terhadap latar
    res = np.sqrt(((P - k[..., None] * B) ** 2).sum(2))   # res = selisih warna (di luar kecerahan) terhadap latar
    return P, B, k, res


def _body_mask(k, res):
    strict = (k < KLO) | (res >= 55)
    closed = ndi.binary_closing(strict, iterations=2)
    lab, n = ndi.label(closed, structure=np.ones((3, 3)))
    areas = ndi.sum(closed, lab, range(1, n + 1))
    return ndi.binary_fill_holes(lab == (1 + int(np.argmax(areas))))


def matte_api(rgb, zone, zone2):
    P, B, k, res = _analyse(rgb)
    bgc = (k >= KLO) & (k <= KHI) & (res <= TAU)    # mirip warna latar, boleh lebih gelap (bayangan)
    lab, n = ndi.label(bgc)
    border = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    area = ndi.sum(bgc, lab, range(1, n + 1))
    big = np.where(area >= 60)[0] + 1
    bg = np.isin(lab, np.union1d(border[border > 0], big))   # latar luar + celah latar di antara kaki/ekor
    filled = _body_mask(k, res)
    core = ndi.binary_erosion(filled & zone, iterations=1) & ~bg
    c = (P[..., 0] - P[..., 2]) / np.maximum(P[..., 0], 1)
    cbg = (B[..., 0] - B[..., 2]) / B[..., 0]
    cex = c - cbg
    strict = (k < KLO) | (res >= 55)
    a_res = np.clip((res - 55) / (95 - 55), 0, 1)
    a_c = np.clip((cex - 0.12) / (0.42 - 0.12), 0, 1) * (k >= KLO)          # api dan kilau berwarna hangat
    a_br = np.clip((k - KHI) / 0.04, 0, 1) * ndi.binary_dilation(strict, iterations=2)   # bulu krem terang di tepi
    cand = ~bg & (k > 1.03) & (cex < 0.35) & (res > TAU)
    cand = ndi.binary_opening(cand, structure=np.ones((3, 3)))
    lab_c, _ = ndi.label(cand | strict, structure=np.ones((3, 3)))
    ids = np.unique(lab_c[strict & (lab_c > 0)])
    a_cream = (np.isin(lab_c, ids) & cand & zone2).astype(np.float32)       # moncong/ujung kaki putih berbayang
    a = np.maximum(np.maximum(np.maximum(a_res, a_c), a_br), a_cream)
    a = np.where(k < KLO, 1.0, a)                   # outline dan bulu gelap = benda, bukan bayangan
    alpha = np.where(core, 1.0, a)
    alpha[bg] = 0
    alpha = np.where(ndi.binary_dilation(filled, iterations=70), alpha, 0)
    a3 = np.maximum(alpha, 1e-3)[..., None]
    col = np.clip(np.where((alpha < 1)[..., None], (P - (1 - a3) * B) / a3, P), 0, 255)
    return np.dstack([col, alpha * 255]).astype(np.uint8)


def matte_all_api(frames):
    _, _, k, res = _analyse(frames[0])
    f0 = _body_mask(k, res)
    zone, zone2 = ndi.binary_dilation(f0, iterations=10), ndi.binary_dilation(f0, iterations=24)
    return [matte_api(f, zone, zone2) for f in frames]


# ---------------------------------------------------------------- susun sprite sheet
def pingpong(seq):
    return seq + seq[-2:0:-1]


# xref/yref = titik kaki di gambar sumber (tengah badan, ujung kaki); xcut = batas kanan efek (bola api dipotong)
CFG = {
    'api': dict(pet='pet_api2', png='api2.png', scale=.45, xref=197, yref=254, fw=224, fh=116, ih=102,
                idle=pingpong(list(range(41, 60, 2))), cast=list(range(21, 41)), xcut=None, still=49, still_w=122),
    'lava': dict(pet='pet_api3', png='api3.png', scale=.51, xref=172.5, yref=254, fw=216, fh=136, ih=128,
                 idle=pingpong([56, 58] + list(range(0, 16, 2))), cast=list(range(32, 56)), xcut=374, still=0, still_w=122),
}


def place(rgba, c, fw=None, fh=None):
    """Skala satu frame RGBA (alpha ter-premultiply) lalu letakkan di kanvas fw x fh; kaki berpijak di baris (fh+ih)/2."""
    fw, fh = fw or c['fw'], fh or c['fh']
    base = (fh + c['ih']) // 2
    f = rgba.astype(np.float32)
    al = f[..., 3] / 255
    if c['xcut']:
        xs = np.arange(f.shape[1])[None, :]
        al = al * np.clip((c['xcut'] + 14 - xs) / 14, 0, 1)    # bola api yang terbang jauh memudar (diganti efek game)
    s = c['scale']
    H, W = al.shape
    nw, nh = round(W * s), round(H * s)
    pm = cv2.resize(f[..., :3] * al[..., None], (nw, nh), interpolation=cv2.INTER_AREA)
    a2 = cv2.resize(al, (nw, nh), interpolation=cv2.INTER_AREA)
    rgb = np.where(a2[..., None] > 1e-4, pm / np.maximum(a2[..., None], 1e-4), 0)
    small = np.dstack([np.clip(rgb, 0, 255), a2 * 255])
    canvas = np.zeros((fh, fw, 4), np.float32)
    ox, oy = round(fw / 2 - c['xref'] * s), round(base - c['yref'] * s)
    x0, y0, x1, y1 = max(ox, 0), max(oy, 0), min(ox + nw, fw), min(oy + nh, fh)
    canvas[y0:y1, x0:x1] = small[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    return canvas.astype(np.uint8)


def build(name, rgba, c, preview=None):
    order = c['idle'] + c['cast']
    cells = [place(rgba[i], c) for i in order]
    rows = (len(cells) + COLS - 1) // COLS
    sheet = np.zeros((rows * c['fh'], COLS * c['fw'], 4), np.uint8)
    for n, cell in enumerate(cells):
        r, col = divmod(n, COLS)
        sheet[r * c['fh']:(r + 1) * c['fh'], col * c['fw']:(col + 1) * c['fw']] = cell
    out = os.path.join(SPR_DIR, c['pet'] + '.webp')
    Image.fromarray(sheet, 'RGBA').save(out, 'WEBP', quality=92, method=6, alpha_quality=100)
    # gambar statis 128x128: rapatkan ke tepi karakter, lebar still_w, rata bawah
    im = Image.fromarray(place(rgba[c['still']], dict(c, xcut=None), fw=480, fh=270), 'RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    w = c['still_w']
    im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    png = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    png.alpha_composite(im, ((128 - w) // 2, 126 - im.height))
    png.save(os.path.join(PET_DIR, c['png']))
    print(f"{c['pet']}: {len(c['idle'])} idle + {len(c['cast'])} serang, frame {c['fw']}x{c['fh']}, sheet {sheet.shape[1]}x{sheet.shape[0]}, {os.path.getsize(out) // 1024} KB")
    if preview:
        os.makedirs(preview, exist_ok=True)
        for tag, seq, ms in (('idle', c['idle'], 125), ('serang', c['cast'], 62)):
            fr = []
            for i in seq:
                bg = Image.new('RGBA', (c['fw'], c['fh']), (58, 110, 58, 255))
                bg.alpha_composite(Image.fromarray(place(rgba[i], c), 'RGBA'))
                fr.append(bg.convert('P', palette=Image.ADAPTIVE))
            fr[0].save(os.path.join(preview, f"{c['pet']}_{tag}.gif"), save_all=True, append_images=fr[1:], duration=ms, loop=0)


def update_data(cfgs):
    js = open(DATA_JS, encoding='utf-8').read()
    for c in cfgs:
        iw = round((c['xr'] - c['xl']) * c['scale'])
        block = (f' "{c["pet"]}": {{\n  "file": "sprites/{c["pet"]}.webp?v=wolf1",\n  "fw": {c["fw"]},\n  "fh": {c["fh"]},\n'
                 f'  "iw": {iw},\n  "ih": {c["ih"]},\n  "idle": {len(c["idle"])},\n  "cast": {len(c["cast"])}\n }}')
        js, n = re.subn(r' "%s": \{.*?\n \}' % c['pet'], block, js, count=1, flags=re.S)
        if n != 1:
            sys.exit('entri %s tidak ditemukan di sprites-data.js' % c['pet'])
    open(DATA_JS, 'w', encoding='utf-8').write(js)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--api', required=True, help='GIF Srigala Api (latar abu-krem)')
    ap.add_argument('--lava', required=True, help='GIF Serigala Lava (latar hitam)')
    ap.add_argument('--only', choices=['api', 'lava'])
    ap.add_argument('--preview', help='folder untuk GIF pratinjau (opsional)')
    a = ap.parse_args()
    done = []
    for key, path, fn in (('api', a.api, matte_all_api), ('lava', a.lava, lambda fr: [matte_lava(f) for f in fr])):
        if a.only and a.only != key:
            continue
        rgba = fn(load_gif(path))
        c = CFG[key]
        idle_i = sorted(set(c['idle']))
        boxes = [np.where(rgba[i][..., 3] > 128)[1] for i in idle_i]   # lebar karakter saat idle (untuk iw)
        c['xl'], c['xr'] = min(b.min() for b in boxes), max(b.max() for b in boxes)
        build(key, rgba, c, a.preview)
        done.append(c)
    update_data(done)
    print('sprites-data.js diperbarui')


if __name__ == '__main__':
    main()
