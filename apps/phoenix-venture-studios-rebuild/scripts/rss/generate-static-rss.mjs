import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_IMAGE_SOURCE_ALLOWLIST,
  assignImageCreativeDirection,
  createImageBrief,
  expectedArticleImagePath,
  renderSignalCardsForItems,
  resolveSourceImagePolicy
} from "./signal-card-images.mjs";
import { extractArticleMetadata, fetchArticleMetadata } from "./article-metadata.mjs";
import { collectPerplexityResearchSource as collectPerplexityResearchSourceImpl } from "./perplexity-research.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const DEFAULT_REGISTRY_PATH = path.join(APP_ROOT, "rss-data/source-registry.json");
const TOOLS_REGISTRY_PATH = path.join(APP_ROOT, "rss-data/tools-registry.json");
const AI_ATTENTION_REGISTRY_PATH = path.join(APP_ROOT, "rss-data/ai-attention-registry.json");
const RESEARCH_SOURCE_REGISTRY_PATH = path.join(APP_ROOT, "rss-data/research-source-registry.json");
const MANUAL_SIGNALS_PATH = path.join(APP_ROOT, "rss-data/manual-signals.json");
const DEFAULT_IMAGE_SOURCE_ALLOWLIST_PATH = path.join(APP_ROOT, "rss-data/image-source-allowlist.json");
const DEFAULT_OUTPUT_DIR = path.join(APP_ROOT, "public/rss");
const DEFAULT_SITE_URL = "https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild";
const MAX_ITEMS = 10;
const ARCHIVE_FEED_ITEM_LIMIT = MAX_ITEMS;
const SOCIAL_QUEUE_CANDIDATE_LIMIT = 6;
const ARTICLE_IMAGE_BACKFILL_LIMIT = 4;
const MAX_HISTORY_ITEMS = 250;
const DEFAULT_FEED_TITLE = "Phoenix Venture Studios - Founder Market";
const DEFAULT_FEED_DESCRIPTION = "Funding, AI market moves, capital shifts, and founder-facing business signals curated for Phoenix Venture Studios.";
const FOUNDER_TOOLS_FEED_TITLE = "Phoenix Venture Studios - Founder Tools";
const FOUNDER_TOOLS_FEED_DESCRIPTION = "Useful AI tools, agent development, automation, coding, and time-saving workflow signals for founders.";
const AI_ATTENTION_FEED_TITLE = "Phoenix Venture Studios - AI Attention";
const AI_ATTENTION_FEED_DESCRIPTION = "AI consulting, implementation, agent operations, and practical AI business signals for founders.";
const SOCIAL_QUEUE_FEED_IDS = new Set(["founder-market-social", "founder-tools-social", "ai-attention-social"]);
const TOOLS_FEED_IDS = new Set(["founder-tools", "founder-tools-social"]);
const AI_ATTENTION_FEED_IDS = new Set(["ai-attention", "ai-attention-social"]);
const SOCIAL_STRICT_IMAGE_STRATEGIES = new Set(["held-for-codex-image", "source-allowlisted"]);
const TOOLS_STRONG_INTENT_PATTERN = /\b(agent|agents|agentic|gentic|tool|tools|workflow|workflows|automation|codex|vibe coding|app builder|app builders|app development|developer tool|developer tools|prototype|integration|deploy|rollout|implementation|subscription|subscriptions|model|models|llm|chatgpt|claude|gemini|openai|replit|cloudflare|github|ocr|api|sdk)\b/i;
const TOOLS_ACTIONABLE_INTENT_PATTERN = /\b(agent|agents|agentic|gentic|tool|tools|workflow|workflows|automation|codex|vibe coding|app builder|app builders|app development|developer tool|developer tools|prototype|integration|deploy|rollout|implementation|subscription|subscriptions|replit|cloudflare|github|mcp|api|sdk|gh cli|productivity|save time|time saving|ci)\b/i;
const TOOLS_WEAK_MARKET_PATTERN = /\b(raise|raises|raised|raising|funding|valuation|ipo|acqui-hire|awarded|contracts?|series [abc]|seed round|venture capital)\b/i;
const AI_ATTENTION_STRONG_INTENT_PATTERN = /\b(implementation|adoption|consulting|consultant|operator|operating model|org change|workflow change|service delivery|deployment|rollout|governance|change management|transformation|enablement|operations|delivery team|enterprise rollout|customer workflow|internal workflow)\b/i;
const AI_ATTENTION_WEAK_PRODUCT_PATTERN = /\b(new tool|new tools|launches|launched|product update|feature update|pricing|subscription|beta|available now|preview release|release notes|developer tool|coding agent|app builder)\b/i;
const POLITICAL_HARD_BLOCK_PATTERN = /\b(trump|biden|harris|vance|desantis|rfk|republican|democrat|gop|white house|immigration|deportation|border crisis|campaign|election|ballot|senate race|house race|culture war|culture-war|anti-woke|woke|dei|diversity equity and inclusion|graduation speakers|influence operations)\b/i;
const POLITICAL_ALLOW_OVERRIDE_PATTERN = /\b(ai regulation|artificial intelligence regulation|antitrust|tariff|tariffs|compliance|sba|loan program|credit program|capital access|small business policy|small-business policy|small business administration)\b/i;
const FRONTIER_AI_ENTITY_PATTERN = /\b(anthropic|openai|claude|chatgpt|frontier model|foundation model)\b/i;
const FRONTIER_FUNDING_PATTERN = /\b(valuation|funding|fundraising|raise|raised|investor|investors|ipo|billion|trillion)\b/i;
const WORKFLOW_EXECUTION_PATTERN = /\b(audit|workflow|tool stack|engineering team|delivery|prototype|integration|implementation|rollout|token spend|usage limit|document parsing|event|conference|pipeline)\b/i;

function isSocialQueueFeedId(feedId = "") {
  return SOCIAL_QUEUE_FEED_IDS.has(feedId);
}

function isToolsFeedId(feedId = "") {
  return TOOLS_FEED_IDS.has(feedId);
}

function isAiAttentionFeedId(feedId = "") {
  return AI_ATTENTION_FEED_IDS.has(feedId);
}

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

const SIGNAL_CONTEXT_BY_BUCKET = {
  capital_credit: {
    whyItMatters: "Capital access, credit pricing, and cash-flow conditions shape how much room a business has to move. A small shift here can change hiring, inventory, marketing, or the timing of an AI rollout.",
    whyShared: "Phoenix shared this because funding conversations get easier when founders can connect outside market signals to their own capital readiness.",
    founderTakeaway: "Use this as a prompt to review your runway, credit options, and the business case for borrowing before you need capital urgently.",
    businessTakeaway: "Tighten the numbers behind the next growth move so any funding conversation has a clear purpose."
  },
  funding_venture: {
    whyItMatters: "Funding news is not just about who raised money. It reveals where investors, lenders, and operators believe demand is moving.",
    whyShared: "Phoenix shared this because founders can use funding patterns to pressure-test offers, timing, and capital strategy without chasing every headline.",
    founderTakeaway: "Look for the signal behind the raise: what problem is being funded, what market pressure is being answered, and what that says about your own positioning.",
    businessTakeaway: "Connect the opportunity to a fundable plan, not just a bigger idea."
  },
  ai_operator_impact: {
    whyItMatters: "AI is shifting from novelty into operations. The founders who benefit are the ones who translate tools into workflow, revenue, and risk decisions.",
    whyShared: "Phoenix shared this because it helps business owners separate practical AI leverage from hype.",
    founderTakeaway: "Ask where this signal could reduce friction, increase speed, or create a clearer customer experience inside your own business.",
    businessTakeaway: "Pick one workflow where AI can create measurable lift before expanding the system."
  },
  ai_consulting: {
    whyItMatters: "AI adoption creates demand for trusted guides who can make implementation understandable, useful, and safe for real businesses.",
    whyShared: "Phoenix shared this because it points to consulting, enablement, and service opportunities for entrepreneurs who can turn complexity into execution.",
    founderTakeaway: "If you want to consult around AI, notice the gap between tool excitement and business implementation. That gap is often the offer.",
    businessTakeaway: "Package the guidance around outcomes: saved time, clearer sales follow-up, better operations, or smarter decision support."
  },
  ai_implementation: {
    whyItMatters: "Implementation is where AI either becomes useful or becomes another subscription nobody uses. The market is rewarding practical rollout capability.",
    whyShared: "Phoenix shared this because the real opportunity is not knowing about AI; it is installing it into the work people already do.",
    founderTakeaway: "Review the handoffs, bottlenecks, and repetitive decisions in your business before choosing tools.",
    businessTakeaway: "Build an adoption path around one workflow, one owner, and one measurable result."
  },
  ai_tools_agents: {
    whyItMatters: "AI agents and tools matter when they earn a place in the workflow, not when they merely sound advanced.",
    whyShared: "Phoenix shared this because founders need a grounded lens for tools that may affect sales, marketing, service, and internal operations.",
    founderTakeaway: "Pick one workflow where this could save time, cut cost, or reduce handoffs before you add another tool.",
    businessTakeaway: "Keep AI accountable to a business metric instead of adopting tools because the market is loud."
  },
  business_automation: {
    whyItMatters: "Automation changes margins, response time, and customer experience. It can also expose weak processes if the business automates too early.",
    whyShared: "Phoenix shared this because automation is one of the cleanest bridges from AI attention to business results.",
    founderTakeaway: "Find one repetitive process where a better system would save time or increase follow-up quality this month.",
    businessTakeaway: "Document the workflow before automating it, then measure whether the change creates real capacity."
  },
  jamstack_ops: {
    whyItMatters: "Modern operating systems for content, campaigns, and websites can be lighter, faster, and cheaper when the architecture is built around static assets and smart automation.",
    whyShared: "Phoenix shared this because technical stack choices affect speed, cost, and how easily a founder can launch campaigns.",
    founderTakeaway: "Look at whether your current website and content system helps you ship quickly or slows every campaign down.",
    businessTakeaway: "Use simple infrastructure where possible, then reserve complexity for the parts that truly need it."
  },
  ai_revenue: {
    whyItMatters: "AI revenue opportunities are strongest when they connect to a clear buyer, a real business pain, and a repeatable delivery model.",
    whyShared: "Phoenix shared this because attention is only useful when it turns into a practical offer, event, service, or campaign.",
    founderTakeaway: "Ask what someone would pay for if this signal keeps growing: clarity, implementation, training, speed, or a done-with-you rollout.",
    businessTakeaway: "Turn the interest into an offer hypothesis, then test it with a focused audience."
  },
  founder_strategy: {
    whyItMatters: "This points to a founder decision around positioning, pricing, execution, or team focus.",
    whyShared: "Phoenix shared this because entrepreneurs need operating context they can turn into a practical decision.",
    founderTakeaway: "Use this to check whether your current plan still matches the market you are building in.",
    businessTakeaway: "Turn the signal into one decision: keep, cut, clarify, or test."
  },
  market_regulatory: {
    whyItMatters: "Market and regulatory shifts can quietly change cost, risk, compliance, and customer urgency.",
    whyShared: "Phoenix shared this because founders should see these changes early enough to adjust messaging, operations, or capital planning.",
    founderTakeaway: "Identify whether this creates a risk to manage, a trust angle to explain, or a timing window to act on.",
    businessTakeaway: "Translate the broad market movement into a specific operating question for your company."
  },
  coaching_consulting: {
    whyItMatters: "Coaching and consulting opportunities grow when business owners need help turning complexity into confident action.",
    whyShared: "Phoenix shared this because founder education, consulting, and implementation can sit together when the offer is practical.",
    founderTakeaway: "Look for the place where your experience can help someone make a better decision faster.",
    businessTakeaway: "Package the expertise around a clear before-and-after result."
  },
  wildcard_attention: {
    whyItMatters: "Some signals matter because they capture attention before the business implications are obvious.",
    whyShared: "Phoenix shared this because attention can become useful when it is translated into context, timing, and a next step.",
    founderTakeaway: "Ask whether this is noise, a weak signal, or the start of a pattern worth watching.",
    businessTakeaway: "Use attention as a doorway into sharper questions, not as the whole strategy."
  }
};

