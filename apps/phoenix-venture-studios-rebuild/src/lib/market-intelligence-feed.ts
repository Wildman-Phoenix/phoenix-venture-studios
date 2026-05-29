import { useCallback, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { loadStaticRssFeed } from "@/lib/static-rss-feed";

export interface Article {
  headline: string;
  source: string;
  date: string;
  summary: string;
  url: string;
  id?: string;
  editorialCategory?: string;
  whyItMatters?: string;
  founderTakeaway?: string;
  imageUrl?: string;
  imageSourceType?: string;
  internalPath?: string;
  originalUrl?: string;
}

interface FounderIntelligenceArticle {
  headline?: string;
  source?: string;
  date?: string;
  summary?: string;
  url?: string;
  internalPath?: string;
  internal_path?: string;
  originalUrl?: string;
  original_url?: string;
  external_url?: string;
  id?: string;
  editorialCategory?: string;
  whyItMatters?: string;
  founderTakeaway?: string;
  imageUrl?: string;
  image_url?: string;
  imageSourceType?: string;
  image_source_type?: string;
  _phoenix?: {
    internalPath?: string;
    originalUrl?: string;
  };
}

const CACHE_KEY = "pvs_intel_feed_v3";
const CACHE_TTL = 1000 * 60 * 30;
const FOUNDER_INTELLIGENCE_TIMEOUT_MS = 3500;

function getCached(): { articles: Article[]; featuredSignal: string; ts: number } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts < CACHE_TTL) return parsed;
  } catch {
    // Ignore malformed local cache and fetch fresh data.
  }
  return null;
}

export function getPrimaryArticleLink(article: Article): string {
  if (article.internalPath) return article.internalPath;
  if (article.url?.startsWith("/")) return article.url;
  if (article.url?.includes("/founder-signal/signals/") || article.url?.includes("/intelligence/")) {
    try {
      return new URL(article.url).pathname;
    } catch {
      return article.url;
    }
  }
  return article.originalUrl || article.url || "/market-intelligence";
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

async function loadFounderIntelligenceFeed() {
  try {
    return await loadStaticRssFeed(10);
  } catch (staticFeedError) {
    if (!isSupabaseConfigured) throw staticFeedError;
  }

  try {
    return await withTimeout(
      supabase.functions.invoke("founder-intelligence").then(({ data, error: fnError }) => {
        if (fnError) throw fnError;
        const raw = (data?.articles || []) as FounderIntelligenceArticle[];
        const articles: Article[] = raw.map((article) => ({
          headline: article.headline || "",
          source: article.source || "",
          date: article.date || "",
          summary: article.summary || "",
          url: article.url || "",
          internalPath: article.internalPath || article.internal_path || article._phoenix?.internalPath,
          originalUrl: article.originalUrl || article.original_url || article.external_url || article._phoenix?.originalUrl,
          id: article.id,
          editorialCategory: article.editorialCategory,
          whyItMatters: article.whyItMatters,
          founderTakeaway: article.founderTakeaway,
          imageUrl: article.imageUrl || article.image_url || undefined,
          imageSourceType: article.imageSourceType || article.image_source_type || undefined,
        })).slice(0, 10);
        return { articles, featuredSignal: data?.featuredSignal || "" };
      }),
      FOUNDER_INTELLIGENCE_TIMEOUT_MS,
      "Founder intelligence timed out",
    );
  } catch {
    return loadStaticRssFeed(10);
  }
}

export function useMarketIntelligence(count = 10) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [featuredSignal, setFeaturedSignal] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchArticles = useCallback(async (force = false) => {
    if (!force) {
      const cached = getCached();
      if (cached) {
        setArticles(cached.articles.slice(0, count));
        setFeaturedSignal(cached.featuredSignal || "");
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(false);
    try {
      const feed = await loadFounderIntelligenceFeed();
      const arts = feed.articles;
      const signal = feed.featuredSignal || "";
      setArticles(arts.slice(0, count));
      setFeaturedSignal(signal);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: arts, featuredSignal: signal, ts: Date.now() }));
    } catch (err) {
      console.error("Feed error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [count]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  return { articles, featuredSignal, loading, error, refresh: () => fetchArticles(true) };
}
