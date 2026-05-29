import { useState, useRef } from "react";
import {
  Shield, Sparkles, TrendingUp, CheckCircle2, ArrowRight,
  Receipt, Layers, Briefcase, ExternalLink, ChevronLeft, CreditCard,
  Building2, FileText, Calendar, Banknote, ChevronRight, Quote,
  Target, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, Link } from "react-router-dom";
import strategyImage from "@/assets/phoenix-capital-readiness-gpt.jpg";
import { matchCapitalPathway, type MatchResult } from "@/config/capital-pathways";
import CapitalReadinessForm from "@/components/funding/CapitalReadinessForm";
import CapitalMatchResults from "@/components/funding/CapitalMatchResults";
import ScrollReveal from "@/components/ScrollReveal";
import {
  Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext,
} from "@/components/ui/carousel";

type ActiveFlow = null | "readiness" | "sigma";

/* ── placeholder reviews ── */
const REVIEWS = [
  { quote: "I spent months going in circles trying to figure out the right funding move. One conversation here gave me more clarity than six months of Googling.", name: "Marcus T.", role: "Founder", source: "Client feedback" },
  { quote: "They didn't just push a product at me. They actually listened to where my business was and helped me see which path made sense right now.", name: "Diana R.", role: "Business Owner", source: "Client feedback" },
  { quote: "I was nervous about the whole process, but it felt like talking to an advisor, not a lender. That made all the difference.", name: "James K.", role: "Service Business Operator", source: "Client feedback" },
  { quote: "The Capital Readiness Review helped me realize I was looking at the wrong type of funding entirely. Saved me a lot of time and probably a bad decision.", name: "Priya S.", role: "Founder", source: "Client feedback" },
  { quote: "Clear, no-pressure, and genuinely helpful. I actually understood my options for the first time.", name: "Carlos M.", role: "Business Owner", source: "Client feedback" },
];

/* ── pathway teaser cards (LAYER 2 only) ── */
const PATHWAY_CARDS = [
  { id: "preferred-term", icon: Banknote, tag: "Unsecured Funding", title: "Term Loans (5 or 7 Year)", desc: "Fixed monthly payments, no collateral, full liquidity. Rates from 9–15%.", bestFor: "Business owners with 680+ credit and documented income", cta: "See Program Details", action: "term-loan" as const },
  { id: "preferred-credit", icon: CreditCard, tag: "Business Credit", title: "Business Credit Card Program", desc: "0% intro interest for 6–12 months. Reports only to business credit.", bestFor: "Owners with 700+ credit and an established business entity", cta: "See Program Details", action: "business-credit" as const },
  { id: "invoice", icon: Receipt, tag: "Accounts Receivable", title: "Invoice Financing", desc: "Unlock working capital tied up in unpaid invoices — stop waiting 30–90 days.", bestFor: "B2B companies with $10k+ monthly receivables", cta: "Explore This Pathway", action: "sigma" as const },
  { id: "lendzee", icon: Layers, tag: "Structured Capital", title: "Lendzee Capital Options", desc: "Hybrid and alternative funding structures beyond traditional lending.", bestFor: "Businesses exploring alternative underwriting approaches", cta: "Learn More", action: "external-lendzee" as const },
  { id: "rock", icon: Briefcase, tag: "Partner Program", title: "Rock Financial Programs", desc: "Service-based business financing and operational growth capital.", bestFor: "Service businesses seeking operational capital", cta: "Learn More", action: "external-rock" as const },
];

