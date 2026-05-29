import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Bot, CheckCircle2, Cpu, Layers3, LineChart, Sparkles, Workflow } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";
import intelHero from "@/assets/phoenix-operator-workspace-gpt.jpg";
import snapshotImage from "@/assets/snapshot-guidance.jpg";

const AI_PATHS = [
  {
    icon: LineChart,
    title: "Understand what is changing",
    text: "Watch AI adoption, funding shifts, operator risk, and founder strategy signals without chasing every headline.",
  },
  {
    icon: Workflow,
    title: "Map where AI belongs",
    text: "Identify the parts of the business where AI can support research, content, lead flow, operations, or decision-making.",
  },
  {
    icon: Bot,
    title: "Plan custom agents carefully",
    text: "Design focused agents for briefs, landing pages, VSL-style structures, image prompts, and QA without making automation carry the whole strategy.",
  },
  {
    icon: Layers3,
    title: "Turn strategy into rollout assets",
    text: "Package the offer, page, newsletter, and follow-up path so AI becomes part of the business system, not a side experiment.",
  },
];

const AiOverview = () => {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute inset-0 bg-foreground" />
        <div className="absolute inset-y-0 right-0 w-full lg:w-[56%]">
          <img src={intelHero} alt="AI market intelligence desk" className="h-full w-full object-cover opacity-45 lg:opacity-70" />
          <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/75 to-foreground/20" />
        </div>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-heading font-bold text-background leading-[1.05]">
              AI is not the offer. It is the leverage behind the next offer.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-background/70 leading-relaxed max-w-2xl">
              Phoenix helps entrepreneurs understand AI news in plain English, choose practical use cases, and build the pages, workflows, and follow-up systems that make adoption useful.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <Link to="/market-intelligence">
                <Button size="lg" className="btn-primary px-8 py-6 text-base">
                  Read AI Signals <Cpu className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/studio">
                <Button size="lg" variant="outline" className="border-background/30 bg-transparent text-background hover:bg-background hover:text-foreground px-8 py-6 text-base">
                  Plan a Rollout <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="max-w-3xl">
              <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground">
                The practical AI path for entrepreneurs.
              </h2>
              <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
                The goal is not to chase every tool. The goal is to understand what matters, pick the useful use cases, and build a system that creates clearer decisions, stronger content, and better follow-up.
              </p>
            </div>
          </ScrollReveal>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
            {AI_PATHS.map((item, index) => (
              <ScrollReveal key={item.title} delay={index * 0.08}>
                <div className="h-full rounded-3xl border border-border bg-card p-7 shadow-card">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-5 text-xl font-heading font-bold text-foreground">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.text}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-secondary/40">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <ScrollReveal className="lg:col-span-5">
              <img src={snapshotImage} alt="AI strategy and capital readiness planning" className="rounded-[2rem] shadow-elevated" />
            </ScrollReveal>
            <ScrollReveal delay={0.12} className="lg:col-span-7">
              <h2 className="text-3xl md:text-5xl font-heading font-bold text-foreground">
                What Phoenix can help design.
              </h2>
              <div className="mt-8 space-y-4">
                {[
                  "An AI learning path for business owners who need plain-English guidance.",
                  "A custom landing-page and VSL-brief agent that follows Phoenix doctrine.",
                  "A newsletter workflow that turns current signals into useful founder commentary.",
                  "A funding-readiness funnel that routes people without overpromising outcomes.",
                ].map((item) => (
                  <div key={item} className="flex gap-3 rounded-2xl border border-border bg-background p-4 text-sm text-muted-foreground">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/studio">
                  <Button className="btn-primary px-7 py-5">
                    See Studio Services <Sparkles className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="outline" className="btn-outline-gold px-7 py-5">
                    Request studio support
                  </Button>
                </Link>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AiOverview;
