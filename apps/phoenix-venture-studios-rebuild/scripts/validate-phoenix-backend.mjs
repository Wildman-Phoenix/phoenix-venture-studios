import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const routes = JSON.parse(await fs.readFile(path.join(APP_ROOT, "src/config/phoenix-routes.json"), "utf8"));
const appSource = await fs.readFile(path.join(APP_ROOT, "src/App.tsx"), "utf8");
const sitemap = await fs.readFile(path.join(APP_ROOT, "public/sitemap.xml"), "utf8");
const indexHtml = await fs.readFile(path.join(APP_ROOT, "index.html"), "utf8");
const errors = [];
const nonIndexableRoutes = new Set(["founderSignalDetail", "intelligenceDetail", "callConfirmed", "preferences", "unsubscribe", "sigmaFunding", "preferredFunding"]);

if (new Set(Object.values(routes)).size !== Object.values(routes).length) {
  errors.push("Canonical route registry contains duplicate destinations");
}

for (const [name, route] of Object.entries(routes)) {
  if (route.includes(":")) continue;
  if (!appSource.includes(`path={PHOENIX_ROUTES.${name}}`) && !appSource.includes(`path="${route}"`)) {
    errors.push(`App router is missing canonical route ${name}: ${route}`);
  }
  if (!nonIndexableRoutes.has(name) && !sitemap.includes(`<loc>https://phoenixventurestudios.com${route === "/" ? "/" : route}</loc>`)) {
    errors.push(`Sitemap is missing canonical route ${name}: ${route}`);
  }
}

for (const tag of ["rel=\"canonical\"", "property=\"og:image\"", "name=\"twitter:image\""]) {
  if (!indexHtml.includes(tag)) errors.push(`index.html is missing ${tag}`);
}

const rssDir = path.join(APP_ROOT, "public/rss");
for (const file of ["feed.xml", "tools.xml", "ai-attention.xml", "social.xml", "tools-social.xml", "ai-attention-social.xml", "bundle-manifest.json"]) {
  const stat = await fs.stat(path.join(rssDir, file)).catch(() => null);
  if (!stat?.isFile() || stat.size === 0) errors.push(`RSS artifact is missing or empty: ${file}`);
}

const feedExpectations = {
  "feed.json": 10,
  "tools.json": 10,
  "ai-attention.json": 10,
  "social.json": 1,
  "tools-social.json": 1,
  "ai-attention-social.json": 1,
};
for (const [file, maxItems] of Object.entries(feedExpectations)) {
  const feed = JSON.parse(await fs.readFile(path.join(rssDir, file), "utf8"));
  const items = Array.isArray(feed.items) ? feed.items : [];
  if (!items.length || items.length > maxItems) errors.push(`${file} must contain 1-${maxItems} items; found ${items.length}`);
  if (file.includes("social") && items.length !== 1) errors.push(`${file} must contain exactly one social item`);
  for (const item of items) {
    if (!String(item.url || "").startsWith("https://phoenixventurestudios.com/")) {
      errors.push(`${file} contains a non-Phoenix canonical item URL`);
    }
  }
}

const manifest = JSON.parse(await fs.readFile(path.join(rssDir, "bundle-manifest.json"), "utf8"));
for (const [file, expectedHash] of Object.entries(manifest.files || {})) {
  const raw = await fs.readFile(path.join(rssDir, file)).catch(() => null);
  if (!raw) {
    errors.push(`Manifested RSS artifact is missing: ${file}`);
    continue;
  }
  const actualHash = createHash("sha256").update(raw).digest("hex");
  if (actualHash !== expectedHash) errors.push(`Manifest hash mismatch: ${file}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log("Phoenix backend validation passed: routes, sitemap, metadata, and required RSS artifacts are present.");
}
