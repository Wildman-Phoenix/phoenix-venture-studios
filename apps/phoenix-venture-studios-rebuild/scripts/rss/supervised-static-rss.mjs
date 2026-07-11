import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_FEED_CONFIGS,
  validateRss,
  writeRecentSelectionHistory,
} from "./generate-static-rss.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const GENERATOR_PATH = path.join(SCRIPT_DIR, "generate-static-rss.mjs");
const REPORT_FILE = "generate-run-report.json";
const BUNDLE_MANIFEST_FILE = "bundle-manifest.json";
const STAGING_ROOT = path.join(APP_ROOT, ".cache", "rss-supervised");
const DEFAULT_PRIMARY_TIMEOUT_MS = 150000;
const DEFAULT_SOCIAL_TIMEOUT_MS = 90000;
const DEFAULT_KILL_GRACE_MS = 5000;
const STALE_ARTIFACT_PATTERN = /\s\d+\.[^.]+$/;

function isSocialFeed(feedId = "") {
  return /social/i.test(feedId);
}

function isToolsFeed(feedId = "") {
  return /tools|ai-attention/i.test(feedId);
}

function numericEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function outputFilesForFeed(config = {}) {
  const outputFiles = {
    xml: "feed.xml",
    json: "feed.json",
    items: "items.json",
    reportMd: "run-report.md",
    reportJson: "run-report.json",
    ...(config.outputFiles || {}),
  };
  const aliases = Array.isArray(outputFiles.aliases) ? outputFiles.aliases : [];
  return [
    outputFiles.xml,
    outputFiles.json,
    outputFiles.items,
    outputFiles.reportMd,
    outputFiles.reportJson,
    ...aliases.flatMap((alias) => [alias?.to].filter(Boolean)),
  ].filter(Boolean);
}

async function hashFile(filePath) {
  try {
    const buffer = await fs.readFile(filePath);
    return createHash("sha256").update(buffer).digest("hex");
  } catch {
    return "";
  }
}

async function hashFeedOutputs(baseDir, config) {
  const entries = await Promise.all(outputFilesForFeed(config).map(async (file) => [
    file,
    await hashFile(path.join(baseDir, file)),
  ]));
  return Object.fromEntries(entries);
}

function changedFiles(before = {}, after = {}) {
  const files = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...files].filter((file) => before[file] !== after[file]);
}

async function readReport(baseDir, config = {}) {
  const reportJson = config.outputFiles?.reportJson || "run-report.json";
  try {
    return JSON.parse(await fs.readFile(path.join(baseDir, reportJson), "utf8"));
  } catch {
    return null;
  }
}

async function feedArtifactsLookValid(baseDir, config = {}) {
  const xmlFile = config.outputFiles?.xml || "feed.xml";
  const jsonFile = config.outputFiles?.json || "feed.json";
  try {
    const xml = await fs.readFile(path.join(baseDir, xmlFile), "utf8");
    const json = JSON.parse(await fs.readFile(path.join(baseDir, jsonFile), "utf8"));
    return validateRss(xml) && Array.isArray(json.items) && json.items.length > 0;
  } catch {
    return false;
  }
}

function childArgsForFeed(config = {}, outputDir) {
  const researchSourceLimit = isToolsFeed(config.id) ? 8 : 6;
  return [
    GENERATOR_PATH,
    "--feed-id", config.id,
    "--output-dir", outputDir,
    "--source-fetch-concurrency", "4",
    "--article-metadata-concurrency", "6",
    "--article-metadata-max-items", "20",
    "--research-source-limit", String(researchSourceLimit),
    "--source-image-fetch-timeout-ms", "8000",
    "--source-collect-timeout-ms", "10000",
  ];
}

function summarizeWarnings(report = {}) {
  return [
    ...(report.sources?.warnings || []).map((entry) => `${entry.source || "source"}: ${entry.error || entry.warning || "warning"}`),
    ...(report.images?.warnings || []).map((entry) => `${entry.slug || entry.title || "image"}: ${entry.warning || "warning"}`),
    ...(report.editorial?.warnings || []),
  ];
}

function summarizeErrors(report = {}) {
  return [
    ...(report.sources?.errors || []).map((entry) => `${entry.source || "source"}: ${entry.error || "error"}`),
    ...(report.images?.errors || []).map((entry) => `${entry.slug || entry.title || "image"}: ${entry.error || "error"}`),
    ...(report.validation?.errors || []),
  ];
}

async function prepareWorkingRssDir() {
  const workingDir = path.join(STAGING_ROOT, `rss-${Date.now()}`);
  await fs.mkdir(path.dirname(workingDir), { recursive: true });
  const existing = await fs.stat(RSS_DIR).catch(() => null);
  if (existing?.isDirectory()) {
    await fs.cp(RSS_DIR, workingDir, { recursive: true });
  } else {
    await fs.mkdir(workingDir, { recursive: true });
  }
  return workingDir;
}

