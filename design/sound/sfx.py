"""The sign-in screen's sounds, all original and synthesised (instruments in synth.py).
Run:  python design/sound/sfx.py   -> frontend/assets/audio/*.mp3

  signin-loop  a quiet night at the bank: crickets, a slow guitar, a whistle now and then.
               Exactly 8 bars at 82 bpm, so it loops without a seam; picks up where the intro ends.
  admitted     signing in: the ADMITTED stamp, coins into the till, a two-note whistle.
  click        a wooden tick for buttons      toggle  a lighter tick (Show password, checkboxes)
  error        two low knocks on the counter  hoot    Kuwa's hoot when you click him (from the recording)
  wings, takeoff, landing   Kuwa flying in the walk into the bank, in My Queue, and on signing out
  gust, burst  Kuwa blowing the cursor away on the sign-in screen
  creak, snort the saloon's swing doors and the horse outside the bank
  rain, dust   weather loops (light rain; a dust storm), 8 s each, seamless
  lasso        a rope whirled, thrown and pulled tight (the sign-in card is lassoed in)
"""
from synth import *

BPM = 82.0; BEAT = 60.0 / BPM
B = lambda b: b * BEAT

def cricket(sec=0.35, f=4600):
    """A cricket's chirp: three quick pulses of a high tone."""
    n = int(sec * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for k in range(3):
        a = k * 0.045; m = (t >= a) & (t < a + 0.03)
        out += np.sin(2 * np.pi * f * t) * m * np.sin(np.pi * np.clip((t - a) / 0.03, 0, 1))
    return out

def coin(f=2600, sec=0.6):
    n = int(sec * SR); t = np.arange(n) / SR
    parts = [(1, 1, 9), (1.48, .6, 12), (2.31, .4, 16), (3.1, .25, 22)]
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for m, a, d in parts) * np.clip(t / 0.002, 0, 1)

# ---------------- the sign-in loop ----------------
LOOP = Track(B(32), loop=True)
prog = [("A2", "E3", "A3", "C4"), ("A2", "E3", "A3", "C4"), ("G2", "D3", "G3", "B3"), ("G2", "D3", "G3", "B3"),
        ("F2", "C3", "F3", "A3"), ("F2", "C3", "F3", "A3"), ("E2", "B2", "E3", "G#3"), ("E2", "B2", "E3", "G#3")]
pick = [0, 2, 1, 3, 2, 1]                                  # a lazy fingerpicking pattern, 6 notes a bar
for bar, ch in enumerate(prog):
    LOOP.add(bass(note(ch[0]), 1.2), B(bar * 4), 0.30, 0, 0.1)
    for k, w in enumerate(pick):
        LOOP.add(pluck(note(ch[w]), 1.8, 0.3), B(bar * 4) + k * B(4) / 6, 0.26 + (0.05 if k == 0 else 0), -0.25, 0.35)
# the whistle only in the second half, so it does not grow tiresome
for nm, b, d in [("E4", 16, 1.0), ("A4", 17, 1.5), ("G4", 18.5, 0.5), ("F4", 20, 1.5), ("E4", 21.5, 0.5),
                 ("D4", 24, 1.0), ("E4", 25, 2.0), ("B3", 28, 1.0), ("E4", 29, 2.5)]:
    LOOP.add(whistle(note(nm) * 0.99, note(nm), B(d) * 0.96), B(b), 0.06, 0.15, 0.6)
# night: crickets here and there, a breath of wind
t = 0.3
while t < B(32):
    LOOP.add(cricket(f=rng.uniform(4300, 4900)), t, rng.uniform(0.015, 0.035), rng.uniform(-0.8, 0.8), 0.2)
    t += rng.uniform(0.5, 1.4)
LOOP.add(wind(B(32)), 0, 0.06, 0, 0.1)
write_mp3(LOOP.render(verb=0.6, peak=0.8), "signin-loop", kbps=112)

