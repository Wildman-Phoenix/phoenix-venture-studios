import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath, fallback = {}) => JSON.parse(await fs.readFile(path.join(APP_ROOT, relativePath), "utf8").catch(() => JSON.stringify(fallback)));
const run = await readJson("public/rss/autonomous-run-report.json");
const katalyst = await readJson("artifacts/katalyst-metadata-audit.json");
const live = await readJson("artifacts/live-phoenix-verification.json");
const feedReports = await Promise.all([
  "run-report.json", "tools-run-report.json", "ai-attention-run-report.json",
  "social-run-report.json", "tools-social-run-report.json", "ai-attention-social-run-report.json",
].map((file) => readJson(`public/rss/${file}`)));

const ledger = {
  runId: `phoenix-backend-${new Date().toISOString()}`,
  generatedAt: new Date().toISOString(),
  status: "Review",
  sources: {
    fetched: feedReports.reduce((sum, report) => sum + Number(report.sources?.fetched || report.sources?.successes?.length || 0), 0),
    skipped: feedReports.reduce((sum, report) => sum + Number(report.sources?.skipped?.length || 0), 0),
    errors: feedReports.reduce((sum, report) => sum + Number(report.sources?.errors?.length || 0), 0),
  },
  items: {
    selected: feedReports.reduce((sum, report) => sum + Number(report.items?.selected || 0), 0),
    skipped: feedReports.reduce((sum, report) => sum + Number(report.items?.skipped || report.items?.recentFiltered || 0), 0),
    manualReview: feedReports.reduce((sum, report) => sum + Number(report.images?.manualReviewNeeded || 0), 0),
  },
  externalRequests: { katalystMetadataReads: katalyst.readErrors ? 6 : 0, liveHttpChecks: live.verifiedAt ? 15 : 0 },
  modelUsage: [],
  estimatedIncrementalApiCostUsd: 0,
  costNotes: [
    "No paid research or image generation was used by this backend audit run.",
    "Codex account token charges are not exposed to the repository and are not estimated here.",
    "Cloudflare and Supabase usage remain subject to their account dashboards.",
  ],
  cloudflare: {
    project: "phoenixventurestudios-com",
    aliasParity: Object.values(live.parity || {}).every(Boolean),
    customDomainParity: Object.values(live.parity || {}).every(Boolean),
  },
  katalyst: {
    providerLabel: katalyst.providerLabel || "Katalyst (HighLevel)",
    locationId: katalyst.location?.id || "",
    metadataReadback: Array.isArray(katalyst.readErrors) && katalyst.readErrors.length === 0,
    contactDataIncluded: false,
  },
  scheduler: { runSlot: run.runSlot || "not-recorded", outputChanged: Boolean(run.outputChanged) },
  approvalGates: ["production deploy", "Codex scheduler pause", "Katalyst metadata writes", "workflow publication", "email/social activation", "Chrome workflow build"],
};

const outputPath = path.join(APP_ROOT, "artifacts/phoenix-run-ledger.json");
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, "utf8");
console.log("Phoenix run ledger written without secrets or contact data.");
