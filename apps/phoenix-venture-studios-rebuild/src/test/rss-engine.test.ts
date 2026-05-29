import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import {
  buildAllStaticRss,
  buildStaticRss,
  buildFeedJson,
  buildFeedXml,
  classifyItem,
  dedupeItems,
  escapeXml,
  parseFeedXml,
  scoreItem,
  selectItems,
  validateRss
} from "../../scripts/rss/generate-static-rss.mjs";
import {
  createImageBrief,
  renderSignalCard,
  renderSignalCardsForItems,
  resolveSourceImagePolicy,
  wrapText
} from "../../scripts/rss/signal-card-images.mjs";
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
        bucket: "capital_credit",
        bucketLabel: "Capital & Credit",
        score: 88
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    expect(validateRss(xml)).toBe(true);
    expect(xml).toContain("<![CDATA[A founder's AI & credit shift]]>");
    expect(xml).toContain("https://preview.example.com/founder-signal/signals/");
    expect(xml).toContain("https://preview.example.com/images/signal-business-credit.jpg");
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
        bucket: "capital_credit",
        bucketLabel: "Capital & Credit",
        score: 88
      }
    ], { now: new Date("2026-05-15T05:00:00Z"), siteUrl: "https://preview.example.com" });

    const [item] = json.items;
    expect(item.url).toContain("https://preview.example.com/founder-signal/signals/");
    expect(item.external_url).toBe("https://example.com/item?a=1&b=2");
    expect(item.image).toBe("https://preview.example.com/images/signal-business-credit.jpg");
    expect(item._phoenix.socialImageUrl).toBe("https://preview.example.com/images/signal-business-credit.jpg");
    expect(item._phoenix.imageStrategy).toBe("fallback-editorial");
    expect(item._phoenix.imageFamily).toBe("capital_readiness");
    expect(item._phoenix.imageRightsStatus).toBe("owned-or-licensed");
    expect(item._phoenix.imageBrief.storyAngle).toBe("Capital readiness");
    expect(item._phoenix.slug).toMatch(/^founder-s-ai-credit-shift-/);
    expect(item._phoenix.internalPath).toContain(`/founder-signal/signals/${item._phoenix.slug}`);
    expect(item._phoenix.originalUrl).toBe("https://example.com/item?a=1&b=2");
    expect(item._phoenix.whyItMatters).toContain("Capital access");
    expect(item._phoenix.simpleSummary).toContain("If you are building");
    expect(item._phoenix.trendContext).toBeTruthy();
    expect(item._phoenix.engagementPrompt).toContain("Drop your takeaway below");
    expect(item._phoenix.readingLevel.target).toBe("grade-5-plain-founder");
    expect(item._phoenix.editorialMode).toBe("phoenix-original-brief");
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

  it("renders a Phoenix-owned JPEG social card with readable overlay text", async () => {
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

    const outputPath = path.join(tempDir, rendered.socialImagePath.replace(/^\//, ""));
    const bytes = await fs.readFile(outputPath);
    expect(rendered.socialImageUrl).toBe("https://preview.example.com/images/signals/generated/ai-credit-special-characters.jpg");
    expect(bytes.subarray(0, 3).toString("hex")).toBe("ffd8ff");
    expect(bytes.length).toBeGreaterThan(25000);
    expect(rendered.imageFamily).toBe("capital_readiness");
    expect(rendered.imageStrategy).toMatch(/owned-photo-match|fallback-editorial/);
    expect(rendered.imageBrief.storyAngle).toBe("Capital readiness");
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
    expect(rendered.imageSourceType).toBe("source-image");
    expect(rendered.imageCredit).toBe("Allowed Source licensed image");
    expect(rendered.socialImageUrl).toContain("/images/signals/generated/allowlisted-source.jpg");
    expect(rendered.socialImageUrl).not.toBe("https://allowed.example/image.jpg");
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

    expect(rendered.imageStrategy).toMatch(/owned-photo-match|fallback-editorial/);
    expect(rendered.imageSourceType).toBe("phoenix-owned");
    expect(rendered.imageWarnings[0]).toContain("Allowlisted source image failed validation");
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
            xml: "tools.xml",
            json: "tools.json",
            items: "tools-items.json",
            reportMd: "tools-run-report.md",
            reportJson: "tools-run-report.json",
            aliases: [
              { from: "tools.xml", to: "ai-attention.xml" },
              { from: "tools.json", to: "ai-attention.json" }
            ]
          }
        }
      ]
    });

    expect(result.allValid).toBe(true);
    expect(await fs.readFile(path.join(tempDir, "feed.xml"), "utf8")).toContain("AI agents help businesses");
    expect(await fs.readFile(path.join(tempDir, "tools.xml"), "utf8")).toContain("<title>AI Attention</title>");
    expect(await fs.readFile(path.join(tempDir, "tools.xml"), "utf8")).toContain("https://preview.example.com/rss/tools.xml");
    expect(await fs.readFile(path.join(tempDir, "ai-attention.xml"), "utf8")).toContain("https://preview.example.com/rss/tools.xml");
    expect(JSON.parse(await fs.readFile(path.join(tempDir, "tools.json"), "utf8")).feed_url).toBe("https://preview.example.com/rss/tools.json");
    expect(JSON.parse(await fs.readFile(path.join(tempDir, "ai-attention.json"), "utf8")).feed_url).toBe("https://preview.example.com/rss/tools.json");
    expect(JSON.parse(await fs.readFile(path.join(tempDir, "tools.json"), "utf8")).items[0]._phoenix.feedRole).toBeTruthy();
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
    expect((strategyCounts["owned-photo-match"] || 0) + (strategyCounts["fallback-editorial"] || 0)).toBe(1);
    expect(item.image).toContain("/images/signals/generated/");
    expect(item._phoenix.imageStrategy).toBeTruthy();
    expect(item._phoenix.imageFamily).toBeTruthy();
    expect(item._phoenix.imageRightsStatus).toBe("owned-or-licensed");
    expect(await fs.stat(path.join(tempDir, imagePath.replace(/^\//, "")))).toBeTruthy();
  });

  it("surfaces manual review and warnings for non-allowlisted source-image references", async () => {
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

    expect(report.feedValid).toBe(true);
    expect(report.images.manualReviewNeeded).toBe(1);
    expect(report.images.warnings).toHaveLength(1);
    expect(report.images.warnings[0].warning).toMatch(/unmatched source|manual review|reference-only/i);

    const feed = JSON.parse(await fs.readFile(path.join(tempDir, "feed.json"), "utf8"));
    expect(feed.items[0]._phoenix.sourceImageUrl || "").toBe("");
    expect(feed.items[0]._phoenix.imageBrief.manualReviewNeeded).toBe(true);
    expect(feed.items[0]._phoenix.socialImageUrl).toContain("/images/signals/generated/");
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
    expect(html).toContain('<meta property="og:image" content="https://preview.example.com/images/signal-ai-infrastructure.jpg"');
    expect(html).toContain("<title>AI agents change sales operations | Phoenix Venture Studios</title>");
    expect(html).toContain('<meta name="twitter:image" content="https://preview.example.com/images/signal-ai-infrastructure.jpg"');
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
