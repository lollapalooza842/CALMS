"""Little things alive in the town on the sign-in screen, drawn at the town's own pixel size
(the town picture is 480 x 180; one pixel here is one pixel there).
Run: python design/town/town_life.py  -> frontend/assets/img/town/horse.png, lantern.png, batwing.png

  horse.png    4 frames, 24 x 18 each: standing, tail flick, tail flick (higher), head down
  lantern.png  1 frame, 7 x 11: a lit lantern on a short chain (the page swings it)
  batwing.png  3 frames, 11 x 9 each: saloon swing doors shut, half open, open
"""
import os
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "assets", "img", "town")
INK = (36, 19, 10, 255)        # the town's outline brown
COAT = (122, 70, 36, 255); COAT_L = (156, 96, 52, 255); COAT_D = (88, 48, 24, 255)
MANE = (46, 26, 14, 255); HOOF = (30, 18, 10, 255); EYE = (20, 10, 6, 255)
BLANKET = (143, 42, 34, 255); BLANKET_L = (186, 70, 52, 255); SADDLE = (70, 38, 18, 255)
BRASS = (201, 143, 74, 255); GLOW = (255, 214, 120, 255); GLOW_L = (255, 240, 190, 255)
WOOD = (94, 58, 31, 255); WOOD_L = (128, 82, 46, 255)

def px(im, pts, c):
    for x, y in pts:
        if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((x, y), c)
def rect(im, x0, y0, x1, y1, c):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1): px(im, [(x, y)], c)

def horse(tail=0, head_down=False):
    """Side view, facing left (towards the hitching post)."""
    im = Image.new("RGBA", (24, 18), (0, 0, 0, 0))
    # body
    rect(im, 7, 7, 19, 11, COAT); rect(im, 8, 6, 18, 6, COAT); rect(im, 8, 12, 18, 12, COAT_D)
    rect(im, 9, 7, 17, 7, COAT_L)
    # blanket and saddle
    rect(im, 10, 6, 15, 10, BLANKET); rect(im, 10, 6, 15, 6, BLANKET_L); rect(im, 11, 5, 14, 5, SADDLE)
    # legs (two pairs, the far ones darker)
    for x in (8, 17): rect(im, x, 13, x, 16, COAT)
    for x in (10, 19): rect(im, x, 13, x, 16, COAT_D)
    for x in (8, 10, 17, 19): px(im, [(x, 17)], HOOF)
    # neck and head
    if not head_down:
        rect(im, 5, 3, 7, 8, COAT); px(im, [(6, 2), (7, 2)], COAT)
        rect(im, 1, 3, 5, 5, COAT); px(im, [(0, 4), (0, 5)], COAT_D)          # head, muzzle
        px(im, [(3, 3)], EYE); px(im, [(6, 1), (7, 1)], COAT_D)               # eye, ear
        rect(im, 7, 2, 8, 7, MANE)                                             # mane down the neck
    else:
        rect(im, 4, 7, 7, 10, COAT); rect(im, 1, 10, 4, 12, COAT); px(im, [(0, 12)], COAT_D)
        px(im, [(3, 10)], EYE); px(im, [(6, 6)], COAT_D); rect(im, 7, 6, 8, 9, MANE)
    # tail
    if tail == 0: rect(im, 20, 7, 21, 8, MANE); rect(im, 21, 9, 21, 13, MANE)
    elif tail == 1: rect(im, 20, 7, 22, 8, MANE); px(im, [(23, 9), (23, 10), (22, 11)], MANE)
    else: rect(im, 20, 6, 22, 7, MANE); px(im, [(23, 5), (23, 4), (22, 8)], MANE)
    # outline: any empty pixel next to the horse gets the town's ink
    src = im.copy()
    for y in range(18):
        for x in range(24):
            if src.getpixel((x, y))[3]: continue
            if any(0 <= x + dx < 24 and 0 <= y + dy < 18 and src.getpixel((x + dx, y + dy))[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), INK)
    return im

def lantern():
    im = Image.new("RGBA", (7, 11), (0, 0, 0, 0))
    px(im, [(3, 0), (3, 1), (3, 2)], INK)                     # chain
    rect(im, 2, 3, 4, 3, INK); rect(im, 1, 4, 5, 4, BRASS)    # cap
    rect(im, 1, 5, 5, 8, INK); rect(im, 2, 5, 4, 8, GLOW); px(im, [(3, 6), (3, 7)], GLOW_L)   # glass and flame
    rect(im, 1, 9, 5, 9, BRASS); rect(im, 2, 10, 4, 10, INK)  # base
    return im

def batwing(open_=0):
    """Saloon swing doors, sized to the saloon's doorway (11 x 9): 0 shut, 1 half open, 2 open.
    Light slatted wood with a gap between the two halves, so the dark doorway shows through."""
    im = Image.new("RGBA", (11, 9), (0, 0, 0, 0))
    w = [5, 3, 1][open_]
    for side in (0, 1):
        x0 = 0 if side == 0 else 11 - w
        rect(im, x0, 0, x0 + w - 1, 8, INK)
        if w >= 3:
            rect(im, x0 + 1, 1, x0 + w - 2, 7, WOOD_L)
            for x in range(x0 + 1, x0 + w - 1, 2): rect(im, x, 2, x, 6, WOOD)   # slats
            rect(im, x0 + 1, 1, x0 + w - 2, 1, BRASS if open_ == 0 else WOOD_L)
        else:
            rect(im, x0, 1, x0, 7, WOOD_L)
    return im

os.makedirs(OUT, exist_ok=True)
def padded(sheet, fw, fh):
    """A 1-pixel clear gutter round every frame, so a phone's fractional scaling cannot bleed the next frame into view."""
    cols = sheet.width // fw
    out = Image.new("RGBA", (cols * (fw + 2), fh + 2), (0, 0, 0, 0))
    for c in range(cols): out.paste(sheet.crop((c * fw, 0, c * fw + fw, fh)), (c * (fw + 2) + 1, 1))
    return out

sheet = Image.new("RGBA", (24 * 4, 18), (0, 0, 0, 0))
for k, f in enumerate([horse(0), horse(1), horse(2), horse(0, True)]): sheet.paste(f, (k * 24, 0))
padded(sheet, 24, 18).save(os.path.join(OUT, "horse.png"))
lantern().save(os.path.join(OUT, "lantern.png"))
bw = Image.new("RGBA", (11 * 3, 9), (0, 0, 0, 0))
for k in range(3): bw.paste(batwing(k), (k * 11, 0))
padded(bw, 11, 9).save(os.path.join(OUT, "batwing.png"))
print("wrote horse.png, lantern.png, batwing.png")
