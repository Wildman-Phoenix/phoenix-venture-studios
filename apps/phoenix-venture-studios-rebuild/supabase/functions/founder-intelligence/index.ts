import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { decode as decodeImage } from "https://deno.land/x/imagescript@1.2.17/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://phoenixventurestudios.com";

const CATEGORY_IMAGES: Record<string, string> = {
  "ai infrastructure signal": `${SITE_URL}/images/signal-ai-infrastructure.jpg`,
  "capital market signal": `${SITE_URL}/images/signal-venture-funding.jpg`,
  "venture funding signal": `${SITE_URL}/images/signal-venture-funding.jpg`,
  "growth capital signal": `${SITE_URL}/images/signal-venture-funding.jpg`,
  "business credit signal": `${SITE_URL}/images/signal-business-credit.jpg`,
  "founder strategy signal": `${SITE_URL}/images/signal-founder-strategy.jpg`,
  "market risk signal": `${SITE_URL}/images/signal-market-risk.jpg`,
  "regulatory signal": `${SITE_URL}/images/signal-market-risk.jpg`,
};
const DEFAULT_IMAGE = `${SITE_URL}/images/signal-default.jpg`;

// Deterministic fallback rotation pool — guarantees variety even when generation fails.
// Order is stable; selection is seeded by slug so reruns produce the same image per article.
const FALLBACK_ROTATION: string[] = [
  `${SITE_URL}/images/signal-ai-infrastructure.jpg`,
  `${SITE_URL}/images/signal-venture-funding.jpg`,
  `${SITE_URL}/images/signal-business-credit.jpg`,
  `${SITE_URL}/images/signal-founder-strategy.jpg`,
  `${SITE_URL}/images/signal-market-risk.jpg`,
  `${SITE_URL}/images/signal-default.jpg`,
];

function hashSlug(slug: string): number {
  let h = 2166136261;
  for (let i = 0; i < slug.length; i++) {
    h ^= slug.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Deterministic fallback selection. Prefers the category image when available
 * AND not already used in the recent window; otherwise rotates through the
 * full pool using a slug-seeded offset so adjacent articles never collide.
 */
function pickFallbackImage(slug: string, category: string, recentImageUrls: string[]): { url: string; isDefault: boolean } {
  const categoryImage = CATEGORY_IMAGES[(category || "").toLowerCase()];
  if (categoryImage && !recentImageUrls.includes(categoryImage)) {
    return { url: categoryImage, isDefault: categoryImage === DEFAULT_IMAGE };
  }
  const seed = hashSlug(slug);
  const len = FALLBACK_ROTATION.length;
  for (let i = 0; i < len; i++) {
    const candidate = FALLBACK_ROTATION[(seed + i) % len];
    if (!recentImageUrls.includes(candidate)) {
      return { url: candidate, isDefault: candidate === DEFAULT_IMAGE };
    }
  }
  // Whole pool exhausted in recent window — still rotate deterministically rather than collapse to default.
  const forced = FALLBACK_ROTATION[seed % len];
  return { url: forced, isDefault: forced === DEFAULT_IMAGE };
}

// ─── TEXT SANITIZATION ───────────────────────────────────────────────
// Decodes HTML entities, strips leaked source/domain references, cleans spacing

const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&apos;": "'", "&#39;": "'", "&#x27;": "'", "&#x2F;": "/",
  "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
  "&lsquo;": "\u2018", "&rsquo;": "\u2019", "&ldquo;": "\u201C", "&rdquo;": "\u201D",
};

function decodeHtmlEntities(text: string): string {
  if (!text) return text;
  // Named + hex/dec numeric entities
  let result = text.replace(/&[#a-zA-Z0-9]+;/g, (match) => {
    if (HTML_ENTITY_MAP[match]) return HTML_ENTITY_MAP[match];
    // Numeric: &#123; or &#x1F;
    const numMatch = match.match(/&#(\d+);/);
    if (numMatch) return String.fromCharCode(parseInt(numMatch[1], 10));
    const hexMatch = match.match(/&#x([0-9a-fA-F]+);/);
    if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
    return match;
  });
  return result;
}

// Patterns that indicate leaked source/domain metadata in narrative copy.
// IMPORTANT: These only match clear metadata leaks, NOT legitimate company names.
const SOURCE_LEAK_PATTERNS = [
  /\bSource:\s*[^\n.]+/gi,                           // "Source: TechCrunch" lines
  /\bvia\s+(?:https?:\/\/)?[a-z0-9-]+\.[a-z]{2,}/gi, // "via techcrunch.com"
  /https?:\/\/[^\s)]+/gi,                             // full URLs only (not bare domain-like names)
];

// Known publisher names to strip from narrative body copy (not from the `source` field).
// These are matched as whole words — won't affect "Forbes 30 Under 30" etc. in headlines.
const PUBLISHER_NAMES = [
  "techcrunch", "bloomberg", "reuters", "cnbc", "forbes", "axios",
  "the verge", "wired", "wall street journal", "wsj", "nytimes",
  "financial times", "venturebeat", "crunchbase", "pitchbook",
  "semafor", "the information",
];

// Domains that are publisher sites (strip only when they appear as bare domains, not as company names)
const PUBLISHER_DOMAINS = [
  "techcrunch.com", "bloomberg.com", "reuters.com", "cnbc.com", "forbes.com",
  "axios.com", "theverge.com", "wired.com", "wsj.com", "nytimes.com",
  "ft.com", "venturebeat.com", "crunchbase.com", "pitchbook.com",
  "fundup.ai", "semafor.com", "theinformation.com",
];

function stripSourceLeaks(text: string, isHeadline = false): string {
  if (!text) return text;
  let result = text;

  // Remove "Source: ..." lines and full URLs from all copy
  for (const pattern of SOURCE_LEAK_PATTERNS) {
    result = result.replace(pattern, "");
  }

  // Only strip publisher names/domains from body copy, NOT from headlines
  // (headlines legitimately mention companies)
  if (!isHeadline) {
    for (const domain of PUBLISHER_DOMAINS) {
      const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "");
    }
    for (const pub of PUBLISHER_NAMES) {
      // Only strip standalone publisher mentions at sentence boundaries or after punctuation
      // Avoid stripping if part of a larger phrase like "according to Forbes research"
      const escaped = pub.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      result = result.replace(new RegExp(`(?:,\\s*|—\\s*|\\(\\s*)${escaped}\\b\\.?`, "gi"), "");
    }
  }

  // Clean up resulting artifacts
  result = result
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:!?])/g, "$1")
    .replace(/([—–-])\s*$/gm, "")
    .replace(/^\s*[—–-]\s*/gm, "")
    .trim();
  return result;
}

// Light sanitization for headlines: decode entities, strip only full URLs
function sanitizeHeadline(text: string): string {
  if (!text) return text;
  return stripSourceLeaks(decodeHtmlEntities(text), true).trim();
}

function sanitizeText(text: string): string {
  if (!text) return text;
  return stripSourceLeaks(decodeHtmlEntities(text), false).trim();
}

// Sanitize all user-facing fields on an article object
function sanitizeArticle(a: Record<string, any>): Record<string, any> {
  return {
    ...a,
    headline: sanitizeHeadline(a.headline || ""),
    summary: sanitizeText(a.summary || ""),
    whyItMatters: sanitizeText(a.whyItMatters || ""),
    founderTakeaway: sanitizeText(a.founderTakeaway || ""),
    watchNext: sanitizeText(a.watchNext || ""),
    socialBlurb: sanitizeSocialBlurb(a.socialBlurb || ""),
    // `source` field is the publication name — keep it, but decode entities only
    source: decodeHtmlEntities(a.source || ""),
    // `url` is never sanitized — preserve canonical source URL
  };
}

function sanitizeSocialBlurb(text: string): string {
  if (!text) return text;
  let result = decodeHtmlEntities(text);
  // Strip full URLs and publisher domains from blurb body
  for (const pattern of SOURCE_LEAK_PATTERNS) {
    result = result.replace(pattern, "");
  }
  for (const domain of PUBLISHER_DOMAINS) {
    const escaped = domain.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    result = result.replace(new RegExp(`\\b${escaped}\\b`, "gi"), "");
  }
  return result.replace(/\s{2,}/g, " ").trim();
}

// ─── IMAGE RELEVANCE + GENERATION PIPELINE ──────────────────────────

// OG image rejection heuristics — reject generic publisher graphics
const OG_IMAGE_REJECT_PATTERNS = [
  /logo/i, /favicon/i, /default/i, /placeholder/i, /og-default/i,
  /social-share/i, /thumbnail-default/i, /avatar/i, /icon[\-_]/i,
  /brand[\-_]?mark/i, /opengraph[\-_]default/i,
];

const OG_IMAGE_REJECT_DOMAINS = [
  "gravatar.com", "cdn.icon-icons.com", "abs.twimg.com",
  "pbs.twimg.com/profile_images", "upload.wikimedia.org",
];

function scoreOgImageRelevance(
  ogUrl: string | null,
  article: { headline: string; founderTakeaway: string; editorialCategory: string },
  recentImageUrls: string[],
): { score: number; reason: string } {
  if (!ogUrl) return { score: 0, reason: "no_og_image" };

  const lowerUrl = ogUrl.toLowerCase();

  // Reject known generic patterns
  for (const pat of OG_IMAGE_REJECT_PATTERNS) {
    if (pat.test(lowerUrl)) return { score: 0.1, reason: `generic_pattern:${pat.source}` };
  }
  for (const domain of OG_IMAGE_REJECT_DOMAINS) {
    if (lowerUrl.includes(domain)) return { score: 0.1, reason: `generic_domain:${domain}` };
  }

  // Reject if image URL too short (likely a tiny icon)
  if (ogUrl.length < 40) return { score: 0.2, reason: "url_too_short" };

  // Reject if same image URL used recently
  if (recentImageUrls.includes(ogUrl)) return { score: 0.15, reason: "duplicate_recent" };

  // Passed basic checks — moderately relevant
  return { score: 0.7, reason: "passed_heuristics" };
}

// Minimum score to accept an OG image instead of generating
const OG_RELEVANCE_THRESHOLD = 0.5;

// 25 diverse scene archetypes for rotation — expanded for variety
const SCENE_ARCHETYPES = [
  { id: "founder-meeting", prompt: "two founders having a serious strategy conversation across a clean conference table, natural window light, one gesturing to papers on the table" },
  { id: "strategy-desk", prompt: "a solo entrepreneur at a standing desk reviewing printed financial reports, warm desk lamp, evening light through blinds, quiet focus" },
  { id: "ops-floor", prompt: "an operations manager walking through a modern warehouse floor, industrial lighting, organized shelving, clipboard in hand" },
  { id: "industrial-env", prompt: "a manufacturing facility with precision machinery, an operator inspecting product quality, safety glasses, controlled environment" },
  { id: "retail-product", prompt: "hands carefully arranging premium retail products on a display shelf, soft boutique lighting, intentional merchandising" },
  { id: "logistics-flow", prompt: "a logistics coordinator reviewing shipment manifests at a loading dock, morning light, forklifts in background, organized freight" },
  { id: "editorial-analysis", prompt: "an analyst at a clean desk with multiple monitors showing market data, ambient office glow, coffee cup, deep concentration" },
  { id: "market-screens", prompt: "a professional standing before large trading screens in a modern office, data visible but not readable, blue-white monitor glow mixing with warm room light" },
  { id: "investor-conversation", prompt: "a founder presenting to two seated investors in a glass-walled meeting room, city view behind, natural afternoon light, documents on table" },
  { id: "close-up-workflow", prompt: "extreme close-up of hands writing notes in a leather-bound journal, pen in motion, warm overhead light, shallow depth of field" },
  { id: "cafe-strategy", prompt: "a business owner working from a quiet upscale cafe, laptop and notebook open, window light creating soft shadows, urban street visible outside" },
  { id: "food-production", prompt: "a food business owner inspecting fresh product in a commercial kitchen, stainless steel surfaces, bright clean lighting, quality focus" },
  { id: "construction-site", prompt: "a project manager reviewing blueprints at a construction site, hard hat, morning golden hour light, steel framing in background" },
  { id: "tech-workspace", prompt: "a software founder pair-programming at dual monitors in a loft office, exposed brick, warm string lights, late afternoon" },
  { id: "boardroom-review", prompt: "an executive reviewing a bound strategy document in an empty boardroom, polished wood table, diffused overhead lighting, solitary focus" },
  { id: "startup-garage", prompt: "a founder working on a prototype in a clean garage workshop, workbench with tools, focused task lighting, DIY energy" },
  { id: "rooftop-city", prompt: "an entrepreneur taking a call on a city rooftop terrace, skyline in soft focus behind, golden hour, confident posture" },
  { id: "data-review", prompt: "a founder reviewing a printed report with charts and graphs spread on a dark wood table, overhead view, warm ambient light" },
  { id: "team-huddle", prompt: "a small team of three in a casual stand-up meeting around a whiteboard, collaborative energy, modern open office, natural light" },
  { id: "night-grind", prompt: "a solo founder working late at a minimalist desk, single monitor glow, city lights through window, quiet determination, moody atmosphere" },
  { id: "hardware-lab", prompt: "an engineer testing a circuit board prototype on a clean lab bench, oscilloscope in background, precise task lighting, technical focus" },
  { id: "shipping-dock", prompt: "a small business owner supervising pallets being loaded into a delivery truck, early morning mist, industrial dock, purposeful movement" },
  { id: "client-handshake", prompt: "two professionals shaking hands across a polished conference table, glass office walls, city skyline behind, mutual respect" },
  { id: "field-inspection", prompt: "a quality inspector examining agricultural produce in a sunlit greenhouse, lush greenery, clipboard in hand, natural daylight" },
  { id: "coworking-focus", prompt: "a solo founder deep in concentration at a coworking space, headphones on, natural light from large windows, laptop and notes" },
  // SMB / operator-weighted additions for broader audience fit
  { id: "farmers-market-stand", prompt: "a small business owner arranging produce at an outdoor farmers market stand, warm morning sun, hand-written chalkboard sign blurred in background, customer browsing" },
  { id: "auto-shop-owner", prompt: "an auto repair shop owner reviewing a clipboard inside a clean independent garage, lifted vehicle softly out of focus behind, warm work lights" },
  { id: "dental-office-owner", prompt: "a healthcare practice owner standing in the bright reception area of a small dental office, soft daylight, warm wood accents, calm professional posture" },
  { id: "legal-office-conference", prompt: "a small law firm partner in a tailored blazer reviewing a printed contract at a polished walnut conference table, warm library bookshelves softly behind" },
  { id: "ecommerce-packing-bench", prompt: "a small e-commerce founder packing branded shipping boxes at a tidy fulfillment bench, warm overhead light, neat stacks of mailers and tape, calm focused energy" },
  { id: "solo-bookkeeper-home", prompt: "a solo bookkeeper at a tidy home office desk reviewing printed statements, soft morning light through curtains, plant on desk, calm warm atmosphere" },
];

const LIGHTING_STYLES = [
  "warm directional golden hour light with soft shadows",
  "cool morning blue light with warm accent highlights",
  "dramatic chiaroscuro lighting with warm amber tones",
  "soft diffused overcast light creating even cinematic tones",
  "backlit silhouette with warm edge lighting",
  "mixed warm and cool lighting creating depth and atmosphere",
  "industrial overhead fluorescent mixed with window daylight",
  "intimate desk lamp glow with deep background shadows",
];

const COLOR_TREATMENTS = [
  "muted editorial color grading with warm highlights and cool shadows",
  "cinematic orange and teal color palette",
  "desaturated with selective warm accent colors",
  "rich warm tones with deep shadow detail",
  "film-stock color rendering with natural skin tones",
  "moody editorial with amber and charcoal tones",
  "clean neutral tones with subtle warmth",
  "high-contrast documentary grading with natural color",
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function getCategoryImage(category: string): string {
  const key = (category || "").toLowerCase().trim();
  return CATEGORY_IMAGES[key] || DEFAULT_IMAGE;
}

async function extractOgImage(url: string): Promise<string | null> {
  if (!url || !url.startsWith("http")) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PhoenixBot/1.0)" },
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = "";
    const decoder = new TextDecoder();
    while (html.length < 50000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
    }
    reader.cancel();

    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogMatch?.[1] && ogMatch[1].startsWith("http") && ogMatch[1].length > 20) return ogMatch[1];

    const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (twMatch?.[1] && twMatch[1].startsWith("http") && twMatch[1].length > 20) return twMatch[1];

    return null;
  } catch {
    return null;
  }
}

