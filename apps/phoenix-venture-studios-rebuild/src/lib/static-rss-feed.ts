export interface StaticFeedArticle {
  headline: string;
  source: string;
  date: string;
  publishedAt?: string;
  summary: string;
  sourceSummary?: string;
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
  trendContext?: string;
  engagementPrompt?: string;
  whySelected?: string;
  editorialMode?: string;
  feedId?: string;
  feedRole?: string;
  rssStory?: string;
  researchCitations?: string[];
  relatedRecentSignals?: string[];
  articleBody?: string[];
  sourceLinks?: {
    label: string;
    url: string;
  }[];
  briefDepth?: "signal-note" | "editorial-brief" | "expanded-briefing";
  sourceLinkCount?: number;
  researchCitationCount?: number;
  relatedSignalCount?: number;
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
    simpleSummary?: string;
    trendContext?: string;
    engagementPrompt?: string;
    whySelected?: string;
    editorialMode?: string;
    feedId?: string;
    feedRole?: string;
    rssStory?: string;
    researchCitations?: string[];
    relatedRecentSignals?: string[];
    topicLabel?: string;
    publicTitle?: string;
    sourceTitle?: string;
    sourceName?: string;
    articleBody?: string[];
    sourceLinks?: {
      label?: string;
      url?: string;
    }[];
  };
}

interface JsonFeed {
  items?: JsonFeedItem[];
  generated_at?: string;
}

const PHOENIX_IMAGE_HOSTS = new Set([
  "phoenixventurestudios.com",
  "www.phoenixventurestudios.com",
  "localhost",
  "127.0.0.1",
]);
const DEFAULT_PUBLIC_SIGNAL_FEED_FILES = ["feed.json", "tools.json", "ai-attention.json"] as const;

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

function normalizeText(value?: string): string {
  return value?.replace(/\s+/g, " ").trim() || "";
}

function extractFirstParagraph(value?: string): string {
  if (!value) return "";

  const [firstParagraph = ""] = value
    .split(/\n\s*\n/)
    .map((part) => normalizeText(part))
    .filter(Boolean);

  return firstParagraph;
}

