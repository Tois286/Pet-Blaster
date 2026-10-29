#!/usr/bin/env python3
"""Buat sprite sheet pet_air1 (Salamander), pet_air2 (Naga Air), pet_air3 (Naga Es) dari 6 sprite sheet JPG.

Pemakaian (dari folder proyek):
    python3 tools/make_air_sheets.py                       # semua, sumber di tools/source/air/
    python3 tools/make_air_sheets.py --src folder_lain     # folder sumber lain (air_evol1_idle.jpg, dst.)
    python3 tools/make_air_sheets.py --only 3              # hanya evolusi 3
    python3 tools/make_air_sheets.py --preview /tmp/prev   # simpan GIF pratinjau

Sumber: air_evol{1,2,3}_{idle,attack}.jpg di tools/source/air/.
Hasil:
    public/game/assets/sprites/pet_air1..3.webp   sprite sheet (idle dulu, lalu serang)
    public/game/assets/pets/air1..3.png           gambar statis 128x128 (kartu, evolusi, menu Pet)
    public/game/js/sprites-data.js                entri pet_air1..3 diperbarui

Langkah: (1) hapus latar (abu-krem / abu-abu / putih / kotak-kotak palsu) dan bayangan tanah jadi transparan,
(2) pisahkan tiap frame (frame yang saling menempel dipisah otomatis) dan urutkan baris demi baris,
(3) samakan ukuran idle dan serang, kaki tiap frame berpijak di garis dasar yang sama (lihat petOrigin di game.js).
Gerakan idle dibuat bolak-balik (ping-pong) dari sebagian frame, sama seperti Srigala Api / Serigala Lava.
Butuh numpy, scipy, scikit-image, opencv-python, pillow.
"""
import argparse, math, os, re, sys
import cv2
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.segmentation import watershed

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, 'tools/source/air')
SPR_DIR = os.path.join(ROOT, 'public/game/assets/sprites')
PET_DIR = os.path.join(ROOT, 'public/game/assets/pets')
DATA_JS = os.path.join(ROOT, 'public/game/js/sprites-data.js')
COLS = 6
VERSION = 'air1'      # ?v=... di nama berkas supaya browser memuat sheet baru, bukan cache lama

# stand = tinggi karakter saat berdiri/idle (px sheet; di game diskala .5); iw_cap = lebar maksimum karakter, termasuk
# frame serang yang meregang (skala diperkecil bila terlewati); idle_step = ambil tiap frame ke-n dari sheet idle lalu
# bolak-balik; still = nomor frame idle untuk gambar statis
CFG = {
    1: dict(pet='pet_air1', png='air1.png', stand=92,  iw_cap=175, idle_step=2, still=0),
    2: dict(pet='pet_air2', png='air2.png', stand=110, iw_cap=175, idle_step=3, still=0),
    3: dict(pet='pet_air3', png='air3.png', stand=116, iw_cap=175, idle_step=2, still=0),
}

# warna latar tiap sheet (diukur dari tepi gambar) dan toleransinya
PAL = {
    'air_evol1_idle': ([(186, 177, 168)], 26), 'air_evol1_attack': ([(186, 177, 168)], 26),
    'air_evol2_idle': ([(125, 125, 125)], 20), 'air_evol2_attack': ([(139, 139, 139)], 20),
    'air_evol3_idle': ([(255, 255, 255)], 14), 'air_evol3_attack': ([(195, 195, 195), (240, 240, 240)], 20),
}


# ---------------------------------------------------------------- hapus latar + bayangan
def lum(a):
    return 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]


