import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const DEFAULT_SITE_URL = "https://phoenixventurestudios.com";
const FEED_FILES = ["feed.json", "ai-attention.json"] as const;
const MAX_SELECTED_ITEMS = 6;

type FeedItem = {
  title?: string;
  content_text?: string;
  date_published?: string;
  url?: string;
  external_url?: string;
  image?: string;
  banner_image?: string;
  tags?: string[];
  _phoenix?: {
    score?: number;
    slug?: string;
    source?: string;
    bucket?: string;
    bucketLabel?: string;
    internalPath?: string;
    internalUrl?: string;
    originalUrl?: string;
    socialImagePath?: string;
    socialImageUrl?: string;
    whyItMatters?: string;
    whyShared?: string;
    founderTakeaway?: string;
    businessTakeaway?: string;
  };
};

type FeedResponse = {
  generated_at?: string;
  items?: FeedItem[];
};

type BriefArticle = {
  headline: string;
  summary: string;
  publishedAt: string;
  dateLabel: string;
  source: string;
  bucket: string;
  bucketLabel: string;
  slug: string;
  score: number;
  internalUrl: string;
  originalUrl: string;
  imageUrl: string;
  whyItMatters: string;
  founderTakeaway: string;
  businessTakeaway: string;
  feedId: string;
};

