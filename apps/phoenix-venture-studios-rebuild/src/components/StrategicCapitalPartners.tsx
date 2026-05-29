import { CheckCircle2, DollarSign, Building, Layers, Briefcase, ExternalLink, FileText, BookOpen, ArrowRight, Receipt, CreditCard, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import ScrollReveal from "@/components/ScrollReveal";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import { Link } from "react-router-dom";

const partners = [
  {
    name: "Preferred Funding Group",
    icon: DollarSign,
    categoryLabel: "Unsecured Business Funding",
    description:
      "Unsecured funding programs and business credit pathways designed for entrepreneurs seeking capital without collateral.",
    highlights: [
      "Unsecured term programs",
      "Business credit programs",
      "Fast funding timelines",
      "No collateral required",
    ],
    buttons: [
      {
        label: "View Program Overview",
        href: "/Preferred_Funding_Group_Overview.pdf",
        icon: FileText,
        variant: "outline" as const,
      },
      {
        label: "Explore Funding Options",
        href: "/preferred-funding",
        icon: ArrowRight,
        variant: "default" as const,
        internal: true,
      },
    ],
  },
  {
    name: "Lendzee",
    subtitle: "Rising Phoenix",
    icon: Layers,
    categoryLabel: "Structured Capital Pathways",
    description:
      "Structured capital pathways and alternative funding alignment for founders seeking flexible capital options.",
    highlights: [
      "Structured capital programs",
      "Hybrid capital structures",
      "Alternative underwriting",
      "Founder-friendly process",
    ],
    buttons: [
      {
        label: "Explore Lendzee Capital Options",
        href: "https://lendzee.ai/rising-phoenix-business-services",
        icon: ExternalLink,
        variant: "default" as const,
      },
    ],
  },
  {
    name: "Rock Financial",
    icon: Briefcase,
    categoryLabel: "Service Business Financing",
    description:
      "Financing programs designed for service-based businesses and operational growth.",
    highlights: [
      "Service business financing",
      "Operational growth capital",
      "Flexible business funding",
    ],
    buttons: [
      {
        label: "Explore Rock Financial Programs",
        href: "https://go.mypartner.io/business-financing/?ref=0014x000022lWItAAM",
        icon: ExternalLink,
        variant: "default" as const,
      },
    ],
  },
  {
    name: "Invoice Financing",
    subtitle: "Accounts Receivable Funding",
    icon: Receipt,
    categoryLabel: "Invoice Financing",
    description:
      "Funding programs that unlock working capital tied up in unpaid invoices.",
    highlights: [
      "Funding in as little as 24 hours",
      "Ongoing funding as invoices are generated",
      "No personal guarantees for qualifying clients",
      "High advance rates on receivables",
    ],
    bestFor: [
      "B2B companies",
      "Businesses issuing invoices on payment terms",
      "Companies needing faster cash flow",
      "Businesses scaling and needing reliable working capital",
    ],
    buttons: [
      {
        label: "Request Invoice Financing Review",
        href: "/sigma-funding",
        icon: ArrowRight,
        variant: "default" as const,
        internal: true,
      },
    ],
  },
];

const caseStudies = [
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

const capitalPathways = [
  {
    icon: CreditCard,
    title: "Business Credit Programs",
    desc: "Unsecured funding and credit-based capital for founders building or expanding businesses.",
  },
  {
    icon: Layers,
    title: "Structured Capital Programs",
    desc: "Hybrid and alternative funding structures designed for flexible capital deployment.",
  },
  {
    icon: Receipt,
    title: "Invoice Financing",
    desc: "Unlock working capital tied up in unpaid invoices with accounts receivable funding.",
  },
  {
    icon: TrendingUp,
    title: "Growth Capital",
    desc: "Financing programs for service businesses and operational expansion.",
  },
];

const StrategicCapitalPartners = () => {
  return (
    <>
      {/* Capital Pathways Overview */}
      <section className="py-12 md:py-16 bg-secondary/30 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-5xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-3">
                  Capital Pathways
                </h2>
                <p className="max-w-2xl mx-auto text-muted-foreground">
                  Phoenix Venture Studios provides access to multiple capital pathways based on your business stage, funding needs, and growth goals.
                </p>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {capitalPathways.map((pathway, i) => (
                <ScrollReveal key={i} delay={i * 0.08}>
                  <div className="text-center p-5">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <pathway.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-heading font-semibold text-foreground mb-1 text-sm">{pathway.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{pathway.desc}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-12">
                <h2 className="text-2xl md:text-3xl font-heading font-bold text-foreground mb-4">
                  Strategic Capital Pathways
                </h2>
                <p className="max-w-2xl mx-auto leading-relaxed text-muted-foreground">
                  Phoenix Venture Studios works with select capital partners who provide access to
                  funding structures that may not always be available through traditional bank pathways.
                </p>
              </div>
            </ScrollReveal>

            {/* Partner Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {partners.map((partner, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <div className="card-elevated p-6 rounded-2xl h-full flex flex-col">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <partner.icon className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        {partner.categoryLabel && (
                          <span className="text-[10px] uppercase tracking-wider text-primary font-semibold">{partner.categoryLabel}</span>
                        )}
                        <h3 className="text-lg font-heading font-bold text-foreground">
                          {partner.name}
                        </h3>
                        {partner.subtitle && (
                          <span className="text-xs text-muted-foreground font-medium">{partner.subtitle}</span>
                        )}
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                      {partner.description}
                    </p>

                    {/* Best For section */}
                    {partner.bestFor && (
                      <div className="mb-4">
                        <p className="text-xs font-medium text-foreground mb-2">Best suited for:</p>
                        <ul className="space-y-1">
                          {partner.bestFor.map((item, j) => (
                            <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Bullet highlights */}
                    <div className="mb-4">
                      <p className="text-xs font-medium text-foreground mb-2">Highlights:</p>
                      <ul className="space-y-1.5">
                        {partner.highlights.map((h, j) => (
                          <li key={j} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                            {h}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Buttons */}
                    <div className="mt-auto flex flex-col gap-2">
                      {partner.buttons.map((btn, k) => {
                        const isExternal = !btn.internal && btn.href.startsWith("http");
                        const isPdf = btn.href.endsWith(".pdf");
                        const ButtonIcon = btn.icon;

                        if (btn.internal) {
                          return (
                            <Link key={k} to={btn.href}>
                              <Button 
                                className={btn.variant === "default" ? "btn-primary w-full text-sm py-5" : "btn-outline-gold w-full text-sm py-5"}
                              >
                                {btn.label}
                                <ButtonIcon className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          );
                        }

                        if (btn.variant === "default") {
                          return (
                            <a
                              key={k}
                              href={btn.href}
                              target={isExternal || isPdf ? "_blank" : undefined}
                              rel={isExternal ? "noopener noreferrer" : undefined}
                            >
                              <Button className="btn-primary w-full text-sm py-5">
                                {btn.label}
                                <ButtonIcon className="ml-2 h-4 w-4" />
                              </Button>
                            </a>
                          );
                        }

                        return (
                          <a
                            key={k}
                            href={btn.href}
                            target={isExternal || isPdf ? "_blank" : undefined}
                            rel={isExternal ? "noopener noreferrer" : undefined}
                          >
                            <Button variant="outline" className="btn-outline-gold w-full text-sm py-5">
                              {btn.label}
                              <ButtonIcon className="ml-2 h-4 w-4" />
                            </Button>
                          </a>
                        );
                      })}
                    </div>
                  </div>
                </ScrollReveal>
              ))}
            </div>

            {/* Advisory note */}
            <ScrollReveal>
              <div className="mt-12 text-center max-w-2xl mx-auto">
                <p className="font-heading font-semibold text-foreground mb-2">
                  Not every capital pathway fits every founder.
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Phoenix Venture Studios helps identify which partner or structure may be worth
                  exploring based on timing, business stage, and capital goals.
                </p>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Capital Pathway Examples */}
      <section className="py-12 md:py-16 bg-secondary/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <ScrollReveal>
              <div className="text-center mb-8">
                <h2 className="text-xl md:text-2xl font-heading font-bold text-foreground">
                  Capital Pathway Examples
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  Real-world examples of how founders have leveraged strategic capital partnerships.
                </p>
              </div>
            </ScrollReveal>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {caseStudies.map((cs, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <CaseStudyCard title={cs.title} description={cs.description} />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

function CaseStudyCard({ title, description }: { title: string; description: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="card-elevated rounded-xl overflow-hidden">
        <CollapsibleTrigger className="w-full text-left p-5 flex items-start gap-3 group cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading font-semibold text-foreground text-sm group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Click to expand</p>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-5 pb-5 pt-0">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
            <p className="text-xs text-muted-foreground/60 mt-3 italic">
              Full case study coming soon.
            </p>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export default StrategicCapitalPartners;
