import { BookOpen } from "lucide-react";
import ScrollReveal from "@/components/ScrollReveal";

const examples = [
  {
    title: "Franchise Funding Example",
    description:
      "How a first-time franchise owner secured unsecured capital to cover startup costs and initial operations without pledging collateral.",
  },
  {
    title: "Service Business Financing Example",
    description:
      "How an established service business accessed operational growth capital to expand into a new market and hire key staff.",
  },
  {
    title: "Structured Capital Program Example",
    description:
      "How a founder combined multiple funding sources into a hybrid capital stack to maximize runway while retaining full equity.",
  },
];

const CapitalPathwayExamples = () => {
  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                Capital Pathway Examples
              </h2>
              <p className="text-muted-foreground mt-3 max-w-lg mx-auto leading-relaxed">
                Real-world examples of how founders and business owners have leveraged strategic capital partnerships.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
            {examples.map((ex, i) => (
              <ScrollReveal key={i} delay={i * 0.1}>
                <div className="bg-card border border-border rounded-2xl p-7 h-full hover:shadow-elevated hover:border-primary/15 transition-all duration-300">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-foreground text-base">
                        {ex.title}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-2.5 leading-relaxed">
                        {ex.description}
                      </p>
                      <p className="text-xs text-muted-foreground/50 mt-3 italic">
                        Full case study coming soon.
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default CapitalPathwayExamples;
