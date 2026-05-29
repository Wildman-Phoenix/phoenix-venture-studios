import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import JsonLdSchema from "@/components/JsonLdSchema";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BookOpen,
  Calendar,
  Lightbulb,
  Sparkles,
  User,
  Zap,
  TrendingUp,
  PenLine,
  Eye,
  Target,
  Clock,
  Compass,
} from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import insightsHero from "@/assets/insights-hero.jpg";
import insightsPerspective from "@/assets/insights-perspective.jpg";
import insightsFeatured from "@/assets/insights-featured.jpg";
import insightsCategories from "@/assets/insights-categories.jpg";
import phoenixTexture from "@/assets/phoenix-texture.jpg";

/* ── Post type — ready for future database migration ── */
export interface InsightPost {
  id: string;
  title: string;
  subtitle: string;
  summary: string;
  date: string;
  tags: string[];
  slug: string;
  readTime: string;
  author: string;
  sourceSignalId?: string;
  imageUrl?: string;
}

/* ── Placeholder posts ── */
const POSTS: InsightPost[] = [
  {
    id: "1",
    title: "Starting Your Next Venture? Read This First",
    subtitle: "What founders and business owners should clarify before chasing funding",
    summary:
      "Most founders jump straight to fundraising before answering the questions that actually determine whether capital will help or hurt them. This piece walks through the five things every entrepreneur — from a first-time app builder to a restaurant owner eyeing a second location — should lock down before applying for a single dollar.",
    date: "2026-03-08",
    tags: ["Startup Execution", "Funding"],
    slug: "starting-your-next-venture",
    readTime: "6 min read",
    author: "Phoenix Venture Studios",
  },
  {
    id: "2",
    title: "What Most Small Business Owners Miss About Capital",
    subtitle: "Growth capital, working capital, business credit, and invoice financing are not the same thing",
    summary:
      "A cleaning company owner doesn't need the same funding pathway as a SaaS founder — but most capital advice treats them identically. We break down the real differences between growth capital, working capital, business credit lines, and invoice factoring, and explain which pathway fits which stage.",
    date: "2026-03-04",
    tags: ["Capital Strategy", "Business Growth"],
    slug: "small-business-capital-explained",
    readTime: "7 min read",
    author: "Phoenix Venture Studios",
  },
  {
    id: "3",
    title: "AI Hype vs. Real Opportunity",
    subtitle: "How founders and operators should think about AI more strategically",
    summary:
      "Not every AI pitch is a real business. But not every skeptic is right either. This commentary explores how to separate the noise from the signal — whether you're building an AI-native startup or an agency owner wondering if automation could double your margins.",
    date: "2026-02-27",
    tags: ["AI Strategy", "Funding"],
    slug: "ai-hype-vs-real-opportunity",
    readTime: "5 min read",
    author: "Phoenix Venture Studios",
  },
];

const TAG_COLORS: Record<string, string> = {
  "AI Strategy": "bg-primary/10 text-primary",
  Funding: "bg-accent/10 text-accent",
  "Startup Execution": "bg-primary/10 text-primary",
  "Capital Strategy": "bg-accent/10 text-accent",
  "Business Growth": "bg-primary/10 text-primary",
  "Market Commentary": "bg-accent/10 text-accent",
};

const ICON_MAP: Record<string, typeof Lightbulb> = {
  "AI Strategy": Sparkles,
  Funding: TrendingUp,
  "Startup Execution": Lightbulb,
  "Capital Strategy": TrendingUp,
  "Business Growth": TrendingUp,
};

function getPostIcon(tags: string[]) {
  for (const tag of tags) {
    if (ICON_MAP[tag]) return ICON_MAP[tag];
  }
  return PenLine;
}

const CATEGORIES = [
  { label: "Funding Trends", icon: TrendingUp, description: "Capital flows, lending shifts, and where the money is moving." },
  { label: "Founder Decision-Making", icon: Compass, description: "Frameworks for clearer choices when every option feels uncertain." },
  { label: "Capital Strategy", icon: Target, description: "Aligning the right type of capital with your stage and goals." },
  { label: "Market Timing", icon: Clock, description: "When to move, when to wait, and what the signals are telling you." },
  { label: "Operator Perspective", icon: Eye, description: "Lessons from the ground — what working founders actually learn." },
  { label: "Venture Intelligence", icon: Zap, description: "Strategic reads on markets, sectors, and emerging opportunities." },
];

const HOW_STEPS = [
  { step: 1, title: "Clarify Your Position", description: "Understand where you stand relative to your market and your goals.", icon: Compass },
  { step: 2, title: "Spot Trends Early", description: "Catch shifts before they become obvious — and before your competition does.", icon: Eye },
  { step: 3, title: "Make Better Decisions", description: "Turn signal into strategy with context that matters for your stage.", icon: Target },
  { step: 4, title: "Decide Your Next Move", description: "Use insight to choose timing, capital type, and growth direction.", icon: ArrowRight },
];

