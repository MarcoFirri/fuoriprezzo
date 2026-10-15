"""Crea la base musicale dei reel di FuoriPrezzo: assets/musica/base.m4a (16 secondi, 120 bpm).
È composta e sintetizzata qui (nessun brano di altri), quindi si può usare liberamente.
Uso: python3 tools/musica.py   (serve numpy e ffmpeg; basta lanciarlo una volta, il file è nel repository)"""
import os, subprocess, tempfile, wave
import numpy as np

SR, BPM, SECONDS = 44100, 120, 16
beat = 60 / BPM
n = int(SR * SECONDS)
L = np.zeros(n); R = np.zeros(n)
t_all = np.arange(n) / SR

def add(sig, start, pan=0.0, gain=1.0):
    i = int(start * SR)
    if i >= n: return
    sig = sig[: n - i] * gain
    L[i:i + len(sig)] += sig * (1 - max(pan, 0))
    R[i:i + len(sig)] += sig * (1 + min(pan, 0))

def env(d, a=0.005, rel=None):
    t = np.arange(int(d * SR)) / SR
    e = np.minimum(1, t / a) * np.exp(-t / (rel or d / 3))
    return t, e

def kick():
    t, e = env(0.35, 0.001, 0.12)
    f = 50 + 120 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e

def clap():
    t, e = env(0.2, 0.001, 0.05)
    return np.random.default_rng(1).uniform(-1, 1, len(t)) * e * 0.6

def hat():
    t, e = env(0.05, 0.001, 0.012)
    noise = np.random.default_rng(2).uniform(-1, 1, len(t))
    return np.diff(np.concatenate([[0], noise])) * e * 0.2

def tone(freq, d, kind='saw', rel=None):
    t, e = env(d, 0.004, rel)
    ph = (freq * t) % 1
    w = 2 * ph - 1 if kind == 'saw' else np.sign(np.sin(2 * np.pi * freq * t)) * 0.6
    w = w + 0.5 * np.sin(2 * np.pi * freq * 2 * t)
    return w * e

midi = lambda m: 440 * 2 ** ((m - 69) / 12)
# Progressione La minore - Fa - Do - Sol, un accordo per battuta
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
bars = int(SECONDS / (4 * beat)) + 1
for b in range(bars):
    ch = CHORDS[b % 4]
    t0 = b * 4 * beat
    for k in range(4):
        add(kick(), t0 + k * beat, gain=0.9)
        if k % 2: add(clap(), t0 + k * beat, gain=0.5)
    for k in range(8):
        add(hat(), t0 + k * beat / 2 + beat / 4, pan=0.3)
        add(tone(midi(ch[0] - 12), beat / 2 * 0.9, 'square', 0.12), t0 + k * beat / 2, gain=0.22)
    if b >= 1:  # arpeggio dalla seconda battuta
        for k in range(16):
            note = ch[[0, 1, 2, 1][k % 4]] + 12 * (1 if k % 8 >= 4 else 0)
            add(tone(midi(note), beat / 4 * 0.9, 'saw', 0.06), t0 + k * beat / 4, pan=-0.35 if k % 2 else 0.35, gain=0.08)
    for m in ch:  # accordo morbido di sottofondo
        add(tone(midi(m), 4 * beat, 'saw', 1.2), t0, gain=0.03)

mix = np.stack([L, R], axis=1)
fade = np.minimum(1, np.minimum(t_all / 0.3, (SECONDS - t_all) / 1.2))[:, None]
mix = np.tanh(mix * fade * 1.1)
mix = mix / np.max(np.abs(mix)) * 0.89

os.makedirs('assets/musica', exist_ok=True)
tmp = tempfile.mktemp(suffix='.wav')
with wave.open(tmp, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-af', 'highpass=f=35,lowpass=f=7500,loudnorm=I=-16:TP=-1.5', '-ar', '48000',
                '-c:a', 'aac', '-b:a', '160k', 'assets/musica/base.m4a'], check=True)
os.remove(tmp)
print('ok assets/musica/base.m4a')
