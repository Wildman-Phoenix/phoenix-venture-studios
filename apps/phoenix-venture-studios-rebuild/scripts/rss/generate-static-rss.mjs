import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_IMAGE_SOURCE_ALLOWLIST,
  assignImageCreativeDirection,
  createImageBrief,
  renderSignalCardsForItems,
  resolveSourceImagePolicy
} from "./signal-card-images.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_REGISTRY_PATH = path.join(APP_ROOT, "rss-data/source-registry.json");
const TOOLS_REGISTRY_PATH = path.join(APP_ROOT, "rss-data/tools-registry.json");
const DEFAULT_IMAGE_SOURCE_ALLOWLIST_PATH = path.join(APP_ROOT, "rss-data/image-source-allowlist.json");
const DEFAULT_OUTPUT_DIR = path.join(APP_ROOT, "public/rss");
const DEFAULT_SITE_URL = "https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild";
const MAX_ITEMS = 10;
const DEFAULT_FEED_TITLE = "Phoenix Venture Studios - Founder Market";
const DEFAULT_FEED_DESCRIPTION = "Funding, AI market moves, capital shifts, and founder-facing business signals curated for Phoenix Venture Studios.";
const FOUNDER_TOOLS_FEED_TITLE = "Phoenix Venture Studios - Founder Tools";
const FOUNDER_TOOLS_FEED_DESCRIPTION = "Useful AI tools, agent development, automation, coding, and time-saving workflow signals for founders.";

export const BUCKET_LABELS = {
  capital_credit: "Capital & Credit",
  founder_strategy: "Founder Strategy & Operations",
  market_regulatory: "Market & Regulatory",
  funding_venture: "Funding & Venture",
  ai_operator_impact: "AI Operator Impact",
  coaching_consulting: "Coaching, Consulting & Entrepreneurship",
  wildcard_attention: "Wildcard Attention",
  ai_consulting: "AI Consulting",
  ai_implementation: "AI Implementation",
  ai_tools_agents: "AI Tools & Agents",
  business_automation: "Business Automation",
  jamstack_ops: "Jamstack Operating Systems",
  ai_revenue: "AI Revenue Opportunities"
};

const BUCKET_KEYWORDS = {
  capital_credit: [
    "capital", "credit", "loan", "lending", "sba", "bank", "cash flow", "working capital",
    "invoice", "receivable", "interest", "rate", "financing", "debt"
  ],
  founder_strategy: [
    "founder", "operator", "startup", "strategy", "pricing", "hiring", "sales", "growth",
    "customer", "go-to-market", "productivity", "team", "execution", "venture", "venture studio",
    "launch", "builder", "builders", "product roadmap", "ship"
  ],
  market_regulatory: [
    "regulation", "regulatory", "tariff", "policy", "court", "rule", "compliance", "tax",
    "federal", "state", "risk", "labor", "market"
  ],
  funding_venture: [
    "funding", "venture", "seed", "series", "valuation", "raise", "raised", "investor",
    "vc", "private equity", "acquisition", "ipo", "pre-seed", "angel", "backed", "fundraise",
    "venture studio", "startup studio", "new venture"
  ],
  ai_operator_impact: [
    "ai", "artificial intelligence", "automation", "agent", "model", "llm", "copilot",
    "workflow", "security", "compute", "data", "productivity", "agentic", "gentic",
    "operator shift", "ops shift", "org change", "work shift"
  ],
  coaching_consulting: [
    "coach", "consulting", "consultant", "entrepreneur", "small business", "leadership",
    "service business", "advisory", "mentor", "training"
  ],
  wildcard_attention: [
    "shift", "warning", "opportunity", "trend", "surge", "drop", "cost", "demand",
    "consumer", "supply chain", "energy", "insurance"
  ],
  ai_consulting: [
    "consulting", "consultant", "advisor", "implementation partner", "services", "agency",
    "client", "training", "enablement", "adoption", "change management"
  ],
  ai_implementation: [
    "implementation", "deploy", "rollout", "integration", "workflow", "operations",
    "productivity", "enterprise", "small business", "pilot", "case study", "app development",
    "application development", "build apps", "building apps", "app builder", "prototype",
    "ship faster", "product build"
  ],
  ai_tools_agents: [
    "agent", "agents", "tool", "tools", "assistant", "copilot", "automation", "workflow",
    "model", "llm", "chatgpt", "claude", "gemini", "codex", "agentic", "gentic",
    "vibe coding", "app builder", "app builders", "build apps", "building apps",
    "app development", "developer tool", "developer tools", "dev tool", "coding agent",
    "code generation", "rapid prototyping"
  ],
  business_automation: [
    "automation", "automate", "sales", "marketing", "support", "crm", "back office",
    "operations", "process", "customer service", "document", "data"
  ],
  jamstack_ops: [
    "jamstack", "static", "serverless", "cloudflare", "netlify", "vercel", "api",
    "webhook", "workflow", "edge", "frontend", "deployment", "github"
  ],
  ai_revenue: [
    "revenue", "monetize", "pricing", "sales", "offer", "business model", "customers",
    "market", "growth", "profit", "income", "commercial"
  ]
};

const FALLBACK_IMAGES = {
  capital_credit: "/images/signal-business-credit.jpg",
  founder_strategy: "/images/signal-founder-strategy.jpg",
  market_regulatory: "/images/signal-market-risk.jpg",
  funding_venture: "/images/signal-venture-funding.jpg",
  ai_operator_impact: "/images/signal-ai-infrastructure.jpg",
  coaching_consulting: "/images/signal-founder-strategy.jpg",
  wildcard_attention: "/images/signal-default.jpg",
  ai_consulting: "/images/signal-founder-strategy.jpg",
  ai_implementation: "/images/signal-ai-infrastructure.jpg",
  ai_tools_agents: "/images/signal-ai-infrastructure.jpg",
  business_automation: "/images/signal-business-credit.jpg",
  jamstack_ops: "/images/signal-default.jpg",
  ai_revenue: "/images/signal-venture-funding.jpg"
};

