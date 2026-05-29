import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Mail,
  Quote,
  Shield,
  Sparkles,
  Wand2,
} from "lucide-react";
import MarketIntelligencePreview from "@/components/MarketIntelligencePreview";
import NewsletterSignup from "@/components/NewsletterSignup";
import ScrollReveal from "@/components/ScrollReveal";
import JsonLdSchema from "@/components/JsonLdSchema";
import heroImage from "@/assets/hero-entrepreneur-v2.jpg";
import advisorImage from "@/assets/advisor-portrait-premium-gpt.jpg";
import strategyImage from "@/assets/phoenix-strategy-room-gpt.jpg";
import foundersImage from "@/assets/phoenix-operator-workspace-gpt.jpg";

const homepageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Phoenix Venture Studios",
    url: "https://phoenixventurestudios.com",
    description: "Founder Signal, funding guidance, and practical studio support for entrepreneurs navigating AI and growth decisions.",
    founder: { "@type": "Person", name: "Nathan Wildman" },
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Phoenix Venture Studios",
    url: "https://phoenixventurestudios.com",
    description: "A subscribe-first founder platform that helps entrepreneurs read the signal, choose a funding path, and build the next move with clarity.",
  },
];

const TRUST_POINTS = [
  "Weekly signal briefings built from public sources",
  "Clear funding direction without hype or pressure",
  "Done-with-you studio support when the next move needs execution",
];

const SECONDARY_PATHS = [
  {
    icon: Compass,
    title: "Get clearer on funding",
    description: "Use the funding path when you need to understand what kind of capital conversation makes sense next.",
    to: "/funding",
    cta: "Explore funding paths",
  },
  {
    icon: Wand2,
    title: "Build with Phoenix",
    description: "Move into advisory, AI rollout, landing pages, or positioning support once the strategy is clear enough to act on.",
    to: "/studio",
    cta: "See studio support",
  },
];

const AUTHORITY_POINTS = [
  "Tighter positioning before you spend money on traffic or tools",
  "A cleaner narrative before you walk into a funding conversation",
  "A practical read on AI without getting trapped in trend-chasing",
];

const DETAIL_ITEMS = [
  {
    value: "what-you-get",
    title: "What you get when you subscribe",
    body: "Founder Signal is a concise read on the stories, shifts, and pressure points that matter to operators right now. The goal is not volume. The goal is a sharper next decision.",
  },
  {
    value: "how-phoenix-fits",
    title: "How Phoenix fits after the signal",
    body: "When a signal becomes a real business move, Phoenix can help shape the page, the offer, the AI rollout, the workshop path, or the funding conversation behind it.",
  },
  {
    value: "who-this-is-for",
    title: "Who this is built for",
    body: "Founders, operators, service businesses, consultants, agencies, and people building a modern business who want clear direction before they commit more time, money, or attention.",
  },
];

const SUPPORT_IMAGES = [
  {
    src: strategyImage,
    alt: "Strategy session planning",
    eyebrow: "Signal review",
    title: "Translate the story into a decision.",
    className: "col-span-2 aspect-[1.55/1]",
    imageClassName: "object-[center_42%]",
  },
  {
    src: foundersImage,
    alt: "Founder collaboration session",
    eyebrow: "Build support",
    title: "Turn clarity into execution.",
    className: "col-span-2 aspect-[1.55/1]",
    imageClassName: "object-[center_42%]",
  },
];

