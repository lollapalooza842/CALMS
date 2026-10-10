"""CALMS icons: a hand-placed pixel set in the frontier-bank palette.
Run from this folder: python3 icons.py   (needs Pillow).
Each icon is 16 x 16 pixels. Writes, into frontend/assets/img/icons/:
  icons.png        every icon side by side (16 px each), for CSS
  <name>.png       each icon at 32 x 32, used as the page's browser-tab icon
The names are listed in ORDER; assets/css/icons.css is written from the same list.
"""
from PIL import Image, ImageDraw
import os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', '..', 'frontend', 'assets', 'img', 'icons')
h = lambda s: (int(s[1:3], 16), int(s[3:5], 16), int(s[5:7], 16), 255)
O, P, Q = h('#24130a'), h('#f7e8c6'), h('#dcc592')            # ink, paper, paper shade
B, H, D = h('#c98f4a'), h('#f0cf8a'), h('#8a5a26')            # brass, brass light, brass dark
W, V = h('#7a4e2a'), h('#4a2f19')                             # wood, wood dark
R, G, U, S, T = h('#b4362c'), h('#2f6b41'), h('#2c5a80'), h('#8a8a84'), h('#55524c')   # red, green, blue, steel, steel dark
ICONS = {}
def icon(fn): ICONS[fn.__name__.replace('_', '-')] = fn; return fn
class C:
    def __init__(s): s.im = Image.new('RGBA', (16, 16)); s.d = ImageDraw.Draw(s.im)
    def r(s, x0, y0, x1, y1, f, o=None): s.d.rectangle([x0, y0, x1, y1], fill=f, outline=o)
    def l(s, pts, f): s.d.line(pts, fill=f)
    def p(s, x, y, f): s.d.point((x, y), f)
    def e(s, x0, y0, x1, y1, f, o=None): s.d.ellipse([x0, y0, x1, y1], fill=f, outline=o)
    def poly(s, pts, f, o=None): s.d.polygon(pts, fill=f, outline=o)
def paper(c, x0, y0, x1, y1, lines=True):
    c.r(x0, y0, x1, y1, P, O)
    if lines:
        for y in range(y0 + 3, y1 - 1, 2): c.l([(x0 + 2, y), (x1 - 2, y)], D)

@icon
def my_queue(c):            # a cork board with pinned notices
    c.r(1, 2, 14, 13, B, O); c.r(1, 2, 14, 2, V); c.r(1, 13, 14, 13, V)
    c.r(3, 4, 7, 8, P, O); c.r(9, 4, 12, 7, P, O); c.r(5, 9, 10, 11, P, O); c.p(5, 4, R); c.p(10, 4, R); c.p(7, 9, R)
@icon
def applications(c):        # a stack of forms
    c.r(4, 2, 13, 11, Q, O); c.r(3, 3, 12, 12, Q, O); paper(c, 2, 4, 11, 14)
@icon
def new_application(c):     # a form and a plus
    paper(c, 2, 2, 11, 14); c.r(9, 9, 15, 15, G, O); c.l([(12, 10), (12, 14)], P); c.l([(10, 12), (14, 12)], P)
@icon
def application_detail(c):  # an open folder
    c.poly([(1, 4), (6, 4), (7, 6), (14, 6), (14, 13), (1, 13)], B, O); paper(c, 3, 3, 12, 9, False); c.l([(5, 5), (10, 5)], D); c.l([(5, 7), (10, 7)], D); c.poly([(1, 13), (3, 8), (15, 8), (14, 13)], H, O)
@icon
def documents(c):           # a paperclip on a sheet
    paper(c, 2, 2, 13, 14); c.r(8, 1, 12, 8, None, S); c.r(9, 3, 11, 8, None, T); c.r(10, 4, 10, 6, P)
@icon
def encode_verify(c):       # a magnifying glass over figures
    paper(c, 1, 2, 10, 13); c.e(6, 5, 13, 12, H, O); c.e(8, 7, 11, 10, P, O); c.l([(12, 12), (14, 14)], O); c.l([(13, 12), (15, 14)], V)
