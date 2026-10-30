// Capture ad.html image par image, puis assemble la vidéo avec la musique.
// Usage : node promo/render.js [dossier-de-travail]
// Prérequis : Playwright (Chromium), ffmpeg, python3 + numpy (musique),
// piper-tts et le modèle fr_FR-siwis-medium.onnx (voix off) :
//   PIPER_MODEL=/chemin/fr_FR-siwis-medium.onnx node promo/render.js
// Variable PYTHON : interpréteur où piper-tts est installé (défaut : python3).
const { chromium } = require("playwright");
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const FPS = 30;
const here = __dirname;
const work = process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), "rcrent-ad-"));
const frames = path.join(work, "frames");
const out = path.join(here, "rc-rent-pub.mp4");

(async () => {
  fs.mkdirSync(frames, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.goto("file://" + path.join(here, "ad.html") + "?capture");
  await page.evaluate(() => window.ready);
  const duration = await page.evaluate(() => window.DURATION);
  const total = Math.round(duration * FPS);

  for (let i = 0; i < total; i++) {
    await page.evaluate((t) => window.render(t), i / FPS);
    await page.screenshot({ path: path.join(frames, `f${String(i).padStart(4, "0")}.jpg`), type: "jpeg", quality: 95 });
    if (i % FPS === 0) process.stdout.write(`\r${i}/${total} images`);
  }
  await browser.close();
  console.log(`\r${total}/${total} images`);

  const python = process.env.PYTHON || "python3";
  const music = path.join(work, "music.wav");
  execFileSync(python, [path.join(here, "music.py"), music, String(duration)], { stdio: "inherit" });
  const voice = path.join(work, "voice.wav");
  execFileSync(python, [path.join(here, "voice.py"), voice, process.env.PIPER_MODEL || "fr_FR-siwis-medium.onnx", String(duration)], { stdio: "inherit" });

  execFileSync("ffmpeg", [
    "-y", "-loglevel", "error",
    "-framerate", String(FPS), "-i", path.join(frames, "f%04d.jpg"),
    "-i", music, "-i", voice,
    "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
    // Musique baissée et « compressée » par la voix (ducking), puis mixage
    "-filter_complex",
    "[1:a]volume=0.55[m];[2:a]aformat=channel_layouts=stereo,asplit[v1][v2];" +
    "[m][v1]sidechaincompress=threshold=0.02:ratio=8:attack=15:release=350[duck];" +
    "[duck][v2]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]",
    "-map", "0:v", "-map", "[a]", "-ar", "44100",
    "-c:a", "aac", "-b:a", "192k", "-shortest", "-movflags", "+faststart",
    out,
  ], { stdio: "inherit" });
  console.log("Vidéo : " + out);
})();
