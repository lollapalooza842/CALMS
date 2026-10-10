"""KUWA's idle life: frontend/assets/img/kuwa-idle.png, 96 x 96 frames, 8 across.
Run from this folder: python3 kuwa_idle.py   (needs Pillow). It reuses the drawing code in kuwa.py.
The frame numbers are named in NAMES below and used by frontend/assets/js/kuwa-life.js.
"""
from PIL import Image, ImageOps, ImageDraw
import os
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, 'kuwa.py')).read().split('tags=[')[0]
# Give front() a face that can change. be = how far each brow end moves (outer left, inner left, outer right, inner right;
# minus is up), pup = pupil size, mouth = how far the beak is open, and eyes='happy' draws closed, smiling eyes.
def _sub(a, b):
    global SRC
    assert a in SRC, a; SRC = SRC.replace(a, b)
_sub("sf=0,puff=0,extra=None):", "sf=0,puff=0,extra=None,be=(0,0,0,0),pup=3,mouth=0):")
_sub("c.P([(lo,29+bd),(lo+8,29+bd),(bx-1,39+bd),(bx-1,45+bd),(bx-8,43+bd),(lo,35+bd)],HD,OL,o)", "c.P([(lo,29+bd+be[0]),(lo+8,29+bd+be[0]),(bx-1,39+bd+be[1]),(bx-1,45+bd+be[1]),(bx-8,43+bd+be[1]),(lo,35+bd+be[0])],HD,OL,o)")
_sub("c.P([(ro,29+bd),(ro-8,29+bd),(bx+1,39+bd),(bx+1,45+bd),(bx+8,43+bd),(ro,35+bd)],HD,OL,o)", "c.P([(ro,29+bd+be[2]),(ro-8,29+bd+be[2]),(bx+1,39+bd+be[3]),(bx+1,45+bd+be[3]),(bx+8,43+bd+be[3]),(ro,35+bd+be[2])],HD,OL,o)")
_sub("c.L([(lo+2,31+bd),(bx-4,41+bd)],HM,1,o); c.L([(ro-2,31+bd),(bx+4,41+bd)],HM,1,o)", "c.L([(lo+2,31+bd+be[0]),(bx-4,41+bd+be[1])],HM,1,o); c.L([(ro-2,31+bd+be[2]),(bx+4,41+bd+be[3])],HM,1,o)")
_sub("c.E((cx-3+lx,42+py,cx+3+lx,48+py),K,None,o)", "c.E((cx-pup+lx,45-pup+py,cx+pup+lx,45+pup+py),K,None,o)")
_sub("c.L([(cx-rx+1,47),(cx+rx-1,47)],OL,2,o); c.L([(cx-rx+3,50),(cx+rx-3,50)],BD,1,o)", "(c.d.arc([cx-rx+2,43+o,cx+rx-2,54+o],195,345,fill=OL,width=2) if eyes=='happy' else (c.L([(cx-rx+1,47),(cx+rx-1,47)],OL,2,o), c.L([(cx-rx+3,50),(cx+rx-3,50)],BD,1,o)))")
_sub("c.L([(46+q,47),(46+q,51)],C,1,o)", "c.L([(46+q,47),(46+q,51)],C,1,o)\n    if mouth: c.E((44+q,56,52+q,58+mouth*3),K,OL,o)")
exec(SRC)                                    # front(), side(), back(), FLY, the palette
F = front
def lerp(A, B, t): return [(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t) for a, b in zip(A, B)]
def shift(im, dx, dy=0): out = Image.new('RGBA', im.size); out.paste(im, (dx, dy), im); return out
def lean(im, deg): return im.rotate(deg, resample=Image.NEAREST, center=(48, 90))
def tilt_head(deg, **kw):                    # turn only the head and hat, about the neck
    full = F(**kw); head = full.crop((0, 0, 96, 58)); body = full.copy(); ImageDraw.Draw(body).rectangle([0, 0, 96, 57], fill=(0, 0, 0, 0))
    canvas = Image.new('RGBA', (96, 96)); canvas.paste(head, (0, 0)); canvas = canvas.rotate(deg, resample=Image.NEAREST, center=(48, 58))
    out = Image.new('RGBA', (96, 96)); out.alpha_composite(canvas); out.alpha_composite(body); return out
def one_wing(key, **kw):                     # his left wing folded, his right wing open
    FLY['w'], FLYL['w'] = FLY[key], FLYL[key]; a = F(**kw); b = F(wing='flyw', **kw); out = a.copy(); out.paste(b.crop((48, 0, 96, 96)), (48, 0)); return out
