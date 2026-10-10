"""Shared instruments and sound effects for CALMS (intro, sign-in music, clicks).
Everything is synthesised; nothing is sampled or borrowed. Used by intro_sound.py and sfx.py."""
import os, subprocess, wave
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 44100
rng = np.random.default_rng(2026)


def t_of(n): return int(n * SR)
def note(name):
    names = {"C": -9, "C#": -8, "D": -7, "D#": -6, "E": -5, "F": -4, "F#": -3, "G": -2, "G#": -1, "A": 0, "A#": 1, "B": 2}
    p, o = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[p] + 12 * (o - 4)) / 12)

def env(n, a, d, s_level=0.0, r=0.0, total=None):
    """attack/decay/sustain/release envelope in seconds."""
    total = total or n / SR
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), s_level + (1 - s_level) * np.exp(-(t - a) / max(d, 1e-4)))
    if r: e *= np.clip((total - t) / r, 0, 1)
    return e

def lp(x, f, order=2): return sosfilt(butter(order, f, "low", fs=SR, output="sos"), x)
def hp(x, f, order=2): return sosfilt(butter(order, f, "high", fs=SR, output="sos"), x)
def bp(x, lo, hi, order=2): return sosfilt(butter(order, [lo, hi], "band", fs=SR, output="sos"), x)
def noise(sec): return rng.standard_normal(int(sec * SR))

# ---------------- instruments ----------------
def pluck(f, sec=1.6, bright=0.5):
    """Karplus-Strong string: a dry frontier guitar."""
    n = int(sec * SR); p = max(2, int(SR / f))
    buf = rng.uniform(-1, 1, p) * (0.6 + 0.4 * bright)
    buf = lp(buf, min(8000, 1500 + 6000 * bright), 1)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % p]
        buf[i % p] = 0.4985 * (buf[i % p] + buf[(i + 1) % p])
    out += 0.15 * np.sin(2 * np.pi * f * np.arange(n) / SR) * np.exp(-np.arange(n) / SR * 3)  # body
    return out * env(n, 0.002, sec * 0.6)

def whistle(f0, f1, sec, vib=5.6, depth=0.012, glide=0.08):
    """A lone whistle: sine, a breath of noise, vibrato that grows as the note is held."""
    n = int(sec * SR); t = np.arange(n) / SR
    g = np.clip(t / glide, 0, 1); f = f0 + (f1 - f0) * (g * g * (3 - 2 * g))
    v = 1 + depth * np.clip(t / 0.35, 0, 1) * np.sin(2 * np.pi * vib * t)
    ph = 2 * np.pi * np.cumsum(f * v) / SR
    tone = np.sin(ph) + 0.08 * np.sin(2 * ph)
    breath = bp(noise(sec), 1800, 4200) * 0.05
    return (tone + breath) * env(n, 0.05, 99, 1.0, min(0.12, sec * 0.4), sec)

def bass(f, sec=0.6):
    n = int(sec * SR); t = np.arange(n) / SR
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return lp(s, 900) * env(n, 0.005, 0.25)

def woodblock(f=1100, sec=0.09):
    n = int(sec * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * f * t) * 0.7 + bp(noise(sec), f * 0.8, f * 1.6) * 0.5) * np.exp(-t * 55)

def snare(sec=0.18):
    n = int(sec * SR); t = np.arange(n) / SR
    return (hp(noise(sec), 1500) * 0.7 + np.sin(2 * np.pi * 190 * t) * 0.5) * np.exp(-t * 28)

def boom(sec=1.8, f0=90, f1=38):
    n = int(sec * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 9)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + lp(noise(sec), 200) * 0.3 * np.exp(-t * 20)) * np.exp(-t * 2.4)

def bell(f, sec=3.0):
    n = int(sec * SR); t = np.arange(n) / SR
    parts = [(1, 1, 1.2), (2.0, .5, 1.8), (2.76, .35, 2.6), (5.4, .18, 4), (8.93, .08, 6)]
    return sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * d) for m, a, d in parts) * env(n, 0.002, 99, 1)

