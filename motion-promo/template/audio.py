"""Synthesize a promo soundtrack: uplifting music bed + SFX synced to events.json (written by render.mjs).

usage: python3 audio.py [bpm]   -> out/audio.wav
Music is C major I-V-vi-IV, builds with drums, drops for the last 2 bars before the final chord.
"""
import json
import sys
import wave
import numpy as np

SR = 48000
_raw = json.load(open('events.json'))
EV = _raw['events'] if isinstance(_raw, dict) else _raw
DUR = float(_raw['meta']['dur']) if isinstance(_raw, dict) else 30.0
_meta = _raw.get('meta', {}) if isinstance(_raw, dict) else {}
BPM = float(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1] else float(_meta.get('bpm', 100))
# impact SFX start slightly BEFORE the visual lands (early reads as synced, late reads as broken)
LEAD = {'stamp': 0.07, 'click': 0.05, 'coin': 0.04, 'chaching': 0.07, 'chime': 0.03, 'card': 0.05, 'swish': 0.05, 'ding': 0.02}
N = int((DUR + 3.0) * SR)
rng = np.random.default_rng(11)


def t_arr(d):
    return np.arange(int(d * SR)) / SR


def mf(m):
    return 440.0 * 2 ** ((m - 69) / 12)


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, at, gain=1.0, pan=0.0):
        i = int(at * SR)
        if i >= N or i + len(sig) <= 0:
            return
        j = min(N, i + len(sig))
        s = sig[: j - i] * gain
        self.L[i:j] += s * np.sqrt(0.5 * (1 - pan))
        self.R[i:j] += s * np.sqrt(0.5 * (1 + pan))


def lowpass(x, a):
    """one-pole lowpass, a in (0,1): higher = brighter (vectorised via cumulative filter chunks)."""
    y = np.empty_like(x)
    acc = 0.0
    for k in range(len(x)):
        acc += a * (x[k] - acc)
        y[k] = acc
    return y


def reverb(L, R, secs=1.8, decay=0.5, mix=0.28):
    n = int(secs * SR)
    tt = np.arange(n) / SR
    env = np.exp(-tt / decay)
    irL = rng.standard_normal(n) * env
    irR = rng.standard_normal(n) * env
    irL[: int(0.012 * SR)] = 0
    irR[: int(0.017 * SR)] = 0
    irL /= np.sqrt((irL ** 2).sum())
    irR /= np.sqrt((irR ** 2).sum())
    size = 1 << int(np.ceil(np.log2(len(L) + n)))
    wl = np.fft.irfft(np.fft.rfft(L, size) * np.fft.rfft(irL, size), size)[: len(L)]
    wr = np.fft.irfft(np.fft.rfft(R, size) * np.fft.rfft(irR, size), size)[: len(R)]
    return L + wl * mix, R + wr * mix


# ---------------- music ----------------
music = Bus()
BEAT = 60.0 / BPM
BAR = BEAT * 4
CH = {
    'C': (36, [60, 64, 67, 72], [72, 76, 79, 84]),
    'G': (43, [59, 62, 67, 71], [71, 74, 79, 83]),
    'Am': (45, [57, 60, 64, 69], [69, 72, 76, 81]),
    'F': (41, [57, 60, 65, 69], [69, 72, 77, 81]),
}
NB = max(3, int(np.ceil(DUR / (BEAT * 4))))
_loop = ['C', 'G', 'Am', 'F']
PROG = [_loop[i % 4] for i in range(NB - 3)] + ['F', 'G', 'C']
LAST_FULL = NB - 4  # last bar with full drums


def pad_note(f, d):
    tt = t_arr(d)
    s = np.zeros_like(tt)
    for det in (-0.004, 0.004):
        for h in range(1, 7):
            s += np.sin(2 * np.pi * f * (1 + det) * h * tt + h) / h ** 1.6
    atk, rel = 0.45, 0.7
    env = np.minimum(1, tt / atk) * np.clip((d - tt) / rel, 0, 1)
    return s * env * 0.18


def pluck(f, d=0.9, bright=1.0):
    tt = t_arr(d)
    s = np.zeros_like(tt)
    for h in range(1, 7):
        s += np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (3 + h * 2.8 / bright)) / h
    return s * np.minimum(1, tt / 0.003)


def kick():
    tt = t_arr(0.35)
    f = 48 + 95 * np.exp(-tt * 32)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 9)


def hat():
    tt = t_arr(0.07)
    n = np.diff(rng.standard_normal(len(tt) + 1))
    return n * np.exp(-tt * 70) * 0.35


def clap():
    tt = t_arr(0.22)
    n = rng.standard_normal(len(tt))
    n = n - lowpass(n, 0.25)
    env = np.exp(-tt * 22) + 0.6 * np.exp(-np.maximum(0, tt - 0.012) * 60) * (tt > 0.012)
    return n * env * 0.35


