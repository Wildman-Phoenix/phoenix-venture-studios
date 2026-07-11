import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  buildAllStaticRss,
  buildStaticRss,
  collectOfficialPageSource,
  collectPerplexityResearchSource,
  collectYoutubeSource,
  buildFeedJson,
  buildFeedXml,
  buildSignalSlug,
  classifyItem,
  dedupeItems,
  enrichItemsWithArticleMetadata,
  escapeXml,
  parseFeedXml,
  scoreItem,
  selectItems,
  validateRss,
  writeRecentSelectionHistory
} from "../../scripts/rss/generate-static-rss.mjs";
import { assertBundleManifestMatchesDirectory } from "../../scripts/rss/publish-preview-rss.mjs";
import { extractArticleMetadata } from "../../scripts/rss/article-metadata.mjs";
import {
  ARTICLE_SIGNAL_IMAGE_DIR,
  createImageBrief,
  renderSignalCard,
  renderSignalCardsForItems,
  resolveSourceImagePolicy,
  wrapText
} from "../../scripts/rss/signal-card-images.mjs";
import { buildImageReviewQueue } from "../../scripts/rss/image-review-queue.mjs";
import { buildImageReviewRepository } from "../../scripts/rss/image-review-repository.mjs";
import { writeSignalStaticPages } from "../../scripts/rss/signal-page-html.mjs";

const source = {
  id: "fixture",
  name: "Fixture News",
  url: "https://example.com/feed.xml",
  score: 80,
  buckets: ["capital_credit", "ai_operator_impact", "founder_strategy"]
};

afterEach(() => {
  delete process.env.PHOENIX_RSS_SITE_URL;
});

