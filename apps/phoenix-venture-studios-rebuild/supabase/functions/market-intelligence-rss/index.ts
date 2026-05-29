import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://phoenixventurestudios.com";
const FALLBACK_IMAGE = `${SITE_URL}/images/signal-default.jpg`;
const RSS_SELF_URL = `${SITE_URL}/rss/market-intelligence.xml`;

// Map editorial categories to broader buckets for aggregator discoverability
const BUCKET_MAP: Record<string, string> = {
  "Founder Strategy Signal": "Strategy",
  "Capital Market Signal": "Capital",
  "AI Infrastructure Signal": "Technology",
  "Venture Funding Signal": "Funding",
  "Business Credit Signal": "Capital",
  "Market Risk Signal": "Market",
  "Growth Capital Signal": "Funding",
  "Regulatory Signal": "Regulatory",
};

function getBucketCategory(cat: string): string {
  return BUCKET_MAP[cat] || "Founder Insights";
}

function truncateText(text: string, maxLen: number): string {
  if (!text || text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
}

const SIGNAL_LABEL_MAP: Record<string, string> = {
  "Founder Strategy Signal": "Strategic Signal",
  "Capital Market Signal": "Capital Signal",
  "AI Infrastructure Signal": "Market Signal",
  "Venture Funding Signal": "Funding Signal",
  "Business Credit Signal": "Capital Signal",
  "Market Risk Signal": "Market Signal",
  "Growth Capital Signal": "Funding Signal",
  "Regulatory Signal": "Market Signal",
};

function getBrandedLabel(cat: string): string {
  return SIGNAL_LABEL_MAP[cat] || "Founder Signal";
}

// Decode HTML entities before rendering into RSS output
const HTML_ENTITY_MAP: Record<string, string> = {
  "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
  "&apos;": "'", "&#39;": "'", "&#x27;": "'", "&#x2F;": "/",
  "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
  "&lsquo;": "\u2018", "&rsquo;": "\u2019", "&ldquo;": "\u201C", "&rdquo;": "\u201D",
};

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  return text.replace(/&[#a-zA-Z0-9]+;/g, (match) => {
    if (HTML_ENTITY_MAP[match]) return HTML_ENTITY_MAP[match];
    const numMatch = match.match(/&#(\d+);/);
    if (numMatch) return String.fromCharCode(parseInt(numMatch[1], 10));
    const hexMatch = match.match(/&#x([0-9a-fA-F]+);/);
    if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
    return match;
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { data: entries, error: dbError } = await sb
      .from("intelligence_entries")
      .select("*")
      .neq("source", "Phoenix Editorial")
      .order("created_at", { ascending: false })
      .limit(15);

    if (dbError) throw new Error(`DB read failed: ${dbError.message}`);

    const articles = entries || [];
    const now = new Date().toUTCString();

    const items = articles
      .slice(0, 10)
      .map((a: any) => {
        const entryUrl = `${SITE_URL}/intelligence/${a.slug}`;
        const imageUrl = a.image_url || FALLBACK_IMAGE;

        // Decode entities from DB, then use raw text inside CDATA (no XML escaping needed there)
        const headline = decodeHtmlEntities(a.headline || "");
        const summary = decodeHtmlEntities(a.summary || "");
        const whyItMatters = decodeHtmlEntities(a.why_it_matters || "");
        const founderTakeaway = decodeHtmlEntities(a.founder_takeaway || "");
        const watchNext = decodeHtmlEntities(a.featured_quote || "");
        const category = getBrandedLabel(a.editorial_category || "");

        // Inside CDATA we use raw decoded text (no escapeXml needed).
        // Image URL and entry URL are safe ASCII — no entity issues.
        const descParts = [`<p>${summary}</p>`];
        if (whyItMatters) descParts.push(`<p><strong>Why it matters:</strong> ${whyItMatters}</p>`);
        if (founderTakeaway) descParts.push(`<p><strong>Founder Takeaway:</strong> ${founderTakeaway}</p>`);
        if (watchNext) descParts.push(`<p><strong>What to watch next:</strong> ${watchNext}</p>`);
        descParts.push(`<p><img src="${imageUrl}" alt="${headline.replace(/"/g, '&quot;')}" /></p>`);
        const fullDescription = descParts.join("");
        const truncatedDescription = truncateText(fullDescription, 1200);

        const bucketCategory = getBucketCategory(a.editorial_category || "");

        // Title and category use CDATA so no escaping needed for apostrophes/quotes
        return `
    <item>
      <title><![CDATA[${category ? `[${category}] ` : ""}${headline}]]></title>
      <description><![CDATA[${truncatedDescription}]]></description>
      <content:encoded><![CDATA[${fullDescription}]]></content:encoded>
      <dc:creator><![CDATA[Phoenix Venture Studios]]></dc:creator>
      <link>${escapeXml(entryUrl)}</link>
      <guid isPermaLink="true">${escapeXml(entryUrl)}</guid>
      <pubDate>${a.source_date || now}</pubDate>
      <source url="${escapeXml(SITE_URL)}/market-intelligence">Phoenix Venture Studios</source>
      <category><![CDATA[${category}]]></category>
      <category><![CDATA[${bucketCategory}]]></category>
      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />
      <media:content url="${escapeXml(imageUrl)}" medium="image" type="image/jpeg" width="1200" height="630">
        <media:title type="plain"><![CDATA[${headline}]]></media:title>
        <media:description type="plain"><![CDATA[${summary || headline}]]></media:description>
      </media:content>
      <media:thumbnail url="${escapeXml(imageUrl)}" width="1200" height="630" />
    </item>`;
      })
      .join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:og="http://ogp.me/ns#">
  <channel>
    <title>Phoenix Venture Studios — Founder Intelligence</title>
    <description>AI, capital, startup funding, and founder-focused market signals curated by Phoenix Venture Studios.</description>
    <link>${SITE_URL}/market-intelligence</link>
    <atom:link href="${escapeXml(RSS_SELF_URL)}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${now}</lastBuildDate>
    <language>en-us</language>
    <managingEditor>hello@phoenixventurestudios.com (Phoenix Venture Studios)</managingEditor>
    <copyright>© Phoenix Venture Studios</copyright>
    <generator>Phoenix Founder Intelligence Pipeline</generator>
    <image>
      <url>${SITE_URL}/favicon.ico</url>
      <title>Phoenix Venture Studios</title>
      <link>${SITE_URL}</link>
    </image>${items}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/rss+xml; charset=utf-8",
        "Cache-Control": "public, max-age=1800",
      },
    });
  } catch (error) {
    console.error("RSS error:", error);
    return new Response(`RSS generation failed: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
