import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createImageBrief,
  generateArticleSpecificImage,
  renderSignalCard,
} from "./signal-card-images.mjs";
import { buildImageReviewRepository } from "./image-review-repository.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const PUBLIC_ROOT = path.join(APP_ROOT, "public");
const RSS_ROOT = path.join(PUBLIC_ROOT, "rss");
const QUEUE_PATH = path.join(RSS_ROOT, "image-review-queue.json");
const REVIEW_MEMORY_PATH = path.join(RSS_ROOT, "image-review-memory.json");
const REVIEW_REPOSITORY_PATH = path.join(RSS_ROOT, "image-review-repository.json");
const BATCH_REPORT_PATH = path.join(RSS_ROOT, "image-review-batch-report.json");

function parseArgs(argv = process.argv.slice(2)) {
  const parsed = {
    limit: 3,
    slug: "",
    feedId: "",
    timeoutMs: 120000,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--limit" && argv[index + 1]) {
      parsed.limit = Number.parseInt(argv[index + 1], 10) || parsed.limit;
      index += 1;
      continue;
    }
    if (value === "--slug" && argv[index + 1]) {
      parsed.slug = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--feed" && argv[index + 1]) {
      parsed.feedId = argv[index + 1];
      index += 1;
      continue;
    }
    if (value === "--timeout-ms" && argv[index + 1]) {
      parsed.timeoutMs = Number.parseInt(argv[index + 1], 10) || parsed.timeoutMs;
      index += 1;
    }
  }
  return parsed;
}