// Fetch recent entries for anti-repetition (scene IDs + image URLs)
async function getRecentEntries(sb: any, count = 10): Promise<{ sceneIds: string[]; imageUrls: string[] }> {
  try {
    const { data } = await sb
      .from("intelligence_entries")
      .select("image_scene_id, image_url")
      .order("created_at", { ascending: false })
      .limit(count);
    const entries = data || [];
    return {
      sceneIds: entries.map((r: any) => r.image_scene_id).filter(Boolean),
      imageUrls: entries.map((r: any) => r.image_url).filter(Boolean),
    };
  } catch {
    return { sceneIds: [], imageUrls: [] };
  }
}

function pickScene(index: number, recentSceneIds: string[]): typeof SCENE_ARCHETYPES[0] {
  const available = SCENE_ARCHETYPES.filter(s => !recentSceneIds.includes(s.id));
  const pool = available.length > 0 ? available : SCENE_ARCHETYPES;
  return pool[index % pool.length];
}

// Build a takeaway-driven image prompt instead of generic category-based
function buildContextualPrompt(
  article: { headline: string; founderTakeaway: string; whyItMatters: string; editorialCategory: string; socialBlurb: string },
  scene: typeof SCENE_ARCHETYPES[0],
  lighting: string,
  colorTreatment: string,
): string {
  // Extract the practical meaning for visual direction
  const takeaway = article.founderTakeaway || article.whyItMatters || article.headline || "";
  const category = article.editorialCategory || "Market Signal";

  return `Create an ultra-realistic editorial photograph (1200x630) that visually represents this founder insight:

STRATEGIC CONTEXT: "${takeaway}"
CATEGORY: ${category}

SCENE DIRECTION: ${scene.prompt}
Adapt the scene to reflect the strategic context above. The environment, props, and human activity should feel relevant to the insight.

PHOTOGRAPHY DIRECTION:
- Lighting: ${lighting}
- Color treatment: ${colorTreatment}
- Shot on a full-frame camera with an 85mm f/1.4 lens
- Shallow depth of field with cinematic bokeh
- Realistic skin textures, natural materials, real environments
- High-detail, film-still quality

BRIGHTNESS & CONTRAST RULES:
- Average brightness above 40%, never pure black backgrounds, always include one warm accent element (amber light spill, warm wood, copper detail).
- Visible tonal range with rich shadows and warm highlights. Midtones must be clearly readable.
- Background dark modern tones (slate, charcoal, deep navy) but NEVER pure black or muddy.
- If overall image would score below 40% average brightness, lighten the composition.
- Must be readable and alive at thumbnail size on mobile.
- Avoid generic finance stock-photo energy — no corporate handshake, no generic laptop on white desk, no vague glass office.

ABSOLUTE RULES — DO NOT VIOLATE:
- ZERO TEXT — documents blank or abstract line patterns only, no fake letters or numbers, no labels on monitors, no signage, no captions, no watermarks, no typography of any kind.
- Do NOT include charts, graphs, UI elements, or readable screen content
- Do NOT include neon lights, holographic effects, or sci-fi elements
- Do NOT create gradient title cards or abstract graphic designs
- The image must look like a real photograph taken by a professional editorial photographer
- Premium documentary/editorial style — grounded, human, believable`;
}

// ─── IMAGE QUALITY VALIDATION ────────────────────────────────────────
type ValidationResult = { ok: boolean; reason?: string; brightness?: number; textScore?: number };

/**
 * Validate generated image bytes. Provider-aware brightness threshold:
 * OpenAI editorial output is intentionally darker than the legacy secondary
 * generator style, so we use a lower threshold for openai. Blank / near-black and
 * text-pattern artifacts are still rejected.
 */
async function validateImageBytes(
  bytes: Uint8Array,
  opts: { provider?: "openai" | "legacy" | "unknown"; slug?: string } = {},
): Promise<ValidationResult> {
  const provider = opts.provider ?? "unknown";
  // Lower threshold for OpenAI dark editorial style; keep the legacy threshold higher.
  const minBrightness =
    provider === "openai" ? 14 :
    provider === "legacy" ? 28 : 22;
  try {
    const img: any = await decodeImage(bytes);
    if (!img || !img.width || !img.height) return { ok: false, reason: "decode-failed" };
    const w: number = img.width;
    const h: number = img.height;
    const sx = 64;
    const sy = 36;
    const lums: number[] = [];
    let sum = 0;
    for (let j = 0; j < sy; j++) {
      for (let i = 0; i < sx; i++) {
        const x = Math.floor((i + 0.5) * (w / sx));
        const y = Math.floor((j + 0.5) * (h / sy));
        const px = img.getPixelAt(x + 1, y + 1);
        const r = (px >>> 24) & 0xff;
        const g = (px >>> 16) & 0xff;
        const b = (px >>> 8) & 0xff;
        const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        lums.push(lum);
        sum += lum;
      }
    }
    const avg = sum / lums.length;
    const brightnessPct = (avg / 255) * 100;
    if (brightnessPct < minBrightness) {
      console.warn(`[image-validate] ${opts.slug ?? ""} provider=${provider} brightness=${brightnessPct.toFixed(1)}% threshold=${minBrightness}% → REJECT too-dark`);
      return { ok: false, reason: "too-dark", brightness: brightnessPct };
    }

    let textScore = 0;
    const bandStart = Math.floor(sy * 0.25);
    const bandEnd = Math.floor(sy * 0.85);
    for (let j = bandStart; j < bandEnd; j++) {
      let transitions = 0;
      let prevDark = false;
      for (let i = 0; i < sx; i++) {
        const idx = j * sx + i;
        const dark = lums[idx] < avg - 20;
        if (i > 0 && dark !== prevDark) transitions++;
        prevDark = dark;
      }
      if (transitions >= 12) textScore++;
    }
    if (textScore >= 6) {
      console.warn(`[image-validate] ${opts.slug ?? ""} provider=${provider} brightness=${brightnessPct.toFixed(1)}% textScore=${textScore} → REJECT text-like-pattern`);
      return { ok: false, reason: "text-like-pattern", brightness: brightnessPct, textScore };
    }
    console.log(`[image-validate] ${opts.slug ?? ""} provider=${provider} brightness=${brightnessPct.toFixed(1)}% textScore=${textScore} → PASS`);
    return { ok: true, brightness: brightnessPct, textScore };
  } catch (err) {
    console.warn("[image-validate] decode error, accepting:", err);
    return { ok: true, reason: "validator-error" };
  }
}

const STRICTER_REINFORCEMENT = `

CRITICAL REINFORCEMENT (previous attempt was rejected):
- Brightness MUST exceed 50%. Lift exposure noticeably. Use bright window light or warm overhead lighting.
- ABSOLUTELY ZERO TEXT, fake letters, fake numbers, fake document writing, or labels of any kind. Documents must be COMPLETELY blank, or use only smooth abstract gradients — no horizontal line patterns that suggest text.
- No screens with UI, no signage, no captions, no watermarks.`;

type ImageCallResult =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; status: number; reason: string; errorBody?: string };

type ImageAttemptLog = {
  label: string;
  model: string;
  outcome: "passed" | "rejected" | "no_image" | "http_error";
  httpStatus?: number;
  errorBody?: string;
  validation?: { ok: boolean; reason?: string; brightness?: number; textScore?: number };
  durationMs: number;
};

// ─── OpenAI Image Provider (primary generator) ───────────────────────
// Single attempt per article. If the configured model is unavailable
// (model_not_found / 404 / clear "model" 400), retry ONCE with a fallback model.
// No DALL·E. No multiple variations. Quality stays "low" for cost control.

const OPENAI_IMAGE_PRIMARY_MODEL = "gpt-image-1-mini";
const OPENAI_IMAGE_FALLBACK_MODEL = "gpt-image-2";
const OPENAI_IMAGE_SIZE = "1536x1024";
const OPENAI_IMAGE_QUALITY = "low";

const OPENAI_CROP_SAFETY_SUFFIX = `

COMPOSITION SAFETY (critical for social/feed cropping to landscape and square):
- Place the main subject and primary action centered in the frame.
- Keep all important visual details well inside the central 60% of the frame.
- Leave clean negative space around the main concept.
- ABSOLUTELY NO text, letters, numbers, captions, labels, logos, brand marks, UI text, or watermarks anywhere in the image.
- No important detail near the edges or corners — assume aggressive edge cropping.`;

function isOpenAIModelUnavailable(status: number, errorBody: string | undefined): boolean {
  if (status === 404) return true;
  if (!errorBody) return false;
  const lower = errorBody.toLowerCase();
  if (lower.includes("model_not_found")) return true;
  if (status === 400 && (lower.includes("model") && (lower.includes("not found") || lower.includes("does not exist") || lower.includes("unavailable") || lower.includes("invalid")))) {
    return true;
  }
  return false;
}

async function callOpenAIImageOnce(
  prompt: string,
  model: string,
  apiKey: string,
): Promise<ImageCallResult> {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: OPENAI_IMAGE_SIZE,
      quality: OPENAI_IMAGE_QUALITY,
      n: 1,
      // GPT image models return b64_json by default; response_format is not supported.
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    // Do NOT log API key. Truncate body to avoid leaking large payloads.
    console.error(`[openai-image:${model}] failed ${response.status}: ${errorBody.slice(0, 300)}`);
    let reason = `http_${response.status}`;
    if (response.status === 401 || response.status === 403) reason = "auth_failed";
    else if (response.status === 429) reason = "rate_limited";
    else if (isOpenAIModelUnavailable(response.status, errorBody)) reason = "model_unavailable";
    return { ok: false, status: response.status, reason, errorBody };
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    return { ok: false, status: 200, reason: "malformed_response" };
  }
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64 || typeof b64 !== "string") {
    return { ok: false, status: 200, reason: "no_image" };
  }
  try {
    const binary = atob(b64);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
    return { ok: true, bytes: out };
  } catch {
    return { ok: false, status: 200, reason: "b64_decode_failed" };
  }
}

/**
 * One OpenAI generation attempt per article. If the primary model is
 * unavailable on this account, retry once with the fallback model.
 * Returns null on any other failure (caller falls through to legacy gateway / rotation).
 */
async function callOpenAIImage(
  prompt: string,
  apiKey: string,
): Promise<{ result: ImageCallResult; modelUsed: string }> {
  const safePrompt = prompt + OPENAI_CROP_SAFETY_SUFFIX;
  const first = await callOpenAIImageOnce(safePrompt, OPENAI_IMAGE_PRIMARY_MODEL, apiKey);
  if (first.ok || first.reason !== "model_unavailable") {
    return { result: first, modelUsed: OPENAI_IMAGE_PRIMARY_MODEL };
  }
  console.warn(`[openai-image] primary model ${OPENAI_IMAGE_PRIMARY_MODEL} unavailable — retrying once with ${OPENAI_IMAGE_FALLBACK_MODEL}`);
  const second = await callOpenAIImageOnce(safePrompt, OPENAI_IMAGE_FALLBACK_MODEL, apiKey);
  return { result: second, modelUsed: OPENAI_IMAGE_FALLBACK_MODEL };
}

async function generateBrandedImage(
  slug: string,
  article: { headline: string; founderTakeaway: string; whyItMatters: string; editorialCategory: string; socialBlurb: string },
  index: number,
  sb: any,
  recentSceneIds: string[],
  runState: { gatewayCreditsExhausted: boolean },
): Promise<{ url: string | null; sceneId: string | null; promptUsed: string | null; attempts: ImageAttemptLog[]; finalStatus: string; modelUsed: string | null }> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  const attemptsLog: ImageAttemptLog[] = [];
  if (!OPENAI_API_KEY) {
    console.warn("OPENAI_API_KEY not available, skipping image generation");
    return { url: null, sceneId: null, promptUsed: null, attempts: attemptsLog, finalStatus: "no_api_key", modelUsed: null };
  }

  try {
    const scene = pickScene(index, recentSceneIds);
    const lighting = LIGHTING_STYLES[(index + 3) % LIGHTING_STYLES.length];
    const colorTreatment = COLOR_TREATMENTS[(index + 5) % COLOR_TREATMENTS.length];

    const prompt = buildContextualPrompt(article, scene, lighting, colorTreatment);

    let bytes: Uint8Array | null = null;
    let usedPrompt = prompt;
    let modelUsed: string | null = null;
    let creditsExhausted = false;

    // ── Provider 1: OpenAI (primary) — single generation attempt with model fallback ──
    if (OPENAI_API_KEY) {
      const t0 = Date.now();
      const { result: openaiResult, modelUsed: openaiModel } = await callOpenAIImage(prompt, OPENAI_API_KEY);
      if (openaiResult.ok) {
        const verdict = await validateImageBytes(openaiResult.bytes, { provider: "openai", slug });
        attemptsLog.push({
          label: "openai-primary",
          model: openaiModel,
          outcome: verdict.ok ? "passed" : "rejected",
          httpStatus: 200,
          validation: verdict,
          durationMs: Date.now() - t0,
        });
        if (verdict.ok) {
          bytes = openaiResult.bytes;
          usedPrompt = prompt + OPENAI_CROP_SAFETY_SUFFIX;
          modelUsed = openaiModel;
          console.log(`[branded-image:${slug}] openai ${openaiModel} → PASSED`);
        } else {
          console.warn(`[branded-image:${slug}] openai ${openaiModel} → REJECTED (${verdict.reason})`);
        }
      } else {
        attemptsLog.push({
          label: "openai-primary",
          model: openaiModel,
          outcome: openaiResult.status === 200 ? "no_image" : "http_error",
          httpStatus: openaiResult.status,
          errorBody: openaiResult.errorBody?.slice(0, 300),
          validation: { ok: false, reason: openaiResult.reason },
          durationMs: Date.now() - t0,
        });
        console.warn(`[branded-image:${slug}] openai ${openaiModel} failed → ${openaiResult.reason} (http ${openaiResult.status})`);
      }
    }

    if (!bytes) {
      const finalStatus = creditsExhausted ? "no_credits" : "all_attempts_rejected";
      console.error(`[branded-image:${slug}] ${finalStatus} — attempts:`, JSON.stringify(attemptsLog.map(a => ({ label: a.label, outcome: a.outcome, reason: a.validation?.reason }))));
      return { url: null, sceneId: scene.id, promptUsed: prompt, attempts: attemptsLog, finalStatus, modelUsed: null };
    }

    const ext = "png";
    const mimeType = "image/png";
    const filePath = `${slug}.${ext}`;

    const { error: uploadError } = await sb.storage
      .from("intelligence-images")
      .upload(filePath, bytes, {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return { url: null, sceneId: scene.id, promptUsed: prompt, attempts: attemptsLog, finalStatus: "upload_failed", modelUsed };
    }

    const { data: urlData } = sb.storage
      .from("intelligence-images")
      .getPublicUrl(filePath);

    const winningLabel = attemptsLog[attemptsLog.length - 1]?.label ?? "unknown";
    console.log(`[branded-image:${slug}] ✓ generated via ${winningLabel} (${modelUsed}) after ${attemptsLog.length} attempt(s)`);
    return { url: urlData?.publicUrl || null, sceneId: scene.id, promptUsed: usedPrompt, attempts: attemptsLog, finalStatus: `passed_${winningLabel}`, modelUsed };
  } catch (err) {
    console.error("Image generation error:", err);
    return { url: null, sceneId: null, promptUsed: null, attempts: attemptsLog, finalStatus: "exception", modelUsed: null };
  }
}

// ─── PHASE 1 RADAR ENGINE ────────────────────────────────────────────

const DEFAULT_BUCKETS = [
  "capital_credit",
  "founder_strategy",
  "market_regulatory",
  "funding_venture",
  "ai_infrastructure",
  "wildcard",
];

