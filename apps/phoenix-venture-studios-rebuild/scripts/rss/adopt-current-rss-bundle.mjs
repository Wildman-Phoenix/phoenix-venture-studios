import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DEFAULT_FEED_CONFIGS } from "./generate-static-rss.mjs";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const generatedAt = new Date().toISOString();

execFileSync(process.execPath, [path.join(APP_ROOT, "scripts/rss/validate-rss-output.mjs")], {
  cwd: APP_ROOT,
  stdio: "inherit",
});

const feeds = [];
const files = new Set(["generate-run-report.json", "autonomous-history.json"]);
for (const config of DEFAULT_FEED_CONFIGS) {
  const outputFiles = config.outputFiles || {};
  const reportFile = outputFiles.reportJson;
  const report = JSON.parse(await fs.readFile(path.join(RSS_DIR, reportFile), "utf8"));
  if (!report.feedValid && !report.preservedPreviousFeed) {
    throw new Error(`Cannot adopt current bundle because ${reportFile} is not publishable.`);
  }
  feeds.push({
    feedId: config.id,
    feedValid: Boolean(report.feedValid),
    preservedPreviousFeed: Boolean(report.preservedPreviousFeed),
    selected: report.items?.selected || 0,
  });
  for (const file of Object.values(outputFiles)) if (typeof file === "string") files.add(file);
}

const runReport = {
  generatedAt,
  startedAt: generatedAt,
  finishedAt: generatedAt,
  allSafe: true,
  allFresh: feeds.every((feed) => feed.feedValid),
  preservedCount: feeds.filter((feed) => feed.preservedPreviousFeed).length,
  timeoutCount: 0,
  historyUpdated: false,
  baselineAdoption: true,
  feeds,
};
await fs.writeFile(path.join(RSS_DIR, "generate-run-report.json"), `${JSON.stringify(runReport, null, 2)}\n`, "utf8");

const hashes = {};
for (const file of [...files].sort()) {
  const raw = await fs.readFile(path.join(RSS_DIR, file)).catch(() => null);
  if (!raw) throw new Error(`Cannot adopt current bundle because ${file} is missing.`);
  hashes[file] = createHash("sha256").update(raw).digest("hex");
}
const manifest = { generatedAt, runId: `baseline-${generatedAt}`, baselineAdoption: true, files: hashes };
await fs.writeFile(path.join(RSS_DIR, "bundle-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
console.log(`Adopted validated current RSS bundle with ${Object.keys(hashes).length} SHA-256 entries.`);
