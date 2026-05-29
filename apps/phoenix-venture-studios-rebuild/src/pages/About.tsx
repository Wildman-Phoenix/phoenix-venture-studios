import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Award, Briefcase, Compass, Cpu, Heart, Lightbulb, MapPin, Shield } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import advisorImage from "@/assets/advisor-portrait-premium-gpt.jpg";
import strategyImage from "@/assets/phoenix-strategy-room-gpt.jpg";
import traverseCity from "@/assets/traverse-city-authority-gpt.jpg";

const VALUES = [
  { icon: Compass, title: "Clarity Over Confusion", description: "Every interaction should leave you with a clearer sense of direction, not more noise." },
  { icon: Shield, title: "Founder-Friendly Strategy", description: "Your ideas, your vision, your success. We support, guide, and protect — never take over." },
  { icon: Heart, title: "Human-First Guidance", description: "Real conversations, practical advice, and honest perspective — not corporate scripts." },
  { icon: Lightbulb, title: "Real-World Perspective", description: "Lessons from building, failing, rebuilding, and helping thousands of entrepreneurs do the same." },
];

const CONVERSATION_PATHS = [
  {
    icon: Compass,
    title: "Capital direction",
    description: "For founders deciding whether they need readiness work, structured capital, business credit, or a slower strategy-first path.",
  },
  {
    icon: Cpu,
    title: "AI rollout clarity",
    description: "For operators figuring out which workflow deserves automation first and how AI fits the business without creating more noise.",
  },
  {
    icon: Briefcase,
    title: "Offer and execution support",
    description: "For people who need help packaging the next move into a clearer page, workshop, studio engagement, or founder-facing offer.",
  },
];

