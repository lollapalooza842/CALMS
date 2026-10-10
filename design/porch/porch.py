"""Draws the close shot of the GR8 Lending porch used by the walk into the bank.
Run: python3 porch.py   (needs Pillow). Writes four PNGs into frontend/assets/img/porch/.
Everything is drawn on a 256 x 144 grid; the page scales it up with crisp pixels.
  scene.png  the wall, sign, lantern, porch and rail, with the doorway left transparent
  doors.png  five frames of the double doors swinging inward, side by side (96 x 60 each)
  spill.png  the light that falls on the porch boards when the doors open
  glow.png   the lantern's halo, so it can flicker on its own
"""
from PIL import Image, ImageDraw
import math, os, random
W, H = 256, 144
DX0, DX1, DY0, DY1 = 80, 176, 54, 114          # the doorway (the hole)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'frontend', 'assets', 'img', 'porch')
random.seed(7)
def rgb(h): return tuple(int(h[i:i+2], 16) for i in (1, 3, 5))
def mix(a, b, t): return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
NIGHT = rgb('#1c1016'); WALL = rgb('#3b2619'); WALL_D = rgb('#24160f'); WARM = rgb('#c9853a'); CREAM = rgb('#d9c79a'); INK = rgb('#120a05')
LAN = (62, 58)                                    # lantern position
def lit(x, y, r=70):                              # how much lantern light reaches a pixel, 0..1
    d = math.hypot(x - LAN[0], (y - LAN[1]) * 1.15); return max(0.0, 1 - d / r) ** 1.6

FONT = {'G': ['01110','10001','10000','10111','10001','10001','01110'], 'R': ['11110','10001','10001','11110','10100','10010','10001'], '8': ['01110','10001','10001','01110','10001','10001','01110'],
        'L': ['10000','10000','10000','10000','10000','10000','11111'], 'E': ['11111','10000','10000','11110','10000','10000','11111'], 'N': ['10001','11001','10101','10011','10001','10001','10001'],
        'D': ['11110','10001','10001','10001','10001','10001','11110'], 'I': ['11111','00100','00100','00100','00100','00100','11111'], ' ': ['00000'] * 7}
def text(px, s, x, y, col, k=2):
    for ch in s:
        for r, row in enumerate(FONT[ch]):
            for c, bit in enumerate(row):
                if bit == '1':
                    for dy in range(k):
                        for dx in range(k): px[x + c * k + dx, y + r * k + dy] = col + (255,)
        x += 6 * k

