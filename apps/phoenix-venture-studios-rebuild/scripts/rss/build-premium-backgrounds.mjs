import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WIDTH = 1200;
const HEIGHT = 630;

const BACKGROUNDS = [
  {
    source: "src/assets/late-night-strategy.jpg",
    output: "public/images/signals/backgrounds/ai-risk.jpg",
    accent: "#ff6a1f",
    secondary: "#00b8ff",
    saturation: 1.34,
    brightness: 1.02,
  },
  {
    source: "src/assets/strategy-session.jpg",
    output: "public/images/signals/backgrounds/ai-opportunity.jpg",
    accent: "#00d4ff",
    secondary: "#ff8a1f",
    saturation: 1.28,
    brightness: 1.06,
  },
  {
    source: "src/assets/hero-entrepreneur-v2.jpg",
    output: "public/images/signals/backgrounds/founder-pressure.jpg",
    accent: "#ff7a1a",
    secondary: "#8ed9d2",
    saturation: 1.22,
    brightness: 1.05,
  },
  {
    source: "src/assets/funding-review.jpg",
    output: "public/images/signals/backgrounds/capital-readiness.jpg",
    accent: "#ff8a1f",
    secondary: "#00a6ff",
    saturation: 1.30,
    brightness: 1.05,
  },
  {
    source: "src/assets/intel-hero.jpg",
    output: "public/images/signals/backgrounds/market-shock.jpg",
    accent: "#ff5a1f",
    secondary: "#00d4ff",
    saturation: 1.34,
    brightness: 1.02,
  },
  {
    source: "src/assets/intel-action.jpg",
    output: "public/images/signals/backgrounds/operational-leverage.jpg",
    accent: "#22d3ee",
    secondary: "#ff9b22",
    saturation: 1.25,
    brightness: 1.07,
  },
  {
    source: "src/assets/hero-entrepreneur.jpg",
    output: "public/images/signals/backgrounds/consulting-revenue.jpg",
    accent: "#00d4ff",
    secondary: "#ff7a1a",
    saturation: 1.28,
    brightness: 1.05,
  },
  {
    source: "src/assets/founders-collaborating.jpg",
    output: "public/images/signals/backgrounds/event-workshop.jpg",
    accent: "#ff7a1a",
    secondary: "#8ed9d2",
    saturation: 1.24,
    brightness: 1.06,
  },
  {
    source: "src/assets/late-night-strategy.jpg",
    output: "public/images/signals/backgrounds/wildcard-attention.jpg",
    accent: "#22d3ee",
    secondary: "#ff8a1f",
    saturation: 1.30,
    brightness: 1.04,
  },
];

function overlaySvg({ accent, secondary }) {
  return Buffer.from(`
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="edge" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stop-color="#041827" stop-opacity="0.22"/>
          <stop offset="0.52" stop-color="#041827" stop-opacity="0.04"/>
          <stop offset="1" stop-color="#041827" stop-opacity="0.18"/>
        </linearGradient>
        <radialGradient id="secondaryGlow" cx="82%" cy="14%" r="64%">
          <stop offset="0" stop-color="${secondary}" stop-opacity="0.22"/>
          <stop offset="0.58" stop-color="${secondary}" stop-opacity="0.06"/>
          <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="accentGlow" cx="88%" cy="90%" r="58%">
          <stop offset="0" stop-color="${accent}" stop-opacity="0.28"/>
          <stop offset="0.52" stop-color="${accent}" stop-opacity="0.08"/>
          <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#edge)"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#secondaryGlow)"/>
      <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#accentGlow)"/>
    </svg>
  `);
}

await fs.mkdir(path.join(APP_ROOT, "public/images/signals/backgrounds"), { recursive: true });

for (const background of BACKGROUNDS) {
  await sharp(path.join(APP_ROOT, background.source))
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: "cover", position: "center" })
    .modulate({
      brightness: background.brightness,
      saturation: background.saturation,
    })
    .linear(1.05, -4)
    .composite([{ input: overlaySvg(background), top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(path.join(APP_ROOT, background.output));

  console.log(`wrote ${background.output}`);
}
