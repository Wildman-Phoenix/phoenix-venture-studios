import { Link } from "react-router-dom";
import { Sparkles, TrendingUp, BarChart3, Lightbulb } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const STEPS = [
  {
    step: 1,
    icon: Lightbulb,
    title: "Assess Your Position",
    description: "Use Venture Snapshot to better understand your market readiness, opportunity, and strategic direction.",
    link: "/snapshot",
  },
  {
    step: 2,
    icon: TrendingUp,
    title: "Explore Funding Paths",
    description: "Review the capital direction that best matches your stage, timing, and business profile.",
    link: "/funding",
  },
  {
    step: 3,
    icon: BarChart3,
    title: "Track Market Signals",
    description: "Use founder-friendly intelligence to stay aware of shifts in capital, AI, and business growth.",
    link: "/market-intelligence",
  },
  {
    step: 4,
    icon: Sparkles,
    title: "Make Smarter Next Moves",
    description: "Use better information to decide whether to validate further, pursue funding, or book a strategy conversation.",
    link: "/snapshot",
  },
];

const HowFoundersUse = () => (
  <section className="py-24 md:py-32 bg-background">
    <div className="container mx-auto px-4 sm:px-6 lg:px-8">
      <ScrollReveal>
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            How Founders, Operators, and Business Owners Use Phoenix Venture Studios
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Use the platform to clarify your business position, evaluate capital options, and move toward a smarter next step.
          </p>
        </div>
      </ScrollReveal>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7 max-w-5xl mx-auto">
        {STEPS.map((card, i) => (
          <ScrollReveal key={i} delay={i * 0.1}>
            <Link to={card.link} className="block h-full">
              <div className="bg-card border border-border rounded-2xl p-8 group hover:-translate-y-1.5 hover:shadow-elevated hover:border-primary/20 transition-all duration-300 h-full text-center relative">
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-md">
                  {card.step}
                </div>
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-6 mt-3 group-hover:bg-primary/20 transition-colors">
                  <card.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-heading font-bold text-foreground mb-3">
                  {card.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {card.description}
                </p>
              </div>
            </Link>
          </ScrollReveal>
        ))}
      </div>
    </div>
  </section>
);

export default HowFoundersUse;
