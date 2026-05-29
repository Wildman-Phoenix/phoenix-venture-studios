import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const GENERATED_SIGNAL_IMAGE_DIR = "images/signals/generated";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_OUTPUT_ROOT = path.join(APP_ROOT, "public");
const DEFAULT_BACKGROUND_DIR = path.join(DEFAULT_OUTPUT_ROOT, "images/signals/backgrounds");
const MAX_SOURCE_IMAGE_BYTES = 8 * 1024 * 1024;

export const DEFAULT_IMAGE_SOURCE_ALLOWLIST = {
  defaultPolicy: "reference-only",
  sources: {},
};

const IMAGE_FAMILIES = {
  ai_risk: {
    publicPath: "/images/signals/backgrounds/ai-risk.jpg",
    fallbackSource: "src/assets/late-night-strategy.jpg",
    position: "center",
    accent: "#ff6a1f",
    secondary: "#00b8ff",
  },
  ai_opportunity: {
    publicPath: "/images/signals/backgrounds/ai-opportunity.jpg",
    fallbackSource: "src/assets/strategy-session.jpg",
    position: "center",
    accent: "#00d4ff",
    secondary: "#ff8a1f",
  },
  founder_pressure: {
    publicPath: "/images/signals/backgrounds/founder-pressure.jpg",
    fallbackSource: "src/assets/hero-entrepreneur-v2.jpg",
    position: "center",
    accent: "#ff7a1a",
    secondary: "#8ed9d2",
  },
  capital_readiness: {
    publicPath: "/images/signals/backgrounds/capital-readiness.jpg",
    fallbackSource: "src/assets/funding-review.jpg",
    position: "center",
    accent: "#ff8a1f",
    secondary: "#00a6ff",
  },
  market_shock: {
    publicPath: "/images/signals/backgrounds/market-shock.jpg",
    fallbackSource: "src/assets/intel-hero.jpg",
    position: "center",
    accent: "#ff5a1f",
    secondary: "#00d4ff",
  },
  operational_leverage: {
    publicPath: "/images/signals/backgrounds/operational-leverage.jpg",
    fallbackSource: "src/assets/intel-action.jpg",
    position: "center",
    accent: "#22d3ee",
    secondary: "#ff9b22",
  },
  consulting_revenue: {
    publicPath: "/images/signals/backgrounds/consulting-revenue.jpg",
    fallbackSource: "src/assets/hero-entrepreneur.jpg",
    position: "center",
    accent: "#00d4ff",
    secondary: "#ff7a1a",
  },
  event_workshop: {
    publicPath: "/images/signals/backgrounds/event-workshop.jpg",
    fallbackSource: "src/assets/founders-collaborating.jpg",
    position: "center",
    accent: "#ff7a1a",
    secondary: "#8ed9d2",
  },
  wildcard_attention: {
    publicPath: "/images/signals/backgrounds/wildcard-attention.jpg",
    fallbackSource: "src/assets/late-night-strategy.jpg",
    position: "center",
    accent: "#22d3ee",
    secondary: "#ff8a1f",
  },
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
    "FOUNDER STRATEGY & OPERATIONS": "FOUNDER STRATEGY",
    "COACHING, CONSULTING & ENTREPRENEURSHIP": "CONSULTING",
    "AI REVENUE OPPORTUNITIES": "AI REVENUE",
    "JAMSTACK OPERATING SYSTEMS": "JAMSTACK OPS",
    "MARKET & REGULATORY": "MARKET RISK",
  };
  return replacements[category] || category.slice(0, 26);
}

function getFamilyConfig(family) {
  return IMAGE_FAMILIES[family] ?? IMAGE_FAMILIES.wildcard_attention;
}

function deterministicIndex(seed = "", modulo = 1, salt = "") {
  if (modulo <= 1) return 0;
  const hash = createHash("sha1").update(`${salt}:${seed}`).digest("hex");
  return Number.parseInt(hash.slice(0, 8), 16) % modulo;
}

export function assignImageCreativeDirection(item) {
  const seed = item.slug || item.originalUrl || item.url || item.title || "phoenix-signal";
  return {
    imageVariant: item.imageVariant || IMAGE_VARIANTS[deterministicIndex(seed, IMAGE_VARIANTS.length, "variant")],
    imageTone: item.imageTone || IMAGE_TONES[deterministicIndex(seed, IMAGE_TONES.length, "tone")],
    imageComposition: item.imageComposition || IMAGE_COMPOSITIONS[deterministicIndex(seed, IMAGE_COMPOSITIONS.length, "composition")],
  };
}

