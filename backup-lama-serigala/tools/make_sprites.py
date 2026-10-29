#!/usr/bin/env python3
"""Membuat sprite sheet animasi untuk semua monster dan pet Pet Blaster dari PNG statis.

Pemakaian (dari folder pet-blaster):
    python3 tools/make_sprites.py                 # semua karakter
    python3 tools/make_sprites.py mon05 pet_api2  # hanya sebagian
Hasil: public/game/assets/sprites/*.webp + public/game/js/sprites-data.js (ukuran frame & jumlah frame).
Butuh: python3, numpy, opencv-python, pillow.

Gerakan tiap karakter didefinisikan di tabel MON dan PET di bawah (bagian tubuh dalam koordinat u,v 0..1).
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from spritelib import *   # noqa

ROOT = os.path.dirname(HERE)
ASSETS = os.path.join(ROOT, 'public', 'game', 'assets')
OUT = os.environ.get('SPRITE_OUT', os.path.join(ASSETS, 'sprites'))
DATA_JS = os.environ.get('SPRITE_DATA', os.path.join(ROOT, 'public', 'game', 'js', 'sprites-data.js'))
PREVIEW = os.environ.get('SPRITE_PREVIEW')            # folder opsional untuk GIF pratinjau
PI = math.pi
CUSTOM = {'pet_api1'}   # sprite sheet dibuat dari video (bukan dari tools ini): dilewati kecuali disebut eksplisit, mis. `make_sprites.py pet_api1`

# ------------------------------------------------------------------ MONSTER ----
# id: (berkas, tinggi tampil terbesar (px game), efek gerak, mode pukulan, jenis mati, tanda pukulan)
# Walker 2 kaki memakai hop(f=2) + legs(...f=1): kaki kiri/kanan bergantian saat badan melompat kecil.
def walker(v0=.72, split=.5, hp=.035, lift=.055, sw=.022, ls=.03):
    return [hop(hp, f=2), legs(v0, lift, sw, split), lean(ls, pv=.9, f=1, off=.3), breathe(.012, f=2, off=1)]

MON = {
 1: ('01_goblin_api', 64, lambda: walker(.74, .35) + [
        part((.6, 1, 0, .9), (.72, .55), 8, f=1, off=.9),                 # tombak diayun
        part((0, .3, .12, .34), (.25, .3), 11, f=2, off=.4),              # telinga bergoyang
        flicker((0, .26, .55, .85), amp=.05, k=2, f=1)],                  # obor di tangan
      'squash', 'collapse', 1, None),
 2: ('02_imp', 64, lambda: [bob(.04), part((0, .36, .15, .72), (.36, .45), 17, f=2, off=.2),
        part((.72, 1, .1, .9), (.84, .6), 5, f=1, off=1), part((.04, .3, .72, .95), (.25, .76), 12, f=2, off=.6),
        tilt(3.5, f=1, off=.5, piv=(.5, .6)), breathe(.02, f=2)],
      'recoil', 'fall', 1, None),
 3: ('03_fire_slime', 64, lambda: [hop(.055, f=2), breathe(.10, f=2, off=-PI / 2, piv=(.5, .95), vol=.8),
        flicker((0, 1, 0, .6), amp=.06, k=2.2, f=1, stretch=.04)],
      'squash', 'pop', -1, glow(0, 45, .3)),
 4: ('04_skeleton_api', 64, lambda: walker(.72, .5) + [
        part((.6, 1, 0, .95), (.7, .62), 9, f=1, off=.9), part((0, .25, .4, .9), (.2, .45), -9, f=1, off=3.1),
        flicker((.25, .85, 0, .45), amp=.05, k=2, f=1)],
      'squash', 'shatter', 1, glow(0, 45, .5)),
 5: ('05_lava_golem_mini', 118, lambda: [hop(.022, f=1), legs(.76, .03, .012, .5), lean(.02, pv=.9, f=1, off=.4),
        part((0, .3, .3, .95), (.25, .35), -7, f=1, off=0), part((.72, 1, .4, .95), (.75, .4), 7, f=1, off=PI),
        part((.35, .75, .05, .4), (.55, .45), 3, f=2, off=.5), breathe(.018, f=2, piv=(.5, 1.0)),
        flicker((0, 1, 0, .4), amp=.03, k=3, f=1, stretch=.025)],
      'stiff', 'shatter', 1, glow(0, 45, .6)),
 6: ('06_fishman', 64, lambda: walker(.72, .5) + [
        part((.6, 1, 0, .85), (.73, .6), 8, f=1, off=.9), part((.08, .4, .22, .42), (.35, .35), -11, f=2, off=.3),
        part((.0, .2, .5, .88), (.18, .52), -8, f=1, off=3.1)],
      'squash', 'collapse', 1, None),
 7: ('07_water_imp', 64, lambda: [bob(.04, f=1), part((0, .27, .3, .66), (.24, .46), 20, f=2, off=.2),
        part((.62, 1, .1, .9), (.74, .55), 6, f=1, off=1), tilt(4, f=1, off=.5, piv=(.5, .6)),
        part((.1, .7, 0, .3), (.4, .3), 4, f=2, off=.7), wave((.1, .8, .62, .96), ax=.02, cycles=1, f=2)],
      'recoil', 'fall', -1, None),
 8: ('08_octopus', 64, lambda: [bob(.025, f=2), breathe(.045, f=1, piv=(.5, .55), box=(.15, .85, 0, .62)),
        wave((0, 1, .5, 1), ax=.035, ay=.03, cycles=1.6, f=1, ramp='down')],
      'squash', 'melt', 1, None),
 9: ('09_water_skeleton', 64, lambda: walker(.72, .4) + [
        move((.5, .85, .4, 1.0), 0, -.02, f=2), part((.55, 1, 0, .5), (.65, .5), 7, f=1, off=.9),
        part((0, .22, .45, .9), (.2, .5), -9, f=1, off=3.1)],
      'squash', 'shatter', -1, None),
 10: ('10_sea_serpent_mini', 105, lambda: [wave((.1, .95, .3, .95), ax=.035, cycles=.9, f=1, ramp='up'),
        part((.6, 1, 0, .5), (.7, .5), 6, f=1, off=1.2), part((0, .28, .4, .7), (.3, .66), 10, f=2, off=.5),
        part((.82, 1, .55, .9), (.82, .86), -10, f=2, off=1.2), breathe(.022, f=1, piv=(.5, 1.0)),
        flicker((0, 1, .8, 1.0), amp=.02, k=3, f=1, stretch=.01)],
      'squash', 'melt', 1, None),
 11: ('11_goblin_tanah', 64, lambda: walker(.7, .4) + [
        part((.58, 1, .25, .9), (.6, .7), 10, f=1, off=.9), part((.05, .4, .3, .6), (.33, .45), -10, f=2, off=.4),
        part((.0, .2, .55, .95), (.2, .6), -8, f=1, off=3.1)],
      'squash', 'collapse', 1, None),
 12: ('12_rock_golem_mini', 102, lambda: [hop(.025, f=1), legs(.76, .03, .012, .5), lean(.018, pv=.9, f=1, off=.4),
        part((0, .22, .3, .95), (.2, .35), -7, f=1, off=0), part((.76, 1, .5, .95), (.8, .5), 7, f=1, off=PI),
        part((.3, .75, .1, .5), (.5, .5), 3, f=2, off=.5), breathe(.015, f=2, piv=(.5, 1.0)), tilt(1.5, f=1)],
      'stiff', 'shatter', 1, None),
 13: ('13_mole', 64, lambda: [hop(.03, f=2), breathe(-.055, f=2, vol=1.0, piv=(.5, 1.0)),
        part((.5, 1, .3, 1), (.62, .55), -13, f=2, off=0), part((.1, .45, .7, 1), (.3, .75), 11, f=2, off=PI),
        move((.74, .95, .3, .6), .012, 0, f=4), part((0, .12, .55, .85), (.1, .7), 12, f=2, off=1)],
      'squash', 'melt', -1, None),
 14: ('14_skeleton_tank', 64, lambda: walker(.72, .5, hp=.028, lift=.045, sw=.018, ls=.02) + [
        part((0, .42, .4, 1), (.35, .45), -4, f=1, off=.5), part((.62, 1, 0, .6), (.8, .6), 6, f=1, off=.9),
        part((.74, 1, .5, 1), (.85, .55), -5, f=1, off=3.1)],
      'stiff', 'shatter', 1, None),
 15: ('15_earth_worm', 64, lambda: [wave((.1, .9, .1, .8), ax=.04, cycles=1, f=1, ramp='up'),
        part((.35, .85, 0, .5), (.55, .5), 7, f=1, off=.8), wave((0, 1, .62, 1), ay=.012, cycles=2, f=2),
        breathe(.035, f=1, piv=(.5, 1.0), box=(.1, .9, 0, .95))],
      'squash', 'melt', 1, None),
 16: ('16_harpy', 64, lambda: [part((0, .42, .1, .75), (.45, .4), 17, f=1), part((.58, 1, 0, .72), (.6, .4), -17, f=1),
        bob(.03, f=1, off=PI), part((.3, .75, .6, .9), (.5, .6), 8, f=2), swirl((0, 1, .7, 1), amp=.04, f=1)],
      'recoil', 'fall', 1, None),
 17: ('17_wind_imp', 64, lambda: [bob(.035, f=1), part((.04, .35, 0, .5), (.32, .38), 22, f=2),
        swirl((.55, 1, 0, .8), amp=.035, f=1), swirl((0, 1, .6, 1), amp=.04, f=1, off=1),
        tilt(5, f=1, off=.5, piv=(.5, .6)), part((.3, .85, 0, .45), (.55, .5), 4, f=1, off=1.5)],
      'recoil', 'fall', -1, None),
 18: ('18_vulture', 64, lambda: [part((0, .45, 0, 1), (.45, .35), 14, f=1), part((.55, 1, 0, .92), (.58, .4), -14, f=1),
        bob(.035, f=1, off=PI), part((.6, .95, .25, .7), (.6, .5), 6, f=2, off=.6)],
      'recoil', 'fall', 1, None),
 19: ('19_wind_skeleton', 64, lambda: walker(.7, .4) + [
        wave((0, .4, .25, .85), ax=.02, ay=.03, cycles=1.2, f=1, ramp='left'),
        part((.55, 1, .05, .95), (.62, .6), 8, f=1, off=.9)],
      'squash', 'shatter', -1, None),
 20: ('20_tornado_spirit', 64, lambda: [swirl((0, 1, 0, 1), amp=.04, f=1), bob(.03, f=1),
        part((0, .25, .05, .95), (.5, .5), 10, f=1), part((.75, 1, .05, .95), (.5, .5), -10, f=1, off=1),
        breathe(.045, f=2, piv=(.5, .95), vol=1), tilt(5, f=1, piv=(.5, .95))],
      'recoil', 'pop', 1, None),
}

# ---------------------------------------------------------------------- PET ----
def cast_fx(s, sq=.13, rise=.07, thrust=.06, tl=6, extras=()):
    """Pose serangan pada nilai s: s>0 menekuk/menumpu (bersiap), s<0 melonjak ke depan."""
    fx = [squash(1 + .08 * s * (sq / .13), 1 - sq * s, (.5, .95)),
          shift(thrust * (-min(0, s)), rise * min(0, s)),
          tilt(tl * s, piv=(.5, .95))]
    for e in extras:
        fx.append(e(s))
    return fx


def A(box, piv, deg, soft=.06):
    """Bagian yang diayun searah nilai s pada animasi serang."""
    return lambda s: part(box, piv, 0, ang=lambda ph: deg * s, soft=soft)

CAST_S = [.6, 1.0, .1, -.8, -1.0, -.35]

# nama: (berkas, efek idle, kwarg serang, efek tambahan serang, efek warna)
PET = {
 'air1': ('air1', lambda: [flicker((.05, .35, .2, .55), amp=.05, k=2, f=1), part((.05, .35, .4, .8), (.3, .72), 10, f=1),
        breathe(.028, f=1, piv=(.5, .95)), part((.4, .8, .3, .65), (.55, .65), 3, f=2, off=1)],
      dict(sq=-.11, rise=.05, thrust=.07, tl=-4), [A((.05, .35, .35, .8), (.3, .72), -22)], None),   # air1: pipi menggembung lalu meniup gelembung
 'air2': ('air2', lambda: [wave((.3, .85, .15, .85), ax=.025, cycles=.8, f=1, ramp='up'),
        part((.45, .85, .1, .45), (.6, .5), 5, f=1, off=1), part((.05, .5, .5, .9), (.4, .8), 8, f=2),
        breathe(.02, f=1, piv=(.5, .95))],
      dict(sq=.09, rise=.1, thrust=.05, tl=-7), [A((.45, .85, .05, .5), (.6, .5), 12)], None),
 'air3': ('air3', lambda: [wave((.3, .85, .15, .85), ax=.025, cycles=.8, f=1, ramp='up'),
        part((.45, .85, .08, .45), (.6, .5), 5, f=1, off=1), part((.05, .5, .5, .9), (.4, .8), 8, f=2),
        breathe(.02, f=1, piv=(.5, .95)), flicker((.0, .25, .25, .8), amp=.012, k=2, f=1, stretch=.01)],
      dict(sq=.09, rise=.14, thrust=.03, tl=-9), [A((.45, .85, .05, .5), (.6, .5), 12)], glow(180, 230, 1.0)),   # air3: bangkit tegak, kristal menyala
 'angin1': ('angin1', lambda: [part((.03, .48, .4, .85), (.46, .62), 22, f=2), bob(.045, f=2, off=PI),
        part((.4, .8, .4, .75), (.6, .75), 4, f=1), swirl((.05, .95, .8, .96), amp=.02, f=1)],
      dict(sq=.05, rise=.16, thrust=.03, tl=-3), [A((.03, .48, .3, .85), (.46, .62), -40)], None),   # angin1: kepakan sayap kuat
 'angin2': ('angin2', lambda: [part((0, .45, .1, .75), (.45, .55), 18, f=2), part((.55, 1, .05, .62), (.58, .55), -18, f=2),
        bob(.035, f=2, off=PI), part((.55, .9, .35, .75), (.65, .7), 4, f=1)],
      dict(sq=.05, rise=.14, thrust=.05, tl=-4, mode='dive'), [A((0, .45, .1, .75), (.45, .55), -30), A((.55, 1, .05, .62), (.58, .55), 30)], None),   # angin2: menukik mencakar
 'angin3': ('angin3', lambda: [part((0, .55, .05, .7), (.5, .45), 14, f=1), wave((.05, .5, .5, .95), ax=.02, ay=.025, cycles=1, f=1, ramp='left'),
        flicker((.7, .95, 0, .35), amp=.03, k=1.5, f=1), bob(.03, f=1, off=PI), swirl((0, 1, .8, 1), amp=.02, f=1)],
      dict(sq=.05, rise=.18, thrust=.02, tl=-3), [A((0, .55, .05, .7), (.5, .45), -34), lambda s: swirl((0, 1, .05, 1), amp=.045 * abs(s), f=0, off=s * 2)], None),   # angin3: sayap terbentang, pusaran angin
 'api1': ('api1', lambda: [part((.05, .4, .25, .9), (.35, .75), 9, f=1), flicker((.05, .4, .2, .55), amp=.05, k=2, f=1),
        part((.3, .47, .2, .5), (.38, .48), -8, f=2), part((.58, .75, .2, .5), (.66, .48), 8, f=2, off=1),
        breathe(.028, f=1, piv=(.5, .95)), part((.3, .8, .3, .65), (.5, .65), 3, f=2, off=.5)],
      dict(sq=.15, rise=.05, thrust=.12, tl=-9), [A((.05, .4, .25, .9), (.35, .75), -26), A((.3, .8, .3, .65), (.5, .65), 10)], glow(0, 45, .45)),   # api1: menerkam, mencakar
 'api2': ('api2', lambda: [flicker((.03, .4, .2, .75), amp=.05, k=2, f=1), part((.03, .38, .3, .8), (.37, .7), 7, f=1),
        flicker((.4, .95, 0, .4), amp=.03, k=2, f=1), breathe(.02, f=1, piv=(.5, .95)),
        part((.62, .95, .1, .5), (.65, .5), 3, f=1, off=1)],
      dict(sq=.15, rise=.05, thrust=.14, tl=-9), [A((.03, .4, .25, .8), (.37, .7), -26), A((.5, .95, .1, .6), (.6, .55), 8)], glow(0, 45, .7)),   # api2: cakar membara, lebih ganas
 'api3': ('api3', lambda: [flicker((.03, .4, .15, .8), amp=.055, k=2, f=1), part((.03, .38, .3, .8), (.37, .7), 7, f=1),
        flicker((.4, .95, 0, .4), amp=.035, k=2, f=1), breathe(.02, f=1, piv=(.5, .95)),
        part((.62, .95, .1, .5), (.65, .5), 3, f=1, off=1)],
      dict(sq=.1, rise=.1, thrust=.04, tl=-11), [A((.03, .4, .25, .8), (.37, .7), -20), A((.55, .98, .05, .5), (.65, .45), 10)], glow(0, 45, 1.0)),   # api3: mendongak lalu melontarkan bola lava
 'tanah1': ('tanah1', lambda: [part((.02, .15, .55, .85), (.12, .7), 14, f=2), part((.35, .52, .25, .45), (.43, .42), -7, f=2),
        part((.68, .82, .25, .45), (.75, .42), 7, f=2, off=1), breathe(.03, f=2, piv=(.5, .92)),
        part((.4, .85, .25, .7), (.55, .7), 3, f=1)],
      dict(sq=.18, rise=.09, thrust=.04, tl=-5, mode='burrow'), [A((.02, .15, .5, .85), (.12, .7), 25)], None),   # tanah1: menggali lubang
 'tanah2': ('tanah2', lambda: [part((.02, .15, .55, .85), (.12, .7), 14, f=2), part((.6, .8, .2, .45), (.7, .42), 7, f=2, off=1),
        breathe(.03, f=2, piv=(.5, .92)), move((.25, .62, .2, .55), 0, -.012, f=2), part((.4, .88, .25, .7), (.55, .7), 3, f=1)],
      dict(sq=.18, rise=.09, thrust=.04, tl=-5, mode='roll'), [A((.02, .15, .5, .85), (.12, .7), 25)], None),   # tanah2: menggulung jadi bola
 'tanah3': ('tanah3', lambda: [part((.02, .15, .55, .85), (.12, .7), 14, f=2), part((.3, .8, 0, .6), (.55, .6), 3, f=1),
        part((.68, .82, .25, .45), (.75, .42), 7, f=2, off=1), breathe(.03, f=2, piv=(.5, .92)),
        part((.4, .88, .25, .7), (.55, .7), 3, f=1, off=.7)],
      dict(sq=.18, rise=.09, thrust=.04, tl=-5, mode='burrow'), [A((.02, .15, .5, .85), (.12, .7), 25)], glow(180, 230, 1.0)),   # tanah3: gali lalu tabrak
}

N_MOVE, N_HIT, N_DIE = 8, 3, 5


def save_webp(img, path):
    img.save(path, 'WEBP', quality=86, alpha_quality=100, method=6)


def gif_preview(frames, path, ms=100, bg=(70, 100, 70)):
    from PIL import Image
    out = []
    for f in frames:
        b = Image.new('RGBA', f.size, bg + (255,))
        b.alpha_composite(f)
        out.append(b.convert('P', palette=Image.ADAPTIVE))
    out[0].save(path, save_all=True, append_images=out[1:], duration=ms, loop=0, disposal=2)


def make_monster(mid):
    fname, hmax, fx, hit_mode, die_kind, sign, glow_fx = MON[mid]
    src = os.path.join(ASSETS, 'monsters', fname + '.png')
    from PIL import Image
    h0 = Image.open(src).size[1]
    scale = min(1.0, 2.6 * hmax / h0)
    c = Canvas(src, scale=scale, pad=.18)
    eff = fx()
    mv = make_move(c, eff, N_MOVE, glow_fx)
    hit = make_hit(c, [e for e in eff if False], N_HIT, mode=hit_mode, sign=sign)
    die = make_die(c, die_kind, N_DIE, seed=mid)
    frames = mv + hit + die
    sheet, cw, ch = build_sheet(frames, 4)
    key = 'mon%d' % mid
    save_webp(sheet, os.path.join(OUT, key + '.webp'))
    if PREVIEW:
        gif_preview(mv, os.path.join(PREVIEW, key + '_move.gif'))
        gif_preview(hit + [mv[0]], os.path.join(PREVIEW, key + '_hit.gif'), 120)
        gif_preview(die, os.path.join(PREVIEW, key + '_die.gif'), 120)
    return key, dict(file='sprites/%s.webp' % key, fw=cw, fh=ch, iw=c.W, ih=c.H, move=N_MOVE, hit=N_HIT, die=N_DIE), frames


def make_pet(name):
    fname, fx, cast_kw, extras, glow_fx = PET[name]
    src = os.path.join(ASSETS, 'pets', fname + '.png')
    c = Canvas(src, scale=1.0, pad=.18)
    eff = fx()
    idle = make_move(c, eff, N_MOVE, glow_fx)
    cast = []
    mode = cast_kw.get('mode', 'pounce')
    kw = {k: v for k, v in cast_kw.items() if k != 'mode'}
    dx0, dy0 = field(c, eff, 0.0)          # pose idle awal sebagai dasar agar bagian tubuh tetap hidup
    for i, s in enumerate(CAST_S):
        if mode == 'roll':                 # menggulung jadi bola: berputar penuh
            th = math.radians(60 * i + 30); co, si = math.cos(th), math.sin(th); k = .9      # rotasi besar: peta balik yang tepat
            px, py = (c.U - .5) * c.W, (c.V - .6) * c.H
            fx = [lambda c_, ph, px=px, py=py, co=co, si=si, k=k: (px - (co * px + si * py) / k, py - (-si * px + co * py) / k)]
        elif mode == 'dive':               # bersiap (naik, miring ke belakang) lalu menukik ke depan
            up, dn = max(s, 0), max(-s, 0)
            fx = [tilt(-9 * up + 28 * dn, piv=(.5, .8)), shift(.1 * dn, -.07 * up + .09 * dn), squash(1 - .05 * up, 1 + .06 * dn, (.5, .95))] + [e(s) for e in extras]
        elif mode == 'burrow':             # jongkok merunduk ke tanah lalu menyembul dan menyeruduk
            up, dn = max(s, 0), max(-s, 0)
            fx = [squash(1 + .12 * up - .05 * dn, 1 - .38 * up + .14 * dn, (.5, .95)), shift(.09 * dn, .02 * up - .09 * dn), tilt(-5 * up + 9 * dn, piv=(.5, .95))] + [e(s) for e in extras]
        else:
            fx = cast_fx(s, extras=extras, **kw)
        dx, dy = field(c, fx, 0.0)
        cast.append(c.to_image(c.render(dx + dx0, dy + dy0, color=glow_fx(PI / 2) if glow_fx else None)))
    frames = idle + cast
    sheet, cw, ch = build_sheet(frames, 7)
    key = 'pet_' + name
    save_webp(sheet, os.path.join(OUT, key + '.webp'))
    if PREVIEW:
        gif_preview(idle, os.path.join(PREVIEW, key + '_idle.gif'), 110)
        gif_preview(cast + [idle[0]], os.path.join(PREVIEW, key + '_cast.gif'), 110)
    return key, dict(file='sprites/%s.webp' % key, fw=cw, fh=ch, iw=c.W, ih=c.H, idle=N_MOVE, cast=len(CAST_S)), frames


def main():
    os.makedirs(OUT, exist_ok=True)
    if PREVIEW:
        os.makedirs(PREVIEW, exist_ok=True)
    want = set(sys.argv[1:])
    meta = {}
    if os.path.exists(DATA_JS):      # pertahankan data karakter lain dan karakter CUSTOM
        txt = open(DATA_JS).read()
        meta = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    for mid in MON:
        k = 'mon%d' % mid
        if want and not ({k, 'mon%02d' % mid} & want):
            continue
        key, m, _ = make_monster(mid)
        meta[key] = m
        print('ok', key, m['fw'], 'x', m['fh'])
    for name in PET:
        k = 'pet_' + name
        if (want and k not in want) or (k in CUSTOM and k not in want):
            continue
        key, m, _ = make_pet(name)
        meta[key] = m
        print('ok', key, m['fw'], 'x', m['fh'])
    if True:
        with open(DATA_JS, 'w') as f:
            f.write('// DIBUAT OTOMATIS oleh tools/make_sprites.py. Jangan diedit tangan.\n')
            f.write('// fw/fh = ukuran satu frame, iw/ih = ukuran gambar karakter di dalam frame (frame punya bantalan kosong di sekelilingnya).\n')
            f.write('const SPR = ' + json.dumps(meta, indent=1) + ';\n')
        print('wrote', DATA_JS)


if __name__ == '__main__':
    main()
