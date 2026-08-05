import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(APP_ROOT, "../..");
const DEFAULT_HUB_DIR = path.join(WORKSPACE_ROOT, "output/phoenix-previews-upload");

export const PREVIEW_FUNCTION_ROUTES = Object.freeze({
  version: 1,
  include: ["/api/*"],
  exclude: [],
});

const EXPECTED_JSON = `${JSON.stringify(PREVIEW_FUNCTION_ROUTES, null, 2)}\n`;
const ROBOTS_TXT = "User-agent: *\nDisallow: /\n";
const GLOBAL_NOINDEX_HEADER = "X-Robots-Tag: noindex, nofollow, noarchive";
const GLOBAL_NOINDEX_BLOCK = `/*\n  ${GLOBAL_NOINDEX_HEADER}\n`;

function isExactPreviewRoutes(value) {
  return value?.version === PREVIEW_FUNCTION_ROUTES.version
    && Array.isArray(value.include)
    && value.include.length === 1
    && value.include[0] === PREVIEW_FUNCTION_ROUTES.include[0]
    && Array.isArray(value.exclude)
    && value.exclude.length === 0;
}

function hasGlobalNoindex(headers) {
  let activePath = "";
  for (const line of headers.split("\n")) {
    if (line.trim() && !/^\s/.test(line)) {
      activePath = line.trim();
      continue;
    }
    if (activePath === "/*" && line.trim() === GLOBAL_NOINDEX_HEADER) return true;
  }
  return false;
}

export async function writePreviewRoutes(hubDir = DEFAULT_HUB_DIR) {
  await fs.mkdir(hubDir, { recursive: true });
  const routesPath = path.join(hubDir, "_routes.json");
  await fs.writeFile(routesPath, EXPECTED_JSON);
  return routesPath;
}

export async function assertPreviewRoutes(hubDir = DEFAULT_HUB_DIR) {
  const routesPath = path.join(hubDir, "_routes.json");
  const raw = await fs.readFile(routesPath, "utf8").catch(() => "");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Missing or invalid preview routing guard at ${routesPath}`);
  }

  if (!isExactPreviewRoutes(parsed)) {
    throw new Error(`Unsafe preview routing guard at ${routesPath}; only /api/* may invoke Functions.`);
  }

  return routesPath;
}

export async function writePreviewGuards(hubDir = DEFAULT_HUB_DIR) {
  const routesPath = await writePreviewRoutes(hubDir);
  const headersPath = path.join(hubDir, "_headers");
  const existingHeaders = await fs.readFile(headersPath, "utf8").catch(() => "");
  if (!hasGlobalNoindex(existingHeaders)) {
    const separator = existingHeaders.trim() ? `\n${existingHeaders.trimStart()}` : "";
    await fs.writeFile(headersPath, `${GLOBAL_NOINDEX_BLOCK}${separator}`);
  }
  await fs.writeFile(path.join(hubDir, "robots.txt"), ROBOTS_TXT);
  return routesPath;
}

export async function assertPreviewGuards(hubDir = DEFAULT_HUB_DIR) {
  const routesPath = await assertPreviewRoutes(hubDir);
  const headers = await fs.readFile(path.join(hubDir, "_headers"), "utf8").catch(() => "");
  const robots = await fs.readFile(path.join(hubDir, "robots.txt"), "utf8").catch(() => "");
  if (!hasGlobalNoindex(headers)) {
    throw new Error(`Missing global noindex header in ${path.join(hubDir, "_headers")}`);
  }
  if (robots !== ROBOTS_TXT) {
    throw new Error(`Missing private-preview robots policy at ${path.join(hubDir, "robots.txt")}`);
  }
  return routesPath;
}

if (process.argv[1] === SCRIPT_PATH) {
  const checkOnly = process.argv.includes("--check");
  const action = checkOnly ? assertPreviewGuards : writePreviewGuards;
  action()
    .then((routesPath) => {
      console.log(`${checkOnly ? "Verified" : "Wrote"} static preview routing guard: ${routesPath}`);
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