def bg_like(a, name):
    a = a.astype(np.int32)
    pal, tol = PAL[name]
    d = np.full(a.shape[:2], 9999.0)
    for p in pal:
        d = np.minimum(d, np.sqrt(((a - np.array(p)) ** 2).sum(-1)))
    near = d < tol
    chroma, L = a.max(-1) - a.min(-1), lum(a)
    if name.endswith('evol3_idle'):          # latar putih: hanya bayangan abu di tanah, jangan perut krem
        shadow = (chroma <= 10) & (L >= 110) & (L <= 205)
    elif name.endswith('evol3_attack'):      # kotak-kotak palsu (JPG) + bayangan tanah
        shadow = (chroma <= 12) & (L >= 110) & (L <= 250)
    else:                                    # latar abu: bayangan = abu lebih gelap dari latar
        shadow = (chroma <= 22) & (L <= max(lum(np.array(p, dtype=float)) for p in pal) + 4) & (L >= 55)
    return near | shadow


def segment(path, name):
    a = np.array(Image.open(path).convert('RGB'))
    bgl = bg_like(a, name).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(bgl, connectivity=4)
    h, w = bgl.shape
    # evol1/2: celah latar di dalam lingkar ekor ikut dibuang; evol3: tidak ada lingkar ekor, jadi perut/dagu aman
    thr = 10 ** 9 if 'evol3' in name else 120
    bg = np.zeros((h, w), np.uint8)
    for i in range(1, n):
        x, y, ww, hh, area = stats[i]
        if x == 0 or y == 0 or x + ww >= w or y + hh >= h or area > thr:
            bg[lab == i] = 1
    fg = (1 - bg).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg, connectivity=8)
    out = np.zeros_like(fg)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] >= 60:
            out[lab == i] = 1
    return a, out


# ---------------------------------------------------------------- pisahkan frame
def split_blob(blob, k):
    """Pecah gumpalan dua frame yang menempel: erosi sampai muncul k inti yang berarti, lalu watershed."""
    b = blob.astype(np.uint8)
    er, comps, lab, st = b.copy(), [], None, None
    k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    for _ in range(300):
        er = cv2.erode(er, k3)
        if er.sum() == 0:
            break
        n, lab, st, _ = cv2.connectedComponentsWithStats(er, connectivity=8)
        comps = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] >= 0.2 * er.sum() / k]
        if len(comps) >= k:
            break
    comps = sorted(comps, key=lambda i: -st[i, cv2.CC_STAT_AREA])[:k]
    markers = np.zeros(b.shape, np.int32)
    for j, i in enumerate(comps):
        markers[lab == i] = j + 1
    ws = watershed(-ndi.distance_transform_edt(b), markers, mask=b.astype(bool))
    return [ws == j + 1 for j in range(len(comps))]


def extract_frames(path, name):
    a, m = segment(path, name)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m, connectivity=8)
    areas = stats[1:, cv2.CC_STAT_AREA]
    big_thr = 0.3 * np.median(np.sort(areas)[::-1][:10])
    bigs = [i for i in range(1, n) if stats[i, cv2.CC_STAT_AREA] >= big_thr]
    med = np.median([stats[i, cv2.CC_STAT_AREA] for i in bigs])
    masks = []
    for i in bigs:
        k = int(round(stats[i, cv2.CC_STAT_AREA] / (1.15 * med)))
        masks += split_blob(lab == i, k) if k >= 2 else [lab == i]
    # serpihan kecil (kristal ekor, percikan air) menempel ke frame terdekat
    dts = [cv2.distanceTransform((~mm).astype(np.uint8), cv2.DIST_L2, 3) for mm in masks]
    for i in range(1, n):
        if i in bigs:
            continue
        sm = lab == i
        ds = [dt[sm].min() for dt in dts]
        j = int(np.argmin(ds))
        if ds[j] <= 160:
            masks[j] = masks[j] | sm
    return a, masks


def order_frames(masks):
    info = []
    for mm in masks:
        ys, xs = np.nonzero(mm)
        info.append((ys.max(), (xs.min() + xs.max()) / 2))
    gap = 0.35 * np.median([np.ptp(np.nonzero(mm)[0]) for mm in masks])
    idx = sorted(range(len(masks)), key=lambda i: info[i][0])
    rows = [[idx[0]]]
    for i in idx[1:]:
        if info[i][0] - info[rows[-1][-1]][0] > gap:
            rows.append([i])
        else:
            rows[-1].append(i)
    return [i for r in rows for i in sorted(r, key=lambda i: info[i][1])]


