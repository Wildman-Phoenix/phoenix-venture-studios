import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { buildStaticRss, buildFeedXml, collectYoutubeSource, loadResearchSources, editorialContentDigest } from "./generate-static-rss.mjs";

const registry = JSON.parse(await fs.readFile(new URL("../../rss-data/research-source-registry.json", import.meta.url)));
const required = ["matt-wolfe-youtube", "futuretools-news", "perplexity-matt-wolfe-friday-sweep"];
const friday = await loadResearchSources({ researchSources: registry.sources, now: new Date("2026-10-16T13:30:00Z"), researchSourceLimit: 8 }, "founder-tools");
assert.equal(friday.length, 8);
for (const id of required) assert.ok(friday.some((s) => s.id === id), `${id} must survive the supervisor's eight-source cap`);
assert.ok(friday.some((s) => s.id === "openai-platform"));
assert.ok(friday.some((s) => /(?:anthropic\.com|claude\.com)/.test(s.url)), "Retain official Anthropic/Claude evidence alongside discovery");
const tuesday = await loadResearchSources({ researchSources: registry.sources, now: new Date("2026-10-13T13:30:00Z"), researchSourceLimit: 8 }, "founder-tools");
assert.ok(tuesday.every((s) => !required.includes(s.id)));
const fridayEvening = await loadResearchSources({ researchSources: registry.sources, now: new Date("2026-10-17T02:00:00Z"), researchSourceLimit: 8 }, "founder-tools");
for (const id of required) assert.ok(fridayEvening.some((s) => s.id === id), "Friday cadence follows Detroit rather than the runner's UTC day");

const source = registry.sources.find((s) => s.id === "matt-wolfe-youtube");
const initial = { metadata: { channelMetadataRenderer: { externalId: "UChpleBmo18P08aKCIgti38g" } }, contents: { lockupViewModel: {
  contentId: "KGcuuhqmPhI", contentType: "LOCKUP_CONTENT_TYPE_VIDEO",
  metadata: { lockupMetadataViewModel: { title: { content: "AI News: useful model updates" }, metadata: { contentMetadataViewModel: { metadataRows: [{ metadataParts: [{ accessibilityLabel: "9 hours ago" }] }] } } } },
} } };
const html = `<script>var ytInitialData = ${JSON.stringify(initial)};</script>`;
const fetched = [];
const fallback = await collectYoutubeSource(source, async (url) => {
  fetched.push(url); if (url === source.url) throw new Error("HTTP 404"); return html;
}, { now: new Date("2026-10-17T01:00:00Z") });
assert.deepEqual(fetched, [source.url, source.fallbackUrl]);
assert.equal(fallback.items.length, 1);
assert.equal(fallback.items[0].url, "https://www.youtube.com/watch?v=KGcuuhqmPhI");
assert.equal(fallback.items[0].publishedAt, "2026-10-16T16:00:00.000Z");
assert.equal(fallback.items[0].requiresCorroboration, true);
assert.equal(fallback.items[0].sourceImageUrl, "");
assert.ok(fallback.warnings.length);

initial.metadata.channelMetadataRenderer.externalId = "wrong-channel";
await assert.rejects(collectYoutubeSource(source, async (url) => {
  if (url === source.url) throw new Error("HTTP 404");
  return `<script>var ytInitialData = ${JSON.stringify(initial)};</script>`;
}), /identity does not match/);
await assert.rejects(collectYoutubeSource({ ...source, fallbackUrl: "https://example.com/@mreflow/videos" }, async () => { throw new Error("HTTP 404"); }), /official public channel/);
const atom = `<feed><entry><title>Official video</title><link rel="alternate" href="https://www.youtube.com/watch?v=KGcuuhqmPhI"/><published>2026-10-16T16:00:00Z</published></entry></feed>`;
let reads = 0;
assert.equal((await collectYoutubeSource(source, async () => { reads++; return atom; })).items.length, 1);
assert.equal(reads, 1, "Working native RSS must not fetch the fallback");
console.log("PASS: Friday budget, official corroboration slots, weekday isolation, native Atom, verified channel fallback, and identity/domain rejection");

const dir = await fs.mkdtemp(path.join(os.tmpdir(), "phoenix-reviewed-preservation-"));
try {
  const url = "https://example.com/verified-release";
  const item = { title: "Reviewed release", publicTitle: "Reviewed release", originalUrl: url, url,
    editorialSourceUrl: url, editorialReviewStatus: "approved", articleBody: Array.from({ length: 4 }, () => "Verified source details and original workflow analysis. ".repeat(15)),
    sourceLinks: [{ label: "Primary source", url }], sourcePublishedAt: "2026-10-15T00:00:00Z", sourceDateStatus: "verified",
    imagePath: "/images/signals/source-art/verified.jpg", imageRightsStatus: "owned-or-licensed", imageApprovalStatus: "approved", imageStrategy: "held-for-codex-image", imageBrief: { manualReviewNeeded: false } };
  item.editorialContentDigest = editorialContentDigest(item);
  const xml = buildFeedXml([item], { now: new Date("2026-10-16T13:30:00Z") });
  const json = JSON.stringify({ items: [{ _phoenix: item }] });
  const registryPath = path.join(dir, "registry.json");
  await fs.writeFile(registryPath, JSON.stringify({ sources: [], targets: {}, maxPerSource: 2 }));
  await fs.writeFile(path.join(dir, "feed.xml"), xml);
  await fs.writeFile(path.join(dir, "feed.json"), json);
  const options = { registryPath, outputDir: dir, socialImageOutputRoot: dir, now: new Date("2026-10-16T13:30:00Z"), enableArticleMetadata: false, recentItems: [], generateSocialImages: false };
  const retained = await buildStaticRss(options);
  assert.equal(retained.report.preservedPreviousFeed, true);
  assert.equal(retained.report.retainedPreviousItems, 1);
  assert.equal(await fs.readFile(path.join(dir, "feed.xml"), "utf8"), xml);
  assert.equal(await fs.readFile(path.join(dir, "feed.json"), "utf8"), json);
  // Never restore the unreviewed source notes intentionally removed by the gate.
  await fs.writeFile(path.join(dir, "feed.json"), JSON.stringify({ items: [{ _phoenix: { ...item, editorialReviewStatus: "pending" } }] }));
  const held = await buildStaticRss(options);
  assert.equal(held.report.preservedPreviousFeed, false);
  assert.equal(JSON.parse(await fs.readFile(path.join(dir, "feed.json"), "utf8")).items.length, 0);
  console.log("PASS: empty runs retain reviewed eligible XML/JSON byte-for-byte; unreviewed legacy items remain held");
} finally { await fs.rm(dir, { recursive: true, force: true }); }
