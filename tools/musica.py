"""Crea la base musicale dei reel di FuoriPrezzo: assets/musica/base.m4a (24 secondi, 108 bpm).
Stile pop moderno e morbido: piano elettrico, chitarra pizzicata, basso profondo, batteria leggera con
"pompaggio" e riverbero. È composta e sintetizzata qui (nessun brano di altri), quindi si può usare liberamente.
Uso: python3 tools/musica.py   (serve numpy e ffmpeg; basta lanciarlo una volta, il file è nel repository)"""
import os, subprocess, tempfile, wave
import numpy as np

SR, BPM, BARS = 44100, 108, 11
beat = 60 / BPM
SECONDS = 24
n = int(SR * (SECONDS + 3))
rng = np.random.default_rng(3)
midi = lambda m: 440 * 2 ** ((m - 69) / 12)

class Bus:  # una traccia stereo
    def __init__(self): self.L = np.zeros(n); self.R = np.zeros(n)
    def add(self, sig, at, pan=0.0, gain=1.0):
        i = int(at * SR)
        if i >= n: return
        s = sig[: n - i] * gain
        self.L[i:i + len(s)] += s * np.sqrt((1 - pan) / 2) * 1.41
        self.R[i:i + len(s)] += s * np.sqrt((1 + pan) / 2) * 1.41

def lowpass(x, fc):  # filtro dolce nel dominio delle frequenze
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (f / fc) ** 4), len(x))
def highpass(x, fc):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    return np.fft.irfft(X / np.sqrt(1 + (fc / np.maximum(f, 1)) ** 4), len(x))

def rhodes(freq, d):  # piano elettrico a FM: campanella morbida che si spegne
    t = np.arange(int(d * SR)) / SR
    idx = 1.6 * np.exp(-t * 5)
    mod = np.sin(2 * np.pi * freq * t) * idx
    tone = np.sin(2 * np.pi * freq * t + mod) + 0.25 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 7)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 1.6)
    return tone * env * (1 + 0.15 * np.sin(2 * np.pi * 5 * t))  # leggero tremolo

def pluck(freq, d):  # chitarra pizzicata (Karplus-Strong), calcolata a blocchi
    N = int(SR / freq); L = int(d * SR)
    y = np.zeros(L + N + 1); y[:N] = rng.uniform(-1, 1, N)
    y[:N] = lowpass(np.concatenate([y[:N], np.zeros(N)]), 3500)[:N]
    y[N] = y[0] * .5; k = N + 1
    while k < L:
        e = min(k + N, L)
        y[k:e] = 0.4985 * (y[k - N:e - N] + y[k - N - 1:e - N - 1])
        k = e
    y = y[:L]; t = np.arange(L) / SR
    return y * np.exp(-t * 2.2)

def sub(freq, d):  # basso profondo, appena saturato
    t = np.arange(int(d * SR)) / SR
    env = np.minimum(1, t / 0.01) * np.minimum(1, (d - t) / 0.05)
    return np.tanh(1.6 * np.sin(2 * np.pi * freq * t)) * env

def kick():
    t = np.arange(int(0.4 * SR)) / SR
    f = 48 + 90 * np.exp(-t * 35)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) + lowpass(rng.uniform(-1, 1, len(t)) * np.exp(-t * 120), 2500) * 0.3

def snap():  # schiocco/clap morbido
    t = np.arange(int(0.25 * SR)) / SR
    x = highpass(lowpass(rng.uniform(-1, 1, len(t)), 6000), 900)
    e = sum(np.exp(-np.maximum(t - o, 0) * 60) * (t >= o) for o in (0, .008, .017)) / 2 + np.exp(-t * 18) * .5
    return x * e

def shaker():
    t = np.arange(int(0.07 * SR)) / SR
    return highpass(rng.uniform(-1, 1, len(t)), 6000) * np.sin(np.pi * t / t[-1]) ** 2

def pad(freqs, d):  # tappeto morbido con attacco lento
    t = np.arange(int(d * SR)) / SR
    s = sum(np.sin(2 * np.pi * f * (1 + dt) * t) for f in freqs for dt in (-0.003, 0, 0.003))
    env = np.minimum(1, t / 0.8) * np.minimum(1, (d - t) / 0.6)
    return lowpass(s, 1800) * env

