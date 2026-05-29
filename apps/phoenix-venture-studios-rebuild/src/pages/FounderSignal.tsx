import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowRight,
  BriefcaseBusiness,
  CheckCircle2,
  ExternalLink,
  Mail,
  Newspaper,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import FormSecurityFields from "@/components/FormSecurityFields";
import PhoenixSignalImage from "@/components/PhoenixSignalImage";
import ScrollReveal from "@/components/ScrollReveal";
import { useFormSecurity } from "@/hooks/useFormSecurity";
import { useToast } from "@/hooks/use-toast";
import { isSupabaseConfigured, supabase } from "@/integrations/supabase/client";
import { loadStaticRssFeed, type StaticFeedArticle } from "@/lib/static-rss-feed";
import foundersImage from "@/assets/phoenix-operator-workspace-gpt.jpg";
import fundingImage from "@/assets/phoenix-capital-readiness-gpt.jpg";
import strategyImage from "@/assets/phoenix-strategy-room-gpt.jpg";
import lateNightImage from "@/assets/late-night-strategy.jpg";

const INTEREST_OPTIONS = [
  "Funding direction",
  "Using AI inside the business",
  "AI consulting or service offers",
  "Revenue and positioning opportunities",
  "Events, workshops, and live offers",
];

const HERO_POINTS = [
  "A smaller, cleaner weekly read",
  "Signals pulled from public sources",
  "Context built for real operators",
];

const IMAGE_RAIL = [
  { src: foundersImage, label: "Founder conversations" },
  { src: strategyImage, label: "Rollout planning" },
  { src: fundingImage, label: "Capital direction" },
  { src: lateNightImage, label: "Signal review" },
];

const DEEPER_CONTEXT = [
  {
    value: "what-it-is",
    title: "What Founder Signal actually is",
    body: "Founder Signal is a weekly briefing for entrepreneurs who want the useful read on AI, capital, and market pressure before the broader conversation turns noisy. The point is focus, not feed volume.",
  },
  {
    value: "what-happens-next",
    title: "What happens after the email",
    body: "The briefing comes first. If a signal points toward a real business need, Phoenix can help with funding direction, studio support, Venture Snapshot work, workshops, or other execution paths after the strategy is clearer.",
  },
  {
    value: "who-its-for",
    title: "Who it is for",
    body: "Founders, operators, consultants, agencies, small business owners, and AI-curious teams who want better context before they commit more attention, time, or money.",
  },
];

const DEFAULT_SIGNAL_IMAGE = `${import.meta.env.BASE_URL}images/signal-default.jpg`;

const SECONDARY_PATHS = [
  {
    icon: BriefcaseBusiness,
    title: "Need funding direction next?",
    text: "Move from the signal into a clearer capital conversation once you know what kind of opportunity or pressure is in front of you.",
    cta: "Explore funding paths",
    href: "/funding",
  },
  {
    icon: Sparkles,
    title: "Need help building the next move?",
    text: "Use Phoenix for advisory, AI rollout, landing pages, workshops, and execution support once the signal turns into a concrete project.",
    cta: "See studio support",
    href: "/studio",
  },
];

function getSignalLink(article: StaticFeedArticle) {
  return article.internalPath || "/founder-signal";
}

function getSignalImage(article: StaticFeedArticle) {
  return article.socialImageUrl || article.imageUrl || DEFAULT_SIGNAL_IMAGE;
}

