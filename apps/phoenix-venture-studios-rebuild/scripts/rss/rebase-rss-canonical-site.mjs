import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const MANIFEST_PATH = path.join(RSS_DIR, "bundle-manifest.json");
const FROM_SITE = String(
  process.env.PHOENIX_RSS_REBASE_FROM ||
    "https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild",
).replace(/\/$/, "");
const TO_SITE = String(
  process.env.PHOENIX_RSS_REBASE_TO || "https://phoenixventurestudios.com",
).replace(/\/$/, "");

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

if (!FROM_SITE || !TO_SITE || FROM_SITE === TO_SITE) {
  throw new Error("Canonical RSS rebase requires different non-empty source and target site URLs.");
}

const manifestRaw = await fs.readFile(MANIFEST_PATH, "utf8");
const manifest = JSON.parse(manifestRaw);
const files = manifest?.files && typeof manifest.files === "object" ? manifest.files : {};
if (!Object.keys(files).length) {
  throw new Error("Cannot rebase RSS canonicals because bundle-manifest.json has no files.");
}

for (const [file, expectedHash] of Object.entries(files)) {
  const raw = await fs.readFile(path.join(RSS_DIR, file));
  if (hash(raw) !== expectedHash) {
    throw new Error(`Refusing canonical rebase because ${file} does not match the current bundle manifest.`);
  }
}

let changedFiles = 0;
const nextHashes = {};
for (const file of Object.keys(files).sort()) {
  const filePath = path.join(RSS_DIR, file);
  const raw = await fs.readFile(filePath);
  const isText = /\.(?:json|xml|md|txt)$/i.test(file);
  let next = raw;

  if (isText) {
    const text = raw.toString("utf8");
    const rebased = text.split(FROM_SITE).join(TO_SITE);
    if (rebased !== text) {
      next = Buffer.from(rebased, "utf8");
      await fs.writeFile(filePath, next);
      changedFiles += 1;
    }
  }

  nextHashes[file] = hash(next);
}

if (!changedFiles) {
  throw new Error(`No RSS artifacts referenced ${FROM_SITE}; nothing was rebased.`);
}

const generatedAt = new Date().toISOString();
const nextManifest = {
  ...manifest,
  generatedAt,
  runId: `${manifest.runId || "bundle"}-canonical-${generatedAt}`,
  canonicalRebase: {
    from: FROM_SITE,
    to: TO_SITE,
    changedFiles,
    rebasedAt: generatedAt,
  },
  files: nextHashes,
};

await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(nextManifest, null, 2)}\n`, "utf8");
console.log(`Rebased ${changedFiles} RSS bundle files from ${FROM_SITE} to ${TO_SITE}.`);