const BUCKET_PROMPTS: Record<string, { domains: string[]; query: string; model: string }> = {
  capital_credit: {
    model: "sonar-pro",
    domains: ["bloomberg.com","wsj.com","reuters.com","ft.com","americanbanker.com","bankrate.com","sba.gov","nfib.com","forbes.com","inc.com","cnbc.com","federalreserve.gov","fdic.gov","occ.gov"],
    query: "Find one specific recent (past 7 days) news event about working capital, invoice factoring, business credit, SBA lending, equipment financing, or banking changes affecting small/mid-business borrowing in the US. Prefer official (SBA.gov, federalreserve.gov, FDIC, OCC) or tier-1 (Reuters, Bloomberg, WSJ, FT). Also acceptable when the capital implication is clear and concretely supported: American Banker, Bankrate, NFIB, Forbes, Inc., CNBC. Fed/rate-cut claims still require official or tier-1 confirmation. The founder/operator/capital implication MUST be explicit.",
  },
  founder_strategy: {
    model: "sonar",
    domains: ["inc.com","entrepreneur.com","forbes.com","hbr.org","axios.com","bloomberg.com","fortune.com"],
    query: "Find one specific recent (past 7 days) story from Inc., Entrepreneur, Forbes, Fortune, HBR, or Axios about a REAL named company or operator with a concrete decision and a concrete metric (pricing, hiring, GTM, product, ops). Tier-1 financial source NOT required. REJECT generic advice articles, listicles, or opinion pieces with no named company, metric, or decision. The takeaway MUST be actionable for a founder/operator.",
  },
  market_regulatory: {
    model: "sonar-pro",
    domains: ["reuters.com","wsj.com","bloomberg.com","ft.com","axios.com","cnbc.com","politico.com","sba.gov","irs.gov","dol.gov","ftc.gov","sec.gov","whitehouse.gov","treasury.gov","federalreserve.gov","congress.gov"],
    query: "Find one specific recent (past 7 days) regulatory, tariff, trade, or macro policy shift that impacts small/mid US businesses. For ENACTED, legal, or regulatory claims (rules in force, court rulings, signed legislation): require an official .gov source OR Reuters/Bloomberg/WSJ/FT reporting on the official action. For PENDING or proposed regulation, a 'watch_signal' candidate is acceptable when the article is clearly about pending action and the headline/summary use cautious language ('proposed', 'could', 'is weighing', 'expected to'). DO NOT transform proposals into enacted actions. The founder/operator/capital implication MUST be explicit.",
  },
  funding_venture: {
    model: "sonar",
    domains: ["pitchbook.com","crunchbase.com","techcrunch.com","axios.com","bloomberg.com","reuters.com","theinformation.com","fortune.com","sec.gov"],
    query: "Find one specific recent (past 7 days) funding round, valuation movement, or sector deal-flow trend with concrete numbers (amount, valuation, lead investor). Acceptable sources: TechCrunch, Crunchbase, PitchBook, Axios, Bloomberg, Reuters, an official company announcement, or an SEC filing. Multiple supporting sources are NOT required at discovery — a single credible source is fine. If the deal is NOT closed, the headline MUST use hedged language ('reportedly', 'in talks', 'is weighing', 'could'). The story should contain a capital-market signal, not just 'company X raised money'.",
  },
  ai_infrastructure: {
    model: "sonar",
    domains: ["techcrunch.com","theinformation.com","bloomberg.com","reuters.com","axios.com","wsj.com"],
    query: "Find one specific recent (past 7 days) AI/tech infrastructure development from TechCrunch, The Information, Axios, Reuters, Bloomberg, or WSJ with a CLEAR operator cost, pricing, capex/opex, access, or capital-allocation implication. Official source NOT required. REJECT pure model/research news, speculative roadmap items, or unverified joint-venture/partnership claims with no concrete operator impact.",
  },
  wildcard: {
    model: "sonar-pro",
    domains: ["bloomberg.com","wsj.com","reuters.com","ft.com","axios.com","forbes.com","fortune.com","cnbc.com","inc.com"],
    query: "Find one specific recent (past 7 days) story (real estate capital, supply chain, energy costs, insurance, labor, or other operator-facing shift) from any allowed domain. The founder/operator/capital implication MUST be explicit, and a concrete number or event MUST be present and source-supported.",
  },
};

// ─── VERIFICATION GATE ───────────────────────────────────────────────

const CLAIM_STATUSES = ["confirmed", "reported", "rumor", "watch_signal", "uncertain"] as const;
type ClaimStatus = typeof CLAIM_STATUSES[number];

const OFFICIAL_DOMAINS = [
  "federalreserve.gov","sec.gov","ftc.gov","sba.gov","whitehouse.gov","treasury.gov",
  "bls.gov","irs.gov","cftc.gov","occ.gov","fdic.gov","congress.gov","supremecourt.gov",
];
const TIER1_FINANCIAL = [
  "bloomberg.com","reuters.com","wsj.com","ft.com","cnbc.com","economist.com","axios.com",
];

function isOfficialUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  try { const h = new URL(u).hostname.toLowerCase(); return OFFICIAL_DOMAINS.some(d => h.endsWith(d)); } catch { return false; }
}
function isTier1Url(u: string | null | undefined): boolean {
  if (!u) return false;
  try { const h = new URL(u).hostname.toLowerCase(); return TIER1_FINANCIAL.some(d => h.endsWith(d)); } catch { return false; }
}

// Sponsored / advertorial / partner-content URL detector.
// Sponsored pages must NEVER serve as the primary published source.
const SPONSORED_PATH_PATTERNS = [
  "/sponsor/", "/sponsored/", "/brand-studio/", "/partner-content/", "/partnercontent/",
  "/paid-content/", "/paidcontent/", "/advertorial/", "/native-ad/", "/nativead/",
  "/promoted/", "/promotion/", "/branded-content/", "/brandvoice/",
];
const SPONSORED_QUERY_KEYS = ["sponsored", "utm_medium"];
function isSponsoredUrl(u: string | null | undefined): boolean {
  if (!u) return false;
  try {
    const url = new URL(u);
    const path = url.pathname.toLowerCase();
    if (SPONSORED_PATH_PATTERNS.some(p => path.includes(p))) return true;
    for (const key of SPONSORED_QUERY_KEYS) {
      const v = url.searchParams.get(key);
      if (!v) continue;
      const val = v.toLowerCase();
      if (key === "sponsored" && (val === "true" || val === "1" || val === "yes")) return true;
      if (key === "utm_medium" && (val === "sponsored" || val.includes("sponsor"))) return true;
    }
    return false;
  } catch {
    return false;
  }
}
function hostnameToSourceName(u: string): string {
  try {
    const h = new URL(u).hostname.replace(/^www\./, "");
    const base = h.split(".").slice(-2, -1)[0] || h;
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return "";
  }
}

const CONFIRM_VERBS = /\b(cuts?|cut|raised?|raises|bans?|banned|approved?|approves|signed?|enacted|closed|raised \$|launched)\b/i;
const CAUTION_HINTS = /\b(reportedly|is weighing|could|may|might|signals?|considering|in talks|expected to|watch signal|according to)\b/i;

function applySafeHeadlineRewrite(original: string, claimStatus: ClaimStatus, source: string): string {
  const h = (original || "").trim();
  if (!h) return h;
  if (claimStatus === "confirmed") return h;
  if (CAUTION_HINTS.test(h)) return h; // already cautious
  // Replace common confirm verbs with cautious framing.
  let safe = h
    .replace(/\bcuts?\b/i, "is reportedly weighing a cut to")
    .replace(/\bbans?\b/i, "moves to restrict")
    .replace(/\bbanned\b/i, "moved to restrict")
    .replace(/\beyes\b/i, "is reportedly weighing")
    .replace(/\braises \$/i, "is reportedly raising $")
    .replace(/\braised \$/i, "reportedly raised $")
    .replace(/\bapproved\b/i, "is reportedly approving")
    .replace(/\bclosed\b/i, "is reportedly closing");
  // If nothing changed, prefix with "Reportedly: " or attribute to source.
  if (safe === h) {
    if (claimStatus === "watch_signal") safe = `Watch signal: ${h}`;
    else if (source) safe = `${h} — according to ${source}`;
    else safe = `Reportedly: ${h}`;
  }
  return safe;
}

function heuristicVerificationScore(c: any): { score: number; status: ClaimStatus; reason: string } {
  const claim: ClaimStatus = CLAIM_STATUSES.includes(c.claim_status) ? c.claim_status : "uncertain";
  const supporting: string[] = Array.isArray(c.supporting_source_urls) ? c.supporting_source_urls : [];
  const primary: string = c.primary_source_url || c.url || "";
  const allUrls = [primary, ...supporting].filter(Boolean);
  const hasOfficial = allUrls.some(isOfficialUrl);
  const tier1Count = allUrls.filter(isTier1Url).length;
  const totalSources = new Set(allUrls).size;
  // Bucket-aware source requirements.
  const bucket: string = c.bucket || c._bucket || "";
  const requiresOfficial = bucket === "market_regulatory";
  const requiresTier1OrOfficial =
    bucket === "capital_credit" || bucket === "market_regulatory";
  // Credible-source domains acceptable for softer buckets.
  const SOFT_OK_DOMAINS = [
    "inc.com","entrepreneur.com","forbes.com","fortune.com","techcrunch.com",
    "theinformation.com","hbr.org","pitchbook.com","crunchbase.com","axios.com",
  ];
  const hasSoftOk = allUrls.some(u => {
    try { const h = new URL(u).hostname.toLowerCase(); return SOFT_OK_DOMAINS.some(d => h.endsWith(d)); } catch { return false; }
  });

  let score = 50;
  if (claim === "confirmed") score += 20;
  else if (claim === "reported") score += 5;
  else if (claim === "watch_signal") score -= 5;
  else if (claim === "rumor") score -= 15;
  else if (claim === "uncertain") score -= 10;
  if (hasOfficial) score += 25;
  if (tier1Count >= 2) score += 15;
  else if (tier1Count === 1) score += 8;
  // Soft credibility boost for non-tier1 reputable sources in non-strict buckets.
  if (!requiresTier1OrOfficial && hasSoftOk && tier1Count === 0 && !hasOfficial) score += 10;
  if (totalSources >= 3) score += 5;
  if (Array.isArray(c.uncertainty_flags) && c.uncertainty_flags.length >= 2) score -= 10;
  if (Array.isArray(c.direct_numeric_facts) && c.direct_numeric_facts.length === 0) score -= 5;
  // Hard caps (bucket-aware).
  if (requiresOfficial && !hasOfficial) score = Math.min(score, 55);
  if (requiresTier1OrOfficial && !hasOfficial && tier1Count === 0) score = Math.min(score, 60);
  if (claim !== "confirmed" && !hasOfficial && tier1Count === 0 && !hasSoftOk) score = Math.min(score, 55);
  if (claim === "rumor") score = Math.min(score, 78);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const reason = `claim=${claim} official=${hasOfficial} tier1=${tier1Count} soft=${hasSoftOk} sources=${totalSources} bucket=${bucket}`;
  return { score, status: claim, reason };
}