function FeaturedSignalCard({
  article,
  loading,
}: {
  article?: StaticFeedArticle;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-[2rem] border border-white/50 bg-white/60 shadow-[0_30px_90px_-52px_rgba(18,60,105,0.8)] backdrop-blur">
        <div className="h-52 animate-pulse bg-[#d9e8e8]" />
        <div className="space-y-3 p-5">
          <div className="h-3 w-28 animate-pulse rounded-full bg-[#bdd6d7]" />
          <div className="h-6 w-10/12 animate-pulse rounded-full bg-[#cfdedd]" />
          <div className="h-6 w-8/12 animate-pulse rounded-full bg-[#cfdedd]" />
        </div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <Link
      to={getSignalLink(article)}
      className="group relative block overflow-hidden rounded-[2rem] border border-white/55 bg-white/[0.78] shadow-[0_30px_90px_-52px_rgba(18,60,105,0.86)] backdrop-blur transition hover:-translate-y-1 hover:border-[#f36c21]/45"
    >
      <div className="absolute inset-x-7 top-0 z-10 h-1 rounded-full bg-gradient-to-r from-[#8ed9d2] via-[#f36c21] to-[#123c69]" />
      <div className="relative aspect-[1200/630] overflow-hidden">
        <PhoenixSignalImage
          src={getSignalImage(article)}
          alt={`Founder Signal social card for ${article.headline}`}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#061a2f]/36 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
          <span className="rounded-full border border-white/60 bg-white/92 px-3 py-1 text-xs font-semibold text-[#123c69] shadow-sm">
            Featured signal
          </span>
        </div>
      </div>
      <div className="p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f36c21]">
          {article.source}
        </p>
        <h2 className="mt-3 font-heading text-2xl font-bold leading-tight text-[#123c69]">
          {article.headline}
        </h2>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#4b6f8b]">
          {article.whyItMatters || article.summary}
        </p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#6f8190]">
          {article.date}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#123c69] group-hover:text-[#f36c21]">
          Open the signal <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </Link>
  );
}

