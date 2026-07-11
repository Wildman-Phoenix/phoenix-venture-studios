import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback, spawn } from "node:child_process";
import { promisify } from "node:util";
import sharp from "sharp";
import { IMAGE_FAMILIES, getBackgroundVariantsForFamily } from "./background-library.mjs";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const GENERATED_SIGNAL_IMAGE_DIR = "images/signals/generated";
export const ARTICLE_SIGNAL_IMAGE_DIR = "images/signals/source-art";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const execFile = promisify(execFileCallback);
const DEFAULT_OUTPUT_ROOT = path.join(APP_ROOT, "public");
const DEFAULT_BACKGROUND_DIR = path.join(DEFAULT_OUTPUT_ROOT, "images/signals/backgrounds");
const VISION_AUDIT_SCRIPT = path.join(SCRIPT_DIR, "vision-image-audit.swift");
const FOUNDATION_EDITORIAL_REVIEW_SCRIPT = path.join(SCRIPT_DIR, "foundation-editorial-review.swift");
const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;
const ARTICLE_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];
const IMAGE_HASH_SIZE = 8;
const IMAGE_SIMILARITY_DISTANCE = 8;
const MIN_SOURCE_IMAGE_WIDTH = 900;
const MIN_SOURCE_IMAGE_HEIGHT = 500;
const MIN_GLOBAL_SHARPNESS = 8;
const MIN_GLOBAL_COLORFULNESS = 18;
const MIN_PHOENIX_OWNED_SHARPNESS = 5;
const MIN_PHOENIX_OWNED_COLORFULNESS = 30;
const MIN_PHOENIX_OWNED_TONAL_RANGE = 22;
const MIN_REGION_READABILITY = 0.5;
const SOURCE_IMAGE_REVIEW_PATTERNS = [
  { pattern: /\b(slide|slides|deck|diagram|chart|graph|screenshot)\b/i, reason: "source image looks like a slide, diagram, or screenshot instead of a story cover" },
  { pattern: /\b(headshot|speaker|portrait|avatar)\b/i, reason: "source image looks like a speaker or portrait shot instead of a story moment" },
  { pattern: /\b(logo|icon|thumbnail|thumb|placeholder|default)\b/i, reason: "source image looks like a logo, thumbnail, or placeholder asset" },
];
const CINEMATIC_EDITORIAL_COVER_PRINCIPLES = [
  "Use a cinematic editorial poster grammar: one dominant metaphor, strong light and shadow, and deliberate negative space for a bold headline.",
  "Pull out the article's key context instead of showing the article literally: the lock, threshold, risk, leverage point, workflow layer, or trust boundary.",
  "Use concrete anchors sparingly: one person silhouette, one device stack, one dashboard, one room, or one symbolic architecture. Do not build a cluttered collage.",
  "Let supporting details prove the metaphor: app cards, charts, files, messages, capital flows, handoff lines, or compute layers should feel intentional and readable at thumbnail size.",
  "Avoid generic office scenes, showroom product staging, fake logos, celebrity likenesses, overstuffed UI panels, and decorative AI clouds."
];
const COMPOSITION_AUDIT_REGIONS = {
  "left-anchor": { left: 56, top: 74, width: 560, height: 360 },
  "split-panel": { left: 56, top: 86, width: 544, height: 352 },
  "right-anchor": { left: 588, top: 82, width: 556, height: 356 },
  "lower-band": { left: 60, top: 262, width: 824, height: 248 },
};
const MAX_TEXT_COVERAGE = 0.12;
const MAX_TEXT_OBSERVATIONS = 4;
const MAX_SINGLE_FACE_AREA_RATIO = 0.24;
const MAX_LOW_CONFIDENCE_HANDS = 0;

export const DEFAULT_IMAGE_SOURCE_ALLOWLIST = {
  defaultPolicy: "reference-only",
  sources: {},
};

const TEMPLATE_STYLES = {
  breaking_signal: {
    label: "BREAKING SIGNAL",
    shadeStop: "#061a2f",
    panelOpacity: 0.92,
  },
  founder_brief: {
    label: "FOUNDER BRIEF",
    shadeStop: "#08233d",
    panelOpacity: 0.9,
  },
  market_warning: {
    label: "MARKET WARNING",
    shadeStop: "#120f18",
    panelOpacity: 0.95,
  },
  opportunity_window: {
    label: "OPPORTUNITY WINDOW",
    shadeStop: "#05263d",
    panelOpacity: 0.88,
  },
};

const IMAGE_VARIANTS = ["signal-rail", "field-note", "operator-map", "capital-pulse"];
const IMAGE_TONES = ["electric", "ember", "aqua", "steel"];
const IMAGE_COMPOSITIONS = ["left-anchor", "split-panel", "right-anchor", "lower-band"];
const VISUAL_HISTORY_WINDOW_DAYS = 45;

const SCENE_MOTIFS = {
  frontier_funding: ["valuation-arc", "capital-grid", "proof-stack", "adoption-rings", "deal-window", "signal-ledger"],
  capital_growth: ["revenue-curve", "budget-signal", "contract-beam", "proof-dashboard", "market-ladder", "buyer-window"],
  chip_infrastructure: ["memory-rails", "server-lattice", "inference-flow", "chip-core", "throughput-map", "bandwidth-fan"],
  reliability_lab: ["benchmark-panels", "failure-board", "ops-scorecards", "pass-fail-grid", "test-lab", "risk-gauges"],
  workflow_system: ["agent-graph", "handoff-grid", "audit-terminal", "automation-loop", "task-weave", "control-surface"],
  talent_motion: ["talent-pipeline", "org-constellation", "role-shift", "candidate-flow", "team-velocity", "hiring-wave"],
  event_pipeline: ["booth-stage", "camera-floor", "lead-cascade", "content-engine", "demo-bay", "followup-lane"],
  document_flow: ["document-stack", "extraction-grid", "field-parser", "ocr-cascade", "paperwork-lane", "intake-rails"],
  interactive_build: ["prototype-cards", "quiz-board", "builder-surface", "prompt-studio", "click-flow", "product-sprint"],
  mission_grant: ["grant-board", "community-map", "mission-network", "education-frame", "support-ledger", "public-good-grid"],
  search_visibility: ["query-field", "ranking-lines", "signal-index", "discovery-grid", "visibility-lane", "citation-map"],
  distress_signal: ["debt-rift", "cash-crack", "pressure-ledger", "collapse-bars", "fragility-grid", "strain-wave"],
  human_boundary: ["human-ai-split", "judgment-desk", "review-line", "assist-vs-replace", "control-window", "trust-boundary"],
  general: ["signal-atlas", "market-field", "founder-map", "decision-window", "strategy-grid", "clarity-beam"],
};

function escapeSvg(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function normalizePolicyKey(value = "") {
  return normalizeText(value)
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function urlHost(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function textMatches(value, pattern) {
  return new RegExp(`\\b(${pattern})\\b`, "i").test(value);
}

export function wrapText(value = "", maxChars = 25, maxLines = 4) {
  const words = normalizeText(value).split(" ").filter(Boolean);
  const lines = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = word;
    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);

  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,;:!?-]+$/, "")}...`;
  }

  return lines.length ? lines : ["Founder Signal"];
}

function formatDate(value, now = new Date()) {
  const parsed = new Date(Date.parse(value) || now.getTime());
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function compactCategoryLabel(value = "") {
  const category = normalizeText(value).toUpperCase();
  const replacements = {
    "FOUNDER STRATEGY & OPERATIONS": "STRATEGIC SIGNAL",
    "FOUNDER STRATEGY SIGNAL": "STRATEGIC SIGNAL",
    "COACHING, CONSULTING & ENTREPRENEURSHIP": "CONSULTING",
    "AI REVENUE OPPORTUNITIES": "AI REVENUE",
    "AI OPERATOR IMPACT": "MARKET SIGNAL",
    "AI INFRASTRUCTURE SIGNAL": "MARKET SIGNAL",
    "JAMSTACK OPERATING SYSTEMS": "JAMSTACK OPS",
    "MARKET & REGULATORY": "MARKET RISK",
    "FUNDING & VENTURE": "FUNDING SIGNAL",
    "VENTURE FUNDING SIGNAL": "FUNDING SIGNAL",
    "CAPITAL MARKET SIGNAL": "CAPITAL SIGNAL",
    "BUSINESS CREDIT SIGNAL": "CAPITAL SIGNAL",
    "GROWTH CAPITAL SIGNAL": "FUNDING SIGNAL",
    "REGULATORY SIGNAL": "MARKET SIGNAL",
    "MARKET RISK SIGNAL": "MARKET SIGNAL",
  };
  return replacements[category] || category.slice(0, 26);
}

function shouldShowStoryAngleLabel(category = "", storyAngle = "") {
  const normalizedCategory = normalizeText(category).toUpperCase();
  const normalizedStoryAngle = normalizeText(storyAngle).toUpperCase();

  if (!normalizedStoryAngle) return false;
  if (!normalizedCategory) return true;
  if (normalizedStoryAngle === normalizedCategory) return false;

  const genericLabelPhrases = new Set([
    "FOUNDER SIGNAL",
    "MARKET SIGNAL",
    "FUNDING SIGNAL",
    "CAPITAL SIGNAL",
    "RISK SIGNAL",
    "DISTRESS SIGNAL",
  ]);

  if (genericLabelPhrases.has(normalizedStoryAngle)) return false;
  if (normalizedStoryAngle.endsWith(" SIGNAL")) return false;

  return true;
}

function getFamilyConfig(family) {
  return IMAGE_FAMILIES[family] ?? IMAGE_FAMILIES.wildcard_attention;
}

function deterministicIndex(seed = "", modulo = 1, salt = "") {
  if (modulo <= 1) return 0;
  const hash = createHash("sha1").update(`${salt}:${seed}`).digest("hex");
  return Number.parseInt(hash.slice(0, 8), 16) % modulo;
}

function deterministicFraction(seed = "", salt = "") {
  const hash = createHash("sha1").update(`${salt}:${seed}`).digest("hex");
  return Number.parseInt(hash.slice(0, 8), 16) / 0xffffffff;
}

function clamp01(value = 0) {
  return Math.max(0, Math.min(1, value));
}

function withAlpha(hex = "#ffffff", alpha = 1) {
  const clean = String(hex).replace("#", "").trim();
  const normalized = clean.length === 3
    ? clean.split("").map((char) => char + char).join("")
    : clean.padEnd(6, "0").slice(0, 6);
  const channel = Math.round(clamp01(alpha) * 255).toString(16).padStart(2, "0");
  return `#${normalized}${channel}`;
}

function recentVisualEntries(recentItems = []) {
  const cutoff = Date.now() - VISUAL_HISTORY_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return recentItems
    .map((item) => item?._phoenix || item || {})
    .filter((item) => {
      const stamp = Date.parse(item.lastSeenAt || item.generatedAt || item.publishedAt || item.date_published || "");
      return Number.isFinite(stamp) && stamp >= cutoff;
    });
}

function sceneLaneForItem(item) {
  const text = normalizeText([
    item.publicTitle,
    item.title,
    item.description,
    item.bucketLabel,
    item.storySubject,
    item.storyAngle,
  ].filter(Boolean).join(" ")).toLowerCase();

  if (textMatches(text, "memory|inference|chip|gpu|server|semiconductor|hardware|bandwidth")) return "chip_infrastructure";
  if (textMatches(text, "benchmark|score|reliability|eval|evaluation|test harness|pass-fail|enterprise it")) return "reliability_lab";
  if (textMatches(text, "dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent|workflow|automation|audit|mcp|token|codex|delivery")) return "workflow_system";
  if (textMatches(text, "laid-off|layoff|hiring|recruiting|workers|talent")) return "talent_motion";
  if (textMatches(text, "trade show|pipeline|booth|event|conference|demo")) return "event_pipeline";
  if (textMatches(text, "ocr|document parsing|documents|forms|paperwork|intake")) return "document_flow";
  if (textMatches(text, "quiz|vibe coded|prototype|prototypes|google ai studio|product studio|interactive")) return "interactive_build";
  if (textMatches(text, "nonprofit|grant|grants|community innovation|public good|education")) return "mission_grant";
  if (textMatches(text, "seo|invisible|search visibility|discoverability|ranking|search")) return "search_visibility";
  if (textMatches(text, "bankruptcy|bankrupt|debt|fraud|insolvency|cash strain|collapse")) return "distress_signal";
  if (textMatches(text, "shouldn t replace humans|shouldn't replace humans|human judgment|replace humans")) return "human_boundary";
  if (textMatches(text, "valuation|ipo|funding race|raise|raised|investor|billion|trillion")) return "frontier_funding";
  if (textMatches(text, "revenue|budget cutting|sales growth|contract|buyers|deal flow|trust at scale")) return "capital_growth";
  return "general";
}

function buildVisualFingerprint(parts = {}) {
  const payload = [
    parts.sceneLane || "general",
    parts.sceneMotif || "signal-atlas",
    parts.imageComposition || "left-anchor",
    parts.imageTone || "steel",
    parts.imageVariant || "signal-rail",
    parts.template || "founder_brief",
  ].join("|");
  return createHash("sha1").update(payload).digest("hex").slice(0, 16);
}

function buildRecentFingerprintSet(recentItems = []) {
  const entries = recentVisualEntries(recentItems);
  const set = new Set();
  for (const entry of entries) {
    const fingerprint = entry.imageFingerprint || buildVisualFingerprint({
      sceneLane: entry.sceneLane,
      sceneMotif: entry.sceneMotif,
      imageComposition: entry.imageComposition,
      imageTone: entry.imageTone,
      imageVariant: entry.imageVariant,
      template: entry.imageTemplate,
    });
    if (fingerprint) set.add(fingerprint);
  }
  return set;
}

function chooseSceneMotif(item, recentItems = [], usedFingerprints = new Set()) {
  const sceneLane = sceneLaneForItem(item);
  const motifs = SCENE_MOTIFS[sceneLane] || SCENE_MOTIFS.general;
  const recentFingerprints = buildRecentFingerprintSet(recentItems);
  const seed = item.slug || item.originalUrl || item.url || item.title || sceneLane;

  for (let offset = 0; offset < motifs.length * IMAGE_COMPOSITIONS.length * IMAGE_TONES.length; offset += 1) {
    const motif = motifs[(deterministicIndex(seed, motifs.length, `motif:${offset}`) + offset) % motifs.length];
    const imageComposition = IMAGE_COMPOSITIONS[(deterministicIndex(seed, IMAGE_COMPOSITIONS.length, `composition:${offset}`) + offset) % IMAGE_COMPOSITIONS.length];
    const imageTone = IMAGE_TONES[(deterministicIndex(seed, IMAGE_TONES.length, `tone:${offset}`) + offset) % IMAGE_TONES.length];
    const imageVariant = IMAGE_VARIANTS[(deterministicIndex(seed, IMAGE_VARIANTS.length, `variant:${offset}`) + offset) % IMAGE_VARIANTS.length];
    const fingerprint = buildVisualFingerprint({
      sceneLane,
      sceneMotif: motif,
      imageComposition,
      imageTone,
      imageVariant,
      template: item.imageTemplate || item.imageBrief?.template,
    });
    if (!recentFingerprints.has(fingerprint) && !usedFingerprints.has(fingerprint)) {
      usedFingerprints.add(fingerprint);
      return { sceneLane, sceneMotif: motif, imageComposition, imageTone, imageVariant, imageFingerprint: fingerprint };
    }
  }

  const fallbackMotif = motifs[deterministicIndex(seed, motifs.length, "motif-fallback")];
  const imageComposition = IMAGE_COMPOSITIONS[deterministicIndex(seed, IMAGE_COMPOSITIONS.length, "composition-fallback")];
  const imageTone = IMAGE_TONES[deterministicIndex(seed, IMAGE_TONES.length, "tone-fallback")];
  const imageVariant = IMAGE_VARIANTS[deterministicIndex(seed, IMAGE_VARIANTS.length, "variant-fallback")];
  const imageFingerprint = buildVisualFingerprint({
    sceneLane,
    sceneMotif: fallbackMotif,
    imageComposition,
    imageTone,
    imageVariant,
    template: item.imageTemplate || item.imageBrief?.template,
  });
  usedFingerprints.add(imageFingerprint);
  return { sceneLane, sceneMotif: fallbackMotif, imageComposition, imageTone, imageVariant, imageFingerprint };
}

export function assignImageCreativeDirection(item, options = {}) {
  const usedFingerprints = options.usedFingerprints || new Set();
  const uniqueScene = chooseSceneMotif(item, options.recentItems || [], usedFingerprints);
  return {
    sceneLane: item.sceneLane || uniqueScene.sceneLane,
    sceneMotif: item.sceneMotif || uniqueScene.sceneMotif,
    imageVariant: item.imageVariant || uniqueScene.imageVariant,
    imageTone: item.imageTone || uniqueScene.imageTone,
    imageComposition: item.imageComposition || uniqueScene.imageComposition,
    imageFingerprint: item.imageFingerprint || uniqueScene.imageFingerprint,
  };
}

