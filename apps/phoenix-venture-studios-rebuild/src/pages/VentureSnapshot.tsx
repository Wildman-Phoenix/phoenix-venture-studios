import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Sparkles, ArrowRight, TrendingUp, Target, Zap, Globe, Loader2,
  Gauge, CreditCard, Building2, Users, Compass,
  Lightbulb, Calendar, Newspaper, Mail, Shield,
  CheckCircle2, Clock, ChevronLeft, ChevronRight, Info,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { useFormSecurity } from "@/hooks/useFormSecurity";
import FormSecurityFields from "@/components/FormSecurityFields";

import { SnapshotFormData, SnapshotResult, DEFAULT_FORM_DATA } from "@/components/snapshot/types";
import Section1WhereYouAre from "@/components/snapshot/Section1WhereYouAre";
import Section2WhatYouHave from "@/components/snapshot/Section2WhatYouHave";
import Section3Challenges from "@/components/snapshot/Section3Challenges";
import Section4WhatHelp from "@/components/snapshot/Section4WhatHelp";
import { useSnapshotRouting } from "@/components/snapshot/useSnapshotRouting";

import snapshotHero from "@/assets/snapshot-hero.jpg";
import imgClarify from "@/assets/snapshot-clarify.jpg";
import imgReadiness from "@/assets/snapshot-readiness.jpg";
import imgPath from "@/assets/snapshot-path.jpg";
import imgNoise from "@/assets/snapshot-noise.jpg";
import imgOpportunity from "@/assets/snapshot-opportunity.jpg";
import imgScore from "@/assets/snapshot-score.jpg";
import imgGuidance from "@/assets/snapshot-guidance.jpg";

const STEPS = [
  { label: "About You", description: "Name and contact", icon: Users },
  { label: "Where You Are", description: "Stage and status", icon: Compass },
  { label: "What You Have", description: "Assets in place", icon: CheckCircle2 },
  { label: "Challenges", description: "What's in the way", icon: Target },
  { label: "What You Need", description: "Help and fit", icon: Lightbulb },
];

