import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BACKGROUND_VARIANTS } from "./background-library.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const WORKSPACE_ROOT = path.resolve(APP_ROOT, "../..");
const PUBLIC_ROOT = path.join(APP_ROOT, "public");
const REVIEW_ROOT = path.join(WORKSPACE_ROOT, "output/phoenix-rss-fallback-review");
const REVIEW_ASSET_ROOT = path.join(REVIEW_ROOT, "images/signals/backgrounds");
const CONTACT_SHEET_PATH = path.join(REVIEW_ROOT, "fallback-image-contact-sheet.svg");
const HTML_PATH = path.join(REVIEW_ROOT, "index.html");
const JSON_PATH = path.join(REVIEW_ROOT, "fallback-image-review.json");

const CARD_WIDTH = 360;
const CARD_HEIGHT = 258;
const GAP = 24;
const PADDING = 36;
const COLUMNS = 4;

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function titleCase(value = "") {
  return String(value)
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function fileInfo(publicPath, source) {
  const imagePath = path.join(PUBLIC_ROOT, publicPath.replace(/^\//, ""));
  const sourcePath = path.join(APP_ROOT, source);
  const [imageStat, sourceStat] = await Promise.all([
    fs.stat(imagePath).catch(() => null),
    fs.stat(sourcePath).catch(() => null),
  ]);

  return {
    exists: Boolean(imageStat),
    sourceExists: Boolean(sourceStat),
    sizeBytes: imageStat?.size ?? 0,
  };
}

function buildHtml(rows, summary) {
  const cards = rows.map((row) => `
    <article class="card" style="--accent:${escapeHtml(row.accent)};--secondary:${escapeHtml(row.secondary)}">
      <div class="image-wrap">
        <img src="./${escapeHtml(row.reviewImagePath)}" alt="${escapeHtml(row.label)}" loading="lazy">
        <span class="number">${row.number}</span>
      </div>
      <div class="meta">
        <p class="family">${escapeHtml(titleCase(row.family))}</p>
        <h2>${escapeHtml(row.label)}</h2>
        <p class="path">${escapeHtml(row.publicPath)}</p>
        ${row.creativeScene ? `<p class="source">Creative replacement: ${escapeHtml(row.creativeScene)}</p>` : ""}
        <p class="source">Source asset: ${escapeHtml(row.source)}</p>
        <p class="status ${row.exists && row.sourceExists ? "ok" : "bad"}">${row.exists && row.sourceExists ? "File verified" : "Missing file or source asset"}</p>
      </div>
    </article>
  `).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Phoenix RSS Fallback Image Review</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #07111d;
      --panel: rgba(255, 248, 239, 0.075);
      --line: rgba(255, 248, 239, 0.16);
      --text: #fff8ef;
      --muted: rgba(255, 248, 239, 0.68);
      --dim: rgba(255, 248, 239, 0.48);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background:
        radial-gradient(circle at 12% 8%, rgba(255, 111, 31, 0.20), transparent 28rem),
        radial-gradient(circle at 86% 2%, rgba(34, 211, 238, 0.16), transparent 34rem),
        linear-gradient(135deg, #05080d, var(--bg) 52%, #0d1419);
      color: var(--text);
      font: 15px/1.45 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      min-height: 100vh;
    }
    header {
      padding: 48px clamp(24px, 5vw, 72px) 26px;
      border-bottom: 1px solid var(--line);
    }
    .kicker {
      margin: 0 0 14px;
      color: #22d3ee;
      font-size: 12px;
      font-weight: 800;
      letter-spacing: 0.24em;
      text-transform: uppercase;
    }
    h1 {
      margin: 0;
      max-width: 920px;
      font: 700 clamp(36px, 6vw, 72px)/0.95 Georgia, "Times New Roman", serif;
      letter-spacing: -0.045em;
    }
    .summary {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 24px;
      color: var(--muted);
    }
    .pill {
      border: 1px solid var(--line);
      border-radius: 999px;
      padding: 9px 13px;
      background: rgba(255, 248, 239, 0.06);
    }
    main {
      padding: 34px clamp(18px, 4vw, 56px) 72px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(290px, 1fr));
      gap: 22px;
    }
    .card {
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 24px;
      background:
        linear-gradient(145deg, rgba(255, 248, 239, 0.08), rgba(255, 248, 239, 0.035)),
        radial-gradient(circle at 88% 6%, color-mix(in srgb, var(--accent), transparent 74%), transparent 18rem);
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.28);
    }
    .image-wrap {
      position: relative;
      aspect-ratio: 1200 / 630;
      background: #05080d;
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .number {
      position: absolute;
      left: 14px;
      top: 14px;
      border-radius: 999px;
      padding: 6px 10px;
      background: rgba(5, 8, 13, 0.74);
      color: #fff8ef;
      font-weight: 900;
      letter-spacing: 0.06em;
    }
    .meta { padding: 18px 18px 20px; }
    .family {
      margin: 0 0 8px;
      color: var(--accent);
      font-size: 11px;
      font-weight: 900;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }
    h2 {
      margin: 0 0 12px;
      font: 700 22px/1.05 Georgia, "Times New Roman", serif;
      letter-spacing: -0.025em;
    }
    .path, .source, .status {
      margin: 7px 0 0;
      color: var(--dim);
      font-size: 12px;
      word-break: break-word;
    }
    .status.ok { color: #8ed9d2; }
    .status.bad { color: #ff8a1f; }
  </style>
</head>
<body>
  <header>
    <p class="kicker">Phoenix RSS Background Library</p>
    <h1>Fallback image review</h1>
    <div class="summary">
      <span class="pill">${summary.total} backgrounds</span>
      <span class="pill">${summary.familyCount} families</span>
      <span class="pill">${summary.missing} missing public files</span>
      <span class="pill">${summary.missingSources} missing source assets</span>
      <span class="pill">Status: pending Nathan approval</span>
    </div>
  </header>
  <main>
    <p class="summary" style="margin-top:0">
      <a class="pill" href="./fallback-image-contact-sheet.svg">Open quick SVG sheet</a>
      <a class="pill" href="./fallback-image-review.json">Open JSON manifest</a>
    </p>
    <section class="grid" aria-label="Fallback images">
      ${cards}
    </section>
  </main>
</body>
</html>
`;
}

function buildContactSheetSvg(rows) {
  const rowCount = Math.ceil(rows.length / COLUMNS);
  const width = PADDING * 2 + COLUMNS * CARD_WIDTH + (COLUMNS - 1) * GAP;
  const height = PADDING * 2 + rowCount * CARD_HEIGHT + (rowCount - 1) * GAP;
  const cards = rows.map((row) => {
    const column = (row.number - 1) % COLUMNS;
    const gridRow = Math.floor((row.number - 1) / COLUMNS);
    const left = PADDING + column * (CARD_WIDTH + GAP);
    const top = PADDING + gridRow * (CARD_HEIGHT + GAP);
    const imageHref = row.reviewImagePath;

    return `
      <g transform="translate(${left} ${top})">
        <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" rx="22" fill="#07111d" stroke="rgba(255,248,239,0.24)"/>
        <clipPath id="clip-${row.number}"><rect x="20" y="18" width="320" height="168" rx="14"/></clipPath>
        <image href="${escapeHtml(imageHref)}" x="20" y="18" width="320" height="168" preserveAspectRatio="xMidYMid slice" clip-path="url(#clip-${row.number})"/>
        <rect x="20" y="18" width="320" height="168" rx="14" fill="none" stroke="rgba(255,248,239,0.18)"/>
        <text x="20" y="216" fill="#fff8ef" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="800">${escapeHtml(String(row.number).padStart(2, "0"))} ${escapeHtml(titleCase(row.family))}</text>
        <text x="20" y="239" fill="#9fb7c1" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700">${escapeHtml(row.fileName)}</text>
      </g>
    `;
  }).join("\n");

  return `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${width}" height="${height}" fill="#05080d"/>
  ${cards}
</svg>
`;
}

await fs.mkdir(REVIEW_ROOT, { recursive: true });
await fs.mkdir(REVIEW_ASSET_ROOT, { recursive: true });

const rows = await Promise.all(BACKGROUND_VARIANTS.map(async (entry, index) => {
  const info = await fileInfo(entry.publicPath, entry.source);
  const fileName = path.basename(entry.publicPath);
  const reviewImagePath = `images/signals/backgrounds/${fileName}`;
  if (info.exists) {
    await fs.copyFile(
      path.join(PUBLIC_ROOT, entry.publicPath.replace(/^\//, "")),
      path.join(REVIEW_ROOT, reviewImagePath)
    );
  }
  return {
    number: index + 1,
    id: fileName.replace(/\.[^.]+$/, ""),
    label: titleCase(fileName.replace(/\.[^.]+$/, "")),
    fileName,
    reviewImagePath,
    approvalStatus: "pending-nathan-review",
    ...entry,
    ...info,
  };
}));

const summary = {
  total: rows.length,
  familyCount: new Set(rows.map((row) => row.family)).size,
  missing: rows.filter((row) => !row.exists).length,
  missingSources: rows.filter((row) => !row.sourceExists).length,
  families: rows.reduce((counts, row) => {
    counts[row.family] = (counts[row.family] || 0) + 1;
    return counts;
  }, {}),
};

await fs.writeFile(JSON_PATH, `${JSON.stringify({ generatedAt: new Date().toISOString(), summary, items: rows }, null, 2)}\n`);
await fs.writeFile(HTML_PATH, buildHtml(rows, summary));
await fs.writeFile(CONTACT_SHEET_PATH, buildContactSheetSvg(rows));

console.log(JSON.stringify({
  generatedAt: new Date().toISOString(),
  summary,
  html: path.relative(APP_ROOT, HTML_PATH),
  json: path.relative(APP_ROOT, JSON_PATH),
  contactSheet: path.relative(APP_ROOT, CONTACT_SHEET_PATH),
}, null, 2));
