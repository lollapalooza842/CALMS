"""Sounds of the town around the sign-in card, all original and synthesised (instruments in synth.py).
Run:  python design/sound/town_sfx.py   -> frontend/assets/audio/*.mp3

  piano     the saloon's honky-tonk piano, heard through the wall. Same key, chords and tempo as the
            sign-in music (A minor, 82 bpm, 8 bars) and exactly as long, so the page can lay it over the
            music in step; it only gets louder when your pointer goes near the saloon.
  train     a steam train far off on the horizon: chuffing, rail clicks and its whistle, passing right to left
  noon      the church bell striking at high noon (the duel is about to start)
  duel      the stand-off: a lone whistle over low strings
  bang      a gunshot down the street, echoing off the buildings
  spur      a spur's jingle (a footstep of the cowboys)
  paper     a folded note slid across the counter (Kuwa's hint after three wrong passwords)
  swap      Kuwa's hat flipping off and a new one landing
"""
from synth import *

BPM = 82.0; BEAT = 60.0 / BPM
B = lambda b: b * BEAT

# ---------------- the saloon piano ----------------
def piano(f, sec=1.2, vel=1.0):
    """An old upright: bright hammer, two strings a little out of tune with each other."""
    n = int(sec * SR); t = np.arange(n) / SR; out = np.zeros(n)
    for det in (-0.0045, 0.0045):
        for k in range(1, 9):
            fk = f * k * (1 + 0.0004 * k * k) * (1 + det)
            if fk > 9000: break
            out += np.sin(2 * np.pi * fk * t) * (1 / k ** 1.25) * np.exp(-t * (2.2 + 1.4 * k)) * (1 + 0.4 * vel * (k > 3))
    click = hp(noise(0.012), 2500) * np.exp(-np.arange(int(0.012 * SR)) / SR * 400) * 0.25
    out[:len(click)] += click
    return out * np.clip(t / 0.002, 0, 1) * vel

P = Track(B(32), loop=True)
CH = [("A", "A2", "E2", ("A3", "C4", "E4")), ("A", "A2", "E2", ("A3", "C4", "E4")), ("G", "G2", "D2", ("G3", "B3", "D4")), ("G", "G2", "D2", ("G3", "B3", "F4")),
      ("F", "F2", "C2", ("F3", "A3", "C4")), ("F", "F2", "C2", ("F3", "A3", "C4")), ("E", "E2", "B1", ("E3", "G#3", "B3")), ("E", "E2", "B1", ("E3", "G#3", "D4"))]
sw = lambda b: b + (0.08 if abs(b * 2 - round(b * 2)) < 1e-6 and (b * 2) % 2 == 1 else 0)   # swing the off-beat eighths
for bar, (_, root, fifth, chord) in enumerate(CH):
    b0 = bar * 4
    P.add(piano(note(root), 0.9, 0.9), B(b0), 0.55, -0.2, 0.3); P.add(piano(note(fifth), 0.9, 0.8), B(b0 + 2), 0.5, -0.2, 0.3)   # stride bass
    for b in (1, 3):
        for k, nm in enumerate(chord): P.add(piano(note(nm), 0.5, 0.7), B(b0 + b) + k * 0.004, 0.32, 0.0, 0.3)          # the chords
MEL = [[(0, "E5", .5), (.5, "A5", .5), (1.5, "C6", .5), (2, "B5", .5), (2.5, "A5", 1)],
       [(0, "E5", .5), (.5, "G5", .5), (1, "A5", 1), (2.5, "C5", .5), (3, "E5", 1)],
       [(0, "D5", .5), (.5, "G5", .5), (1.5, "B5", .5), (2, "A5", .5), (2.5, "G5", 1)],
       [(0, "D5", .5), (.5, "F5", .5), (1, "G5", 1), (2.5, "B4", .5), (3, "D5", 1)],
       [(0, "C5", .5), (.5, "F5", .5), (1.5, "A5", .5), (2, "G5", .5), (2.5, "F5", 1)],
       [(0, "A5", .5), (.5, "C6", .5), (1, "A5", .5), (1.5, "F5", .5), (2, "C5", 1), (3, "E5", .5), (3.5, "F5", .5)],
       [(0, "G#5", 1), (1, "B5", .5), (1.5, "E6", .5), (2, "D6", .5), (2.5, "B5", 1)],
       [(0, "G#5", .5), (.5, "B5", .5), (1, "E5", 1), (2, "D5", .5), (3, "B4", .5), (3.5, "D5", .5)]]
for bar, notes in enumerate(MEL):
    for b, nm, d in notes:
        P.add(piano(note(nm), 0.4 + d * 0.6, 0.9), B(sw(bar * 4 + b)), 0.42, 0.15, 0.35)
        if bar % 2 == 1 and b == 0: P.add(piano(note(nm) / 2, 0.6, 0.6), B(bar * 4 + b), 0.2, 0.15, 0.35)   # octave doubling now and then
pcm = P.render(verb=0.5, peak=0.8)
pf = pcm.astype(float) / 32767; pf = np.stack([lp(pf[:, 0], 2400), lp(pf[:, 1], 2400)], 1)             # heard through the saloon wall
write_mp3((pf / np.abs(pf).max() * 0.8 * 32767).astype(np.int16), "piano", kbps=96)

