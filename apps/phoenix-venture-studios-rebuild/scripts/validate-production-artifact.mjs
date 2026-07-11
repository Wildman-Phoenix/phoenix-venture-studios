import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DIST = path.join(APP_ROOT, "dist");
const metadata = JSON.parse(await fs.readFile(path.join(APP_ROOT, "src/config/phoenix-route-metadata.json"), "utf8"));
const errors = [];
const files = [];

async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(target);
    else if (entry.isFile()) files.push(target);
  }
}
await walk(DIST);
if (files.length > 18000) errors.push(`Deployment contains ${files.length} files; 18,000 safety threshold exceeded`);
for (const file of files) {
  const stat = await fs.stat(file);
  if (stat.size > 24 * 1024 * 1024) errors.push(`${path.relative(DIST, file)} exceeds the 24 MiB safety threshold`);
}

const titles = new Map();
for (const [route, expected] of Object.entries(metadata)) {
  const file = route === "/" ? path.join(DIST, "index.html") : path.join(DIST, `${route.slice(1)}.html`);
  const html = await fs.readFile(file, "utf8").catch(() => "");
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i)?.[1];
  const title = html.match(/<title>([^<]+)/i)?.[1];
  const robots = html.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)/i)?.[1] || "";
  if (!html) errors.push(`Missing static route artifact for ${route}`);
  if (canonical !== `https://phoenixventurestudios.com${route === "/" ? "/" : route}`) errors.push(`Incorrect canonical for ${route}`);
  if (!html.includes('property="og:url"') || !html.includes('name="twitter:title"')) errors.push(`Missing social metadata for ${route}`);
  if (expected.index && !robots.includes("index")) errors.push(`Indexable route ${route} is not marked indexable`);
  if (!expected.index && !robots.includes("noindex")) errors.push(`Private/utility route ${route} is not marked noindex`);
  if (title) titles.set(title, [...(titles.get(title) || []), route]);
}
for (const [title, routes] of titles) if (routes.length > 1) errors.push(`Duplicate title '${title}' on ${routes.join(", ")}`);

const redirects = await fs.readFile(path.join(DIST, "_redirects"), "utf8");
for (const line of redirects.split(/\r?\n/).filter(Boolean)) {
  const [from, to] = line.trim().split(/\s+/);
  if (from === to) errors.push(`Redirect loop: ${line}`);
}
const headers = await fs.readFile(path.join(DIST, "_headers"), "utf8");
for (const required of ["Content-Security-Policy", "Permissions-Policy", "X-Content-Type-Options", "Referrer-Policy", "Strict-Transport-Security"]) {
  if (!headers.includes(required)) errors.push(`Deployment security headers are missing ${required}`);
}

const publicManifest = JSON.parse(await fs.readFile(path.join(APP_ROOT, "public/rss/bundle-manifest.json"), "utf8"));
for (const [file, expectedHash] of Object.entries(publicManifest.files || {})) {
  const raw = await fs.readFile(path.join(DIST, "rss", file)).catch(() => null);
  if (!raw) errors.push(`Deployment is missing manifested RSS file ${file}`);
  else if (createHash("sha256").update(raw).digest("hex") !== expectedHash) errors.push(`Deployment RSS hash mismatch: ${file}`);
}

for (const htmlFile of files.filter((file) => file.endsWith(".html"))) {
  const html = await fs.readFile(htmlFile, "utf8");
  if (/HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN|SUPABASE_SERVICE_ROLE_KEY|CLOUDFLARE_API_TOKEN/.test(html)) {
    errors.push(`Private credential marker found in ${path.relative(DIST, htmlFile)}`);
  }
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Phoenix production artifact passed: ${files.length} files, route metadata, redirect, manifest, size, and secret-marker gates.`);
}
