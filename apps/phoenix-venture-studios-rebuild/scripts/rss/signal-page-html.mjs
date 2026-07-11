import fs from "node:fs/promises";
import path from "node:path";

const FEED_FILES = [
  "feed.json",
  "tools.json",
  "ai-attention.json",
  "social.json",
  "tools-social.json",
  "ai-attention-social.json",
];
const DEFAULT_SITE_URL = "https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild";
function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
  return String(value || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value = "") {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function stripHtml(value = "") {
  return String(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function clampText(value = "", maxLength = 170) {
  const clean = stripHtml(value);
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength - 1).trim()}...`;
}

function asAbsoluteUrl(value = "", siteUrl = DEFAULT_SITE_URL) {
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const pathValue = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedSiteUrl}${pathValue}`;
}

function toSitePath(value = "") {
  if (!value) return "";

  let pathValue = String(value);
  if (/^https?:\/\//i.test(pathValue)) {
    try {
      pathValue = new URL(pathValue).pathname;
    } catch {
      return "";
    }
  }

  pathValue = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
  return pathValue.replace(/^\/phoenix-venture-studios-rebuild(?=\/)/, "");
}

function asSiteUrl(value = "", siteUrl = DEFAULT_SITE_URL) {
  const pathValue = toSitePath(value);
  return pathValue ? asAbsoluteUrl(pathValue, siteUrl) : "";
}

function replaceOrInsertHeadTag(html, pattern, tag) {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

function buildSignalMeta(item, siteUrl) {
  const phoenix = item._phoenix ?? {};
  const slug = phoenix.slug;
  if (!slug) return null;

  const internalPath = toSitePath(phoenix.internalPath) || `/founder-signal/signals/${slug}/`;
  const url = asAbsoluteUrl(internalPath.endsWith("/") ? internalPath : `${internalPath}/`, siteUrl);
  const ownedImagePath =
    toSitePath(phoenix.socialImagePath) ||
    toSitePath(phoenix.imagePath) ||
    toSitePath(item.socialImagePath) ||
    toSitePath(item.imagePath) ||
    toSitePath(phoenix.socialImageUrl) ||
    toSitePath(phoenix.imageUrl);
  const image = ownedImagePath.startsWith("/images/")
    ? asAbsoluteUrl(ownedImagePath, siteUrl)
    : asSiteUrl(item.image || item.banner_image, siteUrl);
  const title = `${stripHtml(item.title || "Founder Signal")} | Phoenix Venture Studios`;
  const description = clampText(phoenix.whyItMatters || item.content_text || "A Phoenix Founder Signal briefing for entrepreneurs.");

  return {
    slug,
    url,
    image,
    title,
    description,
    publishedAt: item.date_published || "",
    source: phoenix.source || item.authors?.[0]?.name || "Phoenix Source"
  };
}

function applySignalMeta(shellHtml, meta) {
  let html = shellHtml;
  const tags = [
    [/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(meta.title)}</title>`],
    [/<meta\s+name=["']description["'][^>]*>/i, `<meta name="description" content="${escapeAttr(meta.description)}">`],
    [/<link\s+rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${escapeAttr(meta.url)}" />`],
    [/<meta\s+property=["']og:type["'][^>]*>/i, `<meta property="og:type" content="article" />`],
    [/<meta\s+property=["']og:url["'][^>]*>/i, `<meta property="og:url" content="${escapeAttr(meta.url)}" />`],
    [/<meta\s+property=["']og:title["'][^>]*>/i, `<meta property="og:title" content="${escapeAttr(meta.title)}">`],
    [/<meta\s+property=["']og:description["'][^>]*>/i, `<meta property="og:description" content="${escapeAttr(meta.description)}">`],
    [/<meta\s+property=["']og:image["'][^>]*>/i, `<meta property="og:image" content="${escapeAttr(meta.image)}">`],
    [/<meta\s+name=["']twitter:card["'][^>]*>/i, `<meta name="twitter:card" content="summary_large_image" />`],
    [/<meta\s+name=["']twitter:title["'][^>]*>/i, `<meta name="twitter:title" content="${escapeAttr(meta.title)}">`],
    [/<meta\s+name=["']twitter:description["'][^>]*>/i, `<meta name="twitter:description" content="${escapeAttr(meta.description)}">`],
    [/<meta\s+name=["']twitter:image["'][^>]*>/i, `<meta name="twitter:image" content="${escapeAttr(meta.image)}">`],
  ];

  for (const [pattern, tag] of tags) {
    html = replaceOrInsertHeadTag(html, pattern, tag);
  }

  html = replaceOrInsertHeadTag(
    html,
    /<meta\s+property=["']og:site_name["'][^>]*>/i,
    `<meta property="og:site_name" content="Phoenix Venture Studios" />`
  );
  html = replaceOrInsertHeadTag(
    html,
    /<meta\s+name=["']twitter:url["'][^>]*>/i,
    `<meta name="twitter:url" content="${escapeAttr(meta.url)}" />`
  );

  if (meta.publishedAt) {
    html = replaceOrInsertHeadTag(
      html,
      /<meta\s+property=["']article:published_time["'][^>]*>/i,
      `<meta property="article:published_time" content="${escapeAttr(meta.publishedAt)}" />`
    );
  }

  return html;
}

async function readFeedItems(rssDir, siteUrl) {
  const items = [];
  for (const file of FEED_FILES) {
    const feedPath = path.join(rssDir, file);
    const raw = await fs.readFile(feedPath, "utf8").catch(() => "");
    if (!raw) continue;

    const feed = JSON.parse(raw);
    for (const item of feed.items || []) {
      const meta = buildSignalMeta(item, siteUrl);
      if (meta) items.push({ item, meta });
    }
  }
  return items;
}

export async function writeSignalStaticPages({
  targetRoot,
  rssDir,
  siteUrl = DEFAULT_SITE_URL,
} = {}) {
  if (!targetRoot) throw new Error("targetRoot is required");
  if (!rssDir) throw new Error("rssDir is required");

  const shellPath = path.join(targetRoot, "index.html");
  const shellHtml = await fs.readFile(shellPath, "utf8").catch(() => "");
  if (!shellHtml) {
    return { count: 0, skipped: true, reason: `Missing app shell at ${shellPath}` };
  }

  const feedItems = await readFeedItems(rssDir, siteUrl);
  const seen = new Set();
  let count = 0;

  for (const { meta } of feedItems) {
    if (seen.has(meta.slug)) continue;
    seen.add(meta.slug);

    const html = applySignalMeta(shellHtml, meta);
    const pageDir = path.join(targetRoot, "founder-signal", "signals", meta.slug);
    await fs.mkdir(pageDir, { recursive: true });
    await fs.writeFile(path.join(pageDir, "index.html"), html, "utf8");
    count += 1;
  }

  return { count, skipped: false };
}