export const DEFAULT_FEED_CONFIGS = [
  {
    id: "founder-market",
    registryPath: DEFAULT_REGISTRY_PATH,
    title: DEFAULT_FEED_TITLE,
    description: DEFAULT_FEED_DESCRIPTION,
    maxItems: ARCHIVE_FEED_ITEM_LIMIT,
    outputFiles: {
      xml: "feed.xml",
      json: "feed.json",
      items: "items.json",
      reportMd: "run-report.md",
      reportJson: "run-report.json"
    }
  },
  {
    id: "founder-market-social",
    registryPath: DEFAULT_REGISTRY_PATH,
    title: `${DEFAULT_FEED_TITLE} - Social Queue`,
    description: "One Phoenix Founder Signal item at a time for RSS-to-social publishing.",
    maxItems: 1,
    excludeRecentSelections: true,
    targets: {
      ai_operator_impact: 1,
      funding_venture: 1
    },
    outputFiles: {
      xml: "social.xml",
      json: "social.json",
      items: "social-items.json",
      reportMd: "social-run-report.md",
      reportJson: "social-run-report.json"
    }
  },
  {
    id: "founder-tools",
    registryPath: TOOLS_REGISTRY_PATH,
    title: FOUNDER_TOOLS_FEED_TITLE,
    description: FOUNDER_TOOLS_FEED_DESCRIPTION,
    maxItems: ARCHIVE_FEED_ITEM_LIMIT,
    outputFiles: {
      xml: "tools.xml",
      json: "tools.json",
      items: "tools-items.json",
      reportMd: "tools-run-report.md",
      reportJson: "tools-run-report.json"
    }
  },
  {
    id: "founder-tools-social",
    registryPath: TOOLS_REGISTRY_PATH,
    title: `${FOUNDER_TOOLS_FEED_TITLE} - Social Queue`,
    description: "One AI tool or agent-development signal at a time for RSS-to-social publishing.",
    maxItems: 1,
    excludeRecentSelections: true,
    outputFiles: {
      xml: "tools-social.xml",
      json: "tools-social.json",
      items: "tools-social-items.json",
      reportMd: "tools-social-run-report.md",
      reportJson: "tools-social-run-report.json"
    }
  },
  {
    id: "ai-attention",
    registryPath: AI_ATTENTION_REGISTRY_PATH,
    title: AI_ATTENTION_FEED_TITLE,
    description: AI_ATTENTION_FEED_DESCRIPTION,
    maxItems: ARCHIVE_FEED_ITEM_LIMIT,
    excludeSelectedFromFeedIds: ["founder-tools"],
    outputFiles: {
      xml: "ai-attention.xml",
      json: "ai-attention.json",
      items: "ai-attention-items.json",
      reportMd: "ai-attention-run-report.md",
      reportJson: "ai-attention-run-report.json"
    }
  },
  {
    id: "ai-attention-social",
    registryPath: AI_ATTENTION_REGISTRY_PATH,
    title: `${AI_ATTENTION_FEED_TITLE} - Social Queue`,
    description: "One AI consulting or implementation signal at a time for RSS-to-social publishing.",
    maxItems: 1,
    excludeRecentSelections: true,
    excludeSelectedFromFeedIds: ["founder-tools-social"],
    outputFiles: {
      xml: "ai-attention-social.xml",
      json: "ai-attention-social.json",
      items: "ai-attention-social-items.json",
      reportMd: "ai-attention-social-run-report.md",
      reportJson: "ai-attention-social-run-report.json"
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

function stripLeadingLabel(value = "", labelPattern) {
  return String(value || "").replace(labelPattern, "").trim();
}

function normalizeQuotedText(value = "") {
  return String(value)
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, "\"")
    .replace(/\s+/g, " ")
    .trim();
}

function toSentence(value = "") {
  const text = normalizeQuotedText(value)
    .replace(/\s+\((?:via|source):[^)]+\)/gi, "")
    .replace(/\bBy [A-Z][A-Za-z .'-]+\.?$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function buildPublicHeadline(item) {
  const original = cleanFeedTitle(item.title || "Founder Signal");
  let title = normalizeQuotedText(original)
    .replace(/^Presentation:\s*/i, "")
    .replace(/\s+[—-]\s+by\s+[^—-]+$/i, "")
    .trim();

  if (/^ITBench-AA:/i.test(title)) {
    return "Frontier AI models scored below 50% on a new enterprise IT benchmark";
  }
  if (/^How\s+Endava\s+builds\s+an\s+agentic\s+organization\s+with\s+Codex$/i.test(title)) {
    return "Endava built an agentic organization with Codex";
  }
  if (/^GitHub Slashes Agent Workflow Token Spend up to (\d+)%/i.test(title)) {
    const match = title.match(/^GitHub Slashes Agent Workflow Token Spend up to (\d+)%/i);
    return `GitHub cut agent workflow token spend up to ${match?.[1] || "0"} percent with daily audits`;
  }
  if (/^After Nvidia['’]s \$20B not-acqui-hire,\s*AI chip startup Groq reportedly raising \$650M$/i.test(title)) {
    return "Groq is reportedly raising $650M after Nvidia's $20B team deal";
  }
  if (/^This chip startup just raised \$135M on a bet that AI['’]s biggest bottleneck isn['’]t compute\s*[—-]\s*it['’]s memory$/i.test(title)) {
    return "A $135M bet that memory, not compute, is AI's real bottleneck";
  }
  if (/^Anthropic Soars to a \$965-Billion Valuation, Overtaking OpenAI in the AI Funding Race$/i.test(title)) {
    return "Anthropic nears a $1 trillion valuation in the AI funding race";
  }
  if (/^Anthropic raises \$65 billion, nears \$1T valuation ahead of IPO$/i.test(title)) {
    return "Anthropic nears a $1 trillion valuation ahead of a possible IPO";
  }

  return title;
}

function stripSourceLead(summary = "", sourceName = "") {
  let text = normalizeQuotedText(summary)
    .replace(/\bBy [A-Z][A-Za-z .'-]+\.?$/g, "")
    .replace(/\s+\(via [^)]+\)/gi, "")
    .replace(/^Learn how\s+/i, "")
    .trim();
  if (!text) return "";
  const meaningfulCharacters = text.replace(/[^A-Za-z0-9]+/g, "");
  if (meaningfulCharacters.length < 6) return "";
  if (sourceName) {
    text = text.replace(new RegExp(`^${escapeRegExp(sourceName)}\\s+reported\\s+that\\s+`, "i"), "");
  }
  if (/^[a-z]/.test(text)) text = text.charAt(0).toUpperCase() + text.slice(1);
  return toSentence(text);
}

function mentionsAny(text = "", pattern) {
  return new RegExp(pattern, "i").test(text);
}

function editorialText(item = {}) {
  return `${item.publicTitle || item.title || ""} ${item.description || ""}`.toLowerCase();
}

function hasFrontierFundingSignal(item = {}) {
  const text = editorialText(item);
  if (!FRONTIER_AI_ENTITY_PATTERN.test(text) || !FRONTIER_FUNDING_PATTERN.test(text)) return false;
  if (item.bucket === "funding_venture" || item.bucket === "capital_credit") return true;
  return !TOOLS_ACTIONABLE_INTENT_PATTERN.test(text) && !WORKFLOW_EXECUTION_PATTERN.test(text);
}

function isGenericTakeaway(value = "") {
  return /\b(treat this as a cue|use this as a prompt|what is your takeaway|drop your takeaway|signal could reduce friction|use this to check whether your current plan)\b/i.test(String(value));
}

function detectEditorialLane(item) {
  const text = editorialText(item);
  if (mentionsAny(text, "\\b(shouldn t replace humans|shouldn't replace humans|replace humans|supplant human|human programmers|human judgment)\\b")) return "human-boundary";
  if (mentionsAny(text, "\\b(linkedin|investor attention|deal flow|scrolling)\\b")) return "investor-attention";
  if (mentionsAny(text, "\\b(bankruptcy|bankrupt|debt|fraud|insolvency|chapter 11)\\b")) return "distress";
  if (hasFrontierFundingSignal(item)) return "frontier-funding";
  if (mentionsAny(text, "\\b(memory)\\b")) return "hardware-memory";
  if (mentionsAny(text, "\\b(inference)\\b")) return "hardware-inference";
  if (mentionsAny(text, "\\b(memory|chip|gpu|server|infrastructure)\\b")) return "hardware-general";
  if (mentionsAny(text, "\\b(benchmark|score|reliability|test|eval|evaluation)\\b")) return "reliability";
  if (mentionsAny(text, "\\b(token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning|usage limit|license(?:s)?|blew\\s*\\$|spent\\s*\\$|monthly ai bill|single month)\\b")) return "workflow-cost";
  if (mentionsAny(text, "\\b(codex|software delivery|requirements analysis|engineering team|delivery)\\b")) return "workflow-delivery";
  if (mentionsAny(text, "\\b(dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent)\\b")) return "workflow-orchestration";
  if (mentionsAny(text, "\\b(trade show|pipeline|booth|event|conference)\\b")) return "event-pipeline";
  if (mentionsAny(text, "\\b(layoff|laid-off|hiring|workers|talent|recruiting|join)\\b")) return "talent-flow";
  if (mentionsAny(text, "\\b(ocr|document parsing|documents|forms|paperwork)\\b")) return "document-ai";
  if (mentionsAny(text, "\\b(quiz|vibe coded|google ai studio|io 2026|i/o 2026)\\b")) return "interactive-prototype";
  if (mentionsAny(text, "\\b(prototype|prototypes|futures lab|students|education)\\b")) return "prototype-lab";
  if (mentionsAny(text, "\\b(nonprofit|people-first ai fund|community innovation|grant|grants|public good)\\b")) return "mission-funding";
  if (mentionsAny(text, "\\b(seo|invisible|search ranking|search visibility|discoverability|harder to find)\\b")) return "search-visibility";
  if (mentionsAny(text, "\\b(revenue|budget cutting|selling point|top line|search startup)\\b")) return "revenue-proof";
  if (item.bucket === "funding_venture" || item.bucket === "capital_credit") return "capital-proof";
  if (item.bucket === "ai_operator_impact") return "operator-shift";
  if (item.bucket === "ai_tools_agents" || item.bucket === "ai_implementation" || item.bucket === "business_automation") return "workflow-general";
  return "general";
}

function detectRevenueSubLane(item) {
  const text = `${item.publicTitle || item.title || ""} ${item.description || ""}`.toLowerCase();
  if (mentionsAny(text, "\\b(contract|contracts|government|space force|ipo filing)\\b")) return "contract-revenue";
  if (mentionsAny(text, "\\b(budget cutting|selling point|search startup|buyers|entered the category)\\b")) return "budget-pressure";
  if (mentionsAny(text, "\\b(sales growth|fastest sales growth|revenue year-over-year|top line crosses|tripled its annual revenue)\\b")) return "growth-acceleration";
  return "general-revenue";
}

function buildFounderTakeaway(item) {
  const text = editorialText(item);
  if (hasFrontierFundingSignal(item)) {
    return "The headline number matters less than the proof standard behind it. Notice what kind of trust, usage, and revenue story investors think can last.";
  }
  if (mentionsAny(text, "\\b(shouldn t replace humans|shouldn't replace humans|replace humans|supplant human|human programmers|human judgment)\\b")) {
    return "The useful boundary is not human versus AI. It is which work gets faster with assistance and which work still needs judgment, trust, or taste.";
  }
  if (mentionsAny(text, "\\b(linkedin|investor attention|deal flow|investor|scrolling)\\b")) {
    return "Borrow the angle, not the format. Make the proof of traction easy to notice before you ask for attention.";
  }
  if (mentionsAny(text, "\\b(seo|invisible|search ranking|search visibility|discoverability|harder to find)\\b")) {
    return "If AI search cannot find you, the problem is not just traffic. It is whether your positioning is still clear enough for the next layer of discovery.";
  }
  if (mentionsAny(text, "\\b(bankruptcy|bankrupt|debt|fraud|insolvency|chapter 11)\\b")) {
    return "Cash strain usually shows up before collapse does. Watch the pressure points that make a business brittle before the headline ever lands.";
  }
  if (mentionsAny(text, "\\b(memory)\\b")) {
    return "The better founder question is not who has the biggest model. It is whether the memory layer becomes the next choke point everyone else notices too late.";
  }
  if (mentionsAny(text, "\\b(inference)\\b")) {
    return "The founder edge is often hiding in the layer that makes the product fast, usable, and affordable enough to scale.";
  }
  if (mentionsAny(text, "\\b(memory|chip|inference|gpu|server|infrastructure)\\b")) {
    return "The better founder question is not who has the biggest model. It is where the stack is starting to choke, because that is usually where the next advantage forms.";
  }
  if (mentionsAny(text, "\\b(benchmark|score|reliability|test|eval|evaluation)\\b")) {
    return "If the task touches operations, customers, or money, ask what proof you would need before trusting an agent to own it.";
  }
  if (mentionsAny(text, "\\b(dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent)\\b")) {
    return "Do not ask whether the workflow looks smart. Ask whether it removes a real handoff that your team feels every week.";
  }
  if (mentionsAny(text, "\\b(token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning)\\b")) {
    return "Before you buy the next AI tool, map where your tokens, tools, and handoffs are leaking value now.";
  }
  if (mentionsAny(text, "\\b(usage limit|license(?:s)?|blew\\s*\\$|spent\\s*\\$|monthly ai bill|single month)\\b")) {
    return "Loose usage controls can turn AI enthusiasm into a very expensive workflow problem faster than most teams expect.";
  }
  if (mentionsAny(text, "\\b(trade show|pipeline|booth|event|conference)\\b")) {
    return "The founder move is to design follow-up before the event starts, so attention turns into a sales process instead of a pile of content.";
  }
  if (mentionsAny(text, "\\b(layoff|laid-off|hiring|workers|talent|recruiting|join)\\b")) {
    return "The founder edge is not just hiring fast. It is knowing exactly what kind of operator will make a fast company stronger without slowing it down.";
  }
  if (mentionsAny(text, "\\b(revenue|budget cutting|selling point|top line|search startup)\\b")) {
    const subLane = detectRevenueSubLane(item);
    if (subLane === "contract-revenue") {
      return "Long-cycle buyers reward clarity, reliability, and fit. The real question is what made this operator dependable enough to win the contract.";
    }
    if (subLane === "budget-pressure") {
      return "In a tighter budget market, the winner is usually the offer that saves money fast enough to justify itself without a long debate.";
    }
    if (subLane === "growth-acceleration") {
      return "Fast growth matters less than what is causing it. Find the operating promise that made customers move now instead of later.";
    }
    return "Revenue stories are usually proof stories in disguise. Ask what made the buyer say yes.";
  }
  if (mentionsAny(text, "\\b(ocr|document parsing|documents|forms|paperwork)\\b")) {
    return "Start with the paperwork that slows cash, onboarding, or customer response. That is usually where document AI stops being a demo and starts paying rent.";
  }
  if (mentionsAny(text, "\\b(quiz|vibe coded|google ai studio|io 2026|i/o 2026)\\b")) {
    return "Use lightweight builds to learn fast. A scrappy interactive draft can reveal demand long before a polished product does.";
  }
  if (mentionsAny(text, "\\b(nonprofit|people-first ai fund|community innovation|grant|grants|public good)\\b")) {
    return "Do not force every useful AI project into a venture story. Some of the best opportunities will be built through grants, partnerships, and mission-backed capital.";
  }
  if (mentionsAny(text, "\\b(prototype|prototypes|futures lab|students|education)\\b")) {
    return "Pay attention when an awkward early prototype solves a real pain. That is often the first version of a market, not just a school project.";
  }
  if (item.bucket === "funding_venture" || item.bucket === "capital_credit") {
    return "Ignore the round size for a minute and ask what evidence made the market move this fast.";
  }
  if (item.bucket === "ai_tools_agents" || item.bucket === "ai_implementation" || item.bucket === "business_automation") {
    return "Start with the workflow that already hurts. If the tool cannot improve that work, it has not earned expansion.";
  }
  if (item.bucket === "ai_operator_impact") {
    return "Name the workflow that changes first. If you cannot do that, the signal is still too abstract.";
  }
  return stripLeadingLabel(item.founderTakeaway || "", /^for founders[:,]\s*/i);
}

function buildEngagementQuestion(item) {
  const text = `${item.publicTitle || item.title || ""} ${item.description || ""}`.toLowerCase();
  if (mentionsAny(text, "\\b(shouldn t replace humans|shouldn't replace humans|replace humans|supplant human|human programmers|human judgment)\\b")) {
    return "Which part of your work should stay human even if the tooling gets much better?";
  }
  if (mentionsAny(text, "\\b(linkedin|investor attention|deal flow|investor|scrolling)\\b")) {
    return "What proof would make the right investor stop scrolling and pay attention?";
  }
  if (mentionsAny(text, "\\b(seo|invisible|search ranking|search visibility|discoverability|harder to find)\\b")) {
    return "Where are you becoming harder to find even if your offer is still good?";
  }
  if (mentionsAny(text, "\\b(bankruptcy|bankrupt|debt|fraud|insolvency|chapter 11)\\b")) {
    return "Where is your business getting more fragile than it looks from the outside?";
  }
  if (mentionsAny(text, "\\b(memory)\\b")) {
    return "If memory becomes the choke point, what kind of company benefits first?";
  }
  if (mentionsAny(text, "\\b(inference)\\b")) {
    return "If inference gets cheaper and faster, what part of your product changes first?";
  }
  if (mentionsAny(text, "\\b(memory|chip|inference|gpu|server|infrastructure)\\b")) {
    return "If this layer becomes the bottleneck, what changes for founders first?";
  }
  if (mentionsAny(text, "\\b(benchmark|score|reliability|test|eval|evaluation)\\b")) {
    return "What would you need to see before trusting this in production?";
  }
  if (mentionsAny(text, "\\b(dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent)\\b")) {
    return "Which handoff in your business would you want this to remove first?";
  }
  if (mentionsAny(text, "\\b(token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning)\\b")) {
    return "Where is your current AI workflow leaking the most time or spend?";
  }
  if (mentionsAny(text, "\\b(trade show|pipeline|booth|event|conference)\\b")) {
    return "What would make attention turn into real pipeline in your world?";
  }
  if (mentionsAny(text, "\\b(layoff|laid-off|hiring|workers|talent|recruiting|join)\\b")) {
    return "What kind of operator becomes more valuable in a company that moves this fast?";
  }
  if (mentionsAny(text, "\\b(revenue|budget cutting|selling point|top line|search startup)\\b")) {
    const subLane = detectRevenueSubLane(item);
    if (subLane === "contract-revenue") {
      return "What would make your offer dependable enough to win a harder buyer?";
    }
    if (subLane === "growth-acceleration") {
      return "What promise would make customers move faster in your market right now?";
    }
    if (subLane === "budget-pressure") {
      return "What would make your offer feel urgent enough to survive a budget review right now?";
    }
    return "What are buyers still paying for even while they cut everywhere else?";
  }
  if (mentionsAny(text, "\\b(ocr|document parsing|documents|forms|paperwork)\\b")) {
    return "Which document bottleneck would you fix first if this actually worked?";
  }
  if (mentionsAny(text, "\\b(quiz|vibe coded|google ai studio|io 2026|i/o 2026)\\b")) {
    return "What small interactive idea could you ship faster than you think?";
  }
  if (mentionsAny(text, "\\b(nonprofit|people-first ai fund|community innovation|grant|grants|public good)\\b")) {
    return "Where could mission-backed AI create value that venture-backed capital might overlook?";
  }
  if (mentionsAny(text, "\\b(prototype|prototypes|futures lab|students|education)\\b")) {
    return "Which rough prototype category do you think turns into a real business next?";
  }
  if (item.bucket === "funding_venture" || item.bucket === "capital_credit") {
    return "What kind of proof do you think the market will reward next?";
  }
  if (item.bucket === "ai_tools_agents" || item.bucket === "ai_implementation" || item.bucket === "business_automation") {
    return "Where would you test this first in a live workflow?";
  }
  if (item.bucket === "ai_operator_impact") {
    return "What part of your day-to-day work would change first if this became normal?";
  }
  return "What would you test first if this pattern keeps spreading?";
}

function buildContextualHashtags(item) {
  const text = `${item.title || ""} ${item.description || ""} ${item.bucketLabel || ""}`.toLowerCase();
  const tags = [];
  const add = (tag) => {
    if (!tags.includes(tag)) tags.push(tag);
  };

  if (/\bopenai\b/.test(text)) add("#OpenAI");
  if (/\banthropic\b/.test(text)) add("#Anthropic");
  if (/\bclaude\b/.test(text)) add("#Claude");
  if (/\bchatgpt\b/.test(text)) add("#ChatGPT");
  if (/\breplit\b/.test(text)) add("#Replit");
  if (/\bvisa\b/.test(text)) add("#Visa");
  if (/\b(agentic|agents?)\b/.test(text)) add("#AgenticAI");
  if (/\b(ai|artificial intelligence|machine learning|model|models)\b/.test(text)) add("#AI");
  if (/\b(payment|payments|fintech|bank|banking|credit|card)\b/.test(text)) add("#Fintech");
  if (/\b(payment|payments|checkout|commerce)\b/.test(text)) add("#Payments");
  if (/\b(coding|developer|developers|apps?|software|prototype|prototyping)\b/.test(text)) add("#AppDevelopment");
  if (/\b(vibe coding|coding agent|code agent)\b/.test(text)) add("#VibeCoding");
  if (/\b(funding|fundraising|raise|raised|venture|valuation|ipo|investors?)\b/.test(text)) add("#StartupFunding");
  if (/\b(startup|founder|founders|entrepreneur)\b/.test(text)) add("#Founders");

  if (!tags.length) {
    add("#AI");
    add("#Founders");
    add("#Startup");
  }

  return tags.slice(0, 6).join(" ");
}

function cleanFeedTitle(value = "") {
  return stripHtml(value)
    .replace(/^HN:\s*/i, "")
    .trim();
}

function cleanFeedDescription(value = "") {
  return stripHtml(value)
    .replace(/\barxiv:\S+\s+announce type:\s*\w+\s+abstract:\s*/gi, " ")
    .replace(/\bannounce type:\s*\w+\s+abstract:\s*/gi, " ")
    .replace(/\b(?:Article URL|Comments URL):\s*(?:https?:\/\/\S+)?\.?/gi, " ")
    .replace(/\bPoints:\s*\d+[\s\S]*$/i, " ")
    .replace(/#\s*Comments:\s*\d+[\s\S]*$/i, " ")
    .replace(/\ban\s+(\$[\d,.]+(?:\s*(?:million|billion|trillion|[MBT]))?)/gi, "a $1")
    .replace(/\ba\s+([89]\d?)\s+percent\b/gi, "an $1 percent")
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
      sourceType: source.type || "rss",
      sourceSurface: source.sourceSurface || source.type || "rss",
      rawTitle: title,
      topicLabel: source.topicLabel || "",
      whySelected: source.whySelected || "",
      researchCitations: Array.isArray(source.researchCitations) ? source.researchCitations : [],
      requiresCorroboration: Boolean(source.requiresCorroboration),
      corroborationDomains: Array.isArray(source.corroborationDomains) ? source.corroborationDomains : [],
      candidateBuckets: Array.isArray(source.buckets) ? source.buckets : []
    };
  }).filter((item) => item.title && item.url);
}

function normalizeSourceType(source = {}) {
  const type = String(source.type || "rss").toLowerCase();
  if (type === "html") return "official-page";
  if (type === "manual-signal") return "manual";
  return type;
}

function topicLabelForItem(item = {}) {
  if (item.topicLabel) return item.topicLabel;
  if (item.bucketLabel) return item.bucketLabel;
  if (item.candidateBuckets?.length) return BUCKET_LABELS[item.candidateBuckets[0]] || item.candidateBuckets[0];
  return "Founder signal";
}

function buildReviewTitle(item = {}) {
  const source = item.sourceName || "Source";
  const topic = topicLabelForItem(item);
  const title = cleanFeedTitle(item.rawTitle || item.sourceTitle || item.publicTitle || item.title || "Untitled signal");
  return `${source} | ${topic} | ${title}`.replace(/\s+/g, " ").trim();
}

function buildWhySelected(item = {}) {
  if (item.whySelected) return item.whySelected;
  const surface = item.sourceSurface || item.sourceType || "rss";
  if (surface === "official-page") return "Official source page matched the Phoenix research source registry and entered editorial scoring.";
  if (surface === "phoenix-original") return "Phoenix original editorial research package entered the Founder Signal publishing lane.";
  if (surface === "youtube") return "Trend-source video feed matched the research registry; publication requires corroborating primary sources.";
  if (surface === "perplexity-research") return "Cited research sweep matched the Phoenix research registry and entered editorial scoring.";
  return "RSS source matched the Phoenix registry and entered editorial scoring.";
}

function annotateCandidate(item = {}, source = {}) {
  return {
    ...item,
    sourceId: item.sourceId || source.id,
    sourceName: item.sourceName || source.name,
    sourceUrl: item.sourceUrl || source.url,
    sourceScore: Number(item.sourceScore ?? source.score ?? 50),
    sourceType: item.sourceType || normalizeSourceType(source),
    sourceSurface: item.sourceSurface || source.sourceSurface || normalizeSourceType(source),
    rawTitle: item.rawTitle || item.title || "",
    topicLabel: item.topicLabel || source.topicLabel || "",
    whySelected: item.whySelected || source.whySelected || "",
    researchCitations: Array.isArray(item.researchCitations)
      ? item.researchCitations
      : Array.isArray(source.researchCitations)
        ? source.researchCitations
        : [],
    requiresCorroboration: Boolean(item.requiresCorroboration || source.requiresCorroboration),
    corroborationDomains: Array.isArray(item.corroborationDomains)
      ? item.corroborationDomains
      : Array.isArray(source.corroborationDomains)
        ? source.corroborationDomains
        : [],
    candidateBuckets: Array.isArray(item.candidateBuckets) && item.candidateBuckets.length
      ? item.candidateBuckets
      : Array.isArray(source.buckets)
        ? source.buckets
        : [],
  };
}

export async function collectRssSource(source, fetchTextImpl, options = {}) {
  const xml = await fetchTextImpl(source.url, source.timeoutMs || options.sourceFetchTimeoutMs || 8000);
  return {
    items: parseFeedXml(xml, { ...source, type: "rss", sourceSurface: "rss" }).map((item) => annotateCandidate(item, source)),
    warnings: [],
  };
}

export async function collectYoutubeSource(source, fetchTextImpl, options = {}) {
  const xml = await fetchTextImpl(source.url, source.timeoutMs || options.sourceFetchTimeoutMs || 8000);
  return {
    items: parseFeedXml(xml, { ...source, type: "youtube", sourceSurface: "youtube" }).map((item) => annotateCandidate(item, source)),
    warnings: [],
  };
}

function anchorText(value = "") {
  return stripHtml(value).replace(/\s+/g, " ").trim();
}

function shouldKeepOfficialLink(title = "", href = "", source = {}) {
  const cleanTitle = anchorText(title);
  if (cleanTitle.length < 18) return false;
  if (/^(learn more|read more|sign in|contact|privacy|terms|careers|home)$/i.test(cleanTitle)) return false;
  const haystack = `${cleanTitle} ${href}`.toLowerCase();
  const keywords = source.includeKeywords || source.preferredKeywords || [
    "ai", "agent", "agents", "codex", "claude", "chatgpt", "release", "changelog",
    "research", "model", "tool", "workflow", "developer", "api", "video"
  ];
  return keywords.some((keyword) => haystack.includes(String(keyword).toLowerCase()));
}

function extractOfficialPageLinks(html = "", source = {}, now = new Date()) {
  const baseUrl = source.url || "";
  const limit = Number(source.limit ?? 6);
  const seen = new Set();
  const anchors = Array.from(String(html).matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi));
  const items = [];

  for (const match of anchors) {
    const attrBlock = match[1] || "";
    const href = getTagAttr(`<a ${attrBlock}>x</a>`, "a", "href");
    const title = anchorText(match[2]);
    if (!href || !shouldKeepOfficialLink(title, href, source)) continue;
    let url = "";
    try {
      url = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(url)) continue;
    const key = normalizeSelectionIdentity(url);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    items.push(annotateCandidate({
      title,
      url,
      description: source.description || "",
      publishedAt: source.assumeFresh ? now.toISOString() : source.publishedAt || "",
      imageUrl: "",
      sourceImageUrl: "",
    }, source));
    if (items.length >= limit) break;
  }

  return items;
}

export async function collectOfficialPageSource(source, fetchTextImpl, options = {}) {
  const now = options.now || new Date();
  const html = await fetchTextImpl(source.url, source.timeoutMs || options.sourceFetchTimeoutMs || 8000);
  const linkItems = extractOfficialPageLinks(html, source, now);
  if (linkItems.length) return { items: linkItems, warnings: [] };

  const metadata = extractArticleMetadata(html, source.url);
  if (!metadata.title && !metadata.description) {
    return {
      items: [],
      warnings: [{
        source: source.name,
        url: source.url,
        error: "Official page had no extractable title, description, or article links",
      }],
    };
  }

  return {
    items: [annotateCandidate({
      title: metadata.title || source.name,
      url: metadata.canonicalUrl || source.url,
      description: metadata.description || source.description || "",
      publishedAt: source.assumeFresh ? now.toISOString() : source.publishedAt || "",
      imageUrl: metadata.imageUrl || "",
      sourceImageUrl: metadata.imageUrl || "",
      articleMetadata: metadata,
    }, source)],
    warnings: [],
  };
}

async function collectManualSource(source, options = {}) {
  const manualPath = path.resolve(APP_ROOT, source.itemsPath || source.path || MANUAL_SIGNALS_PATH);
  const raw = await fs.readFile(manualPath, "utf8");
  const data = JSON.parse(raw);
  const feedId = options.feedId || "";
  const items = Array.isArray(data.items) ? data.items : [];
  const sourceItemIds = Array.isArray(source.itemIds) ? new Set(source.itemIds) : null;
  const sourceFeedIds = Array.isArray(source.feedIds) ? new Set(source.feedIds) : null;

  return {
    items: items
      .filter((item) => item?.enabled !== false)
      .filter((item) => !sourceItemIds || sourceItemIds.has(item.id || item.slug))
      .filter((item) => {
        const itemFeedIds = Array.isArray(item.feedIds) ? item.feedIds : [];
        if (itemFeedIds.length && feedId && !itemFeedIds.includes(feedId)) return false;
        if (sourceFeedIds?.size && feedId && !sourceFeedIds.has(feedId)) return false;
        return true;
      })
      .map((item) => annotateCandidate({
        ...item,
        title: item.title || item.publicTitle || item.sourceTitle || "",
        url: item.url || item.originalUrl || source.url || "",
        originalUrl: item.originalUrl || item.url || source.url || "",
        publishedAt: item.publishedAt || item.date || (options.now || new Date()).toISOString(),
        sourceImageUrl: item.sourceImageUrl || "",
        sourceSurface: "phoenix-original",
        sourceType: "manual",
      }, source)),
    warnings: [],
  };
}

export async function collectPerplexityResearchSource(source, options = {}) {
  const result = await collectPerplexityResearchSourceImpl(source, options);
  return {
    items: (result.items || []).map((item) => annotateCandidate(item, source)),
    warnings: result.warnings || [],
  };
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
    extractPhoenixImagePath(item.imageUrl, siteUrl)
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

function semanticDuplicateScore(a = {}, b = {}) {
  const aText = `${a.title || ""} ${a.description || ""}`;
  const bText = `${b.title || ""} ${b.description || ""}`;
  return Math.min(overlapScore(aText, bText), overlapScore(bText, aText));
}

function isSemanticDuplicateCandidate(a = {}, b = {}) {
  if (!a.title || !b.title) return false;
  if ((a.bucket || "") !== (b.bucket || "")) return false;
  const score = semanticDuplicateScore(a, b);
  return score >= 12;
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
  const title = cleanFeedTitle(item.publicTitle || item.title || "This signal");
  const text = `${title} ${item.description || ""}`.toLowerCase();
  const source = item.sourceName || "a public source";
  if (hasFrontierFundingSignal(item)) {
    return "This funding jump shows what investors believe can hold up: trusted products, real usage, and infrastructure buyers will keep paying for.";
  }
  if (mentionsAny(text, "\\b(shouldn t replace humans|shouldn't replace humans|replace humans|supplant human|human programmers|human judgment)\\b")) {
    return "This is really a boundary story: where assistance helps and where human judgment still matters.";
  }
  if (mentionsAny(text, "\\b(linkedin|investor attention|deal flow|investor|scrolling)\\b")) {
    return "Attention only matters if it opens real investor conversations and moves deal flow.";
  }
  if (mentionsAny(text, "\\b(seo|invisible|search ranking|search visibility|discoverability|harder to find)\\b")) {
    return "If AI search cannot find you, the old discovery playbook is already starting to age.";
  }
  if (mentionsAny(text, "\\b(bankruptcy|bankrupt|debt|fraud|insolvency|chapter 11)\\b")) {
    return "This is what it looks like when weak cash discipline, debt pressure, or fraud finally catches up with a business.";
  }
  if (mentionsAny(text, "\\b(memory)\\b")) {
    return "The market is starting to care less about raw compute and more about the memory layer feeding it.";
  }
  if (mentionsAny(text, "\\b(inference)\\b")) {
    return "This is a bet that the inference layer still has room to get faster, cheaper, and more strategically valuable.";
  }
  if (mentionsAny(text, "\\b(memory|chip|inference|gpu|server|infrastructure)\\b")) {
    return "This points to a deeper infrastructure fight. Watch the bottleneck everyone else assumes is already solved.";
  }
  if (mentionsAny(text, "\\b(benchmark|score|reliability|test|eval|evaluation)\\b")) {
    return "AI still has to earn trust under real workload, not just in a demo.";
  }
  if (mentionsAny(text, "\\b(token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning)\\b")) {
    return "This is the kind of workflow discipline that can turn AI from an expensive experiment into a cheaper operating system.";
  }
  if (mentionsAny(text, "\\b(codex|software delivery|requirements analysis|engineering team|delivery)\\b")) {
    return "Software teams are starting to compress work that used to take weeks into a much faster delivery loop.";
  }
  if (mentionsAny(text, "\\b(dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent)\\b")) {
    return "The real question is whether orchestration removes friction or just gives you one more moving part to babysit.";
  }
  if (mentionsAny(text, "\\b(ocr|document parsing|documents|forms|paperwork)\\b")) {
    return "This is about turning messy documents into usable workflow input. The win is speed, accuracy, and less manual cleanup.";
  }
  if (mentionsAny(text, "\\b(quiz|vibe coded|google ai studio|io 2026|i/o 2026)\\b")) {
    return "This shows how fast AI tools can turn a small idea into something interactive people can try right away.";
  }
  if (mentionsAny(text, "\\b(nonprofit|people-first ai fund|community innovation|grant|grants|public good)\\b")) {
    return "Some of the most useful AI work will be funded by mission fit, not venture math.";
  }
  if (mentionsAny(text, "\\b(tribeca|film|filmmaker|movie|cinema)\\b")) {
    return "A tiny-budget AI film reaching Tribeca is a sign that production tools are getting cheaper, faster, and easier to test in public.";
  }
  if (mentionsAny(text, "\\b(prototype|prototypes|futures lab|students|education)\\b")) {
    return "Useful product ideas often show up as rough prototypes before they look like real companies.";
  }
  if (mentionsAny(text, "\\b(trade show|pipeline|booth|event|conference)\\b")) {
    return "Attention only matters if it turns into qualified conversations, follow-up, and pipeline.";
  }
  if (mentionsAny(text, "\\b(revenue|budget cutting|selling point|top line|search startup)\\b")) {
    const subLane = detectRevenueSubLane(item);
    if (subLane === "contract-revenue") {
      return "This is a story about trust at scale. Big buyers do not move this way unless the offer feels dependable.";
    }
    if (subLane === "growth-acceleration") {
      return "This is a growth story with a clearer trigger behind it than most headlines admit.";
    }
    if (subLane === "budget-pressure") {
      return "This is what a sharper market looks like: buyers still move, but only when the value shows up fast.";
    }
    return "This is a revenue story hiding inside an AI story. Notice what buyers still pay for when budgets get tighter.";
  }
  if (mentionsAny(text, "\\b(layoff|laid-off|hiring|workers|talent|recruiting|join)\\b")) {
    return "Talent is moving again, and faster companies are deciding who they can actually pull in and use well.";
  }
  if (item.bucket === "funding_venture" || item.bucket === "capital_credit") {
    return "Money is not chasing everything. It is chasing a narrower kind of proof than most founders want to admit.";
  }
  if (item.bucket === "ai_operator_impact") {
    return "AI is moving into day-to-day operations. The signal is the workflow that changes, not the headline itself.";
  }
  if (item.bucket === "ai_tools_agents" || item.bucket === "ai_implementation" || item.bucket === "business_automation") {
    return "This points to a workflow shift worth testing in the real world. Look for the task that gets cheaper, faster, or easier first.";
  }
  if (item.bucket === "market_regulatory") {
    return "This could change costs, risk, or timing faster than most people expect.";
  }
  return `${source} surfaced a signal that reveals where pressure or leverage is building.`;
}

function buildEngagementPrompt(item) {
  return buildEngagementQuestion(item);
}

function isHeadlineEcho(value = "", item = {}) {
  const candidate = normalizeKey(value);
  if (!candidate) return false;
  const titleKeys = [
    item.publicTitle,
    item.sourceTitle,
    item.title,
  ]
    .filter(Boolean)
    .map((text) => normalizeKey(text));

  return titleKeys.some((key) => key && (candidate === key || overlapScore(candidate, key) >= Math.max(5, Math.min(candidate.split(" ").length, key.split(" ").length) - 1)));
}

function buildLeadSentence(item, cleanedSummary = "") {
  const publicTitle = item.publicTitle || item.title || "Founder Signal";
  const text = `${publicTitle} ${item.description || ""}`.toLowerCase();

  if (mentionsAny(text, "\\b(shouldn t replace humans|shouldn't replace humans|replace humans|supplant human|human programmers|human judgment)\\b")) {
    return "Cognition's CEO is drawing a line between coding agents that speed people up and agents that try to replace them outright.";
  }
  if (mentionsAny(text, "\\b(benchmark|score|reliability|test|eval|evaluation)\\b")) {
    return "A new enterprise benchmark found frontier AI models handled fewer than half of the agentic IT tasks they were given.";
  }
  if (mentionsAny(text, "\\b(content safety|safety model|multimodal safety|guardrail|guardrails|moderation)\\b")) {
    return "Nvidia is turning content safety into a configurable workflow layer for teams that need AI outputs screened across more than one format.";
  }
  if (mentionsAny(text, "\\b(agentic misalignment|teaching claude|misalignment)\\b")) {
    return "Anthropic is showing how model behavior can drift under pressure and why alignment work has to be tested against real agent tasks.";
  }
  if (hasFrontierFundingSignal(item)) {
    return "Anthropic is closing in on a $1 trillion valuation as investors keep betting on trusted AI products, real usage, and infrastructure.";
  }
  if (mentionsAny(text, "\\b(memory|chip|inference|gpu|server|infrastructure)\\b")) {
    return cleanedSummary || "Money is moving deeper into AI infrastructure as the market chases the layer that may limit the next wave of growth.";
  }
  if (mentionsAny(text, "\\b(token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning)\\b")) {
    return "GitHub says disciplined audits, smaller tool stacks, and simpler workflow choices cut token spend by up to 62 percent.";
  }
  if (mentionsAny(text, "\\b(usage limit|license(?:s)?|blew\\s*\\$|spent\\s*\\$|monthly ai bill|single month)\\b")) {
    return "One company reportedly ran up a massive Claude bill in a single month after leaving employee usage limits too loose.";
  }
  if (mentionsAny(text, "\\b(dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent)\\b")) {
    return "Anthropic is pushing AI closer to managed multi-step work with a new dynamic workflow tool for coordinating subagents.";
  }
  if (mentionsAny(text, "\\b(trade show|pipeline|booth|event|conference)\\b")) {
    return "One founder turned a small trade show booth into dozens of content assets and nearly $1 million in pipeline.";
  }
  if (mentionsAny(text, "\\b(layoff|laid-off|hiring|workers|talent|recruiting|join)\\b")) {
    return "A fast-growing AI company is using the layoff cycle to pull experienced operators into a more demanding startup environment.";
  }
  if (mentionsAny(text, "\\b(ocr|document parsing|documents|forms|paperwork)\\b")) {
    return "PaddleOCR 3.5 pushes document parsing closer to a usable workflow layer instead of a one-off extraction demo.";
  }
  if (mentionsAny(text, "\\b(quiz|vibe coded|google ai studio|io 2026|i/o 2026)\\b")) {
    return "A lightweight Google AI Studio build shows how fast a simple interactive idea can turn into something people can click and try.";
  }
  if (mentionsAny(text, "\\b(nonprofit|people-first ai fund|community innovation|grant|grants|public good)\\b")) {
    return "OpenAI is backing nonprofits with a $50 million fund aimed at education, community innovation, and economic opportunity.";
  }
  if (mentionsAny(text, "\\b(prototype|prototypes|futures lab|students|education)\\b")) {
    return "The Futures Lab is surfacing early AI prototypes that feel closer to real product signals than classroom experiments.";
  }
  if (mentionsAny(text, "\\b(i gave an ai agent|agent challenge|make 10k|zero to 10k)\\b")) {
    return "One founder turned a zero-budget AI agent challenge into a live test of what these workflows can actually produce.";
  }

  if (cleanedSummary && !isHeadlineEcho(cleanedSummary, item)) return cleanedSummary;
  if (mentionsAny(text, "\\b(tribeca|film|filmmaker|movie|cinema)\\b")) {
    return "A low-cost AI film is reaching a real festival stage, which says more about tool maturity than most demo reels do.";
  }
  return toSentence(publicTitle);
}

function buildTrendContext(item, relatedSignals = []) {
  if (relatedSignals.length) {
    return `This lines up with recent Phoenix signals around ${relatedSignals.map((signal) => signal.bucketLabel || "market shifts").slice(0, 2).join(" and ")}. The next read is whether it stays isolated or starts repeating across the market.`;
  }
  const text = editorialText(item);
  if (mentionsAny(text, "\\b(shouldn t replace humans|shouldn't replace humans|replace humans|supplant human|human programmers|human judgment)\\b")) {
    return "The next divide here is between tools sold as replacement and tools that create leverage while keeping human control clear.";
  }
  if (hasFrontierFundingSignal(item)) {
    return "The next funding cycle will show whether the market keeps rewarding adoption or falls back to spectacle.";
  }
  if (mentionsAny(text, "\\b(benchmark|score|reliability|test|eval|evaluation)\\b")) {
    return "If more benchmark results look like this, founders will need to slow down before handing critical work to agents.";
  }
  if (mentionsAny(text, "\\b(memory|chip|inference|gpu|server|infrastructure)\\b")) {
    return "If more capital flows into the same layer, this stops being a niche hardware story and becomes a market map.";
  }
  if (mentionsAny(text, "\\b(bankruptcy|bankrupt|debt|fraud|insolvency|chapter 11)\\b")) {
    return "The next pressure point is where debt, fraud, or financing stress starts exposing weaker operators.";
  }
  if (mentionsAny(text, "\\b(linkedin|investor attention|deal flow|investor|scrolling)\\b")) {
    return "The follow-on signal is whether founders who win attention also make their traction easier to verify.";
  }
  if (mentionsAny(text, "\\b(seo|invisible|search ranking|search visibility|discoverability|harder to find)\\b")) {
    return "The next shift to track is whether AI search rewards clearer structure and proof over older SEO habits.";
  }
  if (mentionsAny(text, "\\b(token|audit|auditor|optimizer|mcp|cli|workflow spend|pruning)\\b")) {
    return "The market signal to track is whether leaner agent stacks beat bigger, noisier ones on cost and reliability.";
  }
  if (mentionsAny(text, "\\b(usage limit|license(?:s)?|blew\\s*\\$|spent\\s*\\$|monthly ai bill|single month)\\b")) {
    return "The next response here is tighter spend controls, role limits, and approval gates as AI moves deeper into daily work.";
  }
  if (mentionsAny(text, "\\b(codex|software delivery|requirements analysis|engineering team|delivery)\\b")) {
    return "The next clue is whether more delivery teams rebuild around smaller agent loops instead of bigger project cycles.";
  }
  if (mentionsAny(text, "\\b(ocr|document parsing|documents|forms|paperwork)\\b")) {
    return "The real adoption marker is whether document-heavy teams start treating this as table stakes instead of a niche back-office tool.";
  }
  if (mentionsAny(text, "\\b(quiz|vibe coded|google ai studio|io 2026|i/o 2026)\\b")) {
    return "What comes next is whether these lightweight builds stay playful demos or become the first draft of real products.";
  }
  if (mentionsAny(text, "\\b(nonprofit|people-first ai fund|community innovation|grant|grants|public good)\\b")) {
    return "The broader question is whether more public-good AI funding starts creating operating models worth copying in the private market too.";
  }
  if (mentionsAny(text, "\\b(prototype|prototypes|futures lab|students|education)\\b")) {
    return "The stronger pattern is which prototype ideas escape the lab and solve a problem people will actually pay to fix.";
  }
  if (mentionsAny(text, "\\b(revenue|budget cutting|selling point|top line|search startup)\\b")) {
    const subLane = detectRevenueSubLane(item);
    if (subLane === "contract-revenue") {
      return "A stronger follow-on pattern would be more durable growth from harder buyers and longer contracts, not just faster hype cycles.";
    }
    if (subLane === "growth-acceleration") {
      return "The stronger pattern is which companies turn AI interest into measurable sales acceleration instead of a temporary spike.";
    }
    if (subLane === "budget-pressure") {
      return "The next breakout tools likely win by shortening payback, not by sounding more futuristic.";
    }
    return "The next winners here are likely to grow by saving buyers money, not just by promising more AI.";
  }
  if (mentionsAny(text, "\\b(layoff|laid-off|hiring|workers|talent|recruiting|join)\\b")) {
    return "A useful follow-on signal is whether more fast AI companies start recruiting from the same talent pool.";
  }
  if (mentionsAny(text, "\\b(dynamic workflow|subagent|subagents|swarm|orchestrat|multi-agent)\\b")) {
    return "The real test is whether these orchestration layers become daily operating systems or stay impressive demos with too much overhead.";
  }
  if (mentionsAny(text, "\\b(trade show|pipeline|booth|event|conference)\\b")) {
    return "The repeatable version of this story is more founders treating events as content engines and follow-up systems instead of one-off visibility plays.";
  }
  if (item.bucket === "funding_venture") {
    return "The next funding cycle will show what kind of proof still commands attention.";
  }
  if (item.bucket === "capital_credit") {
    return "The next move to watch is where lenders and operators tighten standards before the headlines fully catch up.";
  }
  if (item.bucket === "ai_operator_impact") {
    return "The broader pattern is this same shift showing up inside operations, not just in product announcements.";
  }
  if (item.bucket === "ai_tools_agents") {
    return "The real tell is whether this becomes part of daily work instead of staying a good demo.";
  }
  return "The next proof point is this signal showing up again from a different angle.";
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
  if (hasFrontierFundingSignal(item)) {
    return {
      whyItMatters: "Anthropic is not raising this kind of money because AI is trendy. Investors are betting that trusted AI tools will become part of everyday business work.",
      whyShared: "Phoenix shared this because the funding race shows what the market is starting to reward: real adoption, trusted brands, strong infrastructure, and a path to revenue that can last.",
      founderTakeaway: "For founders, the lesson is simple: do not sell AI hype. Show the proof. Who uses it? What gets easier? Why would they keep paying?",
      businessTakeaway: "The practical move is to tighten your own story before chasing attention. Make the offer clear, make the result measurable, and make the next step easy to understand."
    };
  }
  const defaults = {
    whyItMatters: `This ${bucketLabel.toLowerCase()} signal points to a market change that deserves founder attention now.`,
    whyShared: `Phoenix shared this because ${source} surfaced a signal that can help entrepreneurs make better decisions about AI, funding, operations, or revenue.`,
    founderTakeaway: "Decide what to watch, what to test, and what to tighten inside the business while the signal is still early.",
    businessTakeaway: "Turn the attention into one concrete operating question before it turns into background noise."
  };
  return { ...defaults, ...bucketContext };
}

function buildSignalCta() {
  return "Read the full Phoenix signal:";
}

function buildSignalCtaLine(item) {
  const cta = buildSignalCta(item).replace(/:\s*$/, "");
  let host = "phoenixventurestudios.com";
  try {
    host = new URL(item.internalUrl || item.url || "https://phoenixventurestudios.com").hostname.replace(/^www\./, "");
  } catch {
    // Keep default host string.
  }
  return `${cta} on ${host}.`;
}

function buildPhoenixRssStory(item) {
  if (Array.isArray(item.articleBody) && item.articleBody.length) {
    const parts = item.articleBody
      .map((paragraph) => stripHtml(paragraph).replace(/\s+/g, " ").trim())
      .filter(Boolean);
    if (item.internalUrl) parts.push(buildSignalCtaLine(item));
    parts.push(buildContextualHashtags(item));
    return parts.filter(Boolean).join("\n\n");
  }

  const shortSourceSummary = stripHtml(item.description || item.content_text || "").replace(/\s+/g, " ").trim();
  const internalUrl = item.internalUrl || item.url || "";
  const founderTakeaway = stripLeadingLabel(item.founderTakeaway, /^for founders[:,]\s*/i);
  const preferredTakeaway = isGenericTakeaway(founderTakeaway) ? "" : founderTakeaway;
  const editorialTakeaway = preferredTakeaway || buildFounderTakeaway(item);
  const publicTitle = item.publicTitle || item.title || "Founder Signal";
  const cleanedSummary = stripSourceLead(shortSourceSummary, item.sourceName || "");
  const leadSentence = buildLeadSentence(item, cleanedSummary);
  const lane = detectEditorialLane(item);
  let parts;

  if (lane === "hardware-inference") {
    parts = [
      leadSentence,
      item.simpleSummary,
      "The prize here is not just faster infrastructure. It is a product that feels fast enough, cheap enough, and steady enough to spread.",
      item.trendContext
    ];
  } else if (lane === "human-boundary") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "The smartest teams will decide where the machine accelerates the work and where the human still owns the call.",
      item.trendContext
    ];
  } else if (lane === "hardware-memory") {
    parts = [
      leadSentence,
      item.simpleSummary,
      "Memory is becoming the part of the stack that decides what can scale and what stays expensive.",
      item.trendContext
    ];
  } else if (lane === "reliability") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Keep a human in the loop anywhere the task touches production, money, or trust.",
      item.trendContext
    ];
  } else if (lane === "workflow-cost") {
    parts = [
      leadSentence,
      item.simpleSummary,
      "Cheaper AI work usually comes from tighter systems, not louder tooling.",
      item.trendContext
    ];
  } else if (lane === "workflow-delivery") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Start with one workflow that matters enough to measure and repeats enough to improve.",
      item.trendContext
    ];
  } else if (lane === "workflow-orchestration") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Do not admire the orchestration graph. Ask which messy handoff disappears if it works.",
      item.trendContext
    ];
  } else if (lane === "event-pipeline") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "The point is not to look busy at the event. It is to leave with a follow-up engine already built.",
      item.trendContext
    ];
  } else if (lane === "talent-flow") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Fast companies win these moments by knowing exactly who they need and why that operator matters now.",
      item.trendContext
    ];
  } else if (lane === "document-ai") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "The first win is usually boring on the surface and valuable in the books.",
      item.trendContext
    ];
  } else if (lane === "interactive-prototype") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "A rough interactive build can surface demand faster than another round of planning ever will.",
      item.trendContext
    ];
  } else if (lane === "prototype-lab") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Early prototypes matter because they reveal which awkward ideas are quietly becoming useful.",
      item.trendContext
    ];
  } else if (lane === "mission-funding") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Not every strong AI opportunity wants the same capital stack or the same growth logic.",
      item.trendContext
    ];
  } else if (lane === "search-visibility") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "If the market cannot find you, the problem may be clarity before it is traffic.",
      item.trendContext
    ];
  } else if (lane === "revenue-proof") {
    const revenueSubLane = detectRevenueSubLane(item);
    parts = [
      leadSentence,
      item.simpleSummary,
      revenueSubLane === "contract-revenue"
        ? "The interesting part is not the contract number. It is what made this company believable enough to win harder buyers."
        : revenueSubLane === "growth-acceleration"
          ? "The useful clue is not just that revenue moved. It is what made customers move sooner."
          : revenueSubLane === "budget-pressure"
            ? "The useful signal is not growth alone. It is that buyers still approved spend because the pain was already expensive enough."
          : editorialTakeaway || "The signal worth stealing is what buyers still say yes to when everyone else is cutting.",
      item.trendContext
    ];
  } else if (lane === "distress") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Collapse usually looks obvious only after the pressure has been building for a while.",
      item.trendContext
    ];
  } else if (lane === "frontier-funding") {
    parts = [
      leadSentence,
      "The money matters, but the better clue is what investors think will hold up: trusted products, real usage, and infrastructure that customers will keep paying for.",
      "For founders, the lesson is simple. Do not borrow the hype. Borrow the standard of proof.",
      "The next round of funding will show whether the market keeps rewarding adoption or falls back to spectacle."
    ];
  } else if (lane === "capital-proof") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Tighten the story behind the offer before you ask for capital or attention.",
      item.trendContext
    ];
  } else if (lane === "operator-shift") {
    parts = [
      leadSentence,
      item.simpleSummary,
      editorialTakeaway || "Ask what part of the workflow changes if this becomes normal, then test that before you chase the whole trend.",
      item.trendContext
    ];
  } else if (/\bvisa\b/i.test(shortSourceSummary) && /\breplit\b/i.test(shortSourceSummary)) {
    parts = [
      "Visa is moving Replit closer to the payment layer, not just the prototype layer.",
      "More than 1,000 employees have already used it for prototyping, and now the signal is whether AI builders start touching money movement people have to trust.",
      "For founders building apps, automations, or client systems, this is where coding tools start to matter more. They are connecting ideas, code, and transactions in one flow.",
      "The next real proof point is more large companies moving AI builders from internal testing into workflows customers actually touch."
    ];
  } else {
    parts = [
      leadSentence,
      item.simpleSummary || item.whyItMatters,
      editorialTakeaway || "",
      item.trendContext || ""
    ];
  }

  if (internalUrl) parts.push(buildSignalCtaLine(item));
  parts.push(buildContextualHashtags(item));
  return parts.filter(Boolean).join("\n\n");
}

