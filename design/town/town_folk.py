"""The townsfolk, the far train, the vultures and the sky at other times of day, for the sign-in screen.
Drawn at the town's own pixel size (the town picture is 480 x 180; one pixel here is one there).
Run: python design/town/town_folk.py  -> frontend/assets/img/town/

  folk.png      16 x 18 frames, 13 across, one row per person (cowboy A, cowboy B, cowboy C, guard).
                All face right (the page mirrors them to face left).
                0-3 walking   4 standing   5 gun drawn   6 tipping his hat   7-10 walking, hat shot off
                11 standing, no hat   12 the hat on its own (it flies when it is shot off)
  train-far.png the train on the far horizon: engine, tender and three cars, 2 frames (wheels turning)
  vulture.png   3 frames, 15 x 7: wings up, level, down
  sky-morning.png, sky-noon.png, sky-night.png   the sky (layer-1) recoloured; night has stars
"""
import os, random
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "..", "frontend", "assets", "img", "town")
INK = (36, 19, 10, 255)
def C(s): return (int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16), 255)

def put(im, x, y, c):
    if 0 <= x < im.width and 0 <= y < im.height: im.putpixel((int(x), int(y)), c)
def rect(im, x0, y0, x1, y1, c):
    for y in range(int(y0), int(y1) + 1):
        for x in range(int(x0), int(x1) + 1): put(im, x, y, c)
def line(im, x0, y0, x1, y1, c):
    n = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(n + 1):
        t = i / max(1, n); put(im, round(x0 + (x1 - x0) * t), round(y0 + (y1 - y0) * t), c)