def frame_rgba(a, mm):
    """Potong satu frame (RGBA, tepi halus) dan cari titik kaki (tengah-x telapak, dasar = baris terbawah)."""
    m = cv2.erode(mm.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    alpha = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.8)
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    al = (np.clip(alpha[y0:y1, x0:x1], 0, 1) * 255).astype(np.uint8)
    mc = m[y0:y1, x0:x1]
    band = mc[int((y1 - y0) * 0.92):, :]
    bx = np.nonzero(band)[1]
    ax = float(np.median(bx)) if len(bx) else (x1 - x0) / 2
    return np.dstack([a[y0:y1, x0:x1], al]), ax


def load_sheet(src, evo, kind):
    name = f'air_evol{evo}_{kind}'
    a, masks = extract_frames(os.path.join(src, name + '.jpg'), name)
    return [frame_rgba(a, masks[i]) for i in order_frames(masks)]


# ---------------------------------------------------------------- susun sprite sheet
def pingpong(seq):
    return seq + seq[-2:0:-1]


def sqrt_area(frames):
    return math.sqrt(np.median([(f[0][..., 3] > 128).sum() for f in frames]))


def scaled(rgba, ax, s):
    """Skala frame (alpha ter-premultiply, tanpa halo)."""
    h, w = rgba.shape[:2]
    nw, nh = max(1, round(w * s)), max(1, round(h * s))
    f = rgba.astype(np.float32) / 255.
    f[..., :3] *= f[..., 3:4]
    r = np.clip(cv2.resize(f, (nw, nh), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_LANCZOS4), 0, 1)
    al = r[..., 3:4]
    rgb = np.where(al > 1e-4, r[..., :3] / np.maximum(al, 1e-4), 0)
    return (np.dstack([np.clip(rgb, 0, 1), al]) * 255 + .5).astype(np.uint8), ax * s


