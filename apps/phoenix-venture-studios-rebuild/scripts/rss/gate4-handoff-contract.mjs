import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.resolve(SCRIPT_DIR, "../..");
const AUDIT_DIR = path.join(APP_ROOT, ".gate4");
const MANUAL_SIGNALS_PATH = path.join(APP_ROOT, "rss-data/manual-signals.json");
const REGISTRY_PATHS = [
  "rss-data/source-registry.json",
  "rss-data/tools-registry.json",
  "rss-data/ai-attention-registry.json"
].map((file) => path.join(APP_ROOT, file));

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stable(value[key])])
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function required(value, name) {
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is required`);
  return value.trim();
}

function safeId(value, name) {
  const result = required(value, name);
  if (!/^[a-zA-Z0-9._:-]{1,200}$/.test(result)) throw new Error(`${name} is invalid`);
  return result;
}

function safeHash(value, name) {
  const result = required(value, name);
  if (!/^[a-f0-9]{64}$/.test(result)) throw new Error(`${name} must be a SHA-256 hash`);
  return result;
}

export function canonicalBundleHash(bundle) {
  return sha256(JSON.stringify(stable(bundle)));
}

export function signedHeaders({ secret, timestamp, method, pathWithQuery, body = "" }) {
  const canonical = [timestamp, method.toUpperCase(), pathWithQuery, sha256(body)].join("\n");
  const signature = createHmac("sha256", required(secret, "handoff secret"))
    .update(canonical)
    .digest("hex");
  return {
    "x-phoenix-timestamp": String(timestamp),
    "x-phoenix-signature": signature
  };
}

export function signaturesMatch(left, right) {
  if (!/^[a-f0-9]{64}$/.test(left ?? "") || !/^[a-f0-9]{64}$/.test(right ?? "")) {
    return false;
  }
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

export function validateGate4Response(payload, expected) {
  if (payload?.mode !== "shadow") throw new Error("Gate 4 accepts shadow mode only");
  if (payload?.handoffId !== expected.handoffId) throw new Error("handoff id mismatch");
  if (payload?.queueRevision !== expected.queueRevision) throw new Error("queue revision mismatch");
  if (payload?.bundleHash !== expected.bundleHash) throw new Error("bundle hash mismatch");
  const bundle = payload?.bundle;
  if (bundle?.clientKey !== "phoenix") throw new Error("client key must be phoenix");
  if (bundle?.scheduledSlot !== "shadow-intelligence") {
    throw new Error("scheduled slot must be shadow-intelligence");
  }
  if (bundle?.queueRevision !== expected.queueRevision) throw new Error("bundle revision mismatch");
  if (!Array.isArray(bundle?.candidates) || bundle.candidates.length !== 1) {
    throw new Error("Gate 4 requires exactly one candidate");
  }
  if (canonicalBundleHash(bundle) !== expected.bundleHash) throw new Error("immutable bundle hash changed");
  for (const candidate of bundle.candidates) {
    if (candidate.status !== "editorial_review") throw new Error("shadow candidate must require editorial review");
    if (candidate.publicImageEligible !== false) throw new Error("shadow candidate cannot claim image approval");
    if (!String(candidate.internalUrl ?? "").startsWith("/founder-signal/signals/")) {
      throw new Error("candidate internal URL is not Phoenix-owned");
    }
    const originalUrl = new URL(candidate.originalUrl);
    if (originalUrl.protocol !== "https:") throw new Error("candidate source URL must use HTTPS");
  }
  return bundle;
}

function projectionItem(bundle) {
  const candidate = bundle.candidates[0];
  const draft = candidate.editorialDraft;
  const citation = bundle.sourceCitations?.[0] ?? {};
  const slug = candidate.internalUrl.split("/").filter(Boolean).at(-1);
  return {
    id: `gate4-${candidate.candidateId.slice(0, 16)}`,
    enabled: true,
    forceSocialQueue: true,
    feedIds: [
      "founder-market",
      "founder-market-social",
      "founder-tools",
      "founder-tools-social",
      "ai-attention",
      "ai-attention-social"
    ],
    title: candidate.title,
    publicTitle: candidate.title,
    sourceTitle: citation.title ?? candidate.title,
    slug,
    url: candidate.originalUrl,
    originalUrl: candidate.originalUrl,
    sourceUrl: candidate.originalUrl,
    sourceName: citation.sourceId ?? "Phoenix Gate 4 evidence",
    sourceId: citation.sourceId ?? "phoenix-gate4",
    sourceType: "manual",
    sourceSurface: "phoenix-original",
    sourceScore: 1000,
    publishedAt: citation.publishedAt ?? bundle.createdAt,
    description: draft.summary,
    simpleSummary: draft.summary,
    whyItMatters: draft.whyItMatters,
    whyShared: draft.hook,
    founderTakeaway: draft.whyItMatters,
    businessTakeaway: draft.whyItMatters,
    trendContext: draft.watchPoint,
    engagementPrompt: draft.engagementQuestion,
    topicLabel: "Gate 4 shadow intelligence",
    whySelected: candidate.decisionEvidence?.reasons?.join(" ") ?? "BOSS shadow handoff rehearsal.",
    researchCitations: (bundle.sourceCitations ?? []).map((source) => ({
      label: source.title,
      url: source.url
    })),
    sourceLinks: (bundle.sourceCitations ?? []).map((source) => ({
      label: source.title,
      url: source.url
    })),
    articleBody: candidate.editorialOutput.split(/\n\n+/).filter(Boolean),
    imageFamily: "wildcard_attention",
    imageBrief: {
      storyAngle: draft.headline,
      emotionalHook: draft.hook,
      visualMetaphor: candidate.imageDirection?.scene ?? "A Phoenix signal room.",
      audiencePainOpportunity: draft.whyItMatters,
      imagePrompt: candidate.imageDirection?.scene ?? "A Phoenix signal room.",
      imageFamily: "wildcard_attention",
      preferredImageFamily: "wildcard_attention",
      overlayTone: "premium, technical, strategic",
      template: "phoenix_gate4_shadow",
      manualReviewNeeded: true,
      sourceImagePolicy: "reference-only",
      sourceImageEligibility: "reference-only"
    },
    sourceImageUrl: "",
    imageStrategy: "held-for-codex-image",
    imageSourceType: "pending-codex-image",
    imageRightsStatus: "manual-review",
    imageApprovalStatus: "held",
    imageHoldReason: "gate4-shadow-image-approval-not-granted"
  };
}

async function installProjection(bundle) {
  const item = projectionItem(bundle);
  await fs.writeFile(
    MANUAL_SIGNALS_PATH,
    `${JSON.stringify({ version: 1, updated: bundle.createdAt.slice(0, 10), items: [item] }, null, 2)}\n`,
    "utf8"
  );
  for (const registryPath of REGISTRY_PATHS) {
    const registry = JSON.parse(await fs.readFile(registryPath, "utf8"));
    const manual = registry.sources.find((source) => source.itemsPath === "rss-data/manual-signals.json");
    if (!manual) throw new Error(`manual signal source missing from ${path.basename(registryPath)}`);
    manual.itemIds = [item.id];
    manual.enabled = true;
    manual.score = 1000;
    await fs.writeFile(registryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  }
  return item;
}

function configuration(env = process.env) {
  return {
    baseUrl: new URL(required(env.PHOENIX_GATE4_BASE_URL, "PHOENIX_GATE4_BASE_URL")),
    secret: required(env.PHOENIX_GATE4_HANDOFF_SECRET, "PHOENIX_GATE4_HANDOFF_SECRET"),
    handoffId: safeId(env.PHOENIX_GATE4_HANDOFF_ID, "PHOENIX_GATE4_HANDOFF_ID"),
    queueRevision: safeId(env.PHOENIX_GATE4_QUEUE_REVISION, "PHOENIX_GATE4_QUEUE_REVISION"),
    bundleHash: safeHash(env.PHOENIX_GATE4_BUNDLE_HASH, "PHOENIX_GATE4_BUNDLE_HASH")
  };
}

async function signedFetch(config, method, pathname, body = "") {
  const url = new URL(pathname, config.baseUrl);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const headers = {
    ...signedHeaders({
      secret: config.secret,
      timestamp,
      method,
      pathWithQuery: `${url.pathname}${url.search}`,
      body
    }),
    accept: "application/json"
  };
  if (body) headers["content-type"] = "application/json";
  const response = await fetch(url, { method, headers, body: body || undefined });
  const text = await response.text();
  if (!response.ok) throw new Error(`BOSS handoff request failed with HTTP ${response.status}`);
  return text ? JSON.parse(text) : {};
}

export async function fetchAndInstallGate4(env = process.env) {
  const config = configuration(env);
  const pathname = `/api/phoenix-handoff/${encodeURIComponent(config.handoffId)}?hash=${config.bundleHash}`;
  const payload = await signedFetch(config, "GET", pathname);
  const bundle = validateGate4Response(payload, config);
  const item = await installProjection(bundle);
  await fs.mkdir(AUDIT_DIR, { recursive: true });
  const audit = {
    status: "Ready",
    mode: "shadow",
    handoffId: config.handoffId,
    queueRevision: config.queueRevision,
    bundleHash: config.bundleHash,
    candidateCount: 1,
    candidateId: bundle.candidates[0].candidateId,
    projectedItemId: item.id,
    publicImageEligible: false,
    deployAuthorized: false,
    publicWriteAttempted: false,
    resolvedAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(AUDIT_DIR, "handoff-audit.json"), `${JSON.stringify(audit, null, 2)}\n`);
  console.log(JSON.stringify(audit));
}

function outcome(value) {
  return ["success", "failure", "cancelled", "skipped"].includes(value) ? value : "unknown";
}

export async function reportGate4Evidence(env = process.env) {
  const config = configuration(env);
  const steps = JSON.parse(required(env.PHOENIX_GATE4_STEP_RESULTS, "PHOENIX_GATE4_STEP_RESULTS"));
  const outputChanged = env.PHOENIX_GATE4_OUTPUT_CHANGED === "true";
  const gateResults = Object.fromEntries(
    Object.entries(steps).map(([key, value]) => [key, outcome(value)])
  );
  const requiredPassed = ["resolve", "test", "hydrate", "preserved", "generate", "validate", "boundary"]
    .every((key) => gateResults[key] === "success");
  const parityPassed = !outputChanged || ["prepare", "preview", "parity"]
    .every((key) => gateResults[key] === "success");
  const accepted = requiredPassed && parityPassed;
  const evidence = {
    schemaVersion: "1.0.0",
    handoffId: config.handoffId,
    queueRevision: config.queueRevision,
    bundleHash: config.bundleHash,
    gateResults,
    outputChanged,
    deployStatus: "not_attempted_shadow",
    liveVerificationStatus: "not_run_shadow",
    warnings: accepted ? [] : ["one_or_more_shadow_gates_did_not_pass"],
    recoveryAction: "preserved_last_valid_public_bundle",
    accepted,
    publicWriteAttempted: false,
    recordedAt: new Date().toISOString()
  };
  await fs.mkdir(AUDIT_DIR, { recursive: true });
  await fs.writeFile(path.join(AUDIT_DIR, "worker-evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
  await signedFetch(
    config,
    "POST",
    `/api/phoenix-handoff/${encodeURIComponent(config.handoffId)}/evidence`,
    JSON.stringify(evidence)
  );
  console.log(JSON.stringify({ ...evidence, gateResults: undefined }));
}

const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const command = process.argv[2] ?? "fetch";
  if (command === "fetch") await fetchAndInstallGate4();
  else if (command === "report") await reportGate4Evidence();
  else throw new Error(`unknown Gate 4 command: ${command}`);
}
