"""The sound of the CALMS intro: an original frontier tune with Kuwa's hoots, wing beats,
the window breaking and the brand landing, timed to the intro in frontend/assets/js/index.js.

Everything is synthesised here (no samples, no borrowed melodies), so the group owns it.
Run:  python design/sound/intro_sound.py     -> frontend/assets/audio/intro.mp3 (needs ffmpeg; instruments are in synth.py)

Timeline of the intro (milliseconds), which the sounds follow:
  0      title card "GR8 Lending Company presents"
  2500   eyes in the dark (hoot)            3800  the hat shows         4550  he darts away
  5000   second peek, closer               6600  curtains open on the town (wind, tumbleweed)
  7900   his shadow crosses the sun        9500  shadow sweeps the rooftops
  10700  he banks round                    11700 he dives               12650 last plunge
  13170  IMPACT: the window cracks         13550 the brand slams down   14350 glint
  14450  the glass heals                   15400 the sign-in card rises
  16400  he lands on the card              16820 shakes off the dust     ~17200 tips his hat
"""
from synth import *

LEN = 19.6
BPM = 82.0; BEAT = 60.0 / BPM          # 0.7317 s: the impact (13.17 s) falls exactly on beat 18
T = Track(LEN)
add = T.add
OWL = load_sample("owl-hoot.mp3")   # Kuwa's voice: the recording in design/sound/source
WING = load_sample("wings.mp3")     # his wings: the recording in design/sound/source

# ---------------- the score ----------------
B = lambda b: b * BEAT                       # beat number -> seconds

# wind under the title card, and the empty street
add(wind(3.0), 0.0, 0.10, -0.2, 0.1)

# bar 1 (beats 2-6): a single guitar and the first hoot in the dark
for k, n_ in enumerate(["A2", "E3", "A3", "C4", "E3", "A3"]):
    add(pluck(note(n_), 2.0, 0.4), B(2 + k * 0.5), 0.32, -0.25, 0.3)
add(cut(OWL, 0.85, 3.45, 0.02, 0.3), 2.55, 0.7, 0.15, 0.25)      # Kuwa's call from the dark: hoo, h'hoo-hoo, HOOO, hoo
add(pluck(note("E2"), 2.5, 0.8), 3.82, 0.35, -0.1, 0.35)          # the hat: a low twang
add(whoosh(0.35, 500, 2500), 4.5, 0.22, -0.6, 0.15)                # he darts off left

# bar 2 (beats 6-10): the whistle enters
melody1 = [("E4", 6, 1.0), ("A4", 7, 1.5), ("B4", 8.5, 0.5), ("C5", 9, 1.0)]
for nm, b, d in melody1:
    add(whistle(note(nm) * 0.985, note(nm), B(d) * 0.98), B(b), 0.20, 0.1, 0.55)
add(cut(OWL, 2.0, 2.6, 0.02, 0.15), 5.3, 0.6, 0.35, 0.25)          # second peek, closer: one strong HOOO

# guitar keeps time from here (A minor, then down to G and F, the old frontier walk)
chords = {6: ("A2", "E3", "A3", "C4"), 8: ("A2", "E3", "A3", "C4"), 10: ("G2", "D3", "G3", "B3"),
          12: ("F2", "C3", "F3", "A3"), 14: ("E2", "B2", "E3", "G#3")}
for start, ch in chords.items():
    for k in range(4):
        add(pluck(note(ch[k % 4]), 1.6, 0.35), B(start + k * 0.5), 0.15, -0.3, 0.3)
    add(bass(note(ch[0]) / 2 * 2), B(start), 0.35, 0, 0.1)

# bar 3 (beats 10-14): the town opens: wind gust, tumbleweed, hoof-like woodblocks
add(wind(4.5), 6.5, 0.16, 0.0, 0.2)
add(rustle(6.5), 6.6, 0.18, -0.5, 0.1)
for k in range(16):                                   # clip-clop on the eighth notes
    add(woodblock(1150 if k % 2 == 0 else 880), B(10 + k * 0.5), 0.07 if k % 2 else 0.10, 0.4, 0.2)
