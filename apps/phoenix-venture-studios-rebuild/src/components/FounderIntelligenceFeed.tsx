import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ExternalLink, Newspaper, RefreshCw, Zap } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { loadStaticRssFeed } from "@/lib/static-rss-feed";

interface Article {
  headline: string;
  source: string;
  date: string;
  summary: string;
  url: string;
}

const CACHE_KEY = "pvs_intel_feed";
const CACHE_TTL = 1000 * 60 * 30; // 30 min

function getCached(): { articles: Article[]; ts: number } | null {
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

const FounderIntelligenceFeed = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const tickerRef = useRef<HTMLDivElement>(null);

  const fetchArticles = async (force = false) => {
    if (!force) {
      const cached = getCached();
      if (cached) {
        setArticles(cached.articles);
        setLoading(false);
        return;
      }
    }

    setLoading(true);
    setError(false);
    try {
      const arts = isSupabaseConfigured
        ? await supabase.functions.invoke("founder-intelligence").then(({ data, error: fnError }) => {
            if (fnError) throw fnError;
            return (data?.articles || []).slice(0, 5);
          })
        : await loadStaticRssFeed(5).then((feed) => feed.articles);
      setArticles(arts);
      localStorage.setItem(CACHE_KEY, JSON.stringify({ articles: arts, ts: Date.now() }));
    } catch (err) {
      console.error("Feed error:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  return (
    <section className="py-16 md:py-24 bg-background relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-4">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                <Zap className="mr-2 h-4 w-4" />
                Live Market Signals
              </div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                Founder Intelligence Feed
              </h2>
              <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
                Live signals across AI, venture capital, startup funding, and small business financing.
              </p>
            </div>
          </ScrollReveal>

          {/* Ticker */}
          {articles.length > 0 && (
            <div className="relative overflow-hidden mb-10 border-y border-border py-2 hover:[&_.animate-ticker]:pause">
              <div
                ref={tickerRef}
                className="flex gap-12 animate-ticker whitespace-nowrap"
              >
                {[...articles, ...articles].map((a, i) => (
                  <span key={i} className="text-xs text-muted-foreground flex items-center gap-2 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    <span className="font-medium text-foreground">{a.source}</span>
                    {a.headline}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cards */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="card-elevated rounded-xl p-5 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-4" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Unable to load the intelligence feed right now.</p>
              <Button variant="outline" className="btn-outline-gold" onClick={() => fetchArticles(true)}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {articles.map((article, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <div className="card-elevated rounded-xl p-5 h-full flex flex-col">
                    <div className="flex items-center gap-2 mb-3">
                      <Newspaper className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-xs font-medium text-primary truncate">{article.source}</span>
                    </div>
                    <h3 className="text-sm font-heading font-semibold text-foreground leading-snug mb-2 line-clamp-3">
                      {article.headline}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
                      {article.summary}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <span className="text-[10px] text-muted-foreground/60">{article.date}</span>
                      {article.url && article.url.startsWith("http") && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:text-accent transition-colors"
                        >
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            Read Source <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          )}

          {!loading && !error && articles.length > 0 && (
            <div className="text-center mt-6">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-primary"
                onClick={() => fetchArticles(true)}
              >
                <RefreshCw className="mr-1 h-3 w-3" /> Refresh feed
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default FounderIntelligenceFeed;