@icon
def review_queue(c):        # a telegraph key / in-tray with sorted cards
    c.r(1, 9, 14, 14, W, O); c.r(3, 3, 6, 10, P, O); c.r(7, 5, 10, 10, P, O); c.r(11, 2, 13, 10, P, O); c.p(4, 5, G); c.p(8, 7, B); c.p(12, 4, R); c.r(1, 11, 14, 11, V)
@icon
def credit_assessment(c):   # scales
    c.l([(8, 2), (8, 13)], O); c.r(5, 13, 11, 14, B, O); c.l([(2, 4), (14, 4)], O); c.p(8, 2, R)
    c.l([(2, 4), (1, 8)], D); c.l([(2, 4), (4, 8)], D); c.l([(13, 4), (11, 9)], D); c.l([(13, 4), (15, 9)], D)
    c.poly([(0, 8), (5, 8), (4, 10), (1, 10)], H, O); c.poly([(10, 9), (15, 9), (14, 11), (11, 11)], H, O)
@icon
def decision(c):            # a rubber stamp
    c.r(6, 1, 9, 6, W, O); c.e(5, 0, 10, 3, V, O); c.poly([(3, 9), (5, 6), (10, 6), (12, 9)], B, O); c.r(2, 9, 13, 11, D, O); c.r(3, 13, 12, 14, R); c.p(2, 13, R); c.p(13, 14, R)
@icon
def counter_offers(c):      # two slips passing each other
    c.r(1, 2, 9, 8, P, O); c.l([(3, 4), (7, 4)], D); c.l([(3, 6), (6, 6)], D); c.r(6, 8, 14, 14, H, O); c.l([(8, 10), (12, 10)], D); c.l([(8, 12), (11, 12)], D)
    c.l([(11, 3), (14, 3)], R); c.p(13, 2, R); c.p(13, 4, R); c.l([(1, 12), (4, 12)], G); c.p(2, 11, G); c.p(2, 13, G)
@icon
def record_answer(c):       # a speech bubble with a tick
    c.poly([(2, 2), (13, 2), (14, 3), (14, 9), (13, 10), (8, 10), (5, 13), (5, 10), (2, 10), (1, 9), (1, 3)], P, O); c.l([(4, 6), (6, 8)], G); c.l([(6, 8), (11, 4)], G); c.l([(4, 7), (6, 9)], G)
@icon
def loan_agreement(c):      # a scroll with a wax seal
    c.r(3, 2, 12, 13, P, O); c.e(1, 1, 5, 4, Q, O); c.e(10, 11, 14, 14, Q, O); c.l([(5, 5), (10, 5)], D); c.l([(5, 7), (10, 7)], D); c.l([(5, 9), (8, 9)], D); c.e(8, 9, 12, 13, R, O); c.p(10, 11, H)
@icon
def disbursement_queue(c):  # a strongbox
    c.poly([(2, 6), (3, 3), (12, 3), (13, 6)], W, O); c.r(1, 6, 14, 13, W, O); c.r(1, 6, 14, 7, V); c.r(3, 6, 4, 13, T); c.r(11, 6, 12, 13, T); c.r(7, 8, 8, 10, H, O); c.p(7, 9, O)
@icon
def release_loan(c):        # a key
    c.e(1, 4, 7, 10, H, O); c.e(3, 6, 5, 8, None, O); c.r(7, 6, 14, 7, B); c.l([(7, 5), (14, 5)], O); c.l([(7, 8), (14, 8)], O); c.r(11, 8, 12, 10, B, O); c.r(13, 8, 14, 11, B, O); c.p(15, 6, O); c.p(15, 7, O)
@icon
def loan_accounts(c):       # passbooks on a shelf
    c.r(2, 3, 4, 12, R, O); c.r(5, 2, 7, 12, U, O); c.r(8, 4, 10, 12, G, O); c.poly([(11, 12), (11, 4), (13, 3), (14, 11)], B, O); c.r(0, 13, 15, 14, W, O); c.p(3, 5, H); c.p(6, 4, H); c.p(9, 6, H)
