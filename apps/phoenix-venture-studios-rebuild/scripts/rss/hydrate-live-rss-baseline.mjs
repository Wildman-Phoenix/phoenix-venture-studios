import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const PUBLIC_DIR = path.join(APP_ROOT, "public");
const SITE_URL = (process.env.PHOENIX_RSS_SITE_URL || "https://phoenixventurestudios.com").replace(/\/$/, "");

async function fetchBuffer(url) {
  const response = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`Live RSS baseline fetch failed (${response.status}): ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function writePublicFile(relativePath, bytes) {
  const target = path.join(PUBLIC_DIR, relativePath.replace(/^\/+/, ""));
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, bytes);
}

export async function hydrateLiveRssBaseline() {
  const manifestBytes = await fetchBuffer(`${SITE_URL}/rss/bundle-manifest.json`);
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const files = Object.entries(manifest.files || {});
  if (!files.length) throw new Error("Live RSS manifest contains no files");

  await fs.mkdir(RSS_DIR, { recursive: true });
  for (const [file, expectedHash] of files) {
    const bytes = await fetchBuffer(`${SITE_URL}/rss/${encodeURIComponent(file)}`);
    const algorithm = String(expectedHash).length === 40 ? "sha1" : "sha256";
    const actualHash = createHash(algorithm).update(bytes).digest("hex");
    if (actualHash !== expectedHash) throw new Error(`Live RSS baseline hash mismatch: ${file}`);
    await fs.writeFile(path.join(RSS_DIR, file), bytes);
  }
  await fs.writeFile(path.join(RSS_DIR, "bundle-manifest.json"), manifestBytes);

  const imagePaths = new Set();
  for (const file of ["feed.json", "tools.json", "ai-attention.json", "social.json", "tools-social.json", "ai-attention-social.json"]) {
    const feed = JSON.parse(await fs.readFile(path.join(RSS_DIR, file), "utf8"));
    for (const item of feed.items || []) {
      const imagePath = item?._phoenix?.socialImagePath;
      if (String(imagePath || "").startsWith("/images/signals/generated/")) imagePaths.add(imagePath);
    }
  }
  for (const imagePath of imagePaths) {
    await writePublicFile(imagePath, await fetchBuffer(`${SITE_URL}${imagePath}`));
  }

  console.log(`Hydrated ${files.length} manifested RSS files and ${imagePaths.size} referenced images from the last valid live bundle.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  hydrateLiveRssBaseline().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