def draw(im, fn): fn(ImageDraw.Draw(im)); return im
def yawn(big, **kw):
    im = F(**kw); o = kw.get('hdy', 0); d = ImageDraw.Draw(im)
    d.ellipse([43, 55 + o, 53, (66 if big else 61) + o], fill=K, outline=OL); d.rectangle([46, 58 + o, 50, (62 if big else 59) + o], fill=R); return im
def scratch(dy):
    im = F(hdy=2, eyes='half', look=(2, 2)); d = ImageDraw.Draw(im)
    d.line([(60, 84), (66, 72 + dy), (62, 64 + dy)], fill=AD, width=3); d.polygon([(58, 60 + dy), (66, 60 + dy), (67, 66 + dy), (59, 67 + dy)], fill=A, outline=AD); return im
def polish(dx):
    im = F(look=(0, -2), hdy=1); d = ImageDraw.Draw(im)
    d.polygon([(66, 62), (74, 58), (70, 40), (56 + dx, 22), (50 + dx, 24), (60, 42), (62, 56)], fill=WD, outline=OL); d.line([(68, 56), (56 + dx, 28)], fill=WM); return im
def tap():
    im = F(brow=2, look=(-2, 0)); foot = im.crop((50, 85, 68, 93)); d = ImageDraw.Draw(im); d.rectangle([50, 85, 68, 93], fill=(0, 0, 0, 0)); im.paste(foot, (50, 81), foot); return im
def watch(**kw):
    im = F(wing='chin', **kw); d = ImageDraw.Draw(im); d.line([(60, 66), (70, 72), (76, 66)], fill=AD); d.ellipse([71, 58, 83, 70], fill=A, outline=OL); d.ellipse([73, 60, 81, 68], fill=W); d.line([(77, 64), (77, 61)], fill=K); d.line([(77, 64), (79, 65)], fill=K); return im
def stamp(up):
    if up:
        im = F(wing='up', hdy=-1, brow=1); d = ImageDraw.Draw(im); d.rectangle([80, 20, 92, 28], fill=R, outline=OL); d.rectangle([84, 14, 88, 20], fill=HM, outline=OL)
    else:
        im = F(hdy=2, brow=1, look=(2, 2)); d = ImageDraw.Draw(im); d.polygon([(66, 62), (74, 58), (86, 66), (84, 74), (72, 70)], fill=WD, outline=OL); d.rectangle([78, 74, 92, 82], fill=R, outline=OL); d.rectangle([83, 68, 87, 74], fill=HM, outline=OL)
        for x in (74, 95): d.line([(x, 84), (x + (-3 if x < 80 else 3) * -1, 88)], fill=OL)
    return im
def back_head():                            # the head turned right round, over a body that has not moved
    body = F(); ImageDraw.Draw(body).rectangle([0, 0, 96, 57], fill=(0, 0, 0, 0)); head = back().crop((0, 0, 96, 58)); out = Image.new('RGBA', (96, 96)); out.paste(head, (0, 0), head); out.alpha_composite(body); return out