function getBackgroundPathForFamily(family, seed = "") {
  const config = getFamilyConfig(family);
  const variants = getBackgroundVariantsForFamily(family);
  const selectedPath = variants[deterministicIndex(`${family}:${seed || config.publicPath}`, variants.length, "background-variant")] || config.publicPath;
  return path.join(DEFAULT_OUTPUT_ROOT, selectedPath.replace(/^\//, ""));
}

async function resolveOwnedBackgroundPath(family, seed = "") {
  const config = getFamilyConfig(family);
  const variants = getBackgroundVariantsForFamily(family);
  const selectedPath = variants[deterministicIndex(`${family}:${seed || config.publicPath}`, variants.length, "background-variant")] || config.publicPath;
  const candidatePaths = [selectedPath, ...variants.filter((variant) => variant !== selectedPath), config.publicPath];

  for (const publicPath of candidatePaths) {
    const backgroundPath = path.join(DEFAULT_OUTPUT_ROOT, publicPath.replace(/^\//, ""));
    try {
      await fs.access(backgroundPath);
      return { path: backgroundPath, family, missingPrimary: false };
    } catch {
      // Try the next background variant before falling back to the source asset.
    }
  }

  return {
    path: path.join(APP_ROOT, config.fallbackSource),
    family,
    missingPrimary: true,
  };
}

function getGeneratedImagePublicPath(item) {
  return `/${GENERATED_SIGNAL_IMAGE_DIR}/${item.slug}.jpg`;
}

function getOwnedGeneratedImagePath(value = "") {
  const imageValue = String(value || "").trim();
  if (!imageValue) return "";

  if (/^https?:\/\//i.test(imageValue)) {
    try {
      const imageUrl = new URL(imageValue);
      return imageUrl.pathname.startsWith(`/${GENERATED_SIGNAL_IMAGE_DIR}/`) ? imageUrl.pathname : "";
    } catch {
      return "";
    }
  }

  const normalizedPath = imageValue.startsWith("/") ? imageValue : `/${imageValue}`;
  return normalizedPath.startsWith(`/${GENERATED_SIGNAL_IMAGE_DIR}/`) ? normalizedPath : "";
}

function getArticleImageRoot(options = {}) {
  return options.articleImageRoot || path.join(options.outputRoot || DEFAULT_OUTPUT_ROOT, ARTICLE_SIGNAL_IMAGE_DIR);
}

function getArticleImagePublicPath(filePath, options = {}) {
  const outputRoot = options.outputRoot || DEFAULT_OUTPUT_ROOT;
  const relative = path.relative(outputRoot, filePath).split(path.sep).join("/");
  return relative.startsWith("..") ? "" : `/${relative}`;
}

function bufferToDataHashHex(buffer) {
  return Array.from(buffer).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function computeImageVisualHash(input) {
  const pixels = await sharp(input)
    .resize(IMAGE_HASH_SIZE + 1, IMAGE_HASH_SIZE, { fit: "fill" })
    .grayscale()
    .raw()
    .toBuffer();

  const bits = [];
  for (let y = 0; y < IMAGE_HASH_SIZE; y += 1) {
    for (let x = 0; x < IMAGE_HASH_SIZE; x += 1) {
      const left = pixels[y * (IMAGE_HASH_SIZE + 1) + x];
      const right = pixels[y * (IMAGE_HASH_SIZE + 1) + x + 1];
      bits.push(left > right ? 1 : 0);
    }
  }

  const bytes = Buffer.alloc(bits.length / 8);
  for (let i = 0; i < bits.length; i += 1) {
    const byteIndex = Math.floor(i / 8);
    bytes[byteIndex] = (bytes[byteIndex] << 1) | bits[i];
    if (i % 8 === 7) bytes[byteIndex] &= 0xff;
  }
  return bufferToDataHashHex(bytes);
}

export function hammingDistanceHex(left = "", right = "") {
  if (!left || !right || left.length !== right.length) return Number.MAX_SAFE_INTEGER;
  let distance = 0;
  for (let i = 0; i < left.length; i += 2) {
    const value = Number.parseInt(left.slice(i, i + 2), 16) ^ Number.parseInt(right.slice(i, i + 2), 16);
    distance += value.toString(2).split("1").length - 1;
  }
  return distance;
}

function buildRecentVisualHashes(recentItems = []) {
  const entries = recentVisualEntries(recentItems);
  return entries
    .map((entry) => entry.imageVisualHash || "")
    .filter(Boolean);
}

function isTooSimilarToRecentHash(candidateHash, recentHashes = [], usedHashes = []) {
  return [...recentHashes, ...usedHashes].some((existingHash) => hammingDistanceHex(candidateHash, existingHash) <= IMAGE_SIMILARITY_DISTANCE);
}

function computeNumericStats(values = []) {
  if (!values.length) {
    return { mean: 0, stddev: 0 };
  }
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return { mean, stddev: Math.sqrt(variance) };
}

function normalizeScore(value, min, max) {
  if (max <= min) return value >= max ? 1 : 0;
  return clamp01((value - min) / (max - min));
}

function safeNumber(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function averageMetrics(entries = []) {
  if (!entries.length) return null;
  const totals = entries.reduce((accumulator, entry) => {
    accumulator.colorfulness += Number(entry.colorfulness || 0);
    accumulator.sharpness += Number(entry.sharpness || 0);
    accumulator.luminanceStdDev += Number(entry.luminanceStdDev || 0);
    accumulator.readability += Number(entry.readability || 0);
    return accumulator;
  }, {
    colorfulness: 0,
    sharpness: 0,
    luminanceStdDev: 0,
    readability: 0,
  });
  return {
    colorfulness: totals.colorfulness / entries.length,
    sharpness: totals.sharpness / entries.length,
    luminanceStdDev: totals.luminanceStdDev / entries.length,
    readability: totals.readability / entries.length,
  };
}

function metricDistance(left, right) {
  if (!left || !right) return Number.POSITIVE_INFINITY;
  return Math.sqrt(
    ((Number(left.colorfulness || 0) - Number(right.colorfulness || 0)) / 24) ** 2 +
    ((Number(left.sharpness || 0) - Number(right.sharpness || 0)) / 16) ** 2 +
    ((Number(left.luminanceStdDev || 0) - Number(right.luminanceStdDev || 0)) / 24) ** 2 +
    ((Number(left.readability || 0) - Number(right.readability || 0)) / 0.24) ** 2
  );
}

function deriveLearningSignal(metrics, context = {}, reviewMemory = []) {
  const lane = context.sceneLane || "general";
  const mode = context.reviewMode || "source-image";
  const candidates = (Array.isArray(reviewMemory) ? reviewMemory : [])
    .filter((entry) =>
      entry &&
      entry.sceneLane === lane &&
      entry.reviewMode === mode &&
      entry.metrics
    )
    .slice(-120);

  const approved = candidates
    .filter((entry) => entry.outcome === "approved")
    .map((entry) => entry.metrics);
  const rejected = candidates
    .filter((entry) => entry.outcome === "rejected")
    .map((entry) => entry.metrics);

  if (!approved.length && !rejected.length) return null;

  const candidateVector = {
    colorfulness: Number(metrics.colorfulness || 0),
    sharpness: Number(metrics.sharpness || 0),
    luminanceStdDev: Number(metrics.luminanceStdDev || 0),
    readability: Number(metrics.bestComposition?.readability || 0),
  };

  const approvedCenter = averageMetrics(approved);
  const rejectedCenter = averageMetrics(rejected);
  const distanceToApproved = approvedCenter ? metricDistance(candidateVector, approvedCenter) : Number.POSITIVE_INFINITY;
  const distanceToRejected = rejectedCenter ? metricDistance(candidateVector, rejectedCenter) : Number.POSITIVE_INFINITY;

  return {
    lane,
    reviewMode: mode,
    approvedExamples: approved.length,
    rejectedExamples: rejected.length,
    distanceToApproved: Number.isFinite(distanceToApproved) ? Number(distanceToApproved.toFixed(3)) : null,
    distanceToRejected: Number.isFinite(distanceToRejected) ? Number(distanceToRejected.toFixed(3)) : null,
    shouldReject:
      rejected.length >= 2 &&
      Number.isFinite(distanceToRejected) &&
      distanceToRejected + 0.22 < distanceToApproved,
  };
}

function buildEditorialFixNotes(metrics, context = {}, reasons = []) {
  const notes = [];
  const fixes = [];

  if (Number(metrics.colorfulness || 0) < 22) {
    notes.push("The image does not have enough color energy.");
    fixes.push("Add more color pop or choose a source image with clearer visual contrast.");
  }
  if (Number(metrics.luminanceStdDev || 0) < 36) {
    notes.push("The tonal range is too flat.");
    fixes.push("Use deeper shadows and brighter highlights so the story has more tension.");
  }
  if (Number(metrics.sharpness || 0) < 10) {
    notes.push("The image reads too soft at social size.");
    fixes.push("Use a sharper base image with a cleaner focal subject.");
  }
  if (Number(metrics.bestComposition?.readability || 0) < MIN_REGION_READABILITY) {
    notes.push("The headline area is too busy or bright.");
    fixes.push("Choose a composition with cleaner negative space for the title overlay.");
  }
  if (context.sceneLane === "event_pipeline" && Number(metrics.colorfulness || 0) < 28) {
    notes.push("The event scene feels generic instead of high-stakes.");
    fixes.push("Use a trade-show image with a stronger focal moment, demo, booth interaction, or lead-capture tension.");
  }
  if (context.sceneLane === "human_boundary" && Number(metrics.bestComposition?.readability || 0) < 0.62) {
    fixes.push("Use a clearer human-versus-tool moment so the review angle is obvious at thumbnail size.");
  }
  if (reasons.some((reason) => /pattern that this lane has already rejected/i.test(reason))) {
    notes.push("This looks too much like images we already learned to reject in this lane.");
    fixes.push("Pick a more distinct scene and avoid reusing the same visual setup for this story type.");
  }

  return {
    notes: notes.slice(0, 4),
    fixes: fixes.slice(0, 4),
  };
}

function buildPromptAdjustment(attempt = 1, auditMetrics = {}) {
  const fixes = Array.isArray(auditMetrics.recommendedFixes) ? auditMetrics.recommendedFixes : [];
  const notes = Array.isArray(auditMetrics.editorialNotes) ? auditMetrics.editorialNotes : [];
  const guidance = [
    ...fixes,
    ...notes.map((note) => `Avoid this issue: ${note}`),
  ].filter(Boolean);
  const variationHints = [
    "Change the framing and move to a different camera position.",
    "Push the shadows and color contrast harder without making the image muddy.",
    "Use a more specific real-world subject with clearer focal tension.",
    "Leave cleaner negative space for the headline overlay.",
  ];
  return [
    `Retry ${attempt}.`,
    ...guidance,
    variationHints[(attempt - 1) % variationHints.length],
  ].join(" ");
}

function mutateImageBriefForRetry(imageBrief, auditMetrics = {}, attempt = 1) {
  const adjustment = buildPromptAdjustment(attempt, auditMetrics);
  return {
    ...imageBrief,
    imagePrompt: `${imageBrief.imagePrompt} ${adjustment}`.trim(),
  };
}

function buildAuditFingerprint(source = "", title = "") {
  return `${String(source || "")} ${String(title || "")}`.toLowerCase();
}

async function computeImageVisualMetrics(input) {
  const { data, info } = await sharp(input)
    .rotate()
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let sumLuma = 0;
  let sumLumaSq = 0;
  let sumRg = 0;
  let sumRgSq = 0;
  let sumYb = 0;
  let sumYbSq = 0;
  const pixelCount = info.width * info.height;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const rg = r - g;
    const yb = ((r + g) / 2) - b;
    sumLuma += luma;
    sumLumaSq += luma * luma;
    sumRg += rg;
    sumRgSq += rg * rg;
    sumYb += yb;
    sumYbSq += yb * yb;
  }

  const meanLuma = pixelCount ? sumLuma / pixelCount : 0;
  const lumaVariance = pixelCount ? Math.max(0, (sumLumaSq / pixelCount) - meanLuma ** 2) : 0;
  const rgMean = pixelCount ? sumRg / pixelCount : 0;
  const rgStd = Math.sqrt(pixelCount ? Math.max(0, (sumRgSq / pixelCount) - rgMean ** 2) : 0);
  const ybMean = pixelCount ? sumYb / pixelCount : 0;
  const ybStd = Math.sqrt(pixelCount ? Math.max(0, (sumYbSq / pixelCount) - ybMean ** 2) : 0);
  const colorfulness = Math.sqrt(rgStd ** 2 + ybStd ** 2) + 0.3 * Math.sqrt(rgMean ** 2 + ybMean ** 2);

  const sharpnessBuffer = await sharp(input)
    .rotate()
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" })
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [
        0, -1, 0,
        -1, 4, -1,
        0, -1, 0,
      ],
    })
    .raw()
    .toBuffer();

  const sharpnessValues = Array.from(sharpnessBuffer);
  const sharpnessStats = computeNumericStats(sharpnessValues);

  return {
    normalizedBuffer: await sharp(input).rotate().resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover" }).jpeg({ quality: 92, mozjpeg: true }).toBuffer(),
    width: info.width,
    height: info.height,
    luminanceMean: meanLuma,
    luminanceStdDev: Math.sqrt(lumaVariance),
    colorfulness,
    sharpness: sharpnessStats.stddev,
  };
}

async function computeRegionReadabilityMetrics(normalizedBuffer, region) {
  const grayscale = await sharp(normalizedBuffer)
    .extract(region)
    .grayscale()
    .raw()
    .toBuffer();
  const lumaStats = computeNumericStats(Array.from(grayscale));

  const laplacian = await sharp(normalizedBuffer)
    .extract(region)
    .grayscale()
    .convolve({
      width: 3,
      height: 3,
      kernel: [
        0, -1, 0,
        -1, 4, -1,
        0, -1, 0,
      ],
    })
    .raw()
    .toBuffer();
  const textureStats = computeNumericStats(Array.from(laplacian));

  const darknessScore = normalizeScore(180 - lumaStats.mean, 18, 120);
  const calmScore = 1 - normalizeScore(lumaStats.stddev, 28, 74);
  const textureScore = 1 - normalizeScore(textureStats.stddev, 18, 70);
  const readability = clamp01(darknessScore * 0.5 + calmScore * 0.3 + textureScore * 0.2);

  return {
    meanLuma: lumaStats.mean,
    lumaStdDev: lumaStats.stddev,
    textureStdDev: textureStats.stddev,
    readability,
  };
}

async function runLocalVisionAudit(input, options = {}) {
  if (typeof options.analyzeImageVisionImpl === "function") {
    return await options.analyzeImageVisionImpl(input, options);
  }
  if (process.env.VITEST === "true") {
    return null;
  }

  const tempDir = await fs.mkdtemp(path.join(options.tmpRoot || path.join(APP_ROOT, "tmp"), "phoenix-vision-audit-"));
  const imagePath = path.join(tempDir, "input.jpg");
  try {
    await fs.mkdir(path.dirname(imagePath), { recursive: true });
    await sharp(input)
      .rotate()
      .jpeg({ quality: 92, mozjpeg: true })
      .toFile(imagePath);
    const { stdout } = await execFile("/usr/bin/swift", [VISION_AUDIT_SCRIPT, imagePath], {
      cwd: APP_ROOT,
      maxBuffer: 1024 * 1024 * 4,
    });
    return JSON.parse(stdout || "{}");
  } catch {
    return null;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => null);
  }
}

async function runLocalEditorialReview(input, options = {}) {
  if (typeof options.editorialReviewImpl === "function") {
    return await options.editorialReviewImpl(input, options);
  }
  if (process.env.VITEST === "true" || options.disableLocalEditorialReview === true) {
    return null;
  }

  const tempDir = await fs.mkdtemp(path.join(options.tmpRoot || path.join(APP_ROOT, "tmp"), "phoenix-editorial-review-"));
  const inputPath = path.join(tempDir, "input.json");
  try {
    await fs.writeFile(inputPath, JSON.stringify(input, null, 2), "utf8");
    const { stdout } = await execFile("/usr/bin/swift", [FOUNDATION_EDITORIAL_REVIEW_SCRIPT, inputPath], {
      cwd: APP_ROOT,
      maxBuffer: 1024 * 1024 * 2,
      timeout: options.localEditorialReviewTimeoutMs || 30000,
    });
    return JSON.parse(String(stdout || "{}").trim());
  } catch {
    return null;
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => null);
  }
}

function normalizeEditorialVerdict(review = null) {
  const verdict = String(review?.verdict || "")
    .toLowerCase()
    .split(/[^a-z]+/i)
    .filter(Boolean);
  if (verdict.includes("reject")) return "reject";
  if (verdict.includes("revise")) return "revise";
  if (verdict.includes("approve")) return "approve";
  return review ? "unknown" : "";
}

async function auditCoverCandidateImage(input, context = {}) {
  const metadata = await sharp(input).metadata();
  const metrics = await computeImageVisualMetrics(input);
  const vision = await runLocalVisionAudit(input, context);
  const reasons = [];
  const warnings = [];
  const patternSource = buildAuditFingerprint(context.sourceImageUrl || context.sourceUrl || "", context.title || "");
  const reviewMode = context.reviewMode || "source-image";

  if (reviewMode === "source-image") {
    for (const entry of SOURCE_IMAGE_REVIEW_PATTERNS) {
      if (entry.pattern.test(patternSource)) {
        reasons.push(entry.reason);
      }
    }

    if ((metadata.width || 0) < MIN_SOURCE_IMAGE_WIDTH || (metadata.height || 0) < MIN_SOURCE_IMAGE_HEIGHT) {
      reasons.push("source image is too small to make a strong social cover");
    }

    if (
      metrics.sharpness < MIN_GLOBAL_SHARPNESS &&
      metrics.colorfulness < 14 &&
      metrics.luminanceStdDev < 22
    ) {
      reasons.push("source image is too soft or blurry for a clean headline-led cover");
    }

    if (metrics.colorfulness < MIN_GLOBAL_COLORFULNESS && metrics.luminanceStdDev < 42) {
      reasons.push("source image is visually flat and does not create enough contrast or energy");
    }

    if (context.sceneLane === "event_pipeline" && metrics.colorfulness < 24) {
      reasons.push("event image feels too generic and lacks enough visual energy for a strong event or pipeline story");
    }
  } else if (reviewMode === "phoenix-owned") {
    if (
      metrics.sharpness < MIN_PHOENIX_OWNED_SHARPNESS &&
      metrics.luminanceStdDev < MIN_PHOENIX_OWNED_TONAL_RANGE
    ) {
      reasons.push("Phoenix-owned backup image is too soft and flat to pass as a story-specific editorial cover");
    }
    if (
      context.sceneLane === "search_visibility" &&
      metrics.sharpness < 4.5 &&
      metrics.luminanceStdDev < 28
    ) {
      reasons.push("Phoenix-owned search-visibility cover is too soft and flat to feel relevant to the story");
    }
  }

  if (vision) {
    if (
      reviewMode === "source-image" &&
      (safeNumber(vision.textCoverage) > MAX_TEXT_COVERAGE || safeNumber(vision.textObservationCount) >= MAX_TEXT_OBSERVATIONS)
    ) {
      reasons.push("source image contains too much on-image text and reads like a slide, screenshot, or promo graphic");
    }

    if (
      reviewMode === "source-image" &&
      safeNumber(vision.faceCount) === 1 &&
      safeNumber(vision.maxFaceAreaRatio) > MAX_SINGLE_FACE_AREA_RATIO &&
      !["talent_motion", "human_boundary"].includes(context.sceneLane || "")
    ) {
      reasons.push("source image is dominated by a single face and reads more like a generic portrait than a story cover");
    }

    if (
      safeNumber(vision.faceCount) > 0 &&
      safeNumber(vision.landmarkedFaceCount) < safeNumber(vision.faceCount)
    ) {
      warnings.push("Face analysis found weak landmark coverage on at least one face, so the image may need a closer visual check.");
    }

    if (
      safeNumber(vision.handCount) > 0 &&
      safeNumber(vision.lowConfidenceHandCount) > MAX_LOW_CONFIDENCE_HANDS
    ) {
      reasons.push("hand analysis found low-confidence or incomplete hands, so the anatomy may read as off");
    }

    if (
      reviewMode === "phoenix-owned" &&
      !context.sourceImageUrl &&
      safeNumber(vision.textObservationCount) === 0 &&
      safeNumber(vision.faceCount) === 0 &&
      metrics.colorfulness < MIN_PHOENIX_OWNED_COLORFULNESS &&
      metrics.luminanceStdDev < MIN_PHOENIX_OWNED_TONAL_RANGE + 4
    ) {
      reasons.push("Phoenix-owned backup image still reads like an abstract placeholder instead of a story-specific scene");
    }
  }

  const compositionEntries = await Promise.all(
    Object.entries(COMPOSITION_AUDIT_REGIONS).map(async ([composition, region]) => ([
      composition,
      await computeRegionReadabilityMetrics(metrics.normalizedBuffer, region),
    ]))
  );
  const compositionScores = Object.fromEntries(compositionEntries);
  const sortedCompositions = compositionEntries
    .map(([composition, regionMetrics]) => ({ composition, ...regionMetrics }))
    .sort((left, right) => right.readability - left.readability);
  const bestComposition = sortedCompositions[0] || { composition: context.preferredComposition || "left-anchor", readability: 0 };
  const preferredComposition = context.preferredComposition || "left-anchor";
  const preferredScore = compositionScores[preferredComposition]?.readability ?? 0;
  const recommendedComposition =
    preferredScore >= bestComposition.readability - 0.08
      ? preferredComposition
      : bestComposition.composition;

  if (bestComposition.readability < MIN_REGION_READABILITY) {
    reasons.push("headline placement area is too busy or bright for a clean editorial cover");
  } else if (recommendedComposition !== preferredComposition) {
    warnings.push(`Moved headline layout from ${preferredComposition} to ${recommendedComposition} to avoid text conflict.`);
  }

  const learningSignal = deriveLearningSignal({
    colorfulness: metrics.colorfulness,
    sharpness: metrics.sharpness,
    luminanceStdDev: metrics.luminanceStdDev,
    bestComposition,
  }, context, context.imageReviewMemory || []);
  if (learningSignal?.shouldReject) {
    reasons.push("candidate matches a pattern that this lane has already rejected in recent review memory");
  } else if (
    learningSignal &&
    learningSignal.distanceToRejected !== null &&
    learningSignal.distanceToApproved !== null &&
    learningSignal.distanceToRejected < learningSignal.distanceToApproved
  ) {
    warnings.push("Candidate is closer to recently rejected image patterns than approved ones for this lane.");
  }

  const editorialFeedback = buildEditorialFixNotes({
    colorfulness: metrics.colorfulness,
    sharpness: metrics.sharpness,
    luminanceStdDev: metrics.luminanceStdDev,
    bestComposition,
  }, context, reasons);
  const editorialModelReview = await runLocalEditorialReview({
    title: context.title || "",
    sceneLane: context.sceneLane || "general",
    reviewMode: context.reviewMode || "source-image",
    blockedReasons: reasons,
    warnings,
    editorialNotes: editorialFeedback.notes,
    recommendedFixes: editorialFeedback.fixes,
    metrics: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      luminanceMean: Number(metrics.luminanceMean.toFixed(2)),
      luminanceStdDev: Number(metrics.luminanceStdDev.toFixed(2)),
      colorfulness: Number(metrics.colorfulness.toFixed(2)),
      sharpness: Number(metrics.sharpness.toFixed(2)),
      readability: Number((bestComposition.readability || 0).toFixed(3)),
    },
    vision: {
      textCoverage: safeNumber(vision?.textCoverage),
      textObservationCount: safeNumber(vision?.textObservationCount),
      faceCount: safeNumber(vision?.faceCount),
      landmarkedFaceCount: safeNumber(vision?.landmarkedFaceCount),
      maxFaceAreaRatio: safeNumber(vision?.maxFaceAreaRatio),
    },
  }, context);
  const normalizedEditorialVerdict = normalizeEditorialVerdict(editorialModelReview);
  if (normalizedEditorialVerdict === "reject") {
    reasons.push("editorial expert review rejected the image as not ready to publish");
  } else if (normalizedEditorialVerdict === "revise") {
    reasons.push("editorial expert review requires another revision before publish");
  } else if (normalizedEditorialVerdict === "unknown") {
    warnings.push("Editorial expert review returned an unclear verdict, so this image needs a closer check.");
  }

  return {
    blocked: reasons.length > 0,
    reasons,
    warnings,
    recommendedComposition,
    metrics: {
      width: metadata.width || 0,
      height: metadata.height || 0,
      luminanceMean: Number(metrics.luminanceMean.toFixed(2)),
      luminanceStdDev: Number(metrics.luminanceStdDev.toFixed(2)),
      colorfulness: Number(metrics.colorfulness.toFixed(2)),
      sharpness: Number(metrics.sharpness.toFixed(2)),
      bestComposition,
      compositionScores: Object.fromEntries(
        Object.entries(compositionScores).map(([key, value]) => [key, {
          meanLuma: Number(value.meanLuma.toFixed(2)),
          lumaStdDev: Number(value.lumaStdDev.toFixed(2)),
          textureStdDev: Number(value.textureStdDev.toFixed(2)),
          readability: Number(value.readability.toFixed(3)),
        }])
      ),
      learningSignal,
      vision,
      editorialNotes: editorialFeedback.notes,
      recommendedFixes: editorialFeedback.fixes,
      editorialModelReview: editorialModelReview
        ? {
            ...editorialModelReview,
            normalizedVerdict: normalizedEditorialVerdict,
          }
        : null,
    },
  };
}