for b, name in enumerate(PROG):
    t0 = b * BAR
    bass, padv, arp = CH[name]
    final = b == len(PROG) - 1
    d = 3.2 if not final else 2.6
    for m in padv:
        music.add(pad_note(mf(m), d), t0, 0.55 if b else 0.4, pan=(m - 64) / 20)
    if b >= 1:
        for beat in ((0, 2) if not final else (0,)):
            music.add(pluck(mf(bass), 0.8, 0.5) * 0.7, t0 + beat * BEAT, 0.9)
    if 1 <= b and not final:
        pat = [0, 1, 2, 3, 2, 1, 2, 3] if b <= LAST_FULL else [3, 2, 1, 0, 1, 2, 3, 2]
        for i, idx in enumerate(pat):
            if b == 1 and i % 2:
                continue
            music.add(pluck(mf(arp[idx]), 0.7), t0 + i * BEAT / 2, 0.16, pan=(-0.35 if i % 2 else 0.35))
    if final:
        for i, m in enumerate([72, 76, 79, 84, 88]):
            music.add(pluck(mf(m), 2.2, 2.0), t0 + i * 0.06, 0.18, pan=-0.4 + i * 0.2)
    # drums: build up, drop for the outro
    if 1 <= b <= LAST_FULL:
        for beat in (0, 2):
            music.add(kick(), t0 + beat * BEAT, 0.55)
    if b in (NB - 3, NB - 2):
        music.add(kick(), t0, 0.4)
    if 2 <= b <= LAST_FULL:
        for i in range(4):
            music.add(hat(), t0 + i * BEAT + BEAT / 2, 0.5, pan=0.3)
    if 4 <= b <= LAST_FULL:
        for beat in (1, 3):
            music.add(clap(), t0 + beat * BEAT, 0.5, pan=-0.1)
    if b == LAST_FULL:  # riser into outro
        tt = t_arr(BAR)
        n = rng.standard_normal(len(tt))
        n = n - lowpass(n, 0.1)
        music.add(n * (tt / BAR) ** 2 * 0.12, t0, 1.0)

# ---------------- sfx ----------------
sfx = Bus()


def env_ad(tt, a, d):
    return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt * d)


def s_pop(p=0):
    tt = t_arr(0.2)
    f0 = 330 * 2 ** (p / 12) * (1 + rng.uniform(-0.03, 0.03))
    f = f0 * (1 + 1.3 * np.minimum(1, tt / 0.05))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_ad(tt, 0.004, 26) * 0.9


def s_noise_sweep(d, a0, a1, gain):
    tt = t_arr(d)
    n = rng.standard_normal(len(tt))
    y = np.empty_like(n)
    acc = 0.0
    for k in range(len(n)):
        a = a0 + (a1 - a0) * (k / len(n))
        acc += a * (n[k] - acc)
        y[k] = acc
    return y * np.sin(np.pi * tt / d) ** 2 * gain


def s_type():
    tt = t_arr(0.03)
    n = np.diff(rng.standard_normal(len(tt) + 1))
    return (n * 0.5 + np.sin(2 * np.pi * 3200 * tt)) * np.exp(-tt * 260) * rng.uniform(0.35, 0.6)


def s_bell(f, d=0.9, parts=((1, 1, 5), (2.0, .45, 7), (3.0, .2, 10))):
    tt = t_arr(d)
    s = np.zeros_like(tt)
    for r, a, dec in parts:
        s += a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * dec)
    return s * np.minimum(1, tt / 0.002)


def s_click():
    tt = t_arr(0.04)
    return (np.sin(2 * np.pi * 1800 * tt) + 0.4 * rng.standard_normal(len(tt))) * np.exp(-tt * 180)


def s_scan():
    tt = t_arr(0.5)
    f = 500 + 1100 * tt / 0.5
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 32 * tt))
    return s * np.sin(np.pi * tt / 0.5) * 0.35


def s_stamp():
    tt = t_arr(0.4)
    f = 42 + 80 * np.exp(-tt * 25)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 11)
    n = rng.standard_normal(len(tt))
    thump = lowpass(n, 0.08) * np.exp(-tt * 45) * 3
    clack = (n - lowpass(n, 0.3)) * np.exp(-tt * 120) * 0.5
    return (body + thump + clack) * 0.95


def s_sparkle(d=0.8, n=16, gain=0.25):
    out = np.zeros(int((d + 0.2) * SR))
    for i in range(n):
        at = i / n * d * rng.uniform(0.8, 1.0)
        g = s_bell(rng.uniform(2600, 6800), 0.18, ((1, 1, 30), (2.0, .3, 45)))
        k = int(at * SR)
        out[k:k + len(g)] += g * (1 - i / n * 0.6)
    return out * gain