L = lambda **kw: ImageOps.mirror(F(sf=7, **kw))
FR = [
 ('base', F()), ('breathe1', F(puff=1)), ('breathe2', F(puff=2, hdy=-1)), ('half', F(eyes='half')), ('closed', F(eyes='closed')),
 ('lookL', F(look=(-2, 0))), ('lookR', F(look=(2, 0))), ('lookU', F(look=(0, -2))), ('lookD', F(look=(0, 2))), ('lookUL', F(look=(-2, -2))), ('lookUR', F(look=(2, -2))), ('lookDL', F(look=(-2, 2))), ('lookDR', F(look=(2, 2))),
 ('leanL', shift(lean(F(), 4), -1)), ('leanR', shift(lean(F(), -4), 1)),
 ('hat1', F(wing='up')), ('hat2', F(wing='up', hatd=-5)), ('hat3', F(wing='up', hatd=1, hdy=1)),
 ('tug1', F(wing='chin', look=(0, 2))), ('tug2', F(wing='chin', look=(0, 2), hdy=1, bob=1)),
 ('ruffle1', F(puff=3, eyes='closed')), ('ruffle2', shift(F(puff=4, eyes='closed', bob=1), -1)), ('ruffle3', shift(F(puff=4, eyes='closed', bob=1), 1)),
 ('preen1', L(hdy=4, eyes='half')), ('preen2', L(hdy=6, eyes='closed')),
 ('tiltL', tilt_head(13)), ('tiltR', tilt_head(-13)),
 ('turnR', F(sf=7, look=(2, 0))), ('turnL', L(look=(2, 0))), ('turnBack', back_head()),
 ('scratch1', scratch(0)), ('scratch2', scratch(3)),
 ('wing1', one_wing('D')), ('wing2', one_wing('M', hdy=-1)), ('wing3', one_wing('U', hdy=-1, eyes='half')),
 ('yawn1', yawn(False, eyes='half')), ('yawn2', yawn(True, eyes='closed', hdy=-2, hatd=-1)),
 ('polish1', polish(0)), ('polish2', polish(-5)),
 ('leanIn', F(gy=3, hdy=3, look=(0, 2), brow=1).resize((102, 102), Image.NEAREST).crop((3, 6, 99, 102))),
 ('perk', F(hdy=-3, hatd=-2, brow=-1)), ('wave', F(wing='up', hdy=-2, brow=-1)),
 ('glare', F(brow=3, eyes='half', hdy=1)), ('hop', F(gy=-7, feet='tuck', brow=2)), ('peck', lean(F(hdy=5, gy=1, eyes='half', brow=2), -9)),
 ('drowsy1', F(eyes='half', hdy=1, hatd=1)), ('drowsy2', F(eyes='half', hdy=3, hatd=3)), ('drowsy3', F(eyes='closed', hdy=5, hatd=5)),
 ('sleep1', F(eyes='closed', hatd=13, hdy=2)), ('sleep2', F(eyes='closed', hatd=13, hdy=3, bob=1, puff=1)),
 ('startle', F(hdy=-4, gy=-3, hatd=-8, brow=-2, feet='tuck', extra='bang')), ('hatBack', F(wing='up', hatd=-3, brow=-1)), ('innocent', F(look=(2, -2), brow=-1)),
 ('tap', tap()), ('tapBase', F(brow=2, look=(-2, 0))),
 ('watch1', watch(look=(2, 2))), ('watch2', watch(look=(2, 2), brow=2, hdy=1)),
 ('count1', F(wing='up', look=(2, -2))), ('count2', F(wing='up', look=(2, -2), hdy=2)),
 ('stampUp', stamp(True)), ('stampDown', stamp(False)),
 ('squint', F(eyes='half', brow=3)), ('shakeL', shift(F(eyes='half', brow=3), -2)), ('shakeR', shift(F(eyes='half', brow=3), 2)),
]
# ---- faces. Each mood gets three breathing frames and a blink, so his expression can change while he stands. ----
MOODS = {'soft': dict(be=(1, -5, 1, -5), pup=4), 'curious': dict(be=(0, 0, -2, -8), pup=4), 'smug': dict(be=(0, 0, -1, -7), eyes='half'),
         'focused': dict(be=(0, 2, 0, 2), pup=2, brow=1), 'pleased': dict(be=(1, -6, 1, -6), eyes='happy')}
for m, kw in MOODS.items():
    blink = dict(kw); blink['eyes'] = 'closed'
    FR += [(m + '0', F(**kw)), (m + '1', F(puff=1, **kw)), (m + '2', F(puff=2, hdy=-1, **kw)), (m + 'Blink', F(**blink))]
FR += [('surprised', F(be=(-2, -9, -2, -9), brow=-2, pup=2, mouth=1, hdy=-2, hatd=-2)), ('worried', F(be=(4, -8, 4, -8), pup=3, look=(0, 2)))]
# watching the cursor with interest: brows lifted, big pupils, eight directions
for n, (lx, ly) in {'L': (-2, 0), 'R': (2, 0), 'U': (0, -2), 'D': (0, 2), 'UL': (-2, -2), 'UR': (2, -2), 'DL': (-2, 2), 'DR': (2, 2)}.items():
    FR.append(('see' + n, F(be=(0, -4, 0, -4), pup=4, look=(lx, ly))))
# ---- in-betweens: two drawings on the way from the stern face to each other face, so brows and pupils travel ----
def mixkw(kw, t):
    be = tuple(round(v * t) for v in kw.get('be', (0, 0, 0, 0))); return dict(be=be, pup=round(3 + (kw.get('pup', 3) - 3) * t), brow=round(kw.get('brow', 0) * t))
for m, kw in MOODS.items():
    FR += [(m + 'T1', F(**mixkw(kw, .34))), (m + 'T2', F(eyes='half' if kw.get('eyes') else 'open', **mixkw(kw, .7)))]