export function enrichSignalItem(item, options = {}) {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const context = buildPhoenixContext(item);
  const slug = item.slug || buildSignalSlug(item);
  const internalPath = item.internalPath || `/founder-signal/signals/${slug}`;
  const normalizedInternalPath = internalPath.endsWith("/") ? internalPath : `${internalPath}/`;
  const internalUrl = `${siteUrl}${normalizedInternalPath}`;
  const originalUrl = item.originalUrl || item.url || "";
  const sourceImageUrl = item.sourceImageUrl ||
    (/^https?:\/\//i.test(item.imageUrl || "") && !extractPhoenixImagePath(item.imageUrl, siteUrl) ? item.imageUrl : "");
  const creativeDirection = assignImageCreativeDirection(item);
  const resolvedSourcePolicy = resolveSourceImagePolicy(item, options.sourceImageAllowlist);
  const imageBrief = {
    ...(item.imageBrief || createImageBrief({ ...item, slug, sourceImageUrl, ...creativeDirection })),
    ...creativeDirection
  };
  imageBrief.sourceImagePolicy = item.sourceImagePolicy || resolvedSourcePolicy.policy || imageBrief.sourceImagePolicy;
  imageBrief.sourceImageEligibility = imageBrief.sourceImageEligibility || imageBrief.sourceImagePolicy;
  const hasNonPublicSourceImage = Boolean(sourceImageUrl) && resolvedSourcePolicy.policy !== "allowed";
  const isOwnedFallbackBackground = item.imageHoldReason === "story-specific-cover-still-needed";
  if (
    item.imageStrategy === "source-allowlisted" ||
    (item.imageStrategy === "held-for-codex-image" && item.imageApprovalStatus === "approved")
  ) {
    imageBrief.articleImageRequired = false;
    if (!(hasNonPublicSourceImage && isOwnedFallbackBackground)) {
      imageBrief.manualReviewNeeded = false;
    }
  }
  const socialImagePath = getOwnedSignalImagePath(item, siteUrl);
  const imageUrl = socialImagePath ? getOwnedSignalImageUrl({ ...item, socialImagePath }, siteUrl) : "";
  const imageApprovalStatus = item.imageApprovalStatus || (
    item.imageStrategy === "source-allowlisted"
      ? "approved"
      : item.imageStrategy === "held-for-codex-image"
        ? (socialImagePath ? "approved" : "held")
        : "held"
  );

  return {
    ...item,
    slug,
    internalPath,
    internalUrl,
    originalUrl,
    sourceImageUrl,
    imageBrief,
    imagePath: item.imagePath || socialImagePath || "",
    imageUrl,
    socialImagePath: socialImagePath || "",
    socialImageUrl: imageUrl,
    imageStrategy: item.imageStrategy || "held-for-codex-image",
    imageApprovalStatus,
    imageHoldReason: item.imageHoldReason || (imageApprovalStatus === "held" ? "codex-image-pending" : ""),
    imageFamily: item.imageFamily || imageBrief.imageFamily,
    imageSourceType: item.imageSourceType || (imageApprovalStatus === "approved" ? "phoenix-owned" : "pending-codex-image"),
    imageCredit: item.imageCredit || "",
    imageRightsStatus: item.imageRightsStatus || (imageApprovalStatus === "approved" ? "owned-or-licensed" : "manual-review"),
    imageTemplate: item.imageTemplate || imageBrief.template,
    imageVariant: item.imageVariant || imageBrief.imageVariant,
    imageTone: item.imageTone || imageBrief.imageTone,
    imageComposition: item.imageComposition || imageBrief.imageComposition,
    sceneLane: item.sceneLane || imageBrief.sceneLane,
    sceneMotif: item.sceneMotif || imageBrief.sceneMotif,
    imageFingerprint: item.imageFingerprint || imageBrief.imageFingerprint,
    imageWarnings: item.imageWarnings || [],
    rawTitle: item.rawTitle || item.sourceTitle || item.title,
    reviewTitle: item.reviewTitle || buildReviewTitle(item),
    topicLabel: topicLabelForItem(item),
    whySelected: buildWhySelected(item),
    sourceSurface: item.sourceSurface || item.sourceType || "rss",
    researchCitations: Array.isArray(item.researchCitations) ? item.researchCitations : [],
    imageDecision: item.imageDecision || buildImageDecision(item),
    imageDiagnosticReason: item.imageDiagnosticReason || buildImageDiagnosticReason(item),
    imageDiagnostic: item.imageDiagnostic || {},
    sourceImagePolicy: item.sourceImagePolicy || imageBrief.sourceImagePolicy || "",
    whyItMatters: item.whyItMatters || context.whyItMatters,
    whyShared: item.whyShared || context.whyShared,
    founderTakeaway: item.founderTakeaway || context.founderTakeaway,
    businessTakeaway: item.businessTakeaway || context.businessTakeaway
  };
}

export function classifyItem(item) {
  const text = `${item.title} ${item.description}`.toLowerCase();
  const allowed = item.candidateBuckets.length ? item.candidateBuckets : Object.keys(BUCKET_LABELS);
  if (
    allowed.includes("funding_venture") &&
    mentionsAny(text, "\\b(valuation|funding|fundraise|raised|raise|investor|ipo|billion|million|seed|series|backed)\\b") &&
    mentionsAny(text, "\\b(ai|anthropic|openai|claude|model|agentic|inference|chip|startup)\\b")
  ) {
    return "funding_venture";
  }
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

function shouldExcludePoliticalTopic(item) {
  const headlineText = `${item.title || ""} ${item.url || ""}`.toLowerCase();
  const fullText = `${item.title || ""} ${item.description || ""} ${item.url || ""}`.toLowerCase();
  if (!POLITICAL_HARD_BLOCK_PATTERN.test(fullText)) return false;
  return !POLITICAL_ALLOW_OVERRIDE_PATTERN.test(headlineText);
}

export function scoreItem(item, now = new Date(), options = {}) {
  const bucket = classifyItem(item);
  const sponsored = SPONSORED_PATTERN.test(`${item.title} ${item.description} ${item.url}`);
  const political = shouldExcludePoliticalTopic(item);
  const uncorroboratedTrend = Boolean(item.requiresCorroboration && !hasAllowedCorroboration(item));
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
  const sourceSurface = item.sourceSurface || item.sourceType || "rss";
  const sourceSurfaceScore =
    sourceSurface === "official-page" ? 10 :
      sourceSurface === "perplexity-research" ? 7 :
        sourceSurface === "youtube" ? -8 :
          0;

  const score =
    recencyScore(days) +
    Math.round(item.sourceScore / 4) +
    sourceSurfaceScore +
    headlineStrength(item.title) +
    Math.min(keywordScore, 18) +
    phraseScore(text, preferredKeywords, 5, 25) -
    phraseScore(text, penaltyKeywords, 14, 70) +
    (item.description ? 4 : 0) -
    (sponsored ? 120 : 0) -
    (political ? 120 : 0) -
    (uncorroboratedTrend ? 120 : 0);

  return {
    ...item,
    bucket,
    bucketLabel: BUCKET_LABELS[bucket] ?? bucket,
    score,
    ageDays: Number(days.toFixed(2)),
    preferredKeywordHits,
    penaltyKeywordHits,
    sourceSurfaceScore,
    excluded: sponsored || political || uncorroboratedTrend,
    excludeReason: sponsored
      ? "sponsored_or_paid_content"
      : political
        ? "political_or_culture_war_topic"
        : uncorroboratedTrend
          ? "trend_source_requires_primary_corroboration"
        : ""
  };
}

function hasStrongToolsIntent(item) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  return TOOLS_ACTIONABLE_INTENT_PATTERN.test(text);
}

function shouldExcludeFromToolsFeed(item) {
  const weakMarketSignal =
    TOOLS_WEAK_MARKET_PATTERN.test(`${item.title || ""} ${item.description || ""}`) ||
    item.bucket === "funding_venture" ||
    item.bucket === "capital_credit";
  return weakMarketSignal && !hasStrongToolsIntent(item);
}

function hasStrongAiAttentionIntent(item) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  return AI_ATTENTION_STRONG_INTENT_PATTERN.test(text);
}

