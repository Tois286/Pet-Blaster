"""Mesin animasi sprite untuk Pet Blaster.

Satu gambar PNG statis diubah menjadi beberapa frame dengan "mesh warp": tiap piksel hasil
mengambil warna dari titik sumber yang digeser oleh medan perpindahan (dx, dy). Medan itu disusun
dari efek kecil (napas, miring, ayun bagian tubuh, gelombang, kepakan, langkah kaki, api).
Semua efek memakai fase `ph` (0..2*pi) sehingga loop animasi mulus tanpa lompatan.

Koordinat bagian tubuh dinormalkan terhadap gambar asli: u = x/lebar, v = y/tinggi (v=1 di kaki).
"""
import math
import numpy as np
import cv2
from PIL import Image

TAU = 2 * math.pi


def sstep(x, a, b):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def box_mask(c, u0, u1, v0, v1, soft=.05):
    mu = sstep(c.U, u0 - soft, u0 + soft) * (1 - sstep(c.U, u1 - soft, u1 + soft))
    mv = sstep(c.V, v0 - soft, v0 + soft) * (1 - sstep(c.V, v1 - soft, v1 + soft))
    return mu * mv


class Canvas:
    """Gambar sumber (sudah diperkecil) di tengah kanvas berbantalan, plus grid koordinat."""

    def __init__(self, path, scale=1.0, pad=.18):
        im = Image.open(path).convert('RGBA')
        w0, h0 = im.size
        self.W, self.H = max(8, round(w0 * scale)), max(8, round(h0 * scale))
        if (self.W, self.H) != (w0, h0):
            im = im.resize((self.W, self.H), Image.LANCZOS)
        P = int(round(pad * max(self.W, self.H)))
        self.P = P
        self.CW, self.CH = self.W + 2 * P, self.H + 2 * P
        a = np.asarray(im).astype(np.float32) / 255.0
        a[..., :3] *= a[..., 3:4]                       # alpha ter-premultiply: interpolasi tanpa halo
        self.src = np.zeros((self.CH, self.CW, 4), np.float32)
        self.src[P:P + self.H, P:P + self.W] = a
        yy, xx = np.mgrid[0:self.CH, 0:self.CW].astype(np.float32)
        self.GX, self.GY = xx, yy
        self.X, self.Y = xx - P, yy - P
        self.U, self.V = self.X / self.W, self.Y / self.H

    # --- hasil ---
    def render(self, dx, dy, alpha=1.0, color=None):
        out = cv2.remap(self.src, self.GX - dx, self.GY - dy, cv2.INTER_LINEAR,
                        borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        if color is not None:
            out = color(out)
        out = out * alpha
        return out

    def to_image(self, premul):
        a = premul[..., 3:4]
        rgb = np.where(a > 1e-4, premul[..., :3] / np.maximum(a, 1e-4), 0)
        arr = np.concatenate([np.clip(rgb, 0, 1), np.clip(a, 0, 1)], axis=-1)
        return Image.fromarray((arr * 255 + .5).astype(np.uint8), 'RGBA')


# ---------------------------------------------------------------- efek (pabrik fungsi) ----
# Tiap efek -> fungsi (canvas, ph) -> (dx, dy) dalam piksel. Jumlah semua efek = medan total.

def z(c):
    return np.zeros_like(c.U), np.zeros_like(c.U)


def bob(a, f=1, off=0):
    """Naik-turun seluruh badan. a = pecahan tinggi."""
    def fn(c, ph):
        d = a * c.H * math.sin(f * ph + off)
        return np.zeros_like(c.U), np.full_like(c.U, d)
    return fn


def hop(a, f=1, off=0):
    """Lompatan kecil: selalu naik (|sin|), menapak di titik terendah."""
    def fn(c, ph):
        d = -a * c.H * abs(math.sin(.5 * f * ph + off))
        return np.zeros_like(c.U), np.full_like(c.U, d)
    return fn


def drift(a, f=1, off=0):
    """Geser kiri-kanan seluruh badan. a = pecahan lebar."""
    def fn(c, ph):
        return np.full_like(c.U, a * c.W * math.sin(f * ph + off)), np.zeros_like(c.U)
    return fn


def breathe(a, f=1, off=0, piv=(.5, 1.0), vol=.6, box=None):
    """Mengembang/menyusut (napas, jiwa). a>0: memanjang ke atas saat sin>0; volume dijaga sebagian."""
    def fn2(c, ph):   # V<pv (di atas titik tumpu) => (V-pv)<0, sy>0 menggeser ke atas
        s = math.sin(f * ph + off)
        sy, sx = a * s, -vol * a * s
        w = 1.0 if box is None else box_mask(c, *box)
        return sx * (c.U - piv[0]) * c.W * w, sy * (c.V - piv[1]) * c.H * w
    return fn2


def lean(a, pv=1.0, pw=1.2, f=1, off=0):
    """Badan condong: makin ke atas makin jauh (seperti bandul). a = pecahan lebar."""
    def fn(c, ph):
        w = np.clip((pv - c.V) / pv, 0, 1) ** pw
        return a * c.W * math.sin(f * ph + off) * w, np.zeros_like(c.U)
    return fn


def tilt(deg, f=1, off=0, piv=(.5, 1.0)):
    """Putar seluruh badan terhadap titik tumpu."""
    return part(None, piv, deg, f, off)


def part(box, piv, deg, f=1, off=0, soft=.06, ang=None):
    """Putar sebuah bagian tubuh (sayap, lengan, senjata, ekor, telinga) terhadap sendinya."""
    def fn(c, ph):
        d = ang(ph) if ang else deg * math.sin(f * ph + off)
        w = 1.0 if box is None else box_mask(c, *box, soft=soft)
        px, py = (c.U - piv[0]) * c.W, (c.V - piv[1]) * c.H
        r = math.radians(d)
        co, si = math.cos(r), math.sin(r)
        return ((co - 1) * px - si * py) * w, (si * px + (co - 1) * py) * w
    return fn


def move(box, ax, ay, f=1, off=0, soft=.06):
    """Geser satu bagian (tangan, ekor, kepala). ax, ay = pecahan lebar/tinggi."""
    def fn(c, ph):
        w = box_mask(c, *box, soft=soft)
        s = math.sin(f * ph + off)
        return ax * c.W * s * w, ay * c.H * s * w
    return fn


def wave(box, ax=0, ay=0, cycles=1.0, f=1, off=0, ramp=None, soft=.05):
    """Gelombang menjalar: ax = geser-x sepanjang v (ular, cacing, gurita), ay = geser-y sepanjang u (jumbai).
    ramp='down' makin kuat ke bawah, 'up' makin kuat ke atas."""
    def fn(c, ph):
        w = box_mask(c, *box, soft=soft)
        if ramp == 'down':
            w = w * np.clip((c.V - box[2]) / max(box[3] - box[2], 1e-3), 0, 1)
        elif ramp == 'up':
            w = w * np.clip((box[3] - c.V) / max(box[3] - box[2], 1e-3), 0, 1)
        elif ramp == 'right':
            w = w * np.clip((c.U - box[0]) / max(box[1] - box[0], 1e-3), 0, 1)
        elif ramp == 'left':
            w = w * np.clip((box[1] - c.U) / max(box[1] - box[0], 1e-3), 0, 1)
        dx = ax * c.W * np.sin(TAU * cycles * c.V - f * ph + off) * w
        dy = ay * c.H * np.sin(TAU * cycles * c.U - f * ph + off) * w
        return dx, dy
    return fn


def flicker(box, amp=.04, k=2.0, f=1, off=0, stretch=.03):
    """Api / asap: goyang acak-halus, ujung atas paling liar."""
    def fn(c, ph):
        w = box_mask(c, *box, soft=.06)
        up = np.clip((box[3] - c.V) / max(box[3] - box[2], 1e-3), 0, 1) ** .8
        s1 = np.sin(TAU * k * c.V + f * ph + off + 5 * c.U)
        s2 = np.sin(TAU * (k * 1.7) * c.V - 2 * f * ph + 2 * off + 9 * c.U)
        dx = amp * c.W * (.65 * s1 + .35 * s2) * w * up
        dy = -stretch * c.H * (.5 + .5 * np.sin(2 * f * ph + off + 7 * c.U)) * w * up
        return dx, dy
    return fn


def legs(v0, lift=.05, swing=.02, split=.5, f=1, off=0):
    """Langkah dua kaki bergantian: kaki kiri (u<split) naik saat sin>0, kaki kanan setengah putaran kemudian."""
    def fn(c, ph):
        wv = sstep(c.V, v0, min(v0 + .16, .98))
        sl = 1 - sstep(c.U, split - .03, split + .03)
        pl, pr = f * ph + off, f * ph + off + math.pi
        dy = -lift * c.H * (sl * max(0, math.sin(pl)) + (1 - sl) * max(0, math.sin(pr))) * wv
        dx = swing * c.W * (sl * math.sin(pl) + (1 - sl) * math.sin(pr)) * wv
        return dx, dy
    return fn


def squash(sx, sy, piv=(.5, 1.0)):
    """Skala statis (dipakai untuk pose pukulan/mati)."""
    def fn(c, ph):
        return (sx - 1) * (c.U - piv[0]) * c.W, (sy - 1) * (c.V - piv[1]) * c.H
    return fn


def shift(ax, ay):
    def fn(c, ph):
        return np.full_like(c.U, ax * c.W), np.full_like(c.U, ay * c.H)
    return fn


def swirl(box, amp=.05, f=1, off=0):
    """Pusaran: tiap tinggi bergeser sinus dengan fase berbeda (tornado, angin)."""
    def fn(c, ph):
        w = box_mask(c, *box, soft=.05)
        dx = amp * c.W * np.sin(TAU * 1.5 * c.V + f * ph + off) * w
        dy = .35 * amp * c.H * np.cos(TAU * 1.5 * c.U + f * ph + off) * w
        return dx, dy
    return fn


def field(c, effects, ph):
    dx, dy = z(c)
    for e in effects:
        a, b = e(c, ph)
        dx = dx + a
        dy = dy + b
    return dx, dy


def glow(lo, hi, a, f=1, off=0, smin=.35, vmin=.5):
    """Denyut cahaya: warna dengan hue lo..hi (derajat) lebih terang-menyala (lava, kristal, api)."""
    def make(ph):
        k = a * (.5 + .5 * math.sin(f * ph + off))

        def col(img):
            rgb = np.clip(img[..., :3] / np.maximum(img[..., 3:4], 1e-4), 0, 1).astype(np.float32)
            hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
            h = hsv[..., 0]
            m = ((h >= lo) & (h <= hi) & (hsv[..., 1] > smin) & (hsv[..., 2] > vmin)).astype(np.float32)
            m = cv2.GaussianBlur(m, (0, 0), 1.2)[..., None]
            out = img.copy()
            lift = 1 + k * .55 * m
            out[..., :3] = np.clip(out[..., :3] * lift + img[..., 3:4] * m * k * .22, 0, img[..., 3:4] * 1.0 + 0)
            return out
        return col
    return make


# ------------------------------------------------------------------- animasi gerak ----
def make_move(c, effects, n=8, glow_fx=None):
    frames = []
    for i in range(n):
        ph = TAU * i / n
        dx, dy = field(c, effects, ph)
        frames.append(c.to_image(c.render(dx, dy, color=glow_fx(ph) if glow_fx else None)))
    return frames


# ----------------------------------------------------------------- animasi terkena pukulan ----
def make_hit(c, base, n=3, power=1.0, mode='squash', sign=1):
    """Sentakan singkat: puncak di frame awal lalu pulih. mode: squash | recoil (terbang) | stiff (golem)."""
    ks = [1.0, .6, .2][:n]
    frames = []
    for k in ks:
        k = k * power
        if mode == 'recoil':
            fx = [squash(1 + .1 * k, 1 - .1 * k, (.5, .5)), shift(0, -.07 * k), tilt(-7 * k * sign, piv=(.5, .5))]
        elif mode == 'stiff':
            fx = [squash(1 + .05 * k, 1 - .06 * k), shift(0, -.015 * k), tilt(2.5 * k * sign)]
        else:
            fx = [squash(1 + .13 * k, 1 - .2 * k), shift(0, -.02 * k), tilt(-5 * k * sign), lean(.05 * k * sign, f=0, off=math.pi / 2)]
        dx, dy = field(c, base + fx, 0.0)
        frames.append(c.to_image(c.render(dx, dy)))
    return frames


# --------------------------------------------------------------------- animasi mati ----
def _blocks_shatter(c, p, size, seed, fall=.5, spread=.12):
    """Hancur jadi kepingan yang jatuh dan memudar (kerangka, golem)."""
    rng = np.random.RandomState(seed)
    out = np.zeros_like(c.src)
    bs = max(6, int(size))
    for by in range(c.P, c.P + c.H, bs):
        for bx in range(c.P, c.P + c.W, bs):
            blk = c.src[by:by + bs, bx:bx + bs]
            if blk[..., 3].max() < .02:
                continue
            vrow = (by - c.P) / c.H
            delay = rng.rand() * .35 + (1 - vrow) * .25     # atas jatuh dulu? tidak: bagian bawah menumpu, atas runtuh
            q = np.clip((p - delay * .6) / (1 - delay * .6), 0, 1)
            gx = (rng.rand() - .5) * spread * c.W * q
            gy = (q ** 2) * fall * c.H * (.5 + rng.rand() * .6)
            a = max(0, 1 - q ** 1.6)
            ox, oy = int(round(bx + gx)), int(round(by + gy))
            h, w = blk.shape[:2]
            x0, y0 = max(0, ox), max(0, oy)
            x1, y1 = min(c.CW, ox + w), min(c.CH, oy + h)
            if x1 <= x0 or y1 <= y0:
                continue
            out[y0:y1, x0:x1] += blk[y0 - oy:y1 - oy, x0 - ox:x1 - ox] * a
    return np.clip(out, 0, 1)


def make_die(c, kind='collapse', n=5, seed=0, base=None):
    frames = []
    base = base or []
    for i in range(n):
        p = (i + 1) / n
        if kind == 'shatter':
            img = _blocks_shatter(c, p, c.W / 16, seed)
        elif kind == 'pop':      # roh / api / slime: mengembang lalu menguap
            fx = [squash(1 + .3 * p, 1 + .22 * p, (.5, .55)), shift(0, -.03 * p)]
            dx, dy = field(c, fx, 0)
            img = c.render(dx, dy, alpha=max(0, 1 - p ** 1.8))
            if i == 0:
                img[..., :3] = np.clip(img[..., :3] + img[..., 3:4] * .35, 0, 1)
        elif kind == 'fall':     # terbang: tersambar jatuh sambil berputar
            fx = [part(None, (.5, .5), 0, ang=lambda ph, p=p: 38 * p), shift(0, .38 * p * p), squash(1 - .15 * p, 1 - .15 * p, (.5, .5))]
            dx, dy = field(c, fx, 0)
            img = c.render(dx, dy, alpha=max(0, 1 - p ** 1.8))
        elif kind == 'melt':     # gurita/ular/cacing: merosot gepeng ke tanah
            fx = [squash(1 + .45 * p, 1 - .85 * p ** .8), wave((0, 1, 0, 1), ax=.04 * (1 - p), cycles=1.5, f=1)]
            dx, dy = field(c, fx, TAU * p)
            img = c.render(dx, dy, alpha=max(0, 1 - max(0, p - .35) / .65) ** 1.2 if p > .35 else 1.0)
        else:                    # collapse: rubuh ke depan, gepeng, memudar
            fx = [squash(1 + .3 * p, 1 - .7 * p ** .9), tilt(14 * p, piv=(.5, 1.0)), shift(.04 * p, 0)]
            dx, dy = field(c, fx, 0)
            img = c.render(dx, dy, alpha=max(0, 1 - max(0, p - .3) / .7) ** 1.2 if p > .3 else 1.0)
        frames.append(c.to_image(img))
    return frames


# ------------------------------------------------------------------------ lembar sprite ----
def build_sheet(frames, cols):
    cw, ch = frames[0].size
    rows = (len(frames) + cols - 1) // cols
    sheet = Image.new('RGBA', (cw * cols, ch * rows), (0, 0, 0, 0))
    for i, f in enumerate(frames):
        sheet.paste(f, ((i % cols) * cw, (i // cols) * ch))
    return sheet, cw, ch