function formatBucketLabel(value?: string): string {
  if (!value) return "";
  return value
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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

function resolveSignalImage(item: JsonFeedItem) {
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

  return {
    imageUrl: "",
    socialImageUrl: "",
    socialImagePath: undefined,
  };
}

function getArticleKey(article: StaticFeedArticle) {
  return article.slug || article.internalPath || article.url || article.headline;
}

function compareArticlesByPublishedAt(a: StaticFeedArticle, b: StaticFeedArticle) {
  const aTime = a.publishedAt ? Date.parse(a.publishedAt) : Number.NaN;
  const bTime = b.publishedAt ? Date.parse(b.publishedAt) : Number.NaN;

  if (Number.isNaN(aTime) && Number.isNaN(bTime)) return 0;
  if (Number.isNaN(aTime)) return 1;
  if (Number.isNaN(bTime)) return -1;
  return bTime - aTime;
}

function getBriefDepth({
  rssStory,
  articleBody,
  researchCitations,
  relatedRecentSignals,
  sourceLinks,
  whyItMatters,
  founderTakeaway,
  trendContext,
  engagementPrompt,
}: {
  rssStory?: string;
  articleBody: string[];
  researchCitations: string[];
  relatedRecentSignals: string[];
  sourceLinks: { label: string; url: string }[];
  whyItMatters?: string;
  founderTakeaway?: string;
  trendContext?: string;
  engagementPrompt?: string;
}): StaticFeedArticle["briefDepth"] {
  const hasExpandedEvidence =
    articleBody.length > 0 ||
    researchCitations.length > 0 ||
    relatedRecentSignals.length > 0 ||
    sourceLinks.length > 0;

  if (hasExpandedEvidence) {
    return "expanded-briefing";
  }

  const editorialSignalCount = [
    normalizeText(rssStory),
    normalizeText(whyItMatters),
    normalizeText(founderTakeaway),
    normalizeText(trendContext),
    normalizeText(engagementPrompt),
  ].filter(Boolean).length;

  if (editorialSignalCount >= 3) {
    return "editorial-brief";
  }

  return "signal-note";
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
    const source = item._phoenix?.sourceName || item._phoenix?.source || item.authors?.[0]?.name || "Phoenix Source";
    const category =
      item._phoenix?.topicLabel ||
      item.tags?.[0] ||
      formatBucketLabel(item._phoenix?.bucket) ||
      "Founder Intelligence";
    const internalUrl = item._phoenix?.internalUrl || item.url || "";
    const originalUrl = item.external_url || item._phoenix?.originalUrl || "";
    const { imageUrl, socialImageUrl, socialImagePath } = resolveSignalImage(item);
    const sourceSummary = extractFirstParagraph(item.content_text);
    const summary = normalizeText(item._phoenix?.simpleSummary) || sourceSummary;
    const whyItMatters = normalizeText(item._phoenix?.whyItMatters);
    const whyShared = normalizeText(item._phoenix?.whyShared);
    const founderTakeaway = normalizeText(item._phoenix?.founderTakeaway);
    const businessTakeaway = normalizeText(item._phoenix?.businessTakeaway);
    const researchCitations = Array.isArray(item._phoenix?.researchCitations)
      ? item._phoenix.researchCitations.map((citation) => normalizeText(String(citation))).filter(Boolean)
      : [];
    const relatedRecentSignals = Array.isArray(item._phoenix?.relatedRecentSignals)
      ? item._phoenix.relatedRecentSignals.map((signal) => normalizeText(String(signal))).filter(Boolean)
      : [];
    const articleBody = Array.isArray(item._phoenix?.articleBody)
      ? item._phoenix.articleBody.map((paragraph) => normalizeText(paragraph)).filter(Boolean)
      : [];
    const sourceLinks = Array.isArray(item._phoenix?.sourceLinks)
      ? item._phoenix.sourceLinks
          .map((link) => ({
            label: normalizeText(link.label),
            url: normalizeText(link.url),
          }))
          .filter((link) => link.label && link.url)
      : [];
    const rssStory = normalizeText(item._phoenix?.rssStory);
    const trendContext = normalizeText(item._phoenix?.trendContext);
    const engagementPrompt = normalizeText(item._phoenix?.engagementPrompt);
    const briefDepth = getBriefDepth({
      rssStory,
      articleBody,
      researchCitations,
      relatedRecentSignals,
      sourceLinks,
      whyItMatters,
      founderTakeaway,
      trendContext,
      engagementPrompt,
    });

    return {
      id: item.id || item.url,
      headline:
        item._phoenix?.publicTitle ||
        item._phoenix?.sourceTitle ||
        item.title ||
        "Founder intelligence signal",
      source,
      date: formatFeedDate(item.date_published),
      publishedAt: item.date_published || "",
      summary,
      sourceSummary,
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
      whyItMatters,
      whyShared,
      founderTakeaway,
      businessTakeaway,
      trendContext,
      engagementPrompt,
      whySelected: normalizeText(item._phoenix?.whySelected),
      editorialMode: normalizeText(item._phoenix?.editorialMode),
      feedId: normalizeText(item._phoenix?.feedId),
      feedRole: normalizeText(item._phoenix?.feedRole),
      rssStory,
      researchCitations,
      relatedRecentSignals,
      articleBody,
      sourceLinks,
      briefDepth,
      sourceLinkCount: sourceLinks.length + (originalUrl ? 1 : 0),
      researchCitationCount: researchCitations.length,
      relatedSignalCount: relatedRecentSignals.length,
    };
  });

  return {
    articles,
    featuredSignal: articles[0]?.headline || `Phoenix RSS generated ${formatFeedDate(feed.generated_at)}`,
  };
}

export async function loadMergedStaticRssFeeds(
  count = 10,
  feedFiles: readonly string[] = DEFAULT_PUBLIC_SIGNAL_FEED_FILES,
): Promise<{
  articles: StaticFeedArticle[];
  featuredSignal: string;
}> {
  const results = await Promise.allSettled(
    feedFiles.map((feedFile) => loadStaticRssFeed(count, feedFile))
  );

  const merged = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value.articles : []
  );
  const seen = new Set<string>();
  const unique = merged.filter((article) => {
    const key = getArticleKey(article);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const articles = unique.sort(compareArticlesByPublishedAt).slice(0, count);

  return {
    articles,
    featuredSignal:
      articles[0]?.headline ||
      `Phoenix RSS generated ${formatFeedDate(new Date().toISOString())}`,
  };
}