@icon
def loan_account(c):        # one passbook
    c.r(2, 2, 13, 14, U, O); c.r(2, 2, 4, 14, V, O); c.r(6, 4, 11, 7, P, O); c.l([(7, 5), (10, 5)], D); c.e(7, 9, 10, 12, H, O)
@icon
def post_payment(c):        # coins and a note
    c.r(1, 3, 11, 9, G, O); c.e(4, 4, 8, 8, P, O); c.e(7, 8, 14, 11, H, O); c.e(7, 10, 14, 13, H, O); c.e(7, 11, 14, 14, B, O); c.l([(9, 9), (12, 9)], D)
@icon
def reports(c):             # a ledger chart
    paper(c, 1, 1, 14, 14, False); c.r(3, 9, 4, 12, W); c.r(6, 6, 7, 12, B); c.r(9, 8, 10, 12, W); c.r(12, 4, 12, 12, R); c.l([(2, 13), (13, 13)], O)
@icon
def audit_log(c):           # a bound book with a seal
    c.r(2, 1, 13, 14, V, O); c.r(4, 1, 13, 13, P, O); c.l([(6, 4), (11, 4)], D); c.l([(6, 6), (11, 6)], D); c.e(7, 8, 11, 12, R, O); c.p(9, 10, H); c.r(2, 4, 3, 5, H); c.r(2, 10, 3, 11, H)
@icon
def users_roles(c):         # a ring of keys
    c.e(4, 1, 11, 8, None, O); c.e(5, 2, 10, 7, None, D); c.l([(4, 8), (2, 14)], O); c.r(1, 12, 3, 14, H, O); c.l([(8, 8), (8, 15)], O); c.r(7, 12, 9, 14, H, O); c.l([(11, 8), (13, 14)], O); c.r(12, 12, 14, 14, H, O)
@icon
def products_rules(c):      # a rule book with a marker
    c.r(2, 2, 13, 14, G, O); c.r(2, 2, 4, 14, V, O); c.l([(6, 5), (11, 5)], H); c.l([(6, 7), (11, 7)], H); c.l([(6, 9), (9, 9)], H); c.poly([(10, 9), (12, 9), (12, 15), (11, 14), (10, 15)], R, O)
@icon
def system(c):              # a signal lamp
    c.r(6, 0, 9, 1, T, O); c.poly([(4, 2), (11, 2), (12, 10), (3, 10)], H, O); c.r(6, 4, 9, 8, P); c.r(7, 5, 8, 8, R); c.r(3, 10, 12, 11, T, O); c.r(5, 12, 10, 14, T, O); c.p(1, 5, B); c.p(14, 5, B); c.p(2, 2, B); c.p(13, 2, B)
@icon
def notifications(c):       # a desk bell
    c.r(7, 1, 8, 3, H, O); c.poly([(2, 11), (3, 6), (5, 4), (10, 4), (12, 6), (13, 11)], H, O); c.l([(4, 7), (5, 5)], P); c.r(1, 11, 14, 12, B, O); c.r(3, 13, 12, 14, V, O)
@icon
def my_profile(c):          # a brass badge
    c.poly([(8, 0), (10, 4), (15, 5), (11, 9), (12, 14), (8, 12), (4, 14), (5, 9), (1, 5), (6, 4)], H, O); c.e(6, 5, 10, 9, B, O); c.p(8, 7, P)
@icon
def sign_in(c):             # saloon doors
    c.r(1, 1, 14, 14, V, O); c.r(3, 4, 7, 11, W, O); c.r(8, 4, 12, 11, W, O); c.l([(4, 6), (6, 6)], D); c.l([(9, 6), (11, 6)], D); c.p(6, 8, H); c.p(9, 8, H)
