import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SITE_URL = "https://phoenixventurestudios.com";
const FALLBACK_IMAGE = `${SITE_URL}/images/signal-default.jpg`;

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

function decodeHtmlEntities(text: string): string {
  if (!text) return "";
  const map: Record<string, string> = {
    "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"',
    "&apos;": "'", "&#39;": "'", "&#x27;": "'", "&#x2F;": "/",
    "&nbsp;": " ", "&mdash;": "—", "&ndash;": "–", "&hellip;": "…",
    "&lsquo;": "\u2018", "&rsquo;": "\u2019", "&ldquo;": "\u201C", "&rdquo;": "\u201D",
  };
  return text.replace(/&[#a-zA-Z0-9]+;/g, (match) => {
    if (map[match]) return map[match];
    const numMatch = match.match(/&#(\d+);/);
    if (numMatch) return String.fromCharCode(parseInt(numMatch[1], 10));
    const hexMatch = match.match(/&#x([0-9a-fA-F]+);/);
    if (hexMatch) return String.fromCharCode(parseInt(hexMatch[1], 16));
    return match;
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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
      .eq("source", "Phoenix Editorial")
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

        const headline = decodeHtmlEntities(a.headline || "");
        const hook = decodeHtmlEntities(a.hook || "");
        const summary = decodeHtmlEntities(a.summary || "");
        const whyItMatters = decodeHtmlEntities(a.why_it_matters || "");
        const founderTakeaway = decodeHtmlEntities(a.founder_takeaway || "");
        const ctaText = decodeHtmlEntities(a.cta_text || "");
        const ctaUrl = a.cta_url || `${SITE_URL}/funding`;
        const category = getBrandedLabel(a.editorial_category || "");

        // Build description as clean flowing prose — no bold labels
        const descParts: string[] = [];
        if (hook) descParts.push(`<p>${hook}</p>`);
        if (summary) descParts.push(`<p>${summary}</p>`);
        if (whyItMatters) descParts.push(`<p>${whyItMatters}</p>`);
        if (founderTakeaway) descParts.push(`<p>${founderTakeaway}</p>`);
        
        // CTA as a natural closing sentence with inline link
        const ctaLabel = ctaText || "Explore your funding options";
        descParts.push(`<p><a href="${escapeXml(ctaUrl)}">${ctaLabel}</a></p>`);
        
        descParts.push(`<p><img src="${imageUrl}" alt="${headline.replace(/"/g, '&quot;')}" /></p>`);

        return `
    <item>
      <title><![CDATA[${category ? `[${category}] ` : ""}${headline}]]></title>
      <description><![CDATA[${descParts.join("")}]]></description>
      <link>${escapeXml(entryUrl)}</link>
      <guid isPermaLink="true">${escapeXml(entryUrl)}</guid>
      <pubDate>${a.source_date || now}</pubDate>
      <source url="${escapeXml(SITE_URL)}/funding">Phoenix Perspective</source>
      <category><![CDATA[${category}]]></category>
      <enclosure url="${escapeXml(imageUrl)}" type="image/jpeg" length="0" />
      <media:content url="${escapeXml(imageUrl)}" medium="image" type="image/jpeg" width="1200" height="630">
        <media:title type="plain"><![CDATA[${headline}]]></media:title>
        <media:description type="plain"><![CDATA[${summary || hook || headline}]]></media:description>
      </media:content>
      <media:thumbnail url="${escapeXml(imageUrl)}" width="1200" height="630" />
    </item>`;
      })
      .join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:og="http://ogp.me/ns#">
  <channel>
    <title>Phoenix Perspective — Founder Strategy &amp; Funding Signals</title>
    <description>Strategic founder insights, capital pathway guidance, and funding signals from Phoenix Perspective. Built for founders ready to move.</description>
    <link>${SITE_URL}/funding</link>
    <lastBuildDate>${now}</lastBuildDate>
    <language>en-us</language>
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
    console.error("Editorial RSS error:", error);
    return new Response(`RSS generation failed: ${error instanceof Error ? error.message : String(error)}`, {
      status: 500,
      headers: corsHeaders,
    });
  }
});
