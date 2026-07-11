import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { BACKGROUND_VARIANTS } from "./background-library.mjs";
import { renderCreativeBackground } from "./creative-background-art.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WIDTH = 1200;
const HEIGHT = 630;

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

for (const background of BACKGROUND_VARIANTS) {
  const creativeInput = background.creativeScene
    ? renderCreativeBackground(background.creativeScene, background)
    : null;
  const outputPath = path.join(APP_ROOT, "public", background.publicPath.replace(/^\//, ""));

  if (creativeInput) {
    await sharp(creativeInput)
      .resize(WIDTH, HEIGHT, { fit: "cover", position: "center" })
      .jpeg({ quality: 90, mozjpeg: true })
      .toFile(outputPath);
  } else {
    await sharp(path.join(APP_ROOT, background.source))
      .rotate()
      .resize(WIDTH, HEIGHT, { fit: "cover", position: background.position || "center" })
      .modulate({
        brightness: background.brightness,
        saturation: background.saturation,
      })
      .linear(background.contrast ?? 1.05, background.bias ?? -4)
      .composite([{ input: overlaySvg(background), top: 0, left: 0 }])
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(outputPath);
  }

  console.log(`wrote ${background.publicPath}`);
}