# ---- small marks used inside pages ----
@icon
def ok(c): c.e(1, 1, 14, 14, G, O); c.l([(4, 8), (7, 11)], P); c.l([(7, 11), (12, 5)], P); c.l([(4, 9), (7, 12)], P); c.l([(7, 10), (11, 5)], P)
@icon
def warn(c): c.poly([(8, 1), (15, 14), (1, 14)], H, O); c.r(7, 5, 8, 10, O); c.r(7, 12, 8, 12, O)
@icon
def stop(c): c.e(1, 1, 14, 14, R, O); c.l([(5, 5), (10, 10)], P); c.l([(10, 5), (5, 10)], P); c.l([(5, 6), (9, 10)], P); c.l([(6, 5), (10, 9)], P)
@icon
def clock(c): c.e(1, 1, 14, 14, H, O); c.e(3, 3, 12, 12, P, O); c.l([(8, 8), (8, 4)], O); c.l([(8, 8), (11, 9)], O); c.r(7, 0, 8, 1, B, O)
@icon
def lock(c): c.r(5, 2, 10, 8, None, O); c.r(6, 3, 9, 8, None, T); c.r(3, 7, 12, 14, H, O); c.r(7, 9, 8, 12, O)
@icon
def search(c): c.e(1, 1, 10, 10, H, O); c.e(3, 3, 8, 8, P, O); c.l([(10, 10), (14, 14)], O); c.l([(9, 10), (13, 14)], O); c.l([(10, 9), (14, 13)], V)
@icon
def peso(c): c.e(1, 1, 14, 14, H, O); c.e(2, 2, 13, 13, B, None); c.r(6, 4, 7, 12, O); c.r(7, 4, 10, 4, O); c.r(7, 8, 10, 8, O); c.r(10, 5, 10, 7, O); c.l([(4, 5), (11, 5)], O); c.l([(4, 7), (11, 7)], O)
ORDER = list(ICONS)
if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True); sheet = Image.new('RGBA', (16 * len(ORDER), 16))
    for i, n in enumerate(ORDER):
        c = C(); ICONS[n](c); sheet.paste(c.im, (i * 16, 0)); c.im.resize((32, 32), Image.NEAREST).save(os.path.join(OUT, n + '.png'), optimize=True)
    sheet.save(os.path.join(OUT, 'icons.png'), optimize=True)
    css = ['/* CALMS icons. Written by design/icons/icons.py; do not edit by hand.',
           '   Use: <i class="ic ic-decision"></i>. Add "ic-lg" for 32 px or "ic-xl" for 48 px. */',
           '.ic { display: inline-block; flex: none; width: 16px; height: 16px; vertical-align: -3px; background: url(../img/icons/icons.png) 0 0 / %dpx 16px no-repeat; image-rendering: pixelated; image-rendering: crisp-edges; --i: 0; background-position: calc(var(--i) * -16px) 0; }' % (16 * len(ORDER)),
           '.ic-lg { width: 32px; height: 32px; background-size: %dpx 32px; background-position: calc(var(--i) * -32px) 0; vertical-align: -8px; }' % (32 * len(ORDER)),
           '.ic-xl { width: 48px; height: 48px; background-size: %dpx 48px; background-position: calc(var(--i) * -48px) 0; vertical-align: -10px; }' % (48 * len(ORDER))]
    css += ['.ic-%s { --i: %d; }' % (n, i) for i, n in enumerate(ORDER)]
    css += ['/* where the icons sit: in each side-rail drawer, and before each page title */',
            '.nav a .ic { margin-right: 8px; filter: drop-shadow(1px 1px 0 rgba(0,0,0,.45)); }', '.nav a .plate { margin-right: auto; }',
            'h1.ich::before { content: ""; display: inline-block; flex: none; box-sizing: content-box; width: 32px; height: 32px; padding: 4px; margin-right: 12px; vertical-align: -5px; border: 2px solid #24130a; box-shadow: 2px 3px 0 rgba(36,19,10,.35); background: #f7e8c6 url(../img/icons/icons.png) calc(var(--i) * -32px) 0 / %dpx 32px no-repeat content-box; image-rendering: pixelated; image-rendering: crisp-edges; }' % (32 * len(ORDER)),
            '@media (max-width: 820px) { .nav a .ic { margin-right: 6px; } }']
    open(os.path.join(HERE, '..', '..', 'frontend', 'assets', 'css', 'icons.css'), 'w').write('\n'.join(css) + '\n'); print(len(ORDER), 'icons:', ' '.join(ORDER))