def brass(freqs, sec=2.4):
    """A stab of horns: detuned saws through a filter that opens and closes."""
    n = int(sec * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        for d in (-0.4, 0, 0.45):
            s += 2 * ((t * (f + d)) % 1) - 1
    cut = 600 + 3400 * np.exp(-t * 2.5)
    out = np.zeros(n); blk = 2048
    for i in range(0, n, blk):                       # time-varying low-pass, block by block
        out[i:i + blk] = lp(s[i:i + blk], cut[i])
    return out / len(freqs) / 3 * env(n, 0.02, 1.1, 0.25, 0.6, sec)

def tremolo_strings(f0, f1, sec):
    n = int(sec * SR); t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / sec)
    ph = np.cumsum(f) / SR
    s = sum((2 * ((ph * k) % 1) - 1) / k for k in (1, 1.003, 0.5))
    s = lp(s, 1600) * (0.6 + 0.4 * np.sin(2 * np.pi * 11 * t) ** 2)
    return s * np.clip(t / sec, 0, 1) ** 1.6

# ---------------- sound effects ----------------
def hoot(f=340, sec=0.28, drop=0.0, loud=1.0):
    """One owl note, after the great horned owl: low (300-400 Hz), short, steady and soft.
    What keeps it from sounding like a moan: no long slide, no wobble, a breathy "h" at the start
    and a clean stop. drop lowers the pitch slightly over the note (a few percent at most)."""
    n = int(sec * SR); t = np.arange(n) / SR
    f_t = f * (1 + 0.025 * np.clip(t / 0.03, 0, 1)) * (1 - drop * (t / sec))     # a tiny lift as the note starts, then steady
    ph = 2 * np.pi * np.cumsum(f_t) / SR
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph) + 0.07 * np.sin(3 * ph)
    tone = lp(tone, 1100)                                                         # the dark "oo" vowel
    e = np.clip(t / 0.025, 0, 1) * np.clip((sec - t) / 0.05, 0, 1)                # quick, soft start; clean stop
    e *= 1 - 0.15 * (t / sec)                                                     # a little softer by the end
    h = bp(noise(min(sec, 0.06)), 500, 2000) * np.exp(-np.arange(int(min(sec, 0.06) * SR)) / SR * 60) * 0.35
    out = tone * e; out[:len(h)] += h                                             # the breathy "h" of "hoo"
    return out * loud * 0.8

def owl_call(f=340, pattern=((0.00, 0.30, 0.9), (0.46, 0.11, 0.7), (0.60, 0.34, 1.0), (1.18, 0.26, 0.85), (1.58, 0.28, 0.8))):
    """Kuwa's call in the rhythm of a great horned owl: "hoo ... h'hoo-HOOO ... hoo ... hoo".
    pattern = (start, length, loudness) of each note; the last note sits a touch lower."""
    total = max(a + b for a, b, _ in pattern) + 0.3
    out = np.zeros(int(total * SR))
    for k, (a, b, g) in enumerate(pattern):
        last = k == len(pattern) - 1
        h = hoot(f * (0.97 if last else 1.0), b, 0.02 if last else 0.0, g)
        i = int(a * SR); out[i:i + len(h)] += h
    return out

def flap(sec=0.16, power=1.0):
    """One wing beat: a soft thump of air."""
    n = int(sec * SR); t = np.arange(n) / SR
    body = lp(noise(sec), 700 + 500 * power) * np.exp(-((t - 0.035) / 0.03) ** 2)
    feather = bp(noise(sec), 1500, 5000) * 0.25 * np.exp(-((t - 0.05) / 0.04) ** 2)
    return (body + feather) * power

def whoosh(sec, f_lo=300, f_hi=3000, rise=True):
    n = int(sec * SR); t = np.arange(n) / SR; x = noise(sec); out = np.zeros(n); blk = 1024
    for i in range(0, n, blk):
        k = i / n; c = f_lo * (f_hi / f_lo) ** (k if rise else 1 - k)
        out[i:i + blk] = bp(x[i:i + blk], c * 0.7, min(c * 1.4, SR / 2 - 100))
    shape = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 1.5
    return out * shape