const FundingPath = () => {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const prefilledObjective = searchParams.get("objective") || "";
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [activeFlow, setActiveFlow] = useState<ActiveFlow>(null);
  const [activeDetail, setActiveDetail] = useState<string | null>(null);
  const [showExplore, setShowExplore] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const exploreRef = useRef<HTMLDivElement>(null);

  const revealExplore = () => {
    setShowExplore(true);
    setTimeout(() => exploreRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  };

  const handlePathwayClick = (action: string) => {
    if (action === "term-loan" || action === "business-credit") {
      setActiveDetail("preferred");
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } else if (action === "sigma") {
      setActiveFlow("sigma");
    }
  };

  /* ── Supabase lead capture (unchanged) ── */
  const handleSubmit = async (formData: Record<string, string>, securityResult?: { disposableEmail?: boolean }) => {
    setIsSubmitting(true);
    const match = matchCapitalPathway({
      capitalObjective: formData.capitalObjective,
      revenueRange: formData.revenueRange,
      creditStrength: formData.creditStrength,
      fundingRange: formData.fundingRange,
      ventureStage: formData.ventureStage,
    });
    try {
      const { data: result, error } = await supabase.functions.invoke("submit-form", {
        body: {
          formType: "lead",
          data: {
            name: formData.name, email: formData.email, phone: formData.phone || null,
            state: formData.state, founder_role: formData.founderRole,
            business_stage: formData.ventureStage, use_of_funds: formData.capitalObjective,
            funding_amount: formData.fundingRange, timeline_to_launch: formData.timeline,
            credit_strength: formData.creditStrength,
            has_entity: formData.hasEntity === "yes" ? true : formData.hasEntity === "no" ? false : null,
            budget_range: formData.revenueRange, venture_summary: formData.capitalGoals || null,
            lead_source: match.pathway.id, submission_type: "capital_readiness",
            marketing_consent: formData.marketingConsent === "true",
            disposable_email: securityResult?.disposableEmail,
          },
        },
      });
      if (error || result?.error) throw new Error(result?.error || "Submission failed");
      const leadId = result?.leadId;
      if (!securityResult?.disposableEmail) {
        try {
          await supabase.functions.invoke("capital-lead-notify", {
            body: { name: formData.name, email: formData.email, phone: formData.phone, state: formData.state,
              fundingRange: formData.fundingRange, creditStrength: formData.creditStrength,
              revenueRange: formData.revenueRange, recommendedPathway: match.pathway.name,
              ventureStage: formData.ventureStage, capitalObjective: formData.capitalObjective, timeline: formData.timeline },
          });
        } catch (e) { console.error("Notification error:", e); }
        try {
          await supabase.functions.invoke("capital-welcome-email", {
            body: { leadId, name: formData.name, email: formData.email,
              capitalObjective: formData.capitalObjective, ventureStage: formData.ventureStage,
              recommendedPathway: match.pathway.name },
          });
        } catch (e) { console.error("Welcome email error:", e); }
      }
      setMatchResult(match);
      toast({ title: "Review Complete", description: "We've identified a capital pathway for you." });
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({ title: "Submission Error", description: "There was an issue submitting your information. Please try again.", variant: "destructive" });
    } finally { setIsSubmitting(false); }
  };

  if (matchResult) return <CapitalMatchResults result={matchResult} />;

  /* ── Capital Readiness Form flow ── */
  if (activeFlow === "readiness") {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <section className="py-6 border-b border-border bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setActiveFlow(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ChevronLeft className="h-4 w-4" /> Back to Funding Paths
              </button>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Capital Readiness Review</h1>
              <p className="text-muted-foreground mt-2">Answer a few guided questions and we'll match you to the capital pathway that best fits your stage, timing, and goals.</p>
            </div>
          </div>
        </section>
        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="card-elevated p-6 md:p-8 rounded-2xl">
                <CapitalReadinessForm onSubmit={handleSubmit} isSubmitting={isSubmitting} prefilledObjective={prefilledObjective} />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ── Invoice Financing flow ── */
  if (activeFlow === "sigma") {
    return (
      <div className="min-h-screen pt-24 pb-16">
        <section className="py-6 border-b border-border bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <button onClick={() => setActiveFlow(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ChevronLeft className="h-4 w-4" /> Back to Funding Paths
              </button>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">Invoice Financing Review</h1>
              <p className="text-muted-foreground mt-2">Unlock working capital tied up in unpaid invoices — designed for B2B businesses with outstanding receivables.</p>
            </div>
          </div>
        </section>
        <section className="py-10 md:py-14">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <div className="card-elevated p-6 md:p-8 rounded-2xl text-center">
                <Receipt className="h-10 w-10 text-primary mx-auto mb-4" />
                <h2 className="text-xl font-heading font-semibold text-foreground mb-3">Invoice Financing Qualification</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6 max-w-md mx-auto">
                  If your business invoices other businesses and waits on payment, this pathway can help you access that capital faster.
                </p>
                <Link to="/sigma-funding">
                  <Button className="btn-primary py-5 px-8">Start Invoice Financing Review <ArrowRight className="ml-2 h-4 w-4" /></Button>
                </Link>
                <p className="text-xs text-muted-foreground/60 mt-4">Typically suited for B2B companies with $10k+ in monthly receivables.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  /* ════════════════════════════════════════════════════
     MAIN LANDING — 3-LAYER ARCHITECTURE
     Layer 1 = Sections 1–7 (always visible)
     Layer 2 = Section 8 (pathway cards, revealed on click)
     Layer 3 = Section 9 (preferred detail, revealed on click)
     ════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen pt-24 pb-0">

      {/* ═══ SECTION 1 — CINEMATIC HERO ═══ */}
      <section className="relative py-20 md:py-28 lg:py-36">
        <div className="absolute inset-0">
          <img src={strategyImage} alt="Strategic planning session" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground/95 via-foreground/90 to-foreground/70" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium mb-6">
              <Shield className="mr-2 h-4 w-4" />
              Strategic Capital Guidance
            </div>
            <h1 className="text-3xl md:text-5xl lg:text-[3.5rem] font-heading font-bold text-background leading-[1.15]">
              Find the Right Capital Path<br className="hidden md:block" /> Without the Guesswork
            </h1>
            <p className="mt-6 text-lg md:text-xl text-background/80 max-w-2xl leading-relaxed">
              Phoenix Venture Studios helps founders, operators, and business owners make smarter capital decisions with more clarity, better timing, and less friction.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Button onClick={() => setActiveFlow("readiness")} className="btn-primary py-6 px-8 text-base" size="lg">
                <Target className="mr-2 h-5 w-5" />
                Find My Best Funding Path
              </Button>
              <Button onClick={revealExplore} variant="outline" className="py-6 px-8 text-base border-primary/60 text-primary hover:bg-primary/10 hover:text-primary bg-background/10 backdrop-blur-sm" size="lg">
                <Eye className="mr-2 h-5 w-5" />
                Explore Funding Options
              </Button>
            </div>
            <button onClick={revealExplore} className="mt-6 text-sm text-background/50 hover:text-background/80 transition-colors underline underline-offset-4 decoration-background/20">
              Just browsing? Explore options at your own pace.
            </button>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 2 — TRUST STRIP ═══ */}
      <section className="py-4 border-b border-border bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-xs sm:text-sm text-muted-foreground">
            {["U.S.-focused capital pathways", "Guided, not pressured", "No concept disclosure required", "Strategic, founder-friendly guidance"].map((t, i) => (
              <span key={i} className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />{t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SECTION 3 — HUMAN REALITY / EMPATHY ═══ */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <ScrollReveal>
              <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-4">Why This Matters Right Now</p>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-6 leading-snug">
                Funding is rarely one-size-fits-all. The right path depends on more than just how much you need.
              </h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  The right capital structure depends on your timing, business profile, cash flow, readiness, and goals. Most founders aren't sure whether they need growth capital, working capital, receivables financing, business credit, or strategy first — and that's completely normal.
                </p>
                <p>
                  The wrong structure can add stress, restrict flexibility, or burn time you don't have. The right one can create breathing room, unlock momentum, and keep you in control of your next move.
                </p>
                <p>
                  This page exists to reduce confusion, not increase it. Whether you're ready to move or still figuring things out, the goal is clarity first.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4 — TESTIMONIAL CAROUSEL ═══ */}
      <section className="py-16 md:py-24 bg-foreground text-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-3">What People Say</p>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-background mb-3">
                  What people say after getting strategic clarity
                </h2>
                <p className="text-background/60 max-w-xl mx-auto">
                  Real feedback from people navigating growth, funding, and next-step decisions.
                </p>
              </div>
            </ScrollReveal>

            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-4">
                {REVIEWS.map((r, i) => (
                  <CarouselItem key={i} className="pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                    <div className="h-full rounded-2xl border border-border/20 bg-background/5 p-6 flex flex-col">
                      <Quote className="h-8 w-8 text-primary/40 mb-4 shrink-0" />
                      <p className="text-sm text-background/80 leading-relaxed flex-1 mb-5">"{r.quote}"</p>
                      <div className="border-t border-border/10 pt-4">
                        <p className="text-sm font-semibold text-background">{r.name}</p>
                        <p className="text-xs text-background/50">{r.role}</p>
                        {r.source && <p className="text-[10px] text-background/30 mt-1">{r.source}</p>}
                      </div>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <div className="flex justify-center gap-2 mt-8">
                <CarouselPrevious className="static translate-y-0 bg-background/10 border-background/20 text-background hover:bg-background/20" />
                <CarouselNext className="static translate-y-0 bg-background/10 border-background/20 text-background hover:bg-background/20" />
              </div>
            </Carousel>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 5 — SELF-SELECT CHOICE (2 BIG CARDS) ═══ */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-3">Your Next Step</p>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                  Choose How You Want to Start
                </h2>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              {/* Card A — Guided Path */}
              <ScrollReveal delay={0.05}>
                <div className="card-elevated rounded-2xl p-8 md:p-10 h-full flex flex-col text-center border-2 border-transparent hover:border-primary/30 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Target className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-heading font-bold text-foreground mb-3">Find My Best Funding Path</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                    For people who want guidance, matching, and a more directed path based on where they are right now.
                  </p>
                  <Button onClick={() => setActiveFlow("readiness")} className="btn-primary py-5 px-8 w-full">
                    Start Capital Readiness Review
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </ScrollReveal>

              {/* Card B — Browse */}
              <ScrollReveal delay={0.1}>
                <div className="card-elevated rounded-2xl p-8 md:p-10 h-full flex flex-col text-center border-2 border-transparent hover:border-primary/30 transition-all duration-300">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
                    <Eye className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-heading font-bold text-foreground mb-3">Explore Funding Options</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-8 flex-1">
                    For people who want to browse the main capital pathways first and learn what each route is generally for before going deeper.
                  </p>
                  <Button onClick={revealExplore} className="btn-outline-gold py-5 px-8 w-full">
                    Explore Funding Options
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 6 — MINI HOW IT WORKS ═══ */}
      <section className="py-14 md:py-20 bg-secondary/30 border-y border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-3">How It Works</p>
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                  From Clarity to Capital
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-10">
                {[
                  { step: "1", title: "Clarify Your Situation", desc: "Understand where you stand today — your stage, timing, goals, and readiness." },
                  { step: "2", title: "Explore the Right Path", desc: "See which capital pathway fits your profile, or let us recommend one for you." },
                  { step: "3", title: "Move Forward with Confidence", desc: "Apply through the right partner with a clear understanding of your best option." },
                ].map((item) => (
                  <div key={item.step} className="text-center">
                    <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-5">
                      <span className="text-xl font-heading font-bold text-primary">{item.step}</span>
                    </div>
                    <h3 className="font-heading font-semibold text-foreground text-lg mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 7 — MID-PAGE TRUST / INVITATION ═══ */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">
                You don't need everything figured out.
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The goal is clarity first. Strategy and fit matter more than speed alone. This page is built to help you reduce bad-fit decisions — not pressure you into one.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-8">
                If you want help thinking through fit, timing, or direction, start with a guided review. It takes a few minutes and gives you a clear recommendation.
              </p>
              <Button onClick={() => setActiveFlow("readiness")} className="btn-primary py-6 px-10 text-base" size="lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Start Capital Readiness Review
              </Button>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 8 — LAYER 2: EXPLORE FUNDING OPTIONS (hidden until clicked) ═══ */}
      {showExplore && (
        <>
          <section ref={exploreRef} className="py-12 md:py-16 bg-foreground text-background scroll-mt-24 border-t border-border">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl mx-auto text-center">
                <ScrollReveal>
                  <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-3">Capital Pathways</p>
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-background mb-3">Explore Capital Pathways</h2>
                  <p className="text-background/60 max-w-xl mx-auto leading-relaxed">
                    Each pathway is designed for a different kind of business need, timing, and profile. Start with the one that sounds closest to your situation.
                  </p>
                </ScrollReveal>
              </div>
            </div>
          </section>

          <section className="py-16 md:py-24 bg-background">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {PATHWAY_CARDS.map((card, i) => {
                    const isExternal = card.action.startsWith("external-");
                    const externalUrl = card.action === "external-lendzee"
                      ? "https://lendzee.ai/rising-phoenix-business-services"
                      : card.action === "external-rock"
                      ? "https://go.mypartner.io/business-financing/?ref=0014x000022lWItAAM"
                      : "";

                    return (
                      <ScrollReveal key={card.id} delay={i * 0.06}>
                        <div className="card-elevated rounded-2xl p-6 h-full flex flex-col">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <card.icon className="h-5 w-5 text-primary" />
                            </div>
                            <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{card.tag}</span>
                          </div>
                          <h3 className="text-lg font-heading font-bold text-foreground mb-2">{card.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3">{card.desc}</p>
                          <p className="text-xs text-muted-foreground/70 mb-5">Best for: {card.bestFor}</p>
                          <div className="mt-auto">
                            {isExternal ? (
                              <>
                                <a href={externalUrl} target="_blank" rel="noopener noreferrer" className="block">
                                  <Button className="btn-primary w-full py-5 text-sm">
                                    {card.cta} <ExternalLink className="ml-2 h-4 w-4" />
                                  </Button>
                                </a>
                                <p className="text-[10px] text-muted-foreground/50 text-center mt-2">Opens partner site in a new tab</p>
                              </>
                            ) : (
                              <Button onClick={() => handlePathwayClick(card.action)} className="btn-primary w-full py-5 text-sm">
                                {card.cta} <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ═══ SECTION 9 — LAYER 3: PREFERRED FUNDING DETAIL (hidden until clicked) ═══ */}
      {activeDetail === "preferred" && (
        <section ref={detailRef} className="py-16 md:py-24 bg-secondary/30 border-y border-border scroll-mt-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <ScrollReveal>
                <button onClick={() => setActiveDetail(null)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10">
                  <ChevronLeft className="h-4 w-4" /> Back to All Pathways
                </button>

                {/* Detail Header */}
                <div className="text-center mb-14">
                  <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-3">Unsecured Funding Options</p>
                  <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground mb-4">
                    Business Credit &amp; Unsecured Funding Options
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                    Unsecured capital programs for qualified business owners seeking speed, flexibility, and no collateral. Two proven pathways — each designed around your credit profile and goals.
                  </p>
                </div>
              </ScrollReveal>

              {/* Two-column comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-14">
                <ScrollReveal delay={0.05}>
                  <div className="bg-background rounded-2xl border border-border overflow-hidden h-full flex flex-col">
                    <div className="bg-primary/5 border-b border-border px-6 py-5">
                      <div className="flex items-center gap-3">
                        <Banknote className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-heading font-bold text-foreground">5 or 7 Year Term Loans</h3>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                        Fixed monthly payments with full liquidity immediately. Rates range from 9–15% depending on the strength of your personal credit.
                      </p>
                      <div className="mb-5 space-y-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Benefits</p>
                        {[
                          "Rates from 9–15% based on credit strength",
                          "Fixed monthly payment",
                          "No upfront fees or down payment",
                          "Full liquidity immediately",
                          "Funding in 7–15 business days",
                          "No assets or collateral required",
                          "No prepayment penalty",
                        ].map((t, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{t}
                          </div>
                        ))}
                      </div>
                      <div className="mt-auto p-4 rounded-xl bg-secondary/50 border border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">Requirements</p>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2"><FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />680+ personal credit scores across all 3 bureaus</li>
                          <li className="flex items-start gap-2"><FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />2 years personal tax returns showing $50,000+ in taxable income</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                <ScrollReveal delay={0.1}>
                  <div className="bg-background rounded-2xl border border-border overflow-hidden h-full flex flex-col">
                    <div className="bg-primary/5 border-b border-border px-6 py-5">
                      <div className="flex items-center gap-3">
                        <CreditCard className="h-6 w-6 text-primary" />
                        <h3 className="text-xl font-heading font-bold text-foreground">Business Credit Card Program</h3>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1">
                      <p className="text-sm text-muted-foreground leading-relaxed mb-5">
                        0% interest for 6–12 months with stated income. Reports only to your business credit — keeping your personal credit clean.
                      </p>
                      <div className="mb-5 space-y-2.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground">Benefits</p>
                        {[
                          "0% interest for 6–12 months",
                          "No minimum length of time in business",
                          "Stated income — minimal documentation",
                          "No upfront fees",
                          "Reports only to the business",
                        ].map((t, i) => (
                          <div key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />{t}
                          </div>
                        ))}
                      </div>
                      <div className="mt-auto p-4 rounded-xl bg-secondary/50 border border-border">
                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground mb-2">Requirements</p>
                        <ul className="space-y-1.5 text-sm text-muted-foreground">
                          <li className="flex items-start gap-2"><FileText className="h-4 w-4 text-primary shrink-0 mt-0.5" />700+ personal credit scores across all 3 bureaus</li>
                          <li className="flex items-start gap-2"><Building2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />Established business entity</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              </div>

              {/* Apply → Consult → Funded strip */}
              <ScrollReveal delay={0.15}>
                <div className="bg-foreground rounded-2xl p-8 md:p-10 text-background mb-14">
                  <p className="text-sm uppercase tracking-wider text-primary font-semibold mb-8 text-center">How It Works</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                      { step: "1", title: "Apply", desc: "Complete a straightforward application through Preferred Funding Group's secure portal." },
                      { step: "2", title: "Consult", desc: "A funding specialist reviews your profile and walks you through your best options." },
                      { step: "3", title: "Funded", desc: "Once approved, receive your capital — some programs fund in as little as 7 business days." },
                    ].map((item) => (
                      <div key={item.step} className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                          <span className="text-lg font-heading font-bold text-primary">{item.step}</span>
                        </div>
                        <h4 className="font-heading font-semibold text-background text-lg mb-2">{item.title}</h4>
                        <p className="text-sm text-background/60 leading-relaxed">{item.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>

              {/* CTA Block */}
              <ScrollReveal delay={0.2}>
                <div className="text-center">
                  <a href="https://preferredfundinggroup.wufoo.com/forms/z1en5qmn1sc80v3/" target="_blank" rel="noopener noreferrer">
                    <Button className="btn-primary py-6 px-10 text-base">
                      Apply Now <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                  <p className="text-sm text-muted-foreground mt-3">
                    You'll be redirected to Preferred Funding Group's secure application.
                  </p>
                  <button onClick={() => setActiveDetail(null)} className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors underline underline-offset-4">
                    Explore Other Funding Options
                  </button>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </section>
      )}

      {/* ═══ SECTION 10 — FINAL CTA ═══ */}
      <section className="py-16 md:py-24 bg-foreground text-background border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal>
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-background mb-4">
                Ready to take the next step?
              </h2>
              <p className="text-background/60 max-w-xl mx-auto leading-relaxed mb-10">
                Start with a guided review, explore a capital pathway, or book a conversation if you want a more hands-on strategic discussion.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button onClick={() => setActiveFlow("readiness")} className="btn-primary py-6 px-8 text-base" size="lg">
                  Start Capital Readiness Review
                </Button>
                <Button onClick={revealExplore} variant="outline" className="py-6 px-8 text-base border-primary/60 text-primary hover:bg-primary/10" size="lg">
                  Explore Capital Pathways
                </Button>
                <a href="https://calendly.com/rpbswildman/new-meeting" target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" className="py-6 px-8 text-base text-background/60 hover:text-background" size="lg">
                    <Calendar className="mr-2 h-4 w-4" />
                    Book Strategy Session
                  </Button>
                </a>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── Advisory note ── */}
      <section className="py-8 bg-secondary/30 border-t border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            <p className="font-heading font-semibold text-foreground text-sm mb-1">Not every capital pathway fits every situation.</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Phoenix Venture Studios helps identify which pathway may be worth exploring based on your timing, business stage, and capital goals. Current pathways are focused on U.S.-based lenders and opportunities. Pathway fit depends on credit, revenue, timing, and business context. This is guidance, not a guarantee.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default FundingPath;
