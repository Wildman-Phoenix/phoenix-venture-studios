import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeSignalStaticPages } from "./signal-page-html.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(APP_ROOT, "../..");
const SOURCE_DIR = path.join(APP_ROOT, "public/rss");
const SOURCE_IMAGES_DIR = path.join(APP_ROOT, "public/images/signals/generated");
const PREVIEW_SLUG = "phoenix-venture-studios-rebuild";
const TARGET_ROOT = path.join(WORKSPACE_ROOT, "output/phoenix-previews-upload", PREVIEW_SLUG);
const TARGET_DIR = path.join(TARGET_ROOT, "rss");
const TARGET_IMAGES_DIR = path.join(TARGET_ROOT, "images/signals/generated");
const PREVIEW_SITE_URL = `https://previews.phoenixventurestudios.com/${PREVIEW_SLUG}`;
const REPORT_FILES = ["run-report.json", "tools-run-report.json", "ai-attention-run-report.json"];

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

async function assertLatestReportsArePublishable() {
  for (const reportFile of REPORT_FILES) {
    const reportPath = path.join(SOURCE_DIR, reportFile);
    const raw = await fs.readFile(reportPath, "utf8").catch(() => "");
    if (!raw) {
      throw new Error(`Missing RSS report required for preview publish: ${reportFile}`);
    }

    const report = JSON.parse(raw);
    if (!report.feedValid) {
      const validationErrors = Array.isArray(report.validation?.errors) ? report.validation.errors.length : 0;
      throw new Error(`Refusing preview publish because ${reportFile} is not valid${validationErrors ? ` (${validationErrors} validation errors)` : ""}.`);
    }
  }
}

try {
  await assertLatestReportsArePublishable();
  await copyDir(SOURCE_DIR, TARGET_DIR);
  await copyDir(SOURCE_IMAGES_DIR, TARGET_IMAGES_DIR);
  const signalPages = await writeSignalStaticPages({
    targetRoot: TARGET_ROOT,
    rssDir: TARGET_DIR,
    siteUrl: PREVIEW_SITE_URL,
  });
  console.log(`Published RSS artifacts to ${TARGET_DIR}`);
  if (signalPages.skipped) {
    console.warn(`Static signal pages skipped: ${signalPages.reason}`);
  } else {
    console.log(`Generated static signal pages: ${signalPages.count}`);
  }
} catch (error) {
  console.error("Preview RSS publish failed:", error);
  process.exitCode = 1;
}