def wind(sec):
    n = int(sec * SR); t = np.arange(n) / SR; x = noise(sec); out = np.zeros(n); blk = 2048
    for i in range(0, n, blk):
        c = 480 + 200 * np.sin(2 * np.pi * 0.35 * i / SR) + 100 * np.sin(2 * np.pi * 1.3 * i / SR)
        out[i:i + blk] = bp(x[i:i + blk], c * 0.6, c * 1.6)
    return out * np.sin(np.pi * t / sec) ** 0.8

def rustle(sec):
    n = int(sec * SR); t = np.arange(n) / SR
    grains = (rng.random(n) < 0.004) * rng.standard_normal(n)
    return bp(fftconvolve(grains, np.exp(-np.arange(300) / 40.0))[:n], 1500, 6000) * np.sin(np.pi * t / sec)

def glass_break(sec=2.2):
    n = int(sec * SR); t = np.arange(n) / SR
    crash = hp(noise(sec), 2500) * np.exp(-t * 9) * 0.9 + bp(noise(sec), 600, 2500) * np.exp(-t * 18) * 0.6
    shards = np.zeros(n)
    for _ in range(70):                               # little pieces ringing and falling
        f = rng.uniform(2500, 9000); start = rng.exponential(0.25); dur = rng.uniform(0.05, 0.3)
        i = int(start * SR); m = min(int(dur * SR), n - i)
        if m <= 0: continue
        tt = np.arange(m) / SR
        shards[i:i + m] += np.sin(2 * np.pi * f * tt) * np.exp(-tt * rng.uniform(25, 60)) * rng.uniform(0.15, 0.5)
    return crash + shards

def shimmer(sec=1.0, up=True):
    out = np.zeros(int(sec * SR)); fs = [note(x) for x in ("A5", "C6", "E6", "A6", "C7", "E7")]
    if not up: fs = fs[::-1]
    for k, f in enumerate(fs):
        i = int(k * sec / 7 * SR); tt = np.arange(int(0.5 * SR)) / SR
        s = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 9) * 0.35
        m = min(len(s), len(out) - i); out[i:i + m] += s[:m]
    return out

def thump(sec=0.3):
    n = int(sec * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (110 * np.exp(-t * 12) + 55) * t) + lp(noise(sec), 400) * 0.4) * np.exp(-t * 16)


# ---------------- recorded sounds ----------------
HERE = os.path.dirname(os.path.abspath(__file__))
def load_sample(name):
    """A recording from design/sound/source, as mono floats at SR, rumble removed and peak at 1."""
    src = os.path.join(HERE, "source", name)
    raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", src, "-ac", "1", "-ar", str(SR), "-f", "s16le", "-"], check=True, capture_output=True).stdout
    x = hp(np.frombuffer(raw, np.int16) / 32768.0, 120, 4)
    return x / max(np.abs(x).max(), 1e-9)
def cut(x, a, b, fade_in=0.01, fade_out=0.15):
    """The part of x from a to b seconds, with short fades so it never clicks."""
    y = x[int(a * SR):int(b * SR)].copy(); n = len(y); t = np.arange(n) / SR
    return y * np.clip(t / max(fade_in, 1e-4), 0, 1) * np.clip((n / SR - t) / max(fade_out, 1e-4), 0, 1)

# ---------------- wings in flight (the walk into the bank, My Queue, signing out) ----------------
def wings(sec=1.4, rate=0.16, peak_at=0.5):
    """A flyby: wing beats that swell and fade, with the air rushing past."""
    out = np.zeros(int(sec * SR)); t = 0.02
    while t < sec - 0.15:
        p = 0.35 + 0.65 * np.exp(-((t / sec - peak_at) / 0.3) ** 2)
        f = flap(0.16, p); i = int(t * SR); m = min(len(f), len(out) - i); out[i:i + m] += f[:m] * p
        t += rate * (0.92 + 0.16 * rng.random())
    w = whoosh(sec, 250, 1600) * 0.5
    return out + w[:len(out)]