const VentureSnapshot = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snapshotResult, setSnapshotResult] = useState<SnapshotResult | null>(null);
  const [formData, setFormData] = useState<SnapshotFormData>(DEFAULT_FORM_DATA);
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const { readinessScore, capitalPathwayFit, routeRecommendation, recommendedNextMove } =
    useSnapshotRouting(formData);

  const update = (field: keyof SnapshotFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const {
    honeypot, setHoneypot, turnstileRef, validateSubmission, isValidating, hasTurnstile,
  } = useFormSecurity("venture_snapshot");

  // Conditional: is this person early-stage / exploratory?
  const isEarlyStage = useMemo(() => {
    return (
      ["idea", "validation", ""].includes(formData.ventureStage) &&
      formData.generatingRevenue !== "yes-consistent"
    );
  }, [formData.ventureStage, formData.generatingRevenue]);

  // Conditional: does this person have funding signals?
  const hasFundingIntent = useMemo(() => {
    return (
      formData.lookingFor === "funding-options" ||
      formData.lookingFor === "both-funding-strategy"
    );
  }, [formData.lookingFor]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validation = await validateSubmission(formData.email);
      if (!validation.valid) {
        setIsSubmitting(false);
        return;
      }

      const extendedSummary = [
        formData.ventureSummary,
        formData.alreadyTried && `Already tried: ${formData.alreadyTried}`,
        formData.hardestPart && `Hardest part: ${formData.hardestPart}`,
        formData.worthIt && `Looking for: ${formData.worthIt}`,
      ].filter(Boolean).join("\n\n");

      const { data: leadResult, error: leadError } = await supabase.functions.invoke("submit-form", {
        body: {
          formType: "lead",
          data: {
            name: formData.name,
            email: formData.email,
            industry: formData.industry || null,
            business_stage: `${formData.ventureStage} | ${formData.buildingOrGrowing}`,
            venture_summary: extendedSummary || null,
            budget_range: formData.budgetRange,
            timeline_to_launch: formData.operatingDuration || null,
            support_interest: [
              ...formData.assetsInPlace,
              formData.biggestChallenge && `challenge:${formData.biggestChallenge}`,
              formData.mostUrgent && `urgency:${formData.mostUrgent}`,
              formData.conversationType && `conversation:${formData.conversationType}`,
              formData.guidanceOrImplementation && `support:${formData.guidanceOrImplementation}`,
            ].filter(Boolean).join(", "),
            submission_type: "venture_snapshot",
            founder_role: formData.founderRole || null,
            credit_strength: formData.creditStrength || null,
            preferred_follow_up: formData.lookingFor || null,
            use_of_funds: formData.capitalObjective || null,
            has_entity: formData.currentlyOperating === "yes-entity",
            prior_funding: formData.investedMoney || null,
            marketing_consent: formData.marketingConsent,
            disposable_email: validation.disposableEmail,
          },
        },
      });

      if (leadError || leadResult?.error) throw new Error(leadResult?.error || "Submission failed");

      const { data, error } = await supabase.functions.invoke("venture-snapshot", {
        body: {
          industry: formData.industry,
          stage: formData.ventureStage,
          ventureSummary: extendedSummary,
          budgetRange: formData.budgetRange,
          timeline: formData.operatingDuration,
          supportInterests: formData.assetsInPlace,
          founderRole: formData.founderRole,
          capitalObjective: formData.lookingFor,
          creditStrength: formData.creditStrength,
          buildingOrGrowing: formData.buildingOrGrowing,
          generatingRevenue: formData.generatingRevenue,
          biggestChallenge: formData.biggestChallenge,
          mostUrgent: formData.mostUrgent,
        },
      });

      if (error) throw error;

      setSnapshotResult(data);
      toast({
        title: "Your Snapshot Is Ready",
        description: "Scroll down to explore your strategic insights and next steps.",
      });
    } catch (error) {
      console.error("Error generating snapshot:", error);
      toast({
        title: "Generation Error",
        description: "There was an issue generating your snapshot. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── POST-SUBMIT RESULTS VIEW ──
  if (snapshotResult) {
    const pathwayLabels = [
      { key: "businessCredit", label: "Business Credit Programs", icon: CreditCard, description: "Unsecured funding and credit line pathways" },
      { key: "structuredCapital", label: "Structured Capital", icon: Building2, description: "Hybrid and alternative funding options" },
      { key: "founderStrategy", label: "Strategic Advisory", icon: Users, description: "Guidance, positioning, and capital planning" },
    ];

    return (
      <div className="min-h-screen pt-24 pb-16">
        <section className="py-14 md:py-20 bg-foreground text-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/20 text-primary text-sm font-medium mb-4">
                <Sparkles className="mr-2 h-4 w-4" />
                Your Venture Snapshot
              </div>
              <h1 className="text-3xl md:text-4xl font-heading font-bold text-background leading-tight">
                Here's What We See
              </h1>
              <p className="mt-4 text-background/70 max-w-xl mx-auto leading-relaxed">
                Based on what you shared, here's a strategic read on your positioning, capital fit, and potential next moves. This is a starting point — not a final plan.
              </p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
              <div className="space-y-6">
                {[
                  { icon: Target, title: "Opportunity Overview", content: snapshotResult.opportunityOverview },
                  { icon: TrendingUp, title: "Potential Capital Pathways", content: snapshotResult.capitalPathways },
                  { icon: Globe, title: "Market Dynamics", content: snapshotResult.marketDynamics },
                  { icon: Zap, title: "Go-to-Market Direction", content: snapshotResult.goToMarketDirection },
                ].map((section, i) => (
                  <div key={i} className="card-elevated p-6 rounded-xl">
                    <div className="flex items-center mb-4">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                        <section.icon className="h-5 w-5 text-primary" />
                      </div>
                      <h3 className="text-xl font-heading font-semibold text-foreground">{section.title}</h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                  </div>
                ))}
              </div>

              <Separator className="my-10" />

              {/* Readiness Score */}
              <div className="space-y-6">
                <div className="card-elevated p-6 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <Gauge className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-heading font-semibold text-foreground">Readiness Indicator</h3>
                  </div>
                  <div className="mb-4">
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Directional readiness estimate</span>
                      <span className="text-3xl font-heading font-bold text-primary">{readinessScore}%</span>
                    </div>
                    <Progress value={readinessScore} className="h-4" />
                  </div>
                  <p className="text-sm text-muted-foreground italic">
                    This is a directional estimate, not a credit check or guarantee. Actual qualification depends on credit, revenue, timing, and business context.
                  </p>
                </div>

                {/* Capital Pathway Fit */}
                <div className="card-elevated p-6 rounded-xl">
                  <div className="flex items-center mb-5">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <Compass className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-heading font-semibold text-foreground">Capital Pathway Fit</h3>
                  </div>
                  <div className="space-y-4">
                    {pathwayLabels.map(pathway => {
                      const score = capitalPathwayFit[pathway.key as keyof typeof capitalPathwayFit];
                      const percentage = Math.round((score / 8) * 100);
                      const isHighlight = score >= 4;
                      return (
                        <div key={pathway.key} className={`p-4 rounded-lg border transition-all ${isHighlight ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30"}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <pathway.icon className={`h-5 w-5 ${isHighlight ? "text-primary" : "text-muted-foreground"}`} />
                              <div>
                                <span className={`font-medium ${isHighlight ? "text-foreground" : "text-muted-foreground"}`}>{pathway.label}</span>
                                {isHighlight && <span className="ml-2 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Strong Fit</span>}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{pathway.description}</p>
                          <Progress value={percentage} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-4 italic">
                    Current funding pathways are focused on U.S.-based opportunities. Not every pathway will fit every situation.
                  </p>
                </div>

                {/* Recommended Next Move */}
                <div className="card-elevated p-6 rounded-xl border-2 border-primary/20 bg-gradient-to-br from-card to-primary/5">
                  <div className="flex items-center mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mr-3">
                      <Lightbulb className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-xl font-heading font-semibold text-foreground">Recommended Next Move</h3>
                  </div>
                  <p className="text-lg font-heading font-semibold text-foreground mb-2">{recommendedNextMove.action}</p>
                  <p className="text-muted-foreground leading-relaxed">{recommendedNextMove.description}</p>
                </div>
              </div>

              {/* Disclaimer */}
              <div className="mt-8 p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground text-center">
                  This snapshot provides directional insight only and does not constitute legal, financial, or investment advice.
                  No funding approval is guaranteed. Pathway fit depends on credit, revenue, timing, and business context.
                </p>
              </div>

              {/* Where to Go From Here */}
              <div className="mt-12 text-center">
                <h3 className="text-xl font-heading font-semibold text-foreground mb-2">Where to Go From Here</h3>
                <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
                  Your snapshot is just the beginning. Choose the path that feels right for where you are right now.
                </p>

                {routeRecommendation === "funding" && (
                  <div className="mb-6 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 max-w-lg mx-auto">
                    <p className="text-sm font-medium text-foreground mb-1">Based on what you shared, you may be ready for a structured funding pathway.</p>
                    <p className="text-xs text-muted-foreground mb-4">A Capital Readiness Review can help match you to the right program.</p>
                    <Link to="/funding">
                      <Button className="btn-primary py-5 px-8 text-sm">
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Start Capital Readiness Review
                      </Button>
                    </Link>
                  </div>
                )}

                {routeRecommendation === "strategy-intensive" && (
                  <div className="mb-6 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 max-w-lg mx-auto">
                    <p className="text-sm font-medium text-foreground mb-1">A deeper strategic conversation could help you move faster and with more confidence.</p>
                    <p className="text-xs text-muted-foreground mb-4">The Founder Strategy Session is designed for people at your stage.</p>
                    <a href="https://calendly.com/rpbswildman/new-meeting" target="_blank" rel="noopener noreferrer">
                      <Button className="btn-primary py-5 px-8 text-sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        Request a Strategy Session
                      </Button>
                    </a>
                  </div>
                )}

                {routeRecommendation === "discovery" && (
                  <div className="mb-6 p-5 rounded-xl border-2 border-primary/20 bg-primary/5 max-w-lg mx-auto">
                    <p className="text-sm font-medium text-foreground mb-1">A quick discovery call is a great starting point — free, no-pressure, and focused on you.</p>
                    <p className="text-xs text-muted-foreground mb-4">We'll help you figure out what makes sense from here.</p>
                    <a href="https://calendly.com/rpbswildman/new-meeting" target="_blank" rel="noopener noreferrer">
                      <Button className="btn-primary py-5 px-8 text-sm">
                        <Calendar className="mr-2 h-4 w-4" />
                        Book a Free Discovery Call
                      </Button>
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto">
                  <Link to="/funding" className="w-full">
                    <Button variant="outline" className="w-full py-5 text-sm border-border hover:bg-secondary/50">
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Explore Funding Paths
                    </Button>
                  </Link>
                  <a href="https://calendly.com/rpbswildman/new-meeting" target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="btn-outline-gold w-full py-5 text-sm">
                      <Calendar className="mr-2 h-4 w-4" />
                      Book a Call
                    </Button>
                  </a>
                  <Link to="/market-intelligence" className="w-full">
                    <Button variant="outline" className="w-full py-5 text-sm border-border hover:bg-secondary/50">
                      <Newspaper className="mr-2 h-4 w-4" />
                      Explore Market Intelligence
                    </Button>
                  </Link>
                  <Link to="/#newsletter" className="w-full">
                    <Button variant="outline" className="w-full py-5 text-sm border-border hover:bg-secondary/50">
                      <Mail className="mr-2 h-4 w-4" />
                      Subscribe to Founder Signal
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── LANDING VIEW ──
  if (!started) {
    const scrollToStart = () => {
      const el = document.getElementById("snapshot-start-block");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    return (
      <div className="min-h-screen pt-24">
        {/* SECTION 1 — HERO with background image */}
        <section className="relative py-14 md:py-24 overflow-hidden">
          <div className="absolute inset-0">
            <img src={snapshotHero} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-foreground/60" />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/25 to-foreground/40" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,hsl(var(--primary)/0.06),transparent_60%)]" />
          </div>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl mx-auto text-center">
              <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/15 text-primary text-xs font-medium mb-6 backdrop-blur-sm border border-primary/20">
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Free Strategic Intelligence Tool
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-heading font-bold text-background leading-[1.15] tracking-tight">
                Get a Strategic Read{" "}
                <br className="hidden md:block" />
                on Your Venture
              </h1>
              <p className="mt-5 text-base md:text-lg text-background/70 max-w-xl mx-auto leading-relaxed">
                Answer a few guided questions and receive directional insight into your positioning,
                capital readiness, and recommended next steps — built for founders, operators, and
                business owners navigating growth, funding, and strategic decisions.
              </p>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-background/50">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>3–5 minutes</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>No concept disclosure</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span>Free, no commitment</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col items-center gap-3">
                <Button
                  onClick={() => setStarted(true)}
                  className="btn-primary py-6 px-10 text-base shadow-elevated"
                  size="lg"
                >
                  Start Your Venture Snapshot
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <button
                  type="button"
                  onClick={scrollToStart}
                  className="text-xs text-background/40 hover:text-primary transition-colors underline underline-offset-4"
                >
                  See what you'll get first
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2 — WHY FOUNDERS USE THIS — image-led cards */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground text-center mb-2">
                Why founders use this
              </h2>
              <p className="text-sm text-muted-foreground text-center max-w-lg mx-auto mb-8 leading-relaxed">
                A faster way to cut through the noise and figure out what actually matters right now.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { img: imgClarify, icon: Compass, title: "Clarify where you are", desc: "Get an honest read on your current positioning without the guesswork." },
                  { img: imgReadiness, icon: Gauge, title: "Spot readiness gaps", desc: "Understand what's strong and what might need attention before you move." },
                  { img: imgPath, icon: Target, title: "Find the right path", desc: "See which capital or strategy pathway makes the most sense for your stage." },
                  { img: imgNoise, icon: Zap, title: "Reduce noise", desc: "Stop scrolling lender sites. Get directional clarity in one sitting." },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="group rounded-xl border border-border bg-card overflow-hidden hover:border-primary/25 hover:shadow-elevated transition-all duration-300"
                  >
                    <div className="h-32 sm:h-36 overflow-hidden relative">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/90 flex items-center justify-center shadow-soft">
                          <item.icon className="h-3.5 w-3.5 text-primary-foreground" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-heading font-semibold text-foreground mb-1">{item.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 3 — WHAT YOU'LL RECEIVE — image-topped cards */}
        <section className="py-12 md:py-16 bg-foreground text-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_30%,hsl(var(--primary)/0.06),transparent_60%)]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-background text-center mb-2">
                What You'll Receive
              </h2>
              <p className="text-sm text-background/55 text-center max-w-lg mx-auto mb-8 leading-relaxed">
                After a few guided questions, you'll receive a strategic snapshot covering three critical areas.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    img: imgOpportunity,
                    icon: Target,
                    title: "Opportunity Overview",
                    desc: "A strategic read on your positioning, market dynamics, and where your venture stands relative to your stated goals.",
                  },
                  {
                    img: imgScore,
                    icon: Gauge,
                    title: "Readiness Score",
                    desc: "A directional indicator of how prepared you are for capital conversations or strategy-level decisions right now.",
                  },
                  {
                    img: imgGuidance,
                    icon: Compass,
                    title: "Next-Step Guidance",
                    desc: "Personalized recommendations toward funding paths, strategy conversations, or market intelligence based on your profile.",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="group rounded-xl overflow-hidden bg-background/[0.06] border border-background/10 hover:border-primary/25 transition-all duration-300"
                  >
                    <div className="h-36 overflow-hidden relative">
                      <img src={item.img} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2.5 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                          <item.icon className="h-4 w-4 text-primary" />
                        </div>
                        <h3 className="text-base font-heading font-semibold text-background">{item.title}</h3>
                      </div>
                      <p className="text-xs text-background/50 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4 — HOW IT WORKS — connected steps */}
        <section className="py-10 md:py-14 bg-secondary/30">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground text-center mb-8">
                How it works
              </h2>
              <div className="space-y-3">
                {[
                  { num: "01", title: "Share a few details", desc: "Tell us where you are, what you're building, and what kind of support you're looking for." },
                  { num: "02", title: "Get your snapshot", desc: "We turn your inputs into a strategic read on readiness, positioning, and likely next moves." },
                  { num: "03", title: "Choose your next step", desc: "Explore funding paths, strategy conversations, or market intelligence based on what fits." },
                ].map((step, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-xl bg-card border border-border/60 shadow-card">
                    <div className="shrink-0 w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-soft">
                      <span className="text-xs font-bold text-primary-foreground font-heading">{step.num}</span>
                    </div>
                    <div className="pt-0.5">
                      <h3 className="text-base font-heading font-semibold text-foreground mb-0.5">{step.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5 — TRUST + START COMBINED */}
        <section id="snapshot-start-block" className="py-12 md:py-16 relative overflow-hidden scroll-mt-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,hsl(var(--primary)/0.05),transparent_50%)]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-xl mx-auto text-center">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-medium mb-4 border border-primary/15">
                <Shield className="mr-1.5 h-3 w-3" />
                No commitment required
              </div>
              <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground mb-3 leading-tight">
                You don't need everything figured out.
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-2">
                Most founders don't need more noise — they need a clearer read on what matters right now.
              </p>
              <p className="text-xs text-muted-foreground/60 mb-6">
                Five guided sections. A few minutes. A strategic read you can act on.
              </p>
              <Button
                onClick={() => setStarted(true)}
                className="btn-primary py-6 px-10 text-base shadow-elevated"
                size="lg"
              >
                Start Your Venture Snapshot
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <p className="mt-3 text-[11px] text-muted-foreground/45">
                You can always go back and change your answers before submitting.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 6 — FINAL CTA — compact */}
        <section className="py-10 md:py-14 bg-foreground text-background relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,hsl(var(--primary)/0.06),transparent_50%)]" />
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-lg mx-auto text-center">
              <h2 className="text-lg md:text-xl font-heading font-bold text-background mb-2">
                Ready to get a clearer strategic read?
              </h2>
              <p className="text-sm text-background/55 leading-relaxed mb-6">
                Start your Venture Snapshot now — more clarity, less guesswork.
              </p>
              <Button
                onClick={() => setStarted(true)}
                className="btn-primary py-5 px-8 text-sm shadow-elevated"
                size="lg"
              >
                Start Your Venture Snapshot
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="mt-3 text-[11px] text-background/30">
                Currently focused on U.S.-based funding and advisory pathways.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── MULTI-STEP FORM VIEW ──
  const stepProgress = ((currentStep + 1) / STEPS.length) * 100;

  const canProceed = () => {
    if (currentStep === 0) return formData.name.trim() !== "" && formData.email.trim() !== "";
    return true;
  };

  // Step microcopy
  const stepMicrocopy: Record<number, string> = {
    0: "Just your name and email — we'll send your results here.",
    1: "There are no wrong answers. This helps us understand where things stand today.",
    2: "Check anything that applies — even partially. This paints a picture of your foundation.",
    3: "Everyone hits walls. Understanding yours helps us figure out what support would actually help.",
    4: "Almost done. This helps us point you toward the most relevant next step.",
  };

  return (
    <div className="min-h-screen pt-24 pb-16">
      {/* Header with progress */}
      <section className="py-6 md:py-8 bg-foreground text-background border-b border-background/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-3">
              <h1 className="text-lg md:text-xl font-heading font-bold text-background">
                Venture Snapshot
              </h1>
              <span className="text-sm text-background/60">
                Step {currentStep + 1} of {STEPS.length}
              </span>
            </div>
            <Progress value={stepProgress} className="h-1.5 mb-4" />
            <div className="flex gap-1 overflow-x-auto pb-1">
              {STEPS.map((step, i) => {
                const StepIcon = step.icon;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => i <= currentStep && setCurrentStep(i)}
                    className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-center transition-all flex flex-col items-center gap-1 ${
                      i === currentStep
                        ? "bg-primary/20 border border-primary/40"
                        : i < currentStep
                        ? "bg-background/10 cursor-pointer hover:bg-background/15"
                        : "bg-background/5 cursor-default"
                    }`}
                  >
                    <StepIcon className={`h-3.5 w-3.5 ${
                      i === currentStep ? "text-primary" : i < currentStep ? "text-background/70" : "text-background/30"
                    }`} />
                    <span className={`text-[10px] font-medium block truncate ${
                      i === currentStep ? "text-primary" : i < currentStep ? "text-background/70" : "text-background/30"
                    }`}>
                      {step.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Form steps */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Step microcopy */}
            <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
              <p className="text-sm text-muted-foreground text-center leading-relaxed">
                {stepMicrocopy[currentStep]}
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <FormSecurityFields honeypot={honeypot} setHoneypot={setHoneypot} turnstileRef={turnstileRef} hasTurnstile={hasTurnstile} />

              <div className="card-elevated p-6 md:p-8 rounded-2xl">
                {/* Step 0: Contact */}
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <div className="mb-6">
                      <h2 className="text-lg font-heading font-semibold text-foreground mb-1">Let's start with you</h2>
                      <p className="text-sm text-muted-foreground">We'll use this to deliver your snapshot and keep your results connected.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label htmlFor="name" className="text-sm font-medium leading-none">Name *</label>
                        <input
                          id="name"
                          required
                          value={formData.name}
                          onChange={e => update("name", e.target.value)}
                          placeholder="Your full name"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label htmlFor="email" className="text-sm font-medium leading-none">Email *</label>
                        <input
                          id="email"
                          type="email"
                          required
                          value={formData.email}
                          onChange={e => update("email", e.target.value)}
                          placeholder="you@example.com"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 1: Where You Are */}
                {currentStep === 1 && <Section1WhereYouAre formData={formData} update={update} />}

                {/* Step 2: What You Have */}
                {currentStep === 2 && <Section2WhatYouHave formData={formData} update={update} />}

                {/* Step 3: Challenges */}
                {currentStep === 3 && <Section3Challenges formData={formData} update={update} />}

                {/* Step 4: What You Need — with conditional adjustments */}
                {currentStep === 4 && (
                  <div>
                    <Section4WhatHelp formData={formData} update={update} />

                    {/* Conditional: show encouragement for early-stage */}
                    {isEarlyStage && (
                      <div className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border">
                        <div className="flex items-start gap-3">
                          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            You don't need to have everything figured out to get useful direction. Even at an early stage,
                            a strategic read can help you understand what to focus on next and avoid common early missteps.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Conditional: funding context if funding intent detected */}
                    {hasFundingIntent && !isEarlyStage && (
                      <div className="mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            Based on your interest in funding, we'll weight the snapshot toward capital-readiness signals and pathway matching.
                            The credit and funding range questions above help us avoid poor-fit suggestions.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Navigation */}
              <div className="flex items-center justify-between mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => currentStep === 0 ? setStarted(false) : setCurrentStep(prev => prev - 1)}
                  className="text-muted-foreground"
                >
                  <ChevronLeft className="mr-1 h-4 w-4" />
                  {currentStep === 0 ? "Back" : "Previous"}
                </Button>

                {currentStep < STEPS.length - 1 ? (
                  <Button
                    type="button"
                    onClick={() => setCurrentStep(prev => prev + 1)}
                    disabled={!canProceed()}
                    className="btn-primary px-8"
                  >
                    Continue
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                ) : (
                  <Button type="submit" className="btn-primary px-8 py-5" disabled={isSubmitting || isValidating}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Generating Your Snapshot...
                      </>
                    ) : (
                      <>
                        Generate Snapshot
                        <Sparkles className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                )}
              </div>

              <p className="text-xs text-muted-foreground text-center mt-6 leading-relaxed">
                Your information is kept confidential and never shared without your permission.
                This snapshot provides strategic direction only — not legal, financial, or investment advice.
              </p>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
};

export default VentureSnapshot;