async function writeEditorialTestArt(filePath, options = {}) {
  const {
    background = "#091828",
    panel = "#12304b",
    accent = "#2fd2ff",
    secondary = "#f47d2c",
  } = options;

  await sharp(Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <rect width="1200" height="630" fill="${background}"/>
      <rect x="0" y="0" width="460" height="630" fill="${panel}"/>
      <circle cx="890" cy="210" r="124" fill="${accent}" opacity="0.28"/>
      <rect x="118" y="132" width="248" height="118" rx="24" fill="${secondary}" opacity="0.34"/>
      <path d="M90 456 C286 388, 432 310, 596 246 S910 170, 1110 118" stroke="#ffd07a" stroke-width="12" fill="none" stroke-linecap="round"/>
      <path d="M120 176 H372" stroke="#ffffff" stroke-width="18" stroke-linecap="round" opacity="0.22"/>
      <path d="M120 220 H332" stroke="#ffffff" stroke-width="14" stroke-linecap="round" opacity="0.18"/>
    </svg>
  `)).jpeg().toFile(filePath);
}

describe("static RSS engine", () => {
  it("parses RSS items into normalized article records", () => {
    const items = parseFeedXml(`<?xml version="1.0"?><rss><channel>
      <item>
        <title><![CDATA[AI credit tools cut approval time by 40%]]></title>
        <link>https://example.com/ai-credit</link>
        <description><![CDATA[Operators are using AI workflows for lending decisions.]]></description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`, source);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("AI credit tools cut approval time by 40%");
    expect(items[0].url).toBe("https://example.com/ai-credit");
  });

  it("collects YouTube Atom videos with thumbnails as source-image references", async () => {
    const { items } = await collectYoutubeSource({
      id: "matt-wolfe-youtube",
      name: "Matt Wolfe YouTube",
      url: "https://www.youtube.com/feeds/videos.xml?channel_id=UChpleBmo18P08aKCIgti38g",
      type: "youtube",
      enabled: true,
      score: 72,
      buckets: ["ai_tools_agents"],
      requiresCorroboration: true
    }, async () => `<?xml version="1.0"?><feed xmlns:media="http://search.yahoo.com/mrss/">
      <entry>
        <title>OpenAI Codex updates every builder should know</title>
        <link rel="alternate" href="https://www.youtube.com/watch?v=abc123" />
        <published>2026-06-05T13:00:00Z</published>
        <media:group><media:thumbnail url="https://i.ytimg.com/vi/abc123/hqdefault.jpg" /></media:group>
      </entry>
    </feed>`);

    expect(items).toHaveLength(1);
    expect(items[0].sourceSurface).toBe("youtube");
    expect(items[0].sourceImageUrl).toBe("https://i.ytimg.com/vi/abc123/hqdefault.jpg");
    expect(items[0].requiresCorroboration).toBe(true);
  });

  it("extracts official-page Open Graph metadata and article links", async () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="Claude Code changelog">
      <meta property="og:description" content="Developer workflow updates.">
      <meta property="og:image" content="/images/changelog.jpg">
      <link rel="canonical" href="https://code.claude.com/docs/en/changelog">
    </head><body>
      <a href="/docs/en/changelog/codex-like-agent-update">Claude Code agent workflow release notes</a>
    </body></html>`;

    const metadata = extractArticleMetadata(html, "https://code.claude.com/docs/en/changelog");
    const { items } = await collectOfficialPageSource({
      id: "claude-code-changelog",
      name: "Claude Code Changelog",
      url: "https://code.claude.com/docs/en/changelog",
      type: "official-page",
      enabled: true,
      score: 95,
      buckets: ["ai_tools_agents"],
      includeKeywords: ["agent", "workflow"],
      limit: 3
    }, async () => html, { now: new Date("2026-06-05T13:00:00Z") });

    expect(metadata.imageUrl).toBe("https://code.claude.com/images/changelog.jpg");
    expect(items[0].sourceSurface).toBe("official-page");
    expect(items[0].url).toBe("https://code.claude.com/docs/en/changelog/codex-like-agent-update");
    expect(items[0].reviewTitle || `${items[0].sourceName} | ${items[0].title}`).toContain("Claude");
  });

  it("enriches an RSS item with article-page og:image when the feed omits images", async () => {
    const [item] = parseFeedXml(`<?xml version="1.0"?><rss><channel>
      <item>
        <title>OpenAI ships Codex workflow updates</title>
        <link>https://openai.com/news/codex-workflow</link>
        <description>Developer agents and workflow automation improved.</description>
        <pubDate>Fri, 05 Jun 2026 13:00:00 GMT</pubDate>
      </item>
    </channel></rss>`, {
      id: "openai-news",
      name: "OpenAI News",
      url: "https://openai.com/news/rss.xml",
      score: 82,
      buckets: ["ai_tools_agents"]
    });

    const enriched = await enrichItemsWithArticleMetadata([item], {
      fetchTextImpl: async () => `<!doctype html><html><head>
        <meta property="og:image" content="https://openai.com/news/codex-card.jpg">
      </head><body></body></html>`
    });

    expect(enriched[0].sourceImageUrl).toBe("https://openai.com/news/codex-card.jpg");
    expect(enriched[0].imageDiagnostic.feedImageMissing).toBe(true);
    expect(enriched[0].imageDiagnostic.articleImageFound).toBe(true);
    expect(enriched[0].imageDiagnostic.imageDecision).toBe("RSS image missing; OG image found");
  });

  it("collects cited Perplexity research and warns when the key/client is missing", async () => {
    const sourceConfig = {
      id: "perplexity-official-ai-sweep",
      name: "Perplexity Official AI Research Sweep",
      type: "perplexity-research",
      enabled: true,
      score: 86,
      buckets: ["ai_tools_agents"],
      domains: ["openai.com"]
    };

    const cited = await collectPerplexityResearchSource(sourceConfig, {
      now: new Date("2026-06-05T13:00:00Z"),
      perplexityClient: {
        search: async () => ({
          answer: "OpenAI released a Codex workflow update.",
          citations: [{
            title: "Codex workflow update",
            url: "https://openai.com/news/codex-workflow",
            snippet: "Official OpenAI update for coding agents."
          }]
        })
      }
    });
    const missing = await collectPerplexityResearchSource(sourceConfig, {
      perplexityClient: { hasApiKey: false }
    });

    expect(cited.items).toHaveLength(1);
    expect(cited.items[0].researchCitations[0].url).toBe("https://openai.com/news/codex-workflow");
    expect(missing.items).toHaveLength(0);
    expect(missing.warnings[0].error).toContain("PERPLEXITY_API_KEY missing");
  });

  it("cleans aggregator metadata from titles and descriptions", () => {
    const items = parseFeedXml(`<?xml version="1.0"?><rss><channel>
      <item>
        <title>HN: AI calendar that replaces 5 apps</title>
        <link>https://example.com/calendar</link>
        <description>Article URL: https://example.com/calendar Comments URL: https://news.ycombinator.com/item?id=1 Points: 4 # Comments: 2</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`, source);

    expect(items[0].title).toBe("AI calendar that replaces 5 apps");
    expect(items[0].description).toBe("");
  });

  it("cleans orphan source-fragment residue from descriptions", () => {
    const items = parseFeedXml(`<?xml version="1.0"?><rss><channel>
      <item>
        <title>Useful AI workflow signal</title>
        <link>https://example.com/workflow</link>
        <description>TensorFeed reported: Comments URL:. Workflow teams are testing a new launch path.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`, source);

    expect(items[0].description).toBe("TensorFeed reported: Workflow teams are testing a new launch path.");
  });

  it("strips arxiv feed boilerplate before editorial copy is built", () => {
    const items = parseFeedXml(`<?xml version="1.0"?><rss><channel>
      <item>
        <title>Hallucination Mitigation with Agentic AI</title>
        <link>https://arxiv.org/abs/2605.29055</link>
        <description>arXiv:2605.29055v1 Announce Type: new Abstract: Hallucination remains a major reliability barrier for production LLM systems.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`, source);

    expect(items[0].description).toBe("Hallucination remains a major reliability barrier for production LLM systems.");
  });

  it("classifies items into the strongest allowed bucket", () => {
    const bucket = classifyItem({
      title: "New AI workflow lowers support costs for small business owners",
      description: "The change affects automation, productivity, and operator decisions.",
      candidateBuckets: ["ai_operator_impact", "founder_strategy"]
    });

    expect(bucket).toBe("ai_operator_impact");
  });

  it("classifies vibe-coding app builder coverage into AI tools and agents", () => {
    const bucket = classifyItem({
      title: "Vibe coding app builder launches new agentic developer tools",
      description: "Builders use coding agents to ship apps faster with rapid prototyping workflows.",
      candidateBuckets: ["ai_tools_agents", "ai_implementation", "founder_strategy"]
    });

    expect(bucket).toBe("ai_tools_agents");
  });

  it("classifies new venture funding coverage into funding and venture", () => {
    const bucket = classifyItem({
      title: "New venture studio backed app startup closes pre-seed funding",
      description: "Angel investors back the new venture as founders launch an app development push.",
      candidateBuckets: ["funding_venture", "founder_strategy", "ai_tools_agents"]
    });

    expect(bucket).toBe("funding_venture");
  });

  it("penalizes sponsored or paid-content items", () => {
    const item = scoreItem({
      title: "Sponsored: New capital platform launches",
      description: "Paid content for business owners.",
      url: "https://example.com/sponsored/capital-platform",
      publishedAt: "2026-05-15T04:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["capital_credit"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-05-15T05:00:00Z"));

    expect(item.excluded).toBe(true);
    expect(item.score).toBeLessThan(0);
  });

  it("excludes political or culture-war headlines from selection", () => {
    const item = scoreItem({
      title: "Trump's Immigration Crackdown Has Cost the U.S. Economy 668,000 Jobs, Studies Show",
      description: "A political immigration headline with broad culture-war framing.",
      url: "https://example.com/trump-immigration",
      publishedAt: "2026-06-01T09:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["founder_strategy", "wildcard_attention"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-06-01T10:00:00Z"));

    expect(item.excluded).toBe(true);
    expect(item.excludeReason).toBe("political_or_culture_war_topic");
    expect(item.score).toBeLessThan(0);
  });

  it("excludes geopolitics and culture-war-adjacent AI headlines that are off-brief", () => {
    const influenceOps = scoreItem({
      title: "PRC-linked influence operations are targeting AI debates in the US",
      description: "A geopolitics-heavy AI headline without a founder-policy angle.",
      url: "https://example.com/influence-ops",
      publishedAt: "2026-06-11T09:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["business_automation", "wildcard_attention"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-06-11T10:00:00Z"));

    const graduationCultureWar = scoreItem({
      title: "Microsoft, like, totally gets why students are booing AI-pilled graduation speakers",
      description: "Culture-war framing around AI backlash instead of workflow or policy impact.",
      url: "https://example.com/graduation-speakers",
      publishedAt: "2026-06-11T09:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["ai_tools_agents", "wildcard_attention"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-06-11T10:00:00Z"));

    expect(influenceOps.excluded).toBe(true);
    expect(influenceOps.excludeReason).toBe("political_or_culture_war_topic");
    expect(graduationCultureWar.excluded).toBe(true);
    expect(graduationCultureWar.excludeReason).toBe("political_or_culture_war_topic");
  });

  it("does not grant a political override from description-only tariff language", () => {
    const item = scoreItem({
      title: "PRC-linked influence operations are targeting AI debates in the US",
      description: "The report mentions tariffs and data center narratives, but the headline is still geopolitical.",
      url: "https://example.com/influence-ops",
      publishedAt: "2026-06-11T09:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["business_automation", "wildcard_attention"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-06-11T10:00:00Z"));

    expect(item.excluded).toBe(true);
    expect(item.excludeReason).toBe("political_or_culture_war_topic");
  });

  it("keeps business-relevant regulatory stories that are not politician-name bait", () => {
    const item = scoreItem({
      title: "EU AI regulation raises new compliance costs for model vendors",
      description: "Founders may need to adapt product and policy workflows as rules tighten.",
      url: "https://example.com/eu-ai-regulation",
      publishedAt: "2026-06-01T09:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["market_regulatory", "founder_strategy"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-06-01T10:00:00Z"));

    expect(item.excluded).toBe(false);
  });

  it("scores agentic app-development signals above generic updates", () => {
    const tuned = scoreItem({
      title: "Agentic vibe coding tools change app development for AI operators",
      description: "New coding agents and app builders help teams build apps faster.",
      url: "https://example.com/agentic-app-dev",
      publishedAt: "2026-05-15T04:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["ai_tools_agents", "ai_implementation", "ai_operator_impact"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-05-15T05:00:00Z"));

    const generic = scoreItem({
      title: "Software team shares weekly product update",
      description: "A general update for the product team.",
      url: "https://example.com/software-update",
      publishedAt: "2026-05-15T04:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["ai_tools_agents", "ai_implementation", "ai_operator_impact"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-05-15T05:00:00Z"));

    expect(tuned.bucket).toBe("ai_tools_agents");
    expect(tuned.score).toBeGreaterThan(generic.score);
  });

  it("boosts preferred builder and funding themes when registry preferences are supplied", () => {
    const tuned = scoreItem({
      title: "New venture launches agentic app builder after funding round",
      description: "Builders use coding agents to ship apps faster and tighten operator workflows.",
      url: "https://example.com/new-venture-builder",
      publishedAt: "2026-05-15T04:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["funding_venture", "ai_tools_agents", "ai_implementation"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-05-15T05:00:00Z"), {
      preferredKeywords: ["new venture", "agentic", "app builder", "coding agents", "ship apps faster"],
    });

    const baseline = scoreItem({
      title: "Company shares platform update",
      description: "A routine update for customers.",
      url: "https://example.com/platform-update",
      publishedAt: "2026-05-15T04:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["funding_venture", "ai_tools_agents", "ai_implementation"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-05-15T05:00:00Z"));

    expect(tuned.preferredKeywordHits).toBeGreaterThan(0);
    expect(tuned.score).toBeGreaterThan(baseline.score);
  });

  it("demotes weak-fit lifestyle or consumer gadget themes when penalty keywords are supplied", () => {
    const weakFit = scoreItem({
      title: "Stop Burning Out with this smart bird feeder wellness routine",
      description: "My backyard drama and nervous system need a better AI gadget.",
      url: "https://example.com/bird-feeder",
      publishedAt: "2026-05-15T04:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["wildcard_attention", "ai_tools_agents"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-05-15T05:00:00Z"), {
      penaltyKeywords: ["burning out", "bird feeder", "backyard drama", "nervous system"],
    });

    const useful = scoreItem({
      title: "Coding agents help teams automate app development workflows",
      description: "Operators use AI tools to ship faster and reduce manual work.",
      url: "https://example.com/coding-agents",
      publishedAt: "2026-05-15T04:00:00Z",
      sourceScore: 80,
      candidateBuckets: ["ai_tools_agents", "ai_implementation"],
      sourceName: "Fixture",
      sourceUrl: "https://example.com/feed.xml"
    }, new Date("2026-05-15T05:00:00Z"));

    expect(weakFit.penaltyKeywordHits).toBeGreaterThan(0);
    expect(weakFit.score).toBeLessThan(useful.score);
  });

  it("boosts official sources and excludes uncorroborated trend-curator items", () => {
    const now = new Date("2026-06-05T14:00:00Z");
    const official = scoreItem({
      title: "OpenAI ships a new Codex workflow for coding agents",
      description: "Official product update for developer workflows.",
      url: "https://openai.com/news/codex-workflow",
      publishedAt: "2026-06-05T13:00:00Z",
      sourceScore: 82,
      sourceSurface: "official-page",
      candidateBuckets: ["ai_tools_agents"],
      sourceName: "OpenAI Platform",
      sourceUrl: "https://platform.openai.com/docs/changelog"
    }, now);
    const trend = scoreItem({
      title: "OpenAI ships a new Codex workflow for coding agents",
      description: "A creator video talks about Codex updates.",
      url: "https://www.youtube.com/watch?v=abc123",
      publishedAt: "2026-06-05T13:00:00Z",
      sourceScore: 82,
      sourceSurface: "youtube",
      requiresCorroboration: true,
      corroborationDomains: ["openai.com"],
      candidateBuckets: ["ai_tools_agents"],
      sourceName: "Matt Wolfe YouTube",
      sourceUrl: "https://www.youtube.com/feeds/videos.xml?channel_id=UChpleBmo18P08aKCIgti38g"
    }, now);

    expect(official.excluded).toBe(false);
    expect(official.sourceSurfaceScore).toBeGreaterThan(0);
    expect(trend.excluded).toBe(true);
    expect(trend.excludeReason).toBe("trend_source_requires_primary_corroboration");
    expect(official.score).toBeGreaterThan(trend.score);
  });

  it("dedupes duplicate titles and keeps the higher score", () => {
    const deduped = dedupeItems([
      { title: "AI funding shifts for founders", score: 10 },
      { title: "AI funding shifts for founders!", score: 30 }
    ]);

    expect(deduped).toHaveLength(1);
    expect(deduped[0].score).toBe(30);
  });

  it("selects items by bucket targets before filling the rest", () => {
    const scored = [
      { title: "Credit line costs fall", bucket: "capital_credit", score: 90, excluded: false },
      { title: "AI tools change sales ops", bucket: "ai_operator_impact", score: 85, excluded: false },
      { title: "Founder pricing lesson", bucket: "founder_strategy", score: 70, excluded: false }
    ];
    const { selected, bucketCounts } = selectItems(scored, {
      capital_credit: 1,
      ai_operator_impact: 1,
      founder_strategy: 1
    }, 3);

    expect(selected).toHaveLength(3);
    expect(bucketCounts.capital_credit).toBe(1);
    expect(bucketCounts.ai_operator_impact).toBe(1);
    expect(bucketCounts.founder_strategy).toBe(1);
  });

  it("can cap selected items per source for feed diversity", () => {
    const scored = [
      { title: "AI tools change sales ops", bucket: "ai_tools_agents", score: 95, excluded: false, sourceId: "a" },
      { title: "AI workflow for service teams", bucket: "ai_tools_agents", score: 94, excluded: false, sourceId: "a" },
      { title: "AI revenue model for consultants", bucket: "ai_revenue", score: 80, excluded: false, sourceId: "b" }
    ];
    const { selected, sourceCounts } = selectItems(scored, {
      ai_tools_agents: 2,
      ai_revenue: 1
    }, 3, { maxPerSource: 1 });

    expect(selected).toHaveLength(2);
    expect(sourceCounts.a).toBe(1);
    expect(sourceCounts.b).toBe(1);
  });

  it("skips semantically duplicative selections in the same editorial lane", () => {
    const scored = [
      {
        title: "Designing AI Platforms for Reliability: Tools for Certainty, Agents for Discovery",
        description: "Enterprise benchmark found frontier models handled fewer than half of agentic IT tasks under real workload.",
        bucket: "ai_tools_agents",
        score: 92,
        excluded: false,
        sourceId: "a"
      },
      {
        title: "Frontier AI models scored below 50% on a new enterprise IT benchmark",
        description: "Frontier models handled fewer than half of agentic IT tasks under real workload in an enterprise benchmark.",
        bucket: "ai_tools_agents",
        score: 91,
        excluded: false,
        sourceId: "b"
      },
      {
        title: "Endava built an agentic organization with Codex",
        description: "Software delivery and requirements analysis compressed from weeks to hours.",
        bucket: "ai_tools_agents",
        score: 89,
        excluded: false,
        sourceId: "c"
      }
    ];

    const { selected } = selectItems(scored, { ai_tools_agents: 3 }, 3);

    expect(selected).toHaveLength(2);
    expect(selected.map((item) => item.title)).toContain("Designing AI Platforms for Reliability: Tools for Certainty, Agents for Discovery");
    expect(selected.map((item) => item.title)).not.toContain("Frontier AI models scored below 50% on a new enterprise IT benchmark");
    expect(selected.map((item) => item.title)).toContain("Endava built an agentic organization with Codex");
  });

  it("escapes XML and emits a valid RSS document", () => {
    expect(escapeXml("A & B < C")).toBe("A &amp; B &lt; C");

    const xml = buildFeedXml([
      {
        title: "A founder's AI & credit shift",
        description: "Operators need clearer funding timing.",
        url: "https://example.com/item?a=1&b=2",
        publishedAt: "2026-05-15T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        imageStrategy: "held-for-codex-image",
        imageApprovalStatus: "approved",
        imagePath: "/images/signals/generated/founder-s-ai-credit-shift.jpg",
        socialImagePath: "/images/signals/generated/founder-s-ai-credit-shift.jpg",
        imageUrl: "https://preview.example.com/images/signals/generated/founder-s-ai-credit-shift.jpg",
        socialImageUrl: "https://preview.example.com/images/signals/generated/founder-s-ai-credit-shift.jpg",
        bucket: "capital_credit",
        bucketLabel: "Capital & Credit",
        score: 88
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    expect(validateRss(xml)).toBe(true);
    expect(xml).toContain("<![CDATA[A founder's AI & credit shift]]>");
    expect(xml).toContain("https://preview.example.com/founder-signal/signals/");
    expect(xml).toContain("https://preview.example.com/images/signals/generated/founder-s-ai-credit-shift.jpg");
    expect(xml).not.toContain("<link>https://example.com/item");
  });

  it("emits Phoenix-owned JSON signal fields for social and onsite routing", () => {
    const json = buildFeedJson([
      {
        title: "A founder's AI & credit shift",
        description: "Operators need clearer funding timing.",
        url: "https://example.com/item?a=1&b=2",
        publishedAt: "2026-05-15T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        imageStrategy: "held-for-codex-image",
        imageApprovalStatus: "approved",
        imagePath: "/images/signals/generated/founder-s-ai-credit-shift.jpg",
        socialImagePath: "/images/signals/generated/founder-s-ai-credit-shift.jpg",
        imageUrl: "https://preview.example.com/images/signals/generated/founder-s-ai-credit-shift.jpg",
        socialImageUrl: "https://preview.example.com/images/signals/generated/founder-s-ai-credit-shift.jpg",
        bucket: "capital_credit",
        bucketLabel: "Capital & Credit",
        score: 88
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    const [item] = json.items;
    expect(item.url).toContain("https://preview.example.com/founder-signal/signals/");
    expect(item.external_url).toBe("https://example.com/item?a=1&b=2");
    expect(item.image).toBe("https://preview.example.com/images/signals/generated/founder-s-ai-credit-shift.jpg");
    expect(item._phoenix.socialImageUrl).toBe("https://preview.example.com/images/signals/generated/founder-s-ai-credit-shift.jpg");
    expect(item._phoenix.imageStrategy).toBe("held-for-codex-image");
    expect(item._phoenix.imageApprovalStatus).toBe("approved");
    expect(item._phoenix.imageFamily).toBe("capital_readiness");
    expect(item._phoenix.imageRightsStatus).toBe("owned-or-licensed");
    expect(item._phoenix.imageBrief.storyAngle).toBe("Capital readiness");
    expect(item._phoenix.slug).toMatch(/^founder-s-ai-credit-shift-/);
    expect(item._phoenix.internalPath).toContain(`/founder-signal/signals/${item._phoenix.slug}`);
    expect(item._phoenix.originalUrl).toBe("https://example.com/item?a=1&b=2");
    expect(item._phoenix.whyItMatters).toContain("Capital access");
    expect(item._phoenix.simpleSummary).toBeTruthy();
    expect(item._phoenix.simpleSummary.startsWith("For founders")).toBe(false);
    expect(item._phoenix.trendContext).toBeTruthy();
    expect(item._phoenix.engagementPrompt).toBeTruthy();
    expect(item._phoenix.readingLevel.target).toBe("grade-5-plain-founder");
    expect(item._phoenix.editorialMode).toBe("phoenix-original-brief");
  });

  it("keeps founder-tools editorial copy from inheriting frontier-funding framing", () => {
    const json = buildFeedJson([
      {
        title: "GitHub adds agent workflow audits for coding teams",
        description: "Engineering teams are using daily audits to trim token spend, simplify tool stacks, and ship more predictably.",
        url: "https://example.com/github-agent-audits",
        publishedAt: "2026-06-08T12:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents",
        score: 95
      }
    ], {
      now: new Date("2026-06-08T13:00:00Z"),
      siteUrl: "https://preview.example.com",
      feedId: "founder-tools"
    });

    const story = json.items[0].content_text;
    expect(story).toContain("GitHub says disciplined audits");
    expect(story).not.toMatch(/Anthropic|valuation|trillion|funding race/i);
    expect(story).not.toContain("The useful question is");
    expect(story).not.toContain("Watch whether");
  });

  it("assigns founder-tools feed role to founder-tools-social items", () => {
    const json = buildFeedJson([
      {
        title: "Coding agents help teams ship faster",
        description: "A useful developer workflow update.",
        url: "https://example.com/coding-agents",
        publishedAt: "2026-05-15T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents",
        score: 92
      }
    ], {
      now: new Date("2026-05-15T05:00:00Z"),
      siteUrl: "https://preview.example.com",
      feedId: "founder-tools-social",
      feedFile: "tools-social.json"
    });

    expect(json.items[0]._phoenix.feedRole).toBe("founder-tools");
  });

  it("keeps JSON feed social copy public-safe and natural for a Visa/Replit signal", () => {
    const json = buildFeedJson([
      {
        title: "Visa expands Replit prototyping into agentic payments workflows",
        description: "More than 1,000 Visa employees have used Replit for prototyping as the company explores agentic payments, AI builders, app development, and commerce workflows.",
        url: "https://example.com/visa-replit-agentic-payments",
        publishedAt: "2026-05-15T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents",
        score: 94
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    const [item] = json.items;
    const copy = item.content_text;
    const internalLabels = [
      "Phoenix brief:",
      "Why it matters:",
      "Founder takeaway:",
      "Trend to watch:",
      "Engagement:",
      "Phoenix bucket:",
      "Source:"
    ];

    for (const label of internalLabels) {
      expect(copy).not.toContain(label);
    }

    expect(item.url).toMatch(/^https:\/\/preview\.example\.com\/founder-signal\/signals\/visa-expands-replit-prototyping-into-agentic-payments-workflows-/);
    expect(copy).not.toContain(item.url);
    expect(copy).toContain("preview.example.com.");
    expect(copy).toContain("#Visa");
    expect(copy).toContain("#Replit");
    expect(copy).toContain("#AgenticAI");
    expect(copy).toContain("#Payments");
    expect(copy).not.toMatch(/^[-*]\s/m);
    expect(copy).toMatch(/^Visa is moving Replit closer to the payment layer, not just the prototype layer\./);
    expect(copy).toContain("For founders building apps, automations, or client systems, this is where coding tools start to matter more.");
  });

  it("strips punctuation-only source summaries and avoids raw-link spam in public copy", () => {
    const json = buildFeedJson([
      {
        title: "Mystery company accidentally blew $500M on Claude AI in a single month",
        description: "..",
        url: "https://example.com/claude-bill",
        publishedAt: "2026-05-15T04:00:00Z",
        sourceName: "TensorFeed",
        sourceUrl: "https://example.com/feed.xml",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents",
        score: 94
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    const [item] = json.items;
    const copy = item.content_text;

    expect(copy.startsWith("..")).toBe(false);
    expect(copy).toContain("massive Claude bill");
    expect(copy).toContain("preview.example.com.");
    expect(copy).not.toContain(item.url);
  });

  it("creates deterministic image briefs for major signal types", () => {
    expect(createImageBrief({
      title: "AI agents cannot be trusted alone after a warning from researchers",
      description: "Unchecked automation created security risk.",
      bucketLabel: "AI Tools & Agents"
    })).toMatchObject({
      imageFamily: "ai_risk",
      template: "market_warning",
      storyAngle: "Risk signal"
    });

    expect(createImageBrief({
      title: "Startup raises new funding as credit markets shift",
      description: "Capital and investor appetite are changing.",
      bucketLabel: "Funding & Venture"
    })).toMatchObject({
      imageFamily: "capital_readiness",
      template: "opportunity_window",
      storyAngle: "Capital readiness"
    });

    expect(createImageBrief({
      title: "Consultants turn AI workshops into revenue",
      description: "A sales event creates training demand.",
      bucketLabel: "AI Revenue Opportunities"
    })).toMatchObject({
      imageFamily: "event_workshop",
      template: "opportunity_window",
      storyAngle: "Revenue opportunity"
    });
  });

  it("keeps publisher images private unless a source is allowlisted", () => {
    const item = {
      sourceName: "Fixture News",
      sourceUrl: "https://fixture.example/feed.xml",
      originalUrl: "https://fixture.example/story",
      sourceImageUrl: "https://fixture.example/story.jpg"
    };

    expect(resolveSourceImagePolicy(item, {
      defaultPolicy: "reference-only",
      sources: {}
    })).toMatchObject({
      policy: "reference-only",
      canUseSourceImage: false,
      rightsStatus: "reference-only",
      manualReviewNeeded: true,
      hasExplicitMatch: false
    });

    expect(resolveSourceImagePolicy(item, {
      defaultPolicy: "reference-only",
      sources: {
        "fixture-news": { policy: "allowed", credit: "Fixture licensed image" }
      }
    })).toMatchObject({
      policy: "allowed",
      canUseSourceImage: true,
      rightsStatus: "allowlisted",
      credit: "Fixture licensed image"
    });

    expect(resolveSourceImagePolicy(item, {
      defaultPolicy: "reference-only",
      sources: {
        "fixture-news": { policy: "manual-review" }
      }
    })).toMatchObject({
      policy: "manual-review",
      manualReviewNeeded: true,
      canUseSourceImage: false
    });
  });

  it("wraps long social-card headlines without empty lines", () => {
    const lines = wrapText("AI agents, capital pressure, and founder revenue systems are changing the next small business playbook", 22, 4);

    expect(lines.length).toBeLessThanOrEqual(4);
    expect(lines.every((line) => line.trim().length > 0)).toBe(true);
    expect(lines.join(" ")).toContain("AI agents");
  });

  it("holds unapproved stories instead of generating a fallback image", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-signal-card-"));
    const item = {
      slug: "ai-credit-special-characters",
      title: "AI & credit shifts create a sharper founder funding window",
      sourceName: "Fixture News",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "capital_credit",
      bucketLabel: "Capital & Credit"
    };

    const rendered = await renderSignalCard(item, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      now: new Date("2026-05-15T05:00:00Z")
    });

    expect(rendered.socialImageUrl).toBe("");
    expect(rendered.imageFamily).toBe("capital_readiness");
    expect(rendered.imageStrategy).toBe("held-for-codex-image");
    expect(rendered.imageApprovalStatus).toBe("held");
    expect(rendered.imageBrief.storyAngle).toBe("Capital readiness");
    expect(rendered.sceneLane).toBeTruthy();
    expect(rendered.sceneMotif).toBeTruthy();
    expect(rendered.imageFingerprint).toBeTruthy();
  });

  it("uses article-specific generated art when it exists for the signal slug", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-article-art-card-"));
    const slug = "visa-replit-agentic-payments";
    const articleArtDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(articleArtDir, { recursive: true });
    await writeEditorialTestArt(path.join(articleArtDir, `${slug}.jpg`), {
      background: "#0a3144",
      panel: "#164865",
      accent: "#2fd2ff",
      secondary: "#ff8f42",
    });

    const rendered = await renderSignalCard({
      slug,
      title: "Visa invests in Replit to power agentic payments for developers",
      sourceName: "TechCrunch AI",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_tools_agents",
      bucketLabel: "AI Tools & Agents"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      now: new Date("2026-05-15T05:00:00Z")
    });

    expect(rendered.imageStrategy).toBe("held-for-codex-image");
    expect(rendered.imageApprovalStatus).toBe("approved");
    expect(rendered.imageSourceType).toBe("phoenix-owned");
    expect(rendered.imageCredit).toBe("Phoenix Venture Studios approved raw story image");
    expect(rendered.imageBrief.articleImagePath).toBe(`/images/signals/source-art/${slug}.jpg`);
    expect(rendered.imageWarnings.some((warning) => /emergency family background/i.test(warning))).toBe(false);
    expect(rendered.socialImageUrl).toBe(`https://preview.example.com/images/signals/generated/${slug}.jpg`);
  });

  it("holds a flat Phoenix-owned backup image instead of approving a generic abstract placeholder", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-owned-placeholder-hold-"));
    const slug = "generic-placeholder-held";
    const articleArtDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(articleArtDir, { recursive: true });
    await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: "#26384a"
      }
    }).jpeg().toFile(path.join(articleArtDir, `${slug}.jpg`));

    const rendered = await renderSignalCard({
      slug,
      title: "Mystery company accidentally blew $500M on Claude AI in a single month",
      sourceName: "TensorFeed",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_tools_agents",
      bucketLabel: "AI Tools & Agents"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      analyzeImageVisionImpl: async () => ({
        textObservationCount: 0,
        textCoverage: 0,
        faceCount: 0,
        landmarkedFaceCount: 0,
        maxFaceAreaRatio: 0,
        handCount: 0,
        lowConfidenceHandCount: 0,
        completeHandCount: 0,
      })
    });

    expect(rendered.imageStrategy).toBe("held-for-codex-image");
    expect(rendered.imageApprovalStatus).toBe("held");
    expect(rendered.imageHoldReason).toBe("approved-image-failed-art-director-audit");
    expect(rendered.imageWarnings.join(" ")).toMatch(/abstract placeholder|too soft and flat|local art-director audit/i);
  });

  it("can render from an allowlisted source image without hotlinking it", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-source-card-"));
    const sourceBuffer = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: "#145a7a"
      }
    }).jpeg().toBuffer();

    const rendered = await renderSignalCard({
      slug: "allowlisted-source",
      title: "AI consulting revenue expands as founders adopt automation",
      sourceName: "Allowed Source",
      sourceImageUrl: "https://allowed.example/image.jpg",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_revenue",
      bucketLabel: "AI Revenue Opportunities"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      sourceImageAllowlist: {
        defaultPolicy: "reference-only",
        sources: {
          "allowed-source": { policy: "allowed", credit: "Allowed Source licensed image" }
        }
      },
      fetchImageImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => sourceBuffer
      })
    });

    expect(rendered.imageStrategy).toBe("source-allowlisted");
    expect(rendered.imageApprovalStatus).toBe("approved");
    expect(rendered.imageSourceType).toBe("source-image");
    expect(rendered.imageCredit).toBe("Allowed Source licensed image");
    expect(rendered.socialImageUrl).toContain("/images/signals/generated/allowlisted-source.jpg");
    expect(rendered.socialImageUrl).not.toBe("https://allowed.example/image.jpg");
  });

  it("accepts a real image even when the source server labels it as application/octet-stream", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-source-octet-stream-"));
    const sourceBuffer = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: "#145a7a"
      }
    }).jpeg().toBuffer();

    const rendered = await renderSignalCard({
      slug: "octet-stream-source",
      title: "A valid source image should survive a sloppy content type",
      sourceName: "Allowed Source",
      sourceImageUrl: "https://allowed.example/image.bin",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_revenue",
      bucketLabel: "AI Revenue Opportunities"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      sourceImageAllowlist: {
        defaultPolicy: "reference-only",
        sources: {
          "allowed-source": { policy: "allowed", credit: "Allowed Source licensed image" }
        }
      },
      fetchImageImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "application/octet-stream" },
        arrayBuffer: async () => sourceBuffer
      })
    });

    expect(rendered.imageStrategy).toBe("source-allowlisted");
    expect(rendered.imageApprovalStatus).toBe("approved");
  });

  it("chooses a calmer headline layout when a source image is visually busy on one side", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-source-composition-"));
    const sourceBuffer = await sharp(Buffer.from(`
      <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
        <rect width="1200" height="630" fill="#0e1725"/>
        <rect x="0" y="0" width="700" height="630" fill="#f4c07b"/>
        <rect x="700" y="0" width="500" height="630" fill="#10233b"/>
        <path d="M60 92 H640 M60 162 H620 M60 232 H654 M60 302 H610 M60 372 H644" stroke="#ffffff" stroke-width="20" stroke-linecap="round" opacity="0.85"/>
        <circle cx="280" cy="430" r="120" fill="#ff7a1a" opacity="0.32"/>
      </svg>
    `)).jpeg().toBuffer();

    const rendered = await renderSignalCard({
      slug: "composition-shift",
      title: "A live AI trade show strategy turned booth traffic into real pipeline",
      sourceName: "Allowed Source",
      sourceImageUrl: "https://allowed.example/trade-show-photo.jpg",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_revenue",
      bucketLabel: "AI Revenue Opportunities"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      sourceImageAllowlist: {
        defaultPolicy: "reference-only",
        sources: {
          "allowed-source": { policy: "allowed", credit: "Allowed Source licensed image" }
        }
      },
      fetchImageImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => sourceBuffer
      })
    });

    expect(rendered.imageStrategy).toBe("source-allowlisted");
    expect(rendered.imageApprovalStatus).toBe("approved");
    expect(rendered.imageComposition).toBe("right-anchor");
    expect(rendered.imageAudit?.bestComposition?.composition).toBe("right-anchor");
  });

  it("falls back to owned imagery when an allowlisted source image is broken", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-source-card-broken-"));
    const rendered = await renderSignalCard({
      slug: "broken-source",
      title: "AI warning creates founder risk",
      sourceName: "Allowed Source",
      sourceImageUrl: "https://allowed.example/not-image",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_tools_agents",
      bucketLabel: "AI Tools & Agents"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      sourceImageAllowlist: {
        defaultPolicy: "reference-only",
        sources: {
          "allowed-source": { policy: "allowed", credit: "Allowed Source licensed image" }
        }
      },
      fetchImageImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "text/html" },
        arrayBuffer: async () => Buffer.from("<html>nope</html>")
      })
    });

    expect(rendered.imageStrategy).toBe("held-for-codex-image");
    expect(rendered.imageApprovalStatus).toBe("held");
    expect(rendered.imageSourceType).toBe("pending-codex-image");
    expect(rendered.imageWarnings[0]).toContain("Allowlisted source image failed validation");
  });

  it("holds a weak allowlisted event image when it fails the local art-director audit", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-source-audit-hold-"));
    const sourceBuffer = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: "#8a8b90"
      }
    }).jpeg().toBuffer();

    const rendered = await renderSignalCard({
      slug: "weak-trade-show-cover",
      title: "An AI trade show strategy helped turn booth attention into pipeline",
      sourceName: "Allowed Source",
      sourceImageUrl: "https://allowed.example/event-photo.jpg",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_revenue",
      bucketLabel: "AI Revenue Opportunities"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      sourceImageAllowlist: {
        defaultPolicy: "reference-only",
        sources: {
          "allowed-source": { policy: "allowed", credit: "Allowed Source licensed image" }
        }
      },
      fetchImageImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => sourceBuffer
      })
    });

    expect(rendered.imageStrategy).toBe("held-for-codex-image");
    expect(rendered.imageApprovalStatus).toBe("held");
    expect(rendered.imageHoldReason).toBe("allowlisted-source-validation-failed");
    expect(rendered.imageWarnings.join(" ")).toContain("local art-director audit");
    expect(rendered.imageAudit?.recommendedFixes?.length).toBeGreaterThan(0);
  });

  it("holds an allowlisted source image when local vision detects slide-like text coverage", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-vision-text-hold-"));
    const sourceBuffer = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: "#1f4b66"
      }
    }).jpeg().toBuffer();

    const rendered = await renderSignalCard({
      slug: "vision-text-heavy",
      title: "A workflow story with a bad slide image",
      sourceName: "Allowed Source",
      sourceImageUrl: "https://allowed.example/slide.jpg",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_tools_agents",
      bucketLabel: "AI Tools & Agents"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      sourceImageAllowlist: {
        defaultPolicy: "reference-only",
        sources: {
          "allowed-source": { policy: "allowed", credit: "Allowed Source licensed image" }
        }
      },
      fetchImageImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => sourceBuffer
      }),
      analyzeImageVisionImpl: async () => ({
        textObservationCount: 8,
        textCoverage: 0.22,
        faceCount: 0,
        landmarkedFaceCount: 0,
        maxFaceAreaRatio: 0
      })
    });

    expect(rendered.imageApprovalStatus).toBe("held");
    expect(rendered.imageWarnings.join(" ")).toMatch(/slide|screenshot|too much on-image text/i);
  });

  it("holds an allowlisted source image when local vision says it is dominated by a generic portrait", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-vision-portrait-hold-"));
    const sourceBuffer = await sharp({
      create: {
        width: 1200,
        height: 630,
        channels: 3,
        background: "#2d4761"
      }
    }).jpeg().toBuffer();

    const rendered = await renderSignalCard({
      slug: "vision-portrait-heavy",
      title: "A funding story with a giant founder portrait",
      sourceName: "Allowed Source",
      sourceImageUrl: "https://allowed.example/portrait.jpg",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "funding_venture",
      bucketLabel: "Funding & Venture"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      sourceImageAllowlist: {
        defaultPolicy: "reference-only",
        sources: {
          "allowed-source": { policy: "allowed", credit: "Allowed Source licensed image" }
        }
      },
      fetchImageImpl: async () => ({
        ok: true,
        status: 200,
        headers: { get: () => "image/jpeg" },
        arrayBuffer: async () => sourceBuffer
      }),
      analyzeImageVisionImpl: async () => ({
        textObservationCount: 0,
        textCoverage: 0,
        faceCount: 1,
        landmarkedFaceCount: 1,
        maxFaceAreaRatio: 0.32
      })
    });

    expect(rendered.imageApprovalStatus).toBe("held");
    expect(rendered.imageWarnings.join(" ")).toMatch(/portrait|single face/i);
  });

  it("can retry Phoenix-generated replacement art after a failed audit and approve the corrected result", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-generated-retry-"));
    let attempts = 0;

    const rendered = await renderSignalCard({
      slug: "local-generated-retry",
      title: "A new workflow AI story needs Phoenix-owned replacement art",
      sourceName: "Fixture News",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_tools_agents",
      bucketLabel: "AI Tools & Agents"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      generateArticleImagesInProcess: true,
      imageReviewMemory: [
        {
          sceneLane: "workflow_system",
          reviewMode: "phoenix-owned",
          outcome: "rejected",
          metrics: { colorfulness: 0.5, sharpness: 0.5, luminanceStdDev: 0.5, readability: 0.02 }
        },
        {
          sceneLane: "workflow_system",
          reviewMode: "phoenix-owned",
          outcome: "rejected",
          metrics: { colorfulness: 1, sharpness: 1, luminanceStdDev: 1, readability: 0.04 }
        },
        {
          sceneLane: "workflow_system",
          reviewMode: "phoenix-owned",
          outcome: "approved",
          metrics: { colorfulness: 55, sharpness: 18, luminanceStdDev: 52, readability: 0.7 }
        },
        {
          sceneLane: "workflow_system",
          reviewMode: "phoenix-owned",
          outcome: "approved",
          metrics: { colorfulness: 62, sharpness: 20, luminanceStdDev: 58, readability: 0.78 }
        }
      ],
      generateArticleImageImpl: async () => {
        attempts += 1;
        if (attempts === 1) {
          return {
            buffer: await sharp({
              create: {
                width: 1200,
                height: 630,
                channels: 3,
                background: "#ffffff"
              }
            }).jpeg().toBuffer(),
            mimeType: "image/jpeg",
            promptUsed: "bright washed-out unusable image"
          };
        }
        return {
          buffer: await sharp(Buffer.from(`
            <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
              <rect width="1200" height="630" fill="#091828"/>
              <rect x="740" y="0" width="460" height="630" fill="#122e52"/>
              <circle cx="890" cy="220" r="120" fill="#2fd2ff" opacity="0.35"/>
              <rect x="104" y="124" width="270" height="140" rx="24" fill="#f47d2c" opacity="0.35"/>
              <path d="M88 458 C248 402, 380 336, 548 272 S890 182, 1112 118" stroke="#ffd07a" stroke-width="12" fill="none" stroke-linecap="round"/>
            </svg>
          `)).jpeg().toBuffer(),
          mimeType: "image/jpeg",
          promptUsed: "improved contrast image"
        };
      }
    });

    expect(attempts).toBeGreaterThan(1);
    expect(rendered.imageStrategy).toBe("held-for-codex-image");
    expect(rendered.imageApprovalStatus).toBe("approved");
    expect(rendered.imageSourceType).toBe("phoenix-owned");
    expect(rendered.imageCorrectionTrail.length).toBe(attempts);
    expect(rendered.imageCorrectionTrail[0].blocked).toBe(true);
    expect(rendered.imageCorrectionTrail[rendered.imageCorrectionTrail.length - 1].blocked).toBe(false);
    expect(rendered.socialImageUrl).toContain("/images/signals/generated/local-generated-retry.jpg");
  });

  it("holds Phoenix-owned replacement art when the editorial expert review says it still needs revision", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-editorial-reject-"));

    const rendered = await renderSignalCard({
      slug: "editorial-revise-hold",
      title: "A tools story needs an image that truly matches the article",
      sourceName: "Fixture News",
      publishedAt: "2026-05-15T04:00:00Z",
      bucket: "ai_tools_agents",
      bucketLabel: "AI Tools & Agents"
    }, {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      generateArticleImagesInProcess: true,
      generateArticleImageImpl: async () => ({
        buffer: await sharp(Buffer.from(`
          <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
            <rect width="1200" height="630" fill="#071522"/>
            <rect x="0" y="0" width="520" height="630" fill="#0f2f4a"/>
            <circle cx="860" cy="220" r="122" fill="#2ed3ff" opacity="0.28"/>
            <rect x="118" y="132" width="248" height="118" rx="24" fill="#f3924a" opacity="0.34"/>
            <path d="M110 452 C290 388, 432 312, 592 246 S908 168, 1110 118" stroke="#ffd07a" stroke-width="12" fill="none" stroke-linecap="round"/>
          </svg>
        `)).jpeg().toBuffer(),
        mimeType: "image/jpeg",
        promptUsed: "strong-looking but contextually wrong image"
      }),
      editorialReviewImpl: async () => ({
        verdict: "revise",
        storyFit: "weak",
        headlinePlacementRisk: "low",
        confidence: "high",
        notes: ["That image has nothing to do with the article."],
        fixes: ["Use a scene tied to the actual workflow in the story."]
      })
    });

    expect(rendered.imageStrategy).toBe("held-for-codex-image");
    expect(rendered.imageApprovalStatus).toBe("held");
    expect(rendered.imageHoldReason).toBe("allowlisted-source-validation-failed");
    expect(rendered.imageAudit?.editorialModelReview?.normalizedVerdict).toBe("revise");
    expect(rendered.imageWarnings.join(" ")).toMatch(/editorial expert review/i);
  });

  it("builds a local replacement queue with diagnosis and nearest examples for held stories", () => {
    const queue = buildImageReviewQueue([
      {
        feedId: "founder-market",
        heldItems: [
          {
            slug: "trade-show-held",
            title: "A trade show story needs a better image",
            sourceName: "Entrepreneur",
            sourceUrl: "https://example.com/trade-show",
            sourceImagePolicy: "allowed",
            holdReason: "allowlisted-source-validation-failed",
            expectedArticleImagePath: "/images/signals/source-art/trade-show-held.jpg",
            sceneLane: "event_pipeline",
            sceneMotif: "booth-stage",
            imageStrategy: "held-for-codex-image",
            imageSourceType: "pending-codex-image",
            imageFingerprint: "abc123",
            score: 91,
            bucket: "founder_strategy",
            bucketLabel: "Founder Strategy & Operations",
            publishedAt: "2026-05-15T04:00:00Z",
            imageBrief: {
              storySubject: "pipeline created from real-world attention",
              visualMetaphor: "A premium trade-show scene with live demos and deal momentum.",
              sceneLane: "event_pipeline"
            },
            imageAudit: {
              colorfulness: 11,
              sharpness: 6,
              luminanceStdDev: 20,
              bestComposition: { readability: 0.21 },
              editorialNotes: ["The event scene feels generic instead of high-stakes."],
              recommendedFixes: ["Use a trade-show image with a stronger focal moment and cleaner negative space."]
            },
            imageCorrectionTrail: []
          }
        ]
      }
    ], [
      {
        title: "Strong trade show example",
        originalUrl: "https://example.com/strong",
        sourceName: "Entrepreneur",
        sceneLane: "event_pipeline",
        reviewMode: "source-image",
        outcome: "approved",
        imageFingerprint: "good1",
        metrics: { colorfulness: 42, sharpness: 18, luminanceStdDev: 58, readability: 0.79 }
      },
      {
        title: "Weak trade show example",
        originalUrl: "https://example.com/weak",
        sourceName: "Entrepreneur",
        sceneLane: "event_pipeline",
        reviewMode: "source-image",
        outcome: "rejected",
        imageFingerprint: "bad1",
        holdReason: "allowlisted-source-validation-failed",
        metrics: { colorfulness: 9, sharpness: 4, luminanceStdDev: 18, readability: 0.18 }
      }
    ], { generatedAt: "2026-05-15T05:00:00Z" });

    expect(queue.totalHeld).toBe(1);
    expect(queue.items[0].diagnosis.notes[0]).toContain("generic");
    expect(queue.items[0].nearestApprovedExamples[0].title).toBe("Strong trade show example");
    expect(queue.items[0].nearestRejectedExamples[0].title).toBe("Weak trade show example");
    expect(queue.items[0].nextPromptGuide).toContain("Phoenix Venture Studios attribution");
  });

  it("builds a review repository summary by lane and mode", () => {
    const repository = buildImageReviewRepository([
      {
        sceneLane: "event_pipeline",
        reviewMode: "source-image",
        outcome: "approved",
        title: "Good event image",
        sourceName: "Entrepreneur",
        originalUrl: "https://example.com/good",
        imageFingerprint: "good-1",
        metrics: { colorfulness: 42, sharpness: 18, luminanceStdDev: 55, readability: 0.8 }
      },
      {
        sceneLane: "event_pipeline",
        reviewMode: "source-image",
        outcome: "rejected",
        title: "Bad event image",
        sourceName: "Entrepreneur",
        originalUrl: "https://example.com/bad",
        imageFingerprint: "bad-1",
        holdReason: "allowlisted-source-validation-failed",
        metrics: { colorfulness: 11, sharpness: 4, luminanceStdDev: 20, readability: 0.2 }
      }
    ], { generatedAt: "2026-05-15T05:00:00Z" });

    expect(repository.totalEntries).toBe(2);
    expect(repository.groups[0].sceneLane).toBe("event_pipeline");
    expect(repository.groups[0].reviewMode).toBe("source-image");
    expect(repository.groups[0].approved).toBe(1);
    expect(repository.groups[0].rejected).toBe(1);
    expect(repository.groups[0].commonRejectionReasons[0].reason).toBe("allowlisted-source-validation-failed");
    expect(repository.groups[0].strongestApprovedExamples[0].title).toBe("Good event image");
  });

  it("avoids reusing recent visual fingerprints for similar new cards", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-visual-uniqueness-"));
    const recentFingerprint = "chip_infrastructure|memory-rails|left-anchor|steel|signal-rail|opportunity_window";
    const recentItems = [{
      _phoenix: {
        lastSeenAt: "2026-05-14T05:00:00Z",
        sceneLane: "chip_infrastructure",
        sceneMotif: "memory-rails",
        imageComposition: "left-anchor",
        imageTone: "steel",
        imageVariant: "signal-rail",
        imageTemplate: "opportunity_window",
        imageFingerprint: recentFingerprint,
      }
    }];

    const { items, errors } = await renderSignalCardsForItems([
      {
        slug: "chip-story-one",
        title: "A chip startup says memory is the real AI bottleneck",
        sourceName: "Fixture News",
        publishedAt: "2026-05-15T04:00:00Z",
        bucket: "funding_venture",
        bucketLabel: "Funding & Venture"
      },
      {
        slug: "chip-story-two",
        title: "Another inference company is racing to lower AI hardware costs",
        sourceName: "Fixture News",
        publishedAt: "2026-05-15T04:30:00Z",
        bucket: "funding_venture",
        bucketLabel: "Funding & Venture"
      }
    ], {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      recentItems
    });

    expect(errors).toHaveLength(0);
    expect(items[0].imageFingerprint).toBeTruthy();
    expect(items[1].imageFingerprint).toBeTruthy();
    expect(items[0].imageFingerprint).not.toBe(recentFingerprint);
    expect(items[1].imageFingerprint).not.toBe(recentFingerprint);
    expect(items[0].imageFingerprint).not.toBe(items[1].imageFingerprint);
  });

  it("reports card-generation errors without mutating the item into a broken image", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-signal-card-error-"));
    const { items, errors } = await renderSignalCardsForItems([
      {
        slug: "missing-background",
        title: "AI implementation signal",
        sourceName: "Fixture News",
        publishedAt: "2026-05-15T04:00:00Z",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents"
      }
    ], {
      outputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      backgroundPath: path.join(tempDir, "missing-background.jpg")
    });

    expect(errors).toHaveLength(1);
    expect(items[0].socialImageUrl).toBeUndefined();
  });

  it("emits custom feed metadata and feed paths for secondary feeds", () => {
    const xml = buildFeedXml([
      {
        title: "AI agents change sales operations",
        description: "Operators are using agent workflows to reduce manual follow-up.",
        url: "https://example.com/ai-agents",
        publishedAt: "2026-05-15T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents",
        score: 91
      }
    ], {
      now: new Date("2026-05-15T05:00:00Z"),
      siteUrl: "https://preview.example.com",
      title: "Phoenix Venture Studios - AI Attention",
      description: "AI consulting and implementation signals.",
      feedFile: "ai-attention.xml"
    });

    expect(validateRss(xml)).toBe(true);
    expect(xml).toContain("<title>Phoenix Venture Studios - AI Attention</title>");
    expect(xml).toContain("https://preview.example.com/rss/ai-attention.xml");
  });

  it("generates multiple feeds with separate output filenames", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-multi-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1 },
      sources: [{
        id: "fixture",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>AI agents help businesses automate sales follow-up</title>
        <link>https://example.com/agents</link>
        <description>New agent workflows support revenue operations and automation.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const multiSlug = buildSignalSlug({
      title: "AI agents help businesses automate sales follow-up",
      originalUrl: "https://example.com/agents",
      url: "https://example.com/agents",
    });
    const multiArticleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(multiArticleDir, { recursive: true });
    await writeEditorialTestArt(path.join(multiArticleDir, `${multiSlug}.jpg`), {
      background: "#35556b",
      panel: "#17374a",
      accent: "#27d4ff",
      secondary: "#ff9a4a",
    });

    const result = await buildAllStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      feedConfigs: [
        {
          id: "fixture-founder",
          registryPath,
          outputFiles: { xml: "feed.xml", json: "feed.json", items: "items.json", reportMd: "run-report.md", reportJson: "run-report.json" }
        },
        {
          id: "fixture-ai",
          registryPath,
          title: "AI Attention",
          description: "Fixture secondary feed.",
          outputFiles: {
            xml: "ai-attention.xml",
            json: "ai-attention.json",
            items: "ai-attention-items.json",
            reportMd: "ai-attention-run-report.md",
            reportJson: "ai-attention-run-report.json"
          }
        }
      ]
    });

    expect(result.allValid).toBe(true);
    expect(await fs.readFile(path.join(tempDir, "feed.xml"), "utf8")).toContain("AI agents help businesses");
    expect(await fs.readFile(path.join(tempDir, "ai-attention.xml"), "utf8")).toContain("<title>AI Attention</title>");
    expect(await fs.readFile(path.join(tempDir, "ai-attention.xml"), "utf8")).toContain("https://preview.example.com/rss/ai-attention.xml");
    expect(JSON.parse(await fs.readFile(path.join(tempDir, "ai-attention.json"), "utf8")).feed_url).toBe("https://preview.example.com/rss/ai-attention.json");
    expect(JSON.parse(await fs.readFile(path.join(tempDir, "ai-attention.json"), "utf8")).items[0]._phoenix.feedRole).toBeTruthy();
  });

  it("can generate a one-item social queue feed", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-social-queue-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 2 },
      sources: [{
        id: "fixture",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Visa invests in Replit to power agentic payments for developers</title>
        <link>https://example.com/visa-replit</link>
        <description>Visa employees are using Replit for prototypes while the company explores agentic payments.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
      <item>
        <title>OpenAI ships a new coding-agent workflow for builders</title>
        <link>https://example.com/openai-agent-workflow</link>
        <description>A new workflow helps teams move faster with coding agents and app development.</description>
        <pubDate>Fri, 15 May 2026 03:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const queueArticleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(queueArticleDir, { recursive: true });
    for (const [title, url, background] of [
      ["Visa invests in Replit to power agentic payments for developers", "https://example.com/visa-replit", "#4d5f73"],
      ["OpenAI ships a new coding-agent workflow for builders", "https://example.com/openai-agent-workflow", "#21445e"],
    ]) {
      const slug = buildSignalSlug({ title, originalUrl: url, url });
      await writeEditorialTestArt(path.join(queueArticleDir, `${slug}.jpg`), {
        background,
      });
    }

    const { report } = await buildStaticRss({
      id: "fixture-social",
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      maxItems: 1,
      outputFiles: {
        xml: "social.xml",
        json: "social.json",
        items: "social-items.json",
        reportMd: "social-run-report.md",
        reportJson: "social-run-report.json"
      }
    });

    const xml = await fs.readFile(path.join(tempDir, "social.xml"), "utf8");
    const feed = JSON.parse(await fs.readFile(path.join(tempDir, "social.json"), "utf8"));
    expect(report.feedValid).toBe(true);
    expect((xml.match(/<item>/g) || [])).toHaveLength(1);
    expect(feed.items).toHaveLength(1);
    expect(feed.feed_url).toBe("https://preview.example.com/rss/social.json");
    expect(feed.items[0]._phoenix.feedId).toBe("fixture-social");
  });

  it("skips prior social queue items before selecting the next story", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-social-advance-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 2 },
      sources: [{
        id: "fixture",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Visa invests in Replit to power agentic payments for developers</title>
        <link>https://example.com/visa-replit</link>
        <description>Visa employees are using Replit for prototypes while the company explores agentic payments.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
      <item>
        <title>OpenAI ships a new coding-agent workflow for builders</title>
        <link>https://example.com/openai-agent-workflow</link>
        <description>A new workflow helps teams move faster with coding agents and app development.</description>
        <pubDate>Fri, 15 May 2026 03:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const advanceArticleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(advanceArticleDir, { recursive: true });
    for (const [title, url, background] of [
      ["Visa invests in Replit to power agentic payments for developers", "https://example.com/visa-replit", "#3a5266"],
      ["OpenAI ships a new coding-agent workflow for builders", "https://example.com/openai-agent-workflow", "#2d4358"],
    ]) {
      const slug = buildSignalSlug({ title, originalUrl: url, url });
      await writeEditorialTestArt(path.join(advanceArticleDir, `${slug}.jpg`), {
        background,
      });
    }

    const { report } = await buildStaticRss({
      id: "fixture-social",
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      maxItems: 1,
      excludeRecentSelections: true,
      recentItems: [{
        originalUrl: "https://example.com/visa-replit",
        feedIds: ["fixture-social"]
      }],
      outputFiles: {
        xml: "social.xml",
        json: "social.json",
        items: "social-items.json",
        reportMd: "social-run-report.md",
        reportJson: "social-run-report.json"
      }
    });

    const feed = JSON.parse(await fs.readFile(path.join(tempDir, "social.json"), "utf8"));
    expect(report.items.recentFiltered).toBe(1);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].title).toBe("OpenAI ships a new coding-agent workflow for builders");
  });

  it("uses queue rotation time for social feeds while archive feeds keep article time", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-queue-time-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1 },
      sources: [{
        id: "fixture",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const articlePublishedAt = "Fri, 15 May 2026 03:00:00 GMT";
    const queueNow = new Date("2026-05-15T05:00:00Z");
    const title = "OpenAI ships a new coding-agent workflow for builders";
    const url = "https://example.com/openai-agent-workflow";
    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>${title}</title>
        <link>${url}</link>
        <description>A new workflow helps teams move faster with coding agents and app development.</description>
        <pubDate>${articlePublishedAt}</pubDate>
      </item>
    </channel></rss>`;
    const articleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(articleDir, { recursive: true });
    const slug = buildSignalSlug({ title, originalUrl: url, url });
    await writeEditorialTestArt(path.join(articleDir, `${slug}.jpg`), {
      background: "#21445e",
    });

    await buildStaticRss({
      id: "founder-tools",
      now: queueNow,
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      outputFiles: {
        xml: "tools.xml",
        json: "tools.json",
        items: "tools-items.json",
        reportMd: "tools-run-report.md",
        reportJson: "tools-run-report.json"
      }
    });

    const { report } = await buildStaticRss({
      id: "founder-tools-social",
      now: queueNow,
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      outputFiles: {
        xml: "tools-social.xml",
        json: "tools-social.json",
        items: "tools-social-items.json",
        reportMd: "tools-social-run-report.md",
        reportJson: "tools-social-run-report.json"
      }
    });

    const archiveFeed = JSON.parse(await fs.readFile(path.join(tempDir, "tools.json"), "utf8"));
    const socialFeed = JSON.parse(await fs.readFile(path.join(tempDir, "tools-social.json"), "utf8"));
    expect(archiveFeed.items[0].date_published).toBe(new Date(articlePublishedAt).toISOString());
    expect(socialFeed.items[0].date_published).toBe(queueNow.toISOString());
    expect(report.queue.queuePublishedAt).toBe(queueNow.toISOString());
  });

  it("treats prior selections from any social queue as recent for social cooldown", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-social-shared-cooldown-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_implementation: 2, business_automation: 1 },
      sources: [{
        id: "fixture",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_implementation", "business_automation"]
      }]
    }));

    const firstTitle = "Endava redesigns software delivery around AI agents";
    const firstUrl = "https://example.com/endava-agents";
    const secondTitle = "Service teams roll out AI copilots to redesign support operations";
    const secondUrl = "https://example.com/support-ops-copilot";
    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>${firstTitle}</title>
        <link>${firstUrl}</link>
        <description>Teams redesigned delivery workflows around AI agents.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
      <item>
        <title>${secondTitle}</title>
        <link>${secondUrl}</link>
        <description>Operators rolled out a new AI workflow to redesign support operations and shorten response times.</description>
        <pubDate>Fri, 15 May 2026 03:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const articleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(articleDir, { recursive: true });
    for (const [title, url, background] of [
      [firstTitle, firstUrl, "#31546d"],
      [secondTitle, secondUrl, "#21445e"],
    ]) {
      const slug = buildSignalSlug({ title, originalUrl: url, url });
      await writeEditorialTestArt(path.join(articleDir, `${slug}.jpg`), { background });
    }

    const { report } = await buildStaticRss({
      id: "ai-attention-social",
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      excludeRecentSelections: true,
      recentItems: [{
        originalUrl: firstUrl,
        feedIds: ["founder-tools-social"]
      }],
      outputFiles: {
        xml: "ai-attention-social.xml",
        json: "ai-attention-social.json",
        items: "ai-attention-social-items.json",
        reportMd: "ai-attention-social-run-report.md",
        reportJson: "ai-attention-social-run-report.json"
      }
    });

    expect(report.items.recentFiltered).toBe(1);
    expect(report.queue.excludedByRecent).toBe(1);
    expect(report.queue.candidates).toHaveLength(1);
    expect(report.queue.candidates[0].title).toBe(secondTitle);
  });

  it("generates social-card images during a static RSS build", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-social-images-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1 },
      sources: [{
        id: "fixture-ai",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>AI agents help businesses automate sales follow-up</title>
        <link>https://example.com/agents</link>
        <description>New agent workflows support revenue operations and automation.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const slug = buildSignalSlug({
      title: "AI agents help businesses automate sales follow-up",
      originalUrl: "https://example.com/agents",
      url: "https://example.com/agents",
    });
    const articleArtDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(articleArtDir, { recursive: true });
    await writeEditorialTestArt(path.join(articleArtDir, `${slug}.jpg`), {
      background: "#23445c",
      panel: "#0f2f4a",
      accent: "#29d1ff",
      secondary: "#f3924a",
    });

    const { report } = await buildStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml
    });

    const feed = JSON.parse(await fs.readFile(path.join(tempDir, "feed.json"), "utf8"));
    const item = feed.items[0];
    const imagePath = item._phoenix.socialImagePath;
    const strategyCounts = report.images.strategyCounts;
    expect(report.images.generated).toBe(1);
    expect(strategyCounts["held-for-codex-image"] || 0).toBe(1);
    expect(item.image).toContain("/images/signals/generated/");
    expect(item._phoenix.imageStrategy).toBeTruthy();
    expect(item._phoenix.imageFamily).toBeTruthy();
    expect(item._phoenix.imageRightsStatus).toBe("owned-or-licensed");
    expect(item._phoenix.sceneLane).toBeTruthy();
    expect(item._phoenix.sceneMotif).toBeTruthy();
    expect(item._phoenix.imageFingerprint).toBeTruthy();
    expect(await fs.stat(path.join(tempDir, imagePath.replace(/^\//, "")))).toBeTruthy();
  });

  it("does not hold solely because RSS and article metadata omit images", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-no-image-fallback-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1 },
      sources: [{
        id: "fixture-ai",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>OpenAI ships a new coding-agent workflow for builders</title>
        <link>https://example.com/openai-agent-workflow</link>
        <description>A new workflow helps teams move faster with coding agents and app development.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;

    const { report } = await buildStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async (url) => url === "https://example.com/feed.xml"
        ? fixtureXml
        : "<!doctype html><html><head><title>No image article</title></head><body>No image.</body></html>"
    });

    const feed = JSON.parse(await fs.readFile(path.join(tempDir, "feed.json"), "utf8"));
    expect(report.feedValid).toBe(true);
    expect(report.images.held).toBe(0);
    expect(report.selectedItems[0].imageDiagnostic.feedImageMissing).toBe(true);
    expect(report.selectedItems[0].imageDiagnostic.articleImageFound).toBe(false);
    expect(report.selectedItems[0].imageDiagnosticReason).toContain("RSS image missing");
    expect(feed.items[0].image).toContain("/images/signals/generated/");
    expect(feed.items[0]._phoenix.sourceImageUrl).toBe("");
  });

  it("uses Phoenix-owned fallback art and warnings for non-allowlisted source-image references", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-source-policy-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_implementation: 1 },
      sources: [{
        id: "google-ai-blog",
        name: "Google AI Blog",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_implementation"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Catch up with Dialogues on-stage at Google I/O 2026</title>
        <link>https://blog.google/innovation-and-ai/technology/ai/io-2026-dialogues-recap/</link>
        <description><![CDATA[<img src="https://storage.googleapis.com/gweb-uniblog-publish-prod/images/IO26_Dialogues_3z680sK.max-600x600.format-webp.webp" /> AI implementation takeaways for operators.]]></description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;

    const { report } = await buildStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml
    });

    const feed = JSON.parse(await fs.readFile(path.join(tempDir, "feed.json"), "utf8"));

    expect(report.feedValid).toBe(true);
    expect(report.preservedPreviousFeed).toBe(false);
    expect(report.images.manualReviewNeeded).toBe(1);
    expect(report.images.held).toBe(0);
    expect(report.images.approved).toBe(1);
    expect(report.images.creativeFollowUpSelected).toBe(1);
    expect(report.images.warnings.length).toBeGreaterThanOrEqual(1);
    expect(report.images.warnings.some((entry) => /reference-only|manual review|best approved Phoenix-owned background/i.test(entry.warning))).toBe(true);
    expect(report.selectedItems[0].expectedArticleImagePath).toContain("/images/signals/source-art/");
    expect(report.selectedItems[0].imageDiagnosticReason).toMatch(/Phoenix generated art used|Phoenix-owned background/i);
    expect(feed.items[0].image).toContain("/images/signals/generated/");
    expect(feed.items[0].image).not.toBe("https://storage.googleapis.com/gweb-uniblog-publish-prod/images/IO26_Dialogues_3z680sK.max-600x600.format-webp.webp");
    expect(feed.items[0]._phoenix.sourceImageUrl).toBe("");
  });

  it("records lead Founder Signal depth warnings when top feed items lack depth artifacts", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-depth-audit-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1 },
      sources: [{
        id: "fixture",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>OpenAI ships a new coding-agent workflow for builders</title>
        <link>https://example.com/openai-agent-workflow</link>
        <description>A new workflow helps teams move faster with coding agents and app development.</description>
        <pubDate>Fri, 15 May 2026 03:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;

    const articleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(articleDir, { recursive: true });
    const slug = buildSignalSlug({
      title: "OpenAI ships a new coding-agent workflow for builders",
      originalUrl: "https://example.com/openai-agent-workflow",
      url: "https://example.com/openai-agent-workflow",
    });
    await writeEditorialTestArt(path.join(articleDir, `${slug}.jpg`), {
      background: "#21445e",
    });

    const { report } = await buildStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
    });

    const reportMd = await fs.readFile(path.join(tempDir, "run-report.md"), "utf8");
    expect(report.feedValid).toBe(true);
    expect(report.editorial.depthAudit.checkedLeadItems).toBe(1);
    expect(report.editorial.depthAudit.thinLeadItems).toBe(1);
    expect(report.editorial.depthAudit.leadItemsWithDepth).toBe(0);
    expect(report.editorial.warnings.some((warning) => /lead Founder Signal item is shipping without articleBody/i.test(warning))).toBe(true);
    expect(reportMd).toContain("## Lead Depth Audit");
    expect(reportMd).toContain("Thin lead items: 1");
  });

  it("publishes social queue items with approved Phoenix fallback backgrounds when story art is missing", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-social-sample-ready-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_implementation: 1 },
      sources: [{
        id: "google-ai-blog",
        name: "Google AI Blog",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_implementation"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Catch up with Dialogues on-stage at Google I/O 2026</title>
        <link>https://blog.google/innovation-and-ai/technology/ai/io-2026-dialogues-recap/</link>
        <description><![CDATA[<img src="https://storage.googleapis.com/gweb-uniblog-publish-prod/images/IO26_Dialogues_3z680sK.max-600x600.format-webp.webp" /> AI implementation takeaways for operators.]]></description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;

    const { report } = await buildStaticRss({
      id: "founder-tools-social",
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      maxItems: 1,
      excludeRecentSelections: true,
      outputFiles: {
        xml: "tools-social.xml",
        json: "tools-social.json",
        items: "tools-social-items.json",
        reportMd: "tools-social-run-report.md",
        reportJson: "tools-social-run-report.json"
      }
    });

    expect(report.feedValid).toBe(false);
    expect(report.preservedPreviousFeed).toBe(false);
    expect(report.queue.isSocialQueue).toBe(true);
    expect(report.queue.candidatePoolSize).toBe(1);
    expect(report.queue.eligibleSelected).toBe(false);
    expect(report.queue.sampleReady).toBe(false);
    expect(report.queue.queueRotationReason).toBe("held-no-eligible-article-image");
    expect(report.images.manualReviewNeeded).toBe(1);
    expect(report.images.held).toBe(0);
    expect(report.images.approved).toBe(1);
    expect(report.images.creativeFollowUpSelected).toBe(1);
    expect(report.images.warnings.some((entry) => /best approved Phoenix-owned background/i.test(entry.warning))).toBe(true);
    expect(report.selectedItems).toHaveLength(0);
    expect(report.queue.candidates[0].imageStrategy).toBe("held-for-codex-image");
    expect(report.queue.candidates[0].imageApprovalStatus).toBe("approved");
    expect(report.queue.candidates[0].manualReviewNeeded).toBe(true);
  });

  it("preserves prior feed when strict image mode only finds held items", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-image-hold-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(path.join(tempDir, "feed.xml"), buildFeedXml([
      {
        title: "Previous valid signal",
        description: "This feed should remain in place.",
        url: "https://example.com/previous",
        publishedAt: "2026-05-14T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents",
        score: 88
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" }));
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1 },
      sources: [{
        id: "fixture-ai",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Visa invests in Replit to power agentic payments for developers</title>
        <link>https://example.com/visa-replit</link>
        <description>Visa employees are using Replit for prototypes while the company explores agentic payments.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const strictSlug = buildSignalSlug({
      title: "Visa invests in Replit to power agentic payments for developers",
      originalUrl: "https://example.com/visa-replit",
      url: "https://example.com/visa-replit",
    });
    const strictArticleArtDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(strictArticleArtDir, { recursive: true });
    await writeEditorialTestArt(path.join(strictArticleArtDir, `${strictSlug}.jpg`), {
      background: "#173d52",
      panel: "#10324a",
      accent: "#27d4ff",
      secondary: "#ff9a4a",
    });

    const { report } = await buildStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      requireArticleSpecificImages: true
    });

    expect(report.feedValid).toBe(true);
    expect(report.preservedPreviousFeed).toBe(false);
    expect(report.images.mode).toBe("source-or-codex-queue");
    expect(report.images.codexApproved).toBe(1);
    expect(report.validation.errors).toHaveLength(0);
  });

  it("keeps funding-only stories out of founder-tools feeds when they lack tool intent", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-tools-boundary-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1 },
      sources: [{
        id: "fixture-ai",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["funding_venture", "ai_tools_agents"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>This chip startup just raised $135M on a bet that AI demand keeps climbing</title>
        <link>https://example.com/ai-funding</link>
        <description>Investors are betting on future infrastructure demand.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
      <item>
        <title>OpenAI ships a new coding-agent workflow for builders</title>
        <link>https://example.com/openai-agent-workflow</link>
        <description>A new workflow helps teams move faster with coding agents and app development.</description>
        <pubDate>Fri, 15 May 2026 03:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const toolsArticleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(toolsArticleDir, { recursive: true });
    const toolsSlug = buildSignalSlug({
      title: "OpenAI ships a new coding-agent workflow for builders",
      originalUrl: "https://example.com/openai-agent-workflow",
      url: "https://example.com/openai-agent-workflow",
    });
    await writeEditorialTestArt(path.join(toolsArticleDir, `${toolsSlug}.jpg`), {
      background: "#29485f",
      panel: "#14364d",
      accent: "#2dd0ff",
      secondary: "#ff9746",
    });

    const { report } = await buildStaticRss({
      id: "founder-tools",
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      outputFiles: {
        xml: "tools.xml",
        json: "tools.json",
        items: "tools-items.json",
        reportMd: "tools-run-report.md",
        reportJson: "tools-run-report.json"
      }
    });

    const feed = JSON.parse(await fs.readFile(path.join(tempDir, "tools.json"), "utf8"));
    expect(report.feedValid).toBe(true);
    expect(report.items.feedBoundaryFiltered).toBe(1);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].title).toBe("OpenAI ships a new coding-agent workflow for builders");
  });

  it("keeps pure developer-tool launches out of ai-attention feeds when implementation intent is weak", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-ai-attention-boundary-"));
    const registryPath = path.join(tempDir, "registry.json");
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { ai_tools_agents: 1, ai_implementation: 1 },
      sources: [{
        id: "fixture-ai",
        name: "Fixture AI",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["ai_tools_agents", "ai_implementation"]
      }]
    }));

    const toolStoryTitle = "OpenAI ships a new coding-agent workflow for builders";
    const implementationStoryTitle = "Endava redesigns software delivery around AI agents";
    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>${toolStoryTitle}</title>
        <link>https://example.com/openai-agent-workflow</link>
        <description>A new workflow helps teams move faster with coding agents and app development.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
      <item>
        <title>${implementationStoryTitle}</title>
        <link>https://example.com/endava-agents</link>
        <description>Software delivery teams compressed work from weeks to hours after an internal AI rollout.</description>
        <pubDate>Fri, 15 May 2026 03:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const articleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(articleDir, { recursive: true });
    for (const [title, url, background] of [
      [toolStoryTitle, "https://example.com/openai-agent-workflow", "#21445e"],
      [implementationStoryTitle, "https://example.com/endava-agents", "#31546d"],
    ]) {
      const slug = buildSignalSlug({ title, originalUrl: url, url });
      await writeEditorialTestArt(path.join(articleDir, `${slug}.jpg`), { background });
    }

    const { report } = await buildStaticRss({
      id: "ai-attention",
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      siteUrl: "https://preview.example.com",
      fetchTextImpl: async () => fixtureXml,
      outputFiles: {
        xml: "ai-attention.xml",
        json: "ai-attention.json",
        items: "ai-attention-items.json",
        reportMd: "ai-attention-run-report.md",
        reportJson: "ai-attention-run-report.json"
      }
    });

    expect(report.feedValid).toBe(true);
    expect(report.items.feedBoundaryFiltered).toBe(1);
    expect(report.selectedItems).toHaveLength(1);
    expect(report.selectedItems[0].title).toBe(implementationStoryTitle);
  });

  it("writes recent selection history during normal generation-compatible flows", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-history-write-"));
    const history = await writeRecentSelectionHistory(tempDir, [{
      report: {
        feedId: "founder-tools-social",
        selectedItems: [{
          title: "Endava redesigns software delivery around AI agents",
          originalUrl: "https://example.com/endava-agents",
          internalUrl: "https://preview.example.com/founder-signal/signals/endava-redesigns/",
          slug: "endava-redesigns",
          bucket: "ai_implementation",
          bucketLabel: "AI Implementation",
          feedRole: "founder-tools",
          sourceName: "Fixture AI",
          socialImagePath: "/images/signals/generated/endava-redesigns.jpg",
          imageStrategy: "held-for-codex-image",
          imageFamily: "ai_opportunity"
        }]
      }
    }], new Date("2026-05-15T05:00:00Z"));

    const written = JSON.parse(await fs.readFile(path.join(tempDir, "autonomous-history.json"), "utf8"));
    expect(history.itemCount).toBe(1);
    expect(written.items[0].originalUrl).toBe("https://example.com/endava-agents");
    expect(written.items[0].feedIds).toEqual(["founder-tools-social"]);
    expect(written.items[0].selectedCount).toBe(1);
  });

  it("rejects preview publish when the bundle manifest no longer matches the generated files", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-bundle-manifest-"));
    await fs.writeFile(path.join(tempDir, "feed.json"), JSON.stringify({ ok: true }, null, 2));
    const original = await fs.readFile(path.join(tempDir, "feed.json"));
    await fs.writeFile(path.join(tempDir, "bundle-manifest.json"), JSON.stringify({
      files: {
        "feed.json": createHash("sha256").update(original).digest("hex")
      }
    }, null, 2));

    await expect(assertBundleManifestMatchesDirectory(tempDir)).resolves.toBeUndefined();

    await fs.writeFile(path.join(tempDir, "feed.json"), JSON.stringify({ ok: false }, null, 2));
    await expect(assertBundleManifestMatchesDirectory(tempDir)).rejects.toThrow(/no longer matches bundle-manifest\.json/i);
  });

  it("writes static signal pages with raw social metadata", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-signal-pages-"));
    const rssDir = path.join(tempDir, "rss");
    await fs.mkdir(rssDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, "index.html"), `<!doctype html><html><head>
      <title>Phoenix Venture Studios</title>
      <meta name="description" content="Default">
      <link rel="canonical" href="https://preview.example.com/">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://preview.example.com/">
      <meta property="og:title" content="Phoenix Venture Studios">
      <meta property="og:description" content="Default">
      <meta property="og:image" content="https://preview.example.com/default.jpg">
      <meta name="twitter:card" content="summary_large_image">
      <meta name="twitter:title" content="Phoenix Venture Studios">
      <meta name="twitter:description" content="Default">
      <meta name="twitter:image" content="https://preview.example.com/default.jpg">
    </head><body><div id="root"></div></body></html>`);

    const json = buildFeedJson([
      {
        title: "AI agents change sales operations",
        description: "Operators are using agent workflows to reduce manual follow-up.",
        url: "https://example.com/ai-agents",
        publishedAt: "2026-05-15T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        imageStrategy: "held-for-codex-image",
        imageApprovalStatus: "approved",
        imagePath: "/images/signals/generated/ai-agents-change-sales-operations-47907e2e.jpg",
        socialImagePath: "/images/signals/generated/ai-agents-change-sales-operations-47907e2e.jpg",
        imageUrl: "https://preview.example.com/images/signals/generated/ai-agents-change-sales-operations-47907e2e.jpg",
        socialImageUrl: "https://preview.example.com/images/signals/generated/ai-agents-change-sales-operations-47907e2e.jpg",
        bucket: "ai_tools_agents",
        bucketLabel: "AI Tools & Agents",
        score: 91
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    await fs.writeFile(path.join(rssDir, "ai-attention.json"), JSON.stringify(json, null, 2));
    const result = await writeSignalStaticPages({
      targetRoot: tempDir,
      rssDir,
      siteUrl: "https://preview.example.com"
    });

    const slug = json.items[0]._phoenix.slug;
    const html = await fs.readFile(path.join(tempDir, "founder-signal", "signals", slug, "index.html"), "utf8");
    expect(result.count).toBe(1);
    expect(html).toContain(`<meta property="og:url" content="https://preview.example.com/founder-signal/signals/${slug}/"`);
    expect(html).toContain('<meta property="og:image" content="https://preview.example.com/images/signals/generated/ai-agents-change-sales-operations-47907e2e.jpg"');
    expect(html).toContain("<title>AI agents change sales operations | Phoenix Venture Studios</title>");
    expect(html).toContain('<meta name="twitter:image" content="https://preview.example.com/images/signals/generated/ai-agents-change-sales-operations-47907e2e.jpg"');
  });

  it("preserves the previous valid feed when the current source set is empty", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-preserve-"));
    const registryPath = path.join(tempDir, "registry.json");
    const previousXml = buildFeedXml([
      {
        title: "Previous valid signal",
        description: "This feed should remain in place.",
        url: "https://example.com/previous",
        publishedAt: "2026-05-14T04:00:00Z",
        sourceName: "Fixture",
        sourceUrl: "https://example.com/feed.xml",
        bucket: "capital_credit",
        bucketLabel: "Capital & Credit",
        score: 88
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    await fs.writeFile(path.join(tempDir, "feed.xml"), previousXml);
    await fs.writeFile(registryPath, JSON.stringify({
      targets: { capital_credit: 1 },
      sources: [{
        id: "fixture",
        name: "Fixture News",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: false,
        score: 80,
        buckets: ["capital_credit"]
      }]
    }));

    const { report } = await buildStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      siteUrl: "https://preview.example.com"
    });

    expect(report.feedValid).toBe(false);
    expect(report.preservedPreviousFeed).toBe(true);
    expect(await fs.readFile(path.join(tempDir, "feed.xml"), "utf8")).toBe(previousXml);
  });

  it("uses PHOENIX_RSS_SITE_URL when no explicit siteUrl option is passed", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-rss-site-url-"));
    const registryPath = path.join(tempDir, "registry.json");
    process.env.PHOENIX_RSS_SITE_URL = "https://phoenixventurestudios.com";

    await fs.writeFile(registryPath, JSON.stringify({
      targets: { capital_credit: 1 },
      sources: [{
        id: "fixture",
        name: "Fixture News",
        url: "https://example.com/feed.xml",
        type: "rss",
        enabled: true,
        score: 80,
        buckets: ["capital_credit"]
      }]
    }));

    const fixtureXml = `<?xml version="1.0"?><rss><channel>
      <item>
        <title>Phoenix RSS site URL override test</title>
        <link>https://example.com/phoenix-site-url</link>
        <description>Capital timing changes for founders.</description>
        <pubDate>Fri, 15 May 2026 04:00:00 GMT</pubDate>
      </item>
    </channel></rss>`;
    const envArticleDir = path.join(tempDir, ARTICLE_SIGNAL_IMAGE_DIR);
    await fs.mkdir(envArticleDir, { recursive: true });
    const envSlug = buildSignalSlug({
      title: "Phoenix RSS site URL override test",
      originalUrl: "https://example.com/phoenix-site-url",
      url: "https://example.com/phoenix-site-url",
    });
    await writeEditorialTestArt(path.join(envArticleDir, `${envSlug}.jpg`), {
      background: "#385668",
      panel: "#16384a",
      accent: "#2dd0ff",
      secondary: "#ff9a4a",
    });

    await buildStaticRss({
      now: new Date("2026-05-15T05:00:00Z"),
      registryPath,
      outputDir: tempDir,
      socialImageOutputRoot: tempDir,
      fetchTextImpl: async () => fixtureXml
    });

    const xml = await fs.readFile(path.join(tempDir, "feed.xml"), "utf8");
    const json = JSON.parse(await fs.readFile(path.join(tempDir, "feed.json"), "utf8"));

    expect(xml).toContain("https://phoenixventurestudios.com/founder-signal/signals/");
    expect(json.items[0]._phoenix.internalUrl).toContain("https://phoenixventurestudios.com/founder-signal/signals/");
  });
});