# Progressione calda: Fa maj7 - La min7 - Re min7 - Do (ritmo pop)
CH = [[53, 57, 60, 64], [57, 60, 64, 67], [50, 53, 57, 60], [48, 52, 55, 59]]
ROOT = [41, 45, 38, 36]
keys, gtr, bass, drums, pads = Bus(), Bus(), Bus(), Bus(), Bus()
bar = 4 * beat
for b in range(BARS):
    c, r, t0 = CH[b % 4], ROOT[b % 4], b * bar
    # piano elettrico: accordi in levare (sull'"e" di 1 e 3, sul 2 e sul 4)
    for at, l in ((0, 1.5), (1.5, 1), (2.5, 1.5)):
        for k, m in enumerate(c):
            keys.add(rhodes(midi(m + 12), l * beat + .4), t0 + at * beat + k * .006, pan=(k - 1.5) * .25, gain=.16)
    # chitarra pizzicata dalla terza battuta: arpeggio in sedicesimi alternati
    if b >= 2:
        pat = [0, 2, 3, 2, 1, 3, 2, 3]
        for k, p in enumerate(pat):
            if k % 4 == 3 and b % 2: continue
            gtr.add(pluck(midi(c[p] + 12), .9), t0 + k * beat / 2 + (beat / 4 if k % 2 else 0), pan=.45 if k % 2 else -.35, gain=.45)
    # basso: radice con piccolo movimento
    for at, l, m in ((0, 1.4, r), (1.5, .45, r), (2, 1.4, r), (3.5, .45, r + 12 if b % 2 else r + 7)):
        bass.add(sub(midi(m), l * beat), t0 + at * beat, gain=.16)
    pads.add(pad([midi(m + 12) for m in c], bar + .6), t0, gain=.04)
    # batteria: entra piano, completa dalla seconda battuta
    for k in range(4):
        drums.add(kick(), t0 + k * beat, gain=.42 if b else .3)
        if k % 2 and b >= 1: drums.add(snap(), t0 + k * beat, gain=.6)
    for k in range(16):
        if b >= 1: drums.add(shaker(), t0 + k * beat / 4, pan=.25, gain=.16 if k % 2 else .24)

# "Pompaggio": piano, chitarra e tappeto si abbassano un attimo a ogni colpo di cassa
t = np.arange(n) / SR
pump = 1 - 0.45 * np.exp(-((t % beat) / 0.09))
for bus in (keys, gtr, pads):
    bus.L *= pump; bus.R *= pump

# Riverbero: coda di rumore che si spegne (1,6 s), più scura in alto
ir_t = np.arange(int(1.6 * SR)) / SR
def ir(seed):
    x = np.random.default_rng(seed).uniform(-1, 1, len(ir_t)) * np.exp(-ir_t * 3.2)
    return lowpass(x, 5000) / 30
def conv(x, h):
    m = len(x) + len(h) - 1; N = 1 << (m - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(h, N), N)[:len(x)]
irL, irR = ir(11), ir(12)
wetL = conv(keys.L * .7 + gtr.L * .6 + pads.L + drums.L * .12, irL)
wetR = conv(keys.R * .7 + gtr.R * .6 + pads.R + drums.R * .12, irR)

L = keys.L + gtr.L + bass.L + drums.L + pads.L + wetL * .35
R = keys.R + gtr.R + bass.R + drums.R + pads.R + wetR * .35
L, R = L[: SR * SECONDS], R[: SR * SECONDS]
tt = np.arange(len(L)) / SR
fade = np.minimum(1, np.minimum(tt / .15, (SECONDS - tt) / 1.5))
mix = np.stack([L, R], axis=1) * fade[:, None]
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
mix = mix / np.max(np.abs(mix)) * 0.9

os.makedirs('assets/musica', exist_ok=True)
tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', 'highpass=f=30,loudnorm=I=-16:TP=-1.5', '-ar', '48000',
                '-c:a', 'aac', '-b:a', '192k', 'assets/musica/base.m4a'], check=True)
os.remove(tmp)
print('ok assets/musica/base.m4a')
