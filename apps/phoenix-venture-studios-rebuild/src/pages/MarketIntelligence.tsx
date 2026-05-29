import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ExternalLink,
  Newspaper,
  RefreshCw,
  Zap,
  Rss,
  TrendingUp,
  Lightbulb,
  BarChart3,
  Target,
  Cpu,
  DollarSign,
  Building2,
  FileText,
  ArrowRight,
  Activity,
  Radio,
  Quote,
  Sparkles,
  Eye,
  Filter,
  Clock,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import NewsletterSignup from "@/components/NewsletterSignup";
import PhoenixSignalImage from "@/components/PhoenixSignalImage";

import { getPrimaryArticleLink, useMarketIntelligence, type Article } from "@/lib/market-intelligence-feed";
import { supabase } from "@/integrations/supabase/client";
import { getPublicSourceName, getPublicSignalLabel } from "@/lib/editorial-labels";

// ── Phoenix Editorial hook ──
interface EditorialPost {
  id: string;
  slug: string;
  headline: string;
  summary: string | null;
  hook: string | null;
  founder_takeaway: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string | null;
  editorial_category: string;
  content_type: string | null;
  created_at: string;
}

function usePhoenixEditorial(limit = 3) {
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("public_intelligence_entries" as any)
          .select("id, slug, headline, summary, founder_takeaway, cta_text, cta_url, image_url, editorial_category, content_type, created_at")
          .eq("source", "Phoenix Editorial")
          .order("created_at", { ascending: false })
          .limit(limit);
        setPosts((data as unknown as EditorialPost[]) || []);
      } catch (err) {
        console.error("Editorial fetch error:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [limit]);

  return { posts, loading };
}

import intelHero from "@/assets/phoenix-operator-workspace-gpt.jpg";
import imgTrack from "@/assets/phoenix-strategy-room-gpt.jpg";
import imgFilter from "@/assets/phoenix-operator-workspace-gpt.jpg";
import imgAction from "@/assets/phoenix-capital-readiness-gpt.jpg";
import imgTiming from "@/assets/traverse-city-authority-gpt.jpg";
import intelTrustBg from "@/assets/phoenix-strategy-room-gpt.jpg";
import intelCtaBg from "@/assets/phoenix-capital-readiness-gpt.jpg";
import intelSignalBg from "@/assets/phoenix-operator-workspace-gpt.jpg";

// ── Helpers ──
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

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

const TAG_KEYWORDS: Record<string, string[]> = {
  AI: ["ai", "artificial intelligence", "machine learning", "llm", "gpt", "generative"],
  "Venture Capital": ["venture capital", "vc", "series a", "series b", "series c", "seed round"],
  "Startup Funding": ["startup", "funding round", "raise", "pre-seed", "fundrais"],
  "Small Business": ["small business", "service business", "operator", "restaurant", "cleaning", "agency"],
  Factoring: ["invoice", "factoring", "accounts receivable"],
  "Business Credit": ["business credit", "credit line", "sba", "lending", "loan"],
  "Market Trend": ["trend", "market", "economy", "growth", "outlook", "forecast"],
  "Business Financing": ["business financing", "working capital", "alternative funding"],
};

const BADGE_RULES: { label: string; keywords: string[]; icon: typeof Zap }[] = [
  { label: "High Founder Impact", keywords: ["founder", "startup", "entrepreneur", "raise", "funding round"], icon: Target },
  { label: "Capital Trend", keywords: ["capital", "funding", "invest", "credit", "financing", "loan"], icon: DollarSign },
  { label: "Market Signal", keywords: ["trend", "market", "economy", "outlook", "forecast", "growth"], icon: BarChart3 },
  { label: "Industry Development", keywords: ["ai", "technology", "platform", "infrastructure", "regulation"], icon: Building2 },
];

function getTags(article: Article): string[] {
  const text = `${article.headline} ${article.summary}`.toLowerCase();
  return Object.entries(TAG_KEYWORDS)
    .filter(([, kws]) => kws.some((kw) => text.includes(kw)))
    .map(([tag]) => tag)
    .slice(0, 3);
}

function getBadge(article: Article) {
  const text = `${article.headline} ${article.summary}`.toLowerCase();
  for (const rule of BADGE_RULES) {
    if (rule.keywords.some((kw) => text.includes(kw))) return rule;
  }
  return BADGE_RULES[3];
}

function deriveFeaturedSignal(articles: Article[], apiSignal: string): { quote: string; source: string; takeaway: string } {
  const fallback = {
    quote: "AI infrastructure spending is concentrating around fewer, bigger players — creating new gaps for vertical founders.",
    source: "Market Signal Analysis",
    takeaway: "Founders building workflow tooling, vertical AI, or capital-efficient infrastructure may benefit from this concentration.",
  };
  if (!articles.length) return fallback;
  const featured = articles[0];
  if (featured) {
    return {
      quote: apiSignal || featured.headline,
      source: featured.source || "Market Signal",
      takeaway: featured.summary
        ? featured.summary.length > 160
          ? featured.summary.slice(0, 157) + "..."
          : featured.summary
        : fallback.takeaway,
    };
  }
  return fallback;
}

function deriveFounderSignals(articles: Article[]): string[] {
  if (!articles.length) return [
    "Capital is rewarding focus over hype",
    "Service businesses are using structured capital more strategically",
    "Investors are favoring execution over experimentation",
    "AI venture funding remains strong but increasingly concentrated",
  ];
  const allText = articles.map((a) => `${a.headline}. ${a.summary}`).join(" ").toLowerCase();
  const signals: string[] = [];
  if (allText.includes("ai") || allText.includes("artificial intelligence"))
    signals.push("Capital is concentrating around vertical AI and infrastructure plays");
  if (allText.includes("profitab") || allText.includes("revenue") || allText.includes("bootstrap"))
    signals.push("Investors are favoring execution and profitability over experimentation");
  if (allText.includes("working capital") || allText.includes("invoice") || allText.includes("factoring"))
    signals.push("Working capital and invoice financing demand is rising among B2B companies");
  if (allText.includes("credit") || allText.includes("lending") || allText.includes("sba"))
    signals.push("Business credit programs are expanding access for founders and operators");
  if (allText.includes("growth") || allText.includes("scale") || allText.includes("expansion"))
    signals.push("Service businesses are using structured capital more strategically");
  if (allText.includes("small business") || allText.includes("service") || allText.includes("operator"))
    signals.push("Small business owners are exploring funding pathways beyond traditional banks");
  if (allText.includes("market") || allText.includes("economy"))
    signals.push("Capital is rewarding focus over hype across all sectors");
  if (signals.length < 3) {
    signals.push("Capital is rewarding focus over hype");
    signals.push("Investors are favoring execution over experimentation");
  }
  return signals.slice(0, 4);
}

function deriveWeeklySummary(articles: Article[]): { title: string; points: string[] } {
  if (!articles.length) return {
    title: "Weekly Venture & Business Brief",
    points: [
      "AI infrastructure and vertical applications attract outsized capital allocation",
      "Alternative financing — business credit and invoice factoring — gaining traction",
      "Founders combining strategic capital planning with rapid execution are winning",
    ],
  };
  const points: string[] = [];
  const allText = articles.map((a) => a.headline).join(" ").toLowerCase();
  if (allText.includes("ai") || allText.includes("artificial intelligence"))
    points.push("AI infrastructure and vertical applications continue attracting outsized capital");
  if (allText.includes("vc") || allText.includes("venture"))
    points.push("VC deployment shifting toward companies with clearer unit economics");
  if (allText.includes("fund") || allText.includes("financ"))
    points.push("Alternative financing pathways gaining traction among scaling founders");
  if (allText.includes("market") || allText.includes("trend"))
    points.push("Market dynamics favor strategic capital planning with rapid execution");
  if (points.length < 3)
    points.push("Diversified capital strategies position founders better in the current market");
  return { title: "Weekly Venture & Business Brief", points: points.slice(0, 3) };
}

function deriveWhyItMatters(article: Article): string {
  const text = `${article.headline} ${article.summary}`.toLowerCase();
  if (text.includes("ai") && (text.includes("fund") || text.includes("capital")))
    return "AI-focused capital flows create both opportunity and competitive pressure for founders building in this space.";
  if (text.includes("small business") || text.includes("service"))
    return "Service-based founders should evaluate whether structured capital could accelerate their growth trajectory.";
  if (text.includes("venture") || text.includes("startup"))
    return "Founders should factor this into their capital strategy and investor conversations.";
  if (text.includes("credit") || text.includes("lending"))
    return "Business credit conditions directly impact how founders and operators access working capital.";
  if (text.includes("market") || text.includes("trend"))
    return "Market shifts like these can reshape competitive positioning for founders across industries.";
  return "This signal may influence capital availability, market positioning, or strategic timing for founders.";
}

/* ── Why-this-matters card data ── */
const WHY_CARDS = [
  {
    icon: Eye,
    title: "Track what matters",
    desc: "Surface the signals that actually affect your decisions — not just headlines.",
    img: imgTrack,
  },
  {
    icon: Filter,
    title: "Filter noise from signal",
    desc: "Every entry is reframed through a founder lens so you can skip the clutter.",
    img: imgFilter,
  },
  {
    icon: ArrowRight,
    title: "Translate trends into action",
    desc: "Each signal connects to real capital, growth, and positioning implications.",
    img: imgAction,
  },
  {
    icon: Clock,
    title: "Stay ahead of timing shifts",
    desc: "Spot changes in market conditions before they reshape your competitive window.",
    img: imgTiming,
  },
];

const MarketIntelligence = () => {
  const { articles, featuredSignal, loading, error, refresh } = useMarketIntelligence(10);
  const { posts: editorialPosts, loading: editorialLoading } = usePhoenixEditorial(3);

  const featured = useMemo(() => deriveFeaturedSignal(articles, featuredSignal), [articles, featuredSignal]);
  const founderSignals = useMemo(() => deriveFounderSignals(articles), [articles]);
  const weekly = useMemo(() => deriveWeeklySummary(articles), [articles]);

  return (
    <TooltipProvider>
    <div className="min-h-screen pt-24">

      {/* ═══ SECTION 1 — CINEMATIC HERO ═══ */}
      <section className="relative py-14 md:py-24 overflow-hidden">
        {/* Background image + overlays */}
        <div className="absolute inset-0">
          <img src={intelHero} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/20 to-foreground/35" />
          <div className="absolute inset-0 opacity-[0.08]" style={{
            backgroundImage: `radial-gradient(circle at 25% 60%, hsl(var(--primary)), transparent 45%), radial-gradient(circle at 75% 40%, hsl(var(--accent)), transparent 45%)`,
          }} />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-medium mb-5 backdrop-blur-sm border border-primary/10">
              <Activity className="mr-2 h-3.5 w-3.5" />
              Signal archive
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-background leading-tight">
              Browse the Phoenix signal archive
            </h1>
            <p className="mt-5 text-base md:text-lg text-background/70 max-w-xl mx-auto leading-relaxed">
              A current library of selected stories across AI, startup funding, venture capital, business financing, and growth strategy, reframed for founders and operators.
            </p>
            <p className="mt-2 text-[11px] text-background/40 font-medium tracking-wider uppercase">
              Actionable signal tracking for founders, operators, and growth-minded business owners
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-7">
              <Link to="/founder-signal">
                <Button size="lg" className="btn-primary px-8 py-5 text-sm">
                  Subscribe to Founder Signal
                  <Zap className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="border-background/35 bg-background/10 text-background hover:bg-background/16 px-8 py-5 text-sm backdrop-blur-sm"
                onClick={() => document.getElementById("intel-feed")?.scrollIntoView({ behavior: "smooth", block: "start" })}
              >
                Browse the archive
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SIGNAL STRIP ═══ */}
      {articles.length > 0 && (
        <section className="hidden border-y border-[#e5d6bf] bg-[#fbf5eb]/90 py-3 md:block">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 overflow-hidden">
              <div className="shrink-0 rounded-full border border-[#e5d6bf] bg-white/75 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#b16012] shadow-sm">
                Current signals
              </div>
              <div className="grid min-w-0 flex-1 grid-cols-3 gap-3">
                {articles.slice(0, 3).map((article) => (
                  <Link
                    key={article.id || article.url || article.headline}
                    to={getPrimaryArticleLink(article)}
                    className="group flex min-w-0 items-center rounded-full border border-[#e8dcc9] bg-white/70 px-3 py-1.5 text-xs text-[#58728b] shadow-sm transition hover:border-[#f36c21]/35 hover:bg-white"
                  >
                    <span className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f36c21]" />
                    <span className="shrink-0 font-semibold text-[#123c69]">{getPublicSourceName(article.source)}</span>
                    <span className="mx-2 shrink-0 text-[#c8ae8b]">/</span>
                    <span className="min-w-0 truncate text-[#123c69]/80">{article.headline}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 2 — WHY THIS MATTERS ═══ */}
      <section className="py-12 md:py-16 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-8">
                <p className="text-primary font-medium text-xs tracking-[0.2em] uppercase mb-2">Why This Matters</p>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                  Intelligence designed for how founders actually think
                </h2>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {WHY_CARDS.map((card, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <div className="group card-elevated rounded-xl overflow-hidden h-full flex flex-col hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-300">
                    <div className="h-32 overflow-hidden relative">
                      <img src={card.img} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                      <div className="absolute bottom-2.5 left-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/10">
                          <card.icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <h3 className="text-sm font-heading font-semibold text-foreground mb-1">{card.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3 — FEATURED SIGNAL ═══ */}
      <section className="py-8 md:py-12 relative overflow-hidden">
        <img
          src={intelSignalBg}
          alt=""
          aria-hidden="true"
          loading="lazy"
          width={1920}
          height={800}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-foreground/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/20 via-transparent to-foreground/30" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-4">
                <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-primary/20 text-primary text-[11px] font-semibold uppercase tracking-wider backdrop-blur-sm border border-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.15)]">
                  <Lightbulb className="mr-1.5 h-3 w-3" />
                  Phoenix-selected signal
                </div>
              </div>

              <div className="rounded-xl p-5 md:p-7 bg-background/8 border border-background/12 backdrop-blur-md shadow-[0_8px_32px_-8px_hsl(var(--primary)/0.12)]">
                <blockquote className="text-center mb-4">
                  <Quote className="h-5 w-5 text-primary/50 mx-auto mb-2.5" />
                  <p className="text-lg md:text-xl lg:text-2xl text-background/90 leading-relaxed font-heading italic">
                    "{featured.quote}"
                  </p>
                </blockquote>
                <p className="text-center text-xs text-background/50 font-medium mb-3">
                  — {featured.source}
                </p>
                <div className="mx-auto max-w-lg pl-3 border-l-[3px] border-primary/40 py-2">
                  <p className="text-sm text-background/70 leading-relaxed">
                    <span className="text-primary font-semibold text-xs uppercase tracking-wide">Founder Takeaway</span>
                    <br className="mb-0.5" />
                    {featured.takeaway}
                  </p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4 — SIGNAL MAP ═══ */}
      <section className="py-4 md:py-6 border-b border-border/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary">What We Track</span>
              <div className="flex-1 h-px bg-border/60" />
            </div>
            <div className="grid grid-cols-3 gap-2 md:gap-3">
              {[
                {
                  icon: BarChart3,
                  title: "Weekly Venture Brief",
                  desc: "Capital deployment, deal flow, and market momentum.",
                  accentColor: "hsl(var(--primary))",
                  accentBg: "hsl(var(--primary) / 0.1)",
                  accentBgHover: "hsl(var(--primary) / 0.15)",
                },
                {
                  icon: Target,
                  title: "Founder Watch",
                  desc: "Patterns and shifts that affect how founders raise and grow.",
                  accentColor: "hsl(var(--accent))",
                  accentBg: "hsl(var(--accent) / 0.1)",
                  accentBgHover: "hsl(var(--accent) / 0.15)",
                },
                {
                  icon: DollarSign,
                  title: "Funding Climate",
                  desc: "Credit conditions, lending trends, and financing access.",
                  accentColor: "hsl(var(--primary))",
                  accentBg: "hsl(var(--primary) / 0.1)",
                  accentBgHover: "hsl(var(--primary) / 0.15)",
                },
              ].map((cat, i) => (
                <div
                  key={i}
                  className="relative rounded-lg border border-border/80 bg-card p-3 md:p-4 hover:shadow-card hover:border-primary/20 transition-all duration-300 group"
                >
                  <div className="absolute top-0 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-primary/60 to-accent/40" />
                  <div
                    className="w-7 h-7 md:w-8 md:h-8 rounded-md flex items-center justify-center mb-2 transition-colors"
                    style={{ backgroundColor: cat.accentBg }}
                  >
                    <cat.icon className="h-3.5 w-3.5 md:h-4 md:w-4" style={{ color: cat.accentColor }} />
                  </div>
                  <h3 className="text-xs md:text-sm font-heading font-bold text-foreground leading-tight mb-1">
                    {cat.title}
                  </h3>
                  <p className="text-[11px] md:text-xs text-muted-foreground leading-snug">
                    {cat.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PHOENIX PERSPECTIVE — EDITORIAL LANE ═══ */}
      {!editorialLoading && editorialPosts.length > 0 && (
        <section className="py-8 md:py-12 bg-background border-b border-border/40">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <ScrollReveal>
                <div className="flex items-center gap-2.5 mb-5">
                  <div className="w-7 h-7 rounded-md bg-primary/15 flex items-center justify-center">
                    <FileText className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-sm font-heading font-bold text-foreground leading-none">Phoenix Perspective</h2>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Strategic editorial from Phoenix Venture Studios</p>
                  </div>
                  <div className="flex-1 h-px bg-border/60 ml-2" />
                </div>
              </ScrollReveal>

              <div className={`grid gap-4 ${editorialPosts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} ${editorialPosts.length >= 3 ? 'lg:grid-cols-3' : ''}`}>
                {editorialPosts.map((post, i) => (
                  <ScrollReveal key={post.id} delay={i * 0.08}>
                    <Link
                      to={`/intelligence/${post.slug}`}
                      className="group relative card-elevated rounded-xl overflow-hidden flex flex-col h-full hover:-translate-y-0.5 hover:shadow-elevated transition-all duration-300 border border-primary/8"
                    >
                      {/* Branded top-border gradient accent */}
                      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary via-accent to-phoenix-orange z-10 rounded-t-xl" />
                      {post.image_url ? (
                        <div className="relative h-36 overflow-hidden">
                          <PhoenixSignalImage
                            src={post.image_url}
                            alt={`Phoenix Perspective image for ${post.headline}`}
                            fallbackSrc={intelSignalBg}
                            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                          <div className="absolute top-3 left-3">
                            <Badge variant="outline" className="text-[10px] bg-card/85 backdrop-blur-sm border-primary/25 text-primary font-semibold gap-1">
                              <Zap className="h-2.5 w-2.5" />
                              {getPublicSignalLabel(post.editorial_category)}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="h-20 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/30 flex items-center justify-center relative">
                          <FileText className="h-6 w-6 text-primary/20" />
                          <div className="absolute top-3 left-3">
                            <Badge variant="outline" className="text-[10px] bg-card/85 backdrop-blur-sm border-primary/25 text-primary font-semibold gap-1">
                              <Zap className="h-2.5 w-2.5" />
                              {getPublicSignalLabel(post.editorial_category)}
                            </Badge>
                          </div>
                        </div>
                      )}
                      <div className="p-4 flex-1 flex flex-col">
                        <h3 className="text-sm font-heading font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
                          {post.headline}
                        </h3>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
                          {post.hook || post.summary}
                        </p>
                        {post.founder_takeaway && (
                          <div className="border-l-2 border-primary/30 pl-2.5 mb-3">
                            <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">
                              <span className="text-primary font-semibold text-[10px] uppercase tracking-wide">Takeaway: </span>
                              {post.founder_takeaway}
                            </p>
                          </div>
                        )}
                        <div className="mt-auto pt-1">
                          <span className="text-[11px] font-semibold text-primary inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
                            Read the Phoenix perspective <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 5 — ARTICLE FEED ═══ */}
      <section id="intel-feed" className="scroll-mt-24 py-12 md:py-16 bg-secondary/20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `radial-gradient(circle, hsl(var(--foreground)) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div>
                <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground">
                  Latest Intelligence
                </h2>
                <p className="text-sm text-muted-foreground/70 mt-1 italic">
                  Filtered through a founder lens — signal over noise.
                </p>
              </div>
              {!loading && !error && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-primary self-start"
                  onClick={refresh}
                >
                  <RefreshCw className="mr-1 h-3 w-3" /> Refresh
                </Button>
              )}
            </div>

            {loading ? (
              <div className="space-y-5 mt-8">
                {/* Hero skeleton */}
                <div className="card-elevated rounded-xl overflow-hidden animate-pulse">
                  <div className="h-56 md:h-72 bg-muted" />
                  <div className="p-6">
                    <div className="h-6 bg-muted rounded w-3/4 mb-3" />
                    <div className="h-3 bg-muted rounded w-1/3 mb-4" />
                    <div className="h-3 bg-muted rounded w-full mb-2" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </div>
                </div>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="card-elevated rounded-xl overflow-hidden animate-pulse flex flex-col md:flex-row">
                    <div className="h-40 md:h-auto md:w-48 bg-muted shrink-0" />
                    <div className="p-5 flex-1">
                      <div className="h-5 bg-muted rounded w-3/4 mb-3" />
                      <div className="h-3 bg-muted rounded w-1/3 mb-4" />
                      <div className="h-3 bg-muted rounded w-full mb-2" />
                      <div className="h-3 bg-muted rounded w-2/3" />
                    </div>
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
              <div className="space-y-5 mt-8">
                {articles.map((article, i) => {
                  const tags = getTags(article);
                  const badge = getBadge(article);
                  const BadgeIcon = badge.icon;
                  const whyItMatters = deriveWhyItMatters(article);
                  const isHero = i === 0;

                  {/* Separator dots every 3rd card */}
                  const showSeparator = i > 0 && i % 3 === 0;

                  return (
                    <ScrollReveal key={i} delay={i * 0.04}>
                      {showSeparator && (
                        <div className="flex items-center justify-center gap-2 py-4 mb-5">
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                          <span className="w-1 h-1 rounded-full bg-muted-foreground/20" />
                        </div>
                      )}

                      {isHero ? (
                        /* ── HERO CARD (first article) ── */
                        <div className="card-elevated rounded-xl overflow-hidden hover:-translate-y-0.5 transition-all duration-200 group">
                          {article.imageUrl ? (
                            <div className="relative h-56 md:h-72 overflow-hidden">
                              <PhoenixSignalImage
                                src={article.imageUrl}
                                alt={`Market intelligence image for ${article.headline}`}
                                fallbackSrc={intelSignalBg}
                                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
                              <div className="absolute top-4 left-4">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Badge variant="outline" className="text-[10px] bg-card/80 backdrop-blur-sm border-primary/30 text-primary gap-1 font-semibold cursor-help">
                                        <BadgeIcon className="h-3 w-3" />
                                        {(article as any).editorialCategory || badge.label}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="bottom" className="max-w-xs text-sm">
                                    {CATEGORY_TOOLTIPS[(article as any).editorialCategory] || "Market signal for founders and operators."}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          ) : (
                            <div className="h-40 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary flex items-center justify-center relative">
                              <Newspaper className="h-10 w-10 text-primary/20" />
                              <div className="absolute top-4 left-4">
                                <Badge variant="outline" className="text-[10px] bg-card/80 backdrop-blur-sm border-primary/30 text-primary gap-1 font-semibold">
                                  <BadgeIcon className="h-3 w-3" />
                                  {(article as any).editorialCategory || badge.label}
                                </Badge>
                              </div>
                            </div>
                          )}
                          <div className="p-6">
                            <Link to={`/intelligence/${slugify(article.headline)}`}>
                              <h3 className="text-lg md:text-xl font-heading font-bold text-foreground leading-snug mb-2 hover:text-primary transition-colors">
                                {article.headline}
                              </h3>
                            </Link>
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-xs font-semibold text-primary">{getPublicSourceName(article.source)}</span>
                              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                              <span className="text-[11px] text-muted-foreground/60">{article.date}</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                              {article.summary}
                            </p>
                            <div className="bg-secondary/60 rounded-lg p-3.5 mb-4 border-l-[3px] border-primary/40">
                              <p className="text-sm leading-relaxed">
                                <span className="font-semibold text-primary text-xs uppercase tracking-wider">Why it matters: </span>
                                <span className="text-muted-foreground">{(article as any).whyItMatters || whyItMatters}</span>
                              </p>
                            </div>
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              {tags.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] font-medium px-2.5 py-0.5">{tag}</Badge>
                                  ))}
                                </div>
                              )}
                              <Link to={`/intelligence/${slugify(article.headline)}`} className="shrink-0">
                                <Button variant="outline" size="sm" className="text-xs btn-outline-gold">
                                  Read Intelligence <ExternalLink className="ml-1 h-3 w-3" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* ── STANDARD CARD (horizontal on desktop) ── */
                        <div className="card-elevated rounded-xl overflow-hidden hover:-translate-y-0.5 transition-all duration-200 group flex flex-col md:flex-row">
                          {article.imageUrl ? (
                            <div className="relative h-44 md:h-auto md:w-72 shrink-0 overflow-hidden">
                              <PhoenixSignalImage
                                src={article.imageUrl}
                                alt={`Market intelligence image for ${article.headline}`}
                                fallbackSrc={intelSignalBg}
                                className="w-full h-full object-contain bg-[#0b2a49] group-hover:scale-[1.02] transition-transform duration-500"
                                loading="lazy"
                              />
                              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-card/20 hidden md:block" />
                              <div className="absolute inset-0 bg-gradient-to-t from-card/30 to-transparent md:hidden" />
                            </div>
                          ) : (
                            <div className="hidden md:flex md:w-48 shrink-0 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary items-center justify-center">
                              <Newspaper className="h-8 w-8 text-primary/20" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="h-1 bg-gradient-to-r from-primary/40 via-accent/30 to-primary/40 md:hidden" />
                            <div className="p-5">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div>
                                      <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1 font-semibold cursor-help">
                                        <BadgeIcon className="h-3 w-3" />
                                        {(article as any).editorialCategory || badge.label}
                                      </Badge>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-sm">
                                    {CATEGORY_TOOLTIPS[(article as any).editorialCategory] || "Market signal for founders and operators."}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <Link to={`/intelligence/${slugify(article.headline)}`}>
                                <h3 className="text-base font-heading font-semibold text-foreground leading-snug mb-2 hover:text-primary transition-colors">
                                  {article.headline}
                                </h3>
                              </Link>
                              <div className="flex items-center gap-3 mb-3">
                                <span className="text-xs font-semibold text-primary">{getPublicSourceName(article.source)}</span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                                <span className="text-[11px] text-muted-foreground/60">{article.date}</span>
                              </div>
                              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                                {article.summary}
                              </p>
                              <div className="bg-secondary/60 rounded-lg p-3 mb-3 border-l-[3px] border-primary/40">
                                <p className="text-sm leading-relaxed">
                                  <span className="font-semibold text-primary text-xs uppercase tracking-wider">Why it matters: </span>
                                  <span className="text-muted-foreground">{(article as any).whyItMatters || whyItMatters}</span>
                                </p>
                              </div>
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                {tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5">
                                    {tags.map((tag) => (
                                      <Badge key={tag} variant="secondary" className="text-[10px] font-medium px-2.5 py-0.5">{tag}</Badge>
                                    ))}
                                  </div>
                                )}
                                <Link to={`/intelligence/${slugify(article.headline)}`} className="shrink-0">
                                  <Button variant="outline" size="sm" className="text-xs btn-outline-gold">
                                    Read Intelligence <ExternalLink className="ml-1 h-3 w-3" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </ScrollReveal>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6 — MID-PAGE TRUST / POSITIONING ═══ */}
      <section className="py-10 md:py-14 relative overflow-hidden">
        {/* Editorial background image */}
        <div className="absolute inset-0">
          <img src={intelTrustBg} alt="" className="w-full h-full object-cover" loading="lazy" width={1920} height={800} />
          <div className="absolute inset-0 bg-background/88" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/85 to-background/95" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-xl mx-auto text-center">
            <ScrollReveal>
              <Sparkles className="h-6 w-6 text-primary mx-auto mb-4" />
              <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground mb-3">
                Intelligence matters most when it leads to better decisions.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                Founders don't just need more updates — they need context. This platform helps connect market signals to capital strategy, growth positioning, and next-step clarity.
              </p>
              <Link to="/founder-signal">
                <Button size="lg" className="btn-primary px-8 py-5 text-sm shadow-elevated">
                  Read Founder Signal First
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7 — SUBSCRIBE / INTELLIGENCE BRIEFING ═══ */}
      <section className="py-14 md:py-20 relative overflow-hidden">
        {/* Cinematic financial district background */}
        <div className="absolute inset-0">
          <img src={intelCtaBg} alt="" className="w-full h-full object-cover" loading="lazy" width={1920} height={800} />
          <div className="absolute inset-0 bg-foreground/75" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/60 to-foreground/80" />
        </div>
        {/* Subtle warm glow accents */}
        <div className="absolute inset-0 opacity-[0.08]" style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, hsl(var(--primary)), transparent 50%), radial-gradient(circle at 70% 60%, hsl(var(--accent)), transparent 50%)`,
        }} />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-2xl mx-auto text-center">
            <ScrollReveal>
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/20 text-primary text-xs font-semibold uppercase tracking-wider mb-5 backdrop-blur-sm border border-primary/10">
                <Radio className="mr-2 h-3.5 w-3.5" />
                Founder Signal Briefing
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-background mb-4 leading-tight">
                Get the Founder Signal
              </h2>
              <p className="text-background/65 mb-4 leading-relaxed max-w-lg mx-auto text-base">
                Curated market intelligence, capital signals, and founder-relevant insights — delivered in a cleaner format so you can stay sharp without the noise.
              </p>
              <p className="text-background/35 text-xs mb-8 max-w-md mx-auto">
                Built for founders, operators, consultants, and business owners tracking where the market is moving.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/founder-signal#join">
                  <Button className="bg-primary text-primary-foreground hover:bg-accent px-8 py-5 text-sm shadow-elevated transition-all duration-300">
                    Subscribe to Founder Signal
                  </Button>
                </Link>
                <a href={`${import.meta.env.BASE_URL}rss/feed.xml`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="border-primary/40 text-primary hover:bg-primary/15 hover:border-primary/60 px-8 py-5 text-sm backdrop-blur-sm transition-all duration-300">
                    <Rss className="mr-2 h-4 w-4" />
                    RSS feed
                  </Button>
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Newsletter */}
      <NewsletterSignup />

      {/* ═══ SECTION 8 — FINAL CTA ═══ */}
      <section className="py-12 md:py-16 bg-foreground">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <ScrollReveal>
              <h2 className="text-xl md:text-2xl font-heading font-bold text-background mb-3">
                Ready to move from information to action?
              </h2>
              <p className="text-background/50 text-sm leading-relaxed mb-6 max-w-md mx-auto">
                Connect what you're seeing in the market to your next strategic move.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/founder-signal#join">
                  <Button size="sm" className="btn-primary px-6 py-5 text-sm">
                    Subscribe to Founder Signal
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/funding">
                  <Button size="sm" variant="outline" className="border-background/25 bg-transparent text-background hover:bg-background/10 px-6 py-5 text-sm">
                    Explore funding paths
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

    </div>
    </TooltipProvider>
  );
};

export default MarketIntelligence;
