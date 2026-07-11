import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { runSupervisedGeneration } from "./supervised-static-rss.mjs";
import { DEFAULT_FEED_CONFIGS } from "./generate-static-rss.mjs";
import { buildImageReviewQueue } from "./image-review-queue.mjs";
import { buildImageReviewRepository } from "./image-review-repository.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const SCHEDULE_PATH = path.join(APP_ROOT, "rss-data/autonomous-schedule.json");
const HISTORY_PATH = path.join(RSS_DIR, "autonomous-history.json");
const IMAGE_REVIEW_MEMORY_PATH = path.join(RSS_DIR, "image-review-memory.json");
const IMAGE_REVIEW_QUEUE_PATH = path.join(RSS_DIR, "image-review-queue.json");
const IMAGE_REVIEW_REPOSITORY_PATH = path.join(RSS_DIR, "image-review-repository.json");

export function resolveRunSlot(now = new Date()) {
  if (process.env.PHOENIX_RSS_RUN_SLOT) return process.env.PHOENIX_RSS_RUN_SLOT;
  const hour = Number(new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    hour12: false,
    timeZone: "America/Detroit",
  }).format(now));
  if (hour >= 5 && hour < 10) return "early-morning";
  if (hour >= 10 && hour < 16) return "mid-morning";
  if (hour >= 16 && hour < 22) return "afternoon";
  return "late-night";
}