function shouldExcludeFromAiAttentionFeed(item) {
  const text = `${item.title || ""} ${item.description || ""}`.toLowerCase();
  const productLaunchBias = AI_ATTENTION_WEAK_PRODUCT_PATTERN.test(text);
  const strongImplementationIntent = hasStrongAiAttentionIntent(item);
  const implementationBias =
    strongImplementationIntent ||
    item.bucket === "ai_implementation" ||
    item.bucket === "ai_consulting" ||
    item.bucket === "business_automation";

  if (productLaunchBias) return !strongImplementationIntent;
  return !implementationBias;
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
    const semanticallyDuplicative = selected.some((selectedItem) => isSemanticDuplicateCandidate(item, selectedItem));
    return !selectedKeys.has(key) && !semanticallyDuplicative && selected.length < limit && (sourceCounts[sourceKey] ?? 0) < maxPerSource;
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
    {
      feedId: options.feedId || options.id || "founder-market",
      recentItems: options.recentItems || [],
      sourceImageAllowlist: options.sourceImageAllowlist,
    }
  );
  const itemXml = enrichedItems.map((item) => {
    const itemDescription = buildPhoenixRssStory(item);
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
    {
      feedId: options.feedId || options.id || "founder-market",
      recentItems: options.recentItems || [],
      sourceImageAllowlist: options.sourceImageAllowlist,
    }
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
      content_text: buildPhoenixRssStory(item),
      image: item.socialImageUrl || item.imageUrl,
      banner_image: item.socialImageUrl || item.imageUrl,
      date_published: new Date(Date.parse(item.publishedAt) || now.getTime()).toISOString(),
      authors: [{ name: item.sourceName }],
      tags: [item.bucketLabel],
      _phoenix: {
        bucket: item.bucket,
        score: item.score,
        source: item.sourceName,
        sourceName: item.sourceName,
        sourceSurface: item.sourceSurface || item.sourceType || "rss",
        rawTitle: item.rawTitle || item.sourceTitle || item.title,
        reviewTitle: item.reviewTitle || buildReviewTitle(item),
        topicLabel: item.topicLabel || topicLabelForItem(item),
        whySelected: item.whySelected || buildWhySelected(item),
        researchCitations: item.researchCitations || [],
        slug: item.slug,
        publicTitle: item.publicTitle || item.title,
        sourceTitle: item.sourceTitle || item.title,
        imageUrl: item.imageUrl,
        socialImageUrl: item.socialImageUrl || item.imageUrl,
        socialImagePath: item.socialImagePath || item.imagePath || "",
        sourceImageUrl: "",
        feedId: options.feedId || options.id || "founder-market",
        imageStrategy: item.imageStrategy,
        imageApprovalStatus: item.imageApprovalStatus,
        imageHoldReason: item.imageHoldReason,
        imageFamily: item.imageFamily,
        imageSourceType: item.imageSourceType,
        imageCredit: item.imageCredit,
        imageRightsStatus: item.imageRightsStatus,
        imageTemplate: item.imageTemplate,
        imageVariant: item.imageVariant,
        imageTone: item.imageTone,
        imageComposition: item.imageComposition,
        sceneLane: item.sceneLane,
        sceneMotif: item.sceneMotif,
        imageFingerprint: item.imageFingerprint,
        imageVisualHash: item.imageVisualHash || "",
        imageWarnings: item.imageWarnings || [],
        imageAudit: item.imageAudit || null,
        imageCorrectionTrail: item.imageCorrectionTrail || [],
        imageDecision: item.imageDecision || buildImageDecision(item),
        imageDiagnosticReason: item.imageDiagnosticReason || buildImageDiagnosticReason(item),
        imageDiagnostic: item.imageDiagnostic || {},
        imageCertification: buildImageCertification(item),
        imageBrief: getNormalizedImageBrief(item, options.sourceImageAllowlist),
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
        rssStory: buildPhoenixRssStory(item),
        whyItMatters: item.whyItMatters,
        whyShared: item.whyShared,
        founderTakeaway: item.founderTakeaway,
        businessTakeaway: item.businessTakeaway,
        articleBody: item.articleBody || [],
        sourceLinks: item.sourceLinks || []
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

function shouldAutoMergeResearchRegistry(registryPath, options = {}) {
  if (typeof options.includeResearchRegistry === "boolean") return options.includeResearchRegistry;
  const resolved = path.resolve(registryPath);
  return [DEFAULT_REGISTRY_PATH, TOOLS_REGISTRY_PATH, AI_ATTENTION_REGISTRY_PATH]
    .map((item) => path.resolve(item))
    .includes(resolved);
}

function sourceCadenceApplies(source = {}, now = new Date(), options = {}) {
  if (options.includeOffCadenceSources) return true;
  const cadence = String(source.cadence || "daily").toLowerCase();
  if (cadence === "weekly-friday") return now.getDay() === 5;
  return true;
}

function sourceAppliesToFeed(source = {}, feedId = "", now = new Date(), options = {}) {
  if (isSocialQueueFeedId(feedId) && !source.runInSocialFeeds && options.includeResearchRegistry !== true) return false;
  if (!sourceCadenceApplies(source, now, options)) return false;
  const feedIds = Array.isArray(source.feedIds) ? source.feedIds : [];
  return !feedIds.length || feedIds.includes(feedId);
}

async function loadResearchSources(options = {}, feedId = "", registryPath = DEFAULT_REGISTRY_PATH) {
  const now = options.now || new Date();
  const limit = Number(options.researchSourceLimit ?? (isToolsFeedId(feedId) ? 8 : 6));
  const applyLimit = (sources = []) => sources
    .sort((left, right) => Number(right.score ?? 0) - Number(left.score ?? 0))
    .slice(0, Math.max(0, limit));
  if (Array.isArray(options.researchSources)) {
    return applyLimit(options.researchSources.filter((source) => source?.enabled && sourceAppliesToFeed(source, feedId, now, options)));
  }
  if (!shouldAutoMergeResearchRegistry(registryPath, options)) return [];
  const researchRegistryPath = options.researchRegistryPath ?? RESEARCH_SOURCE_REGISTRY_PATH;
  const researchRegistry = await readOptionalJson(researchRegistryPath, { sources: [] });
  return applyLimit(Array.isArray(researchRegistry.sources)
    ? researchRegistry.sources.filter((source) => source?.enabled && sourceAppliesToFeed(source, feedId, now, options))
    : []);
}

function mergeSources(primarySources = [], researchSources = []) {
  const byId = new Map();
  for (const source of [...primarySources, ...researchSources]) {
    if (!source?.enabled) continue;
    const id = source.id || `${source.type || "source"}:${source.url || source.name}`;
    if (!byId.has(id)) byId.set(id, source);
  }
  return Array.from(byId.values());
}

async function mapWithConcurrency(items = [], limit = 4, worker) {
  const concurrency = Math.max(1, Math.min(Number(limit) || 1, items.length || 1));
  const results = new Array(items.length);
  let nextIndex = 0;
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await worker(items[index], index);
    }
  }));
  return results;
}