# ---------------- the train ----------------
TR = Track(24.0)
tt = 0.0
k = 0
while tt < 24:
    pan = 0.75 - 1.5 * tt / 24                                 # right to left
    acc = 1.0 if k % 4 == 0 else 0.7
    ch = bp(noise(0.16), 300, 1800) * np.exp(-np.arange(int(0.16 * SR)) / SR * 22) * acc
    TR.add(ch, tt, 0.5, pan, 0.4)
    tt += 0.3; k += 1
for c0 in np.arange(0.4, 24, 1.45):                           # the rail joints: clickety-clack
    for dt in (0, 0.11):
        TR.add(woodblock(900, 0.04) * 0.5, c0 + dt, 0.25, 0.75 - 1.5 * (c0 / 24), 0.3)
def steam_whistle(sec):
    n = int(sec * SR); t = np.arange(n) / SR
    rise = 1 - 0.06 * np.exp(-t * 9)
    tones = sum(np.sin(2 * np.pi * np.cumsum(np.full(n, f) * rise) / SR) * a for f, a in ((466, 1), (554, .8), (698, .7)))
    breath = bp(noise(sec), 400, 2200) * 0.25
    return (tones * 0.6 + breath) * env(n, 0.06, sec, 1, 0.25)
TR.add(steam_whistle(1.6), 5.0, 0.9, 0.3, 0.6); TR.add(steam_whistle(0.6), 6.9, 0.8, 0.25, 0.6); TR.add(steam_whistle(1.2), 15.5, 0.7, -0.3, 0.6)
tt_ = np.arange(TR.n) / SR
fade = np.clip(tt_ / 5, 0, 1) * np.clip((24 - tt_) / 6, 0, 1)
pcm = TR.render(verb=0.9, peak=0.7, gain_curve=fade)
pf = pcm.astype(float) / 32767; pf = np.stack([lp(pf[:, 0], 3200), lp(pf[:, 1], 3200)], 1)   # far away
write_mp3((pf / np.abs(pf).max() * 0.7 * 32767).astype(np.int16), "train", kbps=80)

# ---------------- high noon ----------------
N = Track(5.0)
for i in range(3): N.add(bell(note("E3") * 1.0, 3.0), i * 1.25, 0.6, 0.2, 0.8); N.add(bell(note("B3"), 2.0), i * 1.25, 0.15, 0.2, 0.8)
write_mp3(N.render(verb=0.9, peak=0.75, fade_out=1.0), "noon", kbps=80)

D = Track(5.5)
D.add(tremolo_strings(note("E2"), note("E2"), 5.0), 0.0, 0.25, 0, 0.4)
for nm0, nm1, at, d in [("B4", "B4", 0.2, 1.3), ("B4", "E5", 1.55, 0.9), ("D5", "D5", 2.5, 0.45), ("B4", "B4", 3.0, 1.9)]:
    D.add(whistle(note(nm0), note(nm1), d, glide=0.25 if nm0 != nm1 else 0.08), at, 0.35, 0.1, 0.7)
D.add(pluck(note("E2"), 3.0, 0.3), 0.2, 0.4, -0.3, 0.4)
write_mp3(D.render(verb=0.7, peak=0.75, fade_out=1.2), "duel", kbps=80)

G = Track(1.8)
shot = hp(noise(0.05), 900) * np.exp(-np.arange(int(0.05 * SR)) / SR * 70)
G.add(shot, 0, 1.0, -0.1, 0.5); G.add(thump(0.3), 0, 0.6, 0, 0.3)
G.add(lp(shot, 2500), 0.24, 0.35, 0.5, 0.8); G.add(lp(shot, 1500), 0.52, 0.18, -0.5, 0.8)     # echoes off the buildings
write_mp3(G.render(verb=0.9, peak=0.8), "bang", kbps=80, mono=True)

# ---------------- small things ----------------
def clink(f, sec=0.25):
    n = int(sec * SR); t = np.arange(n) / SR
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for m, a, d in ((1, 1, 18), (2.4, .6, 26), (3.9, .3, 34)))
S_ = Track(0.35); S_.add(clink(3300), 0, 0.6, 0, 0.2); S_.add(clink(4100), 0.05, 0.4, 0, 0.2)
write_mp3(S_.render(verb=0.2, peak=0.6), "spur", kbps=64, mono=True)

n = int(0.6 * SR); t = np.arange(n) / SR
slide = bp(noise(0.6), 1500, 6500) * np.sin(np.pi * np.clip(t / 0.5, 0, 1)) ** 1.5 * 0.6
flick = hp(noise(0.03), 2000) * np.exp(-np.arange(int(0.03 * SR)) / SR * 120); i = int(0.48 * SR); slide[i:i + len(flick)] += flick
PA = Track(0.65); PA.add(slide, 0, 1.0, 0, 0.1); write_mp3(PA.render(verb=0.15, peak=0.6), "paper", kbps=64, mono=True)

SW_ = Track(0.5); SW_.add(whoosh(0.25, 600, 3000), 0, 0.7, 0, 0.1); SW_.add(woodblock(1700, 0.06), 0.24, 0.6, 0, 0.1)
write_mp3(SW_.render(verb=0.15, peak=0.65), "swap", kbps=64, mono=True)
