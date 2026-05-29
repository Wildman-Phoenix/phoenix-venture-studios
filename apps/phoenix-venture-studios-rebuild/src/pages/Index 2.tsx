import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, TrendingUp, Shield, Target, BarChart3, Lightbulb, CheckCircle2 } from "lucide-react";
import MarketIntelligencePreview from "@/components/MarketIntelligencePreview";
import CapitalPathwayExamples from "@/components/CapitalPathwayExamples";
import ScrollReveal from "@/components/ScrollReveal";
import HomeFaq from "@/components/HomeFaq";
import HowFoundersUse from "@/components/HowFoundersUse";
import NewsletterSignup from "@/components/NewsletterSignup";
import WhyPhoenix from "@/components/WhyPhoenix";
import JsonLdSchema from "@/components/JsonLdSchema";
import heroImage from "@/assets/hero-entrepreneur.jpg";

const homepageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Phoenix Venture Studios",
    url: "https://phoenixventurestudios.com",
    description: "Strategic capital guidance, venture analysis, and market intelligence for founders, operators, and business owners.",
    founder: { "@type": "Person", name: "Nathan Wildman" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Phoenix Venture Studios",
    url: "https://phoenixventurestudios.com",
    description: "Strategic capital guidance, venture analysis, and market intelligence for founders, operators, and business owners.",
  },
];

const TRUST_STRIP = [
  { icon: Target, label: "Capital Clarity" },
  { icon: Shield, label: "Strategic Positioning" },
  { icon: TrendingUp, label: "Funding Pathway Guidance" },
  { icon: BarChart3, label: "Market Intelligence for Growth" },
];

const Index = () => {
  return (
    <div className="min-h-screen">
      <JsonLdSchema schema={homepageSchema} />

      {/* ═══ HERO ═══ */}
      <section className="relative pt-36 pb-24 md:pt-44 md:pb-36 overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt="Strategic business planning and capital pathway guidance"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/80 to-foreground/50" />
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <p className="text-primary font-medium text-xs md:text-sm tracking-[0.2em] uppercase mb-5 animate-fade-up">
              Strategic Capital Guidance for Founders, Operators, and Growing Businesses
            </p>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold text-background leading-[1.15] animate-fade-up">
              Find the Right Capital Path{" "}
              <span className="text-primary">Without the Guesswork</span>
            </h1>

            <p className="mt-7 text-lg md:text-xl text-background/80 max-w-2xl leading-relaxed animate-fade-up" style={{ animationDelay: "0.1s" }}>
              Phoenix Venture Studios helps founders, business owners, and operators navigate funding pathways, venture strategy, and market intelligence — with more clarity and less friction.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-start gap-4 animate-fade-up" style={{ animationDelay: "0.2s" }}>
              <Link to="/snapshot">
                <Button size="lg" className="btn-primary text-base px-8 py-6 shadow-elevated">
                  Get Your Venture Snapshot
                  <Sparkles className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/funding">
                <Button size="lg" variant="outline" className="border-2 border-primary/80 text-primary hover:bg-primary hover:text-primary-foreground text-base px-8 py-6 backdrop-blur-sm">
                  Explore Funding Paths
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>

            <p className="mt-5 text-background/50 text-sm animate-fade-up max-w-xl" style={{ animationDelay: "0.25s" }}>
              Built for people evaluating growth, funding, and next-step strategy — from new ventures to established businesses.
            </p>
          </div>
        </div>
      </section>

      {/* ═══ TRUST STRIP ═══ */}
      <section className="py-5 bg-foreground border-b border-background/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {TRUST_STRIP.map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-background/70">
                <item.icon className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium tracking-wide">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW PEOPLE USE THIS ═══ */}
      <HowFoundersUse />

      {/* ═══ CHOOSE YOUR PATH ═══ */}
      <section className="py-24 md:py-32 bg-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-foreground via-foreground to-charcoal-light/30 opacity-60" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-background">
                Choose the Best Place to Start
              </h2>
              <p className="mt-4 text-background/60 max-w-xl mx-auto leading-relaxed">
                Whether you want a strategic read on your business or a clearer funding direction, start where it feels most useful.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Venture Snapshot */}
            <ScrollReveal delay={0.1}>
              <div className="bg-background/5 backdrop-blur-sm border border-background/10 p-9 rounded-2xl group hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
                <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center mb-6 group-hover:bg-primary/25 transition-colors">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-background mb-3">Venture Snapshot</h3>
                <p className="text-background/60 mb-5 leading-relaxed">
                  Get a strategic read on your business, growth potential, and likely next move.
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {["Early positioning insight", "Capital-readiness direction", "Market and strategy perspective"].map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-background/50 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/snapshot" className="mt-auto">
                  <Button className="btn-primary w-full py-5 text-base">
                    Generate Venture Snapshot <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>

            {/* Funding Path */}
            <ScrollReveal delay={0.2}>
              <div className="bg-background/5 backdrop-blur-sm border border-background/10 p-9 rounded-2xl group hover:-translate-y-1 hover:border-primary/30 transition-all duration-300 h-full flex flex-col">
                <div className="w-14 h-14 rounded-xl bg-accent/15 flex items-center justify-center mb-6 group-hover:bg-accent/25 transition-colors">
                  <TrendingUp className="h-7 w-7 text-accent" />
                </div>
                <h3 className="text-2xl font-heading font-bold text-background mb-3">Funding Path</h3>
                <p className="text-background/60 mb-5 leading-relaxed">
                  Explore which funding direction may fit your stage, business profile, and goals.
                </p>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {["Capital pathway matching", "Clearer fit by timing and profile", "U.S.-focused opportunity guidance"].map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-background/50 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/funding" className="mt-auto">
                  <Button variant="outline" className="btn-outline-gold w-full py-5 text-base">
                    Explore Funding Path <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ MARKET INTELLIGENCE ═══ */}
      <MarketIntelligencePreview />

      {/* ═══ CAPITAL PATHWAY EXAMPLES ═══ */}
      <CapitalPathwayExamples />

      {/* ═══ NEWSLETTER ═══ */}
      <NewsletterSignup />

      {/* ═══ WHY PHOENIX ═══ */}
      <WhyPhoenix />

      {/* ═══ FAQ ═══ */}
      <HomeFaq />

      {/* ═══ FINAL CTA ═══ */}
      <section className="py-24 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/50 to-background" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <ScrollReveal>
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-5">
                Ready to Explore the Right Next Step?
              </h2>
              <p className="text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed">
                Start with a Venture Snapshot, explore your funding path, or book a strategy session if you want a more guided conversation.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/snapshot">
                  <Button size="lg" className="btn-primary px-8 py-6 text-base">
                    Generate Venture Snapshot
                    <Sparkles className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/funding">
                  <Button size="lg" variant="outline" className="btn-outline-gold px-8 py-6 text-base">
                    Explore Funding Path
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button size="lg" variant="ghost" className="text-primary hover:text-accent px-8 py-6 text-base">
                    Book Strategy Session
                    <ArrowRight className="ml-2 h-5 w-5" />
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

export default Index;
