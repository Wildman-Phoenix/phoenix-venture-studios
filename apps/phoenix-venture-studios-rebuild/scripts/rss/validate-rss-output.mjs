import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRss } from "./generate-static-rss.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const PUBLIC_ROOT = path.join(APP_ROOT, "public");
const DIST_ROOT = path.join(APP_ROOT, "dist");
const PREVIEW_ROOT = path.resolve(APP_ROOT, "../..", "output/phoenix-previews-upload/phoenix-venture-studios-rebuild");
const PREVIEW_SITE_URL = "https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild";
const REQUIRED_FIELDS = [
  "slug",
  "internalUrl",
  "originalUrl",
  "socialImageUrl",
  "socialImagePath",
  "imageStrategy",
  "imageFamily",
  "imageRightsStatus",
  "imageBrief",
  "feedRole",
  "simpleSummary",
  "engagementPrompt",
  "trendContext",
  "readingLevel",
  "editorialMode",
];

function fail(errors) {
  for (const error of errors) console.error(`RSS validation: ${error}`);
  process.exit(1);
}

async function readText(file) {
  return fs.readFile(path.join(RSS_DIR, file), "utf8");
}

async function main() {
  const errors = [];
  const checkDeployArtifacts = process.argv.includes("--deploy-artifacts");
  const xmlFiles = ["feed.xml", "ai-attention.xml", "tools.xml"];
  const jsonFiles = ["feed.json", "ai-attention.json", "tools.json"];
  const requiredFiles = [...xmlFiles, ...jsonFiles, "run-report.json", "ai-attention-run-report.json", "tools-run-report.json"];

  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(RSS_DIR, file));
    } catch {
      errors.push(`missing ${file}`);
    }
  }

  for (const file of xmlFiles) {
    const xml = await readText(file).catch(() => "");
    if (!validateRss(xml)) errors.push(`${file} is not well-formed RSS`);
    if ((xml.match(/<item>/g) || []).length !== 10) errors.push(`${file} must contain 10 items`);
    if (!xml.includes("/founder-signal/signals/")) errors.push(`${file} missing Phoenix signal links`);
    if (!xml.includes("/images/signals/generated/")) errors.push(`${file} missing generated Phoenix enclosures`);
    if (file === "tools.xml" && !xml.includes("https://phoenixventurestudios.com/rss/tools.xml")) {
      errors.push("tools.xml must self-identify as /rss/tools.xml");
    }
  }

  for (const file of jsonFiles) {
    const feed = JSON.parse(await readText(file));
    if (!Array.isArray(feed.items) || feed.items.length !== 10) errors.push(`${file} must contain 10 items`);
    if (file === "tools.json" && feed.feed_url !== "https://phoenixventurestudios.com/rss/tools.json") {
      errors.push("tools.json must self-identify as /rss/tools.json");
    }
    for (const item of feed.items || []) {
      const phoenix = item._phoenix || {};
      const label = `${file}:${item.title || phoenix.slug || "unknown"}`;
      for (const field of REQUIRED_FIELDS) {
        if (!phoenix[field]) errors.push(`${label} missing _phoenix.${field}`);
      }
      if (!String(phoenix.internalUrl || "").startsWith("https://phoenixventurestudios.com/founder-signal/signals/")) {
        errors.push(`${label} internalUrl must be Phoenix signal URL`);
      }
      if (!/^https?:\/\//.test(String(phoenix.originalUrl || ""))) {
        errors.push(`${label} originalUrl must remain a source URL`);
      }
      if (!String(phoenix.socialImagePath || "").startsWith("/images/signals/generated/")) {
        errors.push(`${label} socialImagePath must be generated`);
      }
      const imagePath = path.join(PUBLIC_ROOT, String(phoenix.socialImagePath || "").replace(/^\//, ""));
      try {
        await fs.access(imagePath);
      } catch {
        errors.push(`${label} generated social image missing`);
      }
      if (checkDeployArtifacts) {
        for (const root of [DIST_ROOT, PREVIEW_ROOT]) {
          const deployImagePath = path.join(root, String(phoenix.socialImagePath || "").replace(/^\//, ""));
          try {
            await fs.access(deployImagePath);
          } catch {
            errors.push(`${label} generated social image missing from deploy artifact ${root}`);
          }
        }

        const signalPath = `founder-signal/signals/${phoenix.slug}/index.html`;
        const productionPagePath = path.join(DIST_ROOT, signalPath);
        const previewPagePath = path.join(PREVIEW_ROOT, signalPath);
        const previewImageUrl = `${PREVIEW_SITE_URL}${phoenix.socialImagePath}`;
        const pageChecks = [
          { pagePath: productionPagePath, expectedImageUrl: phoenix.socialImageUrl, name: "production" },
          { pagePath: previewPagePath, expectedImageUrl: previewImageUrl, name: "preview" },
        ];

        for (const check of pageChecks) {
          const html = await fs.readFile(check.pagePath, "utf8").catch(() => "");
          if (!html) {
            errors.push(`${label} missing ${check.name} static signal page`);
            continue;
          }
          if (!html.includes(`property="og:image" content="${check.expectedImageUrl}"`)) {
            errors.push(`${label} ${check.name} page missing raw og:image`);
          }
          if (!html.includes(`name="twitter:image" content="${check.expectedImageUrl}"`)) {
            errors.push(`${label} ${check.name} page missing raw twitter:image`);
          }
        }
      }
      if (String(phoenix.sourceImageUrl || "").startsWith("http")) {
        errors.push(`${label} exposes publisher sourceImageUrl`);
      }
      if (!String(phoenix.socialImageUrl || "").includes("/images/signals/generated/")) {
        errors.push(`${label} socialImageUrl is not Phoenix generated media`);
      }
    }
  }

  if (errors.length) fail(errors);
  console.log("RSS validation passed: artifacts, XML, Phoenix links, generated images, and editorial metadata are valid.");
}

main().catch((error) => fail([error instanceof Error ? error.message : String(error)]));
