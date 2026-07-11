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
const SITEMAP_PATH = path.join(DIST_DIR, "sitemap.xml");
const DEFAULT_SITE_URL = "https://phoenixventurestudios.com";
const DEFAULT_PROJECT_NAME = "phoenixventurestudios-com";
const TURNSTILE_TEST_SITE_KEY = "1x00000000000000000000AA";
const APP_SHELL_TARGET = "/";
const ROUTE_REGISTRY = JSON.parse(await fs.readFile(path.join(APP_ROOT, "src/config/phoenix-routes.json"), "utf8"));
const ROUTE_METADATA = JSON.parse(await fs.readFile(path.join(APP_ROOT, "src/config/phoenix-route-metadata.json"), "utf8"));

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
    `https://www.phoenixventurestudios.com/*  ${DEFAULT_SITE_URL}/:splat  301!`,
    `/insights  /market-intelligence  301`,
    `/insights/  /market-intelligence  301`,
    `/intelligence/*  ${APP_SHELL_TARGET}  200`,
  ];

  await fs.writeFile(REDIRECTS_PATH, `${lines.join("\n")}\n`, "utf8");
}

function writeMetaValue(html, attribute, key, content) {
  const escaped = String(content).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const pattern = new RegExp(`<meta\\s+${attribute}=["']${key.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}["']\\s+content=["'][^"']*["']\\s*\\/?>`, "i");
  const replacement = `<meta ${attribute}="${key}" content="${escaped}">`;
  return pattern.test(html) ? html.replace(pattern, replacement) : html.replace("</head>", `  ${replacement}\n</head>`);
}

function renderRouteHtml(shell, route, metadata, siteUrl) {
  const canonical = `${siteUrl}${route === "/" ? "/" : route}`;
  let html = shell.replace(/<title>[^<]*<\/title>/i, `<title>${metadata.title}</title>`);
  html = html.replace(/<link\s+rel=["']canonical["']\s+href=["'][^"']+["']\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`);
  html = writeMetaValue(html, "name", "description", metadata.description);
  html = writeMetaValue(html, "property", "og:url", canonical);
  html = writeMetaValue(html, "property", "og:title", metadata.title);
  html = writeMetaValue(html, "property", "og:description", metadata.description);
  html = writeMetaValue(html, "name", "twitter:title", metadata.title);
  html = writeMetaValue(html, "name", "twitter:description", metadata.description);
  html = writeMetaValue(html, "name", "robots", metadata.index ? "index,follow" : "noindex,nofollow");
  return html;
}

async function writeStaticRoutePages(siteUrl) {
  for (const route of Object.values(ROUTE_REGISTRY)) {
    if (!route.includes(":") && !ROUTE_METADATA[route]) {
      throw new Error(`Missing deployment metadata for canonical route ${route}`);
    }
  }
  const shellPath = path.join(DIST_DIR, "index.html");
  const shell = await fs.readFile(shellPath, "utf8");
  for (const [route, metadata] of Object.entries(ROUTE_METADATA)) {
    const html = renderRouteHtml(shell, route, metadata, siteUrl);
    if (route === "/") {
      await fs.writeFile(shellPath, html, "utf8");
      continue;
    }
    const target = path.join(DIST_DIR, `${route.replace(/^\//, "")}.html`);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, html, "utf8");
  }
}

function xmlEscape(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function buildSignalUrls(siteUrl) {
  const feedFiles = [
    "feed.json",
    "social.json",
    "tools.json",
    "tools-social.json",
    "ai-attention.json",
    "ai-attention-social.json",
  ];
  const urls = new Set();

  for (const file of feedFiles) {
    const raw = await fs.readFile(path.join(RSS_DIR, file), "utf8").catch(() => "");
    if (!raw) continue;

    const feed = JSON.parse(raw);
    for (const item of feed.items || []) {
      const candidate = item.url || item._phoenix?.internalUrl || "";
      if (candidate.startsWith(`${siteUrl}/founder-signal/signals/`)) {
        urls.add(candidate);
      }
    }
  }

  return [...urls].sort();
}

async function writeSitemap(siteUrl) {
  const staticEntries = [
    { url: `${siteUrl}/`, changefreq: "weekly", priority: "1.0" },
    { url: `${siteUrl}/snapshot`, changefreq: "monthly", priority: "0.9" },
    { url: `${siteUrl}/funding`, changefreq: "monthly", priority: "0.9" },
    { url: `${siteUrl}/market-intelligence`, changefreq: "daily", priority: "0.8" },
    { url: `${siteUrl}/founder-signal`, changefreq: "daily", priority: "0.8" },
    { url: `${siteUrl}/ai-overview`, changefreq: "weekly", priority: "0.7" },
    { url: `${siteUrl}/studio`, changefreq: "weekly", priority: "0.7" },
    { url: `${siteUrl}/about`, changefreq: "monthly", priority: "0.6" },
    { url: `${siteUrl}/contact`, changefreq: "monthly", priority: "0.6" },
    { url: `${siteUrl}/privacy`, changefreq: "yearly", priority: "0.3" },
    { url: `${siteUrl}/terms`, changefreq: "yearly", priority: "0.3" },
    { url: `${siteUrl}/unsubscribe`, changefreq: "yearly", priority: "0.2" },
    { url: `${siteUrl}/founder-signal/preferences`, changefreq: "yearly", priority: "0.2" },
  ];

  const signalUrls = await buildSignalUrls(siteUrl);
  const signalEntries = signalUrls.map((url) => ({
    url,
    changefreq: "daily",
    priority: "0.7",
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...staticEntries, ...signalEntries].map((entry) => `  <url>\n    <loc>${xmlEscape(entry.url)}</loc>\n    <changefreq>${entry.changefreq}</changefreq>\n    <priority>${entry.priority}</priority>\n  </url>`).join("\n")}\n</urlset>\n`;
  await fs.writeFile(SITEMAP_PATH, xml, "utf8");
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

  await writeStaticRoutePages(siteUrl);
  await writeRedirects();
  await writeSitemap(siteUrl);
  printNextSteps({ siteUrl, projectName, signalPages, usingTestTurnstile: turnstile.usingTestKey });
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