async function withTimeout(promise, timeoutMs = 10000, label = "operation") {
  let timeout = null;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timeout = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function collectSourceItems(source, options = {}) {
  const fetchTextImpl = options.fetchTextImpl;
  const type = normalizeSourceType(source);
  if (type === "rss") return collectRssSource(source, fetchTextImpl, options);
  if (type === "youtube") return collectYoutubeSource(source, fetchTextImpl, options);
  if (type === "official-page") return collectOfficialPageSource(source, fetchTextImpl, options);
  if (type === "manual") return collectManualSource(source, options);
  if (type === "perplexity-research") return collectPerplexityResearchSource(source, options);
  return {
    items: [],
    warnings: [{
      source: source.name || source.id || "unknown",
      url: source.url || "",
      error: `Unsupported source type: ${source.type || "unknown"}`,
    }],
  };
}

function hasAllowedCorroboration(item = {}) {
  if (!item.requiresCorroboration) return true;
  const domains = (item.corroborationDomains || []).map((domain) => String(domain).replace(/^www\./, "").toLowerCase());
  if (!domains.length) return false;
  return (item.researchCitations || []).some((citation) => {
    try {
      const host = new URL(citation.url || citation).hostname.replace(/^www\./, "").toLowerCase();
      return domains.some((domain) => host === domain || host.endsWith(`.${domain}`));
    } catch {
      return false;
    }
  });
}

function buildImageDiagnosticReason(item = {}) {
  const diagnostic = item.imageDiagnostic || {};
  const policy = item.sourceImagePolicy || item.imageDiagnostic?.sourceImagePolicy || "";
  const warningText = Array.isArray(item.imageWarnings) ? item.imageWarnings.join(" ") : "";
  if (item.imageApprovalStatus === "held") {
    if (/generated|replacement/i.test(item.imageHoldReason || "")) return "held because generated art failed";
    return item.imageHoldReason ? `held: ${item.imageHoldReason}` : "held because generated art failed or no approved Phoenix image exists";
  }
  if (item.imageSourceType === "phoenix-owned") {
    if (/allowlisted source image failed|source image failed the local art-director audit/i.test(warningText)) {
      return "OG image failed audit; Phoenix generated art used";
    }
    if (diagnostic.feedImageMissing && diagnostic.articleImageFound) {
      return policy && policy !== "allowed"
        ? `OG image found but source policy is ${policy}; Phoenix generated art used`
        : "RSS image missing; OG image found; Phoenix generated art used";
    }
    if (diagnostic.feedImageMissing) return "RSS image missing; Phoenix generated art used";
    if (policy && policy !== "allowed") return `source image policy is ${policy}; Phoenix generated art used`;
    return "Phoenix generated art used";
  }
  if (item.imageStrategy === "source-allowlisted") {
    if (diagnostic.articleImageFound) return "OG image found and allowed source image passed audit";
    return "RSS image found and allowed source image passed audit";
  }
  if (diagnostic.articleImageFetchError) return `RSS image missing; article metadata fetch failed: ${diagnostic.articleImageFetchError}`;
  return diagnostic.feedImageMissing ? "RSS image missing" : "RSS image found";
}

function buildImageDecision(item = {}) {
  if (item.imageApprovalStatus === "held") return "held";
  if (item.imageStrategy === "source-allowlisted") return "allowed-source-image-used";
  if (item.imageSourceType === "phoenix-owned") return requiresCreativeFollowUp(item)
    ? "phoenix-owned-background-used-creative-follow-up"
    : "phoenix-generated-art-used";
  return item.imageStrategy || "unknown";
}

function normalizeImagePolicyMetadata(item = {}, sourceImageAllowlist = DEFAULT_IMAGE_SOURCE_ALLOWLIST) {
  const sourcePolicy = resolveSourceImagePolicy(item, sourceImageAllowlist);
  if (!item.imageBrief) {
    return {
      ...item,
      sourceImagePolicy: sourcePolicy.policy || item.sourceImagePolicy,
    };
  }

  return {
    ...item,
    sourceImagePolicy: sourcePolicy.policy || item.sourceImagePolicy,
    imageBrief: {
      ...item.imageBrief,
      sourceImagePolicy: sourcePolicy.policy || item.sourceImagePolicy || item.imageBrief.sourceImagePolicy,
      sourceImageEligibility: sourcePolicy.policy || item.sourceImagePolicy || item.imageBrief.sourceImageEligibility || item.imageBrief.sourceImagePolicy,
    },
  };
}

function getNormalizedImageBrief(item = {}, sourceImageAllowlist = DEFAULT_IMAGE_SOURCE_ALLOWLIST) {
  return normalizeImagePolicyMetadata(item, sourceImageAllowlist).imageBrief || null;
}

function withReviewLabels(item = {}, sourceImageAllowlist = DEFAULT_IMAGE_SOURCE_ALLOWLIST) {
  const sourcePolicy = resolveSourceImagePolicy(item, sourceImageAllowlist);
  const normalizedItem = normalizeImagePolicyMetadata(item, sourceImageAllowlist);
  const labeled = {
    ...normalizedItem,
    topicLabel: topicLabelForItem(item),
    whySelected: buildWhySelected(item),
    sourceSurface: item.sourceSurface || item.sourceType || "rss",
    rawTitle: item.rawTitle || item.sourceTitle || item.title,
    researchCitations: Array.isArray(item.researchCitations) ? item.researchCitations : [],
    sourceImagePolicy: item.sourceImagePolicy || sourcePolicy.policy,
  };
  labeled.reviewTitle = item.reviewTitle || buildReviewTitle(labeled);
  labeled.imageDecision = buildImageDecision(labeled);
  labeled.imageDiagnosticReason = buildImageDiagnosticReason(labeled);
  return labeled;
}

export async function enrichItemsWithArticleMetadata(items = [], options = {}) {
  if (options.enableArticleMetadata === false) return items;
  const fetchArticleMetadataImpl = options.fetchArticleMetadataImpl || fetchArticleMetadata;
  const fetchTextImpl = options.fetchTextImpl;
  const maxItems = Number(options.articleMetadataMaxItems ?? 30);
  const timeoutMs = Number(options.articleMetadataTimeoutMs ?? 6000);

  return mapWithConcurrency(items, options.articleMetadataConcurrency ?? 6, async (item, index) => {
    const feedImageMissing = !item.sourceImageUrl;
    if (!feedImageMissing && !item.articleMetadata) {
      return {
        ...item,
        imageDiagnostic: {
          ...(item.imageDiagnostic || {}),
          feedImageMissing: false,
          articleImageChecked: false,
          articleImageFound: false,
          imageDecision: "RSS image found",
        },
      };
    }
    if (!item.url || index >= maxItems) {
      return {
        ...item,
        imageDiagnostic: {
          ...(item.imageDiagnostic || {}),
          feedImageMissing,
          articleImageChecked: false,
          imageDecision: feedImageMissing ? "rss-image-missing-not-checked" : "rss-image-found",
        },
      };
    }

    let metadata = item.articleMetadata || null;
    if (!metadata) {
      try {
        metadata = await withTimeout(
          fetchArticleMetadataImpl(item.url, { fetchTextImpl, timeoutMs }),
          options.articleMetadataCollectTimeoutMs ?? timeoutMs + 1000,
          `article metadata for ${item.url}`
        );
      } catch (error) {
        metadata = {
          ok: false,
          canonicalUrl: item.url,
          imageUrl: "",
          imageSource: "none",
          failureReason: error instanceof Error ? error.message : String(error),
        };
      }
    }
    const articleImageFound = Boolean(metadata?.imageUrl);
    const sourceImageUrl = item.sourceImageUrl || metadata?.imageUrl || "";
    return {
      ...item,
      sourceImageUrl,
      publisherImageUrl: item.publisherImageUrl || metadata?.imageUrl || "",
      imageUrl: item.imageUrl || sourceImageUrl,
      canonicalUrl: metadata?.canonicalUrl || item.canonicalUrl || "",
      articleMetadata: metadata,
      imageDiagnostic: {
        ...(item.imageDiagnostic || {}),
        feedImageMissing,
        articleImageChecked: true,
        articleImageFound,
        articleImageSource: metadata?.imageSource || "none",
        articleImageFetchError: metadata?.ok === false ? metadata.failureReason || "article metadata fetch failed" : "",
        sourceImagePolicy: item.sourceImagePolicy || "",
        imageDecision: feedImageMissing
          ? articleImageFound
            ? "RSS image missing; OG image found"
            : metadata?.ok === false
              ? "RSS image missing; article metadata fetch failed"
              : "RSS image missing; no OG image"
            : "RSS image found",
      },
    };
  });
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
        const key = recentSelectionKey(item);
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

async function readRecentSelectionHistory(outputDir) {
  const historyPath = path.join(outputDir, "autonomous-history.json");
  const history = await readOptionalJson(historyPath, { items: [] });
  return Array.isArray(history.items) ? history.items : [];
}

async function readImageReviewMemory(outputDir) {
  const memoryPath = path.join(outputDir, "image-review-memory.json");
  const memory = await readOptionalJson(memoryPath, { entries: [] });
  return Array.isArray(memory.entries) ? memory.entries : [];
}

function normalizeSelectionIdentity(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      url.hash = "";
      return url.toString().replace(/\/$/, "").toLowerCase();
    } catch {
      return raw.replace(/\/$/, "").toLowerCase();
    }
  }
  return normalizeKey(raw);
}

