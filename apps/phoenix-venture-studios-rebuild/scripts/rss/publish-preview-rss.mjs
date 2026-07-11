import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeSignalStaticPages } from "./signal-page-html.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(APP_ROOT, "../..");
const DIST_DIR = path.join(APP_ROOT, "dist");
const SOURCE_DIR = path.join(APP_ROOT, "public/rss");
const SOURCE_IMAGES_DIR = path.join(APP_ROOT, "public/images/signals/generated");
const PREVIEW_SLUG = "phoenix-venture-studios-rebuild";
const TARGET_ROOT = path.join(WORKSPACE_ROOT, "output/phoenix-previews-upload", PREVIEW_SLUG);
const TARGET_DIR = path.join(TARGET_ROOT, "rss");
const TARGET_IMAGES_DIR = path.join(TARGET_ROOT, "images/signals/generated");
const PREVIEW_SITE_URL = `https://previews.phoenixventurestudios.com/${PREVIEW_SLUG}`;
const RSS_JSON_FILES = [
  "feed.json",
  "tools.json",
  "ai-attention.json",
  "social.json",
  "tools-social.json",
  "ai-attention-social.json",
];
const BUNDLE_MANIFEST_FILE = "bundle-manifest.json";
const REPORT_FILES = [
  "run-report.json",
  "tools-run-report.json",
  "ai-attention-run-report.json",
  "social-run-report.json",
  "tools-social-run-report.json",
  "ai-attention-social-run-report.json",
];

function stableHash(value) {
  return createHash("sha256").update(value).digest("hex");
}

export async function assertBundleManifestMatchesDirectory(sourceDir) {
  const manifestRaw = await fs.readFile(path.join(sourceDir, BUNDLE_MANIFEST_FILE), "utf8").catch(() => "");
  if (!manifestRaw) {
    throw new Error(`Refusing preview publish because ${BUNDLE_MANIFEST_FILE} is missing.`);
  }

  const manifest = JSON.parse(manifestRaw);
  const manifestFiles = manifest?.files && typeof manifest.files === "object" ? manifest.files : {};
  if (!Object.keys(manifestFiles).length) {
    throw new Error(`Refusing preview publish because ${BUNDLE_MANIFEST_FILE} does not describe the generated bundle.`);
  }

  for (const [file, expectedHash] of Object.entries(manifestFiles)) {
    const raw = await fs.readFile(path.join(sourceDir, file)).catch(() => null);
    if (!raw) {
      throw new Error(`Refusing preview publish because ${file} is missing from public/rss.`);
    }
    const actualHash = stableHash(raw);
    if (actualHash !== expectedHash) {
      throw new Error(`Refusing preview publish because ${file} no longer matches ${BUNDLE_MANIFEST_FILE}. Regenerate the full bundle first.`);
    }
  }
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

async function ensurePreviewShell() {
  await fs.mkdir(TARGET_ROOT, { recursive: true });
  const targetShell = path.join(TARGET_ROOT, "index.html");
  const targetExists = await fs.stat(targetShell).then((stat) => stat.isFile() && stat.size > 0).catch(() => false);
  if (targetExists) return { copied: false, path: targetShell };

  const distShell = path.join(DIST_DIR, "index.html");
  const distExists = await fs.stat(distShell).then((stat) => stat.isFile() && stat.size > 0).catch(() => false);
  if (!distExists) {
    throw new Error(`Missing preview app shell at ${targetShell} and build shell at ${distShell}`);
  }

  await fs.copyFile(distShell, targetShell);
  return { copied: true, path: targetShell };
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

async function resetPreviewGeneratedOutputs() {
  await fs.rm(TARGET_DIR, { recursive: true, force: true });
  await fs.rm(TARGET_IMAGES_DIR, { recursive: true, force: true });
  await fs.rm(path.join(TARGET_ROOT, "founder-signal", "signals"), { recursive: true, force: true });
}

export async function assertLatestReportsArePublishable() {
  const supervisedReportPath = path.join(SOURCE_DIR, "generate-run-report.json");
  const supervisedRaw = await fs.readFile(supervisedReportPath, "utf8").catch(() => "");
  if (!supervisedRaw) {
    throw new Error("Refusing preview publish because generate-run-report.json is missing.");
  }

  const supervisedReport = JSON.parse(supervisedRaw);
  if (!supervisedReport.allSafe) {
    throw new Error("Refusing preview publish because generate-run-report.json is not allSafe.");
  }

  await assertBundleManifestMatchesDirectory(SOURCE_DIR);

  for (const reportFile of REPORT_FILES) {
    const reportPath = path.join(SOURCE_DIR, reportFile);
    const raw = await fs.readFile(reportPath, "utf8").catch(() => "");
    if (!raw) {
      throw new Error(`Missing RSS report required for preview publish: ${reportFile}`);
    }

    const report = JSON.parse(raw);
    if (!report.feedValid && !report.preservedPreviousFeed) {
      const validationErrors = Array.isArray(report.validation?.errors) ? report.validation.errors.length : 0;
      throw new Error(`Refusing preview publish because ${reportFile} is not valid${validationErrors ? ` (${validationErrors} validation errors)` : ""}.`);
    }
  }
}

export async function publishPreviewRss() {
  await assertLatestReportsArePublishable();
  const shell = await ensurePreviewShell();
  const items = await readFeedItems();
  await resetPreviewGeneratedOutputs();
  await copyDir(SOURCE_DIR, TARGET_DIR);
  const copiedImages = await copyRequiredGeneratedImages(items);
  const signalPages = await writeSignalStaticPages({
    targetRoot: TARGET_ROOT,
    rssDir: TARGET_DIR,
    siteUrl: PREVIEW_SITE_URL,
  });
  console.log(`Published RSS artifacts to ${TARGET_DIR}`);
  console.log(`Copied generated RSS images: ${copiedImages.count}`);
  if (shell.copied) {
    console.log(`Copied preview app shell from ${DIST_DIR}`);
  }
  if (signalPages.skipped) {
    console.warn(`Static signal pages skipped: ${signalPages.reason}`);
  } else {
    console.log(`Generated static signal pages: ${signalPages.count}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  publishPreviewRss()
    .catch((error) => {
      console.error("Preview RSS publish failed:", error);
      process.exitCode = 1;
    })
    .finally(() => {
      setImmediate(() => process.exit(process.exitCode || 0));
    });
}
