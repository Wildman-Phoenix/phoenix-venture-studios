import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ArrowLeft,
  ExternalLink,
  Lightbulb,
  Newspaper,
  Target,
  Zap,
  Eye,
  Share2,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import JsonLdSchema from "@/components/JsonLdSchema";
import { supabase } from "@/integrations/supabase/client";
import { getPublicSourceName, getPublicSignalLabel } from "@/lib/editorial-labels";
import { toast } from "sonner";

const SUPABASE_FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_URL
  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`
  : "";

const CATEGORY_TOOLTIPS: Record<string, string> = {
  "AI Infrastructure Signal": "Developments in AI platforms, computing power, or core technology infrastructure.",
  "Capital Market Signal": "Shifts in how capital moves through markets that affect founder fundraising and business financing.",
  "Venture Funding Signal": "Notable venture capital deals, fund launches, or investor behavior changes.",
  "Business Credit Signal": "Changes in business lending, credit access, or financing products for companies.",
  "Founder Strategy Signal": "Insights founders can use to position, fund, or scale their companies.",
  "Market Risk Signal": "Economic headwinds, policy shifts, or disruptions that could impact business planning.",
  "Growth Capital Signal": "Trends in growth-stage funding, revenue-based financing, or scaling capital.",
  "Regulatory Signal": "Government policy, regulation, or compliance changes affecting businesses.",
};

interface IntelligenceEntryData {
  slug: string;
  headline: string;
  editorial_category: string;
  source: string;
  source_date: string | null;
  summary: string | null;
  why_it_matters: string | null;
  founder_takeaway: string | null;
  source_url: string | null;
  image_url: string | null;
  featured_quote: string | null;
  hook: string | null;
  cta_text: string | null;
  cta_url: string | null;
}

const IntelligenceEntry = () => {
  const { slug } = useParams<{ slug: string }>();
  const [entry, setEntry] = useState<IntelligenceEntryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const fetchEntry = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("public_intelligence_entries" as any)
        .select("slug, headline, editorial_category, source, source_date, summary, why_it_matters, founder_takeaway, source_url, image_url, featured_quote, hook, cta_text, cta_url")
        .eq("slug", slug)
        .maybeSingle();

      if (error || !data) {
        setNotFound(true);
      } else {
        setEntry(data as unknown as IntelligenceEntryData);
      }
      setLoading(false);
    };

    fetchEntry();
  }, [slug]);

  // Dynamically inject Open Graph + Twitter Card meta tags so
  // shared links (Facebook, LinkedIn, X, Slack, iMessage) always show
  // the generated preview image and proper headline/description.
  useEffect(() => {
    if (!entry) return;

    const canonical = `https://phoenixventurestudios.com/intelligence/${entry.slug}`;
    const description =
      entry.summary ||
      entry.hook ||
      entry.why_it_matters ||
      "Founder intelligence and capital signals from Phoenix Venture Studios.";
    const image =
      entry.image_url ||
      "https://phoenixventurestudios.com/images/signal-default.jpg";

    const setMeta = (selector: string, attr: string, key: string, value: string) => {
      let el = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    document.title = `${entry.headline} | Phoenix Venture Studios`;

    setMeta('meta[name="description"]', "name", "description", description);

    setMeta('meta[property="og:type"]', "property", "og:type", "article");
    setMeta('meta[property="og:title"]', "property", "og:title", entry.headline);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:url"]', "property", "og:url", canonical);
    setMeta('meta[property="og:image"]', "property", "og:image", image);
    setMeta('meta[property="og:image:secure_url"]', "property", "og:image:secure_url", image);
    setMeta('meta[property="og:image:width"]', "property", "og:image:width", "1200");
    setMeta('meta[property="og:image:height"]', "property", "og:image:height", "630");
    setMeta('meta[property="og:image:alt"]', "property", "og:image:alt", entry.headline);
    setMeta('meta[property="og:site_name"]', "property", "og:site_name", "Phoenix Perspective");

    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", entry.headline);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    setMeta('meta[name="twitter:image"]', "name", "twitter:image", image);
    setMeta('meta[name="twitter:image:alt"]', "name", "twitter:image:alt", entry.headline);

    let canonicalEl = document.head.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.setAttribute("href", canonical);
  }, [entry]);

  if (loading) {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <div className="animate-pulse space-y-6 py-20">
            <div className="h-6 bg-muted rounded w-1/4" />
            <div className="h-10 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (notFound || !entry) {
    return <Navigate to="/market-intelligence" replace />;
  }

  const isEditorial = entry.source === "Phoenix Editorial";
  const publicSource = getPublicSourceName(entry.source);
  const publicCategory = isEditorial ? getPublicSignalLabel(entry.editorial_category) : entry.editorial_category;
  const categoryTooltip = CATEGORY_TOOLTIPS[entry.editorial_category] || null;

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: entry.headline,
    description: entry.summary,
    image: entry.image_url,
    publisher: {
      "@type": "Organization",
      name: "Phoenix Venture Studios",
    },
    datePublished: entry.source_date,
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen pt-24 pb-16">
        <JsonLdSchema schema={schema} />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
          <ScrollReveal>
            <Link
              to="/market-intelligence"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Market Intelligence
            </Link>

            <div className="mb-4">
              {entry.image_url && (
                <div className="relative rounded-xl overflow-hidden mb-6">
                  <img
                    src={entry.image_url}
                    alt=""
                    className="w-full max-h-[360px] object-cover"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/40 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
                </div>
              )}

              {categoryTooltip ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                     <Badge variant="outline" className="text-xs border-primary/30 text-primary font-semibold gap-1 cursor-help">
                        <Zap className="h-3 w-3" />
                        {publicCategory}
                      </Badge>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-sm">
                    {categoryTooltip}
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Badge variant="outline" className="text-xs border-primary/30 text-primary font-semibold gap-1">
                  <Zap className="h-3 w-3" />
                  {publicCategory}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl lg:text-4xl font-heading font-bold text-foreground leading-tight mb-4">
              {entry.headline}
            </h1>

            <div className="flex items-center gap-3 mb-8 text-sm">
              <span className="font-semibold text-primary">{publicSource}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <span className="text-muted-foreground/60">{entry.source_date}</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
	              <button
	                type="button"
	                onClick={async () => {
	                  const shareUrl = SUPABASE_FUNCTIONS_URL
	                    ? `${SUPABASE_FUNCTIONS_URL}/og-share?slug=${entry.slug}`
	                    : window.location.href;
	                  try {
                    await navigator.clipboard.writeText(shareUrl);
                    toast.success("Share link copied", {
                      description: "Paste it into Facebook, LinkedIn, X, or Slack for a rich preview.",
                    });
                  } catch {
                    toast.error("Couldn't copy link", {
                      description: "Try copying it manually from the address bar.",
                    });
                  }
                }}
                className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium"
                aria-label="Copy social share link"
              >
                <Share2 className="h-3.5 w-3.5" />
                Share
              </button>
            </div>

            {isEditorial ? (
              <EditorialProseLayout entry={entry} />
            ) : (
              <StandardCardLayout entry={entry} />
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 py-6 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Originally reported by <span className="font-semibold text-foreground">{publicSource}</span>
              </p>
              {entry.source_url && entry.source_url.startsWith("http") && (
                <a href={entry.source_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="btn-outline-gold">
                    Read Original Source <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>

            <div className="text-center mt-12 py-10 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">
                Explore more founder intelligence and capital signals.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Link to="/market-intelligence">
                  <Button variant="outline" className="btn-outline-gold">
                    All Market Intelligence
                  </Button>
                </Link>
                <Link to="/snapshot">
                  <Button className="bg-primary text-primary-foreground hover:bg-accent">
                    Generate Venture Snapshot
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </TooltipProvider>
  );
};

// ─── Editorial prose layout (Phoenix Editorial posts) ────────────────
function EditorialProseLayout({ entry }: { entry: IntelligenceEntryData }) {
  const ctaUrl = "/founder-signal";
  const ctaText = "Read more Founder Signal";
  const isExternal = false;

  return (
    <div className="space-y-6 mb-8">
      {/* Lead / Hook */}
      {entry.hook && (
        <p className="text-lg md:text-xl leading-relaxed text-foreground/90 font-medium">
          {entry.hook}
        </p>
      )}

      {/* Signal explanation */}
      {entry.summary && (
        <p className="text-base leading-relaxed text-muted-foreground">
          {entry.summary}
        </p>
      )}

      {/* Founder implication — subtle left accent */}
      {entry.why_it_matters && (
        <div className="border-l-[3px] border-primary/40 pl-5 py-1">
          <p className="text-base leading-relaxed text-muted-foreground">
            {entry.why_it_matters}
          </p>
        </div>
      )}

      {/* Next move + inline CTA */}
      {entry.founder_takeaway && (
        <div className="pt-2">
          <p className="text-base leading-relaxed text-foreground/80">
            {entry.founder_takeaway}
          </p>
          <div className="mt-4">
            {isExternal ? (
              <a
                href={ctaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-accent font-semibold transition-colors text-base"
              >
                {ctaText} →
              </a>
            ) : (
              <Link
                to={ctaUrl}
                className="inline-flex items-center gap-2 text-primary hover:text-accent font-semibold transition-colors text-base"
              >
                {ctaText} →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Watch Next (featured_quote) */}
      {entry.featured_quote && (
        <div className="border-l-[3px] border-muted-foreground/20 pl-5 py-1 mt-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">Watch Next</p>
          <p className="text-base leading-relaxed text-muted-foreground">{entry.featured_quote}</p>
        </div>
      )}
    </div>
  );
}

// ─── Standard card layout (non-editorial / news signal posts) ────────
function StandardCardLayout({ entry }: { entry: IntelligenceEntryData }) {
  return (
    <>
      {entry.summary && (
        <div className="card-elevated rounded-xl p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <Newspaper className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-2">What Happened</h2>
              <p className="text-muted-foreground leading-relaxed">{entry.summary}</p>
            </div>
          </div>
        </div>
      )}

      {entry.why_it_matters && (
        <div className="card-elevated rounded-xl p-6 mb-6 border-l-4 border-primary/40">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider mb-2">Why It Matters</h2>
              <p className="text-muted-foreground leading-relaxed">{entry.why_it_matters}</p>
            </div>
          </div>
        </div>
      )}

      {entry.founder_takeaway && (
        <div className="card-elevated rounded-xl p-6 mb-6 border-l-4 border-accent/40">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-accent uppercase tracking-wider mb-2">Founder Takeaway</h2>
              <p className="text-muted-foreground leading-relaxed">{entry.founder_takeaway}</p>
            </div>
          </div>
        </div>
      )}

      {entry.featured_quote && (
        <div className="card-elevated rounded-xl p-6 mb-8 border-l-4 border-muted-foreground/20">
          <div className="flex items-start gap-3">
            <Eye className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Watch Next</h2>
              <p className="text-muted-foreground leading-relaxed">{entry.featured_quote}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default IntelligenceEntry;