const Insights = () => {
  const articleSchemas = useMemo(
    () =>
      POSTS.map((post) => ({
        "@context": "https://schema.org",
        "@type": "Article",
        headline: post.title,
        description: post.summary,
        datePublished: post.date,
        author: { "@type": "Person", name: "Nathan Wildman" },
        publisher: {
          "@type": "Organization",
          name: "Phoenix Venture Studios",
        },
      })),
    [],
  );

  return (
    <div className="min-h-screen">
      <JsonLdSchema schema={articleSchemas} />

      {/* ── S1: CINEMATIC HERO ── */}
      <section className="relative pt-24 pb-12 md:pt-32 md:pb-18 overflow-hidden">
        <div className="absolute inset-0">
          <img src={insightsHero} alt="" className="w-full h-full object-cover object-center scale-105" />
          <div className="absolute inset-0 bg-foreground/70" />
          <div className="absolute inset-0 bg-gradient-to-b from-foreground/75 via-foreground/45 to-foreground/85" />
          <div className="absolute bottom-0 left-1/3 w-[400px] h-[400px] bg-primary/6 rounded-full blur-[100px]" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-5 backdrop-blur-sm border border-primary/15 uppercase tracking-wider">
              <BookOpen className="mr-2 h-3.5 w-3.5" />
              Strategic Editorial
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-background mb-4 leading-[1.15]">
              Signal. Perspective.<br />
              <span className="text-primary">Strategic Clarity.</span>
            </h1>
            <p className="text-sm md:text-base text-background/65 max-w-lg mx-auto leading-relaxed mb-7">
              In-depth analysis and founder-focused intelligence for entrepreneurs navigating real decisions.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
              <Link to="/snapshot">
                <Button size="lg" className="btn-primary px-7 py-5 text-sm">
                  Get Your Venture Snapshot
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/market-intelligence">
                <Button size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 px-7 py-5 text-sm">
                  Live Market Signals
                  <Zap className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="text-background/30 text-[11px] tracking-wide">
              Strategic reads for founders, operators, and business owners — not generic news.
            </p>
          </div>
        </div>
      </section>

      {/* ── S2: WHY THIS PAGE EXISTS ── */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <ScrollReveal className="md:col-span-7">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-semibold mb-3 uppercase tracking-wider">
                Why This Matters
              </div>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4 leading-tight">
                You Don't Need More Information.<br />
                You Need <span className="text-primary">Better Perspective.</span>
              </h2>
              <div className="space-y-3 text-sm text-muted-foreground leading-relaxed max-w-lg">
                <p>
                  Founders and operators are drowning in content. Headlines move fast. Advice is cheap. But very little of it is filtered through the lens of someone who actually builds and funds ventures.
                </p>
                <p>
                  Phoenix Insights exists to close that gap — offering strategic interpretation, not just information. Every piece is designed to help you see what matters, understand why, and decide what to do next.
                </p>
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.15} className="md:col-span-5">
              <div className="rounded-xl overflow-hidden shadow-elevated border border-border/50 relative">
                <img src={insightsPerspective} alt="Strategic perspective" className="w-full aspect-[4/3] object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/20 to-transparent" />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── S3: FEATURED INSIGHT CARDS ── */}
      <section className="py-10 md:py-14 bg-secondary/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2">
                  Latest Strategic Reads
                </h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  Deep-dive analysis and founder-facing commentary on the trends that matter most right now.
                </p>
              </div>
            </ScrollReveal>

            {/* Featured post - large card */}
            <ScrollReveal>
              <article className="rounded-xl overflow-hidden group mb-6 bg-card border border-border shadow-elevated hover:shadow-2xl transition-shadow duration-300">
                <div className="grid grid-cols-1 md:grid-cols-5">
                  <div className="md:col-span-2 relative min-h-[180px] md:min-h-0">
                    <img src={insightsFeatured} alt="" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-card/80 via-transparent to-transparent" />
                    <div className="absolute top-4 left-4">
                      <Badge className="bg-primary text-primary-foreground border-0 text-[10px] font-semibold uppercase tracking-wider shadow-lg">
                        Featured
                      </Badge>
                    </div>
                  </div>
                  <div className="md:col-span-3 p-6 md:p-7">
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {POSTS[0].tags.map((tag) => (
                        <Badge key={tag} variant="outline" className={`text-[10px] border-0 ${TAG_COLORS[tag] || "bg-secondary text-secondary-foreground"}`}>
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <h3 className="text-2xl md:text-3xl font-heading font-bold text-foreground leading-tight mb-3 group-hover:text-primary transition-colors">
                      {POSTS[0].title}
                    </h3>
                    <p className="text-sm text-accent font-medium mb-3">{POSTS[0].subtitle}</p>
                    <p className="text-muted-foreground leading-relaxed mb-5 text-sm">{POSTS[0].summary}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/70 border-t border-border/50 pt-4">
                      <span className="flex items-center gap-1"><User className="h-3 w-3" />{POSTS[0].author}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{new Date(POSTS[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                      <span>{POSTS[0].readTime}</span>
                    </div>
                  </div>
                </div>
              </article>
            </ScrollReveal>

            {/* Remaining posts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {POSTS.slice(1).map((post, i) => {
                const PostIcon = getPostIcon(post.tags);
                return (
                  <ScrollReveal key={post.id} delay={i * 0.08}>
                    <article className="bg-card border border-border rounded-xl overflow-hidden group hover:-translate-y-1 transition-all duration-300 h-full shadow-card hover:shadow-elevated">
                      <div className="h-1 bg-gradient-to-r from-primary via-accent to-primary" />
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-9 h-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                            <PostIcon className="h-4 w-4 text-accent" />
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {post.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className={`text-[9px] border-0 ${TAG_COLORS[tag] || "bg-secondary text-secondary-foreground"}`}>
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <h3 className="text-lg font-heading font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-xs text-accent font-medium mb-2">{post.subtitle}</p>
                        <p className="text-sm text-muted-foreground leading-relaxed mb-4">{post.summary}</p>
                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground/60 border-t border-border/40 pt-3">
                          <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" />{post.author}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                          <span>{new Date(post.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          <span className="w-0.5 h-0.5 rounded-full bg-muted-foreground/30" />
                          <span>{post.readTime}</span>
                        </div>
                      </div>
                    </article>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── S4: HOW TO USE INSIGHTS ── */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2">
                  How Founders Use Insights
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Strategic intelligence is only useful if it connects to your next decision.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {HOW_STEPS.map((step, i) => (
                <ScrollReveal key={step.step} delay={i * 0.08}>
                  <div className="relative bg-card border border-border rounded-xl p-4 shadow-card hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5">
                    <div className="absolute -top-2.5 -left-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <span className="text-primary-foreground text-[10px] font-bold">{step.step}</span>
                    </div>
                    <div className="flex items-start gap-3 pt-1">
                      <div className="w-8 h-8 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                        <step.icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-heading font-semibold text-foreground mb-1">{step.title}</h3>
                        <p className="text-xs text-muted-foreground leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── S5: MID-PAGE TRUST / INVITATION ── */}
      <section className="relative py-10 md:py-14 overflow-hidden">
        <div className="absolute inset-0">
          <img src={phoenixTexture} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-foreground/92" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.08),transparent_60%)]" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="max-w-lg mx-auto text-center">
              <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl md:text-2xl font-heading font-bold text-background mb-4 leading-tight">
                Intelligence Matters Most When It Leads to <span className="text-primary">Decisions</span>
              </h2>
              <p className="text-background/50 leading-relaxed mb-2 text-sm">
                Founders don't just need updates — they need context.
              </p>
              <p className="text-background/35 leading-relaxed mb-6 text-xs">
                Phoenix Venture Studios connects market signals to capital strategy, growth timing, and next-step clarity.
              </p>
              <Link to="/snapshot">
                <Button size="lg" className="btn-primary px-7 py-5 text-sm">
                  Get a Strategic Read on Your Venture
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── S6: INSIGHT CATEGORIES / THEMES ── */}
      <section className="py-10 md:py-14 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-2">
                  What We Cover
                </h2>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Strategic themes designed to sharpen your thinking and improve your timing.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {CATEGORIES.map((cat, i) => (
                <ScrollReveal key={cat.label} delay={i * 0.06}>
                  <div className="bg-card border border-border rounded-xl overflow-hidden group hover:-translate-y-0.5 transition-all duration-300 shadow-card hover:shadow-elevated h-full">
                    <div className="h-16 relative overflow-hidden">
                      <img src={insightsCategories} alt="" className="w-full h-full object-cover opacity-40 group-hover:opacity-60 group-hover:scale-105 transition-all duration-500" style={{ objectPosition: `${i * 15}% center` }} />
                      <div className="absolute inset-0 bg-gradient-to-b from-foreground/20 to-foreground/70" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-8 h-8 rounded-lg bg-primary/20 backdrop-blur-sm flex items-center justify-center border border-primary/15">
                          <cat.icon className="h-4 w-4 text-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h3 className="text-xs font-heading font-semibold text-foreground mb-1">{cat.label}</h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{cat.description}</p>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── S7: FINAL CTA ── */}
      <section className="py-12 md:py-16 gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">
                Ready to Move from Insight to Action?
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Whether you're exploring funding, seeking strategic clarity, or preparing for your next move — start here.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/snapshot">
                  <Button size="lg" className="btn-primary px-7 py-5 text-sm">
                    Generate Venture Snapshot
                    <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/funding">
                  <Button size="lg" variant="outline" className="btn-outline-gold px-7 py-5 text-sm">
                    Explore Funding Paths
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
};

export default Insights;