async function replacePublicRssDir(workingDir) {
  const parentDir = path.dirname(RSS_DIR);
  const promotionDir = path.join(parentDir, `.rss-promote-${Date.now()}`);
  const rollbackDir = path.join(parentDir, `.rss-rollback-${Date.now()}`);
  await fs.cp(workingDir, promotionDir, { recursive: true });
  const current = await fs.stat(RSS_DIR).catch(() => null);
  try {
    if (current?.isDirectory()) await fs.rename(RSS_DIR, rollbackDir);
    await fs.rename(promotionDir, RSS_DIR);
    await fs.rm(rollbackDir, { recursive: true, force: true });
  } catch (error) {
    await fs.rm(promotionDir, { recursive: true, force: true });
    const rollback = await fs.stat(rollbackDir).catch(() => null);
    const active = await fs.stat(RSS_DIR).catch(() => null);
    if (rollback?.isDirectory() && !active) await fs.rename(rollbackDir, RSS_DIR);
    throw error;
  }
}

async function removeStaleNumberedArtifacts(baseDir) {
  const entries = await fs.readdir(baseDir, { withFileTypes: true }).catch(() => []);
  await Promise.all(entries
    .filter((entry) => entry.isFile() && STALE_ARTIFACT_PATTERN.test(entry.name))
    .map((entry) => fs.rm(path.join(baseDir, entry.name), { force: true })));
}