function normalizeSiteUrl(value = DEFAULT_SITE_URL) {
  return String(value || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function formatDateLabel(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function trimSentence(value = "", maxLength = 180) {
  const normalized = String(value).replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}...`;
}

function normalizeText(value = "") {
  return String(value).replace(/\s+/g, " ").trim();
}

function toAbsoluteUrl(value = "", siteUrl = DEFAULT_SITE_URL) {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  const normalizedSiteUrl = normalizeSiteUrl(siteUrl);
  const path = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedSiteUrl}${path}`;
}

function resolvePhoenixImage(item: FeedItem, siteUrl: string) {
  const socialImagePath = item._phoenix?.socialImagePath || "";
  if (socialImagePath) return toAbsoluteUrl(socialImagePath, siteUrl);

  const imageValue =
    item._phoenix?.socialImageUrl ||
    item.image ||
    item.banner_image ||
    "";

  if (!imageValue) return toAbsoluteUrl("/images/signal-default.jpg", siteUrl);

  try {
    const imageUrl = new URL(imageValue);
    const baseUrl = new URL(normalizeSiteUrl(siteUrl));
    if (imageUrl.origin === baseUrl.origin && imageUrl.pathname.includes("/images/")) {
      return toAbsoluteUrl(imageUrl.pathname, siteUrl);
    }
  } catch {
    return toAbsoluteUrl(imageValue, siteUrl);
  }

  return imageValue;
}

async function loadFeed(siteUrl: string, feedFile: string) {
  const feedUrl = `${normalizeSiteUrl(siteUrl)}/rss/${feedFile}`;
  const response = await fetch(feedUrl, {
    headers: {
      Accept: "application/json",
      "Cache-Control": "no-cache",
    },
  });

  if (!response.ok) {
    throw new Error(`Unable to load ${feedFile}: ${response.status}`);
  }

  return (await response.json()) as FeedResponse;
}

function mapFeedItems(feedId: string, items: FeedItem[], siteUrl: string) {
  return items.map((item) => {
    const headline = normalizeText(item.title || "Founder Signal");
    const bucket = item._phoenix?.bucket || "wildcard_attention";
    const source = item._phoenix?.source || "Phoenix Source";
    const internalUrl = item._phoenix?.internalUrl || item.url || "";
    const originalUrl = item.external_url || item._phoenix?.originalUrl || "";
    const slug = item._phoenix?.slug || headline.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    return {
      headline,
      summary: trimSentence(item.content_text || item._phoenix?.whyItMatters || "", 220),
      publishedAt: item.date_published || "",
      dateLabel: formatDateLabel(item.date_published),
      source,
      bucket,
      bucketLabel: item.tags?.[0] || item._phoenix?.bucketLabel || "Founder Signal",
      slug,
      score: Number(item._phoenix?.score || 0),
      internalUrl,
      originalUrl,
      imageUrl: resolvePhoenixImage(item, siteUrl),
      whyItMatters: trimSentence(item._phoenix?.whyItMatters || item.content_text || "", 220),
      founderTakeaway: trimSentence(item._phoenix?.founderTakeaway || item._phoenix?.businessTakeaway || "", 200),
      businessTakeaway: trimSentence(item._phoenix?.businessTakeaway || item._phoenix?.founderTakeaway || "", 200),
      feedId,
    } satisfies BriefArticle;
  }).filter((item) => item.headline && item.internalUrl);
}

function dedupeArticles(items: BriefArticle[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.slug || item.internalUrl || item.headline;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function selectBriefItems(founderItems: BriefArticle[], aiItems: BriefArticle[]) {
  const founderSelected = founderItems.slice(0, 4);
  const founderSlugs = new Set(founderSelected.map((item) => item.slug));
  const aiSelected = aiItems.filter((item) => !founderSlugs.has(item.slug)).slice(0, 3);

  return dedupeArticles([...founderSelected, ...aiSelected])
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SELECTED_ITEMS);
}

function countMatching(items: BriefArticle[], pattern: RegExp) {
  return items.filter((item) => pattern.test(`${item.headline} ${item.summary} ${item.bucket}`)).length;
}

function buildSubjectLine(items: BriefArticle[]) {
  const capital = countMatching(items, /\b(funding_venture|capital_credit|funding|capital|raise|raised|valuation|credit|loan)\b/i);
  const build = countMatching(items, /\b(vibe|coding|codex|app|apps|builder|build|github|cloudflare|tool|agent)\b/i);
  const ai = countMatching(items, /\b(ai_|artificial intelligence|agent|automation|tool|model|workflow)\b/i);

  if (capital > 0 && build > 1) return "Useful builders are pulling capital";
  if (capital > 0 && ai > 0) return "Capital is following usable AI";
  if (build > 1) return "Builders are getting sharper leverage";
  if (ai > 2) return "AI is moving into operating roles";
  if (capital > 1) return "Capital is rewarding clearer bets";
  return "The signal is getting more practical";
}

function buildPreviewText(items: BriefArticle[]) {
  const build = countMatching(items, /\b(vibe|coding|codex|app|apps|builder|build)\b/i);
  if (build > 1) {
    return "This week’s signal points at where builders, capital, and AI are actually converging.";
  }
  return "This week’s brief shows where AI, capital, and execution are tightening around real outcomes.";
}

function buildLeadParagraphs(items: BriefArticle[]) {
  const capital = countMatching(items, /\b(funding_venture|capital_credit|funding|capital|raise|raised|valuation|credit|loan)\b/i);
  const build = countMatching(items, /\b(vibe|coding|codex|app|apps|builder|build)\b/i);
  const ai = countMatching(items, /\b(ai_|artificial intelligence|agent|automation|tool|model|workflow)\b/i);

  let first = "The useful shift this week is not more noise. It is that capital, tools, and operator attention are clustering around what can actually be deployed, measured, and sold.";
  let second = "That matters because founders do not need more headlines. They need a cleaner read on where momentum is becoming practical leverage.";

  if (capital > 0 && build > 1) {
    first = "Capital is not just chasing novelty right now. It is drifting toward founders building usable systems, sharper tools, and more concrete operating leverage.";
    second = "That creates a simpler question for the week: where can you turn new technical movement into a clearer offer, a faster build cycle, or a more defensible position?";
  } else if (ai > 2) {
    first = "AI stories are getting less theoretical and more operational. The pressure is shifting toward which workflows can be trusted, accelerated, or re-scoped with real discipline.";
    second = "That is where the useful edge sits: not in adopting every tool, but in knowing which changes actually move revenue, speed, or decision quality.";
  } else if (capital > 1) {
    first = "This week’s funding news says more than who raised. It shows where conviction is concentrating and which business stories are becoming easier to underwrite.";
    second = "The founders who benefit are the ones who can translate that market conviction into tighter positioning, cleaner numbers, and better timing.";
  }

  return { first, second };
}

function buildClosingParagraphs(items: BriefArticle[]) {
  const capital = countMatching(items, /\b(funding_venture|capital_credit|funding|capital|raise|raised|valuation|credit|loan)\b/i);
  const build = countMatching(items, /\b(vibe|coding|codex|app|apps|builder|build)\b/i);
  const ai = countMatching(items, /\b(ai_|artificial intelligence|agent|automation|tool|model|workflow)\b/i);

  let first = "The pattern across this week’s signal is simple: momentum is favoring founders who can turn attention into a better operating choice. The story is getting less about reacting fast and more about choosing the right constraint to solve.";
  let second = "Carry that posture into next week. Stay close to the moves that sharpen delivery, timing, and business fit, and ignore the noise that cannot be tied to a concrete decision.";

  if (capital > 0 && build > 0) {
    first = "The strongest pattern this week is that capital and build velocity are starting to reinforce each other. Markets are paying more attention to teams that can translate technical change into usable business systems.";
    second = "Next week, keep asking whether the thing you are building creates clearer cash flow, better timing, or stronger adoption. That is the filter worth carrying forward.";
  } else if (ai > 2) {
    first = "This week reinforced that AI value is being sorted at the workflow level, not the hype level. The winners are the operators who know where to install judgment, speed, and supervision.";
    second = "Go into next week with a tighter operating lens. Pick one process where better tooling could create leverage, and make that decision measurable before you expand the system.";
  }

  return { first, second };
}

function buildCardHtml(item: BriefArticle) {
  const title = escapeHtml(item.headline);
  const summary = escapeHtml(item.summary);
  const why = escapeHtml(item.whyItMatters || item.summary);
  const watch = escapeHtml(item.founderTakeaway || item.businessTakeaway || item.summary);
  const sourceMeta = [item.source, item.dateLabel].filter(Boolean).join(" • ");
  const imageHtml = item.imageUrl
    ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(`Founder Signal card for ${item.headline}`)}" style="width:100%;height:160px;object-fit:cover;display:block;border-radius:6px 6px 0 0;" />`
    : "";

  return `
    <div style="border:1px solid #E5E7EB;border-left:3px solid #F97316;border-radius:6px;background:#FAFAFA;margin:0 0 16px 0;overflow:hidden;">
      ${imageHtml}
      <div style="padding:20px;">
        <p style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin:0 0 8px 0;">${escapeHtml(sourceMeta || item.bucketLabel)}</p>
        <h2 style="font-size:16px;font-weight:700;color:#1F2937;margin:0 0 6px 0;line-height:1.3;">${title}</h2>
        <a href="${escapeHtml(item.internalUrl)}" style="font-size:12px;color:#F97316;text-decoration:none;font-weight:500;display:inline-block;margin:0 0 14px 0;">Read the signal on Phoenix →</a>
        <p style="font-size:14px;color:#4B5563;line-height:1.6;margin:0 0 14px 0;">${summary}</p>
        <p style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#F97316;margin:0 0 4px 0;opacity:0.85;">WHY IT MATTERS</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 14px 0;">${why}</p>
        <p style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#9CA3AF;margin:0 0 4px 0;opacity:0.9;">WHAT TO WATCH</p>
        <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">${watch}</p>
      </div>
    </div>
  `;
}

function buildCardText(item: BriefArticle) {
  const lines = [
    item.headline,
    `Read the signal on Phoenix: ${item.internalUrl}`,
    item.summary,
    "",
    "WHY IT MATTERS",
    item.whyItMatters || item.summary,
    "",
    "WHAT TO WATCH",
    item.founderTakeaway || item.businessTakeaway || item.summary,
  ];
  if (item.originalUrl) {
    lines.push("", `Original source: ${item.originalUrl}`);
  }
  return lines.join("\n");
}

function buildNewsletter(items: BriefArticle[], siteUrl: string) {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);
  const dateRange = `${weekStart.toLocaleDateString("en-US", { month: "long", day: "numeric" })} – ${now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;

  const subjectLine = buildSubjectLine(items);
  const previewText = buildPreviewText(items);
  const lead = buildLeadParagraphs(items);
  const closing = buildClosingParagraphs(items);
  const marketUrl = `${normalizeSiteUrl(siteUrl)}/market-intelligence`;
  const snapshotUrl = `${normalizeSiteUrl(siteUrl)}/snapshot`;

  const cardHtml = items.map((item, index) => {
    const pacer = (index + 1) % 3 === 0 && index !== items.length - 1
      ? `<div style="color:#D1D5DB;font-size:16px;letter-spacing:8px;padding:8px 0;text-align:center;">· · ·</div>`
      : "";
    return `${buildCardHtml(item)}${pacer}`;
  }).join("");

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subjectLine)}</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;background:#FFFFFF;">
    <p style="font-size:11px;letter-spacing:0.8px;text-transform:uppercase;color:#9CA3AF;margin:0 0 6px 0;">Weekly Briefing · ${escapeHtml(dateRange)}</p>
    <h1 style="font-size:26px;font-weight:700;color:#1F2937;margin:0;line-height:1.2;">The Founder Signal</h1>
    <p style="font-size:13px;color:#9CA3AF;margin:6px 0 0 0;font-weight:400;">Strategic intelligence for founders, operators, and business owners</p>
    <div style="width:36px;height:2px;background:#F97316;margin:14px 0 20px 0;"></div>

    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 14px 0;">${escapeHtml(lead.first)}</p>
    <p style="font-size:15px;color:#374151;line-height:1.7;margin:0 0 24px 0;">${escapeHtml(lead.second)}</p>

    ${cardHtml}

    <div style="margin-top:28px;border-top:1px solid #E5E7EB;padding-top:20px;">
      <h2 style="font-size:17px;font-weight:700;color:#1F2937;margin:0 0 10px 0;">What This Means for Founders</h2>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0 0 12px 0;">${escapeHtml(closing.first)}</p>
      <p style="font-size:14px;color:#374151;line-height:1.7;margin:0;">${escapeHtml(closing.second)}</p>
    </div>

    <div style="margin-top:28px;text-align:center;">
      <p style="font-size:13px;color:#9CA3AF;text-align:center;margin:0 0 16px 0;">Use this week’s signals to sharpen your next move.</p>
      <a href="${escapeHtml(marketUrl)}" style="display:block;width:100%;max-width:260px;margin:0 auto 10px auto;padding:12px 0;background:#F97316;color:#FFFFFF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Explore Market Intelligence</a>
      <a href="${escapeHtml(snapshotUrl)}" style="display:block;width:100%;max-width:260px;margin:0 auto;padding:12px 0;background:transparent;border:1.5px solid #E5E7EB;color:#9CA3AF;font-size:14px;font-weight:600;text-align:center;text-decoration:none;border-radius:5px;">Get Your Venture Snapshot</a>
    </div>

    <div style="border-top:1px solid #F3F4F6;padding-top:20px;margin-top:36px;text-align:center;">
      <p style="font-size:12px;font-weight:600;color:#9CA3AF;margin:0;letter-spacing:0.3px;">Phoenix Venture Studios</p>
      <p style="font-size:11px;color:#D1D5DB;margin:4px 0 0 0;font-style:italic;">Clarity over complexity. Strategy over noise.</p>
      <p style="font-size:11px;color:#D1D5DB;margin:12px 0 0 0;">
        <a href="{{UNSUBSCRIBE_URL}}" style="color:#D1D5DB;text-decoration:underline;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>`.trim();

  const textBody = [
    `WEEKLY BRIEFING · ${dateRange}`,
    "THE FOUNDER SIGNAL",
    "Strategic intelligence for founders, operators, and business owners",
    "",
    lead.first,
    "",
    lead.second,
    "",
    ...items.flatMap((item, index) => {
      const block = buildCardText(item).split("\n");
      if ((index + 1) % 3 === 0 && index !== items.length - 1) {
        return [...block, "", "---", ""];
      }
      return [...block, ""];
    }),
    "WHAT THIS MEANS FOR FOUNDERS",
    closing.first,
    "",
    closing.second,
    "",
    `Explore Market Intelligence: ${marketUrl}`,
    `Get Your Venture Snapshot: ${snapshotUrl}`,
    "",
    "Phoenix Venture Studios",
    "Clarity over complexity. Strategy over noise.",
    "",
    "Unsubscribe: {{UNSUBSCRIBE_URL}}",
  ].join("\n");

  return {
    weekStart: weekStart.toISOString().split("T")[0],
    weekEnd: now.toISOString().split("T")[0],
    subjectLine,
    previewText,
    htmlBody,
    textBody,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const siteUrl = normalizeSiteUrl(Deno.env.get("SITE_URL") || DEFAULT_SITE_URL);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const [founderFeed, aiFeed] = await Promise.all([
      loadFeed(siteUrl, FEED_FILES[0]),
      loadFeed(siteUrl, FEED_FILES[1]),
    ]);

    const founderItems = mapFeedItems("founder-intelligence", founderFeed.items || [], siteUrl)
      .sort((a, b) => b.score - a.score);
    const aiItems = mapFeedItems("ai-attention", aiFeed.items || [], siteUrl)
      .sort((a, b) => b.score - a.score);

    const selectedItems = selectBriefItems(founderItems, aiItems);
    if (!selectedItems.length) {
      return new Response(
        JSON.stringify({ success: false, reason: "No RSS items were available to compose the weekly brief." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const newsletter = buildNewsletter(selectedItems, siteUrl);

    const { data: briefRun, error: insertError } = await supabase
      .from("weekly_brief_runs")
      .insert({
        week_start: newsletter.weekStart,
        week_end: newsletter.weekEnd,
        status: "drafted",
        entry_count: selectedItems.length,
        subject_line: newsletter.subjectLine,
        preview_text: newsletter.previewText,
        html_body: newsletter.htmlBody,
        text_body: newsletter.textBody,
        source_entry_ids: [],
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return new Response(
      JSON.stringify({
        success: true,
        brief_id: briefRun.id,
        subject_line: newsletter.subjectLine,
        preview_text: newsletter.previewText,
        entry_count: selectedItems.length,
        source_slugs: selectedItems.map((item) => item.slug),
        feeds_used: FEED_FILES,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("compose-founder-signal error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