# ---- the head leads: eyes first (the see* frames), then the head turns, then he leans ----
HEAD = dict(be=(0, -4, 0, -4), pup=4, look=(2, 0))
FR += [('headR', F(sf=5, **HEAD)), ('headL', ImageOps.mirror(F(sf=5, **HEAD))), ('headRlean', shift(lean(F(sf=7, **HEAD), -5), 2)), ('headLlean', ImageOps.mirror(shift(lean(F(sf=7, **HEAD), -5), 2)))]
# ---- props ----
def mug(sip):
    im = F(wing='chin', eyes='closed', hdy=-1, be=(1, -5, 1, -5)) if sip else F(be=(1, -5, 1, -5), pup=4, look=(2, 2)); d = ImageDraw.Draw(im); x, y = (52, 50) if sip else (64, 64)
    d.rectangle([x, y, x + 11, y + 10], fill=C, outline=OL); d.rectangle([x + 1, y + 1, x + 10, y + 2], fill=HD); d.arc([x + 9, y + 2, x + 15, y + 8], 270, 90, fill=OL, width=1); d.line([(x + 3, y - 3), (x + 4, y - 5)], fill=W); d.line([(x + 7, y - 2), (x + 8, y - 5)], fill=W); return im
def ledger(look, turn=False):
    im = F(look=look, be=(0, 2, 0, 2), pup=2, hdy=2, wing='up' if turn else 'down'); d = ImageDraw.Draw(im)
    d.polygon([(26, 70), (47, 73), (47, 88), (24, 85)], fill=W, outline=OL); d.polygon([(49, 73), (70, 70), (72, 85), (49, 88)], fill=W, outline=OL); d.line([(48, 73), (48, 88)], fill=R, width=2)
    for yy in (76, 79, 82): d.line([(29, yy), (44, yy + 2)], fill=TD); d.line([(52, yy + 2), (67, yy)], fill=TD)
    return im
def specs(im, o=0):
    d = ImageDraw.Draw(im)
    for cx in (37, 59): d.ellipse([cx - 10, 36 + o, cx + 10, 55 + o], outline=A, width=2); d.line([(cx - 6, 39 + o), (cx - 3, 37 + o)], fill=W)
    d.line([(46, 44 + o), (50, 44 + o)], fill=A, width=2); return im
FR += [('mugHold', mug(False)), ('mugSip', mug(True)), ('ledger1', ledger((-2, 2))), ('ledger2', ledger((2, 2))), ('ledgerTurn', ledger((0, 2), True)),
       ('specs', specs(F(be=(0, -3, 0, -3), pup=2))), ('specsPeer', specs(F(be=(0, 2, 0, 2), pup=2, look=(0, 2), hdy=3, gy=2), 5))]
# ---- answering the page ----
FR += [('duck', F(gy=7, hdy=7, hatd=3, eyes='closed', puff=3, be=(3, -6, 3, -6))), ('duckPeek', F(gy=5, hdy=5, hatd=2, look=(0, -2), puff=2, be=(3, -7, 3, -7), pup=2)),
       ('flinch', shift(lean(F(hdy=-3, hatd=-5, be=(-2, -9, -2, -9), pup=2, mouth=1, puff=2, wing='up'), 6), -2))]
# ---- getting about: a six-frame wing beat flying right (mirror it to fly left), a flare and a landing ----
def wing_at(t):
    a, b, u = ('U', 'M', t * 2) if t < .5 else ('M', 'D', t * 2 - 1); return lerp(FLY[a], FLY[b], u), [lerp(x, y, u) for x, y in zip(FLYL[a], FLYL[b])]
def fly(t, deg, **kw): FLY['v'], FLYL['v'] = wing_at(t); return F(wing='flyv', **kw).rotate(deg, resample=Image.NEAREST, center=(48, 60))
for n, t in enumerate([0, .3, .7, 1, .66, .25]): FR.append(('fly%d' % n, fly(t, -7, sf=7, gy=-2 - round(4 * t), feet='tuck')))
FR += [('flare', fly(0, 13, sf=7, gy=-3, feet='stand', brow=1)), ('land', fly(.62, 0, sf=7, gy=4, puff=3, feet='stand', eyes='half'))]
NAMES = [n for n, _ in FR]
if __name__ == '__main__':
    rows = (len(FR) + 7) // 8
    sheet = Image.new('RGBA', (768, 96 * rows))
    for k, (_, im) in enumerate(FR): sheet.paste(im, ((k % 8) * 96, (k // 8) * 96))
    out = os.path.join(HERE, '..', '..', 'frontend', 'assets', 'img', 'kuwa-idle'+SFX+'.png'); sheet.save(out, optimize=True)
    print(len(FR), 'frames ->', os.path.normpath(out)); print('var N = {' + ', '.join('%s: %d' % (n, i) for i, n in enumerate(NAMES)) + '};')