def outline(im):
    src = im.copy(); W, H = im.size
    for y in range(H):
        for x in range(W):
            if src.getpixel((x, y))[3]: continue
            if any(0 <= x + dx < W and 0 <= y + dy < H and src.getpixel((x + dx, y + dy))[3] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                im.putpixel((x, y), INK)
    return im

# ---------------- people ----------------
SKIN, SKIN_D = C("#d9a066"), C("#b07a46")
PEOPLE = [   # hat, hat band, shirt, shirt shade, vest, pants, bandana, boots
    dict(hat=C("#6b4423"), band=C("#c98f4a"), shirt=C("#b4362c"), shirt_d=C("#7e221c"), vest=C("#3f2414"), pants=C("#4a5a78"), scarf=C("#e9d2a6"), boots=C("#2a1a10")),
    dict(hat=C("#1f1a18"), band=C("#8a8a8a"), shirt=C("#3d6a8a"), shirt_d=C("#284a63"), vest=C("#5e3a1f"), pants=C("#5a4632"), scarf=C("#b4362c"), boots=C("#1a120c")),
    dict(hat=C("#d9b77a"), band=C("#6b4423"), shirt=C("#5f7a3a"), shirt_d=C("#435828"), vest=C("#7a4e2a"), pants=C("#3a3a4a"), scarf=C("#f0a81e"), boots=C("#3a2414")),
    dict(hat=C("#2a2420"), band=C("#f0a81e"), shirt=C("#8f6a3a"), shirt_d=C("#6a4c28"), vest=C("#2e3a2a"), pants=C("#3a3028"), scarf=C("#3d6a8a"), boots=C("#1a120c"), guard=True),
]
GUN, GUN_L, GOLD, LEATHER = C("#4a4a52"), C("#8a8a94"), C("#f0a81e"), C("#6b3f1e")
FW, FH = 16, 18

def person(p, phase=None, pose="stand", hat=True):
    """Side view facing right. Feet on the bottom row; 1 px left free on every side for the outline."""
    im = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    bob = 1 if phase in (1, 3) else 0          # up on the passing step
    y0 = 1 - bob
    # legs: (near foot x, far foot x, which is lifted)
    legs = {None: (8, 7, None), 0: (10, 5, None), 1: (8, 7, "far"), 2: (5, 10, None), 3: (7, 8, "near")}[phase]
    hipx, hipy = 7, y0 + 11
    for which, fx in (("far", legs[1]), ("near", legs[0])):
        col = p["pants"] if which == "near" else tuple(max(0, v - 30) for v in p["pants"][:3]) + (255,)
        fy = FH - 3 - (1 if legs[2] == which else 0)
        line(im, hipx, hipy, fx, fy, col); line(im, hipx + 1, hipy, fx + 1, fy, col)
        rect(im, fx, fy + 1, fx + 2, fy + 1, p["boots"]); put(im, fx, fy, p["boots"])     # boot, toe forward
    if p.get("guard") and pose != "draw":                                                   # rifle slung behind his back
        line(im, 3, y0 + 12, 8, y0 + 1, GUN); put(im, 3, y0 + 12, LEATHER); put(im, 4, y0 + 11, LEATHER); put(im, 8, y0 + 0, GUN_L)
    # torso
    rect(im, 5, y0 + 6, 9, y0 + 10, p["shirt"]); rect(im, 5, y0 + 6, 5, y0 + 10, p["shirt_d"])
    rect(im, 5, y0 + 7, 6, y0 + 10, p["vest"])                                            # vest, seen from the side
    rect(im, 5, y0 + 11, 9, y0 + 11, INK); put(im, 9, y0 + 11, GOLD)                        # belt and buckle
    rect(im, 5, y0 + 11, 6, y0 + 13, LEATHER)                                              # holster
    if p.get("guard"): put(im, 8, y0 + 7, GOLD)                                           # deputy's star
    rect(im, 5, y0 + 5, 9, y0 + 5, p["scarf"])                                             # bandana
    # head
    rect(im, 6, y0 + 2, 9, y0 + 4, SKIN); put(im, 10, y0 + 3, SKIN); put(im, 6, y0 + 4, SKIN_D)
    put(im, 9, y0 + 3, INK)                                                                 # eye
    rect(im, 5, y0 + 2, 5, y0 + 3, C("#3a2414"))                                            # hair at the back
    # arm
    if pose == "draw":
        line(im, 7, y0 + 7, 11, y0 + 7, p["shirt"]); put(im, 12, y0 + 7, SKIN)
        rect(im, 13, y0 + 6, 15, y0 + 6, GUN); put(im, 13, y0 + 7, GUN); put(im, 15, y0 + 6, GUN_L)
    elif pose == "tip":
        line(im, 8, y0 + 7, 10, y0 + 3, p["shirt"]); put(im, 10, y0 + 1, SKIN); put(im, 10, y0 + 2, SKIN)
    else:
        sw = {None: 0, 0: -2, 1: 0, 2: 2, 3: 0}[phase]
        line(im, 7, y0 + 7, 7 + sw // 2, y0 + 9, p["shirt_d"]); put(im, 7 + sw, y0 + 10, SKIN)
    # hat
    if hat:
        lift = 1 if pose == "tip" else 0
        rect(im, 6, y0 - 1 - lift, 9, y0 + 0 - lift, p["hat"]); rect(im, 6, y0 + 0 - lift, 9, y0 + 0 - lift, p["band"])
        rect(im, 4, y0 + 1 - lift, 11, y0 + 1 - lift, p["hat"])
        if p.get("guard"): put(im, 7, y0 - 1 - lift, GOLD)
    else:
        rect(im, 6, y0 + 1, 9, y0 + 1, C("#3a2414")); put(im, 7, y0, C("#3a2414"))             # tousled hair
    return outline(im)

def lone_hat(p):
    im = Image.new("RGBA", (FW, FH), (0, 0, 0, 0))
    rect(im, 6, 7, 9, 8, p["hat"]); rect(im, 6, 8, 9, 8, p["band"]); rect(im, 4, 9, 11, 9, p["hat"])
    return outline(im)

def padded(sheet, fw, fh):
    """The sheet with a 1-pixel clear gutter round every frame. A phone scales the town by a fraction, and without
    the gutter the edge of the next frame can bleed into view (a sliver of another pose beside a walker)."""
    cols, rows = sheet.width // fw, sheet.height // fh
    out = Image.new("RGBA", (cols * (fw + 2), rows * (fh + 2)), (0, 0, 0, 0))
    for r in range(rows):
        for c in range(cols): out.paste(sheet.crop((c * fw, r * fh, c * fw + fw, r * fh + fh)), (c * (fw + 2) + 1, r * (fh + 2) + 1))
    return out

def folk():
    cols = 13; sheet = Image.new("RGBA", (FW * cols, FH * len(PEOPLE)))
    for r, p in enumerate(PEOPLE):
        frames = [person(p, k) for k in range(4)] + [person(p), person(p, pose="draw"), person(p, pose="tip")]
        frames += [person(p, k, hat=False) for k in range(4)] + [person(p, hat=False), lone_hat(p)]
        for c, f in enumerate(frames): sheet.paste(f, (c * FW, r * FH))
    padded(sheet, FW, FH).save(os.path.join(OUT, "folk.png"), optimize=True)
    return sheet

# ---------------- the far train ----------------
def train(fr):
    """Small and far away, travelling left: engine first, then tender and three cars. 64 x 10."""
    W, H = 64, 10; im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    BLK, RED, RED_L, BR, WIN = C("#1f1712"), C("#7e221c"), C("#a8392c"), C("#c98f4a"), C("#f3ddb0")
    # engine (x 1-16)
    rect(im, 1, 7, 2, 8, BR)                                    # cowcatcher
    rect(im, 3, 4, 11, 7, BLK); rect(im, 4, 1, 5, 3, BLK); rect(im, 3, 0, 6, 0, BLK)   # boiler, funnel
    put(im, 8, 3, BR)                                           # dome
    rect(im, 12, 1, 16, 7, RED); rect(im, 13, 2, 15, 4, WIN); rect(im, 11, 0, 17, 0, BLK)   # cab
    # tender (18-24)
    rect(im, 18, 4, 24, 7, BLK); rect(im, 18, 4, 24, 4, C("#3a2a20"))
    # cars (26-37, 39-50, 52-63)
    for x0 in (26, 39, 52):
        rect(im, x0, 2, x0 + 11, 7, RED); rect(im, x0, 1, x0 + 11, 1, BLK); rect(im, x0, 2, x0 + 11, 2, RED_L)
        for wx in range(x0 + 1, x0 + 11, 3): rect(im, wx, 3, wx + 1, 4, WIN)
    # couplings
    for x in (17, 25, 38, 51): put(im, x, 7, BLK)
    # wheels: they turn (a lit spoke moves)
    for cx in (4, 7, 10, 20, 23, 28, 35, 41, 48, 54, 61):
        rect(im, cx - 1, 8, cx, 9, BLK); put(im, cx - 1 + fr, 8, BR if cx < 12 else C("#5a4a3a"))
    line(im, 4, 8 + fr, 10, 8 + fr, BR)                          # the drive rod
    return outline(im)

def trains():
    a, b = train(0), train(1)
    sheet = Image.new("RGBA", (a.width * 2, a.height)); sheet.paste(a, (0, 0)); sheet.paste(b, (a.width, 0))
    padded(sheet, a.width, a.height).save(os.path.join(OUT, "train-far.png"), optimize=True)
    return sheet

# ---------------- vultures ----------------
def vulture(w):
    """Soaring: long broad wings held in a shallow V, fingered tips, a short tail and a small bald red head. 19 x 8."""
    im = Image.new("RGBA", (19, 8), (0, 0, 0, 0))
    D, M, HEAD = C("#1f1712"), C("#4a3628"), C("#c4584a")
    lift = {"up": -3, "mid": -1, "down": 2}[w]                    # how high the wing tips are against the body
    for side in (-1, 1):
        for k in range(1, 9):                                     # the wing, thinning towards the tip
            x = 9 + side * k; y = 4 + round(lift * k / 8)
            put(im, x, y, D); 
            if k < 7: put(im, x, y + 1, M if k > 2 else D)
        tx, ty = 9 + side * 9, 4 + lift                            # fingered tips
        put(im, tx, ty - 1, D); put(im, tx, ty + 1, D)
    rect(im, 8, 4, 10, 5, D); put(im, 9, 6, D); put(im, 8, 6, M); put(im, 10, 6, M)   # body and tail
    put(im, 9, 3, HEAD); put(im, 9, 2, HEAD)                       # the bald head, pointing ahead (up the screen)
    return im

def vultures():
    sheet = Image.new("RGBA", (57, 8))
    for k, w in enumerate(["up", "mid", "down"]): sheet.paste(vulture(w), (k * 19, 0))
    padded(sheet, 19, 8).save(os.path.join(OUT, "vulture.png"), optimize=True)
    return sheet

# ---------------- skies ----------------
BANDS = [(90, 42, 24), (122, 58, 28), (154, 76, 32), (184, 100, 38), (208, 126, 48), (224, 154, 68), (236, 180, 96), (243, 201, 126), (246, 216, 152), (248, 228, 176)]
SKIES = {
    "morning": [(70, 110, 160), (88, 130, 178), (110, 152, 196), (134, 174, 210), (160, 194, 222), (188, 210, 228), (214, 222, 226), (236, 226, 208), (248, 226, 188), (252, 238, 210)],
    "noon":    [(46, 98, 172), (58, 114, 186), (72, 130, 200), (88, 146, 212), (106, 162, 222), (126, 178, 230), (150, 196, 236), (176, 212, 242), (202, 228, 246), (240, 246, 250)],
    "night":   [(12, 12, 32), (16, 17, 42), (21, 23, 52), (27, 29, 62), (33, 35, 72), (41, 41, 82), (51, 48, 92), (63, 56, 100), (80, 66, 106), (98, 78, 110)],
}
def skies():
    src = Image.open(os.path.join(OUT, "layer-1.png")).convert("RGBA")
    for name, pal in SKIES.items():
        m = {b + (255,): p + (255,) for b, p in zip(BANDS, pal)}
        im = Image.new("RGBA", src.size); spx = src.load(); dpx = im.load()
        for y in range(src.height):
            for x in range(src.width): dpx[x, y] = m.get(spx[x, y], spx[x, y])
        if name == "night":
            rnd = random.Random(7)
            for _ in range(140):
                x, y = rnd.randrange(480), rnd.randrange(0, 96)
                if spx[x, y][:3] in BANDS[:6]:
                    dpx[x, y] = rnd.choice([(255, 250, 230, 255), (230, 230, 255, 255), (200, 196, 220, 255)])
                    if rnd.random() < .08: put(im, x + 1, y, (150, 150, 190, 255)); put(im, x - 1, y, (150, 150, 190, 255))
        im.save(os.path.join(OUT, f"sky-{name}.png"), optimize=True)

if __name__ == "__main__":
    f = folk(); t = trains(); v = vultures(); skies()
    pv = Image.new("RGBA", (220, 110), (232, 210, 170, 255))
    pv.alpha_composite(f, (0, 0)); pv.alpha_composite(t, (0, 76)); pv.alpha_composite(v, (140, 90))
    pv.resize((pv.width * 5, pv.height * 5), Image.NEAREST).save(os.path.join(HERE, "folk_preview.png"))
    print("folk", f.size, "train", t.size, "vulture", v.size)
