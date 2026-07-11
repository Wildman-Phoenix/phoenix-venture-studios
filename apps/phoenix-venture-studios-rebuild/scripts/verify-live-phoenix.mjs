import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bases = ["https://phoenixventurestudios-com.pages.dev", "https://phoenixventurestudios.com"];
const feeds = ["feed.xml", "tools.xml", "ai-attention.xml", "social.xml", "tools-social.xml", "ai-attention-social.xml"];
const evidence = { verifiedAt: new Date().toISOString(), bases: {}, parity: {}, signalPage: null };

for (const base of bases) {
  evidence.bases[base] = {};
  for (const feed of feeds) {
    const response = await fetch(`${base}/rss/${feed}?phoenix_verify=${Date.now()}`, { headers: { "cache-control": "no-cache" } });
    const body = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    evidence.bases[base][feed] = {
      status: response.status,
      contentType,
      sha256: createHash("sha256").update(body).digest("hex"),
    };
    if (!response.ok || !/xml|rss/i.test(contentType)) throw new Error(`${base}/rss/${feed} failed live content validation`);
  }
}

for (const feed of feeds) {
  const [alias, custom] = bases.map((base) => evidence.bases[base][feed].sha256);
  evidence.parity[feed] = alias === custom;
  if (!evidence.parity[feed]) throw new Error(`Live Pages/custom-domain mismatch for ${feed}`);
}

const feedJson = await (await fetch(`${bases[1]}/rss/feed.json?phoenix_verify=${Date.now()}`)).json();
const signalUrl = feedJson.items?.[0]?.url;
if (!signalUrl) throw new Error("Live Founder Market JSON has no signal URL");
const signalResponse = await fetch(signalUrl, { headers: { "cache-control": "no-cache" } });
const signalHtml = await signalResponse.text();
const imageMatch = signalHtml.match(/<meta\s+(?:property|name)=["'](?:og:image|twitter:image)["']\s+content=["']([^"']+)/i);
const canonicalMatch = signalHtml.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)/i);
if (!signalResponse.ok || !imageMatch || !canonicalMatch || canonicalMatch[1] !== signalUrl) {
  throw new Error("Live signal page metadata or canonical URL is invalid");
}
const imageResponse = await fetch(imageMatch[1], { method: "HEAD", headers: { "cache-control": "no-cache" } });
if (!imageResponse.ok || !/image\//i.test(imageResponse.headers.get("content-type") || "")) {
  throw new Error("Live signal image is unavailable or has the wrong content type");
}
evidence.signalPage = {
  url: signalUrl,
  status: signalResponse.status,
  canonical: canonicalMatch[1],
  imageUrl: imageMatch[1],
  imageStatus: imageResponse.status,
  imageContentType: imageResponse.headers.get("content-type"),
};

const outputPath = path.join(APP_ROOT, "artifacts/live-phoenix-verification.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`Phoenix live verification passed: six feeds match across both domains and signal metadata/image are valid.`);
