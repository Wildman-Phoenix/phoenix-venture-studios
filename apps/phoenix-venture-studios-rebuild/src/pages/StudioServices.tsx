import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Compass,
  FileText,
  Layers3,
  Megaphone,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import NewsletterSignup from "@/components/NewsletterSignup";
import ScrollReveal from "@/components/ScrollReveal";
import strategyImage from "@/assets/phoenix-strategy-room-gpt.jpg";
import foundersImage from "@/assets/phoenix-operator-workspace-gpt.jpg";
import intelImage from "@/assets/phoenix-capital-readiness-gpt.jpg";

const SERVICE_LANES = [
  {
    icon: Megaphone,
    title: "Landing Pages & Sales Pages",
    description: "Founder-friendly pages that turn attention into a clear next step without sounding like a generic sales page.",
    items: ["Offer positioning", "Page structure", "Next-step clarity", "Review before launch"],
  },
  {
    icon: Wand2,
    title: "Conversion Story Systems",
    description: "We shape the promise, proof, trust, and next step so the offer is easier to understand and act on.",
    items: ["Briefs", "Section skeletons", "Copy slots", "Image prompt packs"],
  },
  {
    icon: Sparkles,
    title: "AI Rollout Support",
    description: "Practical help identifying where AI can improve operations, content, sales, and decision-making.",
    items: ["Use-case mapping", "Workflow design", "Agent planning", "Launch support"],
  },
  {
    icon: TrendingUp,
    title: "Capital Readiness",
    description: "Direction on how to think about funding options, readiness, documentation, and the right next conversation.",
    items: ["Funding fit", "Readiness gaps", "Offer packaging", "Intro prep"],
  },
];

const BUILD_STACK = [
  "Current market signals",
  "Founder Signal subscription path",
  "Funding path routing",
  "Capital readiness positioning",
  "Landing-page copy and design",
  "AI workflow and agent planning",
];

const StudioServices = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(var(--primary)/0.24),transparent_34rem),radial-gradient(circle_at_82%_12%,rgba(142,217,210,0.18),transparent_28rem),linear-gradient(135deg,hsl(var(--foreground)),hsl(var(--charcoal-light)))]" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7">
              <h1 className="text-4xl md:text-6xl font-heading font-bold text-background leading-[1.05] tracking-tight">
                Build the page, system, and story your next move needs.
              </h1>
              <p className="mt-6 text-lg md:text-xl text-background/70 max-w-2xl leading-relaxed">
                Phoenix Venture Studios helps entrepreneurs package the offer, read the market, plan the AI rollout, and build the assets that make funding or sales conversations easier to start.
              </p>
              <div className="mt-9 flex flex-col sm:flex-row gap-4">
                <Link to="/founder-signal">
                  <Button size="lg" className="btn-primary px-8 py-6 text-base">
                    Subscribe to Founder Signal <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/market-intelligence">
                  <Button size="lg" variant="outline" className="border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground px-8 py-6 text-base">
                    View the signal archive
                  </Button>
                </Link>
              </div>
            </div>
            <div className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-[2rem] border border-background/15 bg-background/10 p-4 shadow-elevated backdrop-blur">
                <div className="absolute inset-x-6 top-0 h-1 rounded-full bg-gradient-to-r from-primary via-[#8ed9d2] to-accent" />
                <img src={strategyImage} alt="Phoenix strategy session planning board" className="aspect-[4/3] w-full rounded-[1.5rem] object-cover" />
                <div className="grid grid-cols-2 gap-3 pt-4">
                  {["Position", "Package", "Publish", "Route"].map((item) => (
                    <div key={item} className="rounded-2xl border border-background/10 bg-background/10 px-4 py-3 text-sm font-medium text-background/80">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground">
                Studio support for founders who need more than advice.
              </h2>
              <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
                This is the build side of Phoenix: clear strategy, conversion assets, AI implementation planning, and capital-readiness support working together instead of living in separate silos.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {SERVICE_LANES.map((service, index) => (
              <ScrollReveal key={service.title} delay={index * 0.08}>
                <div className="relative h-full overflow-hidden rounded-3xl border border-border bg-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-elevated">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary/50 via-accent/35 to-[#8ed9d2]/45" />
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <service.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-heading font-bold text-foreground">{service.title}</h3>
                      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <div className="mt-6 grid grid-cols-2 gap-2">
                    {service.items.map((item) => (
                      <div key={item} className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-foreground text-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <ScrollReveal className="lg:col-span-5">
              <img src={foundersImage} alt="Founder operator workspace with launch assets" className="rounded-[2rem] border border-background/10 shadow-elevated" />
            </ScrollReveal>
            <ScrollReveal delay={0.12} className="lg:col-span-7">
              <h2 className="text-3xl md:text-5xl font-heading font-bold leading-tight">
                A practical build stack for attention, trust, and follow-up.
              </h2>
              <p className="mt-5 text-background/60 text-lg leading-relaxed">
                Founder Signal keeps the market read current. From there, Phoenix helps turn the clearest opportunities into sharper positioning, useful follow-up, and practical next steps.
              </p>
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BUILD_STACK.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl border border-background/10 bg-background/5 px-4 py-3 text-sm text-background/75">
                    <Layers3 className="h-4 w-4 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <ScrollReveal className="lg:col-span-7">
              <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground">
                What we can build next.
              </h2>
              <div className="mt-8 space-y-5">
                {[
                  { icon: BarChart3, title: "A campaign landing page", text: "For AI education, funding readiness, coaching, consulting, or an offer you want to test." },
                  { icon: FileText, title: "A founder briefing system", text: "Turn current signals into weekly insight, newsletter content, and founder-friendly talking points." },
                  { icon: Compass, title: "A practical AI planning brief", text: "Map an AI-supported workflow for research, drafting, review, and follow-up." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-4 rounded-3xl border border-border bg-card p-5">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-heading text-lg font-bold text-foreground">{item.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
            <ScrollReveal delay={0.12} className="lg:col-span-5">
              <div className="rounded-[2rem] bg-secondary p-4">
                <img src={intelImage} alt="Capital readiness review workspace" className="aspect-[4/5] w-full rounded-[1.5rem] object-cover" />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <NewsletterSignup />

      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="mx-auto max-w-3xl text-3xl md:text-5xl font-heading font-bold text-foreground">
            If you are building something real, start with the clearest next move.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-muted-foreground leading-relaxed">
            Read what is moving the market, subscribe for the ongoing signal, or start a conversation about the page, funding path, or AI rollout you need next.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/founder-signal#join">
              <Button size="lg" variant="outline" className="btn-outline-gold px-8 py-6 text-base">
                Subscribe to Founder Signal
              </Button>
            </Link>
            <Link to="/contact?intent=studio">
              <Button size="lg" className="btn-primary px-8 py-6 text-base">
                Request studio support <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default StudioServices;
