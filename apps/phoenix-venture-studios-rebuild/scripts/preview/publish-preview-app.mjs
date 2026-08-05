import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeSignalStaticPages } from "../rss/signal-page-html.mjs";
import { writePreviewGuards } from "./ensure-preview-routes.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(APP_ROOT, "../..");
const DIST_DIR = path.join(APP_ROOT, "dist");
const HUB_DIR = path.join(WORKSPACE_ROOT, "output/phoenix-previews-upload");
const PREVIEW_SLUG = "phoenix-venture-studios-rebuild";
const PREVIEW_BASE = `/${PREVIEW_SLUG}/`;
const TARGET_DIR = path.join(HUB_DIR, PREVIEW_SLUG);
const REDIRECTS_PATH = path.join(HUB_DIR, "_redirects");
const HUB_INDEX_PATH = path.join(HUB_DIR, "index.html");
const APP_FAVICON_PATH = path.join(APP_ROOT, "public/favicon.ico");
const HUB_FAVICON_PATH = path.join(HUB_DIR, "favicon.ico");
const PREVIEW_SITE_URL = `https://previews.phoenixventurestudios.com/${PREVIEW_SLUG}`;

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

function readDatalessPublicFiles() {
  if (process.platform !== "darwin") return new Set();
  try {
    const output = execFileSync(
      "/usr/bin/find",
      [path.join(APP_ROOT, "public"), "-type", "f", "-exec", "/usr/bin/stat", "-f", "%Sf|%N", "{}", "+"],
      { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
    );
    return new Set(
      output
        .split("\n")
        .filter((line) => line.startsWith("compressed,dataless|"))
        .map((line) => line.slice(line.indexOf("|") + 1)),
    );
  } catch {
    return new Set();
  }
}

async function copyAvailablePublicDir(sourceDir, targetDir, datalessFiles) {
  await fs.mkdir(targetDir, { recursive: true });
  const entries = await fs.readdir(sourceDir, { withFileTypes: true });
  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await copyAvailablePublicDir(sourcePath, targetPath, datalessFiles);
    } else if (entry.isFile() && !datalessFiles.has(sourcePath)) {
      await fs.copyFile(sourcePath, targetPath);
    }
  }
}

async function cleanTargetPreservingRss() {
  await fs.mkdir(TARGET_DIR, { recursive: true });
  const entries = await fs.readdir(TARGET_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "rss") continue;
    await fs.rm(path.join(TARGET_DIR, entry.name), { recursive: true, force: true });
  }
}

async function ensureRedirects() {
  const existing = await fs.readFile(REDIRECTS_PATH, "utf8").catch(() => "");
  const appShellTarget = `/${PREVIEW_SLUG}/`;
  const routeRegistry = JSON.parse(await fs.readFile(path.join(APP_ROOT, "src/config/phoenix-routes.json"), "utf8"));
  const appRoutes = [...new Set([
    ...Object.values(routeRegistry)
      .filter((route) => route !== "/" && !route.includes(":"))
      .map((route) => route.replace(/^\//, "")),
    "insights",
  ])];
  const required = [
    `/${PREVIEW_SLUG}  /${PREVIEW_SLUG}/  301`,
    ...appRoutes.flatMap((route) => [
      `/${PREVIEW_SLUG}/${route}  ${appShellTarget}  200`,
      `/${PREVIEW_SLUG}/${route}/  ${appShellTarget}  200`,
    ]),
    `/${PREVIEW_SLUG}/intelligence/*  ${appShellTarget}  200`,
  ];
  const preserved = existing
    .split("\n")
    .filter((line) => line.trim() && !line.trimStart().startsWith(`/${PREVIEW_SLUG}`));
  const next = `${[...preserved, ...required].join("\n")}\n`;
  await fs.writeFile(REDIRECTS_PATH, next);
}

async function ensureHubCard() {
  const html = await fs.readFile(HUB_INDEX_PATH, "utf8").catch(() => "");
  if (!html || html.includes(`href="./${PREVIEW_SLUG}/"`)) return;

  const card = `\n        <a class="card" href="./${PREVIEW_SLUG}/">\n          <span>\n            <strong>Phoenix Venture Studios Rebuild</strong>\n            Capital + AI Studio website preview with RSS intelligence, funding paths, studio services, and Founder Signal signup.\n          </span>\n          <em class="status">Live preview</em>\n        </a>\n`;
  const marker = "      </section>";
  await fs.writeFile(HUB_INDEX_PATH, html.replace(marker, `${card}${marker}`));
}

async function ensureHubFavicon() {
  await fs.copyFile(APP_FAVICON_PATH, HUB_FAVICON_PATH).catch(() => {});
}

async function ensureAppNotFoundShell() {
  await fs.copyFile(path.join(TARGET_DIR, "index.html"), path.join(TARGET_DIR, "404.html"));
}

try {
  const datalessPublicFiles = readDatalessPublicFiles();
  execFileSync("npm", ["run", "build"], {
    cwd: APP_ROOT,
    env: { ...process.env, VITE_BASE_PATH: PREVIEW_BASE, PHOENIX_SKIP_PUBLIC_COPY: "1" },
    stdio: "inherit",
  });

  await copyAvailablePublicDir(path.join(APP_ROOT, "public"), DIST_DIR, datalessPublicFiles);

  await cleanTargetPreservingRss();
  const signalPages = await writeSignalStaticPages({
    targetRoot: DIST_DIR,
    rssDir: path.join(APP_ROOT, "public/rss"),
    siteUrl: PREVIEW_SITE_URL,
  });
  await copyDir(DIST_DIR, TARGET_DIR);
  await ensureAppNotFoundShell();
  await ensureRedirects();
  await ensureHubCard();
  await ensureHubFavicon();
  await writePreviewGuards(HUB_DIR);

  console.log(`Published app preview to ${TARGET_DIR}`);
  console.log(`Preview base path: ${PREVIEW_BASE}`);
  console.log(`Generated static signal pages: ${signalPages.count}`);
  if (datalessPublicFiles.size) {
    console.log(`Skipped ${datalessPublicFiles.size} unavailable local-only public placeholders; current RSS images were verified local before staging.`);
  }
} catch (error) {
  console.error("Preview app publish failed:", error);
  process.exitCode = 1;
}