async function readJson(filePath, fallback) {
  const raw = await fs.readFile(filePath, "utf8").catch(() => "");
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function buildWorkingItem(queueItem = {}) {
  const description = [
    queueItem.simpleSummary,
    queueItem.trendContext,
    queueItem.engagementPrompt,
  ].filter(Boolean).join(" ");

  return {
    slug: queueItem.slug,
    title: queueItem.title,
    publicTitle: queueItem.title,
    description,
    category: queueItem.bucketLabel || queueItem.feedId || "Founder Signal",
    bucket: queueItem.bucket || "",
    bucketLabel: queueItem.bucketLabel || "",
    sourceName: queueItem.sourceName || "",
    sourceUrl: queueItem.sourceUrl || "",
    originalUrl: queueItem.sourceUrl || "",
    sourceImageUrl: queueItem.sourceImageUrl || "",
    imageBrief: queueItem.imageBrief || createImageBrief({
      slug: queueItem.slug,
      title: queueItem.title,
      publicTitle: queueItem.title,
      description,
      sourceName: queueItem.sourceName || "",
      sourceUrl: queueItem.sourceUrl || "",
      originalUrl: queueItem.sourceUrl || "",
      sourceImageUrl: queueItem.sourceImageUrl || "",
    }),
  };
}

function simplifyAudit(audit = null) {
  if (!audit) return null;
  return {
    colorfulness: audit.colorfulness,
    sharpness: audit.sharpness,
    luminanceStdDev: audit.luminanceStdDev,
    readability: audit.bestComposition?.readability ?? null,
    editorialNotes: audit.editorialNotes || [],
    recommendedFixes: audit.recommendedFixes || [],
    editorialModelReview: audit.editorialModelReview || null,
  };
}

async function processQueueItem(queueItem, options = {}) {
  const workingItem = buildWorkingItem(queueItem);
  const generated = await generateArticleSpecificImage(workingItem, workingItem.imageBrief, {
    outputRoot: PUBLIC_ROOT,
    recentItems: options.reviewMemoryEntries || [],
    imageReviewMemory: options.reviewMemoryEntries || [],
    generateArticleImagesInProcess: true,
    localImageGeneratorTimeoutMs: options.timeoutMs,
    disableLocalImagePlayground: options.disableLocalImagePlayground,
  });

  const rendered = await renderSignalCard({
    ...workingItem,
    articleImagePath: generated.publicPath,
    imageBrief: {
      ...generated.finalImageBrief,
      articleImagePath: generated.publicPath,
      articleImageRequired: false,
      manualReviewNeeded: false,
    },
  }, {
    outputRoot: options.previewOutputRoot || PUBLIC_ROOT,
    siteUrl: options.siteUrl,
    now: options.now,
    recentItems: options.reviewMemoryEntries || [],
    imageReviewMemory: options.reviewMemoryEntries || [],
    disableLocalImagePlayground: true,
  });

  return {
    slug: queueItem.slug,
    title: queueItem.title,
    status: rendered.imageApprovalStatus === "approved" ? "approved" : "held",
    rawImagePath: generated.publicPath,
    finalCoverPath: rendered.socialImagePath || rendered.imagePath || "",
    promptUsed: generated.promptUsed,
    correctionTrail: generated.correctionTrail || [],
    audit: simplifyAudit(generated.imageAudit),
    warnings: rendered.imageWarnings || [],
    imageStrategy: rendered.imageStrategy,
    imageSourceType: rendered.imageSourceType,
    imageVisualHash: generated.imageVisualHash,
    imageFingerprint: rendered.imageFingerprint || workingItem.imageBrief?.imageFingerprint || "",
    sourceName: queueItem.sourceName || "",
    sourceUrl: queueItem.sourceUrl || "",
    sceneLane: queueItem.sceneLane || workingItem.imageBrief?.sceneLane || "general",
  };
}

function toReviewMemoryEntries(results = [], recordedAt) {
  return results.flatMap((result) => {
    if (result.status === "approved" && result.audit) {
      return [{
        recordedAt,
        feedId: "image-review-batch",
        title: result.title,
        originalUrl: result.sourceUrl || "",
        sourceName: result.sourceName || "",
        sceneLane: result.sceneLane || "general",
        reviewMode: "phoenix-owned",
        outcome: "approved",
        imageStrategy: result.imageStrategy || "held-for-codex-image",
        imageSourceType: result.imageSourceType || "phoenix-owned",
        imageFingerprint: result.imageFingerprint || "",
        imageVisualHash: result.imageVisualHash || "",
        holdReason: "",
        metrics: {
          colorfulness: result.audit.colorfulness || 0,
          sharpness: result.audit.sharpness || 0,
          luminanceStdDev: result.audit.luminanceStdDev || 0,
          readability: result.audit.readability || 0,
        },
        editorialNotes: result.audit.editorialNotes || [],
        recommendedFixes: result.audit.recommendedFixes || [],
        editorialModelReview: result.audit.editorialModelReview || null,
      }];
    }
    if (result.status === "failed") {
      return [{
        recordedAt,
        feedId: "image-review-batch",
        title: result.title,
        originalUrl: result.sourceUrl || "",
        sourceName: result.sourceName || "",
        sceneLane: result.sceneLane || "general",
        reviewMode: "phoenix-owned",
        outcome: "rejected",
        imageStrategy: "held-for-codex-image",
        imageSourceType: "phoenix-owned",
        imageFingerprint: result.imageFingerprint || "",
        imageVisualHash: "",
        holdReason: `batch-generation-failed:${result.error || "unknown"}`,
        metrics: {
          colorfulness: 0,
          sharpness: 0,
          luminanceStdDev: 0,
          readability: 0,
        },
        editorialNotes: [],
        recommendedFixes: [result.error || "Batch generation failed."],
        editorialModelReview: null,
      }];
    }
    return [];
  });
}

async function main() {
  const args = parseArgs();
  const queue = await readJson(QUEUE_PATH, { items: [] });
  const existingReviewMemory = await readJson(REVIEW_MEMORY_PATH, { entries: [] });
  const items = (queue.items || [])
    .filter((item) => !args.slug || item.slug === args.slug)
    .filter((item) => !args.feedId || item.feedId === args.feedId)
    .slice(0, args.limit);

  const startedAt = new Date().toISOString();
  const results = [];

  for (const queueItem of items) {
    try {
      results.push(await processQueueItem(queueItem, {
        now: new Date(),
        siteUrl: process.env.PHOENIX_RSS_SITE_URL || "https://phoenixventurestudios.com",
        timeoutMs: args.timeoutMs,
        reviewMemoryEntries: existingReviewMemory.entries || [],
        disableLocalImagePlayground: process.env.PHOENIX_RSS_DISABLE_LOCAL_IMAGE_PLAYGROUND === "1",
      }));
    } catch (error) {
      results.push({
        slug: queueItem.slug,
        title: queueItem.title,
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        sourceName: queueItem.sourceName || "",
        sourceUrl: queueItem.sourceUrl || "",
        sceneLane: queueItem.sceneLane || "general",
        imageFingerprint: queueItem.imageFingerprint || "",
      });
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    startedAt,
    processed: results.length,
    approved: results.filter((result) => result.status === "approved").length,
    failed: results.filter((result) => result.status === "failed").length,
    results,
  };

  await fs.writeFile(BATCH_REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  const recordedAt = report.generatedAt;
  const mergedEntries = [
    ...(existingReviewMemory.entries || []),
    ...toReviewMemoryEntries(results, recordedAt),
  ].slice(-500);
  const updatedReviewMemory = {
    generatedAt: recordedAt,
    entries: mergedEntries,
  };
  await fs.writeFile(REVIEW_MEMORY_PATH, `${JSON.stringify(updatedReviewMemory, null, 2)}\n`, "utf8");
  const repository = buildImageReviewRepository(updatedReviewMemory, { generatedAt: recordedAt });
  await fs.writeFile(REVIEW_REPOSITORY_PATH, `${JSON.stringify(repository, null, 2)}\n`, "utf8");
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
