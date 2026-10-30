#!/usr/bin/env python3
"""Buat sprite sheet pet_air2 (Naga Air) dari satu sprite sheet PNG transparan (38 frame: 18 idle + 20 serang).

Pemakaian (dari folder proyek):
    python3 tools/make_air2_sheet.py                          # sumber tools/source/air/air_evol2_sheet.png
    python3 tools/make_air2_sheet.py --src sheet.png --preview /tmp/prev

Format keluaran SAMA dengan pet_api2 (Srigala Api, lihat make_wolf_sheets.py): frame 224x116, 6 kolom,
18 frame idle (bolak-balik/ping-pong) + 20 frame serang, kaki berpijak di baris (fh+ih)/2 (petOrigin di game.js),
gambar statis 128x128 lebar 122, entri sprites-data.js tanpa "rel".
Hasil: sprites/pet_air2.webp, pets/air2.png, dan entri pet_air2 di sprites-data.js. Butuh numpy, opencv-python, pillow.
"""
import argparse, os, re, sys
import cv2
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools/source/air/air_evol2_sheet.png')
SPR_DIR = os.path.join(ROOT, 'public/game/assets/sprites')
PET_DIR = os.path.join(ROOT, 'public/game/assets/pets')
DATA_JS = os.path.join(ROOT, 'public/game/js/sprites-data.js')
COLS = 6
VERSION = 'air2b'
# sama dengan CFG['api'] di make_wolf_sheets.py: fw, fh, ih, still_w. Frame sumber: 0-17 idle, 18-37 serang.
CFG = dict(pet='pet_air2', png='air2.png', fw=224, fh=116, ih=102, still_w=122,
           idle=list(range(8, 18)),           # 10 frame idle tenang -> ping-pong = 18 frame (seperti api2)
           cast=list(range(18, 38)), still=11, n_cols=6, n_rows=7)


def pingpong(seq):
    return seq + seq[-2:0:-1]


def split_cells(rgba):
    """Pisahkan 38 frame: baris & kolom dicari dari celah transparan antar frame."""
    a = rgba[..., 3] > 8

    def bands(p):
        out, s = [], None
        for i, v in enumerate(p):
            if v and s is None: s = i
            if not v and s is not None: out.append((s, i)); s = None
        if s is not None: out.append((s, len(p)))
        return out
    rows, cols = bands(a.sum(1) > 0), bands(a.sum(0) > 0)
    assert len(rows) == 7 and len(cols) == 6, (len(rows), len(cols))
    cells = []
    for (y0, y1) in rows:
        for (x0, x1) in cols:
            if len(cells) < 38:
                cells.append(rgba[y0:y1, x0:x1].copy())
    return cells


def tight(cell):
    ys, xs = np.where(cell[..., 3] > 8)
    return cell[ys.min():ys.max() + 1, xs.min():xs.max() + 1], (ys.min(), xs.min())


def foot_anchor(cell):
    """Titik pijak: x tengah telapak (piksel gelap di 18 baris terbawah), y dasar telapak."""
    al = cell[..., 3] > 200
    rgb = cell[..., :3].astype(float)
    L = .299 * rgb[..., 0] + .587 * rgb[..., 1] + .114 * rgb[..., 2]
    dark = al & (L < 75)
    yd, xd = np.where(dark)
    yb = yd.max()
    sel = yd > yb - 18
    return float(np.median(xd[sel])), float(yb)


