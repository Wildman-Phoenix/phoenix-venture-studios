function decodeHtmlEntities(value = "") {
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
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => named[name.toLowerCase()] ?? match)
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value = "") {
  return decodeHtmlEntities(String(value).replace(/<[^>]+>/g, " ")).trim();
}

function resolveUrl(value = "", baseUrl = "") {
  const raw = decodeHtmlEntities(value).trim();
  if (!raw) return "";
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return raw;
  }
}

function getAttr(tag = "", attr = "") {
  const re = new RegExp(`\\b${attr}\\s*=\\s*["']([^"']+)["']`, "i");
  return decodeHtmlEntities(tag.match(re)?.[1] || "");
}

function findMetaContent(html = "", names = []) {
  const tags = String(html).match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const property = getAttr(tag, "property").toLowerCase();
    const name = getAttr(tag, "name").toLowerCase();
    const itemprop = getAttr(tag, "itemprop").toLowerCase();
    const key = property || name || itemprop;
    if (names.map((candidate) => candidate.toLowerCase()).includes(key)) {
      const content = getAttr(tag, "content");
      if (content) return content;
    }
  }
  return "";
}

function findLinkHref(html = "", relName = "") {
  const tags = String(html).match(/<link\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const rel = getAttr(tag, "rel").toLowerCase();
    if (rel.split(/\s+/).includes(relName.toLowerCase())) {
      const href = getAttr(tag, "href");
      if (href) return href;
    }
  }
  return "";
}

function findTitle(html = "") {
  const match = String(html).match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  return match ? stripTags(match[1]) : "";
}

function sourceHost(url = "") {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function extractArticleMetadata(html = "", articleUrl = "") {
  const canonicalUrl = resolveUrl(findLinkHref(html, "canonical"), articleUrl) || articleUrl;
  const imageCandidates = [
    ["og:image", findMetaContent(html, ["og:image", "og:image:url", "og:image:secure_url"])],
    ["twitter:image", findMetaContent(html, ["twitter:image", "twitter:image:src"])],
    ["image_src", findLinkHref(html, "image_src")],
  ].filter(([, value]) => value);
  const [imageSource = "none", rawImageUrl = ""] = imageCandidates[0] || [];

  return {
    ok: true,
    url: articleUrl,
    canonicalUrl,
    title: findMetaContent(html, ["og:title", "twitter:title"]) || findTitle(html),
    description: findMetaContent(html, ["og:description", "twitter:description", "description"]),
    imageUrl: resolveUrl(rawImageUrl, canonicalUrl || articleUrl),
    imageSource,
    siteName: findMetaContent(html, ["og:site_name"]),
    sourceHost: sourceHost(canonicalUrl || articleUrl),
    failureReason: "",
  };
}

export async function fetchArticleMetadata(url, options = {}) {
  const fetchTextImpl = options.fetchTextImpl;
  if (!url || typeof fetchTextImpl !== "function") {
    return {
      ok: false,
      url,
      canonicalUrl: url || "",
      title: "",
      description: "",
      imageUrl: "",
      imageSource: "none",
      siteName: "",
      sourceHost: sourceHost(url),
      failureReason: "metadata-fetch-not-configured",
    };
  }

  try {
    const html = await fetchTextImpl(url, options.timeoutMs);
    const metadata = extractArticleMetadata(html, url);
    return {
      ...metadata,
      ok: true,
      failureReason: metadata.imageUrl ? "" : "article-metadata-image-missing",
    };
  } catch (error) {
    return {
      ok: false,
      url,
      canonicalUrl: url,
      title: "",
      description: "",
      imageUrl: "",
      imageSource: "none",
      siteName: "",
      sourceHost: sourceHost(url),
      failureReason: error instanceof Error ? error.message : String(error),
    };
  }
}