const Index = () => {
  return (
    <div className="min-h-screen overflow-hidden bg-background">
      <JsonLdSchema schema={homepageSchema} />

      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_16%_12%,rgba(142,217,210,0.34),transparent_28rem),radial-gradient(circle_at_76%_8%,rgba(243,108,33,0.18),transparent_26rem),linear-gradient(180deg,#f8f5ef_0%,#f4ede2_48%,#f8f5ef_100%)]" />
        <div className="absolute inset-y-0 right-0 hidden w-[44%] lg:block">
          <img
            src={heroImage}
            alt=""
            className="h-full w-full object-cover object-[72%_center] opacity-[0.18] saturate-[0.72] contrast-[1.04]"
          />
          <div className="absolute inset-0 bg-[linear-gradient(270deg,rgba(18,60,105,0.3)_0%,rgba(18,60,105,0.1)_34%,rgba(248,245,239,0.04)_62%,rgba(248,245,239,0.94)_100%)]" />
          <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#f4ede2] to-transparent" />
        </div>
        <div className="absolute left-1/2 top-24 h-px w-[86vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#123c69]/18 to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-px w-[86vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#f36c21]/22 to-transparent" />

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <ScrollReveal className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#123c69]/10 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#325c82] shadow-sm">
                <Mail className="h-4 w-4 text-[#f36c21]" />
                Founder Signal
              </div>

              <h1 className="mt-7 max-w-4xl font-heading text-[2.5rem] font-bold leading-[1.04] tracking-normal text-[#123c69] sm:text-6xl md:text-7xl">
                Read what matters first, then decide what to do with it.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#456d8d] md:text-xl md:leading-9">
                Phoenix Venture Studios helps entrepreneurs stay oriented through AI shifts, funding questions, and changing market pressure without losing the plot in noise, jargon, or trend-chasing.
              </p>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
                <Link to="/founder-signal">
                  <Button size="lg" className="h-14 rounded-2xl bg-[linear-gradient(135deg,#123c69_0%,#0b2a49_58%,#f36c21_160%)] px-8 text-base font-semibold text-white shadow-[0_24px_58px_-28px_rgba(18,60,105,0.95)] hover:bg-[#0c2c50]">
                    Subscribe to Founder Signal <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/market-intelligence" className="inline-flex items-center text-sm font-semibold text-[#123c69] transition hover:text-[#f36c21]">
                  See current signals <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>

              <div className="mt-10 grid max-w-3xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[#d9cdbb] bg-[#d9cdbb] sm:grid-cols-3">
                {TRUST_POINTS.map((item) => (
                  <div key={item} className="relative overflow-hidden bg-white/72 px-4 py-4 text-sm leading-6 text-[#456d8d] backdrop-blur">
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-[#8ed9d2]/55 via-[#f36c21]/55 to-[#123c69]/25" />
                    <CheckCircle2 className="mb-2 h-4 w-4 text-[#f36c21]" />
                    {item}
                  </div>
                ))}
              </div>

              <p className="mt-5 max-w-xl text-sm text-[#6b7f91]">
                Funding guidance is educational and directional. No approval, capital outcome, or business result is guaranteed.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.1} className="lg:col-span-5">
              <div className="relative overflow-hidden rounded-[1.8rem] border border-[#d9cdbb] bg-[#efe5d6] shadow-[0_42px_110px_-58px_rgba(18,60,105,0.62)]">
                <div className="absolute inset-x-8 top-0 h-1 rounded-full bg-gradient-to-r from-[#8ed9d2] via-[#f36c21] to-[#123c69]" />
                <div className="border-b border-[#d8c9b4] bg-[linear-gradient(180deg,rgba(255,255,255,0.66)_0%,rgba(255,255,255,0.22)_100%)] px-6 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b44b16]">Founder-led guidance</p>
                      <p className="mt-1 text-sm font-medium text-[#456d8d]">Phoenix Venture Studios</p>
                    </div>
                    <div className="rounded-full border border-[#123c69]/10 bg-white/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#123c69]">
                      Traverse City, MI
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_14%,rgba(255,255,255,0.26),transparent_24%),linear-gradient(180deg,rgba(10,29,49,0.02)_0%,rgba(10,29,49,0.22)_100%)]" />
                  <img
                    src={advisorImage}
                    alt="Nathan Wildman"
                    className="aspect-[4/4.55] w-full scale-[1.04] object-cover object-[center_13%] brightness-[0.86] contrast-[1.14] saturate-[0.78]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061a2f]/88 via-[#123c69]/18 to-transparent" />
                  <div className="absolute left-5 top-5 border-l-2 border-[#8ed9d2] bg-[#061a2f]/36 px-4 py-3 text-white backdrop-blur-md">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8ed9d2]">Nathan Wildman</p>
                    <p className="mt-1 text-sm font-medium text-white/86">Founder, Phoenix Venture Studios</p>
                  </div>
                  <div className="absolute bottom-5 left-5 right-5 border-t border-white/22 pt-5 text-white">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8ed9d2]">Founder perspective</p>
                    <p className="mt-3 font-heading text-2xl font-bold leading-tight">
                      Clarity first. Better moves second.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/76">
                      The signal is only useful if it helps you choose the next conversation, the next offer, or the next build with more confidence.
                    </p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="border-y border-[#d9cdbb] bg-[#113b63] py-6 text-white">
        <div className="container mx-auto flex flex-wrap items-center justify-center gap-4 px-4 text-center sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8ed9d2]">
                <Shield className="h-4 w-4" />
            Start with Founder Signal
          </span>
          <p className="max-w-3xl text-sm leading-6 text-white/76">
            Start with the weekly signal, then move into funding, execution, or advisory support only when you need the next layer.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
            <ScrollReveal className="lg:col-span-5">
              <div className="grid grid-cols-2 gap-4">
                {SUPPORT_IMAGES.map((image) => (
                  <div
                    key={image.title}
                    className={`${image.className} group relative overflow-hidden rounded-[1.8rem] border border-[#dfd3c0] bg-[#f3eadb] shadow-[0_22px_56px_-40px_rgba(18,60,105,0.42)]`}
                  >
                    <img
                      src={image.src}
                      alt={image.alt}
                      className={`h-full w-full ${image.imageClassName} object-cover transition duration-700 group-hover:scale-[1.03]`}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#123c69]/78 via-[#123c69]/16 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8ed9d2]">{image.eyebrow}</p>
                      <p className="mt-2 max-w-[16rem] font-heading text-xl font-bold leading-tight text-white">
                        {image.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.12} className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#f36c21]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#b44b16]">
                <Sparkles className="h-4 w-4" />
                After the signal
              </div>
              <h2 className="mt-5 max-w-3xl font-heading text-4xl font-bold leading-tight tracking-normal text-[#123c69] md:text-6xl">
                When the story becomes real, Phoenix helps shape the move.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#486f8c]">
                Founder Signal is the starting point. The advisory, funding, and build work come after you have enough clarity to act. That keeps the first experience useful instead of sales-heavy.
              </p>

              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {AUTHORITY_POINTS.map((item) => (
                  <div key={item} className="rounded-[1.35rem] border border-[#dfd3c0] bg-[#fbf6ee] px-4 py-4 text-sm leading-6 text-[#456d8d]">
                    <CheckCircle2 className="mb-2 h-4 w-4 text-[#f36c21]" />
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2">
                {SECONDARY_PATHS.map((path, index) => (
                  <ScrollReveal key={path.title} delay={index * 0.06}>
                    <Link to={path.to} className="group relative block h-full overflow-hidden rounded-[1.75rem] border border-[#dfd3c0] bg-white p-5 shadow-[0_18px_40px_-34px_rgba(18,60,105,0.32)] transition hover:-translate-y-1 hover:border-[#f36c21]/35 hover:shadow-[0_24px_64px_-42px_rgba(18,60,105,0.5)]">
                      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#8ed9d2]/70 via-[#f36c21]/60 to-[#123c69]/25 opacity-0 transition group-hover:opacity-100" />
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#123c69]/8 text-[#123c69] transition group-hover:bg-[#123c69] group-hover:text-white">
                        <path.icon className="h-5 w-5" />
                      </div>
                      <h3 className="mt-5 font-heading text-2xl font-bold text-[#123c69]">{path.title}</h3>
                      <p className="mt-3 text-sm leading-6 text-[#58728b]">{path.description}</p>
                      <span className="mt-5 inline-flex items-center text-sm font-semibold text-[#123c69] group-hover:text-[#f36c21]">
                        {path.cta} <ArrowRight className="ml-2 h-4 w-4" />
                      </span>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <MarketIntelligencePreview />

      <section className="bg-[#fdfaf4] py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[2rem] border border-[#dfd3c0] bg-white/78 p-6 shadow-[0_28px_84px_-58px_rgba(18,60,105,0.55)] backdrop-blur md:p-8">
            <ScrollReveal>
              <div className="flex items-start gap-4">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#123c69] text-white">
                  <Quote className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f36c21]">If you want more context</p>
                  <h2 className="mt-3 font-heading text-3xl font-bold text-[#123c69] md:text-4xl">
                    Go deeper without breaking the flow.
                  </h2>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-[#58728b]">
                    The main experience stays concise. The extra context lives here so interested readers can keep going without making the read heavier than it needs to be.
                  </p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.08}>
              <Accordion type="single" collapsible className="mt-8 space-y-3">
                {DETAIL_ITEMS.map((item) => (
                  <AccordionItem key={item.value} value={item.value} className="rounded-[1.35rem] border border-[#e6d9c6] bg-[#fbf6ee] px-5">
                    <AccordionTrigger className="py-5 text-left font-heading text-xl font-bold text-[#123c69] hover:no-underline">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-7 text-[#58728b]">
                      {item.body}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <NewsletterSignup />

      <section className="relative overflow-hidden py-20 md:py-28">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/40 to-background" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f36c21]">Start here</p>
              <h2 className="mt-4 font-heading text-4xl font-bold leading-tight text-[#123c69] md:text-6xl">
                Subscribe first. Move when the signal becomes real.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-[#58728b]">
                That might be a funding path, a Venture Snapshot, or direct studio help. The order matters. Clarity comes before complexity.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/founder-signal">
                  <Button size="lg" className="h-14 rounded-2xl bg-[#123c69] px-8 text-base font-semibold text-white hover:bg-[#0c2c50]">
                    Subscribe to Founder Signal
                  </Button>
                </Link>
                <Link to="/market-intelligence">
                  <Button size="lg" variant="outline" className="h-14 rounded-2xl border-[#123c69]/15 bg-white/70 px-8 text-base font-semibold text-[#123c69] hover:bg-white">
                    See current signals
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
