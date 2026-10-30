"""Musique originale de la vidéo (synthèse, libre de droits).

Usage : python3 music.py sortie.wav [durée_en_secondes]
120 BPM, progression Do - Sol - La m - Fa, calée sur les scènes de ad.html.
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
out_path = sys.argv[1]
DUR = float(sys.argv[2]) if len(sys.argv) > 2 else 25.0
N = int(SR * DUR)
rng = np.random.default_rng(7)

L = np.zeros(N)
R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def add(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    L[i:i + len(sig)] += sig * gain * (1 - pan) / 2 * 2 ** 0.5
    R[i:i + len(sig)] += sig * gain * (1 + pan) / 2 * 2 ** 0.5


def env(n, attack, release):
    e = np.ones(n)
    a, r = int(attack * SR), int(release * SR)
    e[:a] = np.linspace(0, 1, a)
    if r:
        e[-r:] *= np.linspace(1, 0, r)
    return e


def saw(freq, length, harmonics=7, detune=0.0):
    t = np.arange(int(length * SR)) / SR
    f = freq * (1 + detune)
    return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, harmonics + 1))


# Accords (notes MIDI) : Do, Sol, La m, Fa
CHORDS = [[48, 55, 60, 64], [43, 55, 59, 62], [45, 57, 60, 64], [41, 57, 60, 65]]
BAR = 4 * BEAT  # 2 s

# Nappe : de l'intro jusqu'à la fin
t = 0.0
k = 0
while t < DUR:
    length = min(BAR + 0.6, DUR - t)
    for n in CHORDS[k % 4]:
        for det, pan in ((-0.004, -0.6), (0.004, 0.6)):
            s = saw(midi(n), length, harmonics=5, detune=det) * env(int(length * SR), 0.35, 0.6)
            add(s, t, 0.035, pan)
    t += BAR
    k += 1

# Montée (bruit filtré) puis impact à l'entrée du Land Cruiser
rise_len = 2.6
noise = rng.standard_normal(int(rise_len * SR))
kernel = np.ones(30) / 30
noise = np.convolve(noise, kernel, mode="same")
add(noise * np.linspace(0, 1, len(noise)) ** 2.5, 3.0 - rise_len, 0.5)


def kick(gain=1.0, length=0.45):
    t = np.arange(int(length * SR)) / SR
    f = 45 + 110 * np.exp(-t * 28)
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * 7) * gain


def hat(length=0.06):
    n = rng.standard_normal(int(length * SR))
    n = np.diff(n, prepend=0)
    return n * np.exp(-np.arange(len(n)) / SR * 70)


def pluck(freq, length=0.4):
    t = np.arange(int(length * SR)) / SR
    s = np.sin(2 * np.pi * freq * t) + 0.35 * np.sin(4 * np.pi * freq * t) + 0.12 * np.sin(6 * np.pi * freq * t)
    return s * np.exp(-t * 9) * env(len(t), 0.004, 0.02)


boom_t = np.arange(int(1.6 * SR)) / SR
boom = np.sin(2 * np.pi * (38 + 40 * np.exp(-boom_t * 6)) * boom_t) * np.exp(-boom_t * 2.2)
add(boom, 3.0, 0.9)

# Rythme : de 3 s jusqu'à l'écran final (21,5 s)
GROOVE_START, GROOVE_END = 3.0, 21.5
b = 0
while GROOVE_START + b * BEAT < GROOVE_END:
    t = GROOVE_START + b * BEAT
    add(kick(), t, 0.55)
    add(hat(), t + BEAT / 2, 0.05, 0.3)
    if b % 2 == 1:
        add(hat(0.12), t, 0.03, -0.3)
    b += 1

# Arpège en croches, à partir de la scène Hilux
ARP_START = 7.0
step = BEAT / 2
i = 0
while ARP_START + i * step < GROOVE_END:
    t = ARP_START + i * step
    chord = CHORDS[int((t) // BAR) % 4]
    notes = [n + 12 for n in chord[1:]] + [chord[2] + 24]
    add(pluck(midi(notes[i % 4])), t, 0.07, 0.4 if i % 2 else -0.4)
    i += 1

# Accord final tenu
for n in [48, 55, 60, 64, 67, 72]:
    length = DUR - GROOVE_END
    s = saw(midi(n), length, harmonics=4) * env(int(length * SR), 0.05, length * 0.85)
    add(s, GROOVE_END, 0.05)
add(boom, GROOVE_END, 0.6)


# Réverbération simple (convolution par un bruit à décroissance exponentielle)
def reverb(x, seconds=1.6, mix=0.22):
    ir_n = int(seconds * SR)
    ir = rng.standard_normal(ir_n) * np.exp(-np.arange(ir_n) / SR * 4)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + ir_n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x * (1 - mix) + wet * mix


L, R = reverb(L), reverb(R)
mix = np.stack([L, R], axis=1)
mix *= env(N, 0.02, 0.6)[:, None]
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.2) * 0.85
data = (mix * 32767).astype("<i2")

with wave.open(out_path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(data.tobytes())
print("Musique :", out_path)