async function writeBundleManifest(baseDir, report) {
  const files = new Set([REPORT_FILE, "autonomous-history.json"]);
  for (const config of DEFAULT_FEED_CONFIGS) {
    for (const file of outputFilesForFeed(config)) files.add(file);
  }

  const fileHashes = {};
  for (const file of files) {
    const hash = await hashFile(path.join(baseDir, file));
    if (hash) fileHashes[file] = hash;
  }

  const manifest = {
    generatedAt: report.finishedAt,
    runId: report.generatedAt,
    files: fileHashes,
  };
  await fs.writeFile(path.join(baseDir, BUNDLE_MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function updateQueueReports(baseDir, feeds, historyUpdated) {
  for (const feed of feeds) {
    if (!isSocialFeed(feed.feedId) || !feed.report) continue;
    const reportPath = path.join(baseDir, feed.report.outputFiles?.reportJson || "run-report.json");
    const report = await readReport(baseDir, { outputFiles: feed.report.outputFiles }) || feed.report;
    report.queue = {
      ...(report.queue || {}),
      historyUpdated,
    };
    await fs.writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
    feed.report = report;
  }
}

export async function runFeedChild(config, options = {}) {
  const outputDir = options.outputDir || RSS_DIR;
  const beforeHashes = await hashFeedOutputs(outputDir, config);
  const timeoutMs = options.timeoutMs || (
    isSocialFeed(config.id)
      ? numericEnv("PHOENIX_RSS_SOCIAL_TIMEOUT_MS", DEFAULT_SOCIAL_TIMEOUT_MS)
      : numericEnv("PHOENIX_RSS_PRIMARY_TIMEOUT_MS", DEFAULT_PRIMARY_TIMEOUT_MS)
  );
  const killGraceMs = options.killGraceMs || numericEnv("PHOENIX_RSS_KILL_GRACE_MS", DEFAULT_KILL_GRACE_MS);
  const spawnImpl = options.spawnImpl || spawn;
  const startedAt = new Date().toISOString();
  const child = spawnImpl(process.execPath, childArgsForFeed(config, outputDir), {
    cwd: APP_ROOT,
    env: {
      ...process.env,
      PHOENIX_RSS_SUPERVISED_CHILD: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  let timedOut = false;
  let forcedKill = false;

  const timeout = setTimeout(() => {
    timedOut = true;
    child.kill?.("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null && !child.killed) {
        forcedKill = true;
        child.kill?.("SIGKILL");
      }
    }, killGraceMs).unref?.();
  }, timeoutMs);

  child.stdout?.on?.("data", (chunk) => {
    stdout = `${stdout}${chunk}`.slice(-12000);
  });
  child.stderr?.on?.("data", (chunk) => {
    stderr = `${stderr}${chunk}`.slice(-12000);
  });

  const exitCode = await new Promise((resolve) => {
    child.on("error", (error) => {
      stderr = `${stderr}\n${error instanceof Error ? error.message : String(error)}`.trim();
      resolve(1);
    });
    child.on("close", (code, signal) => {
      resolve(typeof code === "number" ? code : signal ? 1 : 0);
    });
  });
  clearTimeout(timeout);

  const afterHashes = await hashFeedOutputs(outputDir, config);
  const outputFilesChanged = changedFiles(beforeHashes, afterHashes);
  const report = await readReport(outputDir, config);
  const artifactsValid = await feedArtifactsLookValid(outputDir, config);
  const reportFile = config.outputFiles?.reportJson || "run-report.json";
  const reportFresh = Boolean(report && outputFilesChanged.includes(reportFile));
  const reportStaleAfterWrites = Boolean(outputFilesChanged.length && !reportFresh);
  const childClean = exitCode === 0 && !timedOut && !forcedKill;
  const feedValid = Boolean(report?.feedValid && reportFresh && childClean);
  const preservedPreviousFeed = Boolean(report?.preservedPreviousFeed && reportFresh) || (!feedValid && artifactsValid && outputFilesChanged.length === 0);
  const safeOutput = feedValid || preservedPreviousFeed || Boolean(report?.feedValid && reportFresh && artifactsValid);
  const finishedAt = new Date().toISOString();

  return {
    feedId: config.id,
    startedAt,
    finishedAt,
    timeoutMs,
    exitCode,
    timedOut,
    forcedKill,
    feedValid,
    preservedPreviousFeed,
    safeOutput,
    artifactsValid,
    reportFresh,
    reportStaleAfterWrites,
    selected: report?.items?.selected ?? 0,
    held: report?.items?.held ?? 0,
    warnings: [
      ...(timedOut ? [`${config.id} timed out after ${timeoutMs}ms`] : []),
      ...(reportStaleAfterWrites ? [`${config.id} wrote artifacts without a fresh ${reportFile}`] : []),
      ...summarizeWarnings(report || {}),
    ],
    errors: [
      ...(exitCode === 0 ? [] : [`${config.id} child exited with code ${exitCode}`]),
      ...(forcedKill ? [`${config.id} required SIGKILL after SIGTERM`] : []),
      ...(reportStaleAfterWrites ? [`${config.id} left a stale report after changing feed outputs`] : []),
      ...summarizeErrors(report || {}),
    ],
    outputFilesChanged,
    stdout,
    stderr,
    report,
  };
}

export async function runSupervisedGeneration(options = {}) {
  const workingDir = await prepareWorkingRssDir();
  const startedAt = new Date().toISOString();
  const feedConfigs = options.feedConfigs || DEFAULT_FEED_CONFIGS;
  const feeds = [];

  for (const config of feedConfigs) {
    feeds.push(await runFeedChild(config, { ...options, outputDir: workingDir }));
  }

  let historyUpdated = false;
  if (feeds.every((feed) => feed.safeOutput)) {
    await writeRecentSelectionHistory(workingDir, feeds.map((feed) => ({ report: feed.report })), new Date());
    historyUpdated = true;
    await updateQueueReports(workingDir, feeds, true);
  }

  const finishedAt = new Date().toISOString();
  const report = {
    generatedAt: finishedAt,
    startedAt,
    finishedAt,
    allSafe: feeds.every((feed) => feed.safeOutput),
    allFresh: feeds.every((feed) => feed.feedValid),
    preservedCount: feeds.filter((feed) => feed.preservedPreviousFeed).length,
    timeoutCount: feeds.filter((feed) => feed.timedOut).length,
    historyUpdated,
    feeds: feeds.map((feed) => ({
      feedId: feed.feedId,
      startedAt: feed.startedAt,
      finishedAt: feed.finishedAt,
      timeoutMs: feed.timeoutMs,
      exitCode: feed.exitCode,
      timedOut: feed.timedOut,
      forcedKill: feed.forcedKill,
      feedValid: feed.feedValid,
      preservedPreviousFeed: feed.preservedPreviousFeed,
      safeOutput: feed.safeOutput,
      artifactsValid: feed.artifactsValid,
      reportFresh: feed.reportFresh,
      reportStaleAfterWrites: feed.reportStaleAfterWrites,
      selected: feed.selected,
      held: feed.held,
      warnings: feed.warnings,
      errors: feed.errors,
      outputFilesChanged: feed.outputFilesChanged,
      stdout: feed.stdout,
      stderr: feed.stderr,
    })),
  };

  await fs.writeFile(path.join(workingDir, REPORT_FILE), `${JSON.stringify(report, null, 2)}\n`, "utf8");

  if (report.allSafe) {
    await removeStaleNumberedArtifacts(workingDir);
    await writeBundleManifest(workingDir, report);
    await replacePublicRssDir(workingDir);
  }

  Object.defineProperty(report, "feedResults", {
    value: feeds,
    enumerable: false,
  });

  return report;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSupervisedGeneration()
    .then((report) => {
      for (const feed of report.feeds) {
        console.log(`Phoenix RSS supervised [${feed.feedId}]: safe=${feed.safeOutput} valid=${feed.feedValid} preserved=${feed.preservedPreviousFeed} timedOut=${feed.timedOut} selected=${feed.selected} held=${feed.held}`);
      }
      if (!report.allSafe) process.exitCode = 1;
      setImmediate(() => process.exit(process.exitCode || 0));
    })
    .catch((error) => {
      console.error("Phoenix RSS supervised generation failed:", error);
      setImmediate(() => process.exit(1));
    });
}