function FounderSignalSignup() {
  const [email, setEmail] = useState("");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const { toast } = useToast();

  const {
    honeypot,
    setHoneypot,
    turnstileRef,
    validateSubmission,
    isValidating,
    hasTurnstile,
  } = useFormSecurity("founder_signal");

  const toggleInterest = (interest: string) => {
    setSelectedInterests((current) =>
      current.includes(interest)
        ? current.filter((item) => item !== interest)
        : [...current, interest]
    );
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    if (!isSupabaseConfigured) {
      toast({
        title: "Signup temporarily unavailable",
        description: "Please try again later.",
      });
      return;
    }

    setLoading(true);
    try {
      const validation = await validateSubmission(trimmed);
      if (!validation.valid) return;

      const { data: subscribeResult, error: subscribeError } = await supabase.functions.invoke("submit-form", {
        body: {
          formType: "newsletter_subscribe",
          data: {
            email: trimmed,
            security_form_name: "founder_signal",
          },
        },
      });

      if (subscribeError || subscribeResult?.error) {
        throw subscribeError || new Error(subscribeResult?.error || "Subscription failed");
      }

      if (selectedInterests.length > 0) {
        const { data: profileResult, error: profileError } = await supabase.functions.invoke("submit-form", {
          body: {
            formType: "subscriber_profile",
            data: {
              email: trimmed,
              primary_interest: selectedInterests[0],
              interests: selectedInterests,
              current_stage: "founder_signal_interest_capture",
              feedback: "Founder Signal landing page interest capture",
              interactive_newsletter_preference: true,
              security_form_name: "founder_signal",
            },
          },
        });

        if (profileError || profileResult?.error) {
          toast({
            title: "Subscribed",
            description: "Your email is on the list. We could not save your topic preferences yet.",
          });
          setSubscribed(true);
          return;
        }
      }

      if (!subscribeResult?.already_subscribed) {
        supabase.functions.invoke("newsletter-welcome", { body: { email: trimmed } }).catch(() => {});
      }

      setSubscribed(true);
      toast({
        title: subscribeResult?.already_subscribed ? "Already subscribed" : "Subscribed",
        description: selectedInterests.length
          ? "Founder Signal will lean toward the topics you selected."
          : "You are on the Founder Signal list.",
      });
    } catch {
      toast({
        title: "Signup error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="join" className="relative overflow-hidden rounded-[2rem] border border-white/40 bg-white/[0.88] p-5 shadow-[0_28px_80px_-48px_rgba(17,60,105,0.65)] backdrop-blur md:p-7">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#f36c21] via-[#8ed9d2] to-[#123c69]" />
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f36c21]/10 text-[#f36c21]">
          <Mail className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#f36c21]">Weekly briefing</p>
          <h2 className="font-heading text-2xl font-bold text-[#123c69]">Get Founder Signal.</h2>
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-[#335d81]">
        Subscribe for a cleaner read on AI, capital, revenue opportunities, and founder pressure points that deserve attention now.
      </p>

      {!isSupabaseConfigured && (
        <div className="mt-5 rounded-2xl border border-[#f36c21]/25 bg-[#fff3eb] px-4 py-3 text-sm text-[#7a4a24]">
          <p className="font-semibold text-[#123c69]">Signup is temporarily unavailable.</p>
          <p className="mt-1">Please try again later.</p>
        </div>
      )}

      {subscribed ? (
        <div className="mt-7 rounded-2xl bg-[#123c69] px-5 py-6 text-white">
          <CheckCircle2 className="h-7 w-7 text-[#8ed9d2]" />
          <h3 className="mt-4 font-heading text-2xl font-bold">You are on the list.</h3>
          <p className="mt-2 text-sm leading-6 text-white/70">
            Watch your inbox for the next Founder Signal briefing and the clearest paths out of it.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-7 space-y-5">
          <FormSecurityFields honeypot={honeypot} setHoneypot={setHoneypot} turnstileRef={turnstileRef} hasTurnstile={hasTurnstile} />

          <div>
            <label htmlFor="founder-signal-email" className="text-sm font-semibold text-[#123c69]">
              Email
            </label>
            <Input
              id="founder-signal-email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="mt-2 h-[3.25rem] rounded-2xl border-[#d6c8b1] bg-white text-[#123c69] placeholder:text-[#6c7f8f]/60 focus-visible:ring-[#f36c21]"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-[#123c69]">What should we send you more of?</p>
            <p className="mt-1 text-xs text-[#57718a]">Optional. Choose one or more, or subscribe with email only.</p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {INTEREST_OPTIONS.map((interest) => {
                const active = selectedInterests.includes(interest);
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`rounded-full border px-4 py-2 text-left text-xs font-semibold transition ${
                      active
                ? "border-[#123c69] bg-[linear-gradient(135deg,#123c69,#0b2a49)] text-white shadow-sm"
                        : "border-[#d9cdbb] bg-white/80 text-[#335d81] hover:border-[#f36c21] hover:text-[#123c69]"
                    }`}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          <Button type="submit" disabled={loading || isValidating} className="h-[3.25rem] w-full rounded-2xl bg-[linear-gradient(135deg,#f36c21,#d95615)] text-base font-semibold text-white shadow-[0_18px_40px_-24px_rgba(243,108,33,0.9)] hover:bg-[#d95615]">
            {loading || isValidating ? "Saving..." : "Subscribe to Founder Signal"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-xs leading-5 text-[#6b7f91]">
            No spam. Unsubscribe anytime. Funding notes are informational and do not guarantee approval, terms, or outcomes.
          </p>
        </form>
      )}
    </div>
  );
}

function useAiAttentionSignals() {
  const [articles, setArticles] = useState<StaticFeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    loadStaticRssFeed(5, "ai-attention.json")
      .then((feed) => {
        if (!active) return;
        setArticles(feed.articles);
        setError("");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Founder Signal feed unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { articles, loading, error };
}

export default function FounderSignal() {
  const { articles, loading, error } = useAiAttentionSignals();
  const featuredSignal = articles[0];
  const topSignals = useMemo(() => articles.slice(0, 4), [articles]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f5efe4] text-[#123c69]">
      <section className="relative overflow-hidden pt-32 pb-20 md:pt-40 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(142,217,210,0.55),transparent_30rem),radial-gradient(circle_at_84%_16%,rgba(243,108,33,0.18),transparent_24rem),linear-gradient(180deg,#f8f4ea_0%,#f5efe4_58%,#ecdfcc_100%)]" />
        <div className="absolute left-1/2 top-20 h-px w-[82vw] -translate-x-1/2 bg-gradient-to-r from-transparent via-[#123c69]/20 to-transparent" />

        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-14 lg:items-start">
            <ScrollReveal className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#123c69]/10 bg-white/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#315f87] shadow-sm backdrop-blur">
                <Mail className="h-4 w-4 text-[#f36c21]" />
                Founder Signal
              </div>

              <h1 className="mt-7 max-w-full break-words font-heading text-[2rem] font-bold leading-[1.08] tracking-normal text-[#123c69] sm:text-5xl md:max-w-4xl md:text-7xl md:leading-[1.02]">
                A weekly signal briefing for founders who want the useful read before the noise.
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#335d81] md:text-xl md:leading-9">
                Founder Signal turns current AI, capital, and operator pressure into a smaller read you can actually use.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {HERO_POINTS.map((point) => (
                  <div key={point} className="flex items-center gap-2 rounded-full border border-white/70 bg-white/[0.65] px-4 py-2 text-sm font-medium text-[#335d81] shadow-sm backdrop-blur">
                    <CheckCircle2 className="h-4 w-4 text-[#f36c21]" />
                    {point}
                  </div>
                ))}
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <a href="#join">
                  <Button size="lg" className="h-14 rounded-2xl bg-[#123c69] px-8 text-base font-semibold text-white shadow-[0_20px_50px_-28px_rgba(18,60,105,0.9)] hover:bg-[#0c2c50]">
                    Subscribe to Founder Signal <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </a>
                <a href="#signals">
                  <Button size="lg" variant="outline" className="h-14 rounded-2xl border-[#123c69]/20 bg-white/50 px-8 text-base font-semibold text-[#123c69] hover:bg-white">
                    See this week's signals
                  </Button>
                </a>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.12} className="space-y-5 lg:col-span-5">
              <FeaturedSignalCard article={featuredSignal} loading={loading} />
              <FounderSignalSignup />
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="hidden overflow-hidden border-y border-[#d8c9b4] bg-[#113b63] py-8 text-white md:block">
        <div className="flex w-max gap-5 px-5 animate-founder-rail">
          {[...IMAGE_RAIL, ...IMAGE_RAIL].map((image, index) => (
            <div key={`${image.label}-${index}`} className="group relative h-48 w-72 overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/10 shadow-[0_24px_70px_-36px_rgba(0,0,0,0.6)] md:h-56 md:w-96">
              <img src={image.src} alt={image.label} className="h-full w-full object-cover opacity-[0.86] transition duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#061a2f]/70 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 rounded-full bg-white/[0.12] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur">
                {image.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="signals" className="py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
            <ScrollReveal className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full bg-[#123c69]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#315f87]">
                <Newspaper className="h-4 w-4 text-[#f36c21]" />
                Current signals
              </div>
              <h2 className="mt-5 max-w-3xl font-heading text-4xl font-bold leading-tight tracking-normal text-[#123c69] md:text-6xl">
                What is worth watching right now.
              </h2>
            </ScrollReveal>
            <ScrollReveal delay={0.1} className="lg:col-span-5">
              <p className="text-lg leading-8 text-[#486f8c]">
                These selected stories point to shifts in AI adoption, capital readiness, and operator behavior. Read the Phoenix take first, then open the original source when you want the deeper read.
              </p>
            </ScrollReveal>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-4">
            {loading && [0, 1, 2, 3].map((item) => (
              <div key={item} className="h-72 animate-pulse rounded-[1.75rem] border border-white/70 bg-white/[0.55]" />
            ))}

            {!loading && error && (
              <div className="rounded-[1.75rem] border border-[#f36c21]/25 bg-white/75 p-6 text-[#7a4a24] lg:col-span-4">
                <p className="font-semibold text-[#123c69]">Founder Signal needs a refresh.</p>
                <p className="mt-2 text-sm leading-6">{error}</p>
              </div>
            )}

            {!loading && !error && topSignals.map((article) => (
              <ScrollReveal key={article.id || article.url} className="h-full">
                <article className="flex h-full overflow-hidden rounded-[1.75rem] border border-white/70 bg-white/80 shadow-[0_26px_70px_-48px_rgba(18,60,105,0.75)] backdrop-blur">
                  <div className="flex h-full w-full flex-col">
                    <Link to={getSignalLink(article)} className="group block">
                      <div className="relative aspect-[1200/630] overflow-hidden">
                        <PhoenixSignalImage
                          src={getSignalImage(article)}
                          alt={`Founder Signal social card for ${article.headline}`}
                          className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]"
                          loading="lazy"
                        />
                        <span className="absolute bottom-4 left-4 rounded-full border border-white/60 bg-white/92 px-3 py-1 text-xs font-semibold text-[#123c69] shadow-sm">
                          {article.source}
                        </span>
                      </div>
                    </Link>
                    <div className="flex flex-1 flex-col p-5">
                      <div className="mb-4 h-1 w-16 rounded-full bg-gradient-to-r from-[#f36c21] to-[#8ed9d2]" />
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f36c21]">
                          {article.editorialCategory || "Founder Signal"}
                        </p>
                        <span className="text-xs font-medium text-[#6f8190]">{article.date}</span>
                      </div>
                      <h3 className="mt-4 font-heading text-2xl font-bold leading-tight tracking-normal text-[#123c69]">
                        {article.headline}
                      </h3>
                      <p className="mt-4 line-clamp-4 text-sm leading-6 text-[#4b6f8b]">
                        {article.whyItMatters || article.summary || "A current founder signal selected by Phoenix."}
                      </p>
                      <div className="mt-auto pt-6">
                        <div className="flex flex-col gap-2">
                          <Link to={getSignalLink(article)}>
                            <Button variant="outline" className="w-full rounded-2xl border-[#123c69]/15 bg-white text-[#123c69] hover:bg-[#123c69] hover:text-white">
                              Read the signal
                            </Button>
                          </Link>
                          {article.originalUrl && (
                            <a href={article.originalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 text-xs font-semibold text-[#5f788d] hover:text-[#f36c21]">
                              See original article <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fdfaf4] py-20 md:py-28">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
            <ScrollReveal className="lg:col-span-5">
              <div className="sticky top-28">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f36c21]/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-[#b44b16]">
                  <ShieldCheck className="h-4 w-4" />
                  Keep it useful
                </div>
                <h2 className="mt-5 font-heading text-4xl font-bold leading-tight tracking-normal text-[#123c69] md:text-5xl">
                Founder Signal should feel worth opening before it ever asks for the next step.
                </h2>
                <p className="mt-5 text-lg leading-8 text-[#486f8c]">
                  The first job is utility. The briefing should feel worth opening even if the reader never moves into funding, consulting, events, or studio support.
                </p>
              </div>
            </ScrollReveal>

            <div className="space-y-5 lg:col-span-7">
              <ScrollReveal>
                <div className="rounded-[2rem] border border-[#dfd3c0] bg-white p-6 shadow-[0_24px_80px_-52px_rgba(18,60,105,0.45)] md:p-8">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f36c21]">If you want more context</p>
                  <h3 className="mt-4 font-heading text-3xl font-bold text-[#123c69]">
                    Go deeper without making the first read heavier.
                  </h3>
                  <Accordion type="single" collapsible className="mt-6 space-y-3">
                    {DEEPER_CONTEXT.map((item) => (
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
                </div>
              </ScrollReveal>

              {SECONDARY_PATHS.map((path, index) => (
                <ScrollReveal key={path.title} delay={index * 0.08}>
                  <Link to={path.href} className="group block rounded-[2rem] border border-[#dfd3c0] bg-[#f8f2e8] p-6 transition hover:-translate-y-1 hover:border-[#f36c21]/40 hover:shadow-[0_28px_80px_-52px_rgba(18,60,105,0.75)] md:p-8">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center rounded-2xl bg-white text-[#f36c21] shadow-sm">
                          <path.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <h3 className="font-heading text-2xl font-bold text-[#123c69]">{path.title}</h3>
                          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#486f8c]">{path.text}</p>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-[#123c69] group-hover:text-[#f36c21]">
                        {path.cta} <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0b2a49] py-20 text-white md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(142,217,210,0.22),transparent_28rem),radial-gradient(circle_at_88%_35%,rgba(243,108,33,0.18),transparent_24rem)]" />
        <div className="container relative z-10 mx-auto px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-[#f36c21]">
            <TrendingUp className="h-7 w-7" />
          </div>
          <h2 className="mx-auto mt-7 max-w-3xl font-heading text-4xl font-bold leading-tight tracking-normal md:text-6xl">
            Start with the signal. Add the next layer only when it is earned.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-white/70">
            Subscribe first. If a funding, consulting, workshop, or rollout path makes sense after that, Phoenix can help shape it.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <a href="#join">
              <Button size="lg" className="h-14 rounded-2xl bg-[#f36c21] px-8 text-base font-semibold text-white hover:bg-[#d95615]">
                Subscribe to Founder Signal
              </Button>
            </a>
            <a href="#signals">
              <Button size="lg" variant="outline" className="h-14 rounded-2xl border-white/25 bg-transparent px-8 text-base font-semibold text-white hover:bg-white hover:text-[#123c69]">
                See current signals <Newspaper className="ml-2 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
