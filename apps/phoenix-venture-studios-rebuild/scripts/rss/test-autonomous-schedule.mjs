import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { feedConfigsForRunSlot } from "./autonomous-rss-runner.mjs";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const schedule = JSON.parse(await fs.readFile(path.join(APP_ROOT, "rss-data/autonomous-schedule.json"), "utf8"));
const expected = {
  "early-morning": ["founder-market", "founder-tools", "ai-attention", "founder-market-social"],
  "mid-morning": ["founder-market", "founder-tools", "ai-attention", "founder-tools-social"],
  afternoon: ["founder-market", "founder-tools", "ai-attention", "ai-attention-social"],
  "late-night": ["founder-market", "founder-tools", "ai-attention"],
  "friday-ai-trend-sweep": ["founder-market", "founder-tools", "ai-attention"],
};

for (const [slot, feedIds] of Object.entries(expected)) {
  const actual = feedConfigsForRunSlot(slot).map((config) => config.id);
  assert.deepEqual(actual.sort(), feedIds.sort(), `${slot} feed selection must match its approved lane`);
}

for (const feed of schedule.feeds) {
  assert.equal(feed.maxItems, feed.id.endsWith("-social") ? 1 : 10, `${feed.id} item limit is incorrect`);
}

assert.throws(() => feedConfigsForRunSlot("unknown"), /Unknown Phoenix RSS run slot/);
console.log("Phoenix RSS schedule tests passed.");