function recentSelectionKey(item = {}) {
  return normalizeSelectionIdentity(item._phoenix?.originalUrl || item.originalUrl || item.external_url || item.url || item.title);
}

function mergeRecentItems(...groups) {
  const merged = [];
  const seen = new Set();
  for (const group of groups) {
    for (const item of Array.isArray(group) ? group : []) {
      const key = recentSelectionKey(item);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function buildRecentSelectionSet(recentItems = [], feedId = "") {
  const keys = new Set();
  for (const item of recentItems) {
    const phoenix = item._phoenix || {};
    const feedIds = item.feedIds || phoenix.feedIds || (item.feedId || phoenix.feedId ? [item.feedId || phoenix.feedId] : []);
    if (feedId && Array.isArray(feedIds) && feedIds.length) {
      const sameFeed = feedIds.includes(feedId);
      const sharedSocialCooldown = isSocialQueueFeedId(feedId) && feedIds.some((candidateFeedId) => isSocialQueueFeedId(candidateFeedId));
      if (!sameFeed && !sharedSocialCooldown) continue;
    }
    const key = recentSelectionKey(item);
    if (key) keys.add(key);
  }
  return keys;
}

function filterRecentSelections(items = [], recentItems = [], feedId = "") {
  const recentKeys = buildRecentSelectionSet(recentItems, feedId);
  if (!recentKeys.size) return { items, filtered: 0 };
  const filteredItems = items.filter((item) => (
    isSocialQueueFeedId(feedId) && item.forceSocialQueue === true
      ? true
      : !recentKeys.has(recentSelectionKey(item))
  ));
  return {
    items: filteredItems,
    filtered: items.length - filteredItems.length,
  };
}

function laneAssignmentReasonForFeed(feedId = "") {
  if (feedId === "founder-tools" || feedId === "founder-tools-social") return "founder-tools-lane";
  if (feedId === "ai-attention" || feedId === "ai-attention-social") return "ai-attention-lane";
  if (feedId === "founder-market" || feedId === "founder-market-social") return "founder-market-lane";
  return "default-lane";
}

export async function writeRecentSelectionHistory(outputDir, feeds = [], now = new Date()) {
  const historyPath = path.join(outputDir, "autonomous-history.json");
  const previous = await readOptionalJson(historyPath, { items: [] });
  const byOriginalUrl = new Map();

  for (const item of Array.isArray(previous.items) ? previous.items : []) {
    if (item.originalUrl) byOriginalUrl.set(item.originalUrl, item);
  }

  for (const feed of feeds) {
    const report = feed?.report || feed;
    for (const item of report?.selectedItems || []) {
      if (!item.originalUrl) continue;
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
    .slice(0, MAX_HISTORY_ITEMS);

  await writeJson(historyPath, {
    generatedAt: now.toISOString(),
    items,
  });

  return {
    generatedAt: now.toISOString(),
    itemCount: items.length,
  };
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
    `- Research sources enabled: ${report.sources.researchEnabled ?? 0}`,
    `- Source warnings: ${report.sources.warnings?.length ?? 0}`,
    `- Source errors: ${report.sources.errors.length}`,
    `- Parsed items: ${report.items.parsed}`,
    `- Keyword filtered items: ${report.items.keywordFiltered}`,
    `- Recent social items skipped: ${report.items.recentFiltered ?? 0}`,
    `- Selected items: ${report.items.selected}`,
    `- Image mode: ${report.images?.mode ?? "unknown"}`,
    `- Feed-ready images: ${report.images?.approved ?? 0}/${report.images?.attempted ?? 0}`,
    `- Held for Codex image: ${report.images?.held ?? 0}`,
    `- Source-approved images: ${report.images?.sourceAllowlisted ?? 0}`,
    `- Codex-approved raw images: ${report.images?.codexApproved ?? 0}`,
    `- Image processing errors: ${report.images?.errors?.length ?? 0}`,
    `- Manual image review needed: ${report.images?.manualReviewNeeded ?? 0}`,
    `- Creative follow-up still needed: ${report.images?.creativeFollowUpSelected ?? 0}`,
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
  if (Object.keys(report.sources?.byType ?? {}).length) {
    lines.push("", "## Source Type Counts", "");
    for (const [type, count] of Object.entries(report.sources.byType)) {
      lines.push(`- ${type}: ${count}`);
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
      lines.push(`- [${item.bucketLabel}] ${item.reviewTitle || item.title} (${item.sourceName}, score ${item.score}) -> ${item.imageDiagnosticReason || item.imageDecision || "image decision recorded"}`);
    }
  }
  if (report.heldItems?.length) {
    lines.push("", "## Held For Codex Image", "");
    for (const item of report.heldItems) {
      lines.push(`- [${item.bucketLabel}] ${item.reviewTitle || item.title} (${item.sourceName}, score ${item.score}) -> ${item.imageDiagnosticReason || item.holdReason} | expected ${item.expectedArticleImagePath}`);
    }
  }
  if (report.queue?.isSocialQueue) {
    lines.push("", "## Social Queue", "");
    lines.push(`- Candidate pool size: ${report.queue.candidatePoolSize}`);
    lines.push(`- Eligible candidates: ${report.queue.eligibleCandidates}`);
    lines.push(`- Eligible item selected: ${report.queue.eligibleSelected ? "yes" : "no"}`);
    lines.push(`- Sample ready: ${report.queue.sampleReady ? "yes" : "no"}`);
    lines.push(`- Held for manual review: ${report.queue.heldForManualReview}`);
    lines.push(`- Skipped for fallback art: ${report.queue.skippedForFallbackArt}`);
    lines.push(`- Queue rotation reason: ${report.queue.queueRotationReason}`);
  }
  if (report.sources.errors.length) {
    lines.push("", "## Source Errors", "");
    for (const error of report.sources.errors) {
      lines.push(`- ${error.source}: ${error.error}`);
    }
  }
  if (report.sources.warnings?.length) {
    lines.push("", "## Source Warnings", "");
    for (const warning of report.sources.warnings) {
      lines.push(`- ${warning.source}: ${warning.error}`);
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
  if (report.editorial?.depthAudit?.checkedLeadItems) {
    lines.push("", "## Lead Depth Audit", "");
    lines.push(`- Feed: ${report.editorial.depthAudit.feedId}`);
    lines.push(`- Lead items checked: ${report.editorial.depthAudit.checkedLeadItems}`);
    lines.push(`- Lead items with any depth artifact: ${report.editorial.depthAudit.leadItemsWithDepth}`);
    lines.push(`- Thin lead items: ${report.editorial.depthAudit.thinLeadItems}`);
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

function summarizeSelectedCounts(items = []) {
  const bucketCounts = {};
  const sourceCounts = {};

  for (const item of items) {
    if (item.bucket) bucketCounts[item.bucket] = (bucketCounts[item.bucket] ?? 0) + 1;
    const sourceKey = item.sourceId || item.sourceName || "unknown";
    sourceCounts[sourceKey] = (sourceCounts[sourceKey] ?? 0) + 1;
  }

  return { bucketCounts, sourceCounts };
}

function buildImageCertification(item = {}) {
  const approved = (
    item.imageStrategy === "source-allowlisted" ||
    (item.imageStrategy === "held-for-codex-image" && item.imageApprovalStatus === "approved")
  );
  const creativeFollowUpNeeded = requiresCreativeFollowUp(item);
  const audit = item.imageAudit || {};
  const notes = [];
  if (approved) notes.push("Image cleared the current Phoenix cover rules.");
  if (creativeFollowUpNeeded) notes.push("Story-specific creative follow-up is still needed for this cover.");
  if (Array.isArray(item.imageWarnings) && item.imageWarnings.length) notes.push(...item.imageWarnings.slice(0, 2));
  if (Array.isArray(audit.editorialNotes) && audit.editorialNotes.length) notes.push(...audit.editorialNotes.slice(0, 2));
  return {
    verdict: approved ? (creativeFollowUpNeeded ? "creative-follow-up" : "good-to-go") : "hold",
    approved,
    attributionVisible: true,
    sourceType: item.imageSourceType || "",
    imageStrategy: item.imageStrategy || "",
    holdReason: item.imageHoldReason || "",
    notes: notes.slice(0, 4),
  };
}

function requiresCreativeFollowUp(item = {}) {
  const warningText = Array.isArray(item.imageWarnings) ? item.imageWarnings.join(" ") : "";
  return (
    /story-specific-cover-still-needed/i.test(String(item.imageHoldReason || "")) ||
    /story-specific cover still needs creative follow-up/i.test(warningText) ||
    /best approved Phoenix-owned background/i.test(warningText)
  );
}

function buildSocialQueueCandidateState(item, options = {}) {
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? DEFAULT_SITE_URL);
  const imageApprovalStatus = item.imageApprovalStatus || "";
  const manualReviewNeeded = Boolean(
    item.imageBrief?.manualReviewNeeded ||
    item.imageRightsStatus === "manual-review" ||
    imageApprovalStatus === "held"
  );
  const usesStrictImageStrategy = SOCIAL_STRICT_IMAGE_STRATEGIES.has(String(item.imageStrategy || ""));
  const hasOwnedImage = isPhoenixOwnedSignalImagePath(
    item.socialImagePath || item.imagePath || item.socialImageUrl || item.imageUrl,
    siteUrl
  );
  const publishable = hasOwnedImage && (
    item.imageStrategy === "source-allowlisted" ||
    (item.imageStrategy === "held-for-codex-image" && imageApprovalStatus === "approved")
  );
  const reasons = [];

  if (manualReviewNeeded) reasons.push("manual-review");
  if (requiresCreativeFollowUp(item)) reasons.push("creative-follow-up-needed");
  if (!usesStrictImageStrategy) reasons.push("invalid-image-strategy");
  if (!hasOwnedImage) reasons.push("missing-owned-image");
  if (imageApprovalStatus === "held") reasons.push(item.imageHoldReason || "codex-image-pending");
  if (!publishable) reasons.push("not-publishable");

  return {
    ...item,
    queueCandidateState: {
      publishable,
      eligible: publishable && !manualReviewNeeded && usesStrictImageStrategy,
      sampleReady: publishable && !manualReviewNeeded && usesStrictImageStrategy,
      manualReviewNeeded,
      usesStrictImageStrategy,
      reasons,
    }
  };
}

function selectSocialQueueCandidate(items = [], options = {}) {
  const candidates = items.map((item) => buildSocialQueueCandidateState(item, options));
  const eligible = candidates.filter((item) => item.queueCandidateState.eligible);
  const selectedItem = eligible[0] || null;
  const skipped = candidates.filter((item) => item !== selectedItem);
  const queueRotationReason = selectedItem
    ? selectedItem.queueCandidateState.eligible
      ? (candidates[0] === selectedItem ? "selected-top-eligible-candidate" : "advanced-to-next-eligible-candidate")
      : "unexpected-noneligible-selection"
    : "held-no-eligible-article-image";

  return {
    selectedItems: selectedItem ? [selectedItem] : [],
    queue: {
      isSocialQueue: true,
      candidatePoolSize: candidates.length,
      eligibleCandidates: eligible.length,
      eligibleSelected: Boolean(selectedItem?.queueCandidateState.eligible),
      heldForManualReview: skipped.filter((item) => item.queueCandidateState.manualReviewNeeded).length,
      skippedForFallbackArt: skipped.filter((item) => !item.queueCandidateState.usesStrictImageStrategy).length,
      queueRotationReason,
      historyUpdated: false,
      sampleReady: Boolean(selectedItem?.queueCandidateState.sampleReady),
      selectedReasons: selectedItem?.queueCandidateState.reasons || [],
    },
    candidateStates: candidates.map((item) => ({
      slug: item.slug,
      title: item.title,
      score: item.score,
      imageStrategy: item.imageStrategy,
      imageRightsStatus: item.imageRightsStatus,
      imageApprovalStatus: item.imageApprovalStatus || "",
      manualReviewNeeded: item.queueCandidateState.manualReviewNeeded,
      eligible: item.queueCandidateState.eligible,
      sampleReady: item.queueCandidateState.sampleReady,
      reasons: item.queueCandidateState.reasons,
    })),
  };
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

function applyImageVariety(items, options = {}) {
  const maxConsecutiveFamily = 2;
  const maxFamilyShare = Math.max(3, Math.ceil(items.length * 0.4));
  const usedCounts = {};
  const warnings = [];
  let previousFamily = "";
  let consecutive = 0;
  const usedFingerprints = new Set();
  const recentItems = options.recentItems || [];

  const variedItems = items.map((item) => {
    const creativeDirection = assignImageCreativeDirection(item, { recentItems, usedFingerprints });
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

function rebalanceImageFamilyOrder(items = []) {
  if (items.length <= 2 || buildImageVarietyAudit(items).errors.length === 0) return items;

  const firstItem = items[0];
  const firstFamily = firstItem.imageFamily || "unknown";
  const remaining = items.slice(1).map((item, offset) => ({ item, index: offset + 1 }));
  const memo = new Set();

  const search = (available, lastFamily, runLength) => {
    if (!available.length) return [];
    const key = [
      available.map((entry) => entry.index).join(","),
      lastFamily,
      runLength,
    ].join("|");
    if (memo.has(key)) return null;

    for (let cursor = 0; cursor < available.length; cursor += 1) {
      const entry = available[cursor];
      const family = entry.item.imageFamily || "unknown";
      const nextRunLength = family === lastFamily ? runLength + 1 : 1;
      if (nextRunLength > 2) continue;
      const nextAvailable = [
        ...available.slice(0, cursor),
        ...available.slice(cursor + 1),
      ];
      const suffix = search(nextAvailable, family, nextRunLength);
      if (suffix) return [entry.item, ...suffix];
    }

    memo.add(key);
    return null;
  };

  const reordered = search(remaining, firstFamily, 1);
  return reordered ? [firstItem, ...reordered] : items;
}

function normalizeCopyForAudit(value = "") {
  return String(value).replace(/\s+/g, " ").trim().toLowerCase();
}

function buildCopyRepetitionAudit(items) {
  const fields = ["whyItMatters", "whyShared", "founderTakeaway", "businessTakeaway", "simpleSummary", "trendContext", "engagementPrompt"];
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

function buildEditorialDuplicateBody(item = {}) {
  return [
    item.publicTitle || item.title || "",
    item.simpleSummary || "",
    item.founderTakeaway || "",
    item.trendContext || "",
  ].join(" ");
}

function editorialDuplicateScore(a = {}, b = {}) {
  return Math.min(
    overlapScore(buildEditorialDuplicateBody(a), buildEditorialDuplicateBody(b)),
    overlapScore(buildEditorialDuplicateBody(b), buildEditorialDuplicateBody(a))
  );
}

function pruneEditorialDuplicates(items = []) {
  const kept = [];
  const removed = [];

  for (const item of items) {
    const duplicateOf = kept.find((keptItem) => (
      detectEditorialLane(keptItem) === detectEditorialLane(item) &&
      editorialDuplicateScore(keptItem, item) >= 14
    ));

    if (duplicateOf) {
      removed.push({
        slug: item.slug,
        title: item.title,
        duplicateOf: duplicateOf.slug || duplicateOf.title,
      });
      continue;
    }

    kept.push(item);
  }

  return { kept, removed };
}

function applyAutonomousEditorialLayer(items, options = {}) {
  const recentItems = options.recentItems || [];
  const feedId = options.feedId || "founder-market";
  return items.map((item) => {
    const publicTitle = buildPublicHeadline(item);
    const relatedRecentSignals = buildRelatedRecentSignals(item, recentItems);
    const founderTakeaway = buildFounderTakeaway({
      ...item,
      publicTitle,
    });
    const editorialBase = {
      ...item,
      publicTitle,
      title: publicTitle,
      sourceTitle: item.sourceTitle || item.title,
      founderTakeaway,
    };
    const simpleSummary = item.simpleSummary || buildPlainLanguageSummary(editorialBase);
    const engagementPrompt = item.engagementPrompt || buildEngagementPrompt(editorialBase);
    const trendContext = item.trendContext || buildTrendContext(editorialBase, relatedRecentSignals);
    const combinedCopy = [
      item.whyItMatters,
      item.whyShared,
      item.founderTakeaway,
      simpleSummary,
      trendContext,
      engagementPrompt
    ].filter(Boolean).join(" ");

    const preservedImageBrief = {
      ...(item.imageBrief || createImageBrief(editorialBase, { sourceImageAllowlist: options.sourceImageAllowlist })),
    };
    const sourcePolicy = resolveSourceImagePolicy(item, options.sourceImageAllowlist);
    const sourceImageUrl = item.sourceImageUrl ||
      (/^https?:\/\//i.test(item.imageUrl || "") && !extractPhoenixImagePath(item.imageUrl) ? item.imageUrl : "");
    const hasNonPublicSourceImage = Boolean(sourceImageUrl) && sourcePolicy.policy !== "allowed";
    const isOwnedFallbackBackground = item.imageHoldReason === "story-specific-cover-still-needed";
    if (
      item.imageStrategy === "source-allowlisted" ||
      (item.imageStrategy === "held-for-codex-image" && item.imageApprovalStatus === "approved")
    ) {
      preservedImageBrief.articleImageRequired = false;
      if (!(hasNonPublicSourceImage && isOwnedFallbackBackground)) {
        preservedImageBrief.manualReviewNeeded = false;
      }
    }

    return {
      ...editorialBase,
      feedRole: isToolsFeedId(feedId) ? "founder-tools" : "founder-market",
      imageBrief: preservedImageBrief,
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

export function buildLeadDepthAudit(items, options = {}) {
  const feedId = options.feedId || "founder-market";
  const warnings = [];
  const leadItemLimit = options.leadItemLimit ?? 5;

  if (feedId !== "founder-market" || !Array.isArray(items) || items.length === 0) {
    return {
      feedId,
      leadItemLimit,
      checkedLeadItems: 0,
      thinLeadItems: 0,
      leadItemsWithDepth: 0,
      warnings,
    };
  }

  const leadItems = items.slice(0, Math.min(items.length, leadItemLimit));
  let thinLeadItems = 0;
  let leadItemsWithDepth = 0;

  for (const item of leadItems) {
    const depthArtifactCount =
      (Array.isArray(item.articleBody) ? item.articleBody.length : 0) +
      (Array.isArray(item.sourceLinks) ? item.sourceLinks.length : 0) +
      (Array.isArray(item.researchCitations) ? item.researchCitations.length : 0) +
      (Array.isArray(item.relatedRecentSignals) ? item.relatedRecentSignals.length : 0);

    if (depthArtifactCount > 0) {
      leadItemsWithDepth++;
      continue;
    }

    thinLeadItems++;
    warnings.push(
      `${item.slug || item.title || "unknown"}: lead Founder Signal item is shipping without articleBody, sourceLinks, researchCitations, or relatedRecentSignals`
    );
  }

  return {
    feedId,
    leadItemLimit,
    checkedLeadItems: leadItems.length,
    thinLeadItems,
    leadItemsWithDepth,
    warnings,
  };
}

function buildEditorialQualityAudit(items, options = {}) {
  const warnings = [];
  const errors = [];
  const bannedWeakPhrases = [
    "money is moving, tightening, or being redirected",
    "founder strategy signals show where execution",
    "not just more news",
    "another saved article",
    "could matter more than it first appears"
  ];
  const bannedSoftOpeners = [
    "For founders, this points to",
    "For founders, this shows",
    "For founders, this is",
  ];

  for (const item of items) {
    const slug = item.slug || item.title || "unknown";
    const leadSentence = buildLeadSentence(item, stripSourceLead(item.description || "", item.sourceName || ""));
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
    if (isHeadlineEcho(leadSentence, item)) {
      errors.push(`${slug}: generated lead sentence still echoes the headline instead of translating it`);
    }
    if ((item.readingLevel?.averageSentenceWords ?? 99) > 24) {
      warnings.push(`${slug}: reading level heuristic is above target (${item.readingLevel.averageSentenceWords} avg sentence words)`);
    }
    for (const phrase of bannedWeakPhrases) {
      if (combined.includes(phrase)) {
        errors.push(`${slug}: weak/generic editorial phrase is not allowed: ${phrase}`);
      }
    }
    for (const opener of bannedSoftOpeners) {
      if (String(item.simpleSummary || "").startsWith(opener) && !mentionsAny(`${item.publicTitle || item.title || ""} ${item.description || ""}`, "\\b(memory|chip|benchmark|reliability|ocr|document parsing|quiz|vibe coded|nonprofit|grant|prototype|trade show|pipeline|revenue|budget cutting|hiring|talent)\\b")) {
        warnings.push(`${slug}: simpleSummary is falling back to a soft generic opener`);
      }
    }
    if (!/\b(use|watch|ask|look|test|expect|notice|spot)\b/i.test(fields.join(" "))) {
      warnings.push(`${slug}: editorial copy lacks a clear reader-directed action`);
    }
  }

  const depthAudit = buildLeadDepthAudit(items, options);
  warnings.push(...depthAudit.warnings);

  return { warnings, errors, depthAudit };
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
  "sceneLane",
  "sceneMotif",
  "imageFingerprint",
  "feedRole",
  "simpleSummary",
  "engagementPrompt",
  "trendContext",
  "readingLevel",
  "editorialMode"
];

function isPhoenixOwnedSignalImagePath(value = "", siteUrl = DEFAULT_SITE_URL) {
  const imagePath = extractPhoenixImagePath(value, siteUrl);
  return imagePath.startsWith("/images/signals/generated/") || imagePath.startsWith("/images/signals/source-art/");
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
  const requireArticleSpecificImages = Boolean(options.requireArticleSpecificImages);
  const errors = [];
  const varietyAudit = buildImageVarietyAudit(items);
  const editorialAudit = buildEditorialQualityAudit(items, {
    feedId: options.feedId || options.id || "founder-market",
  });
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

    if (!isPhoenixOwnedSignalImagePath(item.socialImagePath, siteUrl)) {
      errors.push(`${item.slug || item.title || "unknown"}: socialImagePath must resolve under /images/signals/generated/ or /images/signals/source-art/`);
    }

    if (!isPhoenixOwnedSignalImagePath(item.socialImageUrl, siteUrl)) {
      errors.push(`${item.slug || item.title || "unknown"}: socialImageUrl must resolve to a Phoenix-owned image`);
    }

    if (!isPhoenixOwnedSignalImagePath(item.imageUrl, siteUrl)) {
      errors.push(`${item.slug || item.title || "unknown"}: imageUrl must resolve to a Phoenix-owned image`);
    }

    const socialImagePath = extractPhoenixImagePath(item.socialImagePath, siteUrl);
    if (socialImagePath) {
      const imageFilePath = path.join(socialImageOutputRoot, socialImagePath.replace(/^\//, ""));
      try {
        await fs.access(imageFilePath);
      } catch {
        errors.push(`${item.slug || item.title || "unknown"}: owned image file missing at ${socialImagePath}`);
      }
    }

    const sourcePolicy = resolveSourceImagePolicy(item, sourceImageAllowlist);
    const normalizedImageBrief = getNormalizedImageBrief(item, sourceImageAllowlist);
    if (sourcePolicy.policy !== "allowed") {
      const usesApprovedCodexImage = item.imageStrategy === "held-for-codex-image" && item.imageApprovalStatus === "approved" && item.imageSourceType === "phoenix-owned";
      if (!usesApprovedCodexImage) {
        if (!normalizedImageBrief?.manualReviewNeeded) {
          errors.push(`${item.slug || item.title || "unknown"}: non-public source policy must set imageBrief.manualReviewNeeded`);
        }
        if (!hasVisibilityWarning(item)) {
          errors.push(`${item.slug || item.title || "unknown"}: non-public source policy must emit a visibility warning`);
        }
        if (item.imageSourceType !== "pending-codex-image") {
          errors.push(`${item.slug || item.title || "unknown"}: non-public source policy must stay held until a Phoenix-owned Codex image is approved`);
        }
      }
    }

    if (sourcePolicy.policy !== "allowed" && item.imageStrategy === "source-allowlisted") {
      errors.push(`${item.slug || item.title || "unknown"}: source-allowlisted strategy cannot be used for non-allowed source images`);
    }
    if (
      requireArticleSpecificImages &&
      !["held-for-codex-image", "source-allowlisted"].includes(item.imageStrategy)
    ) {
      errors.push(`${item.slug || item.title || "unknown"}: missing article-specific image; add an approved raw story image at ${expectedArticleImagePath(item)} or use an allowlisted source image`);
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
  const requireArticleSpecificImages = options.requireArticleSpecificImages ?? (
    process.env.PHOENIX_RSS_REQUIRE_ARTICLE_IMAGES === "1" ||
    process.env.PHOENIX_RSS_IMAGE_MODE === "article-or-hold"
  );
  const feedId = options.id ?? options.feedId ?? "founder-market";
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
  const targets = options.targets ?? registry.targets;
  const maxPerSource = options.maxPerSource ?? registry.maxPerSource;
  const excludeKeywords = options.excludeKeywords ?? registry.excludeKeywords ?? [];
  const preferredKeywords = options.preferredKeywords ?? registry.preferredKeywords ?? [];
  const penaltyKeywords = options.penaltyKeywords ?? registry.penaltyKeywords ?? [];
  const researchSources = await loadResearchSources({ ...options, now }, feedId, registryPath);
  const enabledSources = mergeSources(registry.sources || [], researchSources);
  const sourceErrors = [];
  const sourceWarnings = [];
  const parsedItems = [];
  const imageReviewMemory = Array.isArray(options.imageReviewMemory)
    ? options.imageReviewMemory
    : await readImageReviewMemory(outputDir);
  const recentItems = Array.isArray(options.recentItems)
    ? options.recentItems
    : mergeRecentItems(
      await readRecentFeedItems(outputDir, [
        outputFiles.json,
        "feed.json",
        "ai-attention.json",
        "tools.json",
        "social.json",
        "tools-social.json",
        "ai-attention-social.json"
      ]),
      await readRecentSelectionHistory(outputDir)
    );
  const excludedOriginalUrls = new Set(
    (Array.isArray(options.excludedOriginalUrls) ? options.excludedOriginalUrls : [])
      .map((value) => normalizeSelectionIdentity(value))
      .filter(Boolean)
  );

  const sourceResults = await mapWithConcurrency(
    enabledSources,
    options.sourceFetchConcurrency ?? 4,
    async (source) => {
      try {
        const sourceTimeoutMs = Number(source.collectTimeoutMs || source.timeoutMs || options.sourceCollectTimeoutMs || 10000);
        const result = await withTimeout(
          collectSourceItems(source, {
            ...options,
            now,
            fetchTextImpl,
          }),
          sourceTimeoutMs,
          `${source.name || source.id || "source"} collection`
        );
        return { source, result };
      } catch (error) {
        return {
          source,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    }
  );
  for (const entry of sourceResults) {
    if (entry.error) {
      sourceErrors.push({ source: entry.source.name, url: entry.source.url, error: entry.error });
      continue;
    }
    parsedItems.push(...(entry.result.items || []));
    sourceWarnings.push(...(entry.result.warnings || []));
  }

  const metadataItems = await enrichItemsWithArticleMetadata(parsedItems, {
    fetchTextImpl,
    fetchArticleMetadataImpl: options.fetchArticleMetadataImpl,
    enableArticleMetadata: options.enableArticleMetadata,
    articleMetadataMaxItems: options.articleMetadataMaxItems,
    articleMetadataTimeoutMs: options.articleMetadataTimeoutMs,
    articleMetadataConcurrency: options.articleMetadataConcurrency,
  });
  const crossFeedFilteredItems = excludedOriginalUrls.size
    ? metadataItems.filter((item) => !excludedOriginalUrls.has(normalizeSelectionIdentity(item.originalUrl || item.url || item.title)))
    : metadataItems;
  const crossFeedFilteredCount = metadataItems.length - crossFeedFilteredItems.length;
  const keywordFilteredItems = crossFeedFilteredItems.filter((item) => !itemMatchesKeywordList(item, excludeKeywords));
  const recentSelectionFilter = options.excludeRecentSelections
    ? filterRecentSelections(keywordFilteredItems, recentItems, feedId)
    : { items: keywordFilteredItems, filtered: 0 };
  const scoredItems = recentSelectionFilter.items.map((item) => scoreItem(item, now, {
    preferredKeywords,
    penaltyKeywords,
    feedId,
  }));
  const boundaryScopedItems = isToolsFeedId(feedId)
    ? scoredItems.filter((item) => !shouldExcludeFromToolsFeed(item))
    : isAiAttentionFeedId(feedId)
      ? scoredItems.filter((item) => !shouldExcludeFromAiAttentionFeed(item))
      : scoredItems;
  const boundaryFilteredCount = scoredItems.length - boundaryScopedItems.length;
  const selectionLimit = isSocialQueueFeedId(feedId)
    ? Math.max(maxItems, SOCIAL_QUEUE_CANDIDATE_LIMIT)
    : Math.max(maxItems, ARTICLE_IMAGE_BACKFILL_LIMIT);
  const initialSelection = selectItems(boundaryScopedItems, targets, selectionLimit, { maxPerSource });
  let workingSelected = initialSelection.selected.map((item) => enrichSignalItem(item, { siteUrl }));
  workingSelected = applyAutonomousEditorialLayer(workingSelected, {
    recentItems,
    feedId,
    sourceImageAllowlist,
  });
  const editorialPrune = pruneEditorialDuplicates(workingSelected);
  if (editorialPrune.removed.length) {
    const selectedKeySet = new Set(workingSelected.map((item) => recentSelectionKey(item)));
    workingSelected = editorialPrune.kept;
    const backfillPool = boundaryScopedItems
      .filter((item) => !selectedKeySet.has(recentSelectionKey(item)))
      .sort((a, b) => b.score - a.score);

    for (const candidate of backfillPool) {
      if (workingSelected.length >= initialSelection.selected.length) break;
      const enrichedCandidate = enrichSignalItem(candidate, { siteUrl });
      const editorialCandidate = applyAutonomousEditorialLayer([enrichedCandidate], {
        recentItems,
        feedId,
        sourceImageAllowlist,
      })[0];
      const duplicateOf = workingSelected.find((keptItem) => (
        detectEditorialLane(keptItem) === detectEditorialLane(editorialCandidate) &&
        editorialDuplicateScore(keptItem, editorialCandidate) >= 14
      ));
      if (duplicateOf) continue;
      workingSelected.push(editorialCandidate);
      selectedKeySet.add(recentSelectionKey(candidate));
    }
  }
  const imageVariety = applyImageVariety(workingSelected, { recentItems });
  workingSelected = imageVariety.items;
  let socialCardErrors = [];

  if (!dryRun && options.generateSocialImages !== false && workingSelected.length) {
    const renderedCards = await renderSignalCardsForItems(workingSelected, {
      outputRoot: socialImageOutputRoot,
      siteUrl: normalizeSiteUrl(siteUrl),
      now,
      recentItems,
      imageReviewMemory,
      sourceImageAllowlist,
      fetchImageImpl: options.fetchImageImpl,
      backgroundPath: options.socialImageBackgroundPath,
      allowOwnedBackgroundFallback: options.allowOwnedBackgroundFallback ?? true,
      sourceImageFetchTimeoutMs: options.sourceImageFetchTimeoutMs,
    });
    workingSelected = renderedCards.items.map((item) => enrichSignalItem(item, { siteUrl }));
    socialCardErrors = renderedCards.errors;
  }
  workingSelected = workingSelected.map((item) => normalizeImagePolicyMetadata(withReviewLabels(item, sourceImageAllowlist), sourceImageAllowlist));

  const heldQueueItems = [];
  if (!isSocialQueueFeedId(feedId)) {
    const publishableItems = workingSelected.filter((item) =>
      item.imageStrategy === "source-allowlisted" ||
      (item.imageStrategy === "held-for-codex-image" && item.imageApprovalStatus === "approved")
    );
    heldQueueItems.push(
      ...workingSelected.filter((item) =>
        item.imageApprovalStatus === "held" &&
        !publishableItems.some((publishable) => publishable.slug === item.slug)
      )
    );
    workingSelected = publishableItems.slice(0, maxItems);
  }
  let queue = {
    isSocialQueue: false,
    candidatePoolSize: 0,
    eligibleCandidates: 0,
    eligibleSelected: false,
    heldForManualReview: 0,
    skippedForFallbackArt: 0,
    queueRotationReason: "not-a-social-queue",
    historyUpdated: false,
    queuePublishedAt: "",
    selectedOriginalUrl: "",
    selectedCanonicalKey: "",
    excludedByRecent: recentSelectionFilter.filtered,
    excludedByCrossLaneDedupe: crossFeedFilteredCount,
    laneAssignmentReason: laneAssignmentReasonForFeed(feedId),
    sampleReady: false,
    selectedReasons: [],
    candidates: [],
  };

  if (isSocialQueueFeedId(feedId)) {
    const queueSelection = selectSocialQueueCandidate(workingSelected, {
      siteUrl,
      requireArticleSpecificImages,
    });
    heldQueueItems.push(
      ...workingSelected.filter((item) => !queueSelection.selectedItems.some((selectedItem) => selectedItem.slug === item.slug))
        .filter((item) => item.imageApprovalStatus === "held")
    );
    const queuePublishedAt = now.toISOString();
    workingSelected = queueSelection.selectedItems.map((item) => ({
      ...item,
      publishedAt: queuePublishedAt,
    }));
    queue = {
      ...queueSelection.queue,
      queuePublishedAt,
      selectedOriginalUrl: queueSelection.selectedItems[0]?.originalUrl || "",
      selectedCanonicalKey: normalizeSelectionIdentity(queueSelection.selectedItems[0]?.originalUrl || queueSelection.selectedItems[0]?.url || ""),
      excludedByRecent: recentSelectionFilter.filtered,
      excludedByCrossLaneDedupe: crossFeedFilteredCount,
      laneAssignmentReason: laneAssignmentReasonForFeed(feedId),
      candidates: queueSelection.candidateStates,
    };
  }

  let enrichedSelected = workingSelected.filter((item) =>
    item.imageStrategy === "source-allowlisted" ||
    (item.imageStrategy === "held-for-codex-image" && item.imageApprovalStatus === "approved")
  ).map((item) => normalizeImagePolicyMetadata(item, sourceImageAllowlist));
  enrichedSelected = rebalanceImageFamilyOrder(enrichedSelected);
  const heldItems = [
    ...heldQueueItems,
    ...workingSelected.filter((item) => item.imageApprovalStatus === "held"),
  ].map((item) => normalizeImagePolicyMetadata(item, sourceImageAllowlist));
  const reportImageItems = [...enrichedSelected, ...heldItems];
  const queueOnlyCandidates = Array.isArray(queue?.candidates) && !reportImageItems.length ? queue.candidates : [];
  const { bucketCounts, sourceCounts } = summarizeSelectedCounts(enrichedSelected);

  const feedXml = buildFeedXml(enrichedSelected, { now, siteUrl, title, description, feedFile: outputFiles.xml, feedId });
  const feedJson = buildFeedJson(enrichedSelected, { now, siteUrl, title, description, feedFile: outputFiles.json, feedId, sourceImageAllowlist });
  const xmlWellFormed = validateRss(feedXml);
  const validation = await validateSelectedItems(enrichedSelected, {
    siteUrl,
    socialImageOutputRoot,
    sourceImageAllowlist,
    requireArticleSpecificImages,
    feedId
  });
  const feedValid = enrichedSelected.length > 0 && xmlWellFormed && validation.errors.length === 0;
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
      byType: countBy(enabledSources.map((source) => ({ type: normalizeSourceType(source) })), "type"),
      researchEnabled: researchSources.length,
      warnings: sourceWarnings,
      errors: sourceErrors
    },
    items: {
      parsed: parsedItems.length,
      crossFeedFiltered: crossFeedFilteredCount,
      keywordFiltered: parsedItems.length - keywordFilteredItems.length,
      recentFiltered: recentSelectionFilter.filtered,
      feedBoundaryFiltered: boundaryFilteredCount,
      scored: scoredItems.length,
      candidatePool: initialSelection.selected.length,
      selected: enrichedSelected.length,
      held: heldItems.length,
      excluded: scoredItems.filter((item) => item.excluded).length
    },
    bucketCounts,
    sourceCounts,
    queue,
    scoring: {
      preferredKeywords,
      penaltyKeywords
    },
    automation: {
      mode: "autonomous-editorial",
      scheduleSlots: ["early-morning", "mid-morning", "afternoon", "late-night", "friday-ai-trend-sweep"],
      recentItemsConsidered: recentItems.length,
      modelStrategy: {
        triage: "lower-cost model or deterministic scoring",
        finalEditorial: "strong model recommended for publish/skip decisions",
        validation: "deterministic gates plus lightweight audit agents"
      }
    },
    images: {
      mode: requireArticleSpecificImages ? "source-or-codex-queue" : "source-or-codex-queue",
      attempted: dryRun || options.generateSocialImages === false ? 0 : initialSelection.selected.length,
      approved: enrichedSelected.length + queueOnlyCandidates.filter((item) => item.imageApprovalStatus === "approved").length,
      held: heldItems.length + queueOnlyCandidates.filter((item) => item.imageApprovalStatus === "held").length,
      generated: enrichedSelected.filter((item) => String(item.socialImagePath || item.imagePath || "").startsWith("/images/signals/generated/")).length,
      sourceAllowlisted: enrichedSelected.filter((item) => item.imageStrategy === "source-allowlisted").length,
      codexApproved: enrichedSelected.filter((item) => item.imageStrategy === "held-for-codex-image").length + queueOnlyCandidates.filter((item) => item.imageStrategy === "held-for-codex-image" && item.imageApprovalStatus === "approved").length,
      strategyCounts: countBy([...reportImageItems, ...queueOnlyCandidates], "imageStrategy"),
      familyCounts: countBy(reportImageItems, "imageFamily"),
      variantCounts: countBy(reportImageItems, "imageVariant"),
      toneCounts: countBy(reportImageItems, "imageTone"),
      compositionCounts: countBy(reportImageItems, "imageComposition"),
      variety: validation.varietyAudit,
      sourceTypeCounts: countBy(reportImageItems, "imageSourceType"),
      rightsStatusCounts: countBy(reportImageItems, "imageRightsStatus"),
      manualReviewNeeded: reportImageItems.filter((item) => (
        item.imageBrief?.manualReviewNeeded ||
        item.imageRightsStatus === "manual-review"
      )).length + queueOnlyCandidates.filter((item) => item.manualReviewNeeded).length,
      creativeFollowUpSelected: enrichedSelected.filter((item) => requiresCreativeFollowUp(item)).length + queueOnlyCandidates.filter((item) => Array.isArray(item.reasons) && item.reasons.includes("creative-follow-up-needed")).length,
      warnings: reportImageItems.flatMap((item) =>
        (item.imageWarnings || []).map((warning) => ({
          slug: item.slug,
          title: item.title,
          warning
        }))
      ).concat(
        queueOnlyCandidates
          .filter((item) => Array.isArray(item.reasons) && item.reasons.includes("creative-follow-up-needed"))
          .map((item) => ({
            slug: item.slug,
            title: item.title,
            warning: "Using the best approved Phoenix-owned background while a story-specific cover still needs creative follow-up.",
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
    heldItems: heldItems.map((item) => ({
      slug: item.slug,
      title: item.title,
      rawTitle: item.rawTitle || item.sourceTitle || item.title,
      reviewTitle: item.reviewTitle || buildReviewTitle(item),
      topicLabel: item.topicLabel || topicLabelForItem(item),
      whySelected: item.whySelected || buildWhySelected(item),
      sourceSurface: item.sourceSurface || item.sourceType || "rss",
      researchCitations: item.researchCitations || [],
      sourceName: item.sourceName,
      sourceUrl: item.sourceUrl || item.originalUrl,
      sourceImageUrl: item.sourceImageUrl || "",
      sourceImagePolicy: resolveSourceImagePolicy(item, sourceImageAllowlist).policy,
      imageDecision: item.imageDecision || buildImageDecision(item),
      imageDiagnosticReason: item.imageDiagnosticReason || buildImageDiagnosticReason(item),
      imageDiagnostic: item.imageDiagnostic || {},
      expectedArticleImagePath: expectedArticleImagePath(item),
      sceneLane: item.sceneLane,
      sceneMotif: item.sceneMotif,
      imageStrategy: item.imageStrategy,
      imageSourceType: item.imageSourceType,
      imageFingerprint: item.imageFingerprint,
      simpleSummary: item.simpleSummary,
      trendContext: item.trendContext,
      engagementPrompt: item.engagementPrompt,
      imageBrief: getNormalizedImageBrief(item, sourceImageAllowlist),
      holdReason: item.imageHoldReason || "codex-image-pending",
      imageAudit: item.imageAudit || null,
      imageCorrectionTrail: item.imageCorrectionTrail || [],
      score: item.score,
      bucket: item.bucket,
      bucketLabel: item.bucketLabel,
      publishedAt: item.publishedAt,
      imageVisualHash: item.imageVisualHash || "",
    })),
    selectedItems: enrichedSelected.map((item) => ({
      title: item.title,
      url: item.internalUrl,
      internalUrl: item.internalUrl,
      originalUrl: item.originalUrl,
      sourceName: item.sourceName,
      sourceSurface: item.sourceSurface || item.sourceType || "rss",
      rawTitle: item.rawTitle || item.sourceTitle || item.title,
      reviewTitle: item.reviewTitle || buildReviewTitle(item),
      topicLabel: item.topicLabel || topicLabelForItem(item),
      whySelected: item.whySelected || buildWhySelected(item),
      researchCitations: item.researchCitations || [],
      imageUrl: item.imageUrl,
      socialImageUrl: item.socialImageUrl,
      socialImagePath: item.socialImagePath,
      sourceImageUrl: "",
      imageStrategy: item.imageStrategy,
      imageApprovalStatus: item.imageApprovalStatus,
      imageHoldReason: item.imageHoldReason,
      imageFamily: item.imageFamily,
      imageSourceType: item.imageSourceType,
      imageCredit: item.imageCredit,
      imageRightsStatus: item.imageRightsStatus,
      imageTemplate: item.imageTemplate,
      imageVariant: item.imageVariant,
      imageTone: item.imageTone,
      imageComposition: item.imageComposition,
      sceneLane: item.sceneLane,
      sceneMotif: item.sceneMotif,
      imageFingerprint: item.imageFingerprint,
      imageVisualHash: item.imageVisualHash || "",
      imageAudit: item.imageAudit || null,
      imageCorrectionTrail: item.imageCorrectionTrail || [],
      imageBrief: getNormalizedImageBrief(item, sourceImageAllowlist),
      expectedArticleImagePath: expectedArticleImagePath(item),
      feedId,
      feedRole: item.feedRole,
      simpleSummary: item.simpleSummary,
      engagementPrompt: item.engagementPrompt,
      trendContext: item.trendContext,
      relatedRecentSignals: item.relatedRecentSignals || [],
      readingLevel: item.readingLevel,
      editorialMode: item.editorialMode,
      imageWarnings: item.imageWarnings || [],
      imageDecision: item.imageDecision || buildImageDecision(item),
      imageDiagnosticReason: item.imageDiagnosticReason || buildImageDiagnosticReason(item),
      imageDiagnostic: item.imageDiagnostic || {},
      qualityStatus: requiresCreativeFollowUp(item) ? "creative-follow-up" : "ready",
      qualityNeedsCreativeFollowUp: requiresCreativeFollowUp(item),
      rssStory: buildPhoenixRssStory(item),
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
        ...normalizeImagePolicyMetadata(item, sourceImageAllowlist),
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
  const selectedOriginalUrlsByFeedId = new Map();

  for (const config of feedConfigs) {
    const excludedOriginalUrls = Array.isArray(config.excludeSelectedFromFeedIds)
      ? config.excludeSelectedFromFeedIds.flatMap((feedId) => selectedOriginalUrlsByFeedId.get(feedId) || [])
      : [];
    const result = await buildStaticRss({
      ...options,
      ...config,
      excludedOriginalUrls: [
        ...(Array.isArray(options.excludedOriginalUrls) ? options.excludedOriginalUrls : []),
        ...excludedOriginalUrls,
      ],
      feedConfigs: undefined
    });
    results.push(result);
    selectedOriginalUrlsByFeedId.set(
      config.id,
      (result.report.selectedItems || [])
        .map((item) => item.originalUrl)
        .filter(Boolean)
    );
  }

  return {
    generatedAt: (options.now ?? new Date()).toISOString(),
    feeds: results,
    allValid: results.every(({ report }) => report.feedValid || report.preservedPreviousFeed)
  };
}

function cliValue(args = [], name, fallback = "") {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function cliNumber(args = [], name, fallback) {
  const value = cliValue(args, name, "");
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function parseCliOptions(args = process.argv.slice(2)) {
  const feedId = cliValue(args, "--feed-id", "");
  const feedConfig = feedId ? DEFAULT_FEED_CONFIGS.find((config) => config.id === feedId) : null;
  if (feedId && !feedConfig) {
    throw new Error(`Unknown Phoenix RSS feed id: ${feedId}`);
  }

  return {
    feedId,
    feedConfig,
    outputDir: cliValue(args, "--output-dir", ""),
    sourceFetchConcurrency: cliNumber(args, "--source-fetch-concurrency", undefined),
    articleMetadataConcurrency: cliNumber(args, "--article-metadata-concurrency", undefined),
    articleMetadataMaxItems: cliNumber(args, "--article-metadata-max-items", undefined),
    researchSourceLimit: cliNumber(args, "--research-source-limit", undefined),
    sourceImageFetchTimeoutMs: cliNumber(args, "--source-image-fetch-timeout-ms", undefined),
    sourceCollectTimeoutMs: cliNumber(args, "--source-collect-timeout-ms", undefined),
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let cliOptions;
  try {
    cliOptions = parseCliOptions();
  } catch (error) {
    console.error("Phoenix RSS generation failed:", error);
    process.exit(1);
  }

  const runtimeOptions = Object.fromEntries(
    Object.entries({
      outputDir: cliOptions.outputDir || undefined,
      sourceFetchConcurrency: cliOptions.sourceFetchConcurrency,
      articleMetadataConcurrency: cliOptions.articleMetadataConcurrency,
      articleMetadataMaxItems: cliOptions.articleMetadataMaxItems,
      researchSourceLimit: cliOptions.researchSourceLimit,
      sourceImageFetchTimeoutMs: cliOptions.sourceImageFetchTimeoutMs,
      sourceCollectTimeoutMs: cliOptions.sourceCollectTimeoutMs,
    }).filter(([, value]) => typeof value !== "undefined")
  );

  const run = cliOptions.feedConfig
    ? buildStaticRss({
        ...cliOptions.feedConfig,
        ...runtimeOptions,
      }).then((result) => ({ feeds: [result], allValid: result.report.feedValid || result.report.preservedPreviousFeed }))
    : buildAllStaticRss(runtimeOptions);

  run.then(({ feeds, allValid }) => {
    for (const { report } of feeds) {
      console.log(`Phoenix RSS generated [${report.feedId}]: selected=${report.items.selected} feedValid=${report.feedValid} preserved=${report.preservedPreviousFeed} errors=${report.sources.errors.length}`);
    }
    if (!allValid) process.exitCode = 1;
    setImmediate(() => process.exit(process.exitCode || 0));
  })
    .catch((error) => {
      console.error("Phoenix RSS generation failed:", error);
      process.exitCode = 1;
      setImmediate(() => process.exit(1));
    });
}