def s_coin(p=0):
    base = 2500 + (p % 5) * 90
    return s_bell(base, 0.25, ((1, 1, 26), (1.47, .6, 30), (2.09, .4, 36), (2.56, .25, 44))) * 0.45


def s_chaching():
    tt = t_arr(0.1)
    n = rng.standard_normal(len(tt))
    ch = (n - lowpass(n, 0.45)) * np.exp(-tt * 40) * 0.5
    out = np.zeros(int(1.3 * SR))
    out[: len(ch)] += ch
    for d, c in ((0.0, 0), (0.05, 3), (0.1, 1)):
        g = s_coin(c)
        k = int(d * SR)
        out[k:k + len(g)] += g
    for f in (mf(96), mf(100)):
        g = s_bell(f, 1.1, ((1, 1, 4), (2.0, .3, 7)))
        k = int(0.12 * SR)
        out[k:k + len(g)] += g * 0.5
    return out


def s_arp(notes, gap=0.07, gain=0.4):
    out = np.zeros(int((len(notes) * gap + 1.0) * SR))
    for i, m in enumerate(notes):
        g = pluck(mf(m), 0.9, 2.0)
        k = int(i * gap * SR)
        out[k:k + len(g)] += g * gain
    return out


def s_shimmer():
    notes = [84, 86, 88, 91, 93, 96, 98, 100, 103, 105, 108]
    out = np.zeros(int(1.8 * SR))
    for i, m in enumerate(notes):
        g = s_bell(mf(m), 0.8, ((1, 1, 5), (2.0, .2, 9)))
        k = int(i * 0.06 * SR)
        out[k:k + len(g)] += g * 0.22 * (1 - i / len(notes) * 0.5)
    return out


DING = [76, 79, 81, 84, 86]
CHIME = [76, 79, 84]
whoosh_cache = s_noise_sweep(0.8, 0.02, 0.35, 0.9)
swish_cache = s_noise_sweep(0.32, 0.05, 0.4, 0.45)
card_cache = s_noise_sweep(0.28, 0.08, 0.25, 0.35)
for e in EV:
    k, p = e['type'], e.get('pitch', 0)
    t = e['t'] - LEAD.get(k, 0.0)
    pan = rng.uniform(-0.3, 0.3)
    if k == 'pop':
        sfx.add(s_pop(p), t, 0.5, pan)
    elif k == 'whoosh':
        sfx.add(whoosh_cache, t - 0.25, 0.9, 0)
    elif k == 'swish':
        sfx.add(swish_cache, t, 0.8, pan)
    elif k == 'card':
        sfx.add(card_cache, t, 0.8, 0)
    elif k == 'type':
        sfx.add(s_type(), t, 0.45, 0.2)
    elif k == 'ding':
        sfx.add(s_bell(mf(DING[p % 5]), 0.8), t, 0.28, 0.2)
    elif k == 'click':
        sfx.add(s_click(), t, 0.6, 0)
    elif k == 'scan':
        sfx.add(s_scan(), t - 0.1, 0.8, 0.3)
    elif k == 'stamp':
        sfx.add(s_stamp(), t, 0.5, 0.1)
    elif k == 'chime':
        sfx.add(s_bell(mf(CHIME[p % 3]), 1.6, ((1, 1, 2.2), (2.76, .35, 5), (5.4, .12, 9))), t, 0.45, 0)
    elif k == 'sparkle':
        sfx.add(s_sparkle(), t, 1.0, 0)
    elif k == 'coin':
        sfx.add(s_coin(p), t, 0.8, 0.35)
    elif k == 'chaching':
        sfx.add(s_chaching(), t, 0.9, 0.2)
    elif k == 'celebrate':
        sfx.add(s_arp([72, 76, 79, 84, 88]), t, 1.0, 0)
        sfx.add(s_sparkle(0.9, 20, 0.2), t + 0.2, 1.0, 0)
    elif k == 'shimmer':
        sfx.add(s_shimmer(), t, 1.0, 0)

mL, mR = reverb(music.L, music.R, 2.0, 0.55, 0.3)
sL, sR = reverb(sfx.L, sfx.R, 1.2, 0.3, 0.18)
L = mL * 0.55 + sL * 0.85
R = mR * 0.55 + sR * 0.85
tt = np.arange(N) / SR
fade = np.clip(tt / 0.15, 0, 1) * np.clip((DUR - tt) / 1.2, 0, 1)
L, R = L * fade, R * fade
peak = max(np.abs(L).max(), np.abs(R).max())
L, R = np.tanh(L / peak * 1.1) * 0.89, np.tanh(R / peak * 1.1) * 0.89
out = (np.stack([L, R], 1)[: int(DUR * SR)] * 32767).astype(np.int16)
with wave.open('out/audio.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(out.tobytes())
print('audio ok:', len(EV), 'events,', round(DUR, 2), 's,', NB, 'bars @', BPM, 'bpm')
