"""Draws the CALMS app icon: pixel KUWA on a dark wood tile with a brass frame.
Writes the web-app icons (frontend/assets/img/app/) and the desktop icons (desktop/build/).
Run from the project root:  python design/app-icon/app_icon.py"""
from PIL import Image, ImageDraw
import os
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
kuwa = Image.open(os.path.join(ROOT, "frontend/assets/img/kuwa.png")).convert("RGBA").crop((0, 0, 96, 96))
kuwa = kuwa.crop(kuwa.getbbox())

def tile(grid, pad, frame=True, round_=True):
    """A grid x grid pixel tile. pad = empty pixels around KUWA."""
    t = Image.new("RGBA", (grid, grid), (0, 0, 0, 0)); d = ImageDraw.Draw(t)
    r = grid // 7 if round_ else 0
    d.rounded_rectangle((0, 0, grid - 1, grid - 1), r, fill=(36, 19, 10, 255))
    for y in range(grid):                                    # wood planks
        if y % 16 == 15: d.line((0, y, grid, y), fill=(26, 13, 6, 255))
    d.rounded_rectangle((0, 0, grid - 1, grid - 1), r, outline=(18, 9, 4, 255), width=2)
    if frame:
        d.rounded_rectangle((4, 4, grid - 5, grid - 5), max(0, r - 4), outline=(201, 152, 62, 255), width=2)
        for x, y in ((9, 9), (grid - 12, 9), (9, grid - 12), (grid - 12, grid - 12)):
            d.rectangle((x, y, x + 2, y + 2), fill=(240, 205, 120, 255))
    if round_:                                               # keep the planks inside the rounded corners
        m = Image.new("L", (grid, grid), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, grid - 1, grid - 1), r, fill=255); t.putalpha(m)
    k = kuwa; room = grid - 2 * pad
    x = (grid - k.width) // 2; y = pad + (room - k.height) // 2 + 2
    t.alpha_composite(k, (x, y)); return t

def save(img, size, path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize((size, size), Image.NEAREST if size % img.width == 0 else Image.LANCZOS).save(path)

std = tile(128, 16)                    # the normal icon
mask = tile(160, 32, frame=False, round_=False)   # "maskable": extra margin, the phone cuts its own shape
web = os.path.join(ROOT, "frontend/assets/img/app"); desk = os.path.join(ROOT, "desktop/build")
save(std, 192, web + "/icon-192.png"); save(std, 512, web + "/icon-512.png"); save(mask, 512, web + "/icon-maskable-512.png"); save(std, 180, web + "/apple-touch-icon.png")
save(std, 512, desk + "/icon.png")
os.makedirs(desk, exist_ok=True)
std.resize((256, 256), Image.NEAREST).save(desk + "/icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print("icons written")