const SIGNAL_CONTEXT_BY_BUCKET = {
  capital_credit: {
    whyItMatters: "Capital access, credit pricing, and cash-flow conditions shape how much room a business has to move. A small shift here can change hiring, inventory, marketing, or the timing of an AI rollout.",
    whyShared: "Phoenix shared this because funding conversations get easier when founders can connect outside market signals to their own capital readiness.",
    founderTakeaway: "Use this as a prompt to review your runway, credit options, and the business case for borrowing before you need capital urgently.",
    businessTakeaway: "A practical takeaway is to tighten the numbers behind your next growth move so a funding conversation has a clear purpose."
  },
  funding_venture: {
    whyItMatters: "Funding news is not just about who raised money. It reveals where investors, lenders, and operators believe demand is moving.",
    whyShared: "Phoenix shared this because founders can use funding patterns to pressure-test offers, timing, and capital strategy without chasing every headline.",
    founderTakeaway: "Look for the signal behind the raise: what problem is being funded, what market pressure is being answered, and what that says about your own positioning.",
    businessTakeaway: "The business takeaway is to connect opportunity to a fundable plan, not just a bigger idea."
  },
  ai_operator_impact: {
    whyItMatters: "AI is shifting from novelty into operations. The founders who benefit are the ones who translate tools into workflow, revenue, and risk decisions.",
    whyShared: "Phoenix shared this because it helps business owners separate practical AI leverage from hype.",
    founderTakeaway: "Ask where this signal could reduce friction, increase speed, or create a clearer customer experience inside your own business.",
    businessTakeaway: "The business takeaway is to pick one workflow where AI can create measurable lift before expanding the system."
  },
  ai_consulting: {
    whyItMatters: "AI adoption creates demand for trusted guides who can make implementation understandable, useful, and safe for real businesses.",
    whyShared: "Phoenix shared this because it points to consulting, enablement, and service opportunities for entrepreneurs who can turn complexity into execution.",
    founderTakeaway: "If you want to consult around AI, notice the gap between tool excitement and business implementation. That gap is often the offer.",
    businessTakeaway: "The business takeaway is to package guidance around outcomes: saved time, clearer sales follow-up, better operations, or smarter decision support."
  },
  ai_implementation: {
    whyItMatters: "Implementation is where AI either becomes useful or becomes another subscription nobody uses. The market is rewarding practical rollout capability.",
    whyShared: "Phoenix shared this because the real opportunity is not knowing about AI; it is installing it into the work people already do.",
    founderTakeaway: "Review the handoffs, bottlenecks, and repetitive decisions in your business before choosing tools.",
    businessTakeaway: "The business takeaway is to build an adoption path: one workflow, one owner, one measurable result."
  },
  ai_tools_agents: {
    whyItMatters: "AI agents and tools are moving quickly, but the useful question is still business fit: what can be trusted, delegated, measured, and improved?",
    whyShared: "Phoenix shared this because founders need a grounded lens for tools that may affect sales, marketing, service, and internal operations.",
    founderTakeaway: "Treat this as a cue to identify which tool category could create leverage now and which one still needs human supervision.",
    businessTakeaway: "The business takeaway is to keep AI accountable to a business metric instead of adopting tools because the market is loud."
  },
  business_automation: {
    whyItMatters: "Automation changes margins, response time, and customer experience. It can also expose weak processes if the business automates too early.",
    whyShared: "Phoenix shared this because automation is one of the cleanest bridges from AI attention to business results.",
    founderTakeaway: "Find one repetitive process where a better system would save time or increase follow-up quality this month.",
    businessTakeaway: "The business takeaway is to document the workflow before automating it, then measure whether the change creates real capacity."
  },
  jamstack_ops: {
    whyItMatters: "Modern operating systems for content, campaigns, and websites can be lighter, faster, and cheaper when the architecture is built around static assets and smart automation.",
    whyShared: "Phoenix shared this because technical stack choices affect speed, cost, and how easily a founder can launch campaigns.",
    founderTakeaway: "Look at whether your current website and content system helps you ship quickly or slows every campaign down.",
    businessTakeaway: "The business takeaway is to use simple infrastructure where possible, then reserve complexity for the parts that truly need it."
  },
  ai_revenue: {
    whyItMatters: "AI revenue opportunities are strongest when they connect to a clear buyer, a real business pain, and a repeatable delivery model.",
    whyShared: "Phoenix shared this because attention is only useful when it turns into a practical offer, event, service, or campaign.",
    founderTakeaway: "Ask what someone would pay for if this signal keeps growing: clarity, implementation, training, speed, or a done-with-you rollout.",
    businessTakeaway: "The business takeaway is to turn interest into an offer hypothesis, then test it with a focused audience."
  },
  founder_strategy: {
    whyItMatters: "This points to a founder decision around positioning, pricing, execution, or team focus.",
    whyShared: "Phoenix shared this because entrepreneurs need operating context they can turn into a practical decision.",
    founderTakeaway: "Use this to check whether your current plan still matches the market you are building in.",
    businessTakeaway: "The business takeaway is to turn the signal into one decision: keep, cut, clarify, or test."
  },
  market_regulatory: {
    whyItMatters: "Market and regulatory shifts can quietly change cost, risk, compliance, and customer urgency.",
    whyShared: "Phoenix shared this because founders should see these changes early enough to adjust messaging, operations, or capital planning.",
    founderTakeaway: "Identify whether this creates a risk to manage, a trust angle to explain, or a timing window to act on.",
    businessTakeaway: "The business takeaway is to translate broad market movement into a specific operating question for your company."
  },
  coaching_consulting: {
    whyItMatters: "Coaching and consulting opportunities grow when business owners need help turning complexity into confident action.",
    whyShared: "Phoenix shared this because founder education, consulting, and implementation can sit together when the offer is practical.",
    founderTakeaway: "Look for the place where your experience can help someone make a better decision faster.",
    businessTakeaway: "The business takeaway is to package expertise around a clear before-and-after result."
  },
  wildcard_attention: {
    whyItMatters: "Some signals matter because they capture attention before the business implications are obvious.",
    whyShared: "Phoenix shared this because attention can become useful when it is translated into context, timing, and a next step.",
    founderTakeaway: "Ask whether this is noise, a weak signal, or the start of a pattern worth watching.",
    businessTakeaway: "The business takeaway is to use attention as a doorway into sharper questions, not as the whole strategy."
  }
};

export const DEFAULT_FEED_CONFIGS = [
  {
    id: "founder-market",
    registryPath: DEFAULT_REGISTRY_PATH,
    title: DEFAULT_FEED_TITLE,
    description: DEFAULT_FEED_DESCRIPTION,
    maxItems: MAX_ITEMS,
    outputFiles: {
      xml: "feed.xml",
      json: "feed.json",
      items: "items.json",
      reportMd: "run-report.md",
      reportJson: "run-report.json"
    }
  },
  {
    id: "founder-tools",
    registryPath: TOOLS_REGISTRY_PATH,
    title: FOUNDER_TOOLS_FEED_TITLE,
    description: FOUNDER_TOOLS_FEED_DESCRIPTION,
    maxItems: MAX_ITEMS,
    outputFiles: {
      xml: "tools.xml",
      json: "tools.json",
      items: "tools-items.json",
      reportMd: "tools-run-report.md",
      reportJson: "tools-run-report.json",
      aliases: [
        { from: "tools.xml", to: "ai-attention.xml" },
        { from: "tools.json", to: "ai-attention.json" },
        { from: "tools-items.json", to: "ai-attention-items.json" },
        { from: "tools-run-report.md", to: "ai-attention-run-report.md" },
        { from: "tools-run-report.json", to: "ai-attention-run-report.json" }
      ]
    }
  }
];

const SPONSORED_PATTERN = /\b(sponsor|sponsored|advertorial|brandvoice|partner content|paid content|native ad|promoted)\b/i;

export function decodeEntities(value = "") {
  const named = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: "\"",
    apos: "'",
    nbsp: " ",
    ndash: "-",
    mdash: "-",
    hellip: "..."
  };
  return String(value)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match);
}

export function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanFeedTitle(value = "") {
  return stripHtml(value)
    .replace(/^HN:\s*/i, "")
    .trim();
}

function cleanFeedDescription(value = "") {
  return stripHtml(value)
    .replace(/\bArticle URL:\s*https?:\/\/\S+/gi, " ")
    .replace(/\bComments URL:\s*https?:\/\/\S+/gi, " ")
    .replace(/\bPoints:\s*\d+[\s\S]*$/i, " ")
    .replace(/#\s*Comments:\s*\d+[\s\S]*$/i, " ")
    .replace(/\ban\s+(\$[\d,.]+(?:\s*(?:million|billion|trillion|[MBT]))?)/gi, "a $1")
    .replace(/\s+/g, " ")
    .trim();
}

export function escapeXml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function cdata(value = "") {
  return String(value).replace(/\]\]>/g, "]]]]><![CDATA[>");
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getTag(block, tag) {
  const re = new RegExp(`<${escapeRegExp(tag)}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${escapeRegExp(tag)}>`, "i");
  const match = block.match(re);
  return match ? decodeEntities(match[1]).trim() : "";
}

function getTagAttr(block, tag, attr) {
  const re = new RegExp(`<${escapeRegExp(tag)}\\b[^>]*\\b${escapeRegExp(attr)}=["']([^"']+)["']`, "i");
  const match = block.match(re);
  return match ? decodeEntities(match[1]).trim() : "";
}