const About = () => {
  return (
    <div className="min-h-screen">
      {/* ── S1: HERO — Real aerial Traverse City ── */}
      <section className="relative py-14 md:py-24 overflow-hidden">
        <div className="absolute inset-0">
          <img src={traverseCity} alt="Traverse City, Michigan at sunset" className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-foreground/60" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(243,108,33,0.22),transparent_24rem),linear-gradient(180deg,rgba(7,24,40,0.78)_0%,rgba(7,24,40,0.42)_48%,rgba(7,24,40,0.82)_100%)]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-primary/30" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-semibold mb-5 backdrop-blur-sm border border-primary/15 uppercase tracking-wider">
              <MapPin className="mr-2 h-3.5 w-3.5" />
              Traverse City, Michigan
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-heading font-bold text-background mb-5 leading-[1.15]">
              Founded by a Builder.<br />
              <span className="text-primary">Built for Founders.</span>
            </h1>
            <p className="text-base md:text-lg text-background/60 max-w-xl mx-auto leading-relaxed mb-8">
              Phoenix Venture Studios is led by Nathan Wildman — entrepreneur, venture advisor, and AI strategist helping founders align capital, strategy, and execution.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/founder-signal">
                <Button size="lg" className="btn-primary px-8 py-5 text-sm">
                  Subscribe to Founder Signal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/market-intelligence">
                <Button size="lg" variant="outline" className="border-primary/40 text-primary hover:bg-primary/10 px-8 py-5 text-sm">
                  Read current signals
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── S2: WHY PHOENIX EXISTS ── */}
      <section className="py-10 md:py-14 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-10 items-center">
            <ScrollReveal className="md:col-span-7">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-4 uppercase tracking-wider">
                The Mission
              </div>
              <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-5 leading-tight">
                Why <span className="text-primary">Phoenix</span> Venture Studios
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed max-w-lg">
                <p>
                  The phoenix symbolizes resilience, reinvention, and renewed momentum. This platform was built for people navigating real business decisions — whether building something new, growing an existing company, or making smarter moves with limited time and attention.
                </p>
                <p>
                  Phoenix Venture Studios exists to help people move through uncertainty with more clarity, better strategy, and stronger capital decisions.
                </p>
              </div>
              <blockquote className="mt-6 pl-4 border-l-4 border-primary">
                <p className="text-xl font-heading font-bold text-primary italic leading-snug">
                  "Every setback is a setup for a comeback."
                </p>
              </blockquote>
            </ScrollReveal>
            <ScrollReveal delay={0.15} className="md:col-span-5">
              <div className="relative">
                <div className="relative overflow-hidden rounded-[2rem] border border-border/50 bg-card shadow-elevated">
                  <div className="grid grid-cols-[1.15fr_0.85fr] gap-px bg-border/50">
                    <div className="relative overflow-hidden bg-card">
                      <img
                        src={strategyImage}
                        alt="Strategy session planning"
                        className="h-full w-full aspect-[4/4.3] object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/88 via-foreground/24 to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Studio work</p>
                        <p className="mt-1 text-sm leading-5 text-white/90">
                          Direction, positioning, and rollout planning when the next move needs structure.
                        </p>
                      </div>
                    </div>
                    <div className="relative overflow-hidden bg-[#f3ede3]">
                      <img
                        src={advisorImage}
                        alt="Nathan Wildman portrait"
                        className="h-full w-full aspect-[3/4.3] object-cover object-[center_14%] scale-[1.02]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,24,40,0.04)_0%,rgba(7,24,40,0.08)_38%,rgba(7,24,40,0.82)_100%)]" />
                      <div className="absolute left-3 top-3 rounded-full border border-white/40 bg-white/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur">
                        Founder
                      </div>
                      <div className="absolute bottom-3 left-3 right-3">
                        <p className="font-heading text-lg font-bold leading-tight text-white">Nathan Wildman</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── S3: FOUNDER STORY ── */}
      <section className="py-10 md:py-14 bg-secondary/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              <ScrollReveal className="md:col-span-4 flex justify-center">
                <a href="https://nathanwildman.com" target="_blank" rel="noopener noreferrer" className="relative group block w-60 md:w-72">
                  <div className="relative rounded-[2rem] border border-border/60 bg-card/90 p-3 shadow-elevated backdrop-blur">
                    <div className="relative overflow-hidden rounded-[1.55rem] border border-white/60 bg-[#ebe2d2]">
                      <img
                        src={advisorImage}
                        alt="Nathan Wildman"
                        className="w-full aspect-[3/4] object-cover object-[center_11%] brightness-[0.88] contrast-[1.12] saturate-[0.82] transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,24,40,0.08)_0%,rgba(7,24,40,0.08)_36%,rgba(7,24,40,0.9)_100%)]" />
                      <div className="absolute left-4 top-4 rounded-full border border-white/35 bg-white/16 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                        Founder-led strategy
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Nathan Wildman</p>
                        <p className="mt-2 text-sm leading-5 text-white/90">
                          Entrepreneur, advisor, and operator perspective shaped in real founder environments.
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between rounded-[1.1rem] border border-border/60 bg-background px-4 py-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Profile</p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">Operating perspective across capital, execution, and AI shifts.</p>
                      </div>
                      <div className="ml-4 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card">
                        <Award className="h-5 w-5" />
                      </div>
                    </div>
                  </div>
                </a>
              </ScrollReveal>
              <ScrollReveal delay={0.1} className="md:col-span-8">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-1.5">
                  Nathan Wildman
                </h2>
                <p className="text-base text-primary font-medium mb-5">
                  Entrepreneur • Venture Advisor • AI Strategist
                </p>
                <div className="space-y-3.5 text-muted-foreground leading-relaxed text-[0.95rem]">
                  <p>
                    Nathan Wildman is an entrepreneur, venture advisor, and AI strategist who works with founders and business owners to align capital strategy, execution systems, and market direction.
                  </p>
                  <p>
                    He has founded multiple businesses and spent years working with thousands of entrepreneurs and high-growth companies implementing systems, strategy, and modern AI tools.
                  </p>
                  <p>
                    He helps startup founders, small business owners, consultants, agencies, and operators move from concept to a clearer, better-structured venture path.
                  </p>
                </div>
                <a href="https://nathanwildman.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center mt-5 text-primary hover:text-accent transition-colors font-medium text-sm">
                  Learn More About Nathan <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ── S5: WHAT I BELIEVE ── */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
                  What Guides the Work
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto text-sm">
                  The principles behind every signal, strategy conversation, and recommendation.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {VALUES.map((value, i) => (
                <ScrollReveal key={value.title} delay={i * 0.08}>
                  <div className="relative h-full overflow-hidden rounded-xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary/40 via-accent/40 to-[#8ed9d2]/45" />
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 border border-primary/15">
                        <value.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-base font-heading font-semibold text-foreground mb-1.5">{value.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{value.description}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── S8: HOW FOUNDERS USE PHOENIX ── */}
      <section className="py-14 md:py-20 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-3">
                  How Founders Use Phoenix
                </h2>
                <p className="text-muted-foreground text-sm">
                  Most founders start with a signal, then move into a specific Phoenix conversation when the next step is clear.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {CONVERSATION_PATHS.map((path, i) => (
                <ScrollReveal key={path.title} delay={i * 0.1}>
                  <div className="bg-card border border-border rounded-xl p-6 flex flex-col min-h-[200px] shadow-card relative overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30" />
                    <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                      <path.icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-lg font-heading font-semibold text-foreground mb-3">
                      {path.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {path.description}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── S9: FINAL CTA ── */}
      <section className="py-10 md:py-14 gradient-subtle">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">
                Start with the signal.
              </h2>
              <p className="text-muted-foreground mb-6 text-sm">
                Get the weekly signal first. If it points to funding, a snapshot, or studio help, move from there.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/founder-signal">
                  <Button size="lg" className="btn-primary px-8 py-5 text-sm">
                    Subscribe to Founder Signal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/market-intelligence">
                  <Button size="lg" variant="outline" className="btn-outline-gold px-8 py-5 text-sm">
                    Read current signals
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

export default About;
