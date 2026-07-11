import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateRss } from "./generate-static-rss.mjs";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const RSS_DIR = path.join(APP_ROOT, "public/rss");
const PUBLIC_ROOT = path.join(APP_ROOT, "public");
const DIST_ROOT = path.join(APP_ROOT, "dist");
const PREVIEW_ROOT = path.resolve(APP_ROOT, "../..", "output/phoenix-previews-upload/phoenix-venture-studios-rebuild");
const PREVIEW_SITE_URL = "https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild";
const REQUIRED_FIELDS = [
  "slug",
  "internalUrl",
  "originalUrl",
  "socialImageUrl",
  "socialImagePath",
  "imageStrategy",
  "imageFamily",
  "imageRightsStatus",
  "imageBrief",
  "feedRole",
  "simpleSummary",
  "engagementPrompt",
  "trendContext",
  "readingLevel",
  "editorialMode",
];
const REQUIRED_QUEUE_FIELDS = [
  "isSocialQueue",
  "candidatePoolSize",
  "eligibleCandidates",
  "eligibleSelected",
  "heldForManualReview",
  "skippedForFallbackArt",
  "queueRotationReason",
  "historyUpdated",
  "queuePublishedAt",
  "selectedOriginalUrl",
  "selectedCanonicalKey",
  "excludedByRecent",
  "excludedByCrossLaneDedupe",
  "laneAssignmentReason",
  "sampleReady",
];

function fail(errors) {
  for (const error of errors) console.error(`RSS validation: ${error}`);
  process.exit(1);
}

async function readText(file) {
  return fs.readFile(path.join(RSS_DIR, file), "utf8");
}

async function compareArtifactFile(root, file, errors) {
  const source = await readText(file).catch(() => "");
  const artifactPath = path.join(root, "rss", file);
  const artifact = await fs.readFile(artifactPath, "utf8").catch(() => "");

  if (!artifact) {
    errors.push(`${file} missing from deploy artifact ${root}`);
    return;
  }

  if (source !== artifact) {
    errors.push(`${file} in deploy artifact ${root} does not match public/rss/${file}`);
  }
}