def place(small, ax, fw, fh, ih):
    """Letakkan frame di kanvas fw x fh: kaki di tengah-x, telapak berpijak di baris (fh+ih)//2 (sama dengan petOrigin)."""
    base = (fh + ih) // 2
    h, w = small.shape[:2]
    canvas = np.zeros((fh, fw, 4), np.uint8)
    ox, oy = round(fw / 2 - ax), base - h
    x0, y0, x1, y1 = max(ox, 0), max(oy, 0), min(ox + w, fw), min(oy + h, fh)
    canvas[y0:y1, x0:x1] = small[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
    return canvas


def build(evo, src, preview=None):
    c = CFG[evo]
    idle_raw, atk_raw = load_sheet(src, evo, 'idle'), load_sheet(src, evo, 'attack')
    rel = {'idle': 1.0, 'attack': sqrt_area(idle_raw) / sqrt_area(atk_raw)}   # serang disamakan ukurannya dengan idle
    allf = [(r, ax * rel[k], r.shape[0] * rel[k], r.shape[1] * rel[k]) for k, fr in (('idle', idle_raw), ('attack', atk_raw)) for r, ax in fr]
    H = max(h for _, _, h, _ in allf)
    H_idle = float(np.median([r.shape[0] for r, _ in idle_raw]))
    left, right = max(ax for _, ax, _, _ in allf), max(w - ax for _, ax, _, w in allf)
    S = min(c['stand'] / H_idle, c['iw_cap'] / (left + right))
    ih, iw = math.ceil(S * H), math.ceil(S * (left + right))
    fh = ih + 24
    fw = 2 * math.ceil(S * max(left, right)) + 24
    fw += fw % 2

    idle_idx = pingpong(list(range(0, len(idle_raw), c['idle_step'])))
    cells = []
    for i in idle_idx:
        r, ax = idle_raw[i]
        cells.append(place(*scaled(r, ax, S * rel['idle']), fw, fh, ih))
    for r, ax in atk_raw:
        cells.append(place(*scaled(r, ax, S * rel['attack']), fw, fh, ih))
    n_idle, n_cast = len(idle_idx), len(atk_raw)

    rows = (len(cells) + COLS - 1) // COLS
    sheet = np.zeros((rows * fh, COLS * fw, 4), np.uint8)
    for n, cell in enumerate(cells):
        r, col = divmod(n, COLS)
        sheet[r * fh:(r + 1) * fh, col * fw:(col + 1) * fw] = cell
    out = os.path.join(SPR_DIR, c['pet'] + '.webp')
    Image.fromarray(sheet, 'RGBA').save(out, 'WEBP', quality=92, method=6, alpha_quality=100)

    # gambar statis 128x128: rapatkan ke tepi karakter, muat dalam 124x122, rata bawah
    r, ax = idle_raw[c['still']]
    st = Image.fromarray(scaled(r, ax, 1.0)[0], 'RGBA')
    st = st.crop(st.getchannel('A').point(lambda v: 255 if v > 40 else 0).getbbox())
    k = min(124 / st.width, 122 / st.height)
    st = st.resize((max(1, round(st.width * k)), max(1, round(st.height * k))), Image.LANCZOS)
    png = Image.new('RGBA', (128, 128), (0, 0, 0, 0))
    png.alpha_composite(st, ((128 - st.width) // 2, 126 - st.height))
    png.save(os.path.join(PET_DIR, c['png']))
    print(f"{c['pet']}: {n_idle} idle + {n_cast} serang, frame {fw}x{fh}, karakter {iw}x{ih}, "
          f"sheet {sheet.shape[1]}x{sheet.shape[0]}, {os.path.getsize(out) // 1024} KB")

    if preview:
        os.makedirs(preview, exist_ok=True)
        for tag, rng, ms in (('idle', range(0, n_idle), 70), ('serang', range(n_idle, n_idle + n_cast), 62)):
            fr = []
            for n in rng:
                bg = Image.new('RGBA', (fw, fh), (58, 110, 58, 255))
                bg.alpha_composite(Image.fromarray(cells[n], 'RGBA'))
                fr.append(bg.convert('P', palette=Image.ADAPTIVE))
            fr[0].save(os.path.join(preview, f"{c['pet']}_{tag}.gif"), save_all=True, append_images=fr[1:], duration=ms, loop=0)
    return dict(pet=c['pet'], fw=fw, fh=fh, iw=iw, ih=ih, idle=n_idle, cast=n_cast)


def update_data(entries):
    js = open(DATA_JS, encoding='utf-8').read()
    for e in entries:
        block = (f' "{e["pet"]}": {{\n  "file": "sprites/{e["pet"]}.webp?v={VERSION}",\n  "fw": {e["fw"]},\n  "fh": {e["fh"]},\n'
                 f'  "iw": {e["iw"]},\n  "ih": {e["ih"]},\n  "idle": {e["idle"]},\n  "cast": {e["cast"]}\n }}')
        js, n = re.subn(r' "%s": \{.*?\n \}' % e['pet'], lambda m: block, js, count=1, flags=re.S)
        if n != 1:
            sys.exit('entri %s tidak ditemukan di sprites-data.js' % e['pet'])
    open(DATA_JS, 'w', encoding='utf-8').write(js)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--src', default=SRC_DIR)
    ap.add_argument('--only', type=int, choices=(1, 2, 3))
    ap.add_argument('--preview')
    args = ap.parse_args()
    os.makedirs(SPR_DIR, exist_ok=True)
    entries = [build(evo, args.src, args.preview) for evo in (1, 2, 3) if args.only in (None, evo)]
    update_data(entries)


if __name__ == '__main__':
    main()