# ---------------- signing in ----------------
A = Track(2.2)
A.add(thump(0.35), 0.0, 1.0, 0, 0.1)                                   # the stamp comes down
A.add(hp(noise(0.08), 1200) * np.exp(-np.arange(int(0.08 * SR)) / SR * 60), 0.0, 0.35, 0, 0.1)   # on paper
A.add(coin(2650), 0.20, 0.35, -0.2, 0.3); A.add(coin(3050), 0.30, 0.30, 0.2, 0.3)   # coins into the till
A.add(whistle(note("E5") * 0.99, note("E5"), 0.17), 0.45, 0.42, 0.1, 0.5)          # and a whistle: E up to A
A.add(whistle(note("E5"), note("A5"), 0.75, glide=0.1), 0.64, 0.45, 0.1, 0.5)
write_mp3(A.render(verb=0.5, fade_out=0.4, peak=0.85), "admitted", kbps=96, mono=True)

# ---------------- small sounds ----------------
def short(sig, name, sec, peak=0.8, verb=0.15):
    t_ = Track(sec); t_.add(sig, 0.0, 1.0, 0, 0.2); write_mp3(t_.render(verb=verb, peak=peak), name, kbps=64, mono=True)

short(lp(woodblock(1350, 0.07), 5000), "click", 0.12, 0.6)
short(woodblock(2100, 0.05), "toggle", 0.08, 0.45)
err = np.zeros(int(0.4 * SR)); k1 = woodblock(430, 0.14); k2 = woodblock(330, 0.18)
err[:len(k1)] += k1; err[int(0.13 * SR):int(0.13 * SR) + len(k2)] += k2
short(lp(err, 2500), "error", 0.4, 0.7)
OWL = load_sample("owl-hoot.mp3")
short(cut(OWL, 2.0, 3.6, 0.02, 0.35), "hoot", 1.6, 0.8, verb=0.1)    # click Kuwa: HOOO, hoo

# wings, for the walk into the bank, the arrival in My Queue and signing out (assets/js/entrance.js)
# from the recording in design/sound/source/wings.mp3: a soft run that stops short (a landing) and a strong run (flight)
WING = load_sample("wings.mp3")
short(cut(WING, 4.85, 6.35, 0.06, 0.35), "wings", 1.5, 0.75, verb=0.08)            # flying past
short(cut(WING, 4.72, 5.55, 0.01, 0.25), "takeoff", 0.85, 0.8, verb=0.08)          # the first hard beats off the perch
land = np.zeros(int(1.3 * SR))
a = cut(WING, 1.70, 2.32, 0.05, 0.02); land[:len(a)] += a                          # the flare, braking
th = thump(0.25) * 0.45; wb = woodblock(320, 0.12) * 0.25; th[:len(wb)] += wb
i = int(0.6 * SR); land[i:i + len(th)] += th                                       # feet on the wooden rail
b = cut(WING, 2.55, 3.25, 0.02, 0.2) * 1.6; i = int(0.75 * SR); land[i:i + len(b)] += b[:len(land) - i]   # a ruffle to settle
short(land, "landing", 1.3, 0.8, verb=0.08)

# the sign-in screen: Kuwa blowing the cursor away (a soft puff per wing beat) and his big burst
gst = whoosh(0.45, 500, 2400) * 0.8; w1 = cut(WING, 5.0, 5.25, 0.02, 0.15); gst[:len(w1)] += w1 * 0.35
short(gst, "gust", 0.5, 0.6, verb=0.1)
bst = whoosh(0.9, 250, 4200) * 1.2; w2 = cut(WING, 4.72, 5.35, 0.005, 0.25); bst[:len(w2)] += w2 * 0.9
short(bst, "burst", 1.0, 0.85, verb=0.15)


