import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const RSS = path.join(ROOT, "public/rss");
const sources = ["feed.xml", "tools.xml", "ai-attention.xml"];

const entries = [];
for (const file of sources) {
  const xml = await fs.readFile(path.join(RSS, file), "utf8");
  for (const match of xml.matchAll(/<item>[\s\S]*?<\/item>/g)) {
    const block = match[0];
    const guid = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)?.[1]?.trim();
    const published = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
    if (guid && !entries.some((entry) => entry.guid === guid)) entries.push({ guid, published, block });
  }
}

entries.sort((a, b) => Date.parse(b.published || "") - Date.parse(a.published || ""));
const lastBuildDate = entries[0]?.published || new Date(0).toUTCString();
const output = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Phoenix Venture Studios - All Founder Signals</title>
    <description>Every Phoenix Founder Signal in one feed: market moves, practical tools, and applied AI intelligence for founders.</description>
    <link>https://phoenixventurestudios.com/founder-signal</link>
    <atom:link href="https://phoenixventurestudios.com/rss/all.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <language>en-us</language>
    <generator>Phoenix Venture Studios Combined RSS Builder</generator>
${entries.map((entry) => `    ${entry.block.replace(/\n/g, "\n    ")}`).join("\n")}
  </channel>
</rss>
`;

await fs.writeFile(path.join(RSS, "all.xml"), output, "utf8");
console.log(`Built public/rss/all.xml with ${entries.length} unique signals.`);
