"""Installer art for the CALMS Windows installer (NSIS, made by electron-builder).
   Two looks: western (the town at dusk, Kuwa on the street) and classic (the brand's red-brown, the logo).
   Sizes NSIS wants: sidebar 164x314 (welcome and finish pages), header 150x57 (every other page). 24-bit BMP.
   Run: python3 design/installer/make.py  -> design/installer/out/<look>/ and previews."""
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import os
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, "..", "..")
IMG = os.path.join(ROOT, "frontend", "assets", "img"); OUT = os.path.join(HERE, "out")
def img(p): return Image.open(os.path.join(IMG, p)).convert("RGBA")
def town(sky="sky-night"):
    t = img("town/%s.png" % sky)
    for i in range(1, 6): t.alpha_composite(img("town/layer-%d.png" % i))
    return t
LOGO = img("logo-large.webp")
KUWA = img("kuwa.png")
def kuwa(f=0, sheet=None): sh = sheet or KUWA; return sh.crop(((f % 8) * 96, (f // 8) * 96, (f % 8) * 96 + 96, (f // 8) * 96 + 96))
IDLE = img("kuwa-idle.png")
import runpy
SWOOP = runpy.run_path(os.path.join(ROOT, "design", "app-icon", "app_icon.py"), run_name="art")["KUWA"]   # the app icon's pose
def logo(w):
    l = LOGO.copy(); l = l.crop(l.getbbox()); h = round(l.height * w / l.width); return l.resize((w, h), Image.LANCZOS)
def shadow(im, r=6, o=(0, 4), a=110):
    s = Image.new("RGBA", (im.width + r * 4, im.height + r * 4), (0, 0, 0, 0)); m = im.split()[3].point(lambda v: v * a // 255)
    s.paste((0, 0, 0, 255), (r * 2 + o[0], r * 2 + o[1]), m); return s.filter(ImageFilter.GaussianBlur(r))
def put(base, im, x, y, sh=True):
    if sh: s = shadow(im); base.alpha_composite(s, (x - 12, y - 12))
    base.alpha_composite(im, (x, y))
def bmp(im, path): os.makedirs(os.path.dirname(path), exist_ok=True); im.convert("RGB").save(path, "BMP")

# ---------- western ----------
def western_sidebar():
    S = western_sidebar_base(); return western_sidebar_kuwa(S)
def western_sidebar_base(night=False):
    W, H = 164, 314; t = town("sky-night")                      # 480x180, bank in the middle
    S = Image.new("RGBA", (W, H)); top = t.getpixel((240, 2)); S.paste(top, (0, 0, W, H))
    # sky bands continue upward: repeat the top 40 rows of sky, stretched
    SKY = 62                                                     # rows of the town picture that are only sky
    S.alpha_composite(t.crop((158, 0, 322, SKY)).resize((W, H - 180 + SKY), Image.NEAREST), (0, 0))   # the sky's bands, stretched taller
    S.alpha_composite(t.crop((158, SKY, 322, 180)), (0, H - 180 + SKY))
    if night: S.alpha_composite(Image.new("RGBA", S.size, (14, 10, 30, 120)))
    lg = logo(122); put(S, lg, (W - lg.width) // 2, 14)
    return S
def western_sidebar_kuwa(S):
    k = SWOOP; put(S, k, S.width - k.width + 2, S.height - k.height - 30)     # swooping in over the street
    return S
def western_unsidebar():
    """The uninstaller: the same street at night, Kuwa asleep with his hat in his lap."""
    S = western_sidebar_base(night=True)
    d = ImageDraw.Draw(S)
    for x, y in ((12, 150), (40, 170), (70, 146), (150, 184), (26, 188), (100, 176), (150, 150)): d.point((x, y), (255, 240, 200, 255)); d.point((x + 1, y), (255, 240, 200, 160))
    d.ellipse((112, 146, 134, 168), fill=(246, 230, 190, 255)); d.ellipse((119, 142, 141, 164), fill=(66, 40, 44, 255))   # a crescent moon
    k = kuwa(136, IDLE); put(S, k, (S.width - 96) // 2 + 20, S.height - 96, sh=False)
    for x, y, n in ((116, 220, 5), (126, 208, 7)):                                 # z z
        d.line((x, y, x + n, y), (243, 221, 176, 255)); d.line((x + n, y, x, y + n), (243, 221, 176, 255)); d.line((x, y + n, x + n, y + n), (243, 221, 176, 255))
    return S
def western_header():
    W, H = 150, 57; t = town("sky-night"); S = t.crop((165, 0, 165 + W, 57)).convert("RGBA")
    S = S.resize((W, H)); lg = logo(52); put(S, lg, W - lg.width - 4, 2, sh=False)
    return S

# ---------- classic ----------
def grad(W, H, stops):
    g = Image.new("RGBA", (W, H)); d = ImageDraw.Draw(g)
    for y in range(H):
        for x in range(W):
            p = (x / W * .35 + y / H * .65)
            for i in range(len(stops) - 1):
                (p0, c0), (p1, c1) = stops[i], stops[i + 1]
                if p0 <= p <= p1:
                    k = (p - p0) / (p1 - p0); c = tuple(round(c0[j] + (c1[j] - c0[j]) * k) for j in range(3)); break
            g.putpixel((x, y), c + (255,))
    return g
def glow(base, cx, cy, r, a=80):
    o = Image.new("RGBA", base.size, (0, 0, 0, 0)); d = ImageDraw.Draw(o); d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(240, 168, 30, a))
    base.alpha_composite(o.filter(ImageFilter.GaussianBlur(r * .35)))
def classic_sidebar():
    W, H = 164, 314; S = grad(W, H, [(0, (74, 40, 23)), (.55, (107, 42, 27)), (1, (143, 42, 34))])
    glow(S, 150, 10, 60, 70); glow(S, 10, 300, 46, 60)
    lg = logo(132); put(S, lg, (W - lg.width) // 2, (H - lg.height) // 2 - 6)
    return S
def classic_header():
    W, H = 150, 57; S = Image.new("RGBA", (W, H), (255, 255, 255, 255))
    lg = logo(50); S.alpha_composite(lg, (W - lg.width - 6, (H - lg.height) // 2))
    return S

un = western_unsidebar(); bmp(un, os.path.join(OUT, "western", "uninstallerSidebar.bmp")); un.save(os.path.join(OUT, "western", "unsidebar.png"))
for look, sb, hd in [("western", western_sidebar(), western_header()), ("classic", classic_sidebar(), classic_header())]:
    bmp(sb, os.path.join(OUT, look, "installerSidebar.bmp")); bmp(hd, os.path.join(OUT, look, "installerHeader.bmp"))
    sb.save(os.path.join(OUT, look, "sidebar.png")); hd.save(os.path.join(OUT, look, "header.png"))
print("ok")
