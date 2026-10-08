import { describe, expect, it, vi, afterEach } from "vitest";
import { buildFeedJson, buildFeedXml } from "../../scripts/rss/generate-static-rss.mjs";
import { loadMergedStaticRssFeeds } from "@/lib/static-rss-feed";

afterEach(() => vi.unstubAllGlobals());
const inputs = [
  { title: "Building a Session-Ordered Kafka Pipeline in Go", url: "https://example.com/kafka" },
  { title: "VoiceGremlin: automated tests against AI phone agents", url: "https://example.com/voice" },
  { title: "Anthropic replaces lead form with an AI agent", url: "https://example.com/anthropic", description: "Sales pipeline and workflow" },
];
describe("source binding regression", () => {
  it.each(inputs)("does not substitute unrelated factual commentary for $title", (input) => {
    const item = { ...input, sourceName: "Original source", publishedAt: "2026-10-07T00:00:00Z", bucketLabel: "AI", articleBody: [] };
    const result = buildFeedJson([item]).items[0];
    expect(result.title).toBe(input.title);
    expect(result.external_url).toBe(input.url);
    expect(result.content_text).toContain(input.title);
    expect(result.content_text).not.toMatch(/million|below 50|fewer than half|trade show/);
    expect(result._phoenix.editorialMode).toBe("source-note");
    expect(result._phoenix.founderTakeaway).toBe("");
    expect(result._phoenix.imageBrief.storySubject).toBe(input.title);
    expect(buildFeedXml([item])).not.toMatch(/million|fewer than half|trade show/);
  });
  it("preserves a reviewed deep dive bound to the exact source", () => {
    const url = "https://example.com/kafka";
    const paragraphs = Array.from({ length: 4 }, (_, i) => `Reviewed section ${i}. ` + "Source backed explanation and practical steps. ".repeat(15));
    const input = { title: "Kafka pipeline", sourceTitle: "Kafka pipeline", url, articleBody: paragraphs, editorialSourceUrl: url, editorialReviewStatus: "approved", sourceLinks: [{label:"Original",url}], founderTakeaway: "Reviewed action step" };
    const item = buildFeedJson([input]).items[0];
    expect(item._phoenix.articleBody).toEqual(paragraphs);
    expect(item._phoenix.founderTakeaway).toBe("Reviewed action step");
    expect(item._phoenix.editorialMode).toBe("reviewed-source-briefing");
    expect(item.content_text.split("\n\n")[0].split(/\s+/).length).toBeLessThanOrEqual(80);
    expect(item.content_text).toContain(item.url);
    expect(item.content_text).toContain("Original reporting:");
    const noCommentary = buildFeedJson([{...input, founderTakeaway:undefined}]).items[0];
    expect(noCommentary._phoenix.founderTakeaway).toBeUndefined();
    expect(noCommentary._phoenix.whyItMatters).toBeUndefined();
    const mismatched = buildFeedJson([{...input, editorialSourceUrl:"https://example.com/other"}]).items[0];
    expect(mismatched._phoenix.articleBody).toEqual([]);
    expect(mismatched._phoenix.editorialMode).toBe("source-note");
  });
  it("retains tools and archived identities beyond the rolling limit", async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, json: async () => ({ items: url.includes("archive") ? [{ title: "Archived", id: "archived", _phoenix: { slug: "archived" } }] : url.includes("tools") ? [{ title: "VoiceGremlin", id: "voice", _phoenix: { slug: "voice" } }] : [] }) }));
    vi.stubGlobal("fetch", fetchMock);
    const { articles } = await loadMergedStaticRssFeeds(Number.MAX_SAFE_INTEGER, ["signal-archive.json", "feed.json", "tools.json", "ai-attention.json"]);
    expect(articles.map(a => a.slug)).toEqual(expect.arrayContaining(["voice", "archived"]));
    expect(articles.every(a => a.briefDepth === "signal-note")).toBe(true);
  });
});
