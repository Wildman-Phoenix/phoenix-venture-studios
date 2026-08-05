import { describe, expect, it, vi } from "vitest";
import { selectRelatedStaticSignals, type StaticFeedArticle } from "@/lib/static-rss-feed";
import { shareFounderSignal } from "@/pages/FounderSignalDetail";

function signal(overrides: Partial<StaticFeedArticle>): StaticFeedArticle {
  return {
    headline: "Signal",
    source: "Phoenix",
    date: "Jul 10, 2026",
    summary: "Summary",
    url: "/founder-signal/signals/signal",
    ...overrides,
  };
}

describe("Founder Signal related discovery", () => {
  it("uses native share when available and copies the link when it is not", async () => {
    const nativeShare = vi.fn().mockResolvedValue(undefined);
    const copyLink = vi.fn().mockResolvedValue(undefined);
    const shareData = { title: "Founder signal", url: "https://example.com/signal" };

    await expect(shareFounderSignal(shareData, nativeShare, copyLink)).resolves.toBe("Shared");
    expect(nativeShare).toHaveBeenCalledWith(shareData);
    expect(copyLink).not.toHaveBeenCalled();

    await expect(shareFounderSignal(shareData, undefined, copyLink)).resolves.toBe("Link copied");
    expect(copyLink).toHaveBeenCalledWith(shareData.url);
  });

  it("excludes the current signal and duplicate identities", () => {
    const current = signal({ id: "one", slug: "one", url: "/founder-signal/signals/one", headline: "AI workflow shift" });
    const duplicate = signal({ id: "duplicate", slug: "one", url: "/founder-signal/signals/duplicate", headline: "Duplicate" });
    const related = signal({ id: "two", slug: "two", url: "/founder-signal/signals/two", headline: "AI tool signal" });

    expect(selectRelatedStaticSignals(current, [current, duplicate, related])).toEqual([related]);
  });

  it("ranks category, feed, topic overlap, then recency deterministically", () => {
    const current = signal({ slug: "current", url: "/current", headline: "AI workflow adoption", editorialCategory: "AI Operators", feedId: "market" });
    const sameCategory = signal({ slug: "category", url: "/category", headline: "Operator changes", editorialCategory: "AI Operators", feedId: "tools", publishedAt: "2026-07-01" });
    const sameFeed = signal({ slug: "feed", url: "/feed", headline: "Market funding signal", editorialCategory: "Funding", feedId: "market", publishedAt: "2026-07-10" });
    const recentTopic = signal({ slug: "recent", url: "/recent", headline: "AI workflow guide", editorialCategory: "Tools", feedId: "tools", publishedAt: "2026-07-11" });
    const olderTopic = signal({ slug: "older", url: "/older", headline: "AI workflow guide two", editorialCategory: "Tools", feedId: "tools", publishedAt: "2026-07-02" });

    expect(selectRelatedStaticSignals(current, [olderTopic, sameFeed, recentTopic, sameCategory], 3).map((item) => item.slug))
      .toEqual(["category", "recent", "older"]);
  });
});