async function callPerplexityVerify(apiKey: string, c: any): Promise<any | null> {
  const sys = `You are a fact-verification analyst. Given a candidate news claim, verify it against current public sources. Return STRICT JSON only.
Required JSON shape:
{
  "claim_status": "confirmed" | "reported" | "rumor" | "watch_signal" | "uncertain",
  "verification_summary": string (one sentence — what is actually supported),
  "primary_source_url": string,
  "supporting_source_urls": [string],
  "published_at": string (YYYY-MM-DD if known else ""),
  "direct_numeric_facts": [string] (facts exactly as supported by sources),
  "uncertainty_flags": [string] (e.g. "no official confirmation", "single source", "speculative", "outdated", "regulation not yet enforceable"),
  "safe_headline": string (rewrite of the headline using cautious language unless claim_status is "confirmed". Use phrases like "reportedly", "is weighing", "could", "signals", "according to [source]". Never upgrade speculation to fact. Never claim a Fed cut, regulation, or deal close unless confirmed by official source.)
}
Rules:
- Funding rounds NOT closed: "reported" with "is weighing"/"could raise"/"reportedly".
- Regulatory/legal actions: require an official .gov source for "confirmed"; otherwise cautious.
- Federal Reserve rate moves: require federalreserve.gov confirmation for "confirmed"; otherwise frame as expectations/signals.
- If sources only describe expectations or sentiment shifts, claim_status MUST NOT be "confirmed".`;
  const user = `Verify this candidate:
HEADLINE: ${c.headline}
SOURCE: ${c.source}
URL: ${c.url}
SUMMARY: ${c.summary}
NUMERIC FACTS CLAIMED: ${JSON.stringify(c.numeric_facts || [])}

Return strict JSON only.`;
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        temperature: 0.1,
        search_recency_filter: "week",
      }),
    });
    if (!res.ok) { console.warn(`[verify] perplexity http ${res.status}`); return null; }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return null;
    return JSON.parse(m[0]);
  } catch (err) {
    console.warn(`[verify] error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

type VerifyResult = {
  decision: "verified" | "rewritten" | "rejected";
  score: number;
  status: ClaimStatus;
  summary: string;
  originalHeadline: string;
  safeHeadline: string;
  uncertaintyFlags: string[];
  supportingUrls: string[];
  primaryUrl: string;
  reason: string;
  sponsorFlag: boolean;
  primarySourceReplaced: boolean;
  originalPrimarySourceUrl: string;
  finalPrimarySourceUrl: string;
  sponsorDecision: "allowed" | "replaced" | "rejected" | "none";
  finalSource: string;
};

async function verifyCandidate(apiKey: string, c: any): Promise<VerifyResult> {
  const original = c.headline || "";
  const v = await callPerplexityVerify(apiKey, c);
  // Merge model output into candidate for scoring.
  const merged: any = {
    ...c,
    claim_status: v?.claim_status || "uncertain",
    primary_source_url: v?.primary_source_url || c.url || "",
    supporting_source_urls: Array.isArray(v?.supporting_source_urls) ? v.supporting_source_urls : [],
    uncertainty_flags: Array.isArray(v?.uncertainty_flags) ? v.uncertainty_flags : [],
    direct_numeric_facts: Array.isArray(v?.direct_numeric_facts) ? v.direct_numeric_facts : (c.numeric_facts || []),
  };
  const { score, status, reason } = heuristicVerificationScore(merged);
  const summary = v?.verification_summary || "no verification summary";
  let safeHeadline = (v?.safe_headline || "").trim() || original;
  // If model returned headline but status non-confirmed and no caution words, force rewrite.
  if (status !== "confirmed" && !CAUTION_HINTS.test(safeHeadline)) {
    safeHeadline = applySafeHeadlineRewrite(original, status, c.source || "");
  }
  // Decision logic with relaxed fallback:
  // - confirmed + score >= 60: verified
  // - reported / watch_signal / uncertain + score >= 60 with at least one credible source: rewritten (safe)
  // - rumor: requires score >= 75 AND must be framed as watch_signal
  // - anything below 60: rejected
  // - single-source unverifiable below 60: rejected
  const supportingUrls: string[] = merged.supporting_source_urls || [];
  const primaryUrl: string = merged.primary_source_url || "";
  const totalSources = new Set([primaryUrl, ...supportingUrls].filter(Boolean)).size;

  // ── Sponsored-source safeguards ──────────────────────────────
  const originalPrimary = primaryUrl;
  let finalPrimary = primaryUrl;
  let finalSource = c.source || "";
  let sponsorFlag = false;
  let primarySourceReplaced = false;
  let sponsorDecision: VerifyResult["sponsorDecision"] = "none";
  const primaryIsSponsored = isSponsoredUrl(primaryUrl);
  const nonSponsoredSupport = supportingUrls.filter(u => u && !isSponsoredUrl(u));
  if (primaryIsSponsored) {
    sponsorFlag = true;
    if (nonSponsoredSupport.length === 0) {
      // Only sponsored support exists → reject outright.
      sponsorDecision = "rejected";
      console.log(`[founder-intel:SPONSOR_FILTER] topic=${c.topic_slug || c.headline} decision=rejected reason=sponsored_only_source`);
      return {
        decision: "rejected",
        score, status, summary,
        originalHeadline: original,
        safeHeadline,
        uncertaintyFlags: merged.uncertainty_flags,
        supportingUrls,
        primaryUrl,
        reason: `${reason} sponsored_only_source`,
        sponsorFlag: true,
        primarySourceReplaced: false,
        originalPrimarySourceUrl: originalPrimary,
        finalPrimarySourceUrl: originalPrimary,
        sponsorDecision: "rejected",
        finalSource,
      };
    }
    // Promote strongest non-sponsored supporting source.
    const ranked = [...nonSponsoredSupport].sort((a, b) => {
      const sa = (isOfficialUrl(a) ? 3 : 0) + (isTier1Url(a) ? 2 : 0);
      const sb = (isOfficialUrl(b) ? 3 : 0) + (isTier1Url(b) ? 2 : 0);
      return sb - sa;
    });
    finalPrimary = ranked[0];
    primarySourceReplaced = true;
    sponsorDecision = "replaced";
    const newName = hostnameToSourceName(finalPrimary);
    if (newName) finalSource = newName;
    console.log(`[founder-intel:SPONSOR_FILTER] topic=${c.topic_slug || c.headline} decision=replaced reason=primary_was_sponsored new_primary=${finalPrimary}`);
  }

  let decision: VerifyResult["decision"];
  let rejectReason = "";
  if (score < 60) {
    decision = "rejected";
    rejectReason = `score_below_60(${score})`;
  } else if (status === "rumor") {
    if (score >= 75) {
      decision = "rewritten";
      // Force watch-signal framing for rumors.
      if (!/^watch signal:/i.test(safeHeadline)) {
        safeHeadline = `Watch signal: ${safeHeadline.replace(/^reportedly:\s*/i, "")}`;
      }
    } else {
      decision = "rejected";
      rejectReason = `rumor_below_75(${score})`;
    }
  } else if (totalSources === 0) {
    decision = "rejected";
    rejectReason = "no_sources";
  } else if (status === "confirmed" && safeHeadline === original) {
    decision = "verified";
  } else {
    decision = "rewritten";
  }
  return {
    decision, score, status, summary,
    originalHeadline: original,
    safeHeadline,
    uncertaintyFlags: merged.uncertainty_flags,
    supportingUrls: merged.supporting_source_urls,
    primaryUrl: finalPrimary,
    reason: rejectReason ? `${reason} ${rejectReason}` : reason,
    sponsorFlag,
    primarySourceReplaced,
    originalPrimarySourceUrl: originalPrimary,
    finalPrimarySourceUrl: finalPrimary,
    sponsorDecision,
    finalSource,
  };
}

// ─── PHOENIX FIT GATE ────────────────────────────────────────────────

const PHOENIX_FIT_LANES = new Set([
  "capital_credit","business_credit","working_capital","sba_lending","invoice_factoring",
  "growth_capital","venture_funding","founder_strategy","market_risk","ai_operator_impact",
  "regulatory_capital_impact",
]);

// Lane → bucket affinity bonus (small lift when the model's lane matches the bucket)
const LANE_BUCKET_AFFINITY: Record<string, string[]> = {
  capital_credit: ["capital_credit","wildcard"],
  business_credit: ["capital_credit"],
  working_capital: ["capital_credit"],
  sba_lending: ["capital_credit","market_regulatory"],
  invoice_factoring: ["capital_credit"],
  growth_capital: ["capital_credit","funding_venture"],
  venture_funding: ["funding_venture"],
  founder_strategy: ["founder_strategy"],
  market_risk: ["market_regulatory","wildcard"],
  ai_operator_impact: ["ai_infrastructure"],
  regulatory_capital_impact: ["market_regulatory","capital_credit"],
};

const CAPITAL_KEYWORDS = /\b(capital|credit|loan|loans|lending|lender|borrow|borrowing|sba|factoring|invoice|cash[\s-]?flow|working capital|funding|funded|raise|raised|valuation|venture|debt|interest rate|rate cut|equity|payroll|line of credit|receivables|underwriting|covenant|refinanc)/i;
const OPERATOR_KEYWORDS = /\b(founder|operator|owner|small business|smb|mid[\s-]?market|main street|payroll|hiring|pricing|margin|unit economics|cost|costs|revenue|customer|gtm|inventory|supply chain|tariff|insurance|labor|wage)/i;
const GENERIC_RED_FLAGS = /\b(merger|acquired|acquires|acquisition|carbon|climate|esg|earnings beat|stock surge|share buyback|dividend|model release|benchmark|leaderboard|chip launch)\b/i;

function nonEmpty(s: any): boolean {
  return typeof s === "string" && s.trim().length >= 8 && !/^weak_fit$/i.test(s.trim());
}

function phoenixFitScore(c: any, verifyScore: number): { score: number; reason: string; lane: string } {
  const lane = (c.phoenix_fit_lane || "").toString().trim().toLowerCase();
  const fitReason = (c.phoenix_fit_reason || "").toString().trim();
  const capImpl = (c.capital_implication || "").toString().trim();
  const opImpl = (c.operator_implication || "").toString().trim();
  const blob = `${c.headline || ""} ${c.summary || ""} ${c.why_it_matters || ""} ${capImpl} ${opImpl}`;

  let score = 40;
  const reasons: string[] = [];

  // 1. Lane validity
  if (PHOENIX_FIT_LANES.has(lane)) {
    score += 15; reasons.push(`lane_ok(${lane})`);
    const affinity = LANE_BUCKET_AFFINITY[lane] || [];
    if (affinity.includes(c.bucket)) { score += 5; reasons.push("lane_bucket_affinity"); }
  } else {
    score -= 15; reasons.push("lane_missing_or_invalid");
  }

  // 2. Capital implication (concrete)
  if (nonEmpty(capImpl)) {
    score += 12; reasons.push("capital_impl_present");
    if (CAPITAL_KEYWORDS.test(capImpl)) { score += 5; reasons.push("capital_impl_concrete"); }
  } else {
    score -= 12; reasons.push("capital_impl_missing");
  }

  // 3. Operator implication (concrete)
  if (nonEmpty(opImpl)) {
    score += 10; reasons.push("operator_impl_present");
    if (OPERATOR_KEYWORDS.test(opImpl)) { score += 5; reasons.push("operator_impl_concrete"); }
  } else {
    score -= 10; reasons.push("operator_impl_missing");
  }

  // 4. Phoenix can add a useful POV — proxied by takeaway + relevance signals
  if (nonEmpty(c.founder_takeaway)) { score += 6; reasons.push("takeaway_present"); }
  if (c.capital_relevance === "high") { score += 8; reasons.push("self_capital_high"); }
  else if (c.capital_relevance === "medium") { score += 3; }
  if (c.founder_relevance === "high") { score += 6; reasons.push("self_founder_high"); }
  else if (c.founder_relevance === "medium") { score += 2; }

  // 5. Cross-text capital + operator signal
  if (CAPITAL_KEYWORDS.test(blob)) { score += 4; reasons.push("capital_kw"); }
  if (OPERATOR_KEYWORDS.test(blob)) { score += 4; reasons.push("operator_kw"); }

  // 6. Generic red flags (penalty unless capital implication is also concrete)
  if (GENERIC_RED_FLAGS.test(blob)) {
    if (CAPITAL_KEYWORDS.test(capImpl) && nonEmpty(capImpl)) {
      score -= 4; reasons.push("red_flag_offset_by_capital_impl");
    } else {
      score -= 22; reasons.push("generic_red_flag_no_capital_impl");
    }
  }

  // 7. Self-declared weak fit
  if (/weak_fit/i.test(fitReason)) { score -= 25; reasons.push("self_weak_fit"); }

  // 8. Bucket-specific hard checks
  if (c.bucket === "funding_venture") {
    // Reject "company X raised $Y" without a clear capital-market signal
    const sectorSignal = /\b(sector|valuation reset|down[\s-]?round|deal[\s-]?flow|investor pullback|series\s+[a-z]\s+median|fund (close|launch))/i;
    if (!sectorSignal.test(blob) && !sectorSignal.test(capImpl)) {
      score -= 8; reasons.push("funding_no_market_signal");
    }
  }
  if (c.bucket === "ai_infrastructure") {
    const opCost = /\b(cost|price|cheaper|expensive|margin|capex|opex|capital allocation|cash[\s-]?flow|funding)/i;
    if (!opCost.test(blob)) { score -= 12; reasons.push("ai_no_operator_cost"); }
  }
  if (c.bucket === "market_regulatory") {
    if (!OPERATOR_KEYWORDS.test(blob) && !CAPITAL_KEYWORDS.test(blob)) {
      score -= 10; reasons.push("regulatory_no_smb_or_capital_hook");
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score,
    reason: reasons.join(","),
    lane: PHOENIX_FIT_LANES.has(lane) ? lane : "unspecified",
  };
}

// Headlines that start with these prefixes are prompt-label leakage — reject/rewrite.
const BANNED_HEADLINE_PREFIXES = [
  "direct advice:", "plain-news clarity:", "founder takeaway:", "market signal:",
  "watch signal:", "here's what", "here is what", "what changed when",
];

const BANNED_PHRASES = [
  "navigating", "landscape", "in today's market", "game changer", "delve",
  "underscore", "crucial", "robust", "rapidly evolving", "unlocking opportunities",
  "smart operators", "your move", "missing", "quietly", "stop waiting",
  "the real opening",
];

function stripBannedPrefixes(headline: string): string {
  let h = (headline || "").trim();
  const lower = h.toLowerCase();
  for (const p of BANNED_HEADLINE_PREFIXES) {
    if (lower.startsWith(p)) {
      h = h.slice(p.length).replace(/^[\s:—-]+/, "").trim();
      // Capitalize first char.
      if (h.length) h = h[0].toUpperCase() + h.slice(1);
      return h;
    }
  }
  return h;
}

function containsBannedPhrase(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const p of BANNED_PHRASES) {
    if (lower.includes(p)) return p;
  }
  return null;
}

function normalizeTopicSlug(c: any): string {
  const seed = (c.topic_slug || c.headline || "").toLowerCase();
  // Cheap normalization: keep alpha, collapse, take first 4 meaningful tokens.
  const tokens = seed.replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(t =>
    t.length > 2 && !["the","and","for","with","from","this","that","into","over","just"].includes(t)
  );
  return tokens.slice(0, 4).join("-") || "untagged";
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const uni = a.size + b.size - inter;
  return uni === 0 ? 0 : inter / uni;
}

function tokenSet(s: string): Set<string> {
  return new Set(
    (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)
      .filter(t => t.length > 3)
  );
}

function scoreCandidate(c: any, recentSlugs: Set<string>, recentTokens: Set<string>[]): number {
  let score = 50;
  if (c.numeric_facts && Array.isArray(c.numeric_facts) && c.numeric_facts.length > 0) score += 15;
  if (c.url && /https?:\/\//.test(c.url)) score += 5;
  if (c.capital_relevance === "high") score += 12;
  else if (c.capital_relevance === "medium") score += 6;
  if (c.founder_relevance === "high") score += 10;
  else if (c.founder_relevance === "medium") score += 5;
  // Novelty
  const slug = normalizeTopicSlug(c);
  if (recentSlugs.has(slug)) score -= 30;
  const ts = tokenSet(`${c.headline} ${c.summary}`);
  let maxOverlap = 0;
  for (const r of recentTokens) {
    const j = jaccard(ts, r);
    if (j > maxOverlap) maxOverlap = j;
  }
  if (maxOverlap > 0.5) score -= 25;
  else if (maxOverlap > 0.35) score -= 12;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function callPerplexityForBucket(
  apiKey: string,
  bucket: string,
  recentHeadlines: string[],
): Promise<any | null> {
  const cfg = BUCKET_PROMPTS[bucket];
  if (!cfg) return null;
  const recentBlock = recentHeadlines.length
    ? `Recent headlines we have ALREADY published in the past 14 days — pick something genuinely DIFFERENT (different company, different angle, different concrete event):\n${recentHeadlines.slice(0, 25).map(h => `- ${h}`).join("\n")}`
    : "";
  const sys = `You are a market intelligence analyst at Phoenix Venture Studios. Return ONE candidate news item as strict JSON only. No prose, no markdown.
DEFAULT BEHAVIOR: Return the strongest credible source-backed candidate available from the allowed domains for this bucket. If the story is reported or uncertain, set claim_status appropriately ("reported", "watch_signal", or "uncertain") and use cautious hedged language in the headline. Returning a credible reported/uncertain candidate is PREFERRED over returning null.

You may return { "candidate": null, "reason": "..." } ONLY when ALL of the following are true:
  (a) no credible story from the allowed domains exists in the past 7 days, OR
  (b) the available stories have no clear founder/operator/capital implication, OR
  (c) numeric facts in the available stories cannot be supported by the cited source.
Do NOT use null as a default. Do NOT use null just because the source is not official/tier-1 — verification later will enforce strictness.

Required JSON shape (when a candidate exists):
{
  "headline": string (human, founder-facing, no prompt labels, no "Direct advice:" prefixes),
  "source": string (publication name only),
  "url": string,
  "primary_source_url": string (the most authoritative URL backing this claim — official .gov, company announcement, SEC filing, or tier-1 reporting),
  "supporting_source_urls": [string] (1-3 additional URLs that independently corroborate the claim),
  "direct_numeric_facts": [string] (numbers/dates/names DIRECTLY supported by the source — do NOT invent or estimate; if no numeric fact is directly supported, return an empty array),
  "published_at": string (ISO date of the source article, best-effort),
  "claim_status": "confirmed" | "reported" | "rumor" | "watch_signal" | "uncertain",
  "verification_summary": string (one sentence: what the primary source actually says — quoting/paraphrasing the source, not your interpretation),
  "uncertainty_flags": [string] (e.g. ["unconfirmed_amount","single_source","forward_looking","expectation_not_action"]; empty array if none),
  "summary": string (one sentence, plain English, no source name in body),
  "topic_slug": string (kebab-case, 2-4 words, e.g. "sba-loan-cap"),
  "angle_label": string (one of: capital_readiness, regulatory_shift, funding_signal, operator_lesson, market_movement, infra_shift),
  "numeric_facts": [string] (concrete numbers, names, dates),
  "founder_relevance": "high"|"medium"|"low",
  "capital_relevance": "high"|"medium"|"low",
  "why_it_matters": string,
  "founder_takeaway": string (one short actionable sentence),
  "phoenix_fit_lane": string (one of: capital_credit, business_credit, working_capital, sba_lending, invoice_factoring, growth_capital, venture_funding, founder_strategy, market_risk, ai_operator_impact, regulatory_capital_impact),
  "phoenix_fit_reason": string (one sentence: why this fits a Phoenix lane, or "weak_fit" if it does not),
  "capital_implication": string (one sentence: concrete capital, credit, cash-flow, or funding implication for founders/operators — NOT generic),
  "operator_implication": string (one sentence: concrete operator/SMB decision or cost impact — NOT generic)
}

SOURCE-BACKED DISCOVERY RULES (HARD):
1. Every claim MUST be backed by a primary_source_url from the allowed domains that you can quote. If you cannot ground the claim, return null.
2. NO INVENTED NUMBERS. Every entry in direct_numeric_facts MUST be directly supported by the cited source. If no number is directly supported, return an empty array — DO NOT invent specificity.
3. NO RUMOR/CHATTER. Do not surface social-media speculation, anonymous tips, or aggregator gossip.
4. NO EXPECTATION-TO-ACTION CONVERSION. "Markets expect rate cuts" must NEVER become "Fed cuts rates". Forward-looking claims MUST set claim_status to "watch_signal" or "uncertain" AND use hedged headline language ("reportedly", "in talks", "is weighing", "could", "expected to", "proposed").
5. NO LEGAL / RATE / REGULATORY CERTAINTY UNLESS SUPPORTED. Rate cuts, IRS deadlines, DOL thresholds, FTC/SEC/SBA/Fed/Treasury enacted actions, court rulings, or signed legislation MUST be backed by an official .gov source OR tier-1 reporting (Reuters, Bloomberg, WSJ, FT). If only pending/proposed coverage exists, downgrade to "watch_signal" with hedged language instead of returning null.
6. Bucket-specific source rules already constrain the allowed domains for this bucket — trust them. Do NOT add an extra "must be tier-1" filter on top.
7. NO SPONSORED / ADVERTORIAL / PARTNER / NATIVE-AD / PAID-CONTENT pages as the primary_source_url. This includes URLs containing /sponsor/, /sponsored/, /brand-studio/, /partner-content/, /paid-content/, /advertorial/, /native-ad/, /promoted/, /branded-content/, /brandvoice/, or query strings like sponsored=true or utm_medium=sponsored. If a sponsored page surfaces a useful trend, FIND AN INDEPENDENT non-sponsored source (editorial reporting, .gov filing, company release) and use THAT as primary_source_url. If no independent non-sponsored source corroborates the claim, return { "candidate": null, "reason": "only_sponsored_coverage" }.

BANNED HEADLINE PREFIXES: "Direct advice:", "Plain-news clarity:", "Founder takeaway:", "Market signal:", "Watch signal:", "Here's what", "What changed when".
BANNED PHRASES: navigating, landscape, in today's market, game changer, delve, underscore, crucial, robust, rapidly evolving, unlocking opportunities, smart operators, your move, missing, quietly, stop waiting, the real opening.
At most ONE em-dash in the headline.

PHOENIX FIT REQUIREMENT: Every story MUST have an obvious founder/operator/capital implication. Phoenix Venture Studios serves founders, operators, and small/mid-business owners on capital strategy, business credit, working capital, SBA, invoice factoring, growth capital, and venture funding. Reject (return weak_fit) for: generic enterprise M&A without founder/capital angle; climate/AI infrastructure stories without explicit operator cost or capital allocation impact; venture rounds without a clear capital-market signal; regulatory stories without a clear founder/operator implication.`;
  const user = `BUCKET: ${bucket}
TASK: ${cfg.query}

${recentBlock}

Return strict JSON only.`;
  try {
    const res = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: cfg.model,
        messages: [{ role: "system", content: sys }, { role: "user", content: user }],
        temperature: 0.4,
        search_recency_filter: "week",
        search_domain_filter: cfg.domains,
      }),
    });
    if (!res.ok) {
      console.warn(`[radar:${bucket}] perplexity http ${res.status}`);
      return null;
    }
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "";
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const parsed = JSON.parse(m[0]);
    // Handle explicit null-candidate contract: { candidate: null, reason: "..." }
    if (parsed && Object.prototype.hasOwnProperty.call(parsed, "candidate") && parsed.candidate === null) {
      return { _bucket: bucket, _nullCandidate: true, _nullReason: String(parsed.reason || "no_high_confidence_source_backed_story") };
    }
    if (!parsed.headline) {
      return { _bucket: bucket, _nullCandidate: true, _nullReason: "missing_headline" };
    }
    parsed._bucket = bucket;
    return parsed;
  } catch (err) {
    console.warn(`[radar:${bucket}] error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

type Candidate = any;
type Decision = { candidate: Candidate; decision: "selected" | "skipped"; reason: string; score: number; topic: string; angle: string };

type ScoredCandidate = {
  c: Candidate;
  score: number;
  topic: string;
  angle: string;
};

/**
 * Pre-verification triage: score, editorial cleanup, basic floor.
 * Returns ranked candidates eligible for verification + early skips.
 */
function preVerifyTriage(
  candidates: Candidate[],
  recentSlugs: Set<string>,
  recentTokens: Set<string>[],
): {
  ranked: ScoredCandidate[];
  earlySkips: Decision[];
  clusters: Array<{ topic: string; size: number; headlines: string[] }>;
} {
  const earlySkips: Decision[] = [];
  const ranked: ScoredCandidate[] = [];
  for (const c of candidates) {
    const topic = normalizeTopicSlug(c);
    const angle = c.angle_label || "unspecified";
    const ev = validateEditorial(c);
    const score = scoreCandidate(c, recentSlugs, recentTokens);
    if (!ev.ok) {
      earlySkips.push({ candidate: c, decision: "skipped", reason: ev.reason, score, topic, angle });
      continue;
    }
    if (score < 40) {
      earlySkips.push({ candidate: c, decision: "skipped", reason: "low_score", score, topic, angle });
      continue;
    }
    if (recentSlugs.has(topic)) {
      earlySkips.push({ candidate: c, decision: "skipped", reason: "duplicate_topic_recent", score, topic, angle });
      continue;
    }
    ranked.push({ c, score, topic, angle });
  }
  ranked.sort((a, b) => b.score - a.score);
  // Cluster snapshot (informational only).
  const clustersMap = new Map<string, ScoredCandidate[]>();
  for (const s of ranked) {
    const arr = clustersMap.get(s.topic) ?? [];
    arr.push(s);
    clustersMap.set(s.topic, arr);
  }
  const clusters = Array.from(clustersMap.entries()).map(([topic, items]) => ({
    topic, size: items.length, headlines: items.map(i => i.c.headline),
  }));
  return { ranked, earlySkips, clusters };
}

type PhoenixFit = { score: number; reason: string; lane: string };

// ─── HEADLINE TIGHTENER ──────────────────────────────────────────────
/**
 * Final headline shaping after verification + fit. Preserves verified/cautious
 * language and core numbers; trims source-name suffixes, prompt labels, and
 * redundant attribution. Soft target: 90 chars. Hard cap: 120 chars.
 */
function tightenHeadline(input: string, sourceName: string): string {
  let h = (input || "").trim();
  if (!h) return h;
  // Strip prompt-label prefixes like "Direct advice:", "Headline:", "Signal:".
  h = h.replace(/^(direct advice|headline|signal|news|update)\s*:\s*/i, "");
  // Drop "  : Fortune" / " — Fortune" / " - Fortune" suffixes.
  if (sourceName) {
    const re = new RegExp(`\\s*[:\\-–—]\\s*${sourceName.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\s*$`, "i");
    h = h.replace(re, "");
  }
  // Generic trailing "per sources" if "reportedly" already present.
  if (/reportedly/i.test(h)) {
    h = h.replace(/,?\s*per sources\.?$/i, "");
    h = h.replace(/,?\s*according to sources\.?$/i, "");
  }
  // Collapse whitespace.
  h = h.replace(/\s+/g, " ").trim();
  // Hard cap at 120 chars: trim to last natural break before cap.
  if (h.length > 120) {
    const cut = h.slice(0, 120);
    const lastBreak = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("; "), cut.lastIndexOf(", "), cut.lastIndexOf(" "));
    h = (lastBreak > 60 ? cut.slice(0, lastBreak) : cut).replace(/[,;:\-–—\s]+$/, "");
    if (!/[.!?]$/.test(h)) h = h + ".";
  }
  return h;
}

// ─── DAILY PUBLISH CAP ───────────────────────────────────────────────
const DAILY_PUBLISH_CAP = 6;
// Short-term cutover: ignore legacy/test rows from earlier today so the
// cap reflects only radar-controlled publishes. Pick the timestamp just
// before the first radar-controlled publish/test window.
const RADAR_CUTOVER_AT = "2026-05-04T13:20:00.000Z";
const RADAR_ENGINE_VERSION = "radar-v1.observability-1";

async function getDailyPublishCount(sb: any): Promise<{ count: number; capStart: string; cutoverAt: string }> {
  const startOfUtcDay = new Date();
  startOfUtcDay.setUTCHours(0, 0, 0, 0);
  const cutover = new Date(RADAR_CUTOVER_AT);
  const capStartDate = startOfUtcDay.getTime() > cutover.getTime() ? startOfUtcDay : cutover;
  const capStart = capStartDate.toISOString();
  const { count } = await sb
    .from("intelligence_entries")
    .select("id", { count: "exact", head: true })
    .gte("created_at", capStart);
  const n = typeof count === "number" ? count : 0;
  const remaining = Math.max(0, DAILY_PUBLISH_CAP - n);
  console.log(`[founder-intel:CAP] capStart=${capStart} cutoverAt=${RADAR_CUTOVER_AT} publishedToday=${n} remainingSlots=${remaining}`);
  return { count: n, capStart, cutoverAt: RADAR_CUTOVER_AT };
}

/**
 * Post-verification + post-fit final selection: combined ranking (radar 0.35 +
 * verify 0.30 + fit 0.35), clustering, repeated_angle (scoped to topic),
 * source cap, and Phoenix Fit thresholds (>=80 strong, 65-79 acceptable, <65 reject).
 */
function pickFinalSet(
  pool: Array<{ scored: ScoredCandidate; verify: VerifyResult; fit: PhoenixFit }>,
  limit: number,
): { selected: Decision[]; skipped: Decision[] } {
  // Combined rank: radar*0.35 + verify*0.30 + fit*0.35
  const combined = (x: { scored: ScoredCandidate; verify: VerifyResult; fit: PhoenixFit }) =>
    x.scored.score * 0.35 + x.verify.score * 0.30 + x.fit.score * 0.35;
  const sorted = [...pool].sort((a, b) => combined(b) - combined(a));
  const selected: Decision[] = [];
  const skipped: Decision[] = [];
  const seenTopics = new Set<string>();
  // Track angle usage scoped to topic_slug (not global).
  const topicAngles = new Map<string, Set<string>>();
  const sourceCounts = new Map<string, number>();

  for (const item of sorted) {
    const { scored, verify, fit } = item;
    const c = scored.c;
    const topic = scored.topic;
    const angle = scored.angle;
    const src = (c.source || "").toLowerCase();
    // Hard fit floor: <65 cannot publish under any circumstance.
    if (fit.score < 65) {
      skipped.push({ candidate: c, decision: "skipped", reason: `phoenix_fit_below_65(${fit.score})`, score: scored.score, topic, angle });
      continue;
    }
    if (selected.length >= limit) {
      skipped.push({ candidate: c, decision: "skipped", reason: "limit_reached", score: scored.score, topic, angle });
      continue;
    }
    if (seenTopics.has(topic)) {
      skipped.push({ candidate: c, decision: "skipped", reason: "topic_cap", score: scored.score, topic, angle });
      continue;
    }
    // repeated_angle is scoped to topic — only reject if same angle reused inside same cluster.
    const angles = topicAngles.get(topic);
    if (angles && angles.has(angle)) {
      skipped.push({ candidate: c, decision: "skipped", reason: "repeated_angle_in_topic", score: scored.score, topic, angle });
      continue;
    }
    if ((sourceCounts.get(src) ?? 0) >= 2) {
      skipped.push({ candidate: c, decision: "skipped", reason: "source_cap", score: scored.score, topic, angle });
      continue;
    }
    selected.push({
      candidate: c,
      decision: "selected",
      reason: `${verify.decision === "verified" ? "selected_verified" : "selected_safe_rewrite"}|fit_${fit.score}${fit.score >= 80 ? "_strong" : "_acceptable"}`,
      score: scored.score, topic, angle,
    });
    seenTopics.add(topic);
    const set = topicAngles.get(topic) ?? new Set<string>();
    set.add(angle);
    topicAngles.set(topic, set);
    sourceCounts.set(src, (sourceCounts.get(src) ?? 0) + 1);
  }
  return { selected, skipped };
}

function validateEditorial(c: Candidate): { ok: boolean; reason: string } {
  const headline = (c.headline || "").trim();
  if (!headline) return { ok: false, reason: "rewrite_failed" };
  const cleaned = stripBannedPrefixes(headline);
  if (cleaned !== headline) c.headline = cleaned;
  const banned = containsBannedPhrase(c.headline) || containsBannedPhrase(c.summary || "");
  if (banned) return { ok: false, reason: `style_failed:${banned}` };
  if (!c.numeric_facts || !Array.isArray(c.numeric_facts) || c.numeric_facts.length === 0) {
    return { ok: false, reason: "no_numeric_fact" };
  }
  return { ok: true, reason: "ok" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const PERPLEXITY_API_KEY = Deno.env.get("PERPLEXITY_API_KEY");
  if (!PERPLEXITY_API_KEY) {
    return new Response(JSON.stringify({ error: "PERPLEXITY_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  // ── Body parsing ─────────────────────────────────────────────────
  let body: any = {};
  try {
    if (req.method === "POST") {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw);
    }
  } catch {
    body = {};
  }
  const dryRun: boolean = body.dryRun === false ? false : true; // default TRUE
  const mode: string = ["normal","moderate","hot","auto"].includes(body.mode) ? body.mode : "auto";
  const reqLimit = Number.isFinite(body.limit) ? Math.floor(body.limit) : 5;
  const limit = Math.max(1, Math.min(10, reqLimit));
  const manualOverride: boolean = body.manualOverride === true;
  const buckets: string[] = Array.isArray(body.buckets) && body.buckets.length > 0
    ? body.buckets.filter((b: any) => typeof b === "string" && BUCKET_PROMPTS[b])
    : DEFAULT_BUCKETS;

  // ── Cost-control body params (subset 1) ──────────────────────────
  const simulateCandidates: boolean = body.simulateCandidates === true && dryRun;
  const costMode: "cheap" | "standard" | "deep" =
    ["cheap","standard","deep"].includes(body.costMode) ? body.costMode : "standard";
  const VERIFY_HARD_MAX = 8;
  const reqMaxVerify = Number.isFinite(body.maxVerificationCalls)
    ? Math.floor(body.maxVerificationCalls)
    : 5;
  const maxVerificationCalls = Math.max(0, Math.min(VERIFY_HARD_MAX, reqMaxVerify));
  const requestedImageMode = ["none","source_only","generate_if_needed"].includes(body.imageMode)
    ? body.imageMode : null;
  // dryRun forces "none" (per spec). Live default = "generate_if_needed".
  const imageMode: "none" | "source_only" | "generate_if_needed" =
    dryRun ? "none" : (requestedImageMode || "generate_if_needed");

  // Cost accumulator (mutated as we run).
  const cost = {
    costMode,
    imageMode,
    perplexityCallsPlanned: 0,
    perplexityCallsMade: 0,
    sonarCalls: 0,
    sonarProCalls: 0,
    verificationCalls: 0,
    openaiImageCallsPlanned: 0,
    openaiImageCallsMade: 0,
    legacyGatewayCalls: 0,
    estimatedSpendTier: "none" as "none" | "low" | "medium" | "high",
    skippedForCost: [] as string[],
  };
  function finalizeCost() {
    const n = cost.perplexityCallsMade + cost.openaiImageCallsMade + cost.legacyGatewayCalls;
    cost.estimatedSpendTier = n === 0 ? "none" : n <= 5 ? "low" : n <= 10 ? "medium" : "high";
    console.log(
      `[founder-intel:COST] costMode=${cost.costMode} imageMode=${cost.imageMode} buckets=${buckets.length} ` +
      `sonar=${cost.sonarCalls} sonarPro=${cost.sonarProCalls} verification=${cost.verificationCalls} ` +
      `openaiImages=${cost.openaiImageCallsMade} legacyGateway=${cost.legacyGatewayCalls} estimated=${cost.estimatedSpendTier}` +
      (cost.skippedForCost.length ? ` skippedForCost=${cost.skippedForCost.join(",")}` : "")
    );
    return cost;
  }

  // ── SIMULATION MODE: zero external calls, returns canned candidates ──
  if (simulateCandidates) {
    return await runSimulation({
      sb, limit, mode, buckets, costSnapshot: cost, finalizeCost,
    });
  }

  try {
    // ── Anti-repetition: last 14 days ────────────────────────────
    const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentRows } = await sb
      .from("intelligence_entries")
      .select("headline, slug, summary, source_url, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    const recentEntries = recentRows || [];
    const recentHeadlines = recentEntries.map((r: any) => r.headline).filter(Boolean);
    const recentSlugs = new Set<string>(
      recentEntries.map((r: any) => normalizeTopicSlug({ topic_slug: "", headline: r.headline }))
    );
    const recentTokens = recentEntries.map((r: any) => tokenSet(`${r.headline} ${r.summary || ""}`));
    const recentUrls = new Set<string>(recentEntries.map((r: any) => (r.source_url || "").trim()).filter(Boolean));
    const recentSlugSet = new Set<string>(recentEntries.map((r: any) => (r.slug || "").trim()).filter(Boolean));

    function checkDuplicate(c: any, safeHeadline: string): {
      passed: boolean; reason: string | null;
      matchedSlug: string | null; matchedHeadline: string | null;
    } {
      const url = (c.url || "").trim();
      if (url && recentUrls.has(url)) {
        const m = recentEntries.find((r: any) => (r.source_url || "").trim() === url);
        return { passed: false, reason: "same_source_url_in_14d", matchedSlug: m?.slug || null, matchedHeadline: m?.headline || null };
      }
      const candidateSlug = slugify(safeHeadline || c.headline || "");
      if (candidateSlug && recentSlugSet.has(candidateSlug)) {
        const m = recentEntries.find((r: any) => r.slug === candidateSlug);
        return { passed: false, reason: "same_slug_in_14d", matchedSlug: candidateSlug, matchedHeadline: m?.headline || null };
      }
      const ts = tokenSet(`${safeHeadline || c.headline || ""} ${c.summary || ""}`);
      let bestJ = 0; let bestIdx = -1;
      for (let i = 0; i < recentTokens.length; i++) {
        const j = jaccard(ts, recentTokens[i]);
        if (j > bestJ) { bestJ = j; bestIdx = i; }
      }
      if (bestJ >= 0.55) {
        const m = bestIdx >= 0 ? recentEntries[bestIdx] : null;
        return { passed: false, reason: `near_duplicate_topic_jaccard_${bestJ.toFixed(2)}`, matchedSlug: m?.slug || null, matchedHeadline: m?.headline || null };
      }
      return { passed: true, reason: null, matchedSlug: null, matchedHeadline: null };
    }

    const dailyCountInfo = await getDailyPublishCount(sb);
    const dailyCount = dailyCountInfo.count;
    const remainingDailySlots = manualOverride ? Number.MAX_SAFE_INTEGER : Math.max(0, DAILY_PUBLISH_CAP - dailyCount);
    const effectiveLimit = manualOverride ? limit : Math.min(limit, remainingDailySlots);

    // ── Multi-bucket Perplexity calls (parallel) ─────────────────
    cost.perplexityCallsPlanned += buckets.length;
    const bucketResults = await Promise.all(
      buckets.map(b => {
        cost.perplexityCallsMade += 1;
        const m = BUCKET_PROMPTS[b]?.model;
        if (m === "sonar-pro") cost.sonarProCalls += 1; else cost.sonarCalls += 1;
        return callPerplexityForBucket(PERPLEXITY_API_KEY, b, recentHeadlines);
      })
    );
    const candidates: Candidate[] = [];
    const nullBucketResults: Array<{ bucket: string; reason: string }> = [];
    for (let i = 0; i < bucketResults.length; i++) {
      const c = bucketResults[i];
      if (c && (c as any)._nullCandidate) {
        nullBucketResults.push({ bucket: buckets[i], reason: (c as any)._nullReason || "null" });
        console.log(`[founder-intel:RADAR_NULL] bucket=${buckets[i]} reason=${(c as any)._nullReason}`);
        continue;
      }
      if (c && c.headline) {
        c.bucket = buckets[i];
        candidates.push(c);
      }
    }

    // ── Pre-verification triage (editorial + score floor + dup-topic) ────
    const { ranked, earlySkips, clusters } = preVerifyTriage(candidates, recentSlugs, recentTokens);

    // ── Verification cap (cost control) ──────────────────────────
    const verifyEligible = ranked.slice(0, maxVerificationCalls);
    const verifyCapSkipped = ranked.slice(maxVerificationCalls);
    if (verifyCapSkipped.length > 0) {
      cost.skippedForCost.push(`verification_cap_hit:${verifyCapSkipped.length}`);
      for (const s of verifyCapSkipped) {
        console.log(
          `[founder-intel:COST_SKIP] reason=verification_cap_hit topic=${s.topic} score=${s.score} ` +
          `bucket=${s.c.bucket} cap=${maxVerificationCalls}`
        );
      }
    }
    cost.perplexityCallsPlanned += verifyEligible.length;
    cost.verificationCalls = verifyEligible.length;
    cost.perplexityCallsMade += verifyEligible.length;
    cost.sonarProCalls += verifyEligible.length; // verifyCandidate uses sonar-pro

    // ── Verification gate (run on ALL ranked candidates, BEFORE clustering/angle/source-cap) ──
    const verifyResults = await Promise.all(
      verifyEligible.map(s => verifyCandidate(PERPLEXITY_API_KEY, s.c))
    );
    // Skipped-for-cost candidates: convert into Decision skips so they appear in reports.
    const verifyCapDecisions: Decision[] = verifyCapSkipped.map(s => ({
      candidate: s.c, decision: "skipped",
      reason: `verification_cap_hit(${maxVerificationCalls})`,
      score: s.score, topic: s.topic, angle: s.angle,
    }));
    const verifyByCandidate = new Map<Candidate, VerifyResult>();
    const fitByCandidate = new Map<Candidate, PhoenixFit>();
    const verifiedPool: Array<{ scored: ScoredCandidate; verify: VerifyResult; fit: PhoenixFit }> = [];
    const verifyRejected: Decision[] = [];
    for (let i = 0; i < verifyEligible.length; i++) {
      const s = verifyEligible[i];
      const v = verifyResults[i];
      verifyByCandidate.set(s.c, v);
      console.log(
        `[founder-intel:VERIFY] topic=${s.topic} bucket=${s.c.bucket} score=${v.score} ` +
        `claim_status=${v.status} decision=${v.decision} reason=${v.reason}`
      );
      if (v.decision === "rejected") {
        verifyRejected.push({
          candidate: s.c, decision: "skipped",
          reason: `verification_failed:${v.status}:${v.score}`,
          score: s.score, topic: s.topic, angle: s.angle,
        });
        continue;
      }
      // Apply safe headline rewrite to candidate.
      if (v.safeHeadline && v.safeHeadline !== s.c.headline) {
        s.c.headline = v.safeHeadline;
      }
      // Apply sponsored-source replacement to candidate so downstream
      // upsert uses the non-sponsored URL/source.
      if (v.primarySourceReplaced && v.finalPrimarySourceUrl) {
        s.c.url = v.finalPrimarySourceUrl;
        if (v.finalSource) s.c.source = v.finalSource;
      }
      // ── Phoenix Fit Gate (after verification, before final selection) ──
      const fit = phoenixFitScore(s.c, v.score);
      fitByCandidate.set(s.c, fit);
      console.log(
        `[founder-intel:FIT] topic=${s.topic} bucket=${s.c.bucket} lane=${fit.lane} ` +
        `fit_score=${fit.score} reason=${fit.reason}`
      );
      verifiedPool.push({ scored: s, verify: v, fit });
    }

    // ── Final selection from verified pool (with replacement) ────
    const { selected: preDupSelected, skipped: finalSkips } = pickFinalSet(verifiedPool, limit);

    // Duplicate gate (last 14 days) on selected candidates.
    const dupSkips: Decision[] = [];
    const dupResultsByCandidate = new Map<Candidate, ReturnType<typeof checkDuplicate>>();
    const postDupSelected: Decision[] = [];
    for (const d of preDupSelected) {
      const dup = checkDuplicate(d.candidate, d.candidate.headline);
      dupResultsByCandidate.set(d.candidate, dup);
      if (!dup.passed) {
        dupSkips.push({ ...d, decision: "skipped", reason: `duplicate_check_failed:${dup.reason}` });
      } else {
        postDupSelected.push(d);
      }
    }

    // Apply daily publish cap.
    const capSkips: Decision[] = [];
    let selectedDecisions: Decision[] = postDupSelected;
    if (!manualOverride && selectedDecisions.length > effectiveLimit) {
      const overflow = selectedDecisions.slice(effectiveLimit);
      selectedDecisions = selectedDecisions.slice(0, effectiveLimit);
      for (const d of overflow) {
        capSkips.push({ ...d, decision: "skipped", reason: `daily_cap_reached(${DAILY_PUBLISH_CAP})` });
      }
    }

    // Final headline tightening.
    const tightenedByCandidate = new Map<Candidate, { before: string; after: string }>();
    for (const d of selectedDecisions) {
      const before = d.candidate.headline || "";
      const after = tightenHeadline(before, d.candidate.source || "");
      tightenedByCandidate.set(d.candidate, { before, after });
      d.candidate.headline = after;
    }

    const skippedDecisions: Decision[] = [...earlySkips, ...verifyRejected, ...verifyCapDecisions, ...finalSkips, ...dupSkips, ...capSkips];

    // ─── REJECTION OBSERVABILITY HELPERS ───────────────────────────
    function rejectedStageFor(reason: string): string {
      // verification_cap_hit means the candidate was skipped BEFORE verifyCandidate
      // ran due to maxVerificationCalls — this is a cost cap, not a verification failure.
      if (reason.startsWith("verification_cap_hit")) return "cost_cap";
      if (reason.startsWith("verification_failed")) return "verification";
      if (reason.startsWith("phoenix_fit_below_65")) return "phoenix_fit";
      if (reason.startsWith("duplicate_check_failed") || reason === "duplicate_topic_recent" || reason === "topic_cap" || reason === "repeated_angle_in_topic") return "duplicate";
      if (reason.startsWith("daily_cap_reached")) return "daily_cap";
      if (reason === "limit_reached" || reason === "source_cap") return "cost_cap";
      return "editorial";
    }
    const rejectedCandidates = skippedDecisions.map(d => {
      const v = verifyByCandidate.get(d.candidate) || null;
      const f = fitByCandidate.get(d.candidate) || null;
      const supportingUrls = v?.supportingUrls ?? [];
      const primaryUrl = (v as any)?.primaryUrl || d.candidate.url || "";
      const sourceCount = new Set([primaryUrl, ...supportingUrls].filter(Boolean)).size;
      return {
        headline: d.candidate.headline,
        bucket: d.candidate.bucket,
        source: d.candidate.source,
        url: d.candidate.url,
        radar_score: d.score,
        verification_score: v?.score ?? null,
        claim_status: v?.status ?? null,
        verification_reason: v?.reason ?? null,
        verification_summary: v?.summary ?? null,
        uncertainty_flags: v?.uncertaintyFlags ?? [],
        source_count: sourceCount,
        supporting_source_urls: supportingUrls,
        phoenix_fit_score: f?.score ?? null,
        rejected_stage: rejectedStageFor(d.reason),
        rejected_reason: d.reason,
        sponsor_flag: v?.sponsorFlag ?? false,
        primary_source_replaced: v?.primarySourceReplaced ?? false,
        original_primary_source_url: v?.originalPrimarySourceUrl ?? null,
        final_primary_source_url: v?.finalPrimarySourceUrl ?? null,
        sponsor_decision: v?.sponsorDecision ?? "none",
      };
    });

    // ─── BUCKET DIAGNOSTICS ────────────────────────────────────────
    const bucketDiagnostics = buckets.map(bucket => {
      const candInBucket = candidates.filter(c => c.bucket === bucket);
      const nullEntry = nullBucketResults.find(n => n.bucket === bucket);
      const candidateReturned = candInBucket.length > 0;
      const firstCand: any = candInBucket[0] || null;
      const primarySourceUrl: string | null = firstCand?.primary_source_url || firstCand?.url || null;
      const supportingSources: string[] = Array.isArray(firstCand?.supporting_source_urls) ? firstCand.supporting_source_urls : [];
      const sourceBacked = !!(primarySourceUrl && (isOfficialUrl(primarySourceUrl) || isTier1Url(primarySourceUrl) || supportingSources.length > 0));
      const verifiedInBucket = Array.from(verifyByCandidate.entries())
        .filter(([c]) => c.bucket === bucket);
      const rejVerify = verifiedInBucket.filter(([, v]) => v.decision === "rejected").length;
      const rejFit = finalSkips.filter(d => d.candidate.bucket === bucket && d.reason.startsWith("phoenix_fit_below_65")).length;
      const selectedInBucket = selectedDecisions.filter(d => d.candidate.bucket === bucket).length;
      const reasons = skippedDecisions.filter(d => d.candidate.bucket === bucket).map(d => d.reason.split(":")[0].split("(")[0]);
      const reasonCounts = new Map<string, number>();
      reasons.forEach(r => reasonCounts.set(r, (reasonCounts.get(r) ?? 0) + 1));
      const topRejectReason = Array.from(reasonCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
      const verifScores = verifiedInBucket.map(([, v]) => v.score).filter(n => Number.isFinite(n));
      const fitScores = Array.from(fitByCandidate.entries())
        .filter(([c]) => c.bucket === bucket)
        .map(([, f]) => f.score)
        .filter(n => Number.isFinite(n));
      const avg = (xs: number[]) => xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null;
      return {
        bucket,
        model: BUCKET_PROMPTS[bucket]?.model ?? null,
        candidateReturned,
        nullReason: candidateReturned ? null : (nullEntry?.reason || "no_candidate"),
        sourceBacked,
        primary_source_url: primarySourceUrl,
        supporting_source_count: supportingSources.length,
        candidatesReturned: candInBucket.length,
        candidatesVerified: verifiedInBucket.length,
        candidatesRejectedVerification: rejVerify,
        candidatesRejectedFit: rejFit,
        candidatesSelected: selectedInBucket,
        topRejectReason,
        avgVerificationScore: avg(verifScores),
        avgPhoenixFitScore: avg(fitScores),
      };
    });

    // ─── DAILY CAP BREAKDOWN (cheap: reuses no extra queries) ──────
    const capBreakdown = {
      cap: DAILY_PUBLISH_CAP,
      capStart: dailyCountInfo.capStart,
      cutoverAt: dailyCountInfo.cutoverAt,
      publishedToday: dailyCount,
      remainingSlots: manualOverride ? null : remainingDailySlots,
      blocked: !manualOverride && dailyCount >= DAILY_PUBLISH_CAP,
    };
    let capBreakdownDetail: any = null;
    try {
      const { data: capRows } = await sb
        .from("intelligence_entries")
        .select("created_at, source, image_source_type, editorial_category")
        .gte("created_at", dailyCountInfo.capStart);
      if (Array.isArray(capRows)) {
        const byHour: Record<string, number> = {};
        const bySource: Record<string, number> = {};
        const byImageType: Record<string, number> = {};
        const byCategory: Record<string, number> = {};
        for (const r of capRows) {
          const h = new Date(r.created_at).toISOString().slice(0, 13) + ":00Z";
          byHour[h] = (byHour[h] ?? 0) + 1;
          if (r.source) bySource[r.source] = (bySource[r.source] ?? 0) + 1;
          if (r.image_source_type) byImageType[r.image_source_type] = (byImageType[r.image_source_type] ?? 0) + 1;
          if (r.editorial_category) byCategory[r.editorial_category] = (byCategory[r.editorial_category] ?? 0) + 1;
        }
        capBreakdownDetail = { rowsSinceCapStartByHour: byHour, bySource, byImageSourceType: byImageType, byEditorialCategory: byCategory };
      }
    } catch { /* best-effort */ }

    // ─── REJECT_SUMMARY log ────────────────────────────────────────
    {
      const stageCounts = { verification: 0, fit: 0, duplicate: 0, cost: 0, daily_cap: 0, editorial: 0 };
      const reasonTokens: string[] = [];
      for (const r of rejectedCandidates) {
        const stage = r.rejected_stage;
        if (stage === "verification") { stageCounts.verification++; if (r.claim_status) reasonTokens.push(String(r.claim_status)); }
        else if (stage === "phoenix_fit") stageCounts.fit++;
        else if (stage === "duplicate") stageCounts.duplicate++;
        else if (stage === "cost_cap") stageCounts.cost++;
        else if (stage === "daily_cap") stageCounts.daily_cap++;
        else stageCounts.editorial++;
      }
      const tokenCounts = new Map<string, number>();
      reasonTokens.forEach(t => tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1));
      const topReasons = Array.from(tokenCounts.entries()).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join(",");
      console.log(
        `[founder-intel:REJECT_SUMMARY] verification=${stageCounts.verification} fit=${stageCounts.fit} ` +
        `duplicate=${stageCounts.duplicate} cost=${stageCounts.cost} daily_cap=${stageCounts.daily_cap} ` +
        `editorial=${stageCounts.editorial} topReasons=${topReasons || "none"}`
      );
    }

    const provenance = {
      selectedBy: "radar",
      costMode,
      imageMode,
      maxVerificationCalls,
      radarEngineVersion: RADAR_ENGINE_VERSION,
      mode,
      dryRun,
    };
    const dailyCapWithBreakdown = {
      cap: DAILY_PUBLISH_CAP,
      publishedToday: dailyCount,
      capStart: dailyCountInfo.capStart,
      cutoverAt: dailyCountInfo.cutoverAt,
      remainingSlots: manualOverride ? null : remainingDailySlots,
      manualOverride,
      blocked: !manualOverride && dailyCount >= DAILY_PUBLISH_CAP,
      breakdown: { ...capBreakdown, ...(capBreakdownDetail || {}) },
    };

    const verifiedCount = selectedDecisions.filter(d => verifyByCandidate.get(d.candidate)?.decision === "verified").length;
    const rewrittenCount = selectedDecisions.filter(d => verifyByCandidate.get(d.candidate)?.decision === "rewritten").length;
    const rejectedVerifyCount = verifyRejected.length;
    const rejectedFitCount = finalSkips.filter(d => d.reason.startsWith("phoenix_fit_below_65")).length;
    const strongFitCount = selectedDecisions.filter(d => (fitByCandidate.get(d.candidate)?.score ?? 0) >= 80).length;
    const acceptableFitCount = selectedDecisions.filter(d => {
      const s = fitByCandidate.get(d.candidate)?.score ?? 0;
      return s >= 65 && s < 80;
    }).length;
    // Compute replacements: how many selected slots came from candidates ranked below the first `limit`.
    const topLimitIds = new Set(ranked.slice(0, limit).map(r => r.c));
    const replacedSlots = selectedDecisions.filter(d => !topLimitIds.has(d.candidate)).length;

    const skippedBy = (r: string) =>
      skippedDecisions.filter(d => d.reason === r || d.reason.startsWith(`${r}:`)).length;
    const duplicateSkipCount = skippedDecisions.filter(d => d.reason.startsWith("duplicate_check_failed")).length;
    const dailyCapBlocked = !manualOverride && dailyCount >= DAILY_PUBLISH_CAP;
    const dailyCapStatus = {
      cap: DAILY_PUBLISH_CAP,
      publishedToday: dailyCount,
      capStart: dailyCountInfo.capStart,
      cutoverAt: dailyCountInfo.cutoverAt,
      remainingSlots: manualOverride ? null : remainingDailySlots,
      manualOverride,
      blocked: dailyCapBlocked,
    };

    // ── Summary log ──────────────────────────────────────────────
    const hotClusters = clusters.filter(c => c.size >= 2).length;
    console.log(
      `[founder-intel:RADAR] dryRun=${dryRun} mode=${mode} buckets=${buckets.length} ` +
      `candidates=${candidates.length} clusters=${clusters.length} selected=${selectedDecisions.length} ` +
      `hotClusters=${hotClusters} replacedSlots=${replacedSlots} ` +
      `skippedDuplicates=${skippedBy("duplicate_topic_recent") + skippedBy("topic_cap")} ` +
      `skippedStyle=${skippedBy("style_failed")} skippedLowScore=${skippedBy("low_score")} ` +
      `verified=${verifiedCount} rewrittenForSafety=${rewrittenCount} rejectedVerification=${rejectedVerifyCount} ` +
      `rejectedFit=${rejectedFitCount} fitStrong=${strongFitCount} fitAcceptable=${acceptableFitCount} ` +
      `duplicateBlocked=${duplicateSkipCount} dailyCapBlocked=${dailyCapBlocked} publishedToday=${dailyCount}`
    );
    for (const d of skippedDecisions.filter(x => x.reason.startsWith("duplicate_check_failed"))) {
      const dup = dupResultsByCandidate.get(d.candidate);
      console.log(`[founder-intel:DUPLICATE] topic=${d.topic} reason=${dup?.reason} matched_slug=${dup?.matchedSlug} matched_headline=${dup?.matchedHeadline}`);
    }
    for (const [, t] of tightenedByCandidate.entries()) {
      if (t.before !== t.after) console.log(`[founder-intel:HEADLINE_TIGHTEN] before="${t.before}" after="${t.after}"`);
    }
    {
      const alerts: string[] = [];
      if (selectedDecisions.length === 0) alerts.push("selected_zero");
      if (rejectedVerifyCount >= 3) alerts.push(`rejected_verification_${rejectedVerifyCount}`);
      if (rejectedFitCount >= 3) alerts.push(`rejected_fit_${rejectedFitCount}`);
      const severity = (selectedDecisions.length === 0 || dailyCapBlocked) ? "critical" : (alerts.length ? "warning" : null);
      if (severity) console.log(`[founder-intel:ALERT] reason=${alerts.join(",") || "see_summary"} severity=${severity}`);
    }
    for (const d of [...selectedDecisions, ...skippedDecisions]) {
      console.log(
        `[founder-intel:RADAR_CANDIDATE] bucket=${d.candidate.bucket} score=${d.score} ` +
        `topic=${d.topic} angle=${d.angle} decision=${d.decision} reason=${d.reason}`
      );
    }

    // ── DryRun: return preview, write nothing ────────────────────
    if (dryRun) {
      // Reasons any slots remain empty.
      const emptySlotReasons: string[] = [];
      if (selectedDecisions.length < limit) {
        if (candidates.length < limit) emptySlotReasons.push(`only_${candidates.length}_candidates_returned_by_perplexity`);
        if (rejectedVerifyCount > 0) emptySlotReasons.push(`${rejectedVerifyCount}_rejected_by_verification`);
        if (rejectedFitCount > 0) emptySlotReasons.push(`${rejectedFitCount}_rejected_by_phoenix_fit_below_65`);
        if (skippedBy("duplicate_topic_recent") > 0) emptySlotReasons.push(`${skippedBy("duplicate_topic_recent")}_duplicate_with_recent_14d`);
        if (skippedBy("style_failed") > 0) emptySlotReasons.push(`${skippedBy("style_failed")}_style_failed`);
        if (skippedBy("no_numeric_fact") > 0) emptySlotReasons.push(`${skippedBy("no_numeric_fact")}_missing_numeric_fact`);
        if (skippedBy("low_score") > 0) emptySlotReasons.push(`${skippedBy("low_score")}_below_score_floor`);
        if (emptySlotReasons.length === 0) emptySlotReasons.push("unknown");
      }

      // All-candidates verification report (for full transparency).
      const allCandidatesReport = ranked.map(s => {
        const v = verifyByCandidate.get(s.c) || null;
        const f = fitByCandidate.get(s.c) || null;
        const isSelected = selectedDecisions.some(d => d.candidate === s.c);
        const finalSkip = finalSkips.find(d => d.candidate === s.c);
        const rejected = verifyRejected.find(d => d.candidate === s.c);
        const capSkipped = verifyCapDecisions.find(d => d.candidate === s.c);
        return {
          original_headline: v?.originalHeadline ?? s.c.headline,
          safe_headline: v?.safeHeadline ?? null,
          bucket: s.c.bucket,
          topic: s.topic,
          angle: s.angle,
          radar_score: s.score,
          verification_score: v?.score ?? null,
          claim_status: v?.status ?? null,
          verification_decision: v?.decision ?? (capSkipped ? "skipped_for_cost" : null),
          verification_summary: v?.summary ?? null,
          uncertainty_flags: v?.uncertaintyFlags ?? [],
          supporting_source_urls: v?.supportingUrls ?? [],
          source: s.c.source,
          url: s.c.url,
          phoenix_fit_score: f?.score ?? null,
          phoenix_fit_lane: f?.lane ?? null,
          phoenix_fit_reason: f?.reason ?? null,
          capital_implication: s.c.capital_implication ?? null,
          operator_implication: s.c.operator_implication ?? null,
          combined_rank_score: (f && v)
            ? Math.round((s.score * 0.35 + v.score * 0.30 + f.score * 0.35) * 100) / 100
            : null,
          rejected_for_low_phoenix_fit: !!finalSkip && finalSkip.reason.startsWith("phoenix_fit_below_65"),
          eligible_for_final_selection: v ? v.decision !== "rejected" : false,
          final_selected: isSelected,
          rejected_reason: rejected ? rejected.reason : (capSkipped ? capSkipped.reason : (finalSkip ? finalSkip.reason : null)),
            sponsor_flag: v?.sponsorFlag ?? false,
            primary_source_replaced: v?.primarySourceReplaced ?? false,
            original_primary_source_url: v?.originalPrimarySourceUrl ?? null,
            final_primary_source_url: v?.finalPrimarySourceUrl ?? null,
            sponsor_decision: v?.sponsorDecision ?? "none",
        };
      });

      return new Response(JSON.stringify({
        dryRun: true,
        mode,
        limit,
        buckets,
        dailyCap: dailyCapWithBreakdown,
        provenance,
        bucketDiagnostics,
        rejectedCandidates,
        costControl: finalizeCost(),
        summary: {
          candidates: candidates.length,
          clusters: clusters.length,
          selected: selectedDecisions.length,
          hotClusters,
          verified: verifiedCount,
          rewrittenForSafety: rewrittenCount,
          rejectedVerification: rejectedVerifyCount,
          rejectedPhoenixFit: rejectedFitCount,
          fitStrong: strongFitCount,
          fitAcceptable: acceptableFitCount,
          replacedSlots,
          emptySlots: Math.max(0, limit - selectedDecisions.length),
          emptySlotReasons,
          skipped: {
            duplicate_topic_recent: skippedBy("duplicate_topic_recent"),
            topic_cap: skippedBy("topic_cap"),
            repeated_angle_in_topic: skippedBy("repeated_angle_in_topic"),
            source_cap: skippedBy("source_cap"),
            style_failed: skippedBy("style_failed"),
            low_score: skippedBy("low_score"),
            no_numeric_fact: skippedBy("no_numeric_fact"),
            limit_reached: skippedBy("limit_reached"),
            rewrite_failed: skippedBy("rewrite_failed"),
            verification_failed: skippedBy("verification_failed"),
            phoenix_fit_below_65: skippedBy("phoenix_fit_below_65"),
            duplicate_check_failed: duplicateSkipCount,
            daily_cap_reached: skippedDecisions.filter(d => d.reason.startsWith("daily_cap_reached")).length,
          },
        },
        clusters,
        selectedPublishSet: selectedDecisions.map(d => {
          const v = verifyByCandidate.get(d.candidate);
          const f = fitByCandidate.get(d.candidate);
          const t = tightenedByCandidate.get(d.candidate);
          const dup = dupResultsByCandidate.get(d.candidate);
          return {
            original_headline: v?.originalHeadline ?? d.candidate.headline,
            safe_headline: t?.before ?? d.candidate.headline,
            tightened_headline: d.candidate.headline,
            headline_length: (d.candidate.headline || "").length,
            bucket: d.candidate.bucket,
            topic: d.topic,
            angle: d.angle,
            score: d.score,
            verification_score: v?.score ?? null,
            claim_status: v?.status ?? null,
            verification_decision: v?.decision ?? null,
            verification_summary: v?.summary ?? null,
            uncertainty_flags: v?.uncertaintyFlags ?? [],
            supporting_source_urls: v?.supportingUrls ?? [],
            phoenix_fit_score: f?.score ?? null,
            phoenix_fit_lane: f?.lane ?? null,
            phoenix_fit_reason: f?.reason ?? null,
            capital_implication: d.candidate.capital_implication ?? null,
            operator_implication: d.candidate.operator_implication ?? null,
            combined_rank_score: (f && v)
              ? Math.round((d.score * 0.35 + v.score * 0.30 + f.score * 0.35) * 100) / 100
              : null,
            source: d.candidate.source,
            url: d.candidate.url,
            founder_takeaway: d.candidate.founder_takeaway,
            selection_reason: d.reason,
            duplicate_check: dup ? (dup.passed ? "passed" : "failed") : "passed",
            duplicate_reason: dup?.reason ?? null,
            matched_existing_slug: dup?.matchedSlug ?? null,
            matched_existing_headline: dup?.matchedHeadline ?? null,
            sponsor_flag: v?.sponsorFlag ?? false,
            primary_source_replaced: v?.primarySourceReplaced ?? false,
            original_primary_source_url: v?.originalPrimarySourceUrl ?? null,
            final_primary_source_url: v?.finalPrimarySourceUrl ?? null,
            sponsor_decision: v?.sponsorDecision ?? "none",
          };
        }),
        allCandidates: allCandidatesReport,
        skipped: skippedDecisions.map(d => ({
          headline: d.candidate.headline,
          bucket: d.candidate.bucket,
          topic: d.topic,
          angle: d.angle,
          score: d.score,
          reason: d.reason,
        })),
        wroteRows: 0,
        generatedImages: 0,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Live publish path ────────────────────────────────────────
    if (dailyCapBlocked) {
      return new Response(JSON.stringify({
        dryRun: false, wroteRows: 0, message: "daily_cap_reached",
        dailyCap: dailyCapWithBreakdown,
        provenance,
        bucketDiagnostics,
        rejectedCandidates,
        costControl: finalizeCost(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const selectedCandidates = selectedDecisions.slice(0, limit).map(d => d.candidate);
    if (selectedCandidates.length === 0) {
      return new Response(JSON.stringify({
        dryRun: false, wroteRows: 0, message: "no_candidates_selected",
        radar: { candidates: candidates.length, clusters: clusters.length, skipped: skippedDecisions.length },
        dailyCap: dailyCapWithBreakdown,
        provenance,
        bucketDiagnostics,
        rejectedCandidates,
        costControl: finalizeCost(),
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Build articles in legacy shape for downstream image + upsert pipeline.
    const articles = selectedCandidates.map((c, i) => {
      const sanitized = sanitizeArticle({
        headline: c.headline,
        source: c.source,
        url: c.url,
        summary: c.summary,
        whyItMatters: c.why_it_matters,
        founderTakeaway: c.founder_takeaway,
        watchNext: c.watch_next || "",
        socialBlurb: c.social_blurb || "",
        editorialCategory: bucketToCategory(c.bucket),
      });
      return {
        ...sanitized,
        bucket: c.bucket,
        date: c.date || new Date().toISOString().slice(0,10),
        id: slugify(sanitized.headline || `signal-${i}`),
        editorialCategory: sanitized.editorialCategory || "Market Signal",
      };
    });

    const recent = await getRecentEntries(sb, 40);
    const usedSceneIds = [...recent.sceneIds];
    const runState = { gatewayCreditsExhausted: false };

    type ImageMeta = {
      url: string | null; sceneId: string | null; sourceType: string;
      relevanceScore: number; promptUsed: string | null;
      generation?: { finalStatus: string; modelUsed: string | null; attempts: ImageAttemptLog[] } | null;
    };
    const imageMetas: ImageMeta[] = Array.from({ length: articles.length }, () => ({
      url: null, sceneId: null, sourceType: "fallback", relevanceScore: 0, promptUsed: null, generation: null,
    }));

    // imageMode = "none" → skip all image work entirely (no source extraction, no generation).
    const skipAllImages = imageMode === "none";
    const ogResults = skipAllImages
      ? articles.map(() => ({ status: "fulfilled", value: null } as const))
      : await Promise.allSettled(articles.map((a: any) => extractOgImage(a.url)));

    for (let i = 0; i < articles.length; i++) {
      if (skipAllImages) {
        // Pure fallback rotation, no external work.
        const picked = pickFallbackImage(articles[i].id, articles[i].editorialCategory, recent.imageUrls);
        imageMetas[i] = { url: picked.url, sceneId: null, sourceType: "fallback", relevanceScore: 0.3, promptUsed: null, generation: null };
        recent.imageUrls.push(picked.url);
        continue;
      }
      const og = ogResults[i].status === "fulfilled" ? (ogResults[i] as PromiseFulfilledResult<string | null>).value : null;
      const ogScore = scoreOgImageRelevance(og, articles[i], recent.imageUrls);
      if (og && ogScore.score >= OG_RELEVANCE_THRESHOLD) {
        imageMetas[i] = { url: og, sceneId: null, sourceType: "source", relevanceScore: ogScore.score, promptUsed: null, generation: null };
      } else if (imageMode === "source_only") {
        // No generation allowed; rotate fallback.
        const picked = pickFallbackImage(articles[i].id, articles[i].editorialCategory, recent.imageUrls);
        imageMetas[i] = { url: picked.url, sceneId: null, sourceType: "fallback", relevanceScore: 0.3, promptUsed: null, generation: null };
        recent.imageUrls.push(picked.url);
      } else {
        cost.openaiImageCallsPlanned += 1;
        const result = await generateBrandedImage(
          articles[i].id,
          {
            headline: articles[i].headline || "",
            founderTakeaway: articles[i].founderTakeaway || "",
            whyItMatters: articles[i].whyItMatters || "",
            editorialCategory: articles[i].editorialCategory || "Market Signal",
            socialBlurb: articles[i].socialBlurb || "",
          },
          i, sb, usedSceneIds, runState,
        );
        // Tally OpenAI / legacy-gateway calls from attempt log.
        for (const a of result.attempts) {
          if (a.label === "openai-primary") cost.openaiImageCallsMade += 1;
          else if (a.label === "flash-base") cost.legacyGatewayCalls += 1;
        }
        const generation = { finalStatus: result.finalStatus, modelUsed: result.modelUsed, attempts: result.attempts };
        if (result.url) {
          imageMetas[i] = { url: result.url, sceneId: result.sceneId, sourceType: "generated", relevanceScore: 0.9, promptUsed: result.promptUsed, generation };
        } else {
          const picked = pickFallbackImage(articles[i].id, articles[i].editorialCategory, recent.imageUrls);
          imageMetas[i] = { url: picked.url, sceneId: result.sceneId, sourceType: "fallback", relevanceScore: 0.3, promptUsed: result.promptUsed, generation };
          recent.imageUrls.push(picked.url);
        }
        if (result.sceneId) usedSceneIds.push(result.sceneId);
      }
    }

    // CRITICAL: rows derived ONLY from selectedCandidates (already capped at limit).
    const rows = articles.map((a: any, i: number) => {
      const meta = imageMetas[i];
      return {
        slug: a.id,
        headline: a.headline || "",
        editorial_category: a.editorialCategory || "Market Signal",
        source: a.source || "",
        source_date: a.date || null,
        summary: a.summary || null,
        why_it_matters: a.whyItMatters || null,
        founder_takeaway: a.founderTakeaway || null,
        source_url: a.url || null,
        image_url: meta.url || DEFAULT_IMAGE,
        featured_quote: a.watchNext || null,
        image_scene_id: meta.sceneId || null,
        image_source_type: meta.sourceType,
        image_relevance_score: meta.relevanceScore,
        image_prompt_used: meta.promptUsed ? meta.promptUsed.slice(0, 2000) : null,
      };
    });

    if (rows.length > 0) {
      const { error: upsertError } = await sb
        .from("intelligence_entries")
        .upsert(rows, { onConflict: "slug", ignoreDuplicates: false });
      if (upsertError) console.error("Upsert error:", upsertError);
    }

    // IMAGE_HEALTH summary (live runs only)
    {
      let total=0, source=0, generated=0, openai=0, legacyGateway=0, fallback=0, defaultFallback=0, openaiErrors=0, gateway402=0;
      for (const m of imageMetas) {
        total++;
        if (m.sourceType === "source") source++;
        else if (m.sourceType === "generated") {
          generated++;
          const model = m.generation?.modelUsed || "";
          if (model.startsWith("gpt-image")) openai++;
          else if (model.startsWith("google/")) legacyGateway++;
        } else if (m.sourceType === "fallback") {
          fallback++;
          if (m.url === DEFAULT_IMAGE) defaultFallback++;
        }
        for (const a of m.generation?.attempts ?? []) {
          if (a.label === "openai-primary" && a.outcome !== "passed") openaiErrors++;
          if (a.httpStatus === 402) gateway402++;
        }
      }
      console.log(`[founder-intel:IMAGE_HEALTH] total=${total} source=${source} generated=${generated} openai=${openai} legacyGateway=${legacyGateway} fallback=${fallback} defaultFallback=${defaultFallback} openaiErrors=${openaiErrors} gateway402=${gateway402}`);
      try {
        await sb.from("image_health_runs").insert({
          function_name: "founder-intelligence",
          total, source_count: source, generated_count: generated,
          openai_count: openai, lovable_count: legacyGateway, fallback_count: fallback,
          default_fallback_count: defaultFallback, openai_errors: openaiErrors, gateway_402: gateway402,
          details: {
            slugs: articles.map((a: any) => a?.id ?? null),
            models: imageMetas.map((m: any) => m.generation?.modelUsed ?? null),
            sourceTypes: imageMetas.map((m: any) => m.sourceType ?? null),
          },
        });
      } catch (logErr) {
        console.warn(`[founder-intel:IMAGE_HEALTH] persist failed: ${logErr instanceof Error ? logErr.message : String(logErr)}`);
      }
    }

    return new Response(JSON.stringify({
      dryRun: false, mode, limit, wroteRows: rows.length,
      dailyCap: dailyCapWithBreakdown,
      provenance,
      bucketDiagnostics,
      rejectedCandidates,
      costControl: finalizeCost(),
      selectedPublishSet: selectedDecisions.map(d => {
        const v = verifyByCandidate.get(d.candidate);
        const f = fitByCandidate.get(d.candidate);
        const t = tightenedByCandidate.get(d.candidate);
        const dup = dupResultsByCandidate.get(d.candidate);
        return {
          original_headline: v?.originalHeadline ?? d.candidate.headline,
          safe_headline: t?.before ?? d.candidate.headline,
          tightened_headline: d.candidate.headline,
          bucket: d.candidate.bucket, topic: d.topic, angle: d.angle, score: d.score,
          source: d.candidate.source,
          verification_score: v?.score ?? null,
          claim_status: v?.status ?? null,
          verification_summary: v?.summary ?? null,
          supporting_source_urls: v?.supportingUrls ?? [],
          phoenix_fit_score: f?.score ?? null,
          phoenix_fit_lane: f?.lane ?? null,
          selection_reason: d.reason,
          duplicate_check: dup ? (dup.passed ? "passed" : "failed") : "passed",
          sponsor_flag: v?.sponsorFlag ?? false,
          primary_source_replaced: v?.primarySourceReplaced ?? false,
          original_primary_source_url: v?.originalPrimarySourceUrl ?? null,
          final_primary_source_url: v?.finalPrimarySourceUrl ?? null,
          sponsor_decision: v?.sponsorDecision ?? "none",
        };
      }),
      radar: {
        candidates: candidates.length, clusters: clusters.length,
        skipped: skippedDecisions.length,
      },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function bucketToCategory(bucket: string): string {
  switch (bucket) {
    case "capital_credit": return "Capital Market Signal";
    case "founder_strategy": return "Founder Strategy Signal";
    case "market_regulatory": return "Market Risk Signal";
    case "funding_venture": return "Venture Funding Signal";
    case "ai_infrastructure": return "AI Infrastructure Signal";
    case "wildcard": return "Growth Capital Signal";
    default: return "Market Signal";
  }
}

// ─── SIMULATION MODE ─────────────────────────────────────────────────
// Zero external calls. Exercises validators, verification stub, Phoenix Fit,
// duplicate gate, daily cap, headline tightening, and response shaping.
async function runSimulation(args: {
  sb: any; limit: number; mode: string; buckets: string[];
  costSnapshot: any; finalizeCost: () => any;
}) {
  const { sb, limit, mode, buckets, finalizeCost } = args;

  // Read recent for duplicate gate (read-only; no external API).
  const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRows } = await sb
    .from("intelligence_entries")
    .select("headline, slug, summary, source_url, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  const recentEntries = recentRows || [];
  const recentSourceUrls = new Set<string>(
    recentEntries.map((r: any) => (r.source_url || "").trim()).filter(Boolean),
  );
  const dailyCountInfo = await getDailyPublishCount(sb);
  const dailyCount = dailyCountInfo.count;
  const remainingDailySlots = Math.max(0, DAILY_PUBLISH_CAP - dailyCount);

  // Pick a real existing source_url for the "duplicate" fixture if available.
  const dupUrl = recentEntries[0]?.source_url || "https://example.com/will-collide";
  if (!recentSourceUrls.has(dupUrl)) recentSourceUrls.add(dupUrl);

  // ── Fixtures ────────────────────────────────────────────────────
  type SimRow = {
    label: string;
    fixture: any;
    verifyStub: { decision: "verified" | "rewritten" | "rejected"; score: number; status: ClaimStatus; summary: string; safeHeadline?: string; reason: string };
    forceDuplicate?: boolean;
  };
  const fixtures: SimRow[] = [
    {
      label: "strong_fit_verified",
      fixture: {
        headline: "SBA 7(a) lender approvals jump 18% as community banks add $2.4B in working-capital lines — SBA",
        summary: "SBA 7(a) approvals rose 18% quarter-over-quarter as community banks added $2.4B in new working-capital commitments to small businesses, per SBA weekly lending data.",
        why_it_matters: "More approvals at community banks mean operators with thinner files have a real path to working-capital lines this quarter.",
        founder_takeaway: "If you've been waiting on SBA financing, community banks are the ones moving — pull a fresh package and apply now.",
        watch_next: "Watch whether the trend holds into Q1 or contracts on rate movement.",
        social_blurb: "SBA 7(a) approvals up 18% — community banks are leading.",
        bucket: "capital_credit",
        source: "SBA",
        url: "https://www.sba.gov/article/2026/may/02/sba-7a-weekly-lending-data",
        date: new Date().toISOString().slice(0,10),
        numeric_facts: ["18%", "$2.4B"],
        capital_implication: "More working-capital availability for SMBs through community banks this quarter.",
        operator_implication: "Apply now while approval velocity is elevated.",
        angle_label: "lending_velocity",
        topic_slug: "sba-7a-approvals-up-18pct",
      },
      verifyStub: { decision: "verified", score: 88, status: "confirmed", summary: "SBA weekly data confirms approval and dollar-volume increase.", reason: "official_source+numeric_match" },
    },
    {
      label: "headline_needs_tightening",
      fixture: {
        headline: "Signal: A small SBA rule change is pulling forward equipment-financing demand into Q4 — Bloomberg",
        summary: "An SBA rule update on equipment-financing eligibility is being read by lenders as pulling forward Q1 demand into Q4 as borrowers race to lock in terms.",
        why_it_matters: "Equipment buyers gain a brief window of better terms before the rule's full effect.",
        founder_takeaway: "If equipment is on your roadmap for the next two quarters, price out terms this month.",
        watch_next: "Watch lender response in 30 days.",
        social_blurb: "SBA equipment-financing rule change pulls Q1 demand into Q4.",
        bucket: "capital_credit",
        source: "Bloomberg",
        url: "https://www.bloomberg.com/news/articles/2026/example-sba-equipment",
        date: new Date().toISOString().slice(0,10),
        numeric_facts: ["Q4", "Q1"],
        capital_implication: "Equipment terms briefly more favorable through year-end.",
        operator_implication: "Lock terms now if equipment is in the plan.",
        angle_label: "rule_change_window",
        topic_slug: "sba-equipment-rule-pull-forward",
      },
        verifyStub: { decision: "rewritten", score: 74, status: "reported", summary: "Bloomberg reports the rule shift; lender response is anecdotal.", safeHeadline: "Signal: SBA equipment-financing rule shift may pull Q1 demand into Q4 — Bloomberg", reason: "tier1_reported_single_source" },
    },
    {
      label: "low_phoenix_fit",
      fixture: {
        headline: "Hyperscaler GPU cluster contract reaches $40B over five years",
        summary: "A major hyperscaler signed a $40B five-year GPU supply contract with a chipmaker.",
        why_it_matters: "Signals continued AI-capex concentration at the top.",
        founder_takeaway: "Industry curiosity only — no direct founder action.",
        watch_next: "Look for follow-on supply deals.",
        social_blurb: "Hyperscaler signs $40B GPU deal.",
        bucket: "ai_infrastructure",
        source: "Reuters",
        url: "https://www.reuters.com/technology/example-gpu-40b/",
        date: new Date().toISOString().slice(0,10),
        numeric_facts: ["$40B", "5 years"],
        angle_label: "hyperscaler_deal",
        topic_slug: "hyperscaler-gpu-40b",
      },
      verifyStub: { decision: "verified", score: 82, status: "confirmed", summary: "Confirmed by Reuters with primary contract figures.", reason: "tier1_confirmed" },
    },
    {
      label: "duplicate_source_url",
      fixture: {
        headline: "Working capital costs ease as regional banks reopen lines",
        summary: "Regional banks reopened working-capital lines as funding costs eased, restoring SMB credit availability that had tightened in Q3.",
        why_it_matters: "Cheaper, more available working capital for operators.",
        founder_takeaway: "Re-shop your line — pricing has moved.",
        watch_next: "Watch regional bank earnings for confirmation.",
        social_blurb: "Regional banks reopen working-capital lines.",
        bucket: "capital_credit",
        source: "WSJ",
        url: dupUrl,
        date: new Date().toISOString().slice(0,10),
        numeric_facts: ["Q3"],
        capital_implication: "Working-capital pricing improving for SMBs.",
        operator_implication: "Re-shop lines this quarter.",
        angle_label: "lender_reopen",
        topic_slug: "regional-banks-reopen-wc-lines",
      },
      verifyStub: { decision: "verified", score: 80, status: "confirmed", summary: "WSJ confirms regional bank line reopening trend.", reason: "tier1_confirmed" },
      forceDuplicate: true,
    },
    {
      label: "unverifiable_risky",
      fixture: {
        headline: "Fed reportedly considering surprise 50bp emergency cut next week",
        summary: "Unverified market chatter suggests the Fed may consider an emergency 50bp cut as soon as next week, though no official confirmation exists.",
        why_it_matters: "If true, would dramatically lower borrowing costs for SMBs.",
        founder_takeaway: "Do not act on this — wait for official Fed comms.",
        watch_next: "Watch FOMC speakers this week.",
        social_blurb: "Rumor: Fed emergency cut talk.",
        bucket: "capital_credit",
        source: "Twitter chatter",
        url: "https://twitter.com/example/status/123",
        date: new Date().toISOString().slice(0,10),
        numeric_facts: ["50bp"],
        capital_implication: "Speculative — no confirmed implication.",
        operator_implication: "Hold until verified.",
        angle_label: "rumor",
        topic_slug: "fed-50bp-emergency-rumor",
      },
      verifyStub: { decision: "rejected", score: 35, status: "rumor", summary: "No official Fed confirmation; single low-credibility source.", reason: "single_low_credibility_rumor" },
    },
  ];

  // Run editorial validators + simulated verify + fit + duplicate + tighten.
  type SimDecision = {
    label: string;
    candidate: any;
    verify: any | null;
    fit: any | null;
    duplicateCheck: { passed: boolean; reason: string | null };
    tightened: { before: string; after: string } | null;
    decision: "selected" | "skipped";
    reason: string;
  };
  const sim: SimDecision[] = [];

  for (const f of fixtures) {
    const c = f.fixture;
    const ev = validateEditorial(c);
    if (!ev.ok) {
      sim.push({ label: f.label, candidate: c, verify: null, fit: null, duplicateCheck: { passed: true, reason: null }, tightened: null, decision: "skipped", reason: `editorial_failed:${ev.reason}` });
      continue;
    }
    const v = f.verifyStub;
    if (v.decision === "rejected") {
      sim.push({ label: f.label, candidate: c, verify: v, fit: null, duplicateCheck: { passed: true, reason: null }, tightened: null, decision: "skipped", reason: `verification_failed:${v.status}:${v.score}` });
      continue;
    }
    if (v.safeHeadline) c.headline = v.safeHeadline;
    const fit = phoenixFitScore(c, v.score);
    if (fit.score < 65) {
      sim.push({ label: f.label, candidate: c, verify: v, fit, duplicateCheck: { passed: true, reason: null }, tightened: null, decision: "skipped", reason: `phoenix_fit_below_65:${fit.score}` });
      continue;
    }
    // Duplicate gate (URL only in sim; cheap enough).
    const url = (c.url || "").trim();
    const isDup = !!f.forceDuplicate || (url && recentSourceUrls.has(url));
    if (isDup) {
      sim.push({ label: f.label, candidate: c, verify: v, fit, duplicateCheck: { passed: false, reason: "same_source_url_in_14d" }, tightened: null, decision: "skipped", reason: "duplicate_check_failed:same_source_url_in_14d" });
      continue;
    }
    sim.push({ label: f.label, candidate: c, verify: v, fit, duplicateCheck: { passed: true, reason: null }, tightened: null, decision: "selected", reason: "passed_all_gates" });
  }

  // Apply daily cap + limit on selections.
  // NOTE: sim ignores live daily cap (would otherwise mask validator behavior).
  const selectedAll = sim.filter(s => s.decision === "selected");
  const effectiveLimit = limit;
  for (let i = 0; i < selectedAll.length; i++) {
    if (i >= effectiveLimit) {
      selectedAll[i].decision = "skipped";
      selectedAll[i].reason = `limit_reached(${effectiveLimit})`;
    }
  }
  // Headline tighten on final selections.
  for (const s of sim) {
    if (s.decision !== "selected") continue;
    const before = s.candidate.headline || "";
    const after = tightenHeadline(before, s.candidate.source || "");
    s.tightened = { before, after };
    s.candidate.headline = after;
  }

  console.log(`[founder-intel:RADAR] dryRun=true mode=${mode} buckets=${buckets.length} simulate=true ` +
    `candidates=${fixtures.length} selected=${sim.filter(s => s.decision === "selected").length} ` +
    `rejectedVerification=${sim.filter(s => s.reason.startsWith("verification_failed")).length} ` +
    `rejectedFit=${sim.filter(s => s.reason.startsWith("phoenix_fit_below_65")).length} ` +
    `duplicateBlocked=${sim.filter(s => s.reason.startsWith("duplicate_check_failed")).length}`);

  for (const s of sim) {
    console.log(`[founder-intel:SIM] label=${s.label} decision=${s.decision} reason=${s.reason} ` +
      `fit=${s.fit?.score ?? "n/a"} verify=${s.verify?.score ?? "n/a"}`);
    if (s.tightened && s.tightened.before !== s.tightened.after) {
      console.log(`[founder-intel:HEADLINE_TIGHTEN] before="${s.tightened.before}" after="${s.tightened.after}"`);
    }
  }

  const costControl = finalizeCost();

  return new Response(JSON.stringify({
    dryRun: true,
    simulateCandidates: true,
    mode,
    limit,
    buckets,
    dailyCap: { cap: DAILY_PUBLISH_CAP, publishedToday: dailyCount, capStart: dailyCountInfo.capStart, cutoverAt: dailyCountInfo.cutoverAt, remainingSlots: remainingDailySlots, manualOverride: false, blocked: dailyCount >= DAILY_PUBLISH_CAP },
    costControl,
    summary: {
      candidates: fixtures.length,
      selected: sim.filter(s => s.decision === "selected").length,
      rejectedVerification: sim.filter(s => s.reason.startsWith("verification_failed")).length,
      rejectedPhoenixFit: sim.filter(s => s.reason.startsWith("phoenix_fit_below_65")).length,
      duplicateBlocked: sim.filter(s => s.reason.startsWith("duplicate_check_failed")).length,
      headlinesTightened: sim.filter(s => s.tightened && s.tightened.before !== s.tightened.after).length,
    },
    selectedPublishSet: sim.filter(s => s.decision === "selected").map(s => ({
      label: s.label,
      original_headline: s.tightened?.before ?? s.candidate.headline,
      tightened_headline: s.candidate.headline,
      bucket: s.candidate.bucket,
      source: s.candidate.source,
      url: s.candidate.url,
      verification_score: s.verify?.score ?? null,
      claim_status: s.verify?.status ?? null,
      verification_summary: s.verify?.summary ?? null,
      phoenix_fit_score: s.fit?.score ?? null,
      phoenix_fit_lane: s.fit?.lane ?? null,
      duplicate_check: "passed",
    })),
    skipped: sim.filter(s => s.decision === "skipped").map(s => ({
      label: s.label,
      headline: s.candidate.headline,
      bucket: s.candidate.bucket,
      reason: s.reason,
      verification_score: s.verify?.score ?? null,
      phoenix_fit_score: s.fit?.score ?? null,
    })),
    wroteRows: 0,
    generatedImages: 0,
  }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
