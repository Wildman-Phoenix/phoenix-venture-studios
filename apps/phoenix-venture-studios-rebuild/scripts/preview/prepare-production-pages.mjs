import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeSignalStaticPages } from "../rss/signal-page-html.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DIST_DIR = path.join(APP_ROOT, "dist");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const REDIRECTS_PATH = path.join(DIST_DIR, "_redirects");
const DEFAULT_SITE_URL = "https://phoenixventurestudios.com";
const DEFAULT_PROJECT_NAME = "phoenixventurestudios-com";
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const APP_SHELL_TARGET = "/";
const APP_ROUTES = [
  "funding",
  "snapshot",
  "market-intelligence",
  "ai-overview",
  "studio",
  "founder-signal",
  "about",
  "contact",
  "privacy",
  "terms",
  "insights",
  "unsubscribe",
  "founder-signal/preferences",
];

function fail(message) {
  console.error(`Production Pages prepare failed: ${message}`);
  process.exit(1);
}

function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
  return String(value || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`missing required environment variable ${name}`);
  return value;
}

function resolveTurnstileSiteKey() {
  const value = requireEnv("VITE_TURNSTILE_SITE_KEY");
  const usingTestKey = value === TURNSTILE_TEST_SITE_KEY;
  const allowTestKey = process.env.ALLOW_TEST_TURNSTILE === "1";

  if (usingTestKey && !allowTestKey) {
    fail(
      "refusing to prepare a production Pages artifact with Cloudflare's test Turnstile site key; set ALLOW_TEST_TURNSTILE=1 only for non-cutover staging smoke tests",
    );
  }

  return { value, usingTestKey };
}

async function writeRedirects() {
  const lines = [
    ...APP_ROUTES.flatMap((route) => [
      `/${route}  ${APP_SHELL_TARGET}  200`,
      `/${route}/  ${APP_SHELL_TARGET}  200`,
    ]),
    `/intelligence/*  ${APP_SHELL_TARGET}  200`,
  ];

  await fs.writeFile(REDIRECTS_PATH, `${lines.join("\n")}\n`, "utf8");
}

function printNextSteps({ siteUrl, projectName, signalPages, usingTestTurnstile }) {
  console.log("");
  console.log("Production Pages artifact prepared.");
  console.log(`App root: ${APP_ROOT}`);
  console.log(`Dist path: ${DIST_DIR}`);
  console.log(`Site URL: ${siteUrl}`);
  console.log(`Generated static signal pages: ${signalPages.count}`);
  if (usingTestTurnstile) {
    console.log("WARNING: this artifact uses Cloudflare's Turnstile test site key.");
    console.log("Do not cut DNS to this build. Replace with the real production Turnstile widget before go-live.");
  }
  console.log("");
  console.log("Suggested manual deploy command:");
  console.log(`  wrangler pages deploy ${DIST_DIR} --project-name ${projectName}`);
  console.log("");
  console.log("Expected Pages env values at deploy time:");
  console.log("  VITE_BASE_PATH=/");
  console.log(`  PHOENIX_RSS_SITE_URL=${siteUrl}`);
}

async function main() {
  const viteSupabaseUrl = requireEnv("VITE_SUPABASE_URL");
  const viteSupabasePublishableKey = requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY");
  const turnstile = resolveTurnstileSiteKey();
  const siteUrl = normalizeSiteUrl(process.env.PHOENIX_RSS_SITE_URL || DEFAULT_SITE_URL);
  const projectName = process.env.CLOUDFLARE_PAGES_PROJECT || DEFAULT_PROJECT_NAME;

  if (siteUrl !== DEFAULT_SITE_URL) {
    fail(`PHOENIX_RSS_SITE_URL must be ${DEFAULT_SITE_URL} for production prep; received ${siteUrl}`);
  }

  execFileSync("npm", ["run", "build"], {
    cwd: APP_ROOT,
    env: {
      ...process.env,
      VITE_BASE_PATH: "/",
      VITE_SUPABASE_URL: viteSupabaseUrl,
      VITE_SUPABASE_PUBLISHABLE_KEY: viteSupabasePublishableKey,
      VITE_TURNSTILE_SITE_KEY: turnstile.value,
      PHOENIX_RSS_SITE_URL: siteUrl,
    },
    stdio: "inherit",
  });

  const signalPages = await writeSignalStaticPages({
    targetRoot: DIST_DIR,
    rssDir: RSS_DIR,
    siteUrl,
  });

  await writeRedirects();
  printNextSteps({ siteUrl, projectName, signalPages, usingTestTurnstile: turnstile.usingTestKey });
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
