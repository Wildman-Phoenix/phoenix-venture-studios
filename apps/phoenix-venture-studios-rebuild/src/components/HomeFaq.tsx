import ScrollReveal from "@/components/ScrollReveal";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import JsonLdSchema from "@/components/JsonLdSchema";

const FAQ_ITEMS = [
  {
    q: "What is Founder Signal?",
    a: "Founder Signal is Phoenix Venture Studios' weekly briefing for founders and operators. It turns public AI, capital, and market stories into a smaller set of signals that are easier to understand and easier to use.",
  },
  {
    q: "What happens after I subscribe?",
    a: "You get the weekly briefing first. If one of the signals turns into a real business decision, Phoenix can then help with funding direction, Venture Snapshot work, or studio support.",
  },
  {
    q: "Is this only for startups?",
    a: "No. The site is built for founders, operators, agencies, consultants, service businesses, and growth-stage teams that need clearer strategic direction, not just venture-backed startups.",
  },
  {
    q: "How does the Funding Path work?",
    a: "The Funding Path helps you understand what kind of capital conversation makes sense next based on your stage, your needs, and your level of readiness. It is directional guidance, not a promise of approval.",
  },
  {
    q: "What is Venture Snapshot?",
    a: "Venture Snapshot is a lighter-weight strategic read on your business, capital readiness, and likely next priorities. It is meant to create clarity without overwhelming you.",
  },
  {
    q: "Are these funding options U.S.-focused?",
    a: "Current funding pathways are focused on U.S.-based lenders and U.S.-oriented capital opportunities. International options may be explored in the future.",
  },
  {
    q: "Do I need to disclose my full business concept?",
    a: "No. You can explore funding pathways and get strategic direction without disclosing your full concept. Share as much or as little as you're comfortable with.",
  },
  {
    q: "Is this financial advice?",
    a: "No. Phoenix Venture Studios provides strategic guidance and directional insight. It is not a lender, financial advisor, or investment firm. Use qualified professionals for financial, legal, and investment decisions.",
  },
];

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.a,
    },
  })),
};

const HomeFaq = () => (
  <section className="py-24 md:py-32 bg-secondary/30">
    <JsonLdSchema schema={faqSchema} />
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-3xl">
      <ScrollReveal>
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-foreground">
            Questions people usually have first
          </h2>
          <p className="mt-4 text-muted-foreground leading-relaxed">
            The main experience stays lean. If you want more detail, start here.
          </p>
        </div>
      </ScrollReveal>

      <ScrollReveal delay={0.1}>
        <Accordion type="single" collapsible className="w-full space-y-2">
          {FAQ_ITEMS.map((item, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="bg-card border border-border rounded-xl px-5">
              <AccordionTrigger className="text-left text-foreground font-medium text-base py-5 hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </ScrollReveal>
    </div>
  </section>
);

export default HomeFaq;