export async function validateRssOutput(argv = process.argv.slice(2)) {
  const errors = [];
  const checkDeployArtifacts = argv.includes("--deploy-artifacts");
  const requireArticleSpecificImages =
    process.env.PHOENIX_RSS_REQUIRE_ARTICLE_IMAGES === "1" ||
    process.env.PHOENIX_RSS_IMAGE_MODE === "article-or-hold";
  const feedExpectations = [
    { xml: "feed.xml", json: "feed.json", items: 10 },
    { xml: "tools.xml", json: "tools.json", items: 10 },
    { xml: "ai-attention.xml", json: "ai-attention.json", items: 10 },
    { xml: "social.xml", json: "social.json", items: 1 },
    { xml: "tools-social.xml", json: "tools-social.json", items: 1 },
    { xml: "ai-attention-social.xml", json: "ai-attention-social.json", items: 1 },
  ];
  const requiredFiles = [
    ...feedExpectations.flatMap((feed) => [feed.xml, feed.json]),
    "run-report.json",
    "tools-run-report.json",
    "ai-attention-run-report.json",
    "social-run-report.json",
    "tools-social-run-report.json",
    "ai-attention-social-run-report.json",
    "generate-run-report.json",
    "bundle-manifest.json",
    "autonomous-history.json",
  ];

  for (const file of requiredFiles) {
    try {
      await fs.access(path.join(RSS_DIR, file));
    } catch {
      errors.push(`missing ${file}`);
    }
  }

  for (const reportFile of ["social-run-report.json", "tools-social-run-report.json", "ai-attention-social-run-report.json"]) {
    const report = JSON.parse(await readText(reportFile).catch(() => "{}"));
    const queue = report.queue || {};
    const selectedItem = Array.isArray(report.selectedItems) ? report.selectedItems[0] : null;
    const selectedNeedsManualReview = Boolean(
      selectedItem?.imageBrief?.manualReviewNeeded ||
      selectedItem?.imageRightsStatus === "manual-review" ||
      selectedItem?.imageApprovalStatus === "held"
    );
    for (const field of REQUIRED_QUEUE_FIELDS) {
      if (typeof queue[field] === "undefined") errors.push(`${reportFile} missing queue.${field}`);
    }
    if (queue.isSocialQueue !== true) errors.push(`${reportFile} queue.isSocialQueue must be true`);
    if (queue.queueRotationReason === "not-a-social-queue") {
      errors.push(`${reportFile} queueRotationReason must describe social queue behavior`);
    }
    if (report.items?.selected === 1 && !queue.queuePublishedAt) {
      errors.push(`${reportFile} must report queuePublishedAt when one item is selected`);
    }
    if (report.items?.selected === 1 && !queue.selectedOriginalUrl) {
      errors.push(`${reportFile} must report selectedOriginalUrl when one item is selected`);
    }
    if (report.items?.selected === 1 && !queue.selectedCanonicalKey) {
      errors.push(`${reportFile} must report selectedCanonicalKey when one item is selected`);
    }
    if (typeof queue.excludedByRecent !== "number") {
      errors.push(`${reportFile} queue.excludedByRecent must be numeric`);
    }
    if (typeof queue.excludedByCrossLaneDedupe !== "number") {
      errors.push(`${reportFile} queue.excludedByCrossLaneDedupe must be numeric`);
    }
    if (!String(queue.laneAssignmentReason || "").trim()) {
      errors.push(`${reportFile} queue.laneAssignmentReason must be present`);
    }
    if (report.items?.selected === 1 && Number(queue.candidatePoolSize || 0) < 1) {
      errors.push(`${reportFile} must report a non-empty candidate pool when one item is selected`);
    }
    if (queue.eligibleSelected === true) {
      if (selectedNeedsManualReview) {
        errors.push(`${reportFile} cannot mark eligibleSelected=true when manual review is still needed`);
      }
      if (Number(report.images?.genericFallbacks || 0) > 0) {
        errors.push(`${reportFile} cannot mark eligibleSelected=true when generic fallback art is still selected`);
      }
    }
    if (
      queue.sampleReady === false &&
      report.items?.selected === 1 &&
      !selectedNeedsManualReview &&
      Number(report.images?.genericFallbacks || 0) === 0
    ) {
      errors.push(`${reportFile} sampleReady=false must correspond to manual review or fallback-art visibility`);
    }
  }

  for (const expectation of feedExpectations) {
    const xml = await readText(expectation.xml).catch(() => "");
    if (!validateRss(xml)) errors.push(`${expectation.xml} is not well-formed RSS`);
    const itemCount = (xml.match(/<item>/g) || []).length;
    if (expectation.items === 1) {
      if (itemCount !== 1) errors.push(`${expectation.xml} must contain 1 item`);
    } else if (itemCount < 1 || itemCount > expectation.items) {
      errors.push(`${expectation.xml} must contain between 1 and ${expectation.items} items`);
    }
    if (!xml.includes("/founder-signal/signals/")) errors.push(`${expectation.xml} missing Phoenix signal links`);
    if (!xml.includes("/images/signals/generated/")) errors.push(`${expectation.xml} missing generated Phoenix enclosures`);
    if (expectation.xml === "tools.xml" && !xml.includes("https://phoenixventurestudios.com/rss/tools.xml")) {
      errors.push("tools.xml must self-identify as /rss/tools.xml");
    }
    if (expectation.xml === "ai-attention.xml" && !xml.includes("https://phoenixventurestudios.com/rss/ai-attention.xml")) {
      errors.push("ai-attention.xml must self-identify as /rss/ai-attention.xml");
    }
    if (expectation.xml === "tools-social.xml" && !xml.includes("https://phoenixventurestudios.com/rss/tools-social.xml")) {
      errors.push("tools-social.xml must self-identify as /rss/tools-social.xml");
    }
    if (expectation.xml === "ai-attention-social.xml" && !xml.includes("https://phoenixventurestudios.com/rss/ai-attention-social.xml")) {
      errors.push("ai-attention-social.xml must self-identify as /rss/ai-attention-social.xml");
    }
    if (checkDeployArtifacts) {
      await compareArtifactFile(DIST_ROOT, expectation.xml, errors);
      await compareArtifactFile(DIST_ROOT, expectation.json, errors);
    }
  }

  for (const expectation of feedExpectations) {
    const file = expectation.json;
    const feed = JSON.parse(await readText(file));
    if (!Array.isArray(feed.items)) {
      errors.push(`${file} must contain an items array`);
    } else if (expectation.items === 1) {
      if (feed.items.length !== 1) errors.push(`${file} must contain 1 item`);
    } else if (feed.items.length < 1 || feed.items.length > expectation.items) {
      errors.push(`${file} must contain between 1 and ${expectation.items} items`);
    }
    if (file === "tools.json" && feed.feed_url !== "https://phoenixventurestudios.com/rss/tools.json") {
      errors.push("tools.json must self-identify as /rss/tools.json");
    }
    if (file === "ai-attention.json" && feed.feed_url !== "https://phoenixventurestudios.com/rss/ai-attention.json") {
      errors.push("ai-attention.json must self-identify as /rss/ai-attention.json");
    }
    if (file === "tools-social.json" && feed.feed_url !== "https://phoenixventurestudios.com/rss/tools-social.json") {
      errors.push("tools-social.json must self-identify as /rss/tools-social.json");
    }
    if (file === "ai-attention-social.json" && feed.feed_url !== "https://phoenixventurestudios.com/rss/ai-attention-social.json") {
      errors.push("ai-attention-social.json must self-identify as /rss/ai-attention-social.json");
    }
    for (const item of feed.items || []) {
      const phoenix = item._phoenix || {};
      const label = `${file}:${item.title || phoenix.slug || "unknown"}`;
      for (const field of REQUIRED_FIELDS) {
        if (!phoenix[field]) errors.push(`${label} missing _phoenix.${field}`);
      }
      if (!String(phoenix.internalUrl || "").startsWith("https://phoenixventurestudios.com/founder-signal/signals/")) {
        errors.push(`${label} internalUrl must be Phoenix signal URL`);
      }
      if (!/^https?:\/\//.test(String(phoenix.originalUrl || ""))) {
        errors.push(`${label} originalUrl must remain a source URL`);
      }
      if (!String(phoenix.socialImagePath || "").startsWith("/images/signals/generated/")) {
        errors.push(`${label} socialImagePath must be generated`);
      }
      const imagePath = path.join(PUBLIC_ROOT, String(phoenix.socialImagePath || "").replace(/^\//, ""));
      try {
        await fs.access(imagePath);
      } catch {
        errors.push(`${label} generated social image missing`);
      }
      if (checkDeployArtifacts) {
        for (const root of [DIST_ROOT, PREVIEW_ROOT]) {
          const deployImagePath = path.join(root, String(phoenix.socialImagePath || "").replace(/^\//, ""));
          try {
            await fs.access(deployImagePath);
          } catch {
            errors.push(`${label} generated social image missing from deploy artifact ${root}`);
          }
        }

        const signalPath = `founder-signal/signals/${phoenix.slug}/index.html`;
        const productionPagePath = path.join(DIST_ROOT, signalPath);
        const previewPagePath = path.join(PREVIEW_ROOT, signalPath);
        const previewImageUrl = `${PREVIEW_SITE_URL}${phoenix.socialImagePath}`;
        const pageChecks = [
          { pagePath: productionPagePath, expectedImageUrl: phoenix.socialImageUrl, name: "production" },
          { pagePath: previewPagePath, expectedImageUrl: previewImageUrl, name: "preview" },
        ];

        for (const check of pageChecks) {
          const html = await fs.readFile(check.pagePath, "utf8").catch(() => "");
          if (!html) {
            errors.push(`${label} missing ${check.name} static signal page`);
            continue;
          }
          if (!html.includes(`property="og:image" content="${check.expectedImageUrl}"`)) {
            errors.push(`${label} ${check.name} page missing raw og:image`);
          }
          if (!html.includes(`name="twitter:image" content="${check.expectedImageUrl}"`)) {
            errors.push(`${label} ${check.name} page missing raw twitter:image`);
          }
        }
      }
      if (String(phoenix.sourceImageUrl || "").startsWith("http")) {
        errors.push(`${label} exposes publisher sourceImageUrl`);
      }
      if (!/\/images\/signals\/(generated|source-art)\//.test(String(phoenix.socialImageUrl || ""))) {
        errors.push(`${label} socialImageUrl is not a Phoenix-owned RSS image`);
      }
      if (
        requireArticleSpecificImages &&
        !["held-for-codex-image", "source-allowlisted"].includes(String(phoenix.imageStrategy || ""))
      ) {
        errors.push(`${label} must use an allowlisted source image or a Codex-approved raw story image`);
      }
      if (
        String(phoenix.imageStrategy || "") === "held-for-codex-image" &&
        String(phoenix.imageApprovalStatus || "") !== "approved"
      ) {
        errors.push(`${label} is still held for Codex image and should not be in the published feed`);
      }
    }
  }

  if (errors.length) fail(errors);
  console.log("RSS validation passed: artifacts, XML, Phoenix links, generated images, and editorial metadata are valid.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateRssOutput().catch((error) => fail([error instanceof Error ? error.message : String(error)]));
}