def takeoff():
    """Off the perch: a push, then four hard, quickening wing beats."""
    out = np.zeros(int(0.75 * SR))
    for k, t in enumerate((0.0, 0.15, 0.27, 0.37, 0.46)):
        f = flap(0.17, 1.0 - k * 0.08); i = int(t * SR); out[i:i + len(f)] += f
    out += whoosh(0.75, 300, 2600)[:len(out)] * 0.45
    return out
def landing():
    """A flare to brake, feet on the wooden rail, and a ruffle of feathers."""
    out = np.zeros(int(0.9 * SR))
    for k, t in enumerate((0.0, 0.07, 0.14)):
        f = flap(0.14, 1.0 - k * 0.15); i = int(t * SR); out[i:i + len(f)] += f
    i = int(0.22 * SR); th = thump(0.25) * 0.7; wb = woodblock(320, 0.12) * 0.35; th[:len(wb)] += wb; out[i:i + len(th)] += th
    for k in range(5):
        f = flap(0.06, 0.3); i = int((0.36 + k * 0.07) * SR); out[i:i + len(f)] += f
    return out

# ---------------- a track to mix into ----------------
class Track:
    def __init__(self, sec, loop=False):
        n = int(sec * SR); self.n = n; self.loop = loop
        self.L = np.zeros(n); self.R = np.zeros(n); self.RV = np.zeros(n)
    def add(self, sig, at, gain=1.0, pan=0.0, verb=0.25):
        i = t_of(at); l = gain * np.cos((pan + 1) * np.pi / 4); r = gain * np.sin((pan + 1) * np.pi / 4)
        if self.loop:                                   # a loop: whatever runs past the end comes round to the start
            idx = (i + np.arange(len(sig))) % self.n
            np.add.at(self.L, idx, sig * l); np.add.at(self.R, idx, sig * r); np.add.at(self.RV, idx, sig * gain * verb); return
        if i >= self.n: return
        sig = sig[: self.n - i]
        self.L[i:i + len(sig)] += sig * l; self.R[i:i + len(sig)] += sig * r; self.RV[i:i + len(sig)] += sig * gain * verb
    def render(self, verb=0.7, fade_out=0.0, peak=0.89, gain_curve=None):
        ir_t = np.arange(int(2.2 * SR)) / SR
        ir = rng.standard_normal(len(ir_t)) * np.exp(-ir_t * 2.6); ir = lp(ir, 5000); ir[: int(0.02 * SR)] = 0
        ir /= np.sqrt(np.sum(ir ** 2))                  # the room at unit loudness: verb sets how wet
        wet = fftconvolve(self.RV, ir) * verb
        if self.loop:                                   # the reverb tail also wraps round
            w = np.zeros(self.n)
            for k in range(0, len(wet), self.n): seg = wet[k:k + self.n]; w[:len(seg)] += seg
            wet = w
        else: wet = wet[: self.n]
        L = self.L + wet; R = self.R + np.roll(wet, int(0.011 * SR))
        if gain_curve is not None: L = L * gain_curve; R = R * gain_curve
        if fade_out:
            f = np.clip((self.n / SR - np.arange(self.n) / SR) / fade_out, 0, 1); L *= f; R *= f
        m = max(np.abs(L).max(), np.abs(R).max(), 1e-9)
        st = np.stack([L, R], 1) / m * peak
        return (np.tanh(st * 1.15) / np.tanh(1.15) * 32767).astype(np.int16)

AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "frontend", "assets", "audio")
def write_mp3(pcm, name, kbps=128, mono=False):
    os.makedirs(AUDIO_DIR, exist_ok=True)
    wav = os.path.join(AUDIO_DIR, name + ".tmp.wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    args = ["ffmpeg", "-y", "-loglevel", "error", "-i", wav] + (["-ac", "1"] if mono else []) + ["-codec:a", "libmp3lame", "-b:a", f"{kbps}k", os.path.join(AUDIO_DIR, name + ".mp3")]
    subprocess.run(args, check=True); os.remove(wav)
    print("wrote", name + ".mp3")