melody2 = [("C5", 10, 0.5), ("B4", 10.5, 0.5), ("A4", 11, 1.0), ("G4", 12, 0.5), ("E4", 12.5, 1.5)]
for nm, b, d in melody2:
    add(whistle(note(nm) * 0.99, note(nm), B(d) * 0.97), B(b), 0.19, 0.1, 0.55)
# the shadow across the sun: three slow, far-off wing beats
for k in range(3): add(flap(0.18, 0.5), 8.0 + k * 0.42, 0.35, 0.3, 0.4)
# the shadow over the rooftops: a passing whoosh with two beats in it
add(whoosh(1.1, 250, 1800, rise=False), 9.5, 0.28, 0.6, 0.2)
for k in range(2): add(flap(0.2, 0.8), 9.7 + k * 0.4, 0.45, 0.2, 0.3)

# bar 4 (beats 14-18): he banks and dives; the music tightens
add(tremolo_strings(note("E2"), note("E3"), B(4)), B(14), 0.16, 0.0, 0.3)
for k in range(16):                                   # a snare roll building to the hit
    add(snare(), B(14) + k * B(4) / 16 * (1 - k / 40), 0.03 + 0.12 * (k / 16) ** 2, 0.0, 0.15)
add(cut(WING, 1.2, 2.3, 0.2, 0.1), 10.6, 0.55, -0.3, 0.25)                             # banking round
add(cut(WING, 4.75, 5.9, 0.02, 0.3), 11.6, 0.6, 0.0, 0.2)                                # diving, hard
add(whoosh(1.5, 300, 5000), 11.65, 0.45, 0.0, 0.2)                                       # the plunge

# beat 18: IMPACT. The window breaks under him.
add(glass_break(), 13.17, 1.1, 0.0, 0.35)
add(thump(0.5), 13.17, 1.2, 0.0, 0.1)
add(boom(1.4, 110, 45), 13.17, 0.55, 0.0, 0.2)

# beat 18.5: the brand slams down: horns, a drum, a bell
add(boom(2.2, 80, 36), 13.55, 0.95, 0.0, 0.3)
add(brass([note("A3"), note("C#4"), note("E4"), note("A4")], 2.6), 13.55, 0.5, 0.0, 0.45)
add(brass([note("A2"), note("E3")], 2.6), 13.55, 0.35, 0.0, 0.3)
add(bell(note("A4"), 3.5), 13.6, 0.22, 0.2, 0.6)
add(shimmer(0.8), 14.35, 0.25, 0.3, 0.6)                          # the glint
add(shimmer(0.6, up=False), 14.5, 0.18, -0.3, 0.6)                # the glass heals

# beats 21-25: the card rises; the whistle answers softly and the guitar settles
add(whoosh(0.6, 400, 1500), 15.35, 0.15, 0.0, 0.2)
for nm, b, d in [("E4", 21.0, 0.5), ("G4", 21.5, 0.5), ("A4", 22.0, 2.5)]:
    add(whistle(note(nm) * 0.99, note(nm), B(d) * 0.97), B(b), 0.17, 0.1, 0.6)
for k, n_ in enumerate(["A2", "E3", "A3", "C4", "E4"]):           # a slow strum
    add(pluck(note(n_), 3.0, 0.45), B(22) + k * 0.045, 0.24, -0.25 + k * 0.1, 0.35)
add(bass(note("A1") * 2, 1.5), B(22), 0.3, 0, 0.1)
# he lands, shakes off the dust, tips his hat
add(cut(WING, 1.85, 2.32, 0.05, 0.02), 16.0, 0.5, 0.1, 0.2)                            # he brakes onto the card
add(thump(0.25), 16.82, 0.35, 0.1, 0.1)
add(cut(WING, 2.55, 3.25, 0.02, 0.2), 16.95, 0.7, 0.15, 0.1)                           # a ruffle
add(cut(OWL, 2.68, 3.5, 0.02, 0.25), 17.5, 0.45, 0.15, 0.25)      # a friendly "hoo" as he tips his hat

# ---------------- mix ----------------
tt = np.arange(T.n) / SR
duck = 1 - 0.65 * np.clip((tt - 12.85) / 0.2, 0, 1) * (tt < 13.16)   # a breath of near-silence before the window breaks
write_mp3(T.render(fade_out=1.2, gain_curve=duck), "intro")