# ---------------- the town ----------------
def creak(sec=0.7, f0=230, f1=340):
    """Dry hinges: a rasping tone whose pitch wanders, made of tiny stick-slip clicks."""
    n = int(sec * SR); t = np.arange(n) / SR
    f = f0 + (f1 - f0) * np.sin(np.pi * t / sec) + 25 * np.sin(2 * np.pi * 3.5 * t)
    ph = np.cumsum(f) / SR
    clicks = (np.sin(2 * np.pi * ph) > 0.92).astype(float) * (0.6 + 0.4 * rng.random(n))
    body = fftconvolve(clicks, np.exp(-np.arange(200) / 25.0) * np.sin(2 * np.pi * 1300 * np.arange(200) / SR))[:n]
    return bp(body, 400, 4000) * np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 0.6
c1 = creak(0.6, 220, 330); c2 = creak(0.45, 300, 240) * 0.7; door = np.zeros(int(1.5 * SR))
door[:len(c1)] += c1; i = int(0.75 * SR); door[i:i + len(c2)] += c2
for k, tt in enumerate((1.25, 1.36)): w_ = woodblock(260 + 40 * k, 0.08) * 0.4; i = int(tt * SR); door[i:i + len(w_)] += w_   # the flaps knock as they settle
short(door, "creak", 1.5, 0.6, verb=0.25)

def snort(sec=0.55):
    n = int(sec * SR); t = np.arange(n) / SR
    puff = bp(noise(sec), 250, 1400) * (np.exp(-((t - 0.08) / 0.05) ** 2) + 0.7 * np.exp(-((t - 0.26) / 0.07) ** 2))
    flutter = (1 + 0.6 * np.sin(2 * np.pi * 28 * t)) * np.exp(-((t - 0.26) / 0.08) ** 2)       # lips flapping
    return puff + bp(noise(sec), 120, 600) * flutter * 0.6
short(snort(), "snort", 0.6, 0.5, verb=0.2)

# ---------------- weather loops (8 s, seamless) ----------------
R = Track(8.0, loop=True)
R.add(lp(hp(noise(8.0), 900), 7000) * 0.35, 0, 1.0, 0, 0.2)                     # the hiss of light rain
for _ in range(260):                                                            # drops on the tin roofs and the boardwalk
    f = rng.uniform(1800, 5200); d = rng.uniform(0.015, 0.05); tt = np.arange(int(d * SR)) / SR
    drop = np.sin(2 * np.pi * f * tt * (1 - tt * 4)) * np.exp(-tt * 140)
    R.add(drop, rng.uniform(0, 8), rng.uniform(0.05, 0.22), rng.uniform(-0.9, 0.9), 0.3)
write_mp3(R.render(verb=0.4, peak=0.7), "rain", kbps=96)
D = Track(8.0, loop=True)
D.add(wind(8.0) * 1.0, 0, 1.0, -0.2, 0.2); D.add(wind(8.0) * 0.7, 4.0, 1.0, 0.3, 0.2)   # two gusting winds, overlapped round the loop
D.add(bp(noise(8.0), 2500, 7000) * 0.08, 0, 1.0, 0, 0.1)                          # sand hissing past
write_mp3(D.render(verb=0.3, peak=0.7), "dust", kbps=96)

# ---------------- the lasso ----------------
L = np.zeros(int(1.6 * SR))
for k in range(3):                                                              # whirled overhead
    w_ = whoosh(0.28, 400, 1800); i = int(k * 0.24 * SR); L[i:i + len(w_)] += w_ * (0.5 + 0.15 * k)
w_ = whoosh(0.35, 600, 3500, rise=True); i = int(0.72 * SR); L[i:i + len(w_)] += w_ * 0.9   # thrown
i = int(1.05 * SR); snap = hp(noise(0.05), 1500) * np.exp(-np.arange(int(0.05 * SR)) / SR * 90); L[i:i + len(snap)] += snap * 1.2   # pulled tight
th = thump(0.25) * 0.4; L[i:i + len(th)] += th
short(L, "lasso", 1.6, 0.75, verb=0.15)
