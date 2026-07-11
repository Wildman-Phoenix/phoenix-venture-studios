import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(APP_ROOT, "../..");
const RSS_ROOT = path.join(APP_ROOT, "public/rss");
const OUTPUT_ROOT = path.join(WORKSPACE_ROOT, "output/phoenix-rss-health");
const HTML_PATH = path.join(OUTPUT_ROOT, "index.html");
const JSON_PATH = path.join(OUTPUT_ROOT, "rss-health-summary.json");

const REPORT_FILES = [
  "generate-run-report.json",
  "run-report.json",
  "social-run-report.json",
  "tools-run-report.json",
  "tools-social-run-report.json",
  "ai-attention-run-report.json",
  "ai-attention-social-run-report.json",
  "autonomous-run-report.json",
  "image-review-queue.json",
];

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function readJsonIfExists(fileName) {
  const filePath = path.join(RSS_ROOT, fileName);
  try {
    return {
      fileName,
      filePath,
      data: JSON.parse(await fs.readFile(filePath, "utf8")),
    };
  } catch {
    return null;
  }
}

function normalizeTextList(values = []) {
  return values.map((value) => {
    if (typeof value === "string") return value;
    return [value.source, value.url, value.error, value.warning].filter(Boolean).join(": ");
  }).filter(Boolean);
}

function summarizeFeedReport(report) {
  const data = report.data || {};
  if (Array.isArray(data.feeds)) {
    return data.feeds.map((feed) => ({
      fileName: report.fileName,
      feedId: feed.feedId || "all-feeds",
      generatedAt: data.generatedAt || feed.finishedAt || "",
      status: feed.feedValid && !feed.preservedPreviousFeed && !feed.timedOut ? "fresh" : feed.preservedPreviousFeed ? "preserved" : "attention",
      selected: feed.selected ?? 0,
      held: feed.held ?? 0,
      warnings: normalizeTextList(feed.warnings || []),
      errors: normalizeTextList(feed.errors || []),
      timedOut: Boolean(feed.timedOut),
      preservedPreviousFeed: Boolean(feed.preservedPreviousFeed),
      safeOutput: Boolean(feed.safeOutput),
    }));
  }

  if (data.items || data.sources || data.images || data.queue) {
    return [{
      fileName: report.fileName,
      feedId: data.feedId || report.fileName.replace(/-run-report\.json$/, ""),
      generatedAt: data.generatedAt || "",
      status: (data.validation?.errors || []).length ? "attention" : "report",
      selected: data.items?.selected ?? data.selectedItems?.length ?? 0,
      held: data.items?.held ?? data.images?.held ?? 0,
      warnings: [
        ...normalizeTextList(data.sources?.warnings || []),
        ...normalizeTextList(data.images?.warnings || []).slice(0, 8),
        ...(data.queue?.selectedReasons || []).map((reason) => `queue selected reason: ${reason}`),
      ],
      errors: [
        ...normalizeTextList(data.sources?.errors || []),
        ...normalizeTextList(data.images?.errors || []),
        ...normalizeTextList(data.validation?.errors || []),
      ],
      timedOut: false,
      preservedPreviousFeed: false,
      safeOutput: true,
      manualReviewNeeded: data.images?.manualReviewNeeded ?? data.queue?.heldForManualReview ?? 0,
      creativeFollowUpSelected: data.images?.creativeFollowUpSelected ?? 0,
    }];
  }

  if (Array.isArray(data.items) && report.fileName === "image-review-queue.json") {
    return [{
      fileName: report.fileName,
      feedId: "image-review-queue",
      generatedAt: data.generatedAt || "",
      status: data.totalHeld ? "attention" : "clear",
      selected: 0,
      held: data.totalHeld || data.items.length,
      warnings: data.items.slice(0, 10).map((item) => `${item.slug}: ${item.holdReason || "held"}`),
      errors: [],
      timedOut: false,
      preservedPreviousFeed: false,
      safeOutput: true,
      manualReviewNeeded: data.totalHeld || data.items.length,
    }];
  }

  return [];
}