def place(cell, anchor, s, fw, fh, ih):
    base = (fh + ih) // 2
    ax, ay = anchor
    h, w = cell.shape[:2]
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    f = cell.astype(np.float32)
    al = f[..., 3] / 255
    pm = cv2.resize(f[..., :3] * al[..., None], (nw, nh), interpolation=cv2.INTER_AREA)
    a2 = cv2.resize(al, (nw, nh), interpolation=cv2.INTER_AREA)
    rgb = np.where(a2[..., None] > 1e-4, pm / np.maximum(a2[..., None], 1e-4), 0)
    small = np.dstack([np.clip(rgb, 0, 255), a2 * 255])
    canvas = np.zeros((fh, fw, 4), np.float32)
    ox, oy = round(fw / 2 - ax * s), round(base - ay * s)
    x0, y0, x1, y1 = max(ox, 0), max(oy, 0), min(ox + nw, fw), min(oy + nh, fh)
    clipped = (ox < 0) or (oy < 0) or (ox + nw > fw) or (oy + nh > fh)
    canvas[y0:y1, x0:x1] = small[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    return canvas.astype(np.uint8), clipped


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=SRC)
    ap.add_argument('--preview')
    a = ap.parse_args()
    c = CFG
    cells = split_cells(np.array(Image.open(a.src).convert('RGBA')))
    anchors = [foot_anchor(x) for x in cells]
    heights = [x.shape[0] for x in cells]
    s = c['ih'] / max(heights)                       # satu skala untuk semua frame; frame tertinggi = ih
    order = pingpong(c['idle']) + c['cast']
    out, clip = [], 0
    for i in order:
        f, cl = place(cells[i], anchors[i], s, c['fw'], c['fh'], c['ih'])
        out.append(f); clip += cl
    rows = (len(out) + COLS - 1) // COLS
    sheet = np.zeros((rows * c['fh'], COLS * c['fw'], 4), np.uint8)
    for n, f in enumerate(out):
        r, col = divmod(n, COLS)
        sheet[r * c['fh']:(r + 1) * c['fh'], col * c['fw']:(col + 1) * c['fw']] = f
    outp = os.path.join(SPR_DIR, c['pet'] + '.webp')
    Image.fromarray(sheet, 'RGBA').save(outp, 'WEBP', quality=92, method=6, alpha_quality=100)
    # lebar karakter saat idle (iw)
    idle_w = [cells[i][..., 3].astype(bool).any(0).nonzero()[0] for i in c['idle']]
    iw = round((max(w.max() for w in idle_w) - min(w.min() for w in idle_w)) * s)
    # gambar statis 128x128, lebar still_w, rata bawah (sama dengan api2)
    st, _ = place(cells[c['still']], anchors[c['still']], s, 480, 270, c['ih'])
    im = Image.fromarray(st, 'RGBA')
    im = im.crop(im.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    w = c['still_w']
    im = im.resize((w, max(1, round(im.height * w / im.width))), Image.LANCZOS)
    png = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    png.alpha_composite(im, ((128 - w) // 2, 126 - im.height))
    png.save(os.path.join(PET_DIR, c['png']))
    # sprites-data.js (tanpa "rel", sama dengan pet_api2)
    js = open(DATA_JS, encoding='utf-8').read()
    block = (f' "{c["pet"]}": {{\n  "file": "sprites/{c["pet"]}.webp?v={VERSION}",\n  "fw": {c["fw"]},\n  "fh": {c["fh"]},\n'
             f'  "iw": {iw},\n  "ih": {c["ih"]},\n  "idle": {len(pingpong(c["idle"]))},\n  "cast": {len(c["cast"])}\n }}')
    js, n = re.subn(r' "%s": \{.*?\n \}' % c['pet'], lambda m: block, js, count=1, flags=re.S)
    if n != 1: sys.exit('entri pet_air2 tidak ditemukan')
    open(DATA_JS, 'w', encoding='utf-8').write(js)
    print(f"pet_air2: skala {s:.3f}, {len(pingpong(c['idle']))} idle + {len(c['cast'])} serang, frame {c['fw']}x{c['fh']}, iw {iw}, ih {c['ih']}, "
          f"sheet {sheet.shape[1]}x{sheet.shape[0]}, {os.path.getsize(outp)//1024} KB, frame terpotong: {clip}")
    if a.preview:
        os.makedirs(a.preview, exist_ok=True)
        for tag, seq, ms in (('idle', out[:18], 100), ('serang', out[18:], 62)):
            fr = []
            for f in seq:
                bg = Image.new('RGBA', (c['fw'], c['fh']), (58, 110, 58, 255)); bg.alpha_composite(Image.fromarray(f, 'RGBA'))
                fr.append(bg.convert('P', palette=Image.ADAPTIVE))
            fr[0].save(os.path.join(a.preview, f"pet_air2_{tag}.gif"), save_all=True, append_images=fr[1:], duration=ms, loop=0)


if __name__ == '__main__':
    main()