def scene():
    im = Image.new('RGBA', (W, H), NIGHT + (255,)); px = im.load(); d = ImageDraw.Draw(im)
    for y in range(H):                             # clapboard wall
        for x in range(W):
            base = WALL_D if y % 7 == 6 else WALL
            if (x * 7 + y // 7 * 31) % 53 == 0 and y % 7 != 6: base = mix(base, WALL_D, .5)
            px[x, y] = mix(mix(base, NIGHT, .28), WARM, lit(x, y) * .55) + (255,)
    d.rectangle([0, 0, W, 5], fill=INK)             # eave shadow
    d.rectangle([52, 9, 203, 31], fill=INK); d.rectangle([54, 11, 201, 29], fill=mix(CREAM, NIGHT, .28)); d.rectangle([56, 13, 199, 27], outline=mix(rgb('#8f5a2a'), NIGHT, .2))
    text(px, 'GR8 LENDING', 63, 14, INK)
    d.rectangle([0, 36, W, 41], fill=mix(rgb('#2a1a10'), NIGHT, .2)); d.line([0, 42, W, 42], fill=INK)   # porch beam
    for x0 in (28, 222):                            # posts
        d.rectangle([x0, 42, x0 + 6, 118], fill=mix(mix(rgb('#4a2f1c'), NIGHT, .25), WARM, lit(x0, 80) * .5)); d.line([x0, 42, x0, 118], fill=INK); d.line([x0 + 6, 42, x0 + 6, 118], fill=INK)
    wx0, wy0 = 194, 60                              # lit window, right of the door
    d.rectangle([wx0 - 2, wy0 - 2, wx0 + 20, wy0 + 26], fill=INK); d.rectangle([wx0, wy0, wx0 + 18, wy0 + 24], fill=rgb('#e9b85a')); d.line([wx0 + 9, wy0, wx0 + 9, wy0 + 24], fill=INK); d.line([wx0, wy0 + 12, wx0 + 18, wy0 + 12], fill=INK)
    d.rectangle([wx0 + 1, wy0 + 1, wx0 + 8, wy0 + 5], fill=rgb('#ffe2a0'))
    d.rectangle([DX0 - 5, DY0 - 6, DX1 + 4, DY1 + 1], fill=INK)        # door frame
    d.rectangle([DX0 - 4, DY0 - 5, DX1 + 3, DY1], fill=mix(rgb('#5e3a1f'), WARM, .25)); d.rectangle([DX0 - 1, DY0 - 1, DX1, DY1], fill=INK)
    d.rectangle([DX0 - 4, DY0 - 5, DX1 + 3, DY0 - 5], fill=rgb('#b98a52'))
    d.line([LAN[0], 42, LAN[0], 50], fill=INK); d.rectangle([LAN[0] - 4, 50, LAN[0] + 4, 52], fill=INK)            # lantern
    d.rectangle([LAN[0] - 3, 53, LAN[0] + 3, 63], fill=rgb('#ffd66b')); d.rectangle([LAN[0] - 1, 55, LAN[0] + 1, 61], fill=rgb('#fff6cf')); d.rectangle([LAN[0] - 4, 53, LAN[0] - 4, 63], fill=INK); d.rectangle([LAN[0] + 4, 53, LAN[0] + 4, 63], fill=INK); d.rectangle([LAN[0] - 4, 64, LAN[0] + 4, 65], fill=INK)
    for y in range(DY1 + 1, H):                     # porch boards, drawn toward a vanishing point behind the door
        t = (y - DY1) / (H - DY1)
        for x in range(W):
            vx = 128 + (x - 128) / (1 + t * .55); seam = int(vx) % 13 == 0
            c = rgb('#231509') if seam else mix(rgb('#4d3320'), rgb('#3a2616'), (int(vx) // 13) % 2 * .5)
            px[x, y] = mix(mix(c, NIGHT, .3), WARM, lit(x, y, 90) * .4) + (255,)
    d.line([0, DY1 + 1, W, DY1 + 1], fill=INK); d.rectangle([0, 139, W, 140], fill=INK); d.rectangle([0, 141, W, H], fill=mix(rgb('#2a1a10'), NIGHT, .4))
    bx = 8                                          # a barrel, left
    d.ellipse([bx, 93, bx + 22, 99], fill=mix(rgb('#5a3c22'), WARM, .2), outline=INK); d.rectangle([bx, 96, bx + 22, 124], fill=mix(rgb('#4a2f1c'), WARM, .18)); d.line([bx, 96, bx, 124], fill=INK); d.line([bx + 22, 96, bx + 22, 124], fill=INK)
    d.ellipse([bx, 121, bx + 22, 127], fill=mix(rgb('#3a2414'), WARM, .1), outline=INK)
    for yy in (103, 116): d.rectangle([bx, yy, bx + 22, yy + 1], fill=rgb('#6b6b66'))
    d.rectangle([196, 102, W, 105], fill=mix(rgb('#6f4726'), NIGHT, .2)); d.line([196, 101, W, 101], fill=INK); d.line([196, 106, W, 106], fill=INK)    # porch rail, right foreground
    for x0 in range(200, W, 12): d.rectangle([x0, 107, x0 + 3, 138], fill=mix(rgb('#5a3a20'), NIGHT, .25)); d.line([x0 - 1, 107, x0 - 1, 138], fill=INK); d.line([x0 + 4, 107, x0 + 4, 138], fill=INK)
    d.rectangle([194, 100, 198, 139], fill=mix(rgb('#4a2f1c'), NIGHT, .2)); d.rectangle([193, 100, 193, 139], fill=INK); d.rectangle([199, 100, 199, 139], fill=INK)
    for y in range(DY0, DY1):                       # cut the doorway out
        for x in range(DX0, DX1): px[x, y] = (0, 0, 0, 0)
    im.save(os.path.join(OUT, 'scene.png'))

def leaf(flip):
    lw, lh = (DX1 - DX0) // 2, DY1 - DY0; im = Image.new('RGBA', (lw, lh)); d = ImageDraw.Draw(im); base = rgb('#6a4425')
    for x in range(lw):
        for y in range(lh):
            c = mix(base, rgb('#3f2714'), .55) if x % 8 == 7 else mix(base, rgb('#7d5330'), ((x // 8) % 2) * .35)
            im.putpixel((x, y), c + (255,))
    d.rectangle([0, 0, lw - 1, lh - 1], outline=INK); d.rectangle([3, 4, lw - 4, 26], outline=mix(base, INK, .6)); d.rectangle([3, 31, lw - 4, lh - 5], outline=mix(base, INK, .6))
    d.rectangle([4, 5, lw - 5, 25], outline=mix(base, rgb('#9a6b3c'), .5)); d.line([4, 32, lw - 5, lh - 6], fill=mix(base, INK, .45))
    for yy in (8, lh - 12): d.rectangle([0, yy, 9, yy + 2], fill=rgb('#2a2a28'))            # hinges on the jamb side
    d.rectangle([lw - 7, 28, lw - 4, 32], fill=rgb('#e9c07a'), outline=INK)                  # brass pull on the meeting side
    return im.transpose(Image.FLIP_LEFT_RIGHT) if flip else im

def doors():
    lw, lh = (DX1 - DX0) // 2, DY1 - DY0; angles = [0, 16, 42, 68, 84]; sheet = Image.new('RGBA', (lw * 2 * len(angles), lh))
    for n, a in enumerate(angles):
        t = math.radians(a); w = max(3, round(lw * math.cos(t))); top = round(5 * math.sin(t)); bot = round(3 * math.sin(t)); dark = 1 - .5 * math.sin(t)
        for side in (0, 1):
            src = leaf(side == 1); out = Image.new('RGBA', (lw, lh))
            for x in range(w):                      # squeeze toward the hinge; the far edge sits a little higher and shorter
                u = x / max(1, w - 1); sx = min(lw - 1, round(u * (lw - 1))); y0 = top * u; y1 = lh - 1 - bot * u
                for y in range(lh):
                    if y < y0 or y > y1: continue
                    sy = min(lh - 1, round((y - y0) / max(1, y1 - y0) * (lh - 1))); c = src.getpixel((sx if side == 0 else lw - 1 - sx, sy)); shade = dark * (1 - .25 * u * math.sin(t))
                    out.putpixel((x if side == 0 else lw - 1 - x, y), (round(c[0] * shade), round(c[1] * shade), round(c[2] * shade), 255))
            sheet.paste(out, (n * lw * 2 + side * lw, 0), out)
    sheet.save(os.path.join(OUT, 'doors.png'))

def spill():
    im = Image.new('RGBA', (W, H)); px = im.load()
    for y in range(DY1 + 1, H):
        t = (y - DY1) / (H - DY1); x0 = DX0 - 26 * t; x1 = DX1 + 26 * t
        for x in range(W):
            if x0 <= x <= x1:
                edge = min(x - x0, x1 - x) / 10; a = (1 - t * .75) * min(1, edge + .35)
                px[x, y] = (255, 214, 130, round(150 * a))
    for y in range(DY0 - 6, DY1 + 1):                # warm rim on the door frame
        for x in list(range(DX0 - 4, DX0)) + list(range(DX1, DX1 + 4)): px[x, y] = (255, 214, 130, 70)
    im.save(os.path.join(OUT, 'spill.png'))

def glow():
    im = Image.new('RGBA', (W, H)); px = im.load()
    for y in range(H):
        for x in range(W):
            a = lit(x, y, 46)
            if a > 0: px[x, y] = (255, 205, 110, round(110 * a))
    im.save(os.path.join(OUT, 'glow.png'))

if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); scene(); doors(); spill(); glow(); print('wrote scene.png, doors.png, spill.png, glow.png to', os.path.normpath(OUT))
