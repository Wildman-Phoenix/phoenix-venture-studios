import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Mail,
  Newspaper,
  Share2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import PhoenixSignalImage from "@/components/PhoenixSignalImage";
import ScrollReveal from "@/components/ScrollReveal";
import { loadStaticRssFeed, type StaticFeedArticle } from "@/lib/static-rss-feed";

const DEFAULT_SIGNAL_IMAGE = `${import.meta.env.BASE_URL}images/signal-default.jpg`;

function signalMatchesSlug(article: StaticFeedArticle, slug?: string) {
  if (!slug) return false;
  return (
    article.slug === slug ||
    article.internalPath?.split("/").filter(Boolean).pop() === slug ||
    article.url?.includes(`/founder-signal/signals/${slug}`)
  );
}

function trimDescription(value = "", maxLength = 165) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 1).trim()}...`;
}

function upsertMeta(selector: string, attribute: "name" | "property", name: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function useSignalArticle(slug?: string) {
  const [articles, setArticles] = useState<StaticFeedArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    Promise.allSettled([
      loadStaticRssFeed(20, "ai-attention.json"),
      loadStaticRssFeed(20, "feed.json"),
    ])
      .then((results) => {
        if (!active) return;

        const merged = results.flatMap((result) =>
          result.status === "fulfilled" ? result.value.articles : []
        );
        const seen = new Set<string>();
        const unique = merged.filter((article) => {
          const key = article.slug || article.internalPath || article.url || article.headline;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        setArticles(unique);
        setError(unique.length ? "" : "No static signal articles are available yet.");
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Signal feed unavailable");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const article = useMemo(
    () => articles.find((candidate) => signalMatchesSlug(candidate, slug)),
    [articles, slug]
  );

  return { article, loading, error };
}

export default function FounderSignalDetail() {
  const { slug } = useParams();
  const { article, loading, error } = useSignalArticle(slug);
  const imageUrl = article?.socialImageUrl || article?.imageUrl || DEFAULT_SIGNAL_IMAGE;
  const description = trimDescription(article?.whyItMatters || article?.summary || "A Phoenix Founder Signal briefing for entrepreneurs.");

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [slug]);

  useEffect(() => {
    if (!article) return;

    const title = `${article.headline} | Founder Signal`;
    document.title = title;
    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:image"]', "property", "og:image", imageUrl);
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", imageUrl);
  }, [article, description, imageUrl]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5efe4] px-4 pt-32 text-[#123c69]">
        <div className="container mx-auto max-w-5xl">
          <div className="h-[32rem] animate-pulse rounded-[2.5rem] bg-white/60 shadow-[0_30px_90px_-58px_rgba(18,60,105,0.75)]" />
        </div>
      </div>
    );
  }

  if (!article || error) {
    return (
      <div className="min-h-screen bg-[#f5efe4] px-4 pt-32 text-[#123c69]">
        <div className="container mx-auto max-w-3xl rounded-[2rem] border border-white/70 bg-white/80 p-8 text-center shadow-[0_30px_90px_-58px_rgba(18,60,105,0.75)]">
          <Newspaper className="mx-auto h-10 w-10 text-[#f36c21]" />
          <h1 className="mt-5 font-heading text-3xl font-bold">Signal not found yet.</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[#4b6f8b]">
            The signal library may have refreshed since this link was created. Head back to Founder Signal to see the latest Founder Signal briefings.
          </p>
          <Link to="/founder-signal" className="mt-6 inline-flex">
            <Button className="rounded-2xl bg-[#123c69] text-white hover:bg-[#0c2c50]">
              Back to Founder Signal
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const phoenixTake = article.whyItMatters || article.whyShared || article.imageBrief?.emotionalHook || article.summary;
  const sourceContext = `${article.source}${article.date ? ` • ${article.date}` : ""}`;

  const deeperContext = [
    {
      value: "what-changed",
      title: "What changed",
      text: article.summary || "A Phoenix-selected signal moved through the public market conversation.",
    },
    {
      value: "founder-move",
      title: "Founder move",
      text: article.founderTakeaway || article.businessTakeaway || "Use this as a prompt to decide what to watch, what to test, and what to tighten next.",
    },
    {
      value: "source-note",
      title: "Source",
      text: sourceContext,
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5efe4] text-[#123c69]">
      <section className="relative overflow-hidden pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(142,217,210,0.45),transparent_30rem),radial-gradient(circle_at_84%_16%,rgba(243,108,33,0.14),transparent_24rem),linear-gradient(180deg,#f8f4ea_0%,#f5efe4_58%,#ecdfcc_100%)]" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <Link to="/founder-signal" className="inline-flex items-center gap-2 text-sm font-semibold text-[#456f8d] transition hover:text-[#f36c21]">
            <ArrowLeft className="h-4 w-4" />
            Back to Founder Signal
          </Link>

          <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center">
            <ScrollReveal className="lg:col-span-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#8ed9d2]/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#236273]">
                  {article.editorialCategory || "Founder Signal"}
                </span>
                <span className="text-sm font-semibold text-[#5f788d]">{article.source}</span>
                {article.date && <span className="text-sm text-[#6f8190]">{article.date}</span>}
              </div>

              <h1 className="mt-6 font-heading text-4xl font-bold leading-[1.04] tracking-normal text-[#123c69] md:text-6xl">
                {article.headline}
              </h1>

              <div className="mt-6 rounded-[1.65rem] border border-white/70 bg-white/60 p-5 text-sm leading-7 text-[#335d81] shadow-[0_20px_60px_-48px_rgba(18,60,105,0.75)] backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f36c21]">Phoenix take</p>
                <p className="mt-2 text-base leading-8">{phoenixTake}</p>
                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#dfd3c0] pt-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#5f788d]">
                  <Share2 className="h-4 w-4 text-[#f36c21]" />
                  <span>{sourceContext}</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/founder-signal#join">
                  <Button size="lg" className="h-14 rounded-2xl bg-[#123c69] px-8 text-base font-semibold text-white shadow-[0_20px_50px_-28px_rgba(18,60,105,0.9)] hover:bg-[#0c2c50]">
                    Subscribe to Founder Signal <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                {article.originalUrl && (
                  <a href={article.originalUrl} target="_blank" rel="noreferrer">
                    <Button size="lg" variant="outline" className="h-14 rounded-2xl border-[#123c69]/20 bg-white/55 px-8 text-base font-semibold text-[#123c69] hover:bg-white">
                      Open source article <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.12} className="lg:col-span-6">
              <div className="overflow-hidden rounded-[2.4rem] border border-white/60 bg-white/70 shadow-[0_34px_100px_-58px_rgba(18,60,105,0.9)]">
                <PhoenixSignalImage
                  src={imageUrl}
                  alt={`Founder Signal social card for ${article.headline}`}
                  className="aspect-[1200/630] w-full object-cover"
                  loading="eager"
                />
                <div className="border-t border-[#dfd3c0] bg-white/80 px-5 py-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#5f788d]">Founder Signal card</p>
                  <p className="mt-2 text-sm leading-6 text-[#5f788d]">Phoenix-owned visual. Publisher source stays linked separately.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal delay={0.06}>
            <div className="rounded-[2rem] border border-white/70 bg-white/80 p-6 shadow-[0_26px_70px_-50px_rgba(18,60,105,0.7)] backdrop-blur md:p-8">
              <div className="flex flex-col gap-3 border-b border-[#dfd3c0] pb-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#f36c21]">Go deeper</p>
                  <h2 className="mt-2 font-heading text-3xl font-bold text-[#123c69]">More context, only if you want it.</h2>
                </div>
                {article.originalUrl && (
                  <a href={article.originalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-semibold text-[#123c69] transition hover:text-[#f36c21]">
                    Original source <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
              <Accordion type="single" collapsible className="mt-6 space-y-3">
                {deeperContext.map((item) => (
                  <AccordionItem key={item.value} value={item.value} className="rounded-[1.35rem] border border-[#e6d9c6] bg-[#fbf6ee] px-5">
                    <AccordionTrigger className="py-5 text-left font-heading text-xl font-bold text-[#123c69] hover:no-underline">
                      {item.title}
                    </AccordionTrigger>
                    <AccordionContent className="pb-5 text-sm leading-7 text-[#58728b]">
                      {item.text}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#0b2a49] py-20 text-white md:py-28">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(142,217,210,0.22),transparent_28rem),radial-gradient(circle_at_88%_35%,rgba(243,108,33,0.18),transparent_24rem)]" />
        <div className="container relative z-10 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl rounded-[2.25rem] border border-white/10 bg-white/[0.08] p-7 text-center shadow-[0_30px_90px_-50px_rgba(0,0,0,0.65)] backdrop-blur md:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-[#8ed9d2]">
              <Mail className="h-7 w-7" />
            </div>
            <h2 className="mx-auto mt-6 max-w-3xl font-heading text-4xl font-bold leading-tight tracking-normal md:text-5xl">
              Want the useful read before everyone starts shouting about it?
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-white/70">
              Founder Signal turns public news into practical context for AI, capital, and operator decisions.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link to="/founder-signal#join">
                <Button size="lg" className="h-14 rounded-2xl bg-[#f36c21] px-8 text-base font-semibold text-white hover:bg-[#d95615]">
                  Subscribe to Founder Signal
                </Button>
              </Link>
              <Link to="/founder-signal">
                <Button size="lg" variant="outline" className="h-14 rounded-2xl border-white/25 bg-transparent px-8 text-base font-semibold text-white hover:bg-white hover:text-[#123c69]">
                  Read more signals
                </Button>
              </Link>
            </div>
            <div className="mt-7 flex items-center justify-center gap-2 text-xs font-medium text-white/55">
              <CheckCircle2 className="h-4 w-4 text-[#8ed9d2]" />
              The original article stays available when you want the full source.
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