function getBlocks(xml, tag) {
  return Array.from(xml.matchAll(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`, "gi"))).map((match) => match[0]);
}

function extractFirstImageUrl(value = "") {
  const match = String(value).match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i);
  return match ? decodeEntities(match[1]).trim() : "";
}

export function parseFeedXml(xml, source) {
  const rssItems = getBlocks(xml, "item");
  const atomItems = rssItems.length ? [] : getBlocks(xml, "entry");
  const blocks = rssItems.length ? rssItems : atomItems;

  return blocks.map((block) => {
    const isAtom = block.toLowerCase().startsWith("<entry");
    const title = cleanFeedTitle(getTag(block, "title"));
    const link = isAtom
      ? getTagAttr(block, "link", "href")
      : stripHtml(getTag(block, "link")) || getTagAttr(block, "link", "href");
    const rawDescription =
      getTag(block, "description") ||
      getTag(block, "summary") ||
      getTag(block, "content:encoded") ||
      getTag(block, "content");
    const publishedAt =
      stripHtml(getTag(block, "pubDate")) ||
      stripHtml(getTag(block, "published")) ||
      stripHtml(getTag(block, "updated")) ||
      stripHtml(getTag(block, "dc:date"));
    const imageUrl =
      getTagAttr(block, "media:content", "url") ||
      getTagAttr(block, "media:thumbnail", "url") ||
      getTagAttr(block, "enclosure", "url") ||
      extractFirstImageUrl(rawDescription) ||
      "";

    return {
      title,
      url: link,
      description: cleanFeedDescription(rawDescription),
      publishedAt,
      imageUrl,
      sourceImageUrl: imageUrl,
      sourceId: source.id,
      sourceName: source.name,
      sourceUrl: source.url,
      sourceScore: Number(source.score ?? 50),
      candidateBuckets: Array.isArray(source.buckets) ? source.buckets : []
    };
  }).filter((item) => item.title && item.url);
}

export function normalizeKey(value = "") {
  return stripHtml(value)
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(the|a|an|and|or|to|of|for|in|on|with|from|how|why|what|when|new)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
  return String(value || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function extractPhoenixImagePath(value = "", siteUrl = DEFAULT_SITE_URL) {
  const imageValue = String(value || "").trim();
  if (!imageValue) return "";
  if (imageValue.startsWith("/images/")) return imageValue;

  if (!/^https?:\/\//i.test(imageValue)) {
    const pathValue = imageValue.startsWith("/") ? imageValue : `/${imageValue}`;
    return pathValue.startsWith("/images/") ? pathValue : "";
  }

  try {
    const imageUrl = new URL(imageValue);
    const normalizedSiteUrl = new URL(normalizeSiteUrl(siteUrl));
    if (imageUrl.origin !== normalizedSiteUrl.origin) return "";

    const basePath = normalizedSiteUrl.pathname.replace(/\/$/, "");
    if (basePath && imageUrl.pathname.startsWith(`${basePath}/images/`)) {
      return imageUrl.pathname.slice(basePath.length);
    }
    if (imageUrl.pathname.startsWith("/images/")) return imageUrl.pathname;
  } catch {
    return "";
  }

  return "";
}

function getOwnedSignalImagePath(item, siteUrl = DEFAULT_SITE_URL) {
  return (
    extractPhoenixImagePath(item.socialImagePath, siteUrl) ||
    extractPhoenixImagePath(item.imagePath, siteUrl) ||
    extractPhoenixImagePath(item.socialImageUrl, siteUrl) ||
    extractPhoenixImagePath(item.imageUrl, siteUrl) ||
    FALLBACK_IMAGES[item.bucket] ||
    "/images/signal-default.jpg"
  );
}

export function slugifySignalTitle(value = "") {
  const slug = normalizeKey(value)
    .replace(/\s+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 78)
    .replace(/-+$/g, "");
  return slug || "phoenix-signal";
}

function shortHash(value = "") {
  return createHash("sha1").update(String(value)).digest("hex").slice(0, 8);
}

export function buildSignalSlug(item) {
  const seed = item.originalUrl || item.url || item.title || item.publishedAt || "phoenix-signal";
  return `${slugifySignalTitle(item.title)}-${shortHash(seed)}`;
}

function getOwnedSignalImageUrl(item, siteUrl = DEFAULT_SITE_URL) {
  const imagePath = getOwnedSignalImagePath(item, siteUrl);
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return `${normalizeSiteUrl(siteUrl)}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
}

function words(value = "") {
  return normalizeKey(value)
    .split(" ")
    .filter((word) => word.length > 3 && !["with", "from", "that", "this", "into", "your", "they", "have", "will"].includes(word));
}

function overlapScore(a = "", b = "") {
  const aWords = new Set(words(a));
  if (!aWords.size) return 0;
  return words(b).reduce((sum, word) => sum + (aWords.has(word) ? 1 : 0), 0);
}

function averageSentenceWords(value = "") {
  const sentences = String(value)
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (!sentences.length) return 0;
  const totalWords = sentences.reduce((sum, sentence) => sum + sentence.split(/\s+/).filter(Boolean).length, 0);
  return Number((totalWords / sentences.length).toFixed(1));
}

function buildPlainLanguageSummary(item) {
  const title = cleanFeedTitle(item.title || "This signal");
  const bucket = item.bucketLabel || "Founder Signal";
  const source = item.sourceName || "a public source";
  if (item.bucket === "funding_venture" || item.bucket === "capital_credit") {
    return `${title} means money, trust, or timing may be changing. If you are building, use this to think about what proof investors, lenders, or customers may want next.`;
  }
  if (item.bucket === "ai_tools_agents" || item.bucket === "ai_implementation" || item.bucket === "business_automation") {
    return `${title} points to a tool or workflow shift. Use this to ask what task could get faster, cheaper, or easier this week.`;
  }
  if (item.bucket === "market_regulatory") {
    return `${title} may change the rules, risks, or costs around a market. Use this to spot what could affect your plan before it becomes urgent.`;
  }
  return `${source} flagged a ${bucket.toLowerCase()} story. Use this to see what changed, why it matters, and what to watch next.`;
}

function buildEngagementPrompt(item) {
  if (item.bucket === "funding_venture" || item.bucket === "capital_credit") {
    return "What would this change about your funding story? Drop your takeaway below.";
  }
  if (item.bucket === "ai_tools_agents" || item.bucket === "ai_implementation" || item.bucket === "business_automation") {
    return "Would you test this tool or workflow? Drop your takeaway below.";
  }
  return "What is your takeaway from this signal? Drop it below.";
}

function buildTrendContext(item, relatedSignals = []) {
  if (relatedSignals.length) {
    return `This connects to recent Phoenix signals about ${relatedSignals.map((signal) => signal.bucketLabel || "market shifts").slice(0, 2).join(" and ")}. The pattern to watch is whether this becomes a one-off headline or a repeated market move.`;
  }
  if (item.bucket === "funding_venture") {
    return "The pattern to watch is where capital keeps flowing and what kind of proof gets rewarded next.";
  }
  if (item.bucket === "ai_tools_agents") {
    return "The pattern to watch is whether this moves from demo excitement into real daily workflow value.";
  }
  return "The pattern to watch is whether more sources start pointing to the same shift.";
}

function buildRelatedRecentSignals(item, recentItems = []) {
  const currentKey = normalizeKey(item.originalUrl || item.url || item.title);
  return recentItems
    .map((recent) => {
      const phoenix = recent._phoenix || recent;
      const recentTitle = recent.title || phoenix.title || "";
      const recentKey = normalizeKey(phoenix.originalUrl || recent.external_url || recent.url || recentTitle);
      if (!recentTitle || recentKey === currentKey) return null;
      const score =
        (phoenix.bucket && phoenix.bucket === item.bucket ? 4 : 0) +
        overlapScore(`${item.title} ${item.description}`, `${recentTitle} ${recent.content_text || ""}`);
      if (score < 3) return null;
      return {
        title: recentTitle,
        slug: phoenix.slug || "",
        url: phoenix.internalUrl || recent.url || "",
        bucket: phoenix.bucket || "",
        bucketLabel: (recent.tags && recent.tags[0]) || phoenix.bucketLabel || "",
        score,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ score, ...signal }) => signal);
}

function buildPhoenixContext(item) {
  const bucketContext = SIGNAL_CONTEXT_BY_BUCKET[item.bucket] ?? SIGNAL_CONTEXT_BY_BUCKET.wildcard_attention;
  const bucketLabel = item.bucketLabel || BUCKET_LABELS[item.bucket] || "Founder Intelligence";
  const source = item.sourceName || "a public source";
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  if (
    /\b(anthropic|openai|claude|chatgpt|frontier model|foundation model)\b/i.test(text) &&
    /\b(valuation|funding|fundraising|raise|raised|investor|ipo|billion)\b/i.test(text)
  ) {
    return {
      whyItMatters: "This is not just another big AI number. A near-trillion-dollar private valuation shows investors are rewarding enterprise adoption, revenue velocity, compute access, and the belief that frontier AI will keep consolidating attention.",
      whyShared: "Phoenix shared this because Anthropic's valuation jump reframes the AI funding race: the market is not only watching model quality, it is pricing distribution, trust, infrastructure, and the path to durable revenue.",
      founderTakeaway: "Do not copy frontier-lab economics. Use the signal to ask what proof your own AI-enabled offer can show: adoption, retention, workflow value, or a credible reason customers will keep paying.",
      businessTakeaway: "The practical move is to tighten the evidence behind the story before chasing attention: who uses it, why it matters now, what gets measurably better, and why the advantage can last."
    };
  }
  const defaults = {
    whyItMatters: `This ${bucketLabel.toLowerCase()} signal points to a market shift founders should not treat as background noise.`,
    whyShared: `Phoenix shared this because ${source} surfaced a signal that can help entrepreneurs make better decisions about AI, funding, operations, or revenue.`,
    founderTakeaway: "Use this as a prompt to decide what to watch, what to test, and what to tighten inside the business.",
    businessTakeaway: "The business takeaway is to turn attention into one concrete operating question."
  };
  return { ...defaults, ...bucketContext };
}

export function enrichSignalItem(item, options = {}) {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const context = buildPhoenixContext(item);
  const slug = item.slug || buildSignalSlug(item);
  const internalPath = item.internalPath || `/founder-signal/signals/${slug}`;
  const internalUrl = item.internalUrl || `${siteUrl}${internalPath}/`;
  const originalUrl = item.originalUrl || item.url || "";
  const sourceImageUrl = item.sourceImageUrl ||
    (/^https?:\/\//i.test(item.imageUrl || "") && !extractPhoenixImagePath(item.imageUrl, siteUrl) ? item.imageUrl : "");
  const creativeDirection = assignImageCreativeDirection(item);
  const imageBrief = {
    ...(item.imageBrief || createImageBrief({ ...item, sourceImageUrl, ...creativeDirection })),
    ...creativeDirection
  };
  const socialImagePath = getOwnedSignalImagePath(item, siteUrl);
  const imageUrl = getOwnedSignalImageUrl({ ...item, socialImagePath }, siteUrl);

  return {
    ...item,
    slug,
    internalPath,
    internalUrl,
    originalUrl,
    sourceImageUrl,
    imageBrief,
    imagePath: item.imagePath || socialImagePath,
    imageUrl,
    socialImagePath,
    socialImageUrl: imageUrl,
    imageStrategy: item.imageStrategy || "fallback-editorial",
    imageFamily: item.imageFamily || imageBrief.imageFamily,
    imageSourceType: item.imageSourceType || "phoenix-owned",
    imageCredit: item.imageCredit || "Phoenix Venture Studios image library",
    imageRightsStatus: item.imageRightsStatus || "owned-or-licensed",
    imageTemplate: item.imageTemplate || imageBrief.template,
    imageVariant: item.imageVariant || imageBrief.imageVariant,
    imageTone: item.imageTone || imageBrief.imageTone,
    imageComposition: item.imageComposition || imageBrief.imageComposition,
    imageWarnings: item.imageWarnings || [],
    whyItMatters: item.whyItMatters || context.whyItMatters,
    whyShared: item.whyShared || context.whyShared,
    founderTakeaway: item.founderTakeaway || context.founderTakeaway,
    businessTakeaway: item.businessTakeaway || context.businessTakeaway
  };
}

export function classifyItem(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const allowed = item.candidateBuckets.length ? item.candidateBuckets : Object.keys(BUCKET_LABELS);
  const scores = allowed.map((bucket) => {
    const keywords = BUCKET_KEYWORDS[bucket] ?? [];
    const score = keywords.reduce((sum, keyword) => {
      const re = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
      return sum + (re.test(text) ? 1 : 0);
    }, 0);
    return { bucket, score };
  }).sort((a, b) => b.score - a.score);

  return scores[0]?.score > 0 ? scores[0].bucket : allowed[0] ?? "wildcard_attention";
}

function ageInDays(publishedAt, now) {
  const date = Date.parse(publishedAt);
  if (!Number.isFinite(date)) return 30;
  return Math.max(0, (now.getTime() - date) / 86400000);
}

function recencyScore(days) {
  if (days <= 1) return 30;
  if (days <= 3) return 24;
  if (days <= 7) return 18;
  if (days <= 14) return 8;
  return -10;
}

function headlineStrength(title) {
  let score = 0;
  if (/[0-9]/.test(title)) score += 8;
  if (/[$%]/.test(title)) score += 6;
  if (/\b(ai|capital|credit|funding|founder|business|startup|loan|operator|strategy|venture|agentic|gentic|app|builder|tool|coding)\b/i.test(title)) score += 8;
  if (title.length >= 45 && title.length <= 110) score += 5;
  if (title.length > 140) score -= 6;
  return score;
}

function countPhraseMatches(text = "", keywords = []) {
  const haystack = String(text).toLowerCase();
  return keywords.reduce((sum, keyword) => (
    haystack.includes(String(keyword).toLowerCase()) ? sum + 1 : sum
  ), 0);
}

function phraseScore(text = "", keywords = [], pointsPerMatch = 4, maxPoints = 24) {
  if (!keywords.length) return 0;
  return Math.min(countPhraseMatches(text, keywords) * pointsPerMatch, maxPoints);
}

export function scoreItem(item, now = new Date(), options = {}) {
  const bucket = classifyItem(item);
  const sponsored = SPONSORED_PATTERN.test(`${item.title} ${item.description} ${item.url}`);
  const days = ageInDays(item.publishedAt, now);
  const bucketKeywords = BUCKET_KEYWORDS[bucket] ?? [];
  const text = `${item.title} ${item.description}`.toLowerCase();
  const preferredKeywords = options.preferredKeywords ?? [];
  const penaltyKeywords = options.penaltyKeywords ?? [];
  const keywordScore = bucketKeywords.reduce((sum, keyword) => {
    const re = new RegExp(`\\b${escapeRegExp(keyword)}\\b`, "i");
    return sum + (re.test(text) ? 2 : 0);
  }, 0);
  const preferredKeywordHits = countPhraseMatches(text, preferredKeywords);
  const penaltyKeywordHits = countPhraseMatches(text, penaltyKeywords);

  const score =
    recencyScore(days) +
    Math.round(item.sourceScore / 4) +
    headlineStrength(item.title) +
    Math.min(keywordScore, 18) +
    phraseScore(text, preferredKeywords, 5, 25) -
    phraseScore(text, penaltyKeywords, 14, 70) +
    (item.description ? 4 : 0) -
    (sponsored ? 120 : 0);

  return {
    ...item,
    bucket,
    bucketLabel: BUCKET_LABELS[bucket] ?? bucket,
    score,
    ageDays: Number(days.toFixed(2)),
    preferredKeywordHits,
    penaltyKeywordHits,
    excluded: sponsored,
    excludeReason: sponsored ? "sponsored_or_paid_content" : ""
  };
}

function itemMatchesKeywordList(item, keywords = []) {
  if (!keywords.length) return false;
  const text = `${item.title} ${item.description} ${item.url}`.toLowerCase();
  return keywords.some((keyword) => text.includes(String(keyword).toLowerCase()));
}

export function dedupeItems(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = normalizeKey(item.title);
    const existing = byKey.get(key);
    if (!existing || item.score > existing.score) byKey.set(key, item);
  }
  return Array.from(byKey.values());
}

export function selectItems(scoredItems, targets, limit = MAX_ITEMS, options = {}) {
  const candidates = dedupeItems(scoredItems)
    .filter((item) => !item.excluded)
    .sort((a, b) => b.score - a.score);
  const selected = [];
  const selectedKeys = new Set();
  const bucketCounts = {};
  const sourceCounts = {};
  const maxPerSource = options.maxPerSource ?? Infinity;

  const canSelect = (item) => {
    const key = normalizeKey(item.title);
    const sourceKey = item.sourceId || item.sourceName || "unknown";
    return !selectedKeys.has(key) && selected.length < limit && (sourceCounts[sourceKey] ?? 0) < maxPerSource;
  };

  const addItem = (item) => {
    const key = normalizeKey(item.title);
    const sourceKey = item.sourceId || item.sourceName || "unknown";
    selected.push(item);
    selectedKeys.add(key);
    sourceCounts[sourceKey] = (sourceCounts[sourceKey] ?? 0) + 1;
    bucketCounts[item.bucket] = (bucketCounts[item.bucket] ?? 0) + 1;
  };

  for (const [bucket, target] of Object.entries(targets)) {
    const bucketItems = candidates.filter((item) => item.bucket === bucket);
    for (const item of bucketItems.slice(0, target)) {
      if (!canSelect(item)) continue;
      addItem(item);
    }
  }

  for (const item of candidates) {
    if (selected.length >= limit) break;
    if (!canSelect(item)) continue;
    addItem(item);
  }

  return {
    selected: selected.sort((a, b) => b.score - a.score),
    bucketCounts,
    sourceCounts
  };
}

export function buildFeedXml(items, options = {}) {
  const now = options.now ?? new Date();
  const siteUrl = options.siteUrl ?? DEFAULT_SITE_URL;
  const title = options.title ?? DEFAULT_FEED_TITLE;
  const description = options.description ?? DEFAULT_FEED_DESCRIPTION;
  const feedFile = options.feedFile ?? "feed.xml";
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const feedUrl = `${normalizedSiteUrl}/rss/${feedFile}`;
  const enrichedItems = applyAutonomousEditorialLayer(
    items.map((item) => enrichSignalItem(item, { siteUrl: normalizedSiteUrl })),
    { feedId: options.feedId || options.id || "founder-market", recentItems: options.recentItems || [] }
  );
  const itemXml = enrichedItems.map((item) => {
    const itemDescription = [
      item.description,
      item.simpleSummary ? `Phoenix brief: ${item.simpleSummary}` : "",
      item.whyItMatters ? `Why it matters: ${item.whyItMatters}` : "",
      item.founderTakeaway ? `Founder takeaway: ${item.founderTakeaway}` : "",
      item.trendContext ? `Trend to watch: ${item.trendContext}` : "",
      item.engagementPrompt ? `Engagement: ${item.engagementPrompt}` : "",
      `Phoenix bucket: ${item.bucketLabel}.`,
      `Source: ${item.sourceName}.`
    ].filter(Boolean).join(" ");
    return `    <item>
      <title><![CDATA[${cdata(item.title)}]]></title>
      <description><![CDATA[${cdata(itemDescription)}]]></description>
      <link>${escapeXml(item.internalUrl)}</link>
      <guid isPermaLink="true">${escapeXml(item.internalUrl)}</guid>
      <pubDate>${new Date(Date.parse(item.publishedAt) || now.getTime()).toUTCString()}</pubDate>
      <source url="${escapeXml(item.originalUrl || item.sourceUrl)}"><![CDATA[${cdata(item.sourceName)}]]></source>
      <category><![CDATA[${cdata(item.bucketLabel)}]]></category>
      <enclosure url="${escapeXml(item.imageUrl)}" type="image/jpeg" length="0" />
    </item>`;
  }).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(title)}</title>
    <description>${escapeXml(description)}</description>
    <link>${escapeXml(normalizedSiteUrl)}</link>
    <atom:link href="${escapeXml(feedUrl)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    <language>en-us</language>
    <generator>Phoenix Venture Studios Static RSS Generator</generator>
${itemXml}
  </channel>
</rss>
`;
}

export function buildFeedJson(items, options = {}) {
  const now = options.now ?? new Date();
  const siteUrl = options.siteUrl ?? DEFAULT_SITE_URL;
  const title = options.title ?? DEFAULT_FEED_TITLE;
  const description = options.description ?? DEFAULT_FEED_DESCRIPTION;
  const feedFile = options.feedFile ?? "feed.json";
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const enrichedItems = applyAutonomousEditorialLayer(
    items.map((item) => enrichSignalItem(item, { siteUrl: normalizedSiteUrl })),
    { feedId: options.feedId || options.id || "founder-market", recentItems: options.recentItems || [] }
  );
  return {
    version: "https://jsonfeed.org/version/1.1",
    title,
    home_page_url: normalizedSiteUrl,
    feed_url: `${normalizedSiteUrl}/rss/${feedFile}`,
    description,
    generated_at: now.toISOString(),
    items: enrichedItems.map((item) => ({
      id: item.internalUrl,
      url: item.internalUrl,
      external_url: item.originalUrl,
      title: item.title,
      content_text: item.description,
      image: item.socialImageUrl || item.imageUrl,
      banner_image: item.socialImageUrl || item.imageUrl,
      date_published: new Date(Date.parse(item.publishedAt) || now.getTime()).toISOString(),
      authors: [{ name: item.sourceName }],
      tags: [item.bucketLabel],
      _phoenix: {
        bucket: item.bucket,
        score: item.score,
        source: item.sourceName,
        slug: item.slug,
        imageUrl: item.imageUrl,
        socialImageUrl: item.socialImageUrl || item.imageUrl,
        socialImagePath: item.socialImagePath || item.imagePath || "",
        sourceImageUrl: "",
        imageStrategy: item.imageStrategy,
        imageFamily: item.imageFamily,
        imageSourceType: item.imageSourceType,
        imageCredit: item.imageCredit,
        imageRightsStatus: item.imageRightsStatus,
        imageTemplate: item.imageTemplate,
        imageVariant: item.imageVariant,
        imageTone: item.imageTone,
        imageComposition: item.imageComposition,
        imageWarnings: item.imageWarnings || [],
        imageBrief: item.imageBrief,
        feedRole: item.feedRole,
        simpleSummary: item.simpleSummary,
        engagementPrompt: item.engagementPrompt,
        trendContext: item.trendContext,
        relatedRecentSignals: item.relatedRecentSignals || [],
        readingLevel: item.readingLevel,
        editorialMode: item.editorialMode,
        internalPath: item.internalPath,
        internalUrl: item.internalUrl,
        originalUrl: item.originalUrl,
        whyItMatters: item.whyItMatters,
        whyShared: item.whyShared,
        founderTakeaway: item.founderTakeaway,
        businessTakeaway: item.businessTakeaway
      }
    }))
  };
}

export function validateRss(xml) {
  return /^<\?xml[\s\S]*<rss\b[\s\S]*<channel>[\s\S]*<\/channel>[\s\S]*<\/rss>\s*$/i.test(xml);
}

async function fetchText(url, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PhoenixVentureStudiosRSS/1.0 (+https://phoenixventurestudios.com)"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function readOptionalJson(filePath, fallback) {
  try {
    return await readJson(filePath);
  } catch {
    return fallback;
  }
}

async function writeJson(filePath, data) {
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readRecentFeedItems(outputDir, feedFiles = []) {
  const items = [];
  const seen = new Set();
  for (const file of feedFiles) {
    if (!file) continue;
    const feedPath = path.join(outputDir, file);
    const raw = await fs.readFile(feedPath, "utf8").catch(() => "");
    if (!raw) continue;
    try {
      const feed = JSON.parse(raw);
      for (const item of feed.items || []) {
        const key = normalizeKey(item._phoenix?.originalUrl || item.external_url || item.url || item.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        items.push(item);
      }
    } catch {
      // A damaged prior feed should not stop a fresh run; validation handles the new output.
    }
  }
  return items;
}

async function writeOutputAliases(outputDir, aliases = []) {
  const written = [];
  for (const alias of aliases) {
    if (!alias?.from || !alias?.to) continue;
    await fs.copyFile(path.join(outputDir, alias.from), path.join(outputDir, alias.to));
    written.push(alias);
  }
  return written;
}

function reportMarkdown(report) {
  const lines = [
    "# Phoenix RSS Run Report",
    "",
    `- Feed: ${report.feedId}`,
    `- Title: ${report.title}`,
    `- Generated: ${report.generatedAt}`,
    `- Dry run: ${report.dryRun ? "yes" : "no"}`,
    `- Sources enabled: ${report.sources.enabled}`,
    `- Sources fetched: ${report.sources.fetched}`,
    `- Source errors: ${report.sources.errors.length}`,
    `- Parsed items: ${report.items.parsed}`,
    `- Keyword filtered items: ${report.items.keywordFiltered}`,
    `- Selected items: ${report.items.selected}`,
    `- Social cards generated: ${report.images?.generated ?? 0}/${report.images?.attempted ?? 0}`,
    `- Social card errors: ${report.images?.errors?.length ?? 0}`,
    `- Manual image review needed: ${report.images?.manualReviewNeeded ?? 0}`,
    `- Feed valid: ${report.feedValid ? "yes" : "no"}`,
    `- Preserved previous feed: ${report.preservedPreviousFeed ? "yes" : "no"}`,
    "",
    "## Bucket Counts",
    ""
  ];
  for (const [bucket, count] of Object.entries(report.bucketCounts)) {
    lines.push(`- ${BUCKET_LABELS[bucket] ?? bucket}: ${count}`);
  }
  if (Object.keys(report.sourceCounts ?? {}).length) {
    lines.push("", "## Source Counts", "");
    for (const [source, count] of Object.entries(report.sourceCounts)) {
      lines.push(`- ${source}: ${count}`);
    }
  }
  if (Object.keys(report.images?.strategyCounts ?? {}).length) {
    lines.push("", "## Image Strategy Counts", "");
    for (const [strategy, count] of Object.entries(report.images.strategyCounts)) {
      lines.push(`- ${strategy}: ${count}`);
    }
  }
  if (Object.keys(report.images?.familyCounts ?? {}).length) {
    lines.push("", "## Image Family Counts", "");
    for (const [family, count] of Object.entries(report.images.familyCounts)) {
      lines.push(`- ${family}: ${count}`);
    }
  }
  if (Object.keys(report.images?.variantCounts ?? {}).length) {
    lines.push("", "## Image Variety Audit", "");
    lines.push(`- Max consecutive family repeats: ${report.images.variety?.maxConsecutiveFamily ?? 0}`);
    for (const [variant, count] of Object.entries(report.images.variantCounts)) {
      lines.push(`- Variant ${variant}: ${count}`);
    }
    for (const [composition, count] of Object.entries(report.images.compositionCounts ?? {})) {
      lines.push(`- Composition ${composition}: ${count}`);
    }
  }
  if (report.selectedItems.length) {
    lines.push("", "## Selected Items", "");
    for (const item of report.selectedItems) {
      lines.push(`- [${item.bucketLabel}] ${item.title} (${item.sourceName}, score ${item.score})`);
    }
  }
  if (report.sources.errors.length) {
    lines.push("", "## Source Errors", "");
    for (const error of report.sources.errors) {
      lines.push(`- ${error.source}: ${error.error}`);
    }
  }
  if (report.images?.errors?.length) {
    lines.push("", "## Social Card Errors", "");
    for (const error of report.images.errors) {
      lines.push(`- ${error.slug || error.title || "unknown"}: ${error.error}`);
    }
  }
  if (report.copy?.warnings?.length) {
    lines.push("", "## Copy Repetition Warnings", "");
    for (const warning of report.copy.warnings) {
      lines.push(`- ${warning.warning}`);
    }
  }
  if (report.editorial?.warnings?.length) {
    lines.push("", "## Editorial Warnings", "");
    for (const warning of report.editorial.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  if (report.aliases?.written?.length) {
    lines.push("", "## Feed Aliases", "");
    for (const alias of report.aliases.written) {
      lines.push(`- ${alias.from} -> ${alias.to}`);
    }
  }
  if (report.validation?.errors?.length) {
    lines.push("", "## Validation Errors", "");
    for (const error of report.validation.errors) {
      lines.push(`- ${error}`);
    }
  }
  return `${lines.join("\n")}\n`;
}

function countBy(items, key) {
  return items.reduce((counts, item) => {
    const value = item[key] || "unknown";
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

const COMPATIBLE_IMAGE_FAMILIES = {
  ai_risk: ["ai_risk", "market_shock", "operational_leverage"],
  ai_opportunity: ["ai_opportunity", "operational_leverage", "founder_pressure"],
  founder_pressure: ["founder_pressure", "operational_leverage", "consulting_revenue"],
  capital_readiness: ["capital_readiness", "founder_pressure", "market_shock"],
  market_shock: ["market_shock", "ai_risk", "capital_readiness"],
  operational_leverage: ["operational_leverage", "ai_opportunity", "founder_pressure"],
  consulting_revenue: ["consulting_revenue", "event_workshop", "founder_pressure"],
  event_workshop: ["event_workshop", "consulting_revenue", "founder_pressure"],
  wildcard_attention: ["wildcard_attention", "ai_opportunity", "founder_pressure"]
};

function selectAlternateFamily(item, usedCounts, previousFamily = "") {
  const currentFamily = item.imageBrief?.imageFamily || item.imageFamily || "wildcard_attention";
  const candidates = COMPATIBLE_IMAGE_FAMILIES[currentFamily] || COMPATIBLE_IMAGE_FAMILIES.wildcard_attention;
  const seed = item.slug || item.originalUrl || item.url || item.title || currentFamily;
  const offset = Number.parseInt(createHash("sha1").update(seed).digest("hex").slice(0, 4), 16) % candidates.length;
  const ordered = [...candidates.slice(offset), ...candidates.slice(0, offset)];
  return ordered
    .filter((family) => family !== currentFamily)
    .sort((a, b) => (usedCounts[a] ?? 0) - (usedCounts[b] ?? 0))
    .find((family) => family !== previousFamily) || currentFamily;
}

function applyImageVariety(items) {
  const maxConsecutiveFamily = 2;
  const maxFamilyShare = Math.max(3, Math.ceil(items.length * 0.4));
  const usedCounts = {};
  const warnings = [];
  let previousFamily = "";
  let consecutive = 0;

  const variedItems = items.map((item) => {
    const creativeDirection = assignImageCreativeDirection(item);
    const imageBrief = {
      ...(item.imageBrief || createImageBrief({ ...item, ...creativeDirection })),
      ...creativeDirection
    };
    let family = imageBrief.imageFamily || item.imageFamily || "wildcard_attention";
    const wouldRepeatTooMuch = family === previousFamily && consecutive >= maxConsecutiveFamily;
    const wouldDominateRun = (usedCounts[family] ?? 0) >= maxFamilyShare;

    if (wouldRepeatTooMuch || wouldDominateRun) {
      const alternateFamily = selectAlternateFamily({ ...item, imageBrief }, usedCounts, previousFamily);
      if (alternateFamily !== family) {
        warnings.push({
          slug: item.slug,
          title: item.title,
          warning: `Image family variety reassigned ${family} to ${alternateFamily}.`
        });
        family = alternateFamily;
      }
    }

    consecutive = family === previousFamily ? consecutive + 1 : 1;
    previousFamily = family;
    usedCounts[family] = (usedCounts[family] ?? 0) + 1;

    const imageWarnings = [
      ...(item.imageWarnings || []),
      ...warnings
        .filter((warning) => warning.slug === item.slug)
        .map((warning) => warning.warning)
    ];

    return {
      ...item,
      ...creativeDirection,
      imageFamily: family,
      imageBrief: {
        ...imageBrief,
        preferredImageFamily: imageBrief.preferredImageFamily || imageBrief.imageFamily || family,
        imageFamily: family,
      },
      imageWarnings,
    };
  });

  return {
    items: variedItems,
    warnings,
    audit: buildImageVarietyAudit(variedItems, warnings)
  };
}

function buildImageVarietyAudit(items, warnings = []) {
  let maxConsecutiveFamily = 0;
  let currentFamily = "";
  let currentRun = 0;

  for (const item of items) {
    const family = item.imageFamily || "unknown";
    if (family === currentFamily) {
      currentRun += 1;
    } else {
      currentFamily = family;
      currentRun = 1;
    }
    maxConsecutiveFamily = Math.max(maxConsecutiveFamily, currentRun);
  }

  const familyCounts = countBy(items, "imageFamily");
  const dominantFamily = Object.entries(familyCounts).sort((a, b) => b[1] - a[1])[0] || ["unknown", 0];
  const errors = [];
  if (maxConsecutiveFamily > 2) errors.push(`imageFamily repeats ${maxConsecutiveFamily} times consecutively`);
  if ((dominantFamily[1] ?? 0) > Math.max(4, Math.ceil(items.length * 0.5))) {
    errors.push(`imageFamily ${dominantFamily[0]} dominates ${dominantFamily[1]}/${items.length} selected items`);
  }

  return {
    familyCounts,
    variantCounts: countBy(items, "imageVariant"),
    toneCounts: countBy(items, "imageTone"),
    compositionCounts: countBy(items, "imageComposition"),
    maxConsecutiveFamily,
    dominantFamily: dominantFamily[0],
    dominantFamilyCount: dominantFamily[1] ?? 0,
    warnings,
    errors,
  };
}

function normalizeCopyForAudit(value = "") {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function buildCopyRepetitionAudit(items) {
  const fields = ["whyItMatters", "whyShared", "founderTakeaway", "businessTakeaway"];
  const repeated = [];

  for (const field of fields) {
    const byText = new Map();
    for (const item of items) {
      const key = normalizeCopyForAudit(item[field]);
      if (!key) continue;
      const entry = byText.get(key) || { field, text: item[field], count: 0, slugs: [] };
      entry.count += 1;
      entry.slugs.push(item.slug);
      byText.set(key, entry);
    }
    repeated.push(...Array.from(byText.values()).filter((entry) => entry.count > 2));
  }

  return {
    repeated,
    warnings: repeated.map((entry) => ({
      field: entry.field,
      count: entry.count,
      slugs: entry.slugs,
      warning: `${entry.field} repeats across ${entry.count} selected items; consider a sharper Phoenix take in the next editorial pass.`
    }))
  };
}

function applyAutonomousEditorialLayer(items, options = {}) {
  const recentItems = options.recentItems || [];
  const feedId = options.feedId || "founder-market";
  return items.map((item) => {
    const relatedRecentSignals = buildRelatedRecentSignals(item, recentItems);
    const simpleSummary = item.simpleSummary || buildPlainLanguageSummary(item);
    const engagementPrompt = item.engagementPrompt || buildEngagementPrompt(item);
    const trendContext = item.trendContext || buildTrendContext(item, relatedRecentSignals);
    const combinedCopy = [
      item.whyItMatters,
      item.whyShared,
      item.founderTakeaway,
      simpleSummary,
      trendContext,
      engagementPrompt
    ].filter(Boolean).join(" ");

    return {
      ...item,
      feedRole: feedId === "founder-tools" || feedId === "ai-attention" ? "founder-tools" : "founder-market",
      simpleSummary,
      engagementPrompt,
      trendContext,
      relatedRecentSignals,
      readingLevel: {
        target: "grade-5-plain-founder",
        heuristic: "average sentence words",
        averageSentenceWords: averageSentenceWords(combinedCopy),
      },
      editorialMode: "phoenix-original-brief",
    };
  });
}

function buildEditorialQualityAudit(items) {
  const warnings = [];
  const errors = [];
  const bannedWeakPhrases = [
    "money is moving, tightening, or being redirected",
    "founder strategy signals show where execution",
    "not just more news",
    "another saved article"
  ];

  for (const item of items) {
    const slug = item.slug || item.title || "unknown";
    const fields = [
      item.whyItMatters,
      item.whyShared,
      item.founderTakeaway,
      item.businessTakeaway,
      item.simpleSummary,
      item.trendContext,
      item.engagementPrompt,
    ].filter(Boolean);
    const combined = fields.join(" ").toLowerCase();

    if (!item.simpleSummary) errors.push(`${slug}: missing simpleSummary`);
    if (!item.engagementPrompt) errors.push(`${slug}: missing engagementPrompt`);
    if (!item.trendContext) errors.push(`${slug}: missing trendContext`);
    if (!Array.isArray(item.relatedRecentSignals)) errors.push(`${slug}: missing relatedRecentSignals array`);
    if (!item.editorialMode) errors.push(`${slug}: missing editorialMode`);
    if ((item.readingLevel?.averageSentenceWords ?? 99) > 24) {
      warnings.push(`${slug}: reading level heuristic is above target (${item.readingLevel.averageSentenceWords} avg sentence words)`);
    }
    for (const phrase of bannedWeakPhrases) {
      if (combined.includes(phrase)) {
        errors.push(`${slug}: weak/generic editorial phrase is not allowed: ${phrase}`);
      }
    }
    if (!/\b(use|watch|ask|look|test|expect|notice|spot)\b/i.test(fields.join(" "))) {
      warnings.push(`${slug}: editorial copy lacks a clear reader-directed action`);
    }
  }

  return { warnings, errors };
}

const REQUIRED_PHOENIX_FIELDS = [
  "slug",
  "internalUrl",
  "originalUrl",
  "socialImageUrl",
  "socialImagePath",
  "imageStrategy",
  "imageFamily",
  "imageRightsStatus",
  "imageBrief",
  "imageVariant",
  "imageTone",
  "imageComposition",
  "feedRole",
  "simpleSummary",
  "engagementPrompt",
  "trendContext",
  "readingLevel",
  "editorialMode"
];

function isGeneratedSignalImagePath(value = "", siteUrl = DEFAULT_SITE_URL) {
  return extractPhoenixImagePath(value, siteUrl).startsWith("/images/signals/generated/");
}

function hasVisibilityWarning(item) {
  return (item.imageWarnings || []).some((warning) =>
    /manual review|reference-only|disallowed|unmatched source|fallback/i.test(String(warning))
  );
}

async function validateSelectedItems(items, options = {}) {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const socialImageOutputRoot = options.socialImageOutputRoot ?? path.join(APP_ROOT, "public");
  const sourceImageAllowlist = options.sourceImageAllowlist ?? DEFAULT_IMAGE_SOURCE_ALLOWLIST;
  const errors = [];
  const varietyAudit = buildImageVarietyAudit(items);
  const editorialAudit = buildEditorialQualityAudit(items);
  errors.push(...varietyAudit.errors);
  errors.push(...editorialAudit.errors);

  for (const item of items) {
    for (const field of REQUIRED_PHOENIX_FIELDS) {
      if (!item[field]) errors.push(`${item.slug || item.title || "unknown"}: missing ${field}`);
    }

    if (!String(item.internalUrl || "").includes("/founder-signal/signals/")) {
      errors.push(`${item.slug || item.title || "unknown"}: internalUrl must use /founder-signal/signals/`);
    }

    if (!/^https?:\/\//i.test(String(item.originalUrl || ""))) {
      errors.push(`${item.slug || item.title || "unknown"}: originalUrl must remain a publisher/source URL`);
    }

    if (String(item.originalUrl || "") === String(item.internalUrl || "")) {
      errors.push(`${item.slug || item.title || "unknown"}: originalUrl must not be replaced with the Phoenix internal URL`);
    }

    if (!isGeneratedSignalImagePath(item.socialImagePath, siteUrl)) {
      errors.push(`${item.slug || item.title || "unknown"}: socialImagePath must resolve under /images/signals/generated/`);
    }

    if (!isGeneratedSignalImagePath(item.socialImageUrl, siteUrl)) {
      errors.push(`${item.slug || item.title || "unknown"}: socialImageUrl must resolve to a Phoenix-owned generated image`);
    }

    if (!isGeneratedSignalImagePath(item.imageUrl, siteUrl)) {
      errors.push(`${item.slug || item.title || "unknown"}: imageUrl must resolve to a Phoenix-owned generated image`);
    }

    const socialImagePath = extractPhoenixImagePath(item.socialImagePath, siteUrl);
    if (socialImagePath) {
      const imageFilePath = path.join(socialImageOutputRoot, socialImagePath.replace(/^\//, ""));
      try {
        await fs.access(imageFilePath);
      } catch {
        errors.push(`${item.slug || item.title || "unknown"}: generated image file missing at ${socialImagePath}`);
      }
    }

    const sourcePolicy = resolveSourceImagePolicy(item, sourceImageAllowlist);
    if (sourcePolicy.policy !== "allowed") {
      if (!item.imageBrief?.manualReviewNeeded) {
        errors.push(`${item.slug || item.title || "unknown"}: non-public source policy must set imageBrief.manualReviewNeeded`);
      }
      if (!hasVisibilityWarning(item)) {
        errors.push(`${item.slug || item.title || "unknown"}: non-public source policy must emit a visibility warning`);
      }
      if (item.imageSourceType !== "phoenix-owned") {
        errors.push(`${item.slug || item.title || "unknown"}: non-public source policy must fall back to Phoenix-owned imagery`);
      }
    }

    if (sourcePolicy.policy !== "allowed" && item.imageStrategy === "source-allowlisted") {
      errors.push(`${item.slug || item.title || "unknown"}: source-allowlisted strategy cannot be used for non-allowed source images`);
    }
  }

  return { errors, varietyAudit, editorialAudit };
}

export async function buildStaticRss(options = {}) {
  const now = options.now ?? new Date();
  const registryPath = options.registryPath ?? DEFAULT_REGISTRY_PATH;
  const outputDir = options.outputDir ?? DEFAULT_OUTPUT_DIR;
  const siteUrl =
    options.siteUrl ??
    process.env.PHOENIX_RSS_SITE_URL ??
    process.env.SITE_URL ??
    DEFAULT_SITE_URL;
  const imageSourceAllowlistPath = options.imageSourceAllowlistPath ?? DEFAULT_IMAGE_SOURCE_ALLOWLIST_PATH;
  const dryRun = options.dryRun ?? false;
  const feedId = options.id ?? options.feedId ?? "founder-intelligence";
  const title = options.title ?? DEFAULT_FEED_TITLE;
  const description = options.description ?? DEFAULT_FEED_DESCRIPTION;
  const maxItems = options.maxItems ?? MAX_ITEMS;
  const outputFiles = {
    xml: "feed.xml",
    json: "feed.json",
    items: "items.json",
    reportMd: "run-report.md",
    reportJson: "run-report.json",
    ...(options.outputFiles ?? {})
  };
  const outputAliases = Array.isArray(outputFiles.aliases) ? outputFiles.aliases : [];
  const fetchTextImpl = options.fetchTextImpl ?? fetchText;
  const sourceImageAllowlist = options.sourceImageAllowlist ??
    await readOptionalJson(imageSourceAllowlistPath, DEFAULT_IMAGE_SOURCE_ALLOWLIST);
  const socialImageOutputRoot = options.socialImageOutputRoot ?? path.join(APP_ROOT, "public");
  const registry = await readJson(registryPath);
  const maxPerSource = options.maxPerSource ?? registry.maxPerSource;
  const excludeKeywords = options.excludeKeywords ?? registry.excludeKeywords ?? [];
  const preferredKeywords = options.preferredKeywords ?? registry.preferredKeywords ?? [];
  const penaltyKeywords = options.penaltyKeywords ?? registry.penaltyKeywords ?? [];
  const enabledSources = registry.sources.filter((source) => source.enabled && source.type === "rss");
  const sourceErrors = [];
  const parsedItems = [];
  const recentItems = options.recentItems ?? await readRecentFeedItems(outputDir, [
    outputFiles.json,
    "feed.json",
    "ai-attention.json",
    "tools.json"
  ]);

  for (const source of enabledSources) {
    try {
      const xml = await fetchTextImpl(source.url);
      parsedItems.push(...parseFeedXml(xml, source));
    } catch (error) {
      sourceErrors.push({ source: source.name, url: source.url, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const keywordFilteredItems = parsedItems.filter((item) => !itemMatchesKeywordList(item, excludeKeywords));
  const scoredItems = keywordFilteredItems.map((item) => scoreItem(item, now, {
    preferredKeywords,
    penaltyKeywords,
  }));
  const { selected, bucketCounts, sourceCounts } = selectItems(scoredItems, registry.targets, maxItems, { maxPerSource });
  let enrichedSelected = selected.map((item) => enrichSignalItem(item, { siteUrl }));
  enrichedSelected = applyAutonomousEditorialLayer(enrichedSelected, { recentItems, feedId });
  const imageVariety = applyImageVariety(enrichedSelected);
  enrichedSelected = imageVariety.items;
  let socialCardErrors = [];

  if (!dryRun && options.generateSocialImages !== false && enrichedSelected.length) {
    const renderedCards = await renderSignalCardsForItems(enrichedSelected, {
      outputRoot: socialImageOutputRoot,
      siteUrl: normalizeSiteUrl(siteUrl),
      now,
      sourceImageAllowlist,
      fetchImageImpl: options.fetchImageImpl,
      backgroundPath: options.socialImageBackgroundPath,
    });
    enrichedSelected = renderedCards.items.map((item) => enrichSignalItem(item, { siteUrl }));
    socialCardErrors = renderedCards.errors;
  }

  const feedXml = buildFeedXml(enrichedSelected, { now, siteUrl, title, description, feedFile: outputFiles.xml, feedId });
  const feedJson = buildFeedJson(enrichedSelected, { now, siteUrl, title, description, feedFile: outputFiles.json, feedId });
  const xmlWellFormed = validateRss(feedXml);
  const validation = await validateSelectedItems(enrichedSelected, {
    siteUrl,
    socialImageOutputRoot,
    sourceImageAllowlist
  });
  const feedValid = selected.length > 0 && xmlWellFormed && validation.errors.length === 0;
  const existingFeedPath = path.join(outputDir, outputFiles.xml);
  let preservedPreviousFeed = false;

  const report = {
    feedId,
    title,
    description,
    generatedAt: now.toISOString(),
    dryRun,
    siteUrl,
    outputFiles,
    sources: {
      enabled: enabledSources.length,
      fetched: enabledSources.length - sourceErrors.length,
      errors: sourceErrors
    },
    items: {
      parsed: parsedItems.length,
      keywordFiltered: parsedItems.length - keywordFilteredItems.length,
      scored: scoredItems.length,
      selected: selected.length,
      excluded: scoredItems.filter((item) => item.excluded).length
    },
    bucketCounts,
    sourceCounts,
    scoring: {
      preferredKeywords,
      penaltyKeywords
    },
    automation: {
      mode: "autonomous-editorial",
      scheduleSlots: ["early-morning", "mid-morning", "afternoon", "late-night"],
      recentItemsConsidered: recentItems.length,
      modelStrategy: {
        triage: "lower-cost model or deterministic scoring",
        finalEditorial: "strong model recommended for publish/skip decisions",
        validation: "deterministic gates plus lightweight audit agents"
      }
    },
    images: {
      attempted: dryRun || options.generateSocialImages === false ? 0 : enrichedSelected.length,
      generated: enrichedSelected.filter((item) => String(item.socialImagePath || item.imagePath || "").startsWith("/images/signals/generated/")).length,
      strategyCounts: countBy(enrichedSelected, "imageStrategy"),
      familyCounts: countBy(enrichedSelected, "imageFamily"),
      variantCounts: countBy(enrichedSelected, "imageVariant"),
      toneCounts: countBy(enrichedSelected, "imageTone"),
      compositionCounts: countBy(enrichedSelected, "imageComposition"),
      variety: validation.varietyAudit,
      sourceTypeCounts: countBy(enrichedSelected, "imageSourceType"),
      rightsStatusCounts: countBy(enrichedSelected, "imageRightsStatus"),
      manualReviewNeeded: enrichedSelected.filter((item) => item.imageBrief?.manualReviewNeeded || item.imageRightsStatus === "manual-review").length,
      warnings: enrichedSelected.flatMap((item) =>
        (item.imageWarnings || []).map((warning) => ({
          slug: item.slug,
          title: item.title,
          warning
        }))
      ).concat(imageVariety.warnings),
      errors: socialCardErrors
    },
    copy: buildCopyRepetitionAudit(enrichedSelected),
    editorial: validation.editorialAudit,
    aliases: {
      configured: outputAliases,
      written: []
    },
    selectedItems: enrichedSelected.map((item) => ({
      title: item.title,
      url: item.internalUrl,
      internalUrl: item.internalUrl,
      originalUrl: item.originalUrl,
      imageUrl: item.imageUrl,
      socialImageUrl: item.socialImageUrl,
      socialImagePath: item.socialImagePath,
      sourceImageUrl: "",
      imageStrategy: item.imageStrategy,
      imageFamily: item.imageFamily,
      imageSourceType: item.imageSourceType,
      imageCredit: item.imageCredit,
      imageRightsStatus: item.imageRightsStatus,
      imageTemplate: item.imageTemplate,
      imageVariant: item.imageVariant,
      imageTone: item.imageTone,
      imageComposition: item.imageComposition,
      imageBrief: item.imageBrief,
      feedRole: item.feedRole,
      simpleSummary: item.simpleSummary,
      engagementPrompt: item.engagementPrompt,
      trendContext: item.trendContext,
      relatedRecentSignals: item.relatedRecentSignals || [],
      readingLevel: item.readingLevel,
      editorialMode: item.editorialMode,
      imageWarnings: item.imageWarnings || [],
      slug: item.slug,
      sourceName: item.sourceName,
      bucket: item.bucket,
      bucketLabel: item.bucketLabel,
      score: item.score,
      publishedAt: item.publishedAt
    })),
    validation: {
      xmlWellFormed,
      errors: validation.errors
    },
    feedValid,
    preservedPreviousFeed
  };

  if (!dryRun) {
    await fs.mkdir(outputDir, { recursive: true });
    if (feedValid) {
      const publicItems = enrichedSelected.map((item) => ({
        ...item,
        url: item.internalUrl || item.url,
        sourceImageUrl: "",
      }));
      await fs.writeFile(existingFeedPath, feedXml, "utf8");
      await writeJson(path.join(outputDir, outputFiles.json), feedJson);
      await writeJson(path.join(outputDir, outputFiles.items), publicItems);
      report.aliases.written = outputAliases.filter((alias) => alias?.from && alias?.to);
    } else {
      try {
        const previous = await fs.readFile(existingFeedPath, "utf8");
        preservedPreviousFeed = validateRss(previous);
        report.preservedPreviousFeed = preservedPreviousFeed;
      } catch {
        preservedPreviousFeed = false;
      }
    }
    await fs.writeFile(path.join(outputDir, outputFiles.reportMd), reportMarkdown(report), "utf8");
    await writeJson(path.join(outputDir, outputFiles.reportJson), report);
    if (feedValid) {
      await writeOutputAliases(outputDir, outputAliases);
    }
  }

  return { report, feedXml, feedJson, items: enrichedSelected };
}

export async function buildAllStaticRss(options = {}) {
  const feedConfigs = options.feedConfigs ?? DEFAULT_FEED_CONFIGS;
  const results = [];

  for (const config of feedConfigs) {
    results.push(await buildStaticRss({
      ...options,
      ...config,
      feedConfigs: undefined
    }));
  }

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    feeds: results,
    allValid: results.every(({ report }) => report.feedValid || report.preservedPreviousFeed)
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  buildAllStaticRss()
    .then(({ feeds, allValid }) => {
      for (const { report } of feeds) {
        console.log(`Phoenix RSS generated [${report.feedId}]: selected=${report.items.selected} feedValid=${report.feedValid} preserved=${report.preservedPreviousFeed} errors=${report.sources.errors.length}`);
      }
      if (!allValid) process.exitCode = 1;
    })
    .catch((error) => {
      console.error("Phoenix RSS generation failed:", error);
      process.exitCode = 1;
    });
}
