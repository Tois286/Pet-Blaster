#!/usr/bin/env python3
"""Menambah frame jembatan di akhir sprite sheet Naga Fusion supaya loop animasinya tidak patah.

Masalah: animasi naga berakhir di pose menggeram (kepala keluar, mulut terbuka, frame 94),
sedangkan frame 0 berpose tenang (kepala saling menghadap). Tiap putaran loop, naga "melompat" antar dua pose itu.
Skrip ini membuat BRIDGE frame antara pose frame terakhir dan frame 0 (morf berbasis optical flow,
bukan sekadar cross-fade), lalu menambahkannya setelah frame asli di sheet yang sama.

Pakai:  python3 tools/make_naga_bridge.py
Sumber asli dibaca dari backup-lama-naga/fusion_api_air_battle.webp (95 frame, 160x204, 10 kolom),
hasil ditulis ke public/game/assets/pets/fusion_api_air_battle.webp (95 + BRIDGE frame).
Setelah itu ubah NAGA.frames di game.js menjadi 95 + BRIDGE (skrip mencetak angkanya).
Butuh numpy, opencv-python, pillow.
"""
import os, sys
import numpy as np, cv2
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'backup-lama-naga', 'fusion_api_air_battle.webp')
OUT = os.path.join(ROOT, 'public', 'game', 'assets', 'pets', 'fusion_api_air_battle.webp')
FW, FH, COLS, N = 160, 204, 10, 95
BRIDGE = 5   # jumlah frame jembatan (5 frame @ 12 fps = sekitar 0,42 detik); 95 + 5 = 100 frame = pas 10x10 di sheet


def frame(sheet, i):
    x, y = (i % COLS) * FW, (i // COLS) * FH
    return np.asarray(sheet.crop((x, y, x + FW, y + FH))).astype(np.float32) / 255.0


def premul(a):
    p = a.copy(); p[..., :3] *= p[..., 3:4]; return p


def gray(p):   # siluet + warna di atas latar abu-abu netral, dipakai untuk menghitung flow
    bg = 0.5 * (1 - p[..., 3:4])
    g = cv2.cvtColor(np.clip(p[..., :3] + bg, 0, 1), cv2.COLOR_RGB2GRAY)
    return (g * 255).astype(np.uint8)


def warp(p, flow, k):   # ambil piksel dari p di posisi x + k*flow(x), per saluran premultiplied
    h, w = flow.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(p, gx + k * flow[..., 0], gy + k * flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def main():
    sheet = Image.open(SRC).convert('RGBA')
    A, B = premul(frame(sheet, N - 1)), premul(frame(sheet, 0))   # pose akhir -> pose awal
    ga, gb = gray(A), gray(B)
    fb = lambda x, y: cv2.calcOpticalFlowFarneback(x, y, None, 0.5, 6, 21, 8, 7, 1.5, cv2.OPTFLOW_FARNEBACK_GAUSSIAN)
    f_ba = fb(gb, ga)   # B -> A (piksel di B ada di mana pada A)
    f_ab = fb(ga, gb)   # A -> B
    out = []
    for k in range(1, BRIDGE + 1):
        t = k / (BRIDGE + 1)
        t = t * t * (3 - 2 * t)   # smoothstep: mulai dan berhenti perlahan, tidak kaku
        a = warp(A, f_ba, t)           # A bergerak maju menuju B
        b = warp(B, f_ab, -(1 - t))    # B ditarik mundur ke arah A
        p = (1 - t) * a + t * b
        al = np.clip(p[..., 3:4], 1e-6, 1)
        rgb = np.clip(p[..., :3] / al, 0, 1)
        out.append(np.concatenate([rgb, np.clip(p[..., 3:4], 0, 1)], axis=2))
    total = N + BRIDGE
    rows = -(-total // COLS)
    new = Image.new('RGBA', (COLS * FW, rows * FH), (0, 0, 0, 0))
    new.paste(sheet.crop((0, 0, COLS * FW, -(-N // COLS) * FH)), (0, 0))
    for k, f in enumerate(out):
        i = N + k
        im = Image.fromarray((f * 255 + .5).astype(np.uint8), 'RGBA')
        new.paste(im, ((i % COLS) * FW, (i // COLS) * FH))
    new.save(OUT, quality=92, alpha_quality=100, method=6)   # lossy kualitas tinggi: ukuran file tetap kecil
    print('frame total:', total, '| ukuran sheet:', new.size, '| set NAGA.frames =', total)
    if '--preview' in sys.argv:
        pv = Image.new('RGBA', (FW * (BRIDGE + 2), FH), (110, 150, 110, 255))
        seq = [Image.fromarray((premul_inv * 255).astype(np.uint8), 'RGBA') for premul_inv in []]
        for k, i in enumerate([N - 1] + list(range(N, total)) + [0]):
            x, y = (i % COLS) * FW, (i // COLS) * FH
            pv.alpha_composite((new if i >= N else sheet).crop((x, y, x + FW, y + FH)), (k * FW, 0))
        pv.convert('RGB').save(sys.argv[sys.argv.index('--preview') + 1])


if __name__ == '__main__':
    main()
