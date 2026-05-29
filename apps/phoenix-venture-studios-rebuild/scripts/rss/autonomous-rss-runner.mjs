import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { buildAllStaticRss } from "./generate-static-rss.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const SCHEDULE_PATH = path.join(APP_ROOT, "rss-data/autonomous-schedule.json");
const HISTORY_PATH = path.join(RSS_DIR, "autonomous-history.json");

function resolveRunSlot(now = new Date()) {
  if (process.env.PHOENIX_RSS_RUN_SLOT) return process.env.PHOENIX_RSS_RUN_SLOT;
  const hour = now.getUTCHours();
  if (hour >= 8 && hour < 12) return "early-morning";
  if (hour >= 12 && hour < 17) return "mid-morning";
  if (hour >= 17 && hour < 23) return "afternoon";
  return "late-night";
}

async function readSchedule() {
  return JSON.parse(await fs.readFile(SCHEDULE_PATH, "utf8"));
}

async function writeRunSummary(summary) {
  await fs.mkdir(RSS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(RSS_DIR, "autonomous-run-report.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

async function appendGithubOutput(values) {
  const outputPath = process.env.GITHUB_OUTPUT;
  if (!outputPath) return;
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  await fs.appendFile(outputPath, `${lines.join("\n")}\n`, "utf8");
}

async function stableFeedSignature() {
  const feedFiles = ["feed.json", "tools.json"];
  const payload = [];

  for (const file of feedFiles) {
    const raw = await fs.readFile(path.join(RSS_DIR, file), "utf8").catch(() => "");
    if (!raw) {
      payload.push({ file, missing: true });
      continue;
    }

    try {
      const feed = JSON.parse(raw);
      payload.push({
        file,
        title: feed.title,
        feedUrl: feed.feed_url,
        items: (feed.items || []).map((item) => {
          const phoenix = item._phoenix || {};
          return {
            title: item.title,
            url: item.url,
            externalUrl: item.external_url,
            image: item.image,
            bucket: phoenix.bucket,
            slug: phoenix.slug,
            originalUrl: phoenix.originalUrl,
            socialImagePath: phoenix.socialImagePath,
            feedRole: phoenix.feedRole,
            simpleSummary: phoenix.simpleSummary,
            trendContext: phoenix.trendContext,
            engagementPrompt: phoenix.engagementPrompt,
            editorialMode: phoenix.editorialMode,
          };
        }),
      });
    } catch (error) {
      payload.push({ file, invalid: true, error: error instanceof Error ? error.message : String(error) });
    }
  }

  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

async function readHistory() {
  const raw = await fs.readFile(HISTORY_PATH, "utf8").catch(() => "");
  if (!raw) return { generatedAt: "", items: [] };
  try {
    const parsed = JSON.parse(raw);
    return { generatedAt: parsed.generatedAt || "", items: Array.isArray(parsed.items) ? parsed.items : [] };
  } catch {
    return { generatedAt: "", items: [] };
  }
}

async function snapshotRssDir() {
  const backupDir = path.join(
    APP_ROOT,
    "tmp",
    `rss-autonomous-backup-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );
  await fs.mkdir(path.dirname(backupDir), { recursive: true });
  await fs.cp(RSS_DIR, backupDir, { recursive: true }).catch(() => null);
  return backupDir;
}

async function restoreRssDir(backupDir) {
  const stat = await fs.stat(backupDir).catch(() => null);
  if (!stat?.isDirectory()) return false;
  await fs.rm(RSS_DIR, { recursive: true, force: true });
  await fs.cp(backupDir, RSS_DIR, { recursive: true });
  return true;
}

async function writeHistory(result, now) {
  const previous = await readHistory();
  const byOriginalUrl = new Map();
  for (const item of previous.items) {
    if (item.originalUrl) byOriginalUrl.set(item.originalUrl, item);
  }

  for (const { report } of result.feeds) {
    for (const item of report.selectedItems || []) {
      const prior = byOriginalUrl.get(item.originalUrl) || {};
      byOriginalUrl.set(item.originalUrl, {
        ...prior,
        title: item.title,
        originalUrl: item.originalUrl,
        internalUrl: item.internalUrl,
        slug: item.slug,
        bucket: item.bucket,
        bucketLabel: item.bucketLabel,
        feedRole: item.feedRole,
        sourceName: item.sourceName,
        lastSeenAt: now.toISOString(),
        firstSeenAt: prior.firstSeenAt || now.toISOString(),
        selectedCount: Number(prior.selectedCount || 0) + 1,
      });
    }
  }

  const items = Array.from(byOriginalUrl.values())
    .sort((a, b) => String(b.lastSeenAt || "").localeCompare(String(a.lastSeenAt || "")))
    .slice(0, 250);

  await fs.writeFile(
    HISTORY_PATH,
    `${JSON.stringify({ generatedAt: now.toISOString(), items }, null, 2)}\n`,
    "utf8",
  );
  return items.length;
}

async function main() {
  const now = new Date();
  const schedule = await readSchedule();
  const runSlot = resolveRunSlot(now);
  const slot = schedule.slots.find((candidate) => candidate.id === runSlot) || { id: runSlot };
  const siteUrl = process.env.PHOENIX_RSS_SITE_URL || process.env.SITE_URL || "https://phoenixventurestudios.com";
  const backupDir = await snapshotRssDir();
  const history = await readHistory();
  const previousSignature = await stableFeedSignature();

  const result = await buildAllStaticRss({ now, siteUrl, recentItems: history.items });
  let restoredPreviousOutput = false;
  let historyItems = history.items.length;
  let currentSignature = previousSignature;
  let outputChanged = false;
  if (result.allValid) {
    historyItems = await writeHistory(result, now);
    currentSignature = await stableFeedSignature();
    outputChanged = previousSignature !== currentSignature;
  } else {
    restoredPreviousOutput = await restoreRssDir(backupDir);
  }
  const summary = {
    generatedAt: now.toISOString(),
    runSlot,
    slot,
    siteUrl,
    backupDir,
    restoredPreviousOutput,
    historyItems,
    outputChanged,
    signatures: {
      previous: previousSignature,
      current: currentSignature,
    },
    publishPolicy: schedule.publishPolicy,
    allValid: result.allValid,
    feeds: result.feeds.map(({ report }) => ({
      feedId: report.feedId,
      title: report.title,
      feedValid: report.feedValid,
      preservedPreviousFeed: report.preservedPreviousFeed,
      selected: report.items.selected,
      sourceErrors: report.sources.errors.length,
      socialCardErrors: report.images.errors.length,
      manualReviewNeeded: report.images.manualReviewNeeded,
      varietyErrors: report.images.variety.errors.length,
      editorialErrors: report.editorial.errors.length,
      editorialWarnings: report.editorial.warnings.length,
      copyWarnings: report.copy.warnings.length,
      aliases: report.aliases.written,
    })),
  };

  await writeRunSummary(summary);
  await appendGithubOutput({
    output_changed: outputChanged ? "true" : "false",
    all_valid: result.allValid ? "true" : "false",
  });

  for (const feed of summary.feeds) {
    console.log(
      `Phoenix autonomous RSS [${feed.feedId}/${runSlot}]: selected=${feed.selected} valid=${feed.feedValid} sourceErrors=${feed.sourceErrors} editorialErrors=${feed.editorialErrors}`,
    );
  }
  console.log(`Phoenix autonomous RSS output changed: ${outputChanged ? "yes" : "no"}`);

  if (!result.allValid) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("Phoenix autonomous RSS run failed:", error);
  process.exitCode = 1;
});