export function feedConfigsForRunSlot(runSlot) {
  const archiveIds = new Set(["founder-market", "founder-tools", "ai-attention"]);
  const socialIdBySlot = {
    "early-morning": "founder-market-social",
    "mid-morning": "founder-tools-social",
    "afternoon": "ai-attention-social",
    "late-night": null,
    "friday-ai-trend-sweep": null,
    manual: null,
  };
  if (!(runSlot in socialIdBySlot)) throw new Error(`Unknown Phoenix RSS run slot: ${runSlot}`);
  const socialId = socialIdBySlot[runSlot];
  return DEFAULT_FEED_CONFIGS.filter((config) => archiveIds.has(config.id) || config.id === socialId);
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
  const feedFiles = [
    "feed.json",
    "tools.json",
    "ai-attention.json",
    "social.json",
    "tools-social.json",
    "ai-attention-social.json",
  ];
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

async function readImageReviewMemory() {
  const raw = await fs.readFile(IMAGE_REVIEW_MEMORY_PATH, "utf8").catch(() => "");
  if (!raw) return { generatedAt: "", entries: [] };
  try {
    const parsed = JSON.parse(raw);
    return {
      generatedAt: parsed.generatedAt || "",
      entries: Array.isArray(parsed.entries) ? parsed.entries : [],
    };
  } catch {
    return { generatedAt: "", entries: [] };
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
      const feedIds = new Set(Array.isArray(prior.feedIds) ? prior.feedIds : []);
      if (report.feedId) feedIds.add(report.feedId);
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
        feedIds: Array.from(feedIds).sort(),
        lastSeenAt: now.toISOString(),
        firstSeenAt: prior.firstSeenAt || now.toISOString(),
        selectedCount: Number(prior.selectedCount || 0) + 1,
        socialImagePath: item.socialImagePath || prior.socialImagePath || "",
        imageStrategy: item.imageStrategy || prior.imageStrategy || "",
        imageFamily: item.imageFamily || prior.imageFamily || "",
        imageVariant: item.imageVariant || prior.imageVariant || "",
        imageTone: item.imageTone || prior.imageTone || "",
        imageComposition: item.imageComposition || prior.imageComposition || "",
        sceneLane: item.sceneLane || prior.sceneLane || "",
        sceneMotif: item.sceneMotif || prior.sceneMotif || "",
        imageFingerprint: item.imageFingerprint || prior.imageFingerprint || "",
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

async function writeImageReviewMemory(result, now) {
  const previous = await readImageReviewMemory();
  const cutoff = now.getTime() - (45 * 24 * 60 * 60 * 1000);
  const retained = (previous.entries || []).filter((entry) => {
    const stamp = Date.parse(entry.recordedAt || "");
    return Number.isFinite(stamp) && stamp >= cutoff;
  });

  const incoming = [];
  for (const { report } of result.feeds) {
    for (const item of report.selectedItems || []) {
      if (!item.imageAudit) continue;
      incoming.push({
        recordedAt: now.toISOString(),
        feedId: report.feedId,
        title: item.title,
        originalUrl: item.originalUrl,
        sourceName: item.sourceName || "",
        sceneLane: item.sceneLane || "",
        reviewMode: item.imageSourceType === "phoenix-owned" ? "phoenix-owned" : "source-image",
        outcome: "approved",
        imageStrategy: item.imageStrategy || "",
        imageSourceType: item.imageSourceType || "",
        imageFingerprint: item.imageFingerprint || "",
        imageVisualHash: item.imageVisualHash || "",
        holdReason: "",
        metrics: {
          colorfulness: item.imageAudit.colorfulness,
          sharpness: item.imageAudit.sharpness,
          luminanceStdDev: item.imageAudit.luminanceStdDev,
          readability: item.imageAudit.bestComposition?.readability ?? 0,
        },
        editorialNotes: item.imageAudit.editorialNotes || [],
        recommendedFixes: item.imageAudit.recommendedFixes || [],
        editorialModelReview: item.imageAudit.editorialModelReview || null,
      });
    }
    for (const item of report.heldItems || []) {
      if (!item.imageAudit) continue;
      incoming.push({
        recordedAt: now.toISOString(),
        feedId: report.feedId,
        title: item.title,
        originalUrl: item.sourceUrl || "",
        sourceName: item.sourceName || "",
        sceneLane: item.sceneLane || "",
        reviewMode: item.imageSourceType === "phoenix-owned" ? "phoenix-owned" : "source-image",
        outcome: "rejected",
        imageStrategy: item.imageStrategy || "",
        imageSourceType: item.imageSourceType || "",
        imageFingerprint: item.imageFingerprint || "",
        imageVisualHash: item.imageVisualHash || "",
        holdReason: item.holdReason || "",
        metrics: {
          colorfulness: item.imageAudit.colorfulness,
          sharpness: item.imageAudit.sharpness,
          luminanceStdDev: item.imageAudit.luminanceStdDev,
          readability: item.imageAudit.bestComposition?.readability ?? 0,
        },
        editorialNotes: item.imageAudit.editorialNotes || [],
        recommendedFixes: item.imageAudit.recommendedFixes || [],
        editorialModelReview: item.imageAudit.editorialModelReview || null,
      });
    }
  }

  const deduped = new Map();
  for (const entry of [...retained, ...incoming]) {
    const day = String(entry.recordedAt || "").slice(0, 10);
    const key = [
      entry.originalUrl || entry.title || "",
      entry.outcome || "",
      entry.imageVisualHash || "",
      entry.reviewMode || "",
      day,
    ].join("|");
    deduped.set(key, entry);
  }
  const entries = Array.from(deduped.values())
    .sort((a, b) => String(a.recordedAt).localeCompare(String(b.recordedAt)))
    .slice(-400);

  await fs.writeFile(
    IMAGE_REVIEW_MEMORY_PATH,
    `${JSON.stringify({ generatedAt: now.toISOString(), entries }, null, 2)}\n`,
    "utf8",
  );
  return entries.length;
}

async function writeImageReviewQueue(result, reviewMemory, now) {
  const queue = buildImageReviewQueue(
    result.feeds.map(({ report }) => report),
    reviewMemory.entries || reviewMemory || [],
    { generatedAt: now.toISOString() },
  );
  await fs.writeFile(
    IMAGE_REVIEW_QUEUE_PATH,
    `${JSON.stringify(queue, null, 2)}\n`,
    "utf8",
  );
  return queue.totalHeld;
}

async function writeImageReviewRepository(reviewMemory, now) {
  const repository = buildImageReviewRepository(reviewMemory.entries || reviewMemory || [], {
    generatedAt: now.toISOString(),
  });
  await fs.writeFile(
    IMAGE_REVIEW_REPOSITORY_PATH,
    `${JSON.stringify(repository, null, 2)}\n`,
    "utf8",
  );
  return repository.groups.length;
}

async function markQueueHistoryUpdated(result, historyUpdated) {
  for (const { report } of result.feeds) {
    if (!report?.queue?.isSocialQueue || !report.outputFiles?.reportJson) continue;
    const reportPath = path.join(RSS_DIR, report.outputFiles.reportJson);
    const raw = await fs.readFile(reportPath, "utf8").catch(() => "");
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      parsed.queue = {
        ...(parsed.queue || {}),
        historyUpdated,
      };
      await fs.writeFile(reportPath, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    } catch {
      // Validation catches malformed report files; keep the autonomous runner moving.
    }
  }
}

async function main() {
  const now = new Date();
  const schedule = await readSchedule();
  const runSlot = resolveRunSlot(now);
  const slot = schedule.slots.find((candidate) => candidate.id === runSlot) || { id: runSlot };
  const siteUrl = process.env.PHOENIX_RSS_SITE_URL || process.env.SITE_URL || "https://phoenixventurestudios.com";
  const requireArticleSpecificImages =
    process.env.PHOENIX_RSS_REQUIRE_ARTICLE_IMAGES === "1" ||
    process.env.PHOENIX_RSS_IMAGE_MODE === "article-or-hold";
  const backupDir = await snapshotRssDir();
  const history = await readHistory();
  const previousSignature = await stableFeedSignature();

  const supervised = await runSupervisedGeneration({ feedConfigs: feedConfigsForRunSlot(runSlot) });
  const result = {
    allValid: supervised.allSafe,
    feeds: (supervised.feedResults || []).map((feed) => ({ report: feed.report })),
  };
  let restoredPreviousOutput = false;
  let historyItems = history.items.length;
  let reviewMemoryEntries = await writeImageReviewMemory(result, now);
  const currentReviewMemory = await readImageReviewMemory();
  let reviewQueueItems = await writeImageReviewQueue(result, currentReviewMemory, now);
  let reviewRepositoryGroups = await writeImageReviewRepository(currentReviewMemory, now);
  let currentSignature = previousSignature;
  let outputChanged = false;
  if (result.allValid) {
    historyItems = (await readHistory()).items.length;
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
    reviewMemoryEntries,
    reviewQueueItems,
    reviewRepositoryGroups,
    outputChanged,
    signatures: {
      previous: previousSignature,
      current: currentSignature,
    },
    publishPolicy: schedule.publishPolicy,
    imagePolicy: requireArticleSpecificImages ? "article-specific-or-hold" : "warn-on-generic-fallback",
    allValid: result.allValid,
    allFresh: supervised.allFresh,
    preservedCount: supervised.preservedCount,
    timeoutCount: supervised.timeoutCount,
    feeds: result.feeds.map(({ report }) => ({
      feedId: report.feedId,
      title: report.title,
      feedValid: report.feedValid,
      preservedPreviousFeed: report.preservedPreviousFeed,
      selected: report.items.selected,
      recentFiltered: report.items.recentFiltered || 0,
      sourceErrors: report.sources.errors.length,
      socialCardErrors: report.images.errors.length,
      manualReviewNeeded: report.images.manualReviewNeeded,
      creativeFollowUpSelected: report.images.creativeFollowUpSelected || 0,
      varietyErrors: report.images.variety.errors.length,
      editorialErrors: report.editorial.errors.length,
      editorialWarnings: report.editorial.warnings.length,
      copyWarnings: report.copy.warnings.length,
      queueCandidatePool: report.queue?.candidatePoolSize || 0,
      sampleReady: report.queue?.sampleReady ?? false,
      eligibleSelected: report.queue?.eligibleSelected ?? false,
      queueRotationReason: report.queue?.queueRotationReason || "",
      historyUpdated: report.queue?.isSocialQueue ? supervised.historyUpdated : false,
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error("Phoenix autonomous RSS run failed:", error);
    process.exitCode = 1;
  });
}