export function expectedArticleImagePath(item) {
  const slug = item.slug || "unresolved-signal";
  return `/${ARTICLE_SIGNAL_IMAGE_DIR}/${slug}.jpg`;
}

async function resolveArticleSpecificImagePath(item, options = {}) {
  const directPath =
    item.articleImagePath ||
    item.generatedImagePath ||
    item.imageBrief?.articleImagePath ||
    options.articleImagePath;
  if (directPath) {
    const resolved = String(directPath).startsWith("/images/")
      ? path.join(options.outputRoot || DEFAULT_OUTPUT_ROOT, String(directPath).replace(/^\//, ""))
      : path.isAbsolute(directPath)
        ? directPath
        : path.join(options.outputRoot || DEFAULT_OUTPUT_ROOT, directPath.replace(/^\//, ""));
    await fs.access(resolved);
    return resolved;
  }

  const slug = item.slug;
  if (!slug) return "";
  const root = getArticleImageRoot(options);
  for (const extension of ARTICLE_IMAGE_EXTENSIONS) {
    const candidate = path.join(root, `${slug}${extension}`);
    try {
      await fs.access(candidate);
      return candidate;
    } catch {
      // Try the next supported image extension.
    }
  }
  return "";
}

export function resolveSourceImagePolicy(item, allowlist = DEFAULT_IMAGE_SOURCE_ALLOWLIST) {
  const normalizedAllowlist = allowlist || DEFAULT_IMAGE_SOURCE_ALLOWLIST;
  const defaultPolicy = normalizedAllowlist.defaultPolicy || "reference-only";
  const sources = normalizedAllowlist.sources || {};
  const externalImageUrl =
    /^https?:\/\//i.test(item.imageUrl || "") && !/\/images\/signals\//i.test(item.imageUrl || "")
      ? item.imageUrl
      : "";
  const sourceImageUrl = item.sourceImageUrl || item.publisherImageUrl || externalImageUrl || "";
  const candidates = [
    item.sourceId,
    item.sourceName,
    urlHost(item.sourceUrl),
    urlHost(item.originalUrl || item.url),
    urlHost(sourceImageUrl),
  ].filter(Boolean);

  let matchedKey = "";
  let matchedEntry = null;
  for (const candidate of candidates) {
    const keys = [candidate, normalizePolicyKey(candidate)];
    matchedKey = keys.find((key) => sources[key]) || "";
    if (matchedKey) {
      matchedEntry = sources[matchedKey];
      break;
    }
  }

  const policy = matchedEntry?.policy || defaultPolicy;
  const credit = matchedEntry?.credit || matchedEntry?.imageCredit || item.sourceName || "";
  const hasSourceImage = Boolean(sourceImageUrl);
  const requiresVisibility = policy !== "allowed";
  const rightsStatus =
    policy === "allowed"
      ? "allowlisted"
      : policy === "manual-review"
        ? "manual-review"
        : policy === "disallowed"
          ? "disallowed"
          : "reference-only";

  return {
    policy,
    rightsStatus,
    matchedKey,
    sourceImageUrl,
    credit,
    note: matchedEntry?.note || "",
    hasExplicitMatch: Boolean(matchedKey),
    hasSourceImage,
    canUseSourceImage: policy === "allowed" && hasSourceImage,
    manualReviewNeeded: requiresVisibility,
  };
}

function buildNonPublicSourceWarning(sourcePolicy) {
  if (sourcePolicy.policy === "allowed") return "";
  if (!sourcePolicy.hasExplicitMatch) {
    return "Source image needs manual review before it can be used as the cover.";
  }
  if (sourcePolicy.policy === "manual-review") {
    return "Source image requires manual review before it can be used as the cover.";
  }
  if (sourcePolicy.policy === "disallowed") {
    return "Source image is blocked for this story, so a Phoenix-owned replacement is required.";
  }
  return "Source image is marked reference-only and needs review before it can be used as the cover.";
}

function buildArticleSceneDirection(item, text = "") {
  const title = normalizeText(item.publicTitle || item.title || "Founder Signal");
  if (textMatches(text, "visa|payments|checkout|commerce|merchant|card")) {
    return {
      storySubject: "agentic payments moving closer to real transactions",
      visualMetaphor: "A modern payments ops desk with code, checkout events, and money movement in the same frame.",
      sceneDirective: "Show transaction flow, checkout states, secure approval cues, and live workflow coordination.",
      audiencePainOpportunity: "Founders need to know when AI tools are crossing from prototype work into trusted payment flows.",
    };
  }
  if (textMatches(text, "memory|chip|inference|gpu|semiconductor|server|hardware|bandwidth")) {
    return {
      storySubject: "the hardware bottleneck behind the next AI wave",
      visualMetaphor: "A hardware diagnostics scene with memory modules, throughput pressure, and engineers reading constraint signals.",
      sceneDirective: "Show chips, memory rails, server hardware, diagnostic dashboards, and visible data-flow pressure instead of a meeting room.",
      audiencePainOpportunity: "Founders need to see where infrastructure pressure is moving before the market starts pricing it in.",
    };
  }
  if (textMatches(text, "laid-off|layoff|hiring|recruiting|workers|talent")) {
    return {
      storySubject: "the talent market reshaping around fast AI companies",
      visualMetaphor: "A modern hiring situation room with talent pipelines, candidate movement, and team-speed pressure visible together.",
      sceneDirective: "Show recruiting flow, talent movement, and hiring pressure rather than a generic founder portrait or stock handshake.",
      audiencePainOpportunity: "Founders need to know when talent movement becomes an edge for faster companies.",
    };
  }
  if (textMatches(text, "trade show|pipeline|booth|event|conference")) {
    return {
      storySubject: "pipeline created from real-world attention",
      visualMetaphor: "A premium trade-show scene with live demos, follow-up signals, and pipeline movement captured in the background.",
      sceneDirective: "Show booth energy, in-person demos, lead flow, and deal momentum instead of stock networking smiles.",
      audiencePainOpportunity: "Founders need cleaner ways to turn attention into qualified conversations and real pipeline.",
    };
  }
  if (textMatches(text, "valuation|funding race|trillion|billion|adoption|frontier model|foundation model")) {
    return {
      storySubject: "the valuation race around frontier AI",
      visualMetaphor: "A high-stakes valuation room with growth curves, adoption dashboards, and infrastructure pressure visible at once.",
      sceneDirective: "Show revenue acceleration, investor pressure, model adoption signals, and the scale race without falling back to a generic boardroom.",
      audiencePainOpportunity: "Founders need to understand what kind of traction investors are actually rewarding before they copy the headline.",
    };
  }
  if (textMatches(text, "codex|software delivery|requirements analysis|developer productivity|engineering team")) {
    return {
      storySubject: "software delivery speeding up under agentic workflows",
      visualMetaphor: "A delivery war room with code review, task flow, and release speed visible in one coherent system.",
      sceneDirective: "Show development workflow, task routing, build status, and engineering coordination instead of a generic screen collage.",
      audiencePainOpportunity: "Founders need to see whether agentic delivery is actually compressing work or just moving complexity around.",
    };
  }
  if (textMatches(text, "revenue|budget cutting|selling point|pipeline|search startup|top line")) {
    return {
      storySubject: "growth created by a sharper business promise",
      visualMetaphor: "An executive growth desk with revenue curves, budget pressure, and buyer adoption signals in the same scene.",
      sceneDirective: "Show revenue momentum, enterprise budget scrutiny, and proof of adoption instead of generic success imagery.",
      audiencePainOpportunity: "Founders need to know what kind of promise still wins budget when buyers are cutting elsewhere.",
    };
  }
  if (textMatches(text, "benchmark|score|reliability|eval|evaluation|test harness|enterprise it")) {
    return {
      storySubject: "AI reliability under real enterprise workload",
      visualMetaphor: "An enterprise benchmark lab with failing scorecards, red and amber pass-fail indicators, and system test panels.",
      sceneDirective: "Show test results, benchmark boards, enterprise dashboards, and a reliability review environment rather than generic product marketing.",
      audiencePainOpportunity: "Founders need to know when an AI system is still a lab toy and when it is ready for live operations.",
    };
  }
  if (textMatches(text, "token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning")) {
    return {
      storySubject: "agent workflow cost control",
      visualMetaphor: "A lean engineering control room with token burn charts flattening, audit logs, and a simplified tool-chain map.",
      sceneDirective: "Show terminal audits, workflow diagrams, cost dashboards, and signs of a tighter stack. Avoid conference tables.",
      audiencePainOpportunity: "Founders need proof that AI workflows can get cheaper as they get more disciplined.",
    };
  }
  if (textMatches(text, "dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent")) {
    return {
      storySubject: "AI workflow orchestration",
      visualMetaphor: "A live orchestration board where subtasks branch, hand off, and rejoin around one operator.",
      sceneDirective: "Show agent graphs, task routing, nested workflow branches, and live coordination cues instead of a generic screen wall.",
      audiencePainOpportunity: "Founders need to see whether orchestration actually removes work or just adds another layer to manage.",
    };
  }
  if (textMatches(text, "ocr|document parsing|documents|transformers backend|forms|paperwork")) {
    return {
      storySubject: "documents turning into structured workflow input",
      visualMetaphor: "A document-processing desk with scanned forms, extraction panels, and structured fields coming to life.",
      sceneDirective: "Show OCR, parsed documents, structured data output, and business paperwork becoming usable workflow input.",
      audiencePainOpportunity: "Founders need to know when messy paperwork can finally become a fast, usable system.",
    };
  }
  if (textMatches(text, "quiz|vibe coded|google ai studio|io 2026|i/o 2026")) {
    return {
      storySubject: "fast interactive product experiments built with AI tools",
      visualMetaphor: "A playful product studio with quiz cards, prompt panels, and a lightweight build interface in motion.",
      sceneDirective: "Show interactive prototype building, playful interface pieces, and rapid iteration rather than a generic office.",
      audiencePainOpportunity: "Founders need to see how fast AI tools can turn an idea into something people can actually click and try.",
    };
  }
  if (textMatches(text, "nonprofit|people-first ai fund|community innovation|grant|grants|public good")) {
    return {
      storySubject: "funding support aimed at mission-driven AI work",
      visualMetaphor: "A community innovation workspace with grant review material, mission boards, and practical AI projects in view.",
      sceneDirective: "Show grant support, community projects, education or nonprofit work, and grounded human outcomes rather than speculative sci-fi.",
      audiencePainOpportunity: "Founders and operators need to see where mission-aligned funding is opening doors that normal venture money will ignore.",
    };
  }
  if (textMatches(text, "prototype|prototypes|futures lab|students|education")) {
    return {
      storySubject: "real-world AI prototypes moving out of the lab",
      visualMetaphor: "An applied AI studio with working prototypes, assistive interfaces, and test users interacting with early products.",
      sceneDirective: "Show prototype devices, experimental interfaces, and real-world use contexts instead of abstract AI imagery.",
      audiencePainOpportunity: "Founders need to spot when prototypes are becoming useful products before the category gets crowded.",
    };
  }
  return {
    storySubject: title,
    visualMetaphor: "A premium founder briefing moment with clean business context.",
    sceneDirective: "Make the scene specific to the article's real subject, pressure point, and physical environment.",
    audiencePainOpportunity: "Founders need a clear next move, not another vague article.",
  };
}

function buildCinematicEditorialCoverGuidance(item = {}, articleScene = {}) {
  const text = normalizeText([
    item.publicTitle,
    item.title,
    item.description,
    item.whyItMatters,
    item.founderTakeaway,
    articleScene.storySubject,
    articleScene.visualMetaphor,
  ].filter(Boolean).join(" ")).toLowerCase();
  const guidance = [...CINEMATIC_EDITORIAL_COVER_PRINCIPLES];

  if (textMatches(text, "apple|wwdc|siri|app intents|core spotlight|private cloud compute|on-device|context")) {
    guidance.push("For Apple/context stories, think in terms of private thresholds: keyholes, context layers, device memory, app stacks, secure compute boundaries, and elegant architectural silhouettes instead of literal product ads.");
    guidance.push("Use Apple-adjacent cues only as abstract architecture, glass, device silhouettes, and privacy symbolism; never copy official logos or exact trademark marks.");
  } else if (textMatches(text, "capital|funding|valuation|raise|investor|credit|loan")) {
    guidance.push("For capital stories, turn the financial pressure into architecture: gates, ledgers, valuation rooms, runway lines, proof stacks, and money-flow shadows.");
  } else if (textMatches(text, "risk|security|privacy|trust|lawsuit|regulation|failure|benchmark|reliability")) {
    guidance.push("For risk stories, make the boundary visible: a lock, warning light, test chamber, trust ring, fragile system, or human silhouette facing the consequence.");
  } else if (textMatches(text, "workflow|automation|agent|agents|software delivery|document|ocr|dashboard|operations")) {
    guidance.push("For workflow stories, show the work being reorganized: handoff lines, context cards, task routes, files becoming structured fields, and one operator-scale anchor.");
  }

  return guidance;
}

export function createImageBrief(item, options = {}) {
  const subjectText = normalizeText([
    item.publicTitle,
    item.title,
    item.description,
  ].filter(Boolean).join(" ")).toLowerCase();
  const text = normalizeText([
    item.publicTitle,
    item.title,
    item.description,
    item.whyItMatters,
    item.founderTakeaway,
    item.bucketLabel,
  ].filter(Boolean).join(" ")).toLowerCase();
  const sourcePolicy = resolveSourceImagePolicy(item, options.sourceImageAllowlist);
  const articleScene = buildArticleSceneDirection(item, subjectText);
  let storyAngle = "Founder signal";
  let emotionalHook = "A practical signal worth translating before the market gets noisy.";
  let visualMetaphor = articleScene.visualMetaphor || "A premium founder briefing moment with clean business context.";
  let audiencePainOpportunity = articleScene.audiencePainOpportunity || "Founders need a simple next move, not another article to save.";
  let imageFamily = "wildcard_attention";
  let template = "founder_brief";
  let overlayTone = "steady";
  const isFundingStory = textMatches(text, "funding|raised|raises|venture|capital|loan|credit|lending|bank|cash flow|valuation|investor|seed|series");
  const isDistressStory = textMatches(text, "bankruptcy|bankrupt|insolvency|insolvent|debt|fraud|default|restructuring|collapsed|collapse");
  const isFrontierAiFunding = textMatches(text, "anthropic|openai|claude|chatgpt|frontier|foundation model") &&
    textMatches(text, "valuation|funding|fundraising|raise|raised|investor|ipo|billion");
  const isRevenueStory = textMatches(text, "revenue|consulting|consultant|sales|monetize|offer|agency|client|workshop|training|event");
  const isWorkflowStory = textMatches(text, "workflow|workflows|automation|automate|agent|agents|tool|tools|cloudflare|serverless|static|deployment|operations|productivity|integration");
  const isFounderStory = textMatches(text, "founder|startup|leadership|strategy|pricing|hiring|team|customer|go-to-market|growth");
  const isRiskStory = textMatches(text, "risk|warning|trust|trusted|unchecked|accused|scraping|lawsuit|regulation|regulatory|security|gas|turbine|power|prices|cost|threat|failure|imploded");
  const isSpecificWorkflowStory = textMatches(text, "token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning|dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent|ocr|document parsing|documents|forms|paperwork|quiz|vibe coded|google ai studio|io 2026|i/o 2026|prototype|prototypes|futures lab|students|education");
  const shouldPrioritizeRisk = isRiskStory && !isSpecificWorkflowStory;
  const isReliabilityStory = textMatches(text, "benchmark|score|reliability|eval|evaluation|test harness|enterprise it");

  if (isDistressStory) {
    storyAngle = "Distress signal";
    emotionalHook = "The signal is not momentum. It is pressure, fragility, and what breaks when cash gets tight.";
    visualMetaphor = articleScene.visualMetaphor || "A real-world business under strain, where inventory, customers, and cash pressure all show up in the same frame.";
    audiencePainOpportunity = articleScene.audiencePainOpportunity || "Founders need to see what distress looks like early, before the spreadsheet catches up to it.";
    imageFamily = "market_shock";
    template = "market_warning";
    overlayTone = "warning";
  } else if (isFundingStory) {
    storyAngle = isFrontierAiFunding ? "AI funding race" : "Capital readiness";
    emotionalHook = isFrontierAiFunding
      ? "A near-trillion-dollar valuation changes the benchmark for AI traction, trust, and durable revenue."
      : "Capital is flowing toward clearer proof, stronger timing, and a more believable growth story.";
    visualMetaphor = articleScene.visualMetaphor || (isFrontierAiFunding
      ? "A high-stakes AI boardroom where valuation, adoption, and infrastructure pressure are visible."
      : "A founder reviewing capital options with a clear path through the numbers.");
    audiencePainOpportunity = articleScene.audiencePainOpportunity || (isFrontierAiFunding
      ? "Founders need to understand what investors are actually rewarding before borrowing the headline."
      : "Founders need to connect attention to a fundable business move.");
    imageFamily = "capital_readiness";
    template = "opportunity_window";
    overlayTone = "capital";
  } else if (isRevenueStory) {
    storyAngle = "Revenue opportunity";
    emotionalHook = "The headline matters if it can become a clear offer, event, or consulting path.";
    visualMetaphor = articleScene.visualMetaphor || "A polished consulting room where AI interest becomes a business offer.";
    audiencePainOpportunity = articleScene.audiencePainOpportunity || "Founders need to package AI attention into revenue instead of noise.";
    imageFamily = textMatches(text, "workshop|training|event") ? "event_workshop" : "consulting_revenue";
    template = "opportunity_window";
    overlayTone = "opportunity";
  } else if (shouldPrioritizeRisk) {
    storyAngle = "Risk signal";
    emotionalHook = "The useful question is what can break, cost more, or need human judgment.";
    visualMetaphor = articleScene.visualMetaphor || "A late-night decision room, warning glow, and pressure around the operator.";
    audiencePainOpportunity = articleScene.audiencePainOpportunity || "Founders need to spot the risk before it becomes an expensive surprise.";
    imageFamily = textMatches(text, "power|prices|gas|turbine|energy|grid|regulation|regulatory") ? "market_shock" : "ai_risk";
    template = "market_warning";
    overlayTone = "warning";
  } else if (isReliabilityStory) {
    storyAngle = "Risk signal";
    emotionalHook = "The useful question is what can break before you trust it with real work.";
    visualMetaphor = articleScene.visualMetaphor || "An enterprise benchmark lab with failing scorecards, red and amber pass-fail indicators, and system test panels.";
    audiencePainOpportunity = articleScene.audiencePainOpportunity || "Founders need to know when an AI system is still a lab toy and when it is ready for live operations.";
    imageFamily = "ai_risk";
    template = "market_warning";
    overlayTone = "warning";
  } else if (isWorkflowStory) {
    storyAngle = "Workflow shift";
    emotionalHook = "The signal is not the tool itself. It is what the tool can remove, speed up, or systemize.";
    visualMetaphor = articleScene.visualMetaphor || "A clean operating room for AI workflow, systems, and execution decisions.";
    audiencePainOpportunity = articleScene.audiencePainOpportunity || "Founders need one useful workflow before they buy another subscription.";
    imageFamily = textMatches(text, "agent|agents|ai") ? "ai_opportunity" : "operational_leverage";
    template = "founder_brief";
    overlayTone = "operator";
  } else if (isFounderStory) {
    storyAngle = "Founder move";
    emotionalHook = "A founder decision is hiding inside the news cycle.";
    visualMetaphor = articleScene.visualMetaphor || "A focused founder moment with calm pressure, strategy, and a next decision.";
    audiencePainOpportunity = articleScene.audiencePainOpportunity || "Founders need to decide what to keep, cut, clarify, or test.";
    imageFamily = "founder_pressure";
    template = "founder_brief";
    overlayTone = "strategic";
  }

  const creativeDirection = assignImageCreativeDirection(item);
  const imageRestrictions = [
    "Avoid portraits or people unless the story clearly needs a human subject.",
    (creativeDirection.sceneLane === "chip_infrastructure" || creativeDirection.sceneLane === "reliability_lab" || creativeDirection.sceneLane === "document_flow")
      ? "Do not require a person or face reference. Favor environments, equipment, documents, and system surfaces."
      : "",
  ].filter(Boolean).join(" ");
  const publicSourceContext = sourcePolicy.canUseSourceImage
    ? "Use the allowlisted source image if it is visually strong and accurate."
    : "Use the source article only as private visual reference; create Phoenix-owned artwork for public use.";
  const cinematicGuidance = buildCinematicEditorialCoverGuidance(item, {
    storySubject: articleScene.storySubject,
    visualMetaphor,
  });
  const imagePrompt = [
    `Create one cinematic editorial cover image for this specific story: "${normalizeText(item.publicTitle || item.title || "Founder Signal")}".`,
    `Core context to visualize: ${normalizeText(articleScene.storySubject || storyAngle)}. ${emotionalHook} ${audiencePainOpportunity}`,
    visualMetaphor,
    articleScene.sceneDirective,
    ...cinematicGuidance,
    publicSourceContext,
    "Make it feel like a strong magazine or strategy-report cover, not a product render.",
    imageRestrictions,
    "Leave clean negative space for a Phoenix Founder Signal headline overlay."
  ].filter(Boolean).join(" ");

  return {
    storyAngle,
    storySubject: articleScene.storySubject,
    emotionalHook,
    visualMetaphor,
    audiencePainOpportunity,
    imagePrompt,
    articleImageRequired: !sourcePolicy.canUseSourceImage,
    expectedArticleImagePath: expectedArticleImagePath(item),
    imageFamily,
    preferredImageFamily: imageFamily,
    sourceImageEligibility: sourcePolicy.policy,
    sourceImagePolicy: sourcePolicy.policy,
    sourceImageMatchedKey: sourcePolicy.matchedKey,
    sourceImageNote: sourcePolicy.note,
    manualReviewNeeded: sourcePolicy.manualReviewNeeded,
    overlayTone,
    template,
    ...creativeDirection,
  };
}

async function fetchSourceImageBuffer(sourceImageUrl, options = {}) {
  const fetchImageImpl = options.fetchImageImpl || fetch;
  const timeoutMs = Number(options.sourceImageFetchTimeoutMs || 8000);
  const controller = new AbortController();
  let timeout = null;
  let response;
  try {
    response = await Promise.race([
      fetchImageImpl(sourceImageUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PhoenixVentureStudiosRSS/1.0 (+https://phoenixventurestudios.com)",
          Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      }),
      new Promise((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error(`Source image fetch timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
  if (!response?.ok) throw new Error(`Source image HTTP ${response?.status || "failed"}`);

  const contentType = response.headers?.get?.("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 100) throw new Error("Source image is too small to be usable");
  if (buffer.length > (options.maxSourceImageBytes || MAX_SOURCE_IMAGE_BYTES)) {
    throw new Error("Source image is larger than the allowed limit");
  }
  if (contentType && !contentType.toLowerCase().startsWith("image/")) {
    try {
      const metadata = await sharp(buffer).metadata();
      if (!metadata.format) {
        throw new Error("unknown-image-format");
      }
    } catch {
      throw new Error(`Source image response is not an image (${contentType})`);
    }
  }
  return buffer;
}

function getRemoteImageGeneratorConfig(options = {}) {
  const supabaseUrl = options.supabaseUrl || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const anonKey = options.supabaseAnonKey || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  const functionUrl = options.remoteImageFunctionUrl || (supabaseUrl ? `${String(supabaseUrl).replace(/\/$/, "")}/functions/v1/rss-story-image` : "");
  return { functionUrl, anonKey };
}

function getLocalImagePlaygroundPaths(options = {}) {
  const root = options.localImageGeneratorRoot || path.join(APP_ROOT, ".cache/rss-image-generator");
  const bundlePath = path.join(root, "PhoenixImageGenerator.app");
  const executablePath = path.join(bundlePath, "Contents/MacOS/PhoenixImageGenerator");
  const infoPlistPath = path.join(bundlePath, "Contents/Info.plist");
  return { root, bundlePath, executablePath, infoPlistPath };
}

async function ensureLocalImagePlaygroundApp(options = {}) {
  const { root, bundlePath, executablePath, infoPlistPath } = getLocalImagePlaygroundPaths(options);
  const sourcePath = path.join(SCRIPT_DIR, "image-playground-generate.swift");
  const bundleSourceStat = await fs.stat(sourcePath);

  let needsBuild = false;
  try {
    const executableStat = await fs.stat(executablePath);
    if (executableStat.mtimeMs < bundleSourceStat.mtimeMs) needsBuild = true;
  } catch {
    needsBuild = true;
  }

  if (!needsBuild) return { bundlePath, executablePath };

  await fs.mkdir(path.join(bundlePath, "Contents/MacOS"), { recursive: true });
  const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key><string>en</string>
  <key>CFBundleExecutable</key><string>PhoenixImageGenerator</string>
  <key>CFBundleIdentifier</key><string>com.phoenixventurestudios.imagegenerator</string>
  <key>CFBundleInfoDictionaryVersion</key><string>6.0</string>
  <key>CFBundleName</key><string>Phoenix Image Generator</string>
  <key>CFBundlePackageType</key><string>APPL</string>
  <key>CFBundleShortVersionString</key><string>1.0</string>
  <key>CFBundleVersion</key><string>1</string>
  <key>LSMinimumSystemVersion</key><string>15.4</string>
  <key>NSPrincipalClass</key><string>NSApplication</string>
</dict>
</plist>
`;
  await fs.mkdir(root, { recursive: true });
  await fs.writeFile(infoPlistPath, infoPlist, "utf8");
  await execFile("swiftc", ["-parse-as-library", "-o", executablePath, sourcePath]);
  return { bundlePath, executablePath };
}

async function materializeLocalGeneratorReferenceImage(payload, options = {}) {
  const sourceUrl = payload.sourceImageUrl || payload.referenceImageUrl || "";
  if (!sourceUrl) return "";
  const buffer = await fetchSourceImageBuffer(sourceUrl, options);
  const tempRoot = options.localImageGeneratorTempRoot || path.join(APP_ROOT, ".cache/rss-image-generator/tmp");
  await fs.mkdir(tempRoot, { recursive: true });
  const filePath = path.join(tempRoot, `${payload.slug || "signal"}-reference.jpg`);
  await sharp(buffer).rotate().jpeg({ quality: 90, mozjpeg: true }).toFile(filePath);
  return filePath;
}

function buildImagePlaygroundConceptPrompt(payload = {}) {
  const pieces = [
    payload.title || "",
    payload.storySubject || "",
    payload.visualMetaphor || "",
    payload.sceneLane ? `${String(payload.sceneLane).replace(/_/g, " ")} scene` : "",
  ].join(". ");

  return normalizeText(pieces)
    .replace(/[“”"']/g, "")
    .replace(/[%$]/g, "")
    .replace(/&/g, " and ")
    .replace(/\bAI\b/gi, "artificial intelligence")
    .replace(/\bMCP\b/g, "tool orchestration")
    .replace(/[^a-zA-Z0-9 ,.\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

function buildProceduralFallbackPrompt(payload = {}) {
  return normalizeText([
    payload.title || "",
    payload.storySubject || "",
    payload.sceneLane || "",
    payload.visualMetaphor || "",
  ].join(" ")).slice(0, 200);
}

async function callSourceDerivedImageGenerator(payload, options = {}) {
  const sourceUrl = payload.sourceImageUrl || payload.referenceImageUrl || "";
  if (!sourceUrl) {
    throw new Error("No source image available for source-derived fallback generation");
  }

  const sourceBuffer = await fetchSourceImageBuffer(sourceUrl, options);
  const sceneLane = payload.sceneLane || "general";
  const imageTone = payload.imageTone || "steel";
  const sceneMotif = payload.sceneMotif || "signal-atlas";
  const seed = payload.slug || payload.title || payload.prompt || "phoenix-source-derived";
  const palette = scenePalette(sceneLane, imageTone);
  const environment = renderSceneEnvironment(sceneLane, seed, palette);
  const motif = renderMotif(sceneMotif, seed, palette);

  const base = await sharp(sourceBuffer)
    .rotate()
    .resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover", position: sharp.strategy.attention })
    .modulate({ brightness: 1.03, saturation: 1.2 })
    .linear(1.08, -6)
    .sharpen(1.4, 1, 2)
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();

  const overlay = Buffer.from(`
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vignette" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stop-color="${withAlpha(palette.bg, 0.74)}"/>
          <stop offset="0.44" stop-color="${withAlpha(palette.bg, 0.34)}"/>
          <stop offset="1" stop-color="${withAlpha(palette.mid, 0.12)}"/>
        </linearGradient>
        <radialGradient id="spotlight" cx="74%" cy="18%" r="70%">
          <stop offset="0" stop-color="${withAlpha(palette.highlight, 0.22)}"/>
          <stop offset="1" stop-color="${withAlpha(palette.highlight, 0)}"/>
        </radialGradient>
      </defs>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#vignette)"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#spotlight)"/>
      ${environment}
      ${motif}
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${withAlpha("#04101c", 0.16)}"/>
    </svg>
  `);

  return {
    buffer: await sharp(base)
      .composite([{ input: overlay, top: 0, left: 0 }])
      .jpeg({ quality: 92, mozjpeg: true })
      .toBuffer(),
    mimeType: "image/jpeg",
    promptUsed: `${payload.prompt} [source-derived-fallback]`,
  };
}

async function callProceduralSceneGenerator(payload, options = {}) {
  const item = {
    slug: payload.slug,
    title: payload.title || "Founder Signal",
    publicTitle: payload.title || "Founder Signal",
    sceneLane: payload.sceneLane || "general",
    sceneMotif: payload.sceneMotif || "signal-atlas",
    imageTone: payload.imageTone || "steel",
  };
  const imageBrief = {
    sceneLane: payload.sceneLane || "general",
    sceneMotif: payload.sceneMotif || "signal-atlas",
    imageTone: payload.imageTone || "steel",
  };
  return {
    buffer: buildEditorialSceneBackground(item, imageBrief, options),
    mimeType: "image/png",
    promptUsed: `${buildProceduralFallbackPrompt(payload)} [procedural-fallback]`,
  };
}

async function launchForegroundImageGenerator(bundlePath, args, statusPath, options = {}) {
  const timeoutMs = options.localImageGeneratorTimeoutMs || 180000;
  const bundleKillPattern = "PhoenixImageGenerator.app/Contents/MacOS/PhoenixImageGenerator";

  return await new Promise((resolve, reject) => {
    const child = spawn("open", ["-W", bundlePath, "--args", ...args], {
      env: {
        ...process.env,
        PHOENIX_IMAGEPLAYGROUND_STATUS_PATH: statusPath,
      },
      stdio: "ignore",
    });

    let settled = false;
    const finish = async (error = null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) {
        const statusPayload = await fs.readFile(statusPath, "utf8").catch(() => "");
        if (statusPayload) {
          const parsed = JSON.parse(statusPayload);
          reject(new Error(parsed?.error || String(error.message || error)));
          return;
        }
        reject(error instanceof Error ? error : new Error(String(error)));
        return;
      }
      resolve();
    };

    const timer = setTimeout(async () => {
      child.kill("SIGTERM");
      await execFile("pkill", ["-f", bundleKillPattern]).catch(() => null);
      await finish(new Error("Local Image Playground generation timed out before completion"));
    }, timeoutMs);

    child.on("error", async (error) => {
      await finish(error);
    });

    child.on("exit", async (code) => {
      if (code === 0) {
        await finish();
        return;
      }
      await finish(new Error(`Foreground Image Playground app exited with code ${code}`));
    });
  });
}

async function callLocalImagePlaygroundGenerator(payload, options = {}) {
  const { bundlePath } = await ensureLocalImagePlaygroundApp(options);
  const tempRoot = options.localImageGeneratorTempRoot || path.join(APP_ROOT, ".cache/rss-image-generator/tmp");
  await fs.mkdir(tempRoot, { recursive: true });

  const outputPath = path.join(tempRoot, `${payload.slug || "signal"}-generated-${Date.now()}.jpg`);
  const statusPath = path.join(tempRoot, `${payload.slug || "signal"}-status-${Date.now()}.json`);
  const sourceImagePath = await materializeLocalGeneratorReferenceImage(payload, options).catch(() => "");
  const args = [];
  if (sourceImagePath) {
    args.push("--source-image", sourceImagePath);
  }
  args.push(
    buildImagePlaygroundConceptPrompt(payload),
    outputPath,
    options.localImagePlaygroundStyle || "illustration",
  );

  try {
    await launchForegroundImageGenerator(bundlePath, args, statusPath, options);
  } catch (error) {
    const statusPayload = await fs.readFile(statusPath, "utf8").catch(() => "");
    if (statusPayload) {
      const parsed = JSON.parse(statusPayload);
      throw new Error(parsed?.error || "Local Image Playground generation failed");
    }
    throw error instanceof Error ? error : new Error(String(error));
  }

  const statusPayload = await fs.readFile(statusPath, "utf8").catch(() => "");
  if (!statusPayload) {
    throw new Error("Local Image Playground exited without writing a status result");
  }

  const parsed = JSON.parse(statusPayload);
  if (!parsed?.ok) {
    throw new Error(parsed?.error || "Local Image Playground generation failed");
  }

  return {
    buffer: await fs.readFile(parsed.outputPath || outputPath),
    mimeType: "image/jpeg",
    promptUsed: payload.prompt,
  };
}

function resolveArticleImageGenerator(options = {}) {
  if (options.generateArticleImageImpl) return options.generateArticleImageImpl;
  if (
    options.disableLocalImagePlayground === true ||
    process.env.PHOENIX_RSS_DISABLE_LOCAL_IMAGE_PLAYGROUND === "1"
  ) {
    return callRemoteArticleImageGenerator;
  }
  return callLocalImagePlaygroundGenerator;
}

async function callRemoteArticleImageGenerator(payload, options = {}) {
  const fetchImpl = options.fetchImageImpl || fetch;
  const { functionUrl, anonKey } = getRemoteImageGeneratorConfig(options);
  if (!functionUrl || !anonKey) {
    throw new Error("Remote image generator is not configured");
  }

  const response = await fetchImpl(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response?.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(`Remote image generator failed (${response?.status || "unknown"}): ${errorText.slice(0, 240)}`);
  }

  const data = await response.json();
  if (!data?.imageBase64) {
    throw new Error("Remote image generator returned no image data");
  }

  return {
    buffer: Buffer.from(data.imageBase64, "base64"),
    mimeType: data.mimeType || "image/png",
    promptUsed: data.promptUsed || payload.prompt,
  };
}

export async function generateArticleSpecificImage(item, imageBrief, options = {}) {
  const generator = resolveArticleImageGenerator(options);
  const recentHashes = buildRecentVisualHashes(options.recentItems || []);
  const usedHashes = options.usedImageVisualHashes || new Set();
  const articleImageRoot = getArticleImageRoot(options);
  const outputPath = path.join(articleImageRoot, `${item.slug}.jpg`);
  const recentTitles = recentVisualEntries(options.recentItems || [])
    .slice(0, 10)
    .map((entry) => entry.publicTitle || entry.title)
    .filter(Boolean);

  await fs.mkdir(articleImageRoot, { recursive: true });

  let lastError = null;
  let lastAudit = null;
  let workingBrief = { ...imageBrief };
  const correctionTrail = [];
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const payload = {
        slug: item.slug,
        title: item.publicTitle || item.title || "Founder Signal",
        sourceName: item.sourceName || "",
        sourceUrl: item.originalUrl || item.url || "",
        sceneLane: workingBrief.sceneLane,
        sceneMotif: workingBrief.sceneMotif,
        visualMetaphor: workingBrief.visualMetaphor,
        storyAngle: workingBrief.storyAngle,
        storySubject: workingBrief.storySubject,
        sourceContext: normalizeText(item.description || ""),
        sourceImageUrl: item.sourceImageUrl || item.publisherImageUrl || "",
        prompt: workingBrief.imagePrompt,
        attempt,
        recentTitles,
      };

      const result = (process.env.VITEST === "true" && !options.generateArticleImageImpl)
        ? {
            buffer: buildEditorialSceneBackground(item, workingBrief, options),
            mimeType: "image/png",
            promptUsed: workingBrief.imagePrompt,
          }
        : await (async () => {
            try {
              return await generator(payload, options);
            } catch (primaryError) {
              if (options.allowSourceDerivedFallback !== false && payload.sourceImageUrl) {
                return await callSourceDerivedImageGenerator({
                  ...payload,
                  sceneMotif: workingBrief.sceneMotif,
                  imageTone: workingBrief.imageTone,
                }, options);
              }
              if (options.allowProceduralFallback !== false) {
                return await callProceduralSceneGenerator({
                  ...payload,
                  sceneMotif: workingBrief.sceneMotif,
                  imageTone: workingBrief.imageTone,
                }, options);
              }
              throw primaryError;
            }
          })();

      const audit = await auditCoverCandidateImage(result.buffer, {
        ...options,
        sourceUrl: item.sourceUrl || item.originalUrl || item.url || "",
        title: item.publicTitle || item.title || "",
        sceneLane: workingBrief.sceneLane,
        preferredComposition: workingBrief.imageComposition,
        reviewMode: "phoenix-owned",
        imageReviewMemory: options.imageReviewMemory || [],
      });
      correctionTrail.push({
        attempt,
        promptUsed: result.promptUsed || workingBrief.imagePrompt,
        blocked: audit.blocked,
        reasons: audit.reasons,
        warnings: audit.warnings,
        metrics: audit.metrics,
      });
      lastAudit = audit;
      if (audit.blocked) {
        lastError = new Error(`Generated image failed art-director audit: ${audit.reasons.join("; ")}`);
        workingBrief = mutateImageBriefForRetry(workingBrief, audit.metrics, attempt + 1);
        continue;
      }

      const visualHash = await computeImageVisualHash(result.buffer);
      if (isTooSimilarToRecentHash(visualHash, recentHashes, [...usedHashes])) {
        lastError = new Error(`Generated image too similar to a recent image within ${VISUAL_HISTORY_WINDOW_DAYS} days`);
        workingBrief = mutateImageBriefForRetry(workingBrief, {
          recommendedFixes: ["Use a more distinct scene and avoid repeating the same recent visual setup."],
          editorialNotes: ["This image is too similar to a recent published image."],
        }, attempt + 1);
        continue;
      }

      await sharp(result.buffer)
        .rotate()
        .jpeg({ quality: 92, mozjpeg: true })
        .toFile(outputPath);

      usedHashes.add(visualHash);

      return {
        filePath: outputPath,
        publicPath: getArticleImagePublicPath(outputPath, options),
        imageVisualHash: visualHash,
        promptUsed: result.promptUsed || workingBrief.imagePrompt,
        imageAudit: audit.metrics,
        correctionTrail,
        finalImageBrief: {
          ...workingBrief,
          imageComposition: audit.recommendedComposition || workingBrief.imageComposition,
        },
      };
    } catch (error) {
      lastError = error;
    }
  }

  const failure = lastError || new Error("Unable to generate a distinct article-specific image");
  failure.phoenixAudit = lastAudit?.metrics || null;
  failure.phoenixCorrectionTrail = correctionTrail;
  failure.phoenixFinalImageBrief = workingBrief;
  throw failure;
}

function scenePalette(sceneLane = "general", imageTone = "steel") {
  const lanePalettes = {
    frontier_funding: ["#0e1f30", "#214f78", "#f68c2d", "#f6d691"],
    capital_growth: ["#102033", "#1d5f72", "#ef8f2f", "#f4e0a6"],
    chip_infrastructure: ["#09141f", "#0f596a", "#23c8ff", "#7af0ff"],
    reliability_lab: ["#111a25", "#24516a", "#7de0ff", "#f8b15d"],
    workflow_system: ["#0b1830", "#0c6c87", "#39daff", "#f4bf6b"],
    talent_motion: ["#1a1628", "#4b3f75", "#ff9f65", "#f5d4a2"],
    event_pipeline: ["#251625", "#6a2f57", "#ff8f47", "#ffd77b"],
    document_flow: ["#0f2233", "#3f6f70", "#9ce5d8", "#f7e2ab"],
    interactive_build: ["#17192c", "#4f4db2", "#74ecff", "#ff9b57"],
    mission_grant: ["#132833", "#357567", "#8ce2bf", "#ffe08f"],
    search_visibility: ["#132128", "#1f6a74", "#39d7ff", "#fff0b1"],
    distress_signal: ["#22131e", "#6f3242", "#ff7a47", "#e1b0a0"],
    human_boundary: ["#101a27", "#2c4f70", "#bfe6ff", "#ffb278"],
    general: ["#0c1b2d", "#1b466c", "#8ed9d2", "#f5a254"],
  };
  const [bg, mid, accent, highlight] = lanePalettes[sceneLane] || lanePalettes.general;
  const toneTweaks = {
    electric: { accent, highlight, overlay: "#7be7ff" },
    ember: { accent: "#ff7b1a", highlight: "#ffb45c", overlay: "#ffd7a6" },
    aqua: { accent: "#39d1ff", highlight: "#8ed9d2", overlay: "#d8fbff" },
    steel: { accent: "#6cb2d1", highlight: "#d0e2f0", overlay: "#edf7ff" },
  }[imageTone] || { accent, highlight, overlay: "#edf7ff" };
  return { bg, mid, accent: toneTweaks.accent, highlight: toneTweaks.highlight, overlay: toneTweaks.overlay };
}

function renderSceneEnvironment(sceneLane, seed, palette) {
  const glow = withAlpha(palette.highlight, 0.18);
  const accentFill = withAlpha(palette.accent, 0.22);
  const softFill = withAlpha(palette.highlight, 0.1);
  const line = withAlpha(palette.overlay, 0.2);
  const strongLine = withAlpha(palette.accent, 0.5);

  const scenes = {
    frontier_funding: `
      <rect x="724" y="82" width="276" height="180" rx="28" fill="${softFill}" stroke="${line}" stroke-width="2"/>
      <rect x="756" y="118" width="140" height="16" rx="8" fill="${withAlpha(palette.highlight, 0.36)}"/>
      <rect x="756" y="152" width="188" height="18" rx="9" fill="${accentFill}"/>
      <rect x="756" y="188" width="116" height="18" rx="9" fill="${withAlpha(palette.highlight, 0.22)}"/>
      <path d="M88 482 C236 438, 360 402, 520 314 S846 178, 1088 116" stroke="${strongLine}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <circle cx="910" cy="152" r="82" fill="${withAlpha(palette.accent, 0.12)}"/>
    `,
    capital_growth: `
      <rect x="734" y="118" width="78" height="270" rx="18" fill="${softFill}"/>
      <rect x="832" y="182" width="78" height="206" rx="18" fill="${accentFill}"/>
      <rect x="930" y="146" width="78" height="242" rx="18" fill="${withAlpha(palette.highlight, 0.18)}"/>
      <path d="M92 454 L264 410 L396 370 L560 306 L738 240 L1032 170" stroke="${strongLine}" stroke-width="10" fill="none" stroke-linecap="round"/>
    `,
    chip_infrastructure: `
      ${Array.from({ length: 4 }, (_, i) => `
        <rect x="${720 + i * 74}" y="108" width="56" height="324" rx="16" fill="${withAlpha(palette.highlight, 0.16)}" stroke="${line}" stroke-width="2"/>
        <rect x="${734 + i * 74}" y="144" width="28" height="8" rx="4" fill="${withAlpha(palette.accent, 0.52)}"/>
        <rect x="${734 + i * 74}" y="176" width="28" height="8" rx="4" fill="${withAlpha(palette.overlay, 0.42)}"/>
      `).join("")}
      <rect x="118" y="336" width="252" height="112" rx="28" fill="${withAlpha(palette.accent, 0.12)}" stroke="${line}" stroke-width="2"/>
      <path d="M370 392 H596 L676 314 H1078" stroke="${strongLine}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M370 432 H572 L648 360 H1054" stroke="${withAlpha(palette.highlight, 0.46)}" stroke-width="5" fill="none" stroke-linecap="round"/>
    `,
    reliability_lab: `
      <rect x="702" y="96" width="330" height="248" rx="28" fill="${softFill}" stroke="${line}" stroke-width="2"/>
      ${Array.from({ length: 5 }, (_, i) => `<rect x="736" y="${134 + i * 34}" width="${210 - i * 16}" height="14" rx="7" fill="${withAlpha(i < 2 ? palette.accent : palette.highlight, 0.34)}"/>`).join("")}
      <circle cx="216" cy="238" r="106" fill="${withAlpha(palette.highlight, 0.08)}"/>
      <path d="M148 304 L202 246 L260 276 L320 188 L390 214" stroke="${strongLine}" stroke-width="8" fill="none"/>
      <path d="M150 206 L206 262 L252 220" stroke="${withAlpha(palette.highlight, 0.52)}" stroke-width="6" fill="none"/>
    `,
    workflow_system: `
      ${["190,204","362,164","528,230","726,166","916,244","674,342"].map((point) => {
        const [cx, cy] = point.split(",");
        return `<circle cx="${cx}" cy="${cy}" r="26" fill="${withAlpha(palette.highlight, 0.16)}" stroke="${withAlpha(palette.accent, 0.34)}" stroke-width="4"/>`;
      }).join("")}
      <path d="M216 204 L336 166 L502 226 L700 170 L890 240 M528 256 L648 340 L890 244" stroke="${strongLine}" stroke-width="6" fill="none"/>
      <rect x="742" y="348" width="228" height="70" rx="20" fill="${accentFill}"/>
    `,
    talent_motion: `
      <circle cx="244" cy="224" r="58" fill="${withAlpha(palette.highlight, 0.12)}"/>
      <circle cx="392" cy="188" r="48" fill="${withAlpha(palette.accent, 0.12)}"/>
      <circle cx="534" cy="236" r="58" fill="${withAlpha(palette.highlight, 0.12)}"/>
      <rect x="176" y="280" width="128" height="118" rx="30" fill="${softFill}"/>
      <rect x="340" y="238" width="110" height="136" rx="28" fill="${accentFill}"/>
      <rect x="488" y="294" width="126" height="108" rx="30" fill="${softFill}"/>
      <path d="M620 210 C738 174, 834 168, 1044 202" stroke="${strongLine}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M958 172 L1048 202 L952 234" stroke="${strongLine}" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    `,
    event_pipeline: `
      <rect x="118" y="138" width="250" height="202" rx="30" fill="${softFill}" stroke="${line}" stroke-width="2"/>
      <rect x="166" y="110" width="160" height="46" rx="16" fill="${accentFill}"/>
      <rect x="686" y="160" width="320" height="120" rx="28" fill="${withAlpha(palette.highlight, 0.12)}"/>
      <circle cx="768" cy="326" r="28" fill="${withAlpha(palette.highlight, 0.16)}"/>
      <circle cx="846" cy="326" r="28" fill="${withAlpha(palette.accent, 0.18)}"/>
      <circle cx="924" cy="326" r="28" fill="${withAlpha(palette.highlight, 0.16)}"/>
      <path d="M382 236 C518 240, 618 264, 760 326" stroke="${strongLine}" stroke-width="8" fill="none" stroke-linecap="round"/>
      <path d="M742 292 L770 326 L730 332" stroke="${strongLine}" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
    document_flow: `
      ${Array.from({ length: 3 }, (_, i) => `<rect x="${738 + i * 18}" y="${104 + i * 24}" width="220" height="284" rx="22" fill="${withAlpha(i === 1 ? palette.accent : palette.highlight, 0.14)}" stroke="${line}" stroke-width="2"/>`).join("")}
      ${Array.from({ length: 5 }, (_, i) => `<rect x="150" y="${166 + i * 42}" width="${260 + (i % 2) * 70}" height="16" rx="8" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.26)}"/>`).join("")}
      <path d="M426 244 L566 244 L678 174" stroke="${strongLine}" stroke-width="8" fill="none" stroke-linecap="round"/>
    `,
    interactive_build: `
      <rect x="714" y="100" width="328" height="236" rx="30" fill="${softFill}" stroke="${line}" stroke-width="2"/>
      <rect x="744" y="138" width="118" height="78" rx="18" fill="${accentFill}"/>
      <rect x="888" y="138" width="122" height="16" rx="8" fill="${withAlpha(palette.highlight, 0.34)}"/>
      <rect x="888" y="172" width="92" height="16" rx="8" fill="${withAlpha(palette.highlight, 0.22)}"/>
      <rect x="888" y="206" width="104" height="16" rx="8" fill="${accentFill}"/>
      ${Array.from({ length: 4 }, (_, i) => `<rect x="${118 + i * 108}" y="${308 + (i % 2) * 26}" width="88" height="116" rx="22" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.16)}"/>`).join("")}
    `,
    mission_grant: `
      ${["214,218","366,154","490,260","706,176","872,244","1010,170"].map((point, i) => {
        const [cx, cy] = point.split(",");
        return `<circle cx="${cx}" cy="${cy}" r="${i % 2 ? 24 : 18}" fill="${withAlpha(i % 2 ? palette.accent : palette.highlight, 0.22)}"/>`;
      }).join("")}
      <path d="M232 218 L346 158 L474 256 L690 180 L852 240 L992 174" stroke="${strongLine}" stroke-width="7" fill="none"/>
      <rect x="122" y="330" width="296" height="88" rx="24" fill="${softFill}"/>
    `,
    search_visibility: `
      <rect x="122" y="142" width="466" height="84" rx="26" fill="${softFill}" stroke="${line}" stroke-width="2"/>
      <circle cx="174" cy="184" r="18" fill="none" stroke="${withAlpha(palette.accent, 0.58)}" stroke-width="6"/>
      <path d="M188 198 L206 216" stroke="${withAlpha(palette.accent, 0.58)}" stroke-width="6" stroke-linecap="round"/>
      ${Array.from({ length: 5 }, (_, i) => `<rect x="734" y="${148 + i * 48}" width="${220 - i * 22}" height="18" rx="9" fill="${withAlpha(i === 0 ? palette.accent : palette.highlight, 0.26)}"/>`).join("")}
    `,
    distress_signal: `
      <path d="M694 104 L752 206 L720 292 L804 386 L742 520" stroke="${withAlpha(palette.accent, 0.76)}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <rect x="134" y="360" width="296" height="74" rx="20" fill="${softFill}"/>
      <path d="M104 444 L256 392 L408 404 L542 294 L702 314 L908 164" stroke="${strongLine}" stroke-width="10" fill="none" stroke-linecap="round"/>
    `,
    human_boundary: `
      <rect x="86" y="120" width="462" height="304" rx="34" fill="${withAlpha(palette.highlight, 0.1)}"/>
      <rect x="566" y="120" width="538" height="304" rx="34" fill="${withAlpha(palette.accent, 0.1)}"/>
      <path d="M552 90 V454" stroke="${withAlpha(palette.highlight, 0.3)}" stroke-width="4" stroke-dasharray="10 12"/>
      <circle cx="232" cy="230" r="62" fill="${withAlpha(palette.highlight, 0.14)}"/>
      <rect x="182" y="306" width="110" height="84" rx="24" fill="${softFill}"/>
      <rect x="772" y="176" width="176" height="104" rx="20" fill="${accentFill}"/>
    `,
    general: `
      <circle cx="904" cy="212" r="124" fill="${withAlpha(palette.highlight, 0.1)}"/>
      <path d="M108 438 C252 372, 368 326, 532 272 S864 182, 1086 112" stroke="${strongLine}" stroke-width="8" fill="none"/>
      <rect x="126" y="150" width="320" height="110" rx="28" fill="${softFill}"/>
    `,
  };

  return scenes[sceneLane] || scenes.general;
}

function sceneHeadlineText(item) {
  return escapeSvg(normalizeText(item.publicTitle || item.title || "Founder Signal"));
}

function renderMotif(sceneMotif, seed, palette) {
  const x1 = 120 + Math.round(deterministicFraction(seed, `${sceneMotif}:x1`) * 720);
  const x2 = 180 + Math.round(deterministicFraction(seed, `${sceneMotif}:x2`) * 760);
  const y1 = 110 + Math.round(deterministicFraction(seed, `${sceneMotif}:y1`) * 340);
  const y2 = 190 + Math.round(deterministicFraction(seed, `${sceneMotif}:y2`) * 280);
  const spread = 90 + Math.round(deterministicFraction(seed, `${sceneMotif}:spread`) * 160);
  const accent = withAlpha(palette.accent, 0.42);
  const highlight = withAlpha(palette.highlight, 0.26);

  const motifs = {
    "valuation-arc": `
      <path d="M70 520 C240 430, 360 410, 520 300 S880 150, 1110 110" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>
      <circle cx="${x1}" cy="${y1}" r="10" fill="${palette.highlight}" />
      <circle cx="${x2}" cy="${y2}" r="14" fill="${palette.accent}" />
    `,
    "capital-grid": `
      ${Array.from({ length: 6 }, (_, i) => `<rect x="${120 + i * 145}" y="${150 + (i % 2) * 28}" width="88" height="${180 + i * 20}" rx="16" fill="${withAlpha(palette.highlight, 0.18)}"/>`).join("")}
      <path d="M90 470 L240 410 L380 392 L530 330 L710 248 L920 182" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round"/>
    `,
    "proof-stack": `
      ${Array.from({ length: 4 }, (_, i) => `<rect x="${640 + i * 38}" y="${120 + i * 44}" width="250" height="130" rx="18" fill="${withAlpha(palette.highlight, 0.14)}" stroke="${withAlpha(palette.accent, 0.18)}"/>`).join("")}
      <rect x="140" y="360" width="360" height="90" rx="20" fill="${withAlpha(palette.accent, 0.12)}" />
    `,
    "adoption-rings": `
      <circle cx="885" cy="228" r="130" fill="none" stroke="${withAlpha(palette.highlight, 0.28)}" stroke-width="16"/>
      <circle cx="885" cy="228" r="84" fill="none" stroke="${withAlpha(palette.accent, 0.38)}" stroke-width="12"/>
      <circle cx="885" cy="228" r="38" fill="${withAlpha(palette.accent, 0.24)}"/>
    `,
    "deal-window": `
      <rect x="710" y="90" width="330" height="200" rx="28" fill="${withAlpha(palette.highlight, 0.12)}" />
      <rect x="742" y="128" width="120" height="12" rx="6" fill="${withAlpha(palette.highlight, 0.34)}" />
      <rect x="742" y="166" width="220" height="16" rx="8" fill="${withAlpha(palette.accent, 0.3)}" />
      <rect x="742" y="206" width="180" height="16" rx="8" fill="${withAlpha(palette.highlight, 0.28)}" />
    `,
    "signal-ledger": `
      <path d="M122 180 H432 M122 224 H462 M122 268 H418 M122 312 H458" stroke="${withAlpha(palette.highlight, 0.34)}" stroke-width="10" stroke-linecap="round"/>
      <rect x="92" y="148" width="420" height="220" rx="26" fill="none" stroke="${withAlpha(palette.accent, 0.26)}" stroke-width="4"/>
    `,
    "memory-rails": `
      ${Array.from({ length: 5 }, (_, i) => `<rect x="${700 + i * 72}" y="136" width="48" height="290" rx="16" fill="${withAlpha(palette.highlight, 0.18)}" stroke="${withAlpha(palette.accent, 0.28)}"/>`).join("")}
      <path d="M98 430 C260 392, 386 348, 520 300 S788 212, 1008 160" stroke="${accent}" stroke-width="9" fill="none" stroke-linecap="round"/>
    `,
    "server-lattice": `
      ${Array.from({ length: 4 }, (_, i) => `<rect x="${716 + i * 84}" y="124" width="62" height="324" rx="14" fill="${withAlpha(palette.highlight, 0.14)}"/><rect x="${730 + i * 84}" y="156" width="34" height="7" rx="3.5" fill="${withAlpha(palette.accent, 0.42)}"/>`).join("")}
      <rect x="94" y="360" width="330" height="90" rx="18" fill="${withAlpha(palette.accent, 0.1)}" />
    `,
    "inference-flow": `
      <path d="M92 446 L252 352 L390 374 L568 236 L764 260 L1040 118" stroke="${accent}" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${[252,390,568,764,1040].map((cx, i) => `<circle cx="${cx}" cy="${[352,374,236,260,118][i]}" r="${i === 4 ? 14 : 10}" fill="${palette.highlight}" />`).join("")}
    `,
    "chip-core": `
      <rect x="760" y="132" width="228" height="228" rx="28" fill="${withAlpha(palette.highlight, 0.18)}" stroke="${withAlpha(palette.accent, 0.34)}" stroke-width="6"/>
      <rect x="820" y="192" width="108" height="108" rx="18" fill="${withAlpha(palette.accent, 0.22)}"/>
      ${Array.from({ length: 8 }, (_, i) => `<rect x="${744 + i * 30}" y="102" width="14" height="26" rx="4" fill="${withAlpha(palette.highlight, 0.28)}"/>`).join("")}
    `,
    "throughput-map": `
      <rect x="118" y="148" width="380" height="246" rx="30" fill="${withAlpha(palette.highlight, 0.12)}"/>
      <path d="M152 362 L218 328 L312 336 L402 280 L464 250" stroke="${withAlpha(palette.accent, 0.86)}" stroke-width="9" fill="none"/>
      <path d="M152 320 L236 306 L318 248 L420 238 L480 182" stroke="${withAlpha(palette.highlight, 0.74)}" stroke-width="7" fill="none"/>
    `,
    "benchmark-panels": `
      ${Array.from({ length: 3 }, (_, i) => `<rect x="${688 + i * 118}" y="120" width="92" height="${200 + i * 40}" rx="22" fill="${withAlpha(palette.highlight, 0.15)}"/><rect x="${708 + i * 118}" y="${306 - i * 14}" width="52" height="${24 + i * 10}" rx="10" fill="${withAlpha(palette.accent, 0.5)}"/>`).join("")}
    `,
    "failure-board": `
      <rect x="714" y="110" width="316" height="238" rx="26" fill="${withAlpha(palette.highlight, 0.12)}"/>
      ${Array.from({ length: 4 }, (_, i) => `<circle cx="${772 + i * 66}" cy="190" r="22" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.32)}"/>`).join("")}
      <path d="M764 294 L820 240 L874 276 L938 188 L1002 226" stroke="${accent}" stroke-width="8" fill="none"/>
    `,
    "ops-scorecards": `
      ${Array.from({ length: 4 }, (_, i) => `<rect x="${112 + i * 118}" y="150" width="88" height="138" rx="16" fill="${withAlpha(palette.highlight, 0.14)}"/><rect x="${132 + i * 118}" y="182" width="48" height="48" rx="12" fill="${withAlpha(palette.accent, 0.28)}"/>`).join("")}
    `,
    "agent-graph": `
      ${["180,208","350,162","520,236","760,158","930,238","700,332"].map((point) => {
        const [cx, cy] = point.split(",");
        return `<circle cx="${cx}" cy="${cy}" r="28" fill="${withAlpha(palette.highlight, 0.16)}" stroke="${withAlpha(palette.accent, 0.34)}" stroke-width="4"/>`;
      }).join("")}
      <path d="M208 208 L322 164 L492 232 L732 162 L902 234 M520 264 L672 332 L902 238" stroke="${accent}" stroke-width="6" fill="none"/>
    `,
    "handoff-grid": `
      <rect x="102" y="134" width="440" height="262" rx="28" fill="${withAlpha(palette.highlight, 0.12)}"/>
      ${Array.from({ length: 3 }, (_, i) => `<rect x="${132 + i * 126}" y="${168 + i * 34}" width="146" height="52" rx="16" fill="${withAlpha(palette.accent, 0.2)}"/>`).join("")}
      <path d="M248 222 L332 256 L458 256" stroke="${accent}" stroke-width="8" fill="none"/>
    `,
    "audit-terminal": `
      <rect x="676" y="108" width="340" height="254" rx="30" fill="${withAlpha(palette.highlight, 0.12)}"/>
      ${Array.from({ length: 6 }, (_, i) => `<rect x="714" y="${150 + i * 28}" width="${220 - i * 16}" height="10" rx="5" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.36)}"/>`).join("")}
    `,
    "booth-stage": `
      <rect x="84" y="136" width="320" height="250" rx="30" fill="${withAlpha(palette.highlight, 0.12)}"/>
      <rect x="146" y="112" width="168" height="42" rx="14" fill="${withAlpha(palette.accent, 0.3)}"/>
      <path d="M448 392 L662 236 L888 236" stroke="${accent}" stroke-width="8" fill="none"/>
    `,
    "camera-floor": `
      <circle cx="868" cy="208" r="124" fill="${withAlpha(palette.highlight, 0.12)}"/>
      <circle cx="868" cy="208" r="56" fill="${withAlpha(palette.accent, 0.26)}"/>
      <rect x="164" y="388" width="280" height="54" rx="18" fill="${withAlpha(palette.accent, 0.18)}"/>
    `,
    "lead-cascade": `
      ${Array.from({ length: 5 }, (_, i) => `<rect x="${124 + i * 128}" y="${150 + (i % 2) * 42}" width="88" height="118" rx="18" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.18)}"/>`).join("")}
      <path d="M168 372 C302 330, 424 304, 566 266 S888 182, 1080 132" stroke="${accent}" stroke-width="10" fill="none"/>
    `,
    "document-stack": `
      ${Array.from({ length: 3 }, (_, i) => `<rect x="${720 + i * 22}" y="${128 + i * 30}" width="228" height="286" rx="22" fill="${withAlpha(palette.highlight, 0.14)}" stroke="${withAlpha(palette.accent, 0.2)}"/>`).join("")}
    `,
    "extraction-grid": `
      <rect x="116" y="142" width="386" height="252" rx="28" fill="${withAlpha(palette.highlight, 0.12)}"/>
      ${Array.from({ length: 4 }, (_, i) => `<rect x="${144 + (i % 2) * 170}" y="${176 + Math.floor(i / 2) * 82}" width="136" height="54" rx="14" fill="${withAlpha(i % 2 ? palette.accent : palette.highlight, 0.2)}"/>`).join("")}
    `,
    "prototype-cards": `
      ${Array.from({ length: 4 }, (_, i) => `<rect x="${140 + i * 108}" y="${164 + (i % 2) * 48}" width="94" height="126" rx="20" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.2)}"/>`).join("")}
      <circle cx="900" cy="214" r="104" fill="${withAlpha(palette.highlight, 0.12)}"/>
    `,
    "builder-surface": `
      <rect x="680" y="112" width="350" height="238" rx="26" fill="${withAlpha(palette.highlight, 0.12)}"/>
      <rect x="710" y="148" width="122" height="80" rx="16" fill="${withAlpha(palette.accent, 0.22)}"/>
      <rect x="854" y="148" width="136" height="18" rx="9" fill="${withAlpha(palette.highlight, 0.34)}"/>
      <rect x="854" y="184" width="108" height="18" rx="9" fill="${withAlpha(palette.highlight, 0.24)}"/>
    `,
    "grant-board": `
      <rect x="98" y="132" width="394" height="252" rx="28" fill="${withAlpha(palette.highlight, 0.12)}"/>
      ${Array.from({ length: 5 }, (_, i) => `<rect x="136" y="${166 + i * 36}" width="${220 + (i % 2) * 50}" height="14" rx="7" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.26)}"/>`).join("")}
    `,
    "community-map": `
      ${["214,216","344,158","452,262","662,184","838,246","992,166"].map((point, i) => {
        const [cx, cy] = point.split(",");
        return `<circle cx="${cx}" cy="${cy}" r="${i % 2 ? 24 : 18}" fill="${withAlpha(i % 2 ? palette.accent : palette.highlight, 0.24)}"/>`;
      }).join("")}
      <path d="M232 216 L326 162 L434 258 L646 188 L820 242 L974 170" stroke="${accent}" stroke-width="7" fill="none"/>
    `,
    "query-field": `
      <rect x="120" y="148" width="500" height="88" rx="26" fill="${withAlpha(palette.highlight, 0.16)}" stroke="${withAlpha(palette.accent, 0.28)}" stroke-width="4"/>
      <circle cx="172" cy="192" r="18" fill="none" stroke="${withAlpha(palette.accent, 0.56)}" stroke-width="6"/>
      <path d="M185 205 L204 224" stroke="${withAlpha(palette.accent, 0.56)}" stroke-width="6" stroke-linecap="round"/>
    `,
    "ranking-lines": `
      ${Array.from({ length: 5 }, (_, i) => `<rect x="${704}" y="${146 + i * 48}" width="${220 - i * 26}" height="18" rx="9" fill="${withAlpha(i === 0 ? palette.accent : palette.highlight, 0.28)}"/>`).join("")}
    `,
    "debt-rift": `
      <path d="M676 108 L742 214 L708 286 L794 384 L734 520" stroke="${withAlpha(palette.accent, 0.72)}" stroke-width="18" fill="none" stroke-linecap="round"/>
      <rect x="116" y="356" width="316" height="84" rx="18" fill="${withAlpha(palette.highlight, 0.12)}"/>
    `,
    "cash-crack": `
      <path d="M120 468 L276 396 L402 404 L532 286 L688 314 L902 154" stroke="${withAlpha(palette.accent, 0.74)}" stroke-width="10" fill="none" stroke-linecap="round"/>
      <path d="M510 140 L586 246 L552 344 L642 494" stroke="${withAlpha(palette.highlight, 0.34)}" stroke-width="12" fill="none"/>
    `,
    "human-ai-split": `
      <rect x="96" y="132" width="440" height="284" rx="32" fill="${withAlpha(palette.highlight, 0.10)}"/>
      <rect x="536" y="132" width="568" height="284" rx="32" fill="${withAlpha(palette.accent, 0.10)}"/>
      <path d="M552 96 V448" stroke="${withAlpha(palette.highlight, 0.28)}" stroke-width="4" stroke-dasharray="10 12"/>
    `,
    "judgment-desk": `
      <rect x="118" y="346" width="364" height="86" rx="22" fill="${withAlpha(palette.highlight, 0.16)}"/>
      <circle cx="870" cy="210" r="110" fill="${withAlpha(palette.accent, 0.16)}"/>
      <rect x="796" y="168" width="146" height="86" rx="18" fill="${withAlpha(palette.highlight, 0.18)}"/>
    `,
    "signal-atlas": `
      <circle cx="850" cy="208" r="${spread}" fill="${highlight}" />
      <path d="M102 438 C246 372, 364 328, 526 272 S854 178, 1062 112" stroke="${accent}" stroke-width="9" fill="none"/>
      <path d="M92 222 L306 156 L488 216 L708 124" stroke="${withAlpha(palette.highlight, 0.52)}" stroke-width="6" fill="none"/>
    `,
    "market-field": `
      ${Array.from({ length: 7 }, (_, i) => `<rect x="${120 + i * 128}" y="${164 + (i % 3) * 26}" width="82" height="${120 + i * 16}" rx="18" fill="${withAlpha(i % 2 ? palette.highlight : palette.accent, 0.16)}"/>`).join("")}
    `,
    "founder-map": `
      <rect x="96" y="120" width="1020" height="360" rx="32" fill="none" stroke="${withAlpha(palette.highlight, 0.16)}" stroke-width="2"/>
      <path d="M168 392 L296 282 L428 314 L602 214 L802 246 L1040 134" stroke="${accent}" stroke-width="10" fill="none"/>
    `,
    "decision-window": `
      <rect x="708" y="100" width="320" height="248" rx="26" fill="${withAlpha(palette.highlight, 0.14)}"/>
      <rect x="130" y="164" width="252" height="178" rx="22" fill="${withAlpha(palette.accent, 0.14)}"/>
    `,
    "strategy-grid": `
      ${Array.from({ length: 4 }, (_, row) => Array.from({ length: 5 }, (_, col) => `<rect x="${120 + col * 152}" y="${138 + row * 88}" width="116" height="56" rx="16" fill="${withAlpha((row + col) % 2 ? palette.highlight : palette.accent, 0.14)}"/>`).join("")).join("")}
    `,
    "clarity-beam": `
      <path d="M120 500 L420 368 L708 276 L1080 92" stroke="${accent}" stroke-width="12" fill="none" stroke-linecap="round"/>
      <circle cx="1080" cy="92" r="18" fill="${palette.highlight}" />
    `,
  };
  return motifs[sceneMotif] || motifs["signal-atlas"];
}

function buildEditorialSceneBackground(item, imageBrief, options = {}) {
  const seed = item.slug || item.originalUrl || item.url || item.title || "phoenix-signal";
  const sceneLane = item.sceneLane || imageBrief.sceneLane || "general";
  const sceneMotif = item.sceneMotif || imageBrief.sceneMotif || "signal-atlas";
  const imageTone = item.imageTone || imageBrief.imageTone || "steel";
  const palette = scenePalette(sceneLane, imageTone);
  const headline = sceneHeadlineText(item);
  const beamX = 120 + Math.round(deterministicFraction(seed, "beam-x") * 860);
  const beamY = 120 + Math.round(deterministicFraction(seed, "beam-y") * 320);
  const environment = renderSceneEnvironment(sceneLane, seed, palette);
  const backdrop = renderMotif(sceneMotif, seed, palette);

  return Buffer.from(`
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="${palette.bg}" />
          <stop offset="1" stop-color="${palette.mid}" />
        </linearGradient>
        <radialGradient id="beam" cx="${beamX / CARD_WIDTH}" cy="${beamY / CARD_HEIGHT}" r="0.72">
          <stop offset="0" stop-color="${withAlpha(palette.highlight, 0.26)}" />
          <stop offset="0.54" stop-color="${withAlpha(palette.accent, 0.14)}" />
          <stop offset="1" stop-color="${withAlpha(palette.bg, 0)}" />
        </radialGradient>
        <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
          <path d="M60 0H0V60" fill="none" stroke="${withAlpha(palette.highlight, 0.08)}" stroke-width="1" />
        </pattern>
      </defs>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#bg)" />
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#beam)" />
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#grid)" opacity="0.24" />
      ${environment}
      ${backdrop}
      <rect x="0" y="0" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#beam)" opacity="0.34" />
      <text x="76" y="590" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" letter-spacing="1.2" fill="${withAlpha(palette.overlay, 0.2)}">${headline.slice(0, 96)}</text>
    </svg>
  `);
}

async function prepareBackground(item, options = {}) {
  const providedBrief = item.imageBrief ? { ...item.imageBrief, ...assignImageCreativeDirection(item) } : null;
  if (options.backgroundPath) {
    await fs.access(options.backgroundPath);
    const imageBrief = providedBrief || createImageBrief(item, options);
    return {
      input: options.backgroundPath,
      familyConfig: getFamilyConfig(imageBrief.imageFamily || "wildcard_attention"),
      decision: {
        imageStrategy: "owned-photo-match",
        imageFamily: imageBrief.imageFamily || "wildcard_attention",
        imageSourceType: "phoenix-owned",
        imageCredit: "Phoenix Venture Studios image library",
        imageRightsStatus: "owned-or-licensed",
        imageTemplate: imageBrief.template || "founder_brief",
        imageBrief,
        imageVariant: imageBrief.imageVariant,
        imageTone: imageBrief.imageTone,
        imageComposition: imageBrief.imageComposition,
        sceneLane: imageBrief.sceneLane,
        sceneMotif: imageBrief.sceneMotif,
        imageFingerprint: imageBrief.imageFingerprint,
        imageWarnings: [],
      },
    };
  }

  const imageBrief = providedBrief || createImageBrief(item, options);
  const sourcePolicy = resolveSourceImagePolicy(item, options.sourceImageAllowlist);
  const warnings = [];
  let lastSourceImageAudit = null;
  const applyAuditComposition = (baseBrief, audit) => {
    const imageComposition = audit?.recommendedComposition || baseBrief.imageComposition;
    return {
      ...baseBrief,
      imageComposition,
      imageFingerprint: buildVisualFingerprint({
        sceneLane: baseBrief.sceneLane,
        sceneMotif: baseBrief.sceneMotif,
        imageComposition,
        imageTone: baseBrief.imageTone,
        imageVariant: baseBrief.imageVariant,
        template: baseBrief.template,
      }),
    };
  };
  const articleSpecificPath = await resolveArticleSpecificImagePath(item, options);
  if (articleSpecificPath) {
    const approvedImageAudit = await auditCoverCandidateImage(articleSpecificPath, {
      ...options,
      sourceImageUrl: item.sourceImageUrl,
      sourceUrl: item.sourceUrl || item.originalUrl || item.url || "",
      title: item.publicTitle || item.title || "",
      sceneLane: imageBrief.sceneLane,
      sceneMotif: imageBrief.sceneMotif,
      preferredComposition: imageBrief.imageComposition,
      reviewMode: "phoenix-owned",
      imageReviewMemory: options.imageReviewMemory || [],
    });
    const auditedBrief = applyAuditComposition(imageBrief, approvedImageAudit);
    const config = getFamilyConfig(auditedBrief.imageFamily);
    const articleImagePublicPath = getArticleImagePublicPath(articleSpecificPath, options);
    const imageVisualHash = await computeImageVisualHash(articleSpecificPath);
    const recentHashes = buildRecentVisualHashes(options.recentItems || []);
    const usedHashes = options.usedImageVisualHashes || new Set();
    warnings.push(...approvedImageAudit.warnings);
    if (approvedImageAudit.blocked) {
      warnings.push(`Approved Phoenix image failed the local art-director audit: ${approvedImageAudit.reasons.join("; ")}`);
    }
    if (isTooSimilarToRecentHash(imageVisualHash, recentHashes, [...usedHashes])) {
      warnings.push(`Approved Phoenix image is too similar to a recent published image within ${VISUAL_HISTORY_WINDOW_DAYS} days.`);
    } else {
      usedHashes.add(imageVisualHash);
    }
    if (sourcePolicy.manualReviewNeeded) {
      const policyWarning = buildNonPublicSourceWarning(sourcePolicy);
      if (policyWarning) warnings.push(policyWarning);
    }
    if (approvedImageAudit.blocked || warnings.some((warning) => /too similar to a recent published image/i.test(warning))) {
      return {
        input: null,
        familyConfig: config,
        decision: {
          imageStrategy: "held-for-codex-image",
          imageApprovalStatus: "held",
          imageHoldReason: approvedImageAudit.blocked
            ? "approved-image-failed-art-director-audit"
            : "approved-image-too-similar-to-recent-publish",
          imageFamily: auditedBrief.imageFamily,
          imageSourceType: "pending-codex-image",
          imageCredit: "",
          imageRightsStatus: "manual-review",
          imageTemplate: auditedBrief.template,
          imageBrief: {
            ...auditedBrief,
            articleImagePath: articleImagePublicPath || expectedArticleImagePath(item),
            articleImageRequired: true,
            manualReviewNeeded: true,
          },
          imageVariant: auditedBrief.imageVariant,
          imageTone: auditedBrief.imageTone,
          imageComposition: auditedBrief.imageComposition,
          sceneLane: auditedBrief.sceneLane,
          sceneMotif: auditedBrief.sceneMotif,
          imageFingerprint: auditedBrief.imageFingerprint,
          imageVisualHash,
          imageAudit: approvedImageAudit.metrics,
          imageWarnings: warnings,
        },
      };
    }
    return {
      input: articleSpecificPath,
      familyConfig: config,
      decision: {
        imageStrategy: "held-for-codex-image",
        imageApprovalStatus: "approved",
        imageHoldReason: "",
        imageFamily: auditedBrief.imageFamily,
        imageSourceType: "phoenix-owned",
        imageCredit: "Phoenix Venture Studios approved raw story image",
        imageRightsStatus: "owned-or-licensed",
        imageTemplate: auditedBrief.template,
        imageBrief: {
          ...auditedBrief,
          articleImagePath: articleImagePublicPath || expectedArticleImagePath(item),
          articleImageRequired: false,
          manualReviewNeeded: false,
        },
        imageVariant: auditedBrief.imageVariant,
        imageTone: auditedBrief.imageTone,
        imageComposition: auditedBrief.imageComposition,
        sceneLane: auditedBrief.sceneLane,
        sceneMotif: auditedBrief.sceneMotif,
        imageFingerprint: auditedBrief.imageFingerprint,
        imageVisualHash,
        imageAudit: approvedImageAudit.metrics,
        imageWarnings: warnings,
      },
    };
  }

  if (sourcePolicy.canUseSourceImage) {
    try {
      const sourceBuffer = await fetchSourceImageBuffer(sourcePolicy.sourceImageUrl, options);
      const sourceImageAudit = await auditCoverCandidateImage(sourceBuffer, {
        ...options,
        sourceImageUrl: sourcePolicy.sourceImageUrl,
        sourceUrl: item.sourceUrl || item.originalUrl || item.url || "",
        title: item.publicTitle || item.title || "",
        sceneLane: imageBrief.sceneLane,
        sceneMotif: imageBrief.sceneMotif,
        preferredComposition: imageBrief.imageComposition,
        reviewMode: "source-image",
        imageReviewMemory: options.imageReviewMemory || [],
      });
      lastSourceImageAudit = sourceImageAudit;
      const auditedBrief = applyAuditComposition(imageBrief, sourceImageAudit);
      const config = getFamilyConfig(auditedBrief.imageFamily);
      const imageVisualHash = await computeImageVisualHash(sourceBuffer);
      const recentHashes = buildRecentVisualHashes(options.recentItems || []);
      const usedHashes = options.usedImageVisualHashes || new Set();
      warnings.push(...sourceImageAudit.warnings);
      if (sourceImageAudit.blocked) {
        warnings.push(`Allowlisted source image failed the local art-director audit: ${sourceImageAudit.reasons.join("; ")}`);
      }
      if (isTooSimilarToRecentHash(imageVisualHash, recentHashes, [...usedHashes])) {
        warnings.push(`Allowlisted source image is too similar to a recent published image within ${VISUAL_HISTORY_WINDOW_DAYS} days.`);
      } else {
        usedHashes.add(imageVisualHash);
        if (!sourceImageAudit.blocked) {
          return {
            input: sourceBuffer,
            familyConfig: config,
            decision: {
              imageStrategy: "source-allowlisted",
              imageApprovalStatus: "approved",
              imageHoldReason: "",
              imageFamily: auditedBrief.imageFamily,
              imageSourceType: "source-image",
              imageCredit: sourcePolicy.credit,
              imageRightsStatus: sourcePolicy.rightsStatus,
              imageTemplate: auditedBrief.template,
              imageBrief: {
                ...auditedBrief,
                articleImageRequired: false,
                manualReviewNeeded: false,
              },
              imageVariant: auditedBrief.imageVariant,
              imageTone: auditedBrief.imageTone,
              imageComposition: auditedBrief.imageComposition,
              sceneLane: auditedBrief.sceneLane,
              sceneMotif: auditedBrief.sceneMotif,
              imageFingerprint: auditedBrief.imageFingerprint,
              imageVisualHash,
              imageAudit: sourceImageAudit.metrics,
              imageWarnings: warnings,
            },
          };
        }
      }
    } catch (error) {
      warnings.push(`Allowlisted source image failed validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (sourcePolicy.hasSourceImage && !sourcePolicy.canUseSourceImage) {
    const policyWarning = buildNonPublicSourceWarning(sourcePolicy);
    if (policyWarning && !warnings.includes(policyWarning)) warnings.push(policyWarning);
  }

  const canAttemptGeneratedReplacement = Boolean(
    options.generateArticleImageImpl ||
    options.generateArticleImagesInProcess
  );
  if (canAttemptGeneratedReplacement) {
    try {
      const generated = await generateArticleSpecificImage(item, imageBrief, options);
      const generatedBrief = generated.finalImageBrief || imageBrief;
      const config = getFamilyConfig(generatedBrief.imageFamily || imageBrief.imageFamily);
      return {
        input: generated.filePath,
        familyConfig: config,
        decision: {
          imageStrategy: "held-for-codex-image",
          imageApprovalStatus: "approved",
          imageHoldReason: "",
          imageFamily: generatedBrief.imageFamily || imageBrief.imageFamily,
          imageSourceType: "phoenix-owned",
          imageCredit: "Phoenix Venture Studios generated story image",
          imageRightsStatus: "owned-or-licensed",
          imageTemplate: generatedBrief.template || imageBrief.template,
          imageBrief: {
            ...generatedBrief,
            articleImagePath: generated.publicPath || expectedArticleImagePath(item),
            articleImageRequired: false,
            manualReviewNeeded: false,
          },
          imageVariant: generatedBrief.imageVariant || imageBrief.imageVariant,
          imageTone: generatedBrief.imageTone || imageBrief.imageTone,
          imageComposition: generatedBrief.imageComposition || imageBrief.imageComposition,
          sceneLane: generatedBrief.sceneLane || imageBrief.sceneLane,
          sceneMotif: generatedBrief.sceneMotif || imageBrief.sceneMotif,
          imageFingerprint: generatedBrief.imageFingerprint || imageBrief.imageFingerprint,
          imageVisualHash: generated.imageVisualHash,
          imageAudit: generated.imageAudit || null,
          imageCorrectionTrail: generated.correctionTrail || [],
          imageWarnings: [
            ...warnings,
            ...((generated.correctionTrail || []).flatMap((entry) =>
              entry.blocked ? [`Correction attempt ${entry.attempt} failed: ${entry.reasons.join("; ")}`] : []
            )),
          ],
        },
      };
    } catch (error) {
      const generatedAudit = error?.phoenixAudit || null;
      const generatedCorrectionTrail = error?.phoenixCorrectionTrail || [];
      const generatedBrief = error?.phoenixFinalImageBrief || imageBrief;
      warnings.push(`Phoenix-generated replacement failed local correction loop: ${error instanceof Error ? error.message : String(error)}`);
      return {
        input: null,
        familyConfig: getFamilyConfig(generatedBrief.imageFamily || imageBrief.imageFamily),
        decision: {
          imageStrategy: "held-for-codex-image",
          imageApprovalStatus: "held",
          imageHoldReason: "allowlisted-source-validation-failed",
          imageFamily: generatedBrief.imageFamily || imageBrief.imageFamily,
          imageSourceType: "pending-codex-image",
          imageCredit: "",
          imageRightsStatus: sourcePolicy.rightsStatus === "allowlisted" ? "allowlisted" : "manual-review",
          imageTemplate: generatedBrief.template || imageBrief.template,
          imageBrief: {
            ...generatedBrief,
            articleImagePath: expectedArticleImagePath(item),
            articleImageRequired: true,
            manualReviewNeeded: true,
          },
          imageVariant: generatedBrief.imageVariant || imageBrief.imageVariant,
          imageTone: generatedBrief.imageTone || imageBrief.imageTone,
          imageComposition: generatedBrief.imageComposition || imageBrief.imageComposition,
          sceneLane: generatedBrief.sceneLane || imageBrief.sceneLane,
          sceneMotif: generatedBrief.sceneMotif || imageBrief.sceneMotif,
          imageFingerprint: generatedBrief.imageFingerprint || imageBrief.imageFingerprint,
          imageVisualHash: "",
          imageAudit: generatedAudit,
          imageCorrectionTrail: generatedCorrectionTrail,
          imageWarnings: [
            ...warnings,
            ...generatedCorrectionTrail.flatMap((entry) =>
              entry.blocked ? [`Correction attempt ${entry.attempt} failed: ${entry.reasons.join("; ")}`] : []
            ),
            `Held for Codex image approval. Add a raw story image at ${expectedArticleImagePath(item)} before publishing ${item.slug || item.title || "signal"}.`,
          ],
        },
      };
    }
  }

  if (options.allowOwnedBackgroundFallback) {
    const ownedBackground = await resolveOwnedBackgroundPath(
      imageBrief.imageFamily,
      item.slug || item.title || imageBrief.imageFingerprint || "",
    );
    const fallbackWarnings = [...warnings];
    const policyWarning = buildNonPublicSourceWarning(sourcePolicy);
    if (policyWarning && !fallbackWarnings.includes(policyWarning)) {
      fallbackWarnings.push(policyWarning);
    }
    if (ownedBackground.missingPrimary) {
      fallbackWarnings.push(`Preferred Phoenix background for ${ownedBackground.family} was missing, so the bundled fallback art was used instead.`);
    }
    fallbackWarnings.push(
      `Using the best approved Phoenix-owned background for ${item.slug || item.title || "signal"} while a story-specific cover still needs creative follow-up.`,
    );

    return {
      input: ownedBackground.path,
      familyConfig: getFamilyConfig(ownedBackground.family || imageBrief.imageFamily),
      decision: {
        imageStrategy: "held-for-codex-image",
        imageApprovalStatus: "approved",
        imageHoldReason: "story-specific-cover-still-needed",
        imageFamily: ownedBackground.family || imageBrief.imageFamily,
        imageSourceType: "phoenix-owned",
        imageCredit: "Phoenix Venture Studios approved background library",
        imageRightsStatus: "owned-or-licensed",
        imageTemplate: imageBrief.template,
        imageBrief: {
          ...imageBrief,
          articleImagePath: expectedArticleImagePath(item),
          articleImageRequired: false,
          manualReviewNeeded: sourcePolicy.hasSourceImage && sourcePolicy.manualReviewNeeded,
        },
        imageVariant: imageBrief.imageVariant,
        imageTone: imageBrief.imageTone,
        imageComposition: imageBrief.imageComposition,
        sceneLane: imageBrief.sceneLane,
        sceneMotif: imageBrief.sceneMotif,
        imageFingerprint: imageBrief.imageFingerprint,
        imageVisualHash: "",
        imageAudit: lastSourceImageAudit?.metrics || null,
        imageWarnings: fallbackWarnings,
      },
    };
  }

  return {
    input: null,
    familyConfig: getFamilyConfig(imageBrief.imageFamily),
    decision: {
      imageStrategy: "held-for-codex-image",
      imageApprovalStatus: "held",
      imageHoldReason: warnings[0]
        ? warnings.some((warning) => /too similar to a recent published image/i.test(warning))
          ? "allowlisted-source-image-reused-recently"
          : "allowlisted-source-validation-failed"
        : "no-allowlisted-source-image-or-approved-codex-image",
      imageFamily: imageBrief.imageFamily,
      imageSourceType: "pending-codex-image",
      imageCredit: "",
      imageRightsStatus: sourcePolicy.rightsStatus === "allowlisted" ? "allowlisted" : "manual-review",
      imageTemplate: imageBrief.template,
      imageBrief: {
        ...imageBrief,
        articleImagePath: expectedArticleImagePath(item),
        articleImageRequired: true,
        manualReviewNeeded: true,
      },
      imageVariant: imageBrief.imageVariant,
      imageTone: imageBrief.imageTone,
      imageComposition: imageBrief.imageComposition,
      sceneLane: imageBrief.sceneLane,
      sceneMotif: imageBrief.sceneMotif,
      imageFingerprint: imageBrief.imageFingerprint,
      imageVisualHash: "",
      imageAudit: lastSourceImageAudit?.metrics || null,
      imageWarnings: [
        ...warnings,
        `Held for Codex image approval. Add a raw story image at ${expectedArticleImagePath(item)} before publishing ${item.slug || item.title || "signal"}.`,
      ],
    },
  };
}

function buildBoldCoverSvg(item, options = {}) {
  const imageBrief = item.imageBrief || createImageBrief(item, options);
  const familyConfig = options.familyConfig || getFamilyConfig(imageBrief.imageFamily);
  const creativeDirection = assignImageCreativeDirection({ ...item, ...imageBrief });
  const composition = creativeDirection.imageComposition;
  const category = compactCategoryLabel(item.bucketLabel || item.editorialCategory || "Founder Signal");
  const source = normalizeText(item.sourceName || "Phoenix Source").toUpperCase().slice(0, 30);
  const date = formatDate(item.publishedAt, options.now).toUpperCase();
  const storyAngle = normalizeText(imageBrief.storyAngle || category).toUpperCase().slice(0, 36);
  const titleLines = wrapText(item.title, composition === "right-anchor" ? 20 : composition === "lower-band" ? 26 : 24, 4);
  const hookLines = wrapText(imageBrief.emotionalHook || item.summary || "", composition === "lower-band" ? 70 : 50, 2);
  const titleLineCount = titleLines.length;
  const titleCharCount = normalizeText(item.title).length;
  const sourceLine = [source, date].filter(Boolean).join("  /  ");
  const accent = familyConfig.accent;
  const secondary = familyConfig.secondary;

  const layout = {
    "left-anchor": {
      textX: 84,
      textY: 196,
      sourceX: 84,
      sourceY: 90,
      kickerY: 154,
      hookY: 496,
      align: "start",
      titleSize: 62,
      titleLineHeight: 68,
      hookWidth: 580,
      shade: `<linearGradient id="coverShade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#041221" stop-opacity="0.88"/>
        <stop offset="0.42" stop-color="#041221" stop-opacity="0.62"/>
        <stop offset="0.82" stop-color="#041221" stop-opacity="0.12"/>
        <stop offset="1" stop-color="#041221" stop-opacity="0"/>
      </linearGradient>`,
      shadeRect: `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#coverShade)"/>`,
      glow: `<radialGradient id="coverGlow" cx="86%" cy="20%" r="64%">
        <stop offset="0" stop-color="${withAlpha(secondary, 0.22)}"/>
        <stop offset="0.46" stop-color="${withAlpha(secondary, 0.08)}"/>
        <stop offset="1" stop-color="${withAlpha(secondary, 0)}"/>
      </radialGradient>`,
      eyebrowX: 84,
      eyebrowY: 92,
      storyY: 156,
      sourceY: 580,
      markX: 1040,
      markY: 84,
    },
    "split-panel": {
      textX: 84,
      textY: 208,
      sourceX: 84,
      sourceY: 90,
      kickerY: 164,
      hookY: 506,
      align: "start",
      titleSize: 58,
      titleLineHeight: 64,
      hookWidth: 560,
      shade: `<linearGradient id="coverShade" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="#071626" stop-opacity="0.82"/>
        <stop offset="0.4" stop-color="#071626" stop-opacity="0.56"/>
        <stop offset="0.78" stop-color="#071626" stop-opacity="0.16"/>
        <stop offset="1" stop-color="#071626" stop-opacity="0"/>
      </linearGradient>`,
      shadeRect: `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#coverShade)"/>`,
      glow: `<radialGradient id="coverGlow" cx="78%" cy="18%" r="60%">
        <stop offset="0" stop-color="${withAlpha(accent, 0.18)}"/>
        <stop offset="0.48" stop-color="${withAlpha(accent, 0.06)}"/>
        <stop offset="1" stop-color="${withAlpha(accent, 0)}"/>
      </radialGradient>`,
      eyebrowX: 84,
      eyebrowY: 92,
      storyY: 166,
      sourceY: 580,
      markX: 1040,
      markY: 84,
    },
    "right-anchor": {
      textX: 1120,
      textY: 212,
      sourceX: 1120,
      sourceY: 90,
      kickerY: 166,
      hookY: 508,
      align: "end",
      titleSize: 54,
      titleLineHeight: 60,
      hookWidth: 560,
      shade: `<linearGradient id="coverShade" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stop-color="#071626" stop-opacity="0.9"/>
        <stop offset="0.42" stop-color="#071626" stop-opacity="0.62"/>
        <stop offset="0.82" stop-color="#071626" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#071626" stop-opacity="0"/>
      </linearGradient>`,
      shadeRect: `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#coverShade)"/>`,
      glow: `<radialGradient id="coverGlow" cx="14%" cy="18%" r="58%">
        <stop offset="0" stop-color="${withAlpha(secondary, 0.2)}"/>
        <stop offset="0.44" stop-color="${withAlpha(secondary, 0.08)}"/>
        <stop offset="1" stop-color="${withAlpha(secondary, 0)}"/>
      </radialGradient>`,
      eyebrowX: 1116,
      eyebrowY: 92,
      storyY: 166,
      sourceY: 580,
      markX: 160,
      markY: 84,
    },
    "lower-band": {
      textX: 84,
      textY: 316,
      sourceX: 84,
      sourceY: 368,
      kickerY: 424,
      hookY: 560,
      align: "start",
      titleSize: 56,
      titleLineHeight: 60,
      hookWidth: 780,
      shade: `<linearGradient id="coverShade" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="#071626" stop-opacity="0.92"/>
        <stop offset="0.34" stop-color="#071626" stop-opacity="0.72"/>
        <stop offset="0.72" stop-color="#071626" stop-opacity="0.14"/>
        <stop offset="1" stop-color="#071626" stop-opacity="0"/>
      </linearGradient>`,
      shadeRect: `<rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#coverShade)"/>`,
      glow: `<radialGradient id="coverGlow" cx="72%" cy="16%" r="58%">
        <stop offset="0" stop-color="${withAlpha(accent, 0.18)}"/>
        <stop offset="0.42" stop-color="${withAlpha(accent, 0.06)}"/>
        <stop offset="1" stop-color="${withAlpha(accent, 0)}"/>
      </radialGradient>`,
      eyebrowX: 84,
      eyebrowY: 388,
      storyY: 452,
      sourceY: 604,
      markX: 1040,
      markY: 84,
    },
  }[composition] || {};

  const sizePenalty = Math.max(0, titleLineCount - 2) * 5 + (titleCharCount > 88 ? 4 : 0) + (titleCharCount > 112 ? 4 : 0);
  const titleSize = Math.max(42, (layout.titleSize || 56) - sizePenalty);
  const titleLineHeight = Math.max(48, (layout.titleLineHeight || 60) - Math.max(0, titleLineCount - 2) * 4);
  const hookYOffset = titleLineCount >= 4 ? 18 : titleLineCount === 3 ? 8 : 0;
  const showHook = composition !== "lower-band" && titleCharCount <= 104 && titleLineCount <= 3;
  const showCategory = composition !== "lower-band";
  const showStoryAngle = shouldShowStoryAngleLabel(category, storyAngle)
    && titleCharCount <= 118
    && (composition !== "lower-band" || titleLineCount <= 3);
  const domainMark = "PHOENIXVENTURESTUDIOS.COM";

  const align = layout.align === "end" ? "end" : "start";
  const title = titleLines
    .map((line, index) => (
      `<text x="${layout.textX}" y="${layout.textY + index * titleLineHeight}" text-anchor="${align}" font-family="Georgia, 'Times New Roman', serif" font-size="${titleSize}" font-weight="700" letter-spacing="-1.8" fill="#fff8ef">${escapeSvg(line)}</text>`
    ))
    .join("");

  const hook = showHook ? hookLines
    .map((line, index) => (
      `<text x="${layout.textX}" y="${layout.hookY + hookYOffset + index * 24}" text-anchor="${align}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="600" fill="#f1f6fb" opacity="0.88">${escapeSvg(line)}</text>`
    ))
    .join("") : "";

  return Buffer.from(`
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        ${layout.shade}
        ${layout.glow}
        <filter id="headlineShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="10" flood-color="#020810" flood-opacity="0.44"/>
        </filter>
        <filter id="watermarkSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.4"/>
        </filter>
      </defs>
      ${layout.shadeRect}
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#coverGlow)"/>
      <g opacity="0.055" filter="url(#watermarkSoft)" transform="translate(120 590) rotate(-24)">
        <text x="0" y="0" font-family="Arial, Helvetica, sans-serif" font-size="20" font-weight="900" letter-spacing="6" fill="#f8f3ea">${domainMark}</text>
      </g>
      ${showCategory ? `<text x="${layout.eyebrowX}" y="${layout.eyebrowY}" text-anchor="${align}" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900" letter-spacing="3.2" fill="${withAlpha(accent, 0.96)}">${escapeSvg(category)}</text>` : ""}
      ${showStoryAngle ? `<text x="${layout.textX}" y="${layout.storyY}" text-anchor="${align}" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" letter-spacing="2.8" fill="${withAlpha("#f8f3ea", 0.84)}">${escapeSvg(storyAngle)}</text>` : ""}
      <g filter="url(#headlineShadow)">
        ${title}
      </g>
      ${hook}
      <text x="${layout.textX}" y="${layout.sourceY}" text-anchor="${align}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="800" letter-spacing="2.1" fill="${withAlpha("#f4efe6", 0.76)}">${escapeSvg(sourceLine || "PHOENIX SOURCE")}</text>
      <text x="${layout.markX}" y="${layout.markY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="900" letter-spacing="2.6" fill="${withAlpha("#fff8ef", 0.72)}">PHOENIX</text>
      <text x="${layout.markX}" y="${layout.markY + 18}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="10" font-weight="700" letter-spacing="2.2" fill="${withAlpha("#fff8ef", 0.5)}">FOUNDER SIGNAL</text>
      <text x="${layout.markX}" y="${layout.markY + 38}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="9" font-weight="800" letter-spacing="1.8" fill="${withAlpha("#fff8ef", 0.56)}">PHOENIXVENTURESTUDIOS.COM</text>
    </svg>
  `);
}

export async function renderSignalCard(item, options = {}) {
  const outputRoot = options.outputRoot ?? DEFAULT_OUTPUT_ROOT;
  const siteUrl = String(options.siteUrl || "").replace(/\/$/, "");
  const publicPath = getGeneratedImagePublicPath(item);
  const outputPath = path.join(outputRoot, publicPath.replace(/^\//, ""));
  const lockedSocialImagePath = item.lockSocialImage || item.socialImageLocked
    ? getOwnedGeneratedImagePath(item.socialImagePath || item.imagePath || publicPath)
    : "";

  if (lockedSocialImagePath) {
    const lockedOutputPath = path.join(outputRoot, lockedSocialImagePath.replace(/^\//, ""));
    await fs.access(lockedOutputPath);
    const imageBrief = item.imageBrief || createImageBrief(item, options);
    return {
      ...item,
      imageStrategy: item.imageStrategy || "held-for-codex-image",
      imageApprovalStatus: item.imageApprovalStatus || "approved",
      imageHoldReason: item.imageHoldReason || "",
      imageFamily: item.imageFamily || imageBrief.imageFamily || "wildcard_attention",
      imageSourceType: item.imageSourceType || "phoenix-owned",
      imageCredit: item.imageCredit || "Phoenix Venture Studios approved editorial cover",
      imageRightsStatus: item.imageRightsStatus || "owned-or-licensed",
      imageTemplate: item.imageTemplate || imageBrief.template || "founder_brief",
      imageBrief: {
        ...imageBrief,
        articleImageRequired: false,
        manualReviewNeeded: false,
      },
      imagePath: lockedSocialImagePath,
      socialImagePath: lockedSocialImagePath,
      imageUrl: siteUrl ? `${siteUrl}${lockedSocialImagePath}` : lockedSocialImagePath,
      socialImageUrl: siteUrl ? `${siteUrl}${lockedSocialImagePath}` : lockedSocialImagePath,
      imageWarnings: item.imageWarnings || [],
    };
  }

  const prepared = await prepareBackground(item, options);

  if (!prepared.input) {
    return {
      ...item,
      ...prepared.decision,
      imagePath: "",
      socialImagePath: "",
      imageUrl: "",
      socialImageUrl: "",
    };
  }

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const baseBuffer = await sharp(prepared.input)
    .rotate()
    .resize(CARD_WIDTH, CARD_HEIGHT, {
      fit: "cover",
      position: prepared.familyConfig.position,
    })
    .modulate({
      brightness: 1.04,
      saturation: 1.08,
      hue: 0,
    })
    .linear(1.02, -2)
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();

  const overlay = buildBoldCoverSvg({ ...item, ...prepared.decision }, {
    ...options,
    familyConfig: prepared.familyConfig,
    now: options.now,
  });

  await sharp(baseBuffer)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 92, mozjpeg: true })
    .toFile(outputPath);

  return {
    ...item,
    ...prepared.decision,
    imagePath: publicPath,
    socialImagePath: publicPath,
    imageUrl: siteUrl ? `${siteUrl}${publicPath}` : publicPath,
    socialImageUrl: siteUrl ? `${siteUrl}${publicPath}` : publicPath,
  };
}

export async function renderSignalCardsForItems(items, options = {}) {
  const rendered = [];
  const errors = [];
  const usedFingerprints = new Set();
  const usedImageVisualHashes = new Set();
  const recentItems = options.recentItems || [];

  for (const item of items) {
    try {
      const creativeDirection = assignImageCreativeDirection(item, { recentItems, usedFingerprints });
      rendered.push(await renderSignalCard({ ...item, ...creativeDirection }, { ...options, usedImageVisualHashes }));
    } catch (error) {
      errors.push({
        slug: item.slug,
        title: item.title,
        bucket: item.bucket,
        error: error instanceof Error ? error.message : String(error),
      });
      rendered.push(item);
    }
  }

  return { items: rendered, errors };
}

export function hashImageInput(value = "") {
  return createHash("sha1").update(String(value)).digest("hex").slice(0, 12);
}