function buildHtml(summary) {
  const feedCards = summary.feeds.map((feed) => `
    <article class="card ${escapeHtml(feed.status)}">
      <div class="row">
        <h2>${escapeHtml(feed.feedId)}</h2>
        <span>${escapeHtml(feed.status)}</span>
      </div>
      <p class="meta">${escapeHtml(feed.fileName)}${feed.generatedAt ? ` · ${escapeHtml(feed.generatedAt)}` : ""}</p>
      <div class="metrics">
        <b>${feed.selected}</b><small>selected</small>
        <b>${feed.held}</b><small>held</small>
        <b>${feed.errors.length}</b><small>errors</small>
        <b>${feed.warnings.length}</b><small>warnings</small>
      </div>
      ${feed.preservedPreviousFeed ? `<p class="flag">Preserved previous valid feed</p>` : ""}
      ${feed.timedOut ? `<p class="flag">Timed out</p>` : ""}
      ${feed.manualReviewNeeded ? `<p class="flag">${feed.manualReviewNeeded} manual-review item(s)</p>` : ""}
      ${feed.creativeFollowUpSelected ? `<p class="flag">${feed.creativeFollowUpSelected} creative follow-up item(s)</p>` : ""}
      ${feed.errors.length ? `<h3>Errors</h3><ul>${feed.errors.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
      ${feed.warnings.length ? `<h3>Warnings / Holds</h3><ul>${feed.warnings.slice(0, 8).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>` : ""}
    </article>
  `).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phoenix RSS Health</title>
  <style>
    :root { color-scheme: dark; --bg:#05080d; --panel:#0b1622; --line:rgba(255,248,239,.16); --text:#fff8ef; --muted:rgba(255,248,239,.65); --good:#8ed9d2; --warn:#ff9b22; --bad:#ff6a1f; --blue:#22d3ee; }
    body { margin:0; background:radial-gradient(circle at 12% 4%, rgba(255,106,31,.18), transparent 28rem), linear-gradient(135deg,#05080d,#0b1622 58%,#10120f); color:var(--text); font:15px/1.45 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    header { padding:46px clamp(22px,5vw,72px) 26px; border-bottom:1px solid var(--line); }
    .kicker { margin:0 0 12px; color:var(--blue); text-transform:uppercase; letter-spacing:.24em; font-size:12px; font-weight:900; }
    h1 { margin:0; font:700 clamp(38px,6vw,72px)/.95 Georgia,"Times New Roman",serif; letter-spacing:-.045em; }
    .summary { display:flex; flex-wrap:wrap; gap:12px; margin-top:22px; color:var(--muted); }
    .pill { border:1px solid var(--line); border-radius:999px; padding:9px 13px; background:rgba(255,248,239,.06); }
    main { padding:32px clamp(18px,4vw,56px) 68px; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(330px,1fr)); gap:18px; }
    .card { border:1px solid var(--line); border-radius:22px; background:rgba(255,248,239,.055); padding:20px; box-shadow:0 18px 55px rgba(0,0,0,.22); }
    .card.fresh { border-color:rgba(142,217,210,.32); }
    .card.attention, .card.preserved { border-color:rgba(255,155,34,.48); }
    .row { display:flex; justify-content:space-between; gap:16px; align-items:start; }
    h2 { margin:0; font:700 25px/1.05 Georgia,"Times New Roman",serif; letter-spacing:-.02em; }
    .row span { color:var(--good); font-size:11px; font-weight:900; letter-spacing:.16em; text-transform:uppercase; }
    .attention .row span, .preserved .row span { color:var(--warn); }
    .meta { margin:8px 0 16px; color:var(--muted); font-size:12px; word-break:break-word; }
    .metrics { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
    .metrics b { display:block; font-size:25px; color:var(--text); }
    .metrics small { display:block; color:var(--muted); font-size:11px; text-transform:uppercase; letter-spacing:.1em; }
    .flag { margin:8px 0; color:var(--warn); font-weight:800; }
    h3 { margin:16px 0 8px; color:var(--blue); font-size:12px; text-transform:uppercase; letter-spacing:.16em; }
    ul { margin:0; padding-left:18px; color:var(--muted); }
    li { margin:6px 0; }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Phoenix RSS Operations</p>
    <h1>RSS health and failure review</h1>
    <div class="summary">
      <span class="pill">${summary.feeds.length} report sections</span>
      <span class="pill">${summary.errorCount} errors</span>
      <span class="pill">${summary.warningCount} warnings / holds</span>
      <span class="pill">${summary.preservedCount} preserved feeds</span>
      <span class="pill">${summary.timeoutCount} timeouts</span>
    </div>
  </header>
  <main><section class="grid">${feedCards}</section></main>
</body>
</html>
`;
}

await fs.mkdir(OUTPUT_ROOT, { recursive: true });
const reports = (await Promise.all(REPORT_FILES.map(readJsonIfExists))).filter(Boolean);
const feeds = reports.flatMap(summarizeFeedReport);
const summary = {
  generatedAt: new Date().toISOString(),
  reportRoot: RSS_ROOT,
  feeds,
  errorCount: feeds.reduce((count, feed) => count + feed.errors.length, 0),
  warningCount: feeds.reduce((count, feed) => count + feed.warnings.length, 0),
  preservedCount: feeds.filter((feed) => feed.preservedPreviousFeed).length,
  timeoutCount: feeds.filter((feed) => feed.timedOut).length,
};

await fs.writeFile(JSON_PATH, `${JSON.stringify(summary, null, 2)}\n`);
await fs.writeFile(HTML_PATH, buildHtml(summary));

console.log(JSON.stringify({
  generatedAt: summary.generatedAt,
  html: path.relative(APP_ROOT, HTML_PATH),
  json: path.relative(APP_ROOT, JSON_PATH),
  reports: reports.length,
  feedSections: feeds.length,
  errorCount: summary.errorCount,
  warningCount: summary.warningCount,
}, null, 2));
