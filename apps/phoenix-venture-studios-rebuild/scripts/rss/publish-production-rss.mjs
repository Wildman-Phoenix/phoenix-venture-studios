import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeSignalStaticPages } from "./signal-page-html.mjs";
import { assertBundleManifestMatchesDirectory } from "./publish-preview-rss.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DIST_DIR = path.join(APP_ROOT, "dist");
const SOURCE_DIR = path.join(APP_ROOT, "public/rss");
const SOURCE_IMAGES_DIR = path.join(APP_ROOT, "public/images/signals/generated");
const TARGET_DIR = path.join(DIST_DIR, "rss");
const TARGET_IMAGES_DIR = path.join(DIST_DIR, "images/signals/generated");
const DEFAULT_SITE_URL = "https://phoenixventurestudios.com";
const RSS_JSON_FILES = [
  "feed.json",
  "tools.json",
  "ai-attention.json",
  "social.json",
  "tools-social.json",
  "ai-attention-social.json",
];
const REPORT_FILES = [
  "run-report.json",
  "tools-run-report.json",
  "ai-attention-run-report.json",
  "social-run-report.json",
  "tools-social-run-report.json",
  "ai-attention-social-run-report.json",
];

function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
  return String(value || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function toSitePath(value = "") {
  if (!value) return "";

  let pathValue = String(value);
  if (/^https?:\/\//i.test(pathValue)) {
    try {
      pathValue = new URL(pathValue).pathname;
    } catch {
      return "";
    }
  }

  return pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
}

async function copyDir(sourceDir, targetDir) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyDir(sourcePath, targetPath);
    } else if (entry.isFile()) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function assertDistShellExists() {
  const shellPath = path.join(DIST_DIR, "index.html");
  const stat = await fs.stat(shellPath).catch(() => null);
  if (!stat?.isFile() || stat.size === 0) {
    throw new Error(`Missing production app shell at ${shellPath}`);
  }
}

async function readFeedItems() {
  const items = [];
  for (const file of RSS_JSON_FILES) {
    const raw = await fs.readFile(path.join(SOURCE_DIR, file), "utf8").catch(() => "");
    if (!raw) continue;

    const feed = JSON.parse(raw);
    for (const item of feed.items || []) {
      items.push(item);
    }
  }
  return items;
}

function collectRequiredGeneratedImages(items = []) {
  const paths = new Set();
  for (const item of items) {
    const phoenix = item._phoenix || {};
    const candidates = [
      phoenix.socialImagePath,
      phoenix.imagePath,
      phoenix.socialImageUrl,
      phoenix.imageUrl,
      item.socialImagePath,
      item.imagePath,
      item.image,
      item.banner_image,
      item.enclosure?.url,
    ];

    for (const candidate of candidates) {
      const sitePath = toSitePath(candidate);
      if (sitePath.startsWith("/images/signals/generated/")) {
        paths.add(sitePath);
      }
    }
  }
  return [...paths].sort();
}

async function copyRequiredGeneratedImages(items) {
  const imagePaths = collectRequiredGeneratedImages(items);
  await fs.mkdir(TARGET_IMAGES_DIR, { recursive: true });

  for (const sitePath of imagePaths) {
    const fileName = path.basename(sitePath);
    const sourcePath = path.join(SOURCE_IMAGES_DIR, fileName);
    const targetPath = path.join(TARGET_IMAGES_DIR, fileName);
    const sourceStat = await fs.stat(sourcePath).catch(() => null);
    if (!sourceStat?.isFile() || sourceStat.size === 0) {
      throw new Error(`Missing generated Phoenix image required by RSS item: ${sitePath}`);
    }

    const image = await fs.readFile(sourcePath);
    await fs.writeFile(targetPath, image);
  }

  return { count: imagePaths.length, imagePaths };
}

async function resetGeneratedOutputs() {
  await fs.rm(TARGET_DIR, { recursive: true, force: true });
  await fs.rm(TARGET_IMAGES_DIR, { recursive: true, force: true });
  await fs.rm(path.join(DIST_DIR, "founder-signal", "signals"), { recursive: true, force: true });
}

async function assertLatestReportsArePublishable() {
  const supervisedRaw = await fs.readFile(path.join(SOURCE_DIR, "generate-run-report.json"), "utf8").catch(() => "");
  if (supervisedRaw) {
    const supervisedReport = JSON.parse(supervisedRaw);
    if (!supervisedReport.allSafe) {
      throw new Error("Refusing production RSS publish because generate-run-report.json is not allSafe.");
    }
  }
  await assertBundleManifestMatchesDirectory(SOURCE_DIR);

  for (const reportFile of REPORT_FILES) {
    const raw = await fs.readFile(path.join(SOURCE_DIR, reportFile), "utf8").catch(() => "");
    if (!raw) {
      throw new Error(`Missing RSS report required for production publish: ${reportFile}`);
    }

    const report = JSON.parse(raw);
    if (!report.feedValid && !report.preservedPreviousFeed) {
      const validationErrors = Array.isArray(report.validation?.errors) ? report.validation.errors.length : 0;
      throw new Error(`Refusing production RSS publish because ${reportFile} is not valid${validationErrors ? ` (${validationErrors} validation errors)` : ""}.`);
    }
  }
}

try {
  const siteUrl = normalizeSiteUrl(process.env.PHOENIX_RSS_SITE_URL || DEFAULT_SITE_URL);
  await assertLatestReportsArePublishable();
  await assertDistShellExists();
  const items = await readFeedItems();
  await resetGeneratedOutputs();
  await copyDir(SOURCE_DIR, TARGET_DIR);
  const copiedImages = await copyRequiredGeneratedImages(items);
  const signalPages = await writeSignalStaticPages({
    targetRoot: DIST_DIR,
    rssDir: TARGET_DIR,
    siteUrl,
  });

  console.log(`Published RSS artifacts to ${TARGET_DIR}`);
  console.log(`Copied generated RSS images: ${copiedImages.count}`);
  if (signalPages.skipped) {
    console.warn(`Static signal pages skipped: ${signalPages.reason}`);
  } else {
    console.log(`Generated production static signal pages: ${signalPages.count}`);
  }
} catch (error) {
  console.error("Production RSS publish failed:", error);
  process.exitCode = 1;
} finally {
  setImmediate(() => process.exit(process.exitCode || 0));
}
