export interface StaticFeedArticle {
  headline: string;
  source: string;
  date: string;
  summary: string;
  url: string;
  originalUrl?: string;
  internalUrl?: string;
  internalPath?: string;
  imageUrl?: string;
  socialImageUrl?: string;
  socialImagePath?: string;
  sourceImageUrl?: string;
  imageStrategy?: string;
  imageFamily?: string;
  imageSourceType?: string;
  imageCredit?: string;
  imageRightsStatus?: string;
  imageTemplate?: string;
  imageWarnings?: string[];
  imageBrief?: {
    storyAngle?: string;
    emotionalHook?: string;
    visualMetaphor?: string;
    audiencePainOpportunity?: string;
    imageFamily?: string;
    overlayTone?: string;
    template?: string;
    manualReviewNeeded?: boolean;
  };
  slug?: string;
  id?: string;
  editorialCategory?: string;
  whyItMatters?: string;
  whyShared?: string;
  founderTakeaway?: string;
  businessTakeaway?: string;
}

interface JsonFeedItem {
  id?: string;
  url?: string;
  external_url?: string;
  title?: string;
  content_text?: string;
  image?: string;
  banner_image?: string;
  date_published?: string;
  authors?: { name?: string }[];
  tags?: string[];
  _phoenix?: {
    source?: string;
    bucket?: string;
    score?: number;
    slug?: string;
    imageUrl?: string;
    socialImageUrl?: string;
    socialImagePath?: string;
    sourceImageUrl?: string;
    imageStrategy?: string;
    imageFamily?: string;
    imageSourceType?: string;
    imageCredit?: string;
    imageRightsStatus?: string;
    imageTemplate?: string;
    imageWarnings?: string[];
    imageBrief?: StaticFeedArticle["imageBrief"];
    internalPath?: string;
    internalUrl?: string;
    originalUrl?: string;
    whyItMatters?: string;
    whyShared?: string;
    founderTakeaway?: string;
    businessTakeaway?: string;
  };
}

interface JsonFeed {
  items?: JsonFeedItem[];
  generated_at?: string;
}

const DEFAULT_SIGNAL_IMAGE_PATH = "/images/signal-default.jpg";
const PHOENIX_IMAGE_HOSTS = new Set([
  "phoenixventurestudios.com",
  "www.phoenixventurestudios.com",
  "localhost",
  "127.0.0.1",
]);

const CATEGORY_FALLBACK_IMAGE_MAP: Array<{ match: RegExp; path: string }> = [
  { match: /(ai|infrastructure|automation|agent)/i, path: "/images/signal-ai-infrastructure.jpg" },
  { match: /(funding|venture|capital|growth)/i, path: "/images/signal-venture-funding.jpg" },
  { match: /(credit|lending|loan|financing)/i, path: "/images/signal-business-credit.jpg" },
  { match: /(risk|regulatory|policy|compliance)/i, path: "/images/signal-market-risk.jpg" },
  { match: /(founder|strategy|operator)/i, path: "/images/signal-founder-strategy.jpg" },
];

function formatFeedDate(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function resolvePublicAssetPath(path?: string): string {
  if (!path) return "";
  return `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
}

function extractPhoenixOwnedImagePath(value?: string): string {
  if (!value) return "";

  if (value.startsWith("/images/")) {
    return value;
  }

  try {
    const parsed = new URL(value, "https://phoenixventurestudios.com");
    const host = parsed.hostname.toLowerCase();
    const isPhoenixHost = PHOENIX_IMAGE_HOSTS.has(host);

    if (!isPhoenixHost) return "";

    const imagePathIndex = parsed.pathname.indexOf("/images/");
    if (imagePathIndex === -1) return "";
    return parsed.pathname.slice(imagePathIndex);
  } catch {
    return "";
  }
}

function pickFallbackSignalImage(category?: string): string {
  if (category) {
    for (const candidate of CATEGORY_FALLBACK_IMAGE_MAP) {
      if (candidate.match.test(category)) {
        return resolvePublicAssetPath(candidate.path);
      }
    }
  }

  return resolvePublicAssetPath(DEFAULT_SIGNAL_IMAGE_PATH);
}

function resolveSignalImage(item: JsonFeedItem, category?: string) {
  const ownedPathCandidates = [
    item._phoenix?.socialImagePath,
    extractPhoenixOwnedImagePath(item._phoenix?.socialImageUrl),
    extractPhoenixOwnedImagePath(item._phoenix?.imageUrl),
    extractPhoenixOwnedImagePath(item.image),
    extractPhoenixOwnedImagePath(item.banner_image),
  ];

  for (const candidate of ownedPathCandidates) {
    const resolved = resolvePublicAssetPath(candidate);
    if (resolved) {
      return {
        imageUrl: resolved,
        socialImageUrl: resolved,
        socialImagePath: candidate || undefined,
      };
    }
  }

  const fallbackImageUrl = pickFallbackSignalImage(category);
  return {
    imageUrl: fallbackImageUrl,
    socialImageUrl: fallbackImageUrl,
    socialImagePath: DEFAULT_SIGNAL_IMAGE_PATH,
  };
}

export async function loadStaticRssFeed(count = 10, feedFile = "feed.json"): Promise<{
  articles: StaticFeedArticle[];
  featuredSignal: string;
}> {
  const feedUrl = `${import.meta.env.BASE_URL}rss/${feedFile}`;
  const response = await fetch(feedUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Static RSS feed unavailable: ${response.status}`);
  }

  const feed = (await response.json()) as JsonFeed;
  const articles = (feed.items || []).slice(0, count).map((item) => {
    const source = item._phoenix?.source || item.authors?.[0]?.name || "Phoenix Source";
    const category = item.tags?.[0] || "Founder Intelligence";
    const internalUrl = item._phoenix?.internalUrl || item.url || "";
    const originalUrl = item.external_url || item._phoenix?.originalUrl || "";
    const { imageUrl, socialImageUrl, socialImagePath } = resolveSignalImage(item, category);

    return {
      id: item.id || item.url,
      headline: item.title || "Founder intelligence signal",
      source,
      date: formatFeedDate(item.date_published),
      summary: item.content_text || "",
      url: internalUrl,
      originalUrl,
      internalUrl,
      internalPath: item._phoenix?.internalPath,
      imageUrl,
      socialImagePath,
      socialImageUrl,
      imageStrategy: item._phoenix?.imageStrategy,
      imageFamily: item._phoenix?.imageFamily,
      imageSourceType: item._phoenix?.imageSourceType,
      imageCredit: item._phoenix?.imageCredit,
      imageRightsStatus: item._phoenix?.imageRightsStatus,
      imageTemplate: item._phoenix?.imageTemplate,
      imageWarnings: item._phoenix?.imageWarnings || [],
      imageBrief: item._phoenix?.imageBrief,
      slug: item._phoenix?.slug,
      editorialCategory: category,
      whyItMatters: item._phoenix?.whyItMatters || `${category} selected by Phoenix as a signal worth a founder's attention right now.`,
      whyShared: item._phoenix?.whyShared,
      founderTakeaway: item._phoenix?.founderTakeaway || item.content_text || "",
      businessTakeaway: item._phoenix?.businessTakeaway,
    };
  });

  return {
    articles,
    featuredSignal: articles[0]?.headline || `Phoenix RSS generated ${formatFeedDate(feed.generated_at)}`,
  };
}
