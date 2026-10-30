"""Voix off de la vidéo (voix féminine française, synthèse Piper).

Usage : python3 voice.py sortie.wav modele.onnx [durée_en_secondes]

Modèle utilisé : fr_FR-siwis-medium (https://huggingface.co/rhasspy/piper-voices),
jeu de données SIWIS sous licence CC BY 4.0.
Chaque phrase est placée au début de sa scène (voir TIMELINE dans ad.html).
Certains noms sont écrits phonétiquement (« Crouzeur », « Rènte ») pour être bien prononcés.
"""
import io
import sys
import wave

import numpy as np
from piper import PiperVoice, SynthesisConfig

SR = 44100
LINES = [
    (0.5, "Prêt pour tous les terrains ?"),
    (2.9, "Le Land Crouzeur 300. Sept places, un V6 biturbo. Le roi, sur toutes les routes."),
    (9.2, "Le Hilux. Increvable, par nature."),
    (12.8, "Le Land Crouzeur 70. L'original, sans compromis."),
    (17.1, "Prado. Fortiouneur. Hilux GR. RAV4. Toute la gamme Toyota."),
    (22.7, "Choisissez vos dates, et réservez en deux minutes."),
    (26.3, "RC Rènte. À partir de quatre-vingt-cinq dollars par jour. Réservez maintenant !"),
]

out_path, model = sys.argv[1], sys.argv[2]
DUR = float(sys.argv[3]) if len(sys.argv) > 3 else 32.0

voice = PiperVoice.load(model)
config = SynthesisConfig(length_scale=1.0, noise_scale=0.6, noise_w_scale=0.7)
track = np.zeros(int(DUR * SR))

for start, text in LINES:
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        voice.synthesize_wav(text, w, syn_config=config)
    buf.seek(0)
    with wave.open(buf) as w:
        rate = w.getframerate()
        pcm = np.frombuffer(w.readframes(w.getnframes()), "<i2") / 32768
    # Rééchantillonnage linéaire vers 44,1 kHz
    n = int(len(pcm) * SR / rate)
    pcm = np.interp(np.linspace(0, len(pcm) - 1, n), np.arange(len(pcm)), pcm)
    i = int(start * SR)
    end = min(len(track), i + n)
    if i + n > len(track):
        print(f"Attention : la phrase à {start} s dépasse la fin de la vidéo", file=sys.stderr)
    track[i:end] += pcm[: end - i]
    print(f"{start:5.1f} s → {start + n / SR:5.1f} s  {text}")

track /= max(1e-9, np.max(np.abs(track)))
with wave.open(out_path, "wb") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((track * 0.9 * 32767).astype("<i2").tobytes())
