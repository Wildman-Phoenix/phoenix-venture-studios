import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ExternalLink, Newspaper, RefreshCw, Zap, TrendingUp } from "lucide-react";
import PhoenixSignalImage from "@/components/PhoenixSignalImage";
import ScrollReveal from "@/components/ScrollReveal";
import { getPublicSourceName } from "@/lib/editorial-labels";
import { getPrimaryArticleLink, useMarketIntelligence } from "@/lib/market-intelligence-feed";

const CATEGORIES = ["AI shifts", "Capital signals", "Founder strategy", "Market timing"];

const MarketIntelligencePreview = () => {
  const { articles, loading, error, refresh } = useMarketIntelligence(3);

  return (
    <section className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-14">
              <p className="text-primary font-medium text-xs tracking-[0.2em] uppercase mb-4 inline-flex items-center gap-2">
                <Zap className="h-3.5 w-3.5" />
                Current signal proof
              </p>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
                The freshest signals should earn the next click.
              </h2>
              <p className="text-muted-foreground mt-4 max-w-xl mx-auto leading-relaxed">
                A short sample of what Founder Signal is watching right now, with practical context before the full source.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-7">
                {CATEGORIES.map((cat) => (
                  <span
                    key={cat}
                    className="px-4 py-1.5 rounded-full border border-primary/20 text-primary text-xs font-medium bg-primary/5 hover:bg-primary/10 transition-colors cursor-default"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-2xl p-7 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-5" />
                  <div className="h-3 bg-muted rounded w-full mb-2" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <p className="text-muted-foreground mb-4">Unable to load market intelligence right now.</p>
              <Button variant="outline" className="btn-outline-gold" onClick={refresh}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
                {articles.map((article, i) => (
                  <ScrollReveal key={i} delay={i * 0.1}>
                    <div
                      data-rss-article-card
                      className="bg-card border border-border rounded-2xl overflow-hidden h-full flex flex-col hover:shadow-elevated hover:border-primary/15 transition-all duration-300 group"
                    >
                      {article.imageUrl ? (
                        <div className="h-36 overflow-hidden relative">
                          <PhoenixSignalImage src={article.imageUrl} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                        </div>
                      ) : (
                        <div className="h-20 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary flex items-center justify-center">
                          <Newspaper className="h-6 w-6 text-primary/30" />
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-medium text-primary truncate">{getPublicSourceName(article.source)}</span>
                          <span className="text-[10px] text-muted-foreground/60 ml-auto shrink-0">{article.date}</span>
                        </div>
                        <h3 className="text-base font-heading font-semibold text-foreground leading-snug mb-3 line-clamp-2">
                          {article.headline}
                        </h3>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-5 line-clamp-3 flex-1">
                          {article.summary}
                        </p>
                        <Link to={getPrimaryArticleLink(article)} className="mt-auto">
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs text-primary hover:text-accent">
                            Open signal <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </ScrollReveal>
                ))}
              </div>

              <div className="text-center mt-10">
                <Link to="/market-intelligence">
                  <Button variant="outline" className="btn-outline-gold px-8 py-5">
                    View the full archive
                    <TrendingUp className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
};

export default MarketIntelligencePreview;
