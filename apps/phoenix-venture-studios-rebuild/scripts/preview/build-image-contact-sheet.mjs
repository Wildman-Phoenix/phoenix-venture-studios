import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "../..");
const imageDir = path.join(root, "public/images/phoenix-v2");
const outputDir = path.join(root, "output/visual-editorial-upgrade");
const scenes = ["A3", "A4", "A5", "d1", "e1", "e2", "e4"];
const tileWidth = 360;
const tileHeight = 460;
const gap = 18;
const columns = 4;
const rows = Math.ceil(scenes.length / columns);

await fs.mkdir(outputDir, { recursive: true });
const composites = [];
for (const [index, code] of scenes.entries()) {
  const image = await sharp(path.join(imageDir, `${code}.webp`))
    .resize(tileWidth, tileHeight - 42, { fit: "cover", position: "attention" })
    .extend({ bottom: 42, background: "#080a09" })
    .composite([{ input: Buffer.from(`<svg width="${tileWidth}" height="42"><text x="16" y="27" fill="#f36c21" font-family="Arial" font-size="17" font-weight="700" letter-spacing="2">${code.toUpperCase()}</text></svg>`), top: tileHeight - 42, left: 0 }])
    .png()
    .toBuffer();
  composites.push({ input: image, left: gap + (index % columns) * (tileWidth + gap), top: gap + Math.floor(index / columns) * (tileHeight + gap) });
}

await sharp({ create: { width: gap + columns * (tileWidth + gap), height: gap + rows * (tileHeight + gap), channels: 4, background: "#050707" } })
  .composite(composites)
  .png()
  .toFile(path.join(outputDir, "phoenix-replacement-contact-sheet.png"));

console.log(`Built ${path.join(outputDir, "phoenix-replacement-contact-sheet.png")}`);