function getBackgroundPathForFamily(family) {
  const config = getFamilyConfig(family);
  return path.join(DEFAULT_OUTPUT_ROOT, config.publicPath.replace(/^\//, ""));
}

async function resolveOwnedBackgroundPath(family) {
  const config = getFamilyConfig(family);
  const backgroundPath = getBackgroundPathForFamily(family);
  try {
    await fs.access(backgroundPath);
    return { path: backgroundPath, family, missingPrimary: false };
  } catch {
    return {
      path: path.join(APP_ROOT, config.fallbackSource),
      family,
      missingPrimary: true,
    };
  }
}

function getGeneratedImagePublicPath(item) {
  return `/${GENERATED_SIGNAL_IMAGE_DIR}/${item.slug}.jpg`;
}

export function resolveSourceImagePolicy(item, allowlist = DEFAULT_IMAGE_SOURCE_ALLOWLIST) {
  const normalizedAllowlist = allowlist || DEFAULT_IMAGE_SOURCE_ALLOWLIST;
  const defaultPolicy = normalizedAllowlist.defaultPolicy || "reference-only";
  const sources = normalizedAllowlist.sources || {};
  const sourceImageUrl = item.sourceImageUrl || item.publisherImageUrl || "";
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
    canUseSourceImage: policy === "allowed" && hasSourceImage,
    manualReviewNeeded: requiresVisibility,
  };
}

function buildNonPublicSourceWarning(sourcePolicy) {
  if (sourcePolicy.policy === "allowed") return "";
  if (!sourcePolicy.hasExplicitMatch) {
    return "Source policy is unmatched; using a Phoenix-owned fallback and flagging manual review.";
  }
  if (sourcePolicy.policy === "manual-review") {
    return "Source policy requires manual review before public image use; using a Phoenix-owned fallback.";
  }
  if (sourcePolicy.policy === "disallowed") {
    return "Source policy disallows public image use; using a Phoenix-owned fallback.";
  }
  return "Source policy is reference-only and not approved for public image use; using a Phoenix-owned fallback.";
}

export function createImageBrief(item, options = {}) {
  const text = normalizeText([
    item.title,
    item.description,
    item.whyItMatters,
    item.founderTakeaway,
    item.bucketLabel,
  ].filter(Boolean).join(" ")).toLowerCase();
  const sourcePolicy = resolveSourceImagePolicy(item, options.sourceImageAllowlist);
  let storyAngle = "Founder signal";
  let emotionalHook = "A practical signal worth translating before the market gets noisy.";
  let visualMetaphor = "A premium founder briefing moment with clean business context.";
  let audiencePainOpportunity = "Founders need a simple next move, not another article to save.";
  let imageFamily = "wildcard_attention";
  let template = "founder_brief";
  let overlayTone = "steady";

  if (textMatches(text, "risk|warning|trust|trusted|unchecked|accused|scraping|lawsuit|regulation|regulatory|security|gas|turbine|power|prices|cost|threat|failure|imploded")) {
    storyAngle = "Risk signal";
    emotionalHook = "The useful question is what can break, cost more, or need human judgment.";
    visualMetaphor = "A late-night decision room, warning glow, and pressure around the operator.";
    audiencePainOpportunity = "Founders need to spot the risk before it becomes an expensive surprise.";
    imageFamily = textMatches(text, "power|prices|gas|turbine|energy|grid|regulation|regulatory") ? "market_shock" : "ai_risk";
    template = "market_warning";
    overlayTone = "warning";
  } else if (textMatches(text, "funding|raised|raises|venture|capital|loan|credit|lending|bank|cash flow|valuation|investor|seed|series")) {
    const frontierAiFunding = textMatches(text, "anthropic|openai|claude|chatgpt|frontier|foundation model") &&
      textMatches(text, "valuation|funding|fundraising|raise|raised|investor|ipo|billion");
    storyAngle = frontierAiFunding ? "AI funding race" : "Capital readiness";
    emotionalHook = frontierAiFunding
      ? "A near-trillion-dollar valuation changes the benchmark for AI traction, trust, and durable revenue."
      : "Capital is flowing toward clearer proof, stronger timing, and a more believable growth story.";
    visualMetaphor = frontierAiFunding
      ? "A high-stakes AI boardroom where valuation, adoption, and infrastructure pressure are visible."
      : "A founder reviewing capital options with a clear path through the numbers.";
    audiencePainOpportunity = frontierAiFunding
      ? "Founders need to understand what investors are actually rewarding before borrowing the headline."
      : "Founders need to connect attention to a fundable business move.";
    imageFamily = "capital_readiness";
    template = "opportunity_window";
    overlayTone = "capital";
  } else if (textMatches(text, "revenue|consulting|consultant|sales|monetize|offer|agency|client|workshop|training|event")) {
    storyAngle = "Revenue opportunity";
    emotionalHook = "The headline matters if it can become a clear offer, event, or consulting path.";
    visualMetaphor = "A polished consulting room where AI interest becomes a business offer.";
    audiencePainOpportunity = "Founders need to package AI attention into revenue instead of noise.";
    imageFamily = textMatches(text, "workshop|training|event") ? "event_workshop" : "consulting_revenue";
    template = "opportunity_window";
    overlayTone = "opportunity";
  } else if (textMatches(text, "workflow|workflows|automation|automate|agent|agents|tool|tools|cloudflare|serverless|static|deployment|operations|productivity|integration")) {
    storyAngle = "Operator leverage";
    emotionalHook = "The signal is not the tool itself. It is what the tool can remove, speed up, or systemize.";
    visualMetaphor = "A clean operating room for AI workflow, systems, and execution decisions.";
    audiencePainOpportunity = "Founders need one useful workflow before they buy another subscription.";
    imageFamily = textMatches(text, "agent|agents|ai") ? "ai_opportunity" : "operational_leverage";
    template = "founder_brief";
    overlayTone = "operator";
  } else if (textMatches(text, "founder|startup|leadership|strategy|pricing|hiring|team|customer|go-to-market|growth")) {
    storyAngle = "Founder pressure";
    emotionalHook = "A founder decision is hiding inside the news cycle.";
    visualMetaphor = "A focused founder moment with calm pressure, strategy, and a next decision.";
    audiencePainOpportunity = "Founders need to decide what to keep, cut, clarify, or test.";
    imageFamily = "founder_pressure";
    template = "founder_brief";
    overlayTone = "strategic";
  }

  const creativeDirection = assignImageCreativeDirection(item);

  return {
    storyAngle,
    emotionalHook,
    visualMetaphor,
    audiencePainOpportunity,
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
  const response = await fetchImageImpl(sourceImageUrl, {
    headers: {
      "User-Agent": "PhoenixVentureStudiosRSS/1.0 (+https://phoenixventurestudios.com)",
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
    },
  });
  if (!response?.ok) throw new Error(`Source image HTTP ${response?.status || "failed"}`);

  const contentType = response.headers?.get?.("content-type") || "";
  if (contentType && !contentType.toLowerCase().startsWith("image/")) {
    throw new Error(`Source image response is not an image (${contentType})`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length < 100) throw new Error("Source image is too small to be usable");
  if (buffer.length > (options.maxSourceImageBytes || MAX_SOURCE_IMAGE_BYTES)) {
    throw new Error("Source image is larger than the allowed limit");
  }
  return buffer;
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
        imageWarnings: [],
      },
    };
  }

  const imageBrief = providedBrief || createImageBrief(item, options);
  const sourcePolicy = resolveSourceImagePolicy(item, options.sourceImageAllowlist);
  const warnings = [];

  if (sourcePolicy.canUseSourceImage) {
    try {
      const sourceBuffer = await fetchSourceImageBuffer(sourcePolicy.sourceImageUrl, options);
      const config = getFamilyConfig(imageBrief.imageFamily);
      return {
        input: sourceBuffer,
        familyConfig: config,
        decision: {
          imageStrategy: "source-allowlisted",
          imageFamily: imageBrief.imageFamily,
          imageSourceType: "source-image",
          imageCredit: sourcePolicy.credit,
          imageRightsStatus: sourcePolicy.rightsStatus,
          imageTemplate: imageBrief.template,
          imageBrief,
          imageVariant: imageBrief.imageVariant,
          imageTone: imageBrief.imageTone,
          imageComposition: imageBrief.imageComposition,
          imageWarnings: [],
        },
      };
    } catch (error) {
      warnings.push(`Allowlisted source image failed validation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const background = await resolveOwnedBackgroundPath(imageBrief.imageFamily);
  const config = getFamilyConfig(imageBrief.imageFamily);
  if (background.missingPrimary) {
    warnings.push(`Primary image family background missing; used source asset fallback for ${imageBrief.imageFamily}.`);
  }
  if (sourcePolicy.manualReviewNeeded) {
    const policyWarning = buildNonPublicSourceWarning(sourcePolicy);
    if (policyWarning) warnings.push(policyWarning);
  }

  return {
    input: background.path,
    familyConfig: config,
    decision: {
      imageStrategy: background.missingPrimary ? "fallback-editorial" : "owned-photo-match",
      imageFamily: imageBrief.imageFamily,
      imageSourceType: "phoenix-owned",
      imageCredit: "Phoenix Venture Studios image library",
      imageRightsStatus: "owned-or-licensed",
      imageTemplate: imageBrief.template,
      imageBrief,
      imageVariant: imageBrief.imageVariant,
      imageTone: imageBrief.imageTone,
      imageComposition: imageBrief.imageComposition,
      imageWarnings: warnings,
    },
  };
}

function buildSignalCardSvg(item, options = {}) {
  const imageBrief = item.imageBrief || createImageBrief(item, options);
  const familyConfig = options.familyConfig || getFamilyConfig(imageBrief.imageFamily);
  const template = TEMPLATE_STYLES[imageBrief.template] || TEMPLATE_STYLES.founder_brief;
  const creativeDirection = assignImageCreativeDirection({ ...item, ...imageBrief });
  const composition = creativeDirection.imageComposition;
  const tone = creativeDirection.imageTone;
  const variant = creativeDirection.imageVariant;
  const layout = {
    "left-anchor": {
      textX: 86,
      sourceX: 934,
      sourceAlign: "start",
      shadeX1: 0,
      shadeX2: 1,
      accentCx: "86%",
      accentCy: "12%",
      heatCx: "88%",
      heatCy: "88%",
      barX: 68,
      tailX: 1018,
      titleChars: imageBrief.template === "market_warning" ? 23 : 25,
    },
    "split-panel": {
      textX: 92,
      sourceX: 860,
      sourceAlign: "start",
      shadeX1: 0,
      shadeX2: 1,
      accentCx: "74%",
      accentCy: "16%",
      heatCx: "78%",
      heatCy: "80%",
      barX: 68,
      tailX: 988,
      titleChars: imageBrief.template === "market_warning" ? 22 : 24,
    },
    "right-anchor": {
      textX: 406,
      sourceX: 88,
      sourceAlign: "start",
      shadeX1: 1,
      shadeX2: 0,
      accentCx: "18%",
      accentCy: "12%",
      heatCx: "18%",
      heatCy: "88%",
      barX: 894,
      tailX: 76,
      titleChars: imageBrief.template === "market_warning" ? 20 : 22,
    },
    "lower-band": {
      textX: 86,
      sourceX: 882,
      sourceAlign: "start",
      shadeX1: 0,
      shadeX2: 1,
      accentCx: "50%",
      accentCy: "88%",
      heatCx: "92%",
      heatCy: "18%",
      barX: 68,
      tailX: 1006,
      titleChars: imageBrief.template === "market_warning" ? 23 : 25,
    },
  }[composition] || {};
  const toneOpacity = {
    electric: { accent: 0.44, heat: 0.34, line: 0.95 },
    ember: { accent: 0.3, heat: 0.5, line: 0.98 },
    aqua: { accent: 0.5, heat: 0.26, line: 0.86 },
    steel: { accent: 0.28, heat: 0.32, line: 0.72 },
  }[tone] || { accent: 0.34, heat: 0.42, line: 0.9 };
  const titleLines = wrapText(item.title, layout.titleChars || 25, 4);
  const hookLines = wrapText(imageBrief.emotionalHook, 64, 2);
  const category = compactCategoryLabel(item.bucketLabel || "Founder Signal");
  const source = normalizeText(item.sourceName || "Phoenix Source");
  const date = formatDate(item.publishedAt, options.now);
  const accent = familyConfig.accent;
  const secondary = familyConfig.secondary;
  const headlineStartY = composition === "lower-band" ? 264 : 250;
  const headlineLineHeight = 62;
  const sourceY = Math.min(552, headlineStartY + titleLines.length * headlineLineHeight + 40);

  const headline = titleLines
    .map((line, index) => (
      `<text x="${layout.textX}" y="${headlineStartY + index * headlineLineHeight}" font-family="Georgia, 'Times New Roman', serif" font-size="${composition === "right-anchor" ? 53 : 57}" font-weight="700" letter-spacing="-1.75" fill="#fffaf0">${escapeSvg(line)}</text>`
    ))
    .join("");
  const hook = hookLines
    .map((line, index) => (
      `<text x="${layout.textX}" y="${sourceY + 46 + index * 24}" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="#d7f7ff" opacity="0.88">${escapeSvg(line)}</text>`
    ))
    .join("");

  return Buffer.from(`
    <svg width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="shade" x1="${layout.shadeX1}" x2="${layout.shadeX2}" y1="0" y2="0">
          <stop offset="0" stop-color="${template.shadeStop}" stop-opacity="${template.panelOpacity}"/>
          <stop offset="0.52" stop-color="${template.shadeStop}" stop-opacity="0.80"/>
          <stop offset="0.78" stop-color="${template.shadeStop}" stop-opacity="0.32"/>
          <stop offset="1" stop-color="${template.shadeStop}" stop-opacity="0.08"/>
        </linearGradient>
        <radialGradient id="accentGlow" cx="${layout.accentCx}" cy="${layout.accentCy}" r="62%">
          <stop offset="0" stop-color="${secondary}" stop-opacity="${toneOpacity.accent}"/>
          <stop offset="0.48" stop-color="${secondary}" stop-opacity="0.09"/>
          <stop offset="1" stop-color="${secondary}" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="heatGlow" cx="${layout.heatCx}" cy="${layout.heatCy}" r="58%">
          <stop offset="0" stop-color="${accent}" stop-opacity="${toneOpacity.heat}"/>
          <stop offset="0.5" stop-color="${accent}" stop-opacity="0.12"/>
          <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#shade)"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#accentGlow)"/>
      <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="url(#heatGlow)"/>
      <rect x="${layout.barX}" y="52" width="184" height="2" rx="1" fill="${accent}" opacity="${toneOpacity.line}"/>
      <rect x="${composition === "right-anchor" ? 372 : 58}" y="${composition === "lower-band" ? 426 : 130}" width="${composition === "right-anchor" ? 770 : 690}" height="${composition === "lower-band" ? 148 : 360}" rx="34" fill="#031525" opacity="${variant === "operator-map" ? 0.24 : 0.14}"/>
      <text x="${layout.textX}" y="90" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="900" letter-spacing="4.8" fill="${accent}">PHOENIX</text>
      <text x="${layout.textX}" y="120" font-family="Arial, Helvetica, sans-serif" font-size="21" font-weight="900" letter-spacing="5.4" fill="#d7f7ff">FOUNDER SIGNAL</text>
      <text x="${layout.sourceX}" y="83" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900" letter-spacing="3.8" fill="#fffaf0" opacity="0.92" text-anchor="${layout.sourceAlign}">${escapeSvg(source.toUpperCase().slice(0, 24))}</text>
      <text x="${layout.sourceX}" y="111" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="800" fill="#d7f7ff" opacity="0.84" text-anchor="${layout.sourceAlign}">${escapeSvg(date)}</text>
      <rect x="${layout.textX}" y="152" width="${Math.min(600, template.label.length * 13 + category.length * 8 + 76)}" height="38" rx="19" fill="#fffaf0" opacity="0.92"/>
      <text x="${layout.textX + 21}" y="177" font-family="Arial, Helvetica, sans-serif" font-size="15" font-weight="900" letter-spacing="2.6" fill="#073052">${escapeSvg(template.label)} / ${escapeSvg(category)}</text>
      ${headline}
      <circle cx="${layout.textX}" cy="${sourceY + 8}" r="5" fill="${accent}"/>
      <text x="${layout.textX + 18}" y="${sourceY + 15}" font-family="Arial, Helvetica, sans-serif" font-size="17" font-weight="900" fill="#fffaf0" opacity="0.9">${escapeSvg(imageBrief.storyAngle)} · Read the signal</text>
      ${hook}
      <rect x="${layout.tailX}" y="562" width="132" height="6" rx="3" fill="${accent}" opacity="0.82"/>
      <rect x="${layout.tailX + 42}" y="584" width="82" height="6" rx="3" fill="${secondary}" opacity="0.64"/>
    </svg>
  `);
}

export async function renderSignalCard(item, options = {}) {
  const outputRoot = options.outputRoot ?? DEFAULT_OUTPUT_ROOT;
  const siteUrl = String(options.siteUrl || "").replace(/\/$/, "");
  const publicPath = getGeneratedImagePublicPath(item);
  const outputPath = path.join(outputRoot, publicPath.replace(/^\//, ""));
  const prepared = await prepareBackground(item, options);
  const overlay = buildSignalCardSvg(
    { ...item, imageBrief: prepared.decision.imageBrief },
    { ...options, familyConfig: prepared.familyConfig },
  );

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  await sharp(prepared.input)
    .rotate()
    .resize(CARD_WIDTH, CARD_HEIGHT, {
      fit: "cover",
      position: prepared.familyConfig.position,
    })
    .modulate({
      brightness: 1.04,
      saturation: 1.28,
      hue: 0,
    })
    .linear(1.04, -4)
    .composite([{ input: overlay, top: 0, left: 0 }])
    .jpeg({ quality: 88, mozjpeg: true })
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

  for (const item of items) {
    try {
      rendered.push(await renderSignalCard(item, options));
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
