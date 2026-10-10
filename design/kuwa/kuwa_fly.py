"""Extra KUWA frames for flying in, landing and standing about: frontend/assets/img/kuwa-fly.png.
Run from this folder: python3 kuwa_fly.py   (needs Pillow). It reuses the drawing code in kuwa.py.
96 x 96 frames, 8 across. The frame numbers are listed in assets/js/entrance.js.
   0-11  one full wing beat, flying to the right (mirror it in CSS to fly left)
  12-13  flaring to land: wings high, body tipped back, feet reaching
  14-15  touching down: squash, then wings folding
  16     standing, facing you          24  ruffling his feathers
  17-19  facing the doors: still, breathing in, blinking
  20     a nod toward the doors        21-22  tipping his hat
  23     crouching to take off         25  standing, breathing in
"""
from PIL import Image, ImageOps
import os, math
src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kuwa.py')).read().split('tags=[')[0]
exec(src)                                           # brings in front(), FLY, FLYL and the palette
def lerp(A, B, t): return [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(A, B)]
def wing_at(t):                                     # t = 0 wings up, .5 level, 1 down
    a, b, u = ('U', 'M', t * 2) if t < .5 else ('M', 'D', t * 2 - 1)
    return lerp(FLY[a], FLY[b], u), [lerp(x, y, u) for x, y in zip(FLYL[a], FLYL[b])]
KEYS = '0123456789xy'
def fly_frame(n, t, **kw):
    FLY[KEYS[n]], FLYL[KEYS[n]] = wing_at(t); return front(wing='fly' + KEYS[n], **kw)
def tip(im, deg): return im.rotate(deg, resample=Image.NEAREST, center=(48, 60))
frames = []
BEAT = [0, .12, .3, .5, .7, .88, 1, .92, .75, .5, .25, .08]        # quick down, slower up
for n, t in enumerate(BEAT):
    frames.append(tip(fly_frame(n, t, sf=7, gy=-2 - round(4 * t), feet='tuck'), -7))
frames.append(tip(fly_frame(0, 0, sf=7, gy=-3, feet='stand', brow=1), 13))
frames.append(tip(fly_frame(1, .3, sf=7, gy=-1, feet='stand'), 7))
frames.append(fly_frame(2, .62, sf=7, gy=4, puff=3, feet='stand', eyes='half'))
frames.append(front(sf=7, gy=2, puff=2))
frames.append(front())
L = lambda **kw: ImageOps.mirror(front(sf=7, **kw))
frames += [L(), L(bob=1, puff=1), L(eyes='closed'), L(hdy=2, brow=1), L(wing='up', hatd=-5), L(wing='up'), L(gy=4, puff=3, eyes='half')]
frames += [front(puff=4, eyes='closed', bob=1), front(bob=1, puff=1)]
COLS = 8; rows = (len(frames) + COLS - 1) // COLS
sheet = Image.new('RGBA', (96 * COLS, 96 * rows))
for k, im in enumerate(frames): sheet.paste(im, ((k % COLS) * 96, (k // COLS) * 96))
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'assets', 'img', 'kuwa-fly'+SFX+'.png')
sheet.save(out, optimize=True); print(len(frames), 'frames', sheet.size, '->', os.path.normpath(out))
