import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, user-agent",
};

const SITE_URL = "https://phoenixventurestudios.com";
const FALLBACK_IMAGE = `${SITE_URL}/images/signal-default.jpg`;

// Bots that fetch pages to build link previews. Match conservatively
// (case-insensitive substring) — anything not matched gets the human redirect.
const BOT_UA_PATTERNS = [
  "facebookexternalhit",
  "facebookcatalog",
  "facebot",
  "linkedinbot",
  "twitterbot",
  "x-bot",
  "slackbot",
  "slack-imgproxy",
  "discordbot",
  "telegrambot",
  "whatsapp",
  "skypeuripreview",
  "applebot",
  "googlebot",
  "bingbot",
  "duckduckbot",
  "embedly",
  "redditbot",
  "pinterest",
  "tumblr",
  "vkshare",
  "quora link preview",
  "yandex",
  "baiduspider",
  "iframely",
  "outbrain",
  "nuzzel",
  "qwantify",
];

function isBot(ua: string | null): boolean {
  if (!ua) return false;
  const lower = ua.toLowerCase();
  return BOT_UA_PATTERNS.some((p) => lower.includes(p));
}

function escapeHtml(str: string): string {
  return (str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  // Accept slug from either query (?slug=...) or trailing path segment
  // (/og-share/<slug>) so the function works behind either pattern.
  let slug = url.searchParams.get("slug") || "";
  if (!slug) {
    const parts = url.pathname.split("/").filter(Boolean);
    slug = parts[parts.length - 1] || "";
    if (slug === "og-share") slug = "";
  }

  const articleUrl = slug ? `${SITE_URL}/intelligence/${slug}` : SITE_URL;
  const ua = req.headers.get("user-agent");
  const bot = isBot(ua);

  // Humans → redirect straight to the SPA article. Bots → render meta HTML.
  if (!bot) {
    return Response.redirect(articleUrl, 302);
  }

  if (!slug) {
    return new Response("Missing slug", {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const sb = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await sb
    .from("public_intelligence_entries")
    .select(
      "slug, headline, summary, hook, why_it_matters, image_url, source, source_date"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (error || !data) {
    return new Response("Not found", {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "text/plain" },
    });
  }

  const headline = data.headline || "Phoenix Perspective";
  const description =
    data.summary ||
    data.hook ||
    data.why_it_matters ||
    "Founder intelligence and capital signals from Phoenix Venture Studios.";
  const image = data.image_url || FALLBACK_IMAGE;
  const siteName = "Phoenix Perspective";

  const html = `<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns#">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(headline)} | Phoenix Venture Studios</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${escapeHtml(articleUrl)}" />

  <meta property="og:type" content="article" />
  <meta property="og:site_name" content="${escapeHtml(siteName)}" />
  <meta property="og:title" content="${escapeHtml(headline)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${escapeHtml(articleUrl)}" />
  <meta property="og:image" content="${escapeHtml(image)}" />
  <meta property="og:image:secure_url" content="${escapeHtml(image)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:image:alt" content="${escapeHtml(headline)}" />
  ${data.source_date ? `<meta property="article:published_time" content="${escapeHtml(data.source_date)}" />` : ""}

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(headline)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(image)}" />
  <meta name="twitter:image:alt" content="${escapeHtml(headline)}" />

  <meta http-equiv="refresh" content="0; url=${escapeHtml(articleUrl)}" />
</head>
<body>
  <h1>${escapeHtml(headline)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(articleUrl)}">Read on Phoenix Venture Studios →</a></p>
  <img src="${escapeHtml(image)}" alt="${escapeHtml(headline)}" width="1200" height="630" />
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
      "X-Robots-Tag": "noindex",
    },
  });
});