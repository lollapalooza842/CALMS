"""Draws the CALMS app icon: pixel KUWA swooping in, wings spread, in front of a setting sun, on a dusk tile with a
brass frame. Writes the web-app icons (frontend/assets/img/app/) and the desktop icons (desktop/build/).
KUWA is drawn with the same code as his sprite sheets (design/kuwa/kuwa.py), with his wings opened wide.
Run from the project root:  python design/app-icon/app_icon.py"""
from PIL import Image, ImageDraw
import os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..")

# ---- KUWA, wings spread, tipped into a swoop ----
_cwd = os.getcwd(); os.chdir(os.path.join(ROOT, "design", "kuwa"))
exec(open("kuwa.py").read().split("tags=[")[0])               # front(), FLY, FLYL, the palette
os.chdir(_cwd)
FLY["z"] = [(28, 52), (14, 42), (2, 33), (-8, 30), (-6, 36), (-1, 38), (-5, 43), (3, 45), (-1, 50), (8, 52), (5, 57), (14, 58), (12, 63), (27, 66)]
FLYL["z"] = [[(24, 54), (-3, 34)], [(24, 58), (2, 47)], [(25, 62), (8, 55)]]
def swoop():
    k = front(wing="flyz", gy=-2, feet="tuck", brow=2)
    c = Image.new("RGBA", (128, 128)); c.alpha_composite(k, (16, 16))
    c = c.rotate(-12, resample=Image.NEAREST, center=(64, 70))
    return c.crop(c.getbbox())
KUWA = swoop()

# ---- the tile ----
SKY = [(58, 26, 20), (92, 36, 24), (138, 52, 30), (184, 80, 38), (222, 120, 52), (240, 160, 72)]   # dusk, top to horizon
def tile(grid, pad, frame=True, round_=True):
    """A grid x grid pixel tile. pad = empty pixels around KUWA."""
    t = Image.new("RGBA", (grid, grid), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    r = grid // 7 if round_ else 0
    band = grid / len(SKY)
    for i, c in enumerate(SKY): d.rectangle((0, round(i * band), grid, round((i + 1) * band)), fill=c + (255,))
    cx, cy, R = grid // 2, round(grid * .52), round(grid * .30)          # the setting sun, behind him
    d.ellipse((cx - R - 3, cy - R - 3, cx + R + 3, cy + R + 3), fill=(246, 196, 104, 255))
    d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=(250, 222, 150, 255))
    for k, y in enumerate((cy + R // 3, cy + R // 3 + 5, cy + R // 3 + 9)):   # the sun's stripes, a western poster's
        d.rectangle((cx - R, y, cx + R, y + 1 + (k > 0)), fill=SKY[-1] + (255,))
    hy = grid - grid // 6                                                   # the desert floor and a far mesa
    d.rectangle((0, hy, grid, grid), fill=(120, 58, 30, 255)); d.rectangle((0, hy, grid, hy + 1), fill=(88, 40, 22, 255))
    d.polygon([(grid * .06, hy), (grid * .12, hy - grid * .07), (grid * .26, hy - grid * .07), (grid * .32, hy)], fill=(96, 44, 24, 255))
    for sx, sy, ln in ((.07, .58, .16), (.12, .65, .12), (.06, .72, .14)):   # speed streaks trailing behind him
        x, y = round(grid * sx), round(grid * sy); d.rectangle((x, y, x + round(grid * ln), y + 1), fill=(255, 240, 200, 210))
    d.rounded_rectangle((0, 0, grid - 1, grid - 1), r, outline=(18, 9, 4, 255), width=2)
    if frame:
        d.rounded_rectangle((4, 4, grid - 5, grid - 5), max(0, r - 4), outline=(201, 152, 62, 255), width=2)
        for x, y in ((9, 9), (grid - 12, 9), (9, grid - 12), (grid - 12, grid - 12)):
            d.rectangle((x, y, x + 2, y + 2), fill=(240, 205, 120, 255))
    if round_:
        m = Image.new("L", (grid, grid), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, grid - 1, grid - 1), r, fill=255); t.putalpha(m)
    k = KUWA; room = grid - 2 * pad
    if k.width > room or k.height > room:
        s = min(room / k.width, room / k.height); k = k.resize((max(1, round(k.width * s)), max(1, round(k.height * s))), Image.NEAREST)
    x = (grid - k.width) // 2; y = pad + (room - k.height) // 2
    t.alpha_composite(k, (x, y)); return t

def save(img, size, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize((size, size), Image.NEAREST if size % img.width == 0 else Image.LANCZOS).save(path)

if __name__ == "__main__":
    std = tile(128, 9)                     # the normal icon
    mask = tile(160, 30, frame=False, round_=False)   # "maskable": extra margin, the phone cuts its own shape
    web = os.path.join(ROOT, "frontend/assets/img/app"); desk = os.path.join(ROOT, "desktop/build")
    save(std, 192, web + "/icon-192.png"); save(std, 512, web + "/icon-512.png"); save(mask, 512, web + "/icon-maskable-512.png"); save(std, 180, web + "/apple-touch-icon.png")
    save(std, 512, desk + "/icon.png")
    os.makedirs(desk, exist_ok=True)
    std.resize((256, 256), Image.NEAREST).save(desk + "/icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
    print("icons written")
