"""Gabungkan 28 frame Effects_Fire_0_XX.png menjadi satu sprite sheet (fireball.png).
Pakai:  python3 tools/make_fireball_sheet.py <folder_frame> public/game/assets/effects/fireball.png
Frame diperkecil 50% supaya ringan; ukuran sel dicetak di akhir -> samakan dengan FX_FIREBALL di game.js."""
import glob, sys
from PIL import Image

src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(src + '/Effects_Fire_0_*.png'))
ims = [Image.open(f).convert('RGBA') for f in files]
# area isi gabungan semua frame (buang margin transparan, ujung kanan = kepala api)
x1 = max(i.getchannel('A').getbbox()[2] for i in ims)
y1 = max(i.getchannel('A').getbbox()[3] for i in ims)
cw, ch = (x1 + 1) // 2 * 2, (y1 + 1) // 2 * 2          # genap agar bisa dibagi 2
cw2, ch2 = cw // 2, ch // 2
cols = 7
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGBA', (cols * cw2, rows * ch2), (0, 0, 0, 0))
for n, im in enumerate(ims):
    cell = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    cell.paste(im.crop((0, 0, min(im.width, cw), min(im.height, ch))), (0, 0))
    cell = cell.resize((cw2, ch2), Image.LANCZOS)
    sheet.paste(cell, ((n % cols) * cw2, (n // cols) * ch2))
sheet.save(out, optimize=True)
print('frames', len(ims), 'cell', cw2, 'x', ch2, 'sheet', sheet.size)
