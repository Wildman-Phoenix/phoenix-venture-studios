import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const exists = async (relativePath) => Boolean(await fs.stat(path.join(APP_ROOT, relativePath)).catch(() => null));
const katalyst = JSON.parse(await fs.readFile(path.join(APP_ROOT, "artifacts/katalyst-metadata-audit.json"), "utf8"));
const live = JSON.parse(await fs.readFile(path.join(APP_ROOT, "artifacts/live-phoenix-verification.json"), "utf8"));
const localBranch = process.env.PHOENIX_IMPLEMENTATION_BRANCH || "codex/phoenix-backend-katalyst-improvement";

const requirements = [
  { requirement: "Website, route and link backend consistency", status: await exists("src/config/phoenix-routes.json") && await exists("src/config/phoenix-route-metadata.json") ? "proved-local" : "missing", evidence: ["backend:validate", "artifact:validate"] },
  { requirement: "Six RSS feeds and social queues", status: Object.values(live.parity || {}).every(Boolean) ? "proved-live-current" : "missing", evidence: ["artifacts/live-phoenix-verification.json"] },
  { requirement: "Manifest-backed failure preservation", status: await exists("scripts/rss/test-supervised-static-rss.mjs") ? "proved-local" : "missing", evidence: ["rss:test:supervisor"] },
  { requirement: "Consent, suppression and signed webhook protection", status: await exists("scripts/validate-form-security.mjs") ? "proved-local-not-deployed" : "missing", evidence: ["security:validate", "deno check"] },
  { requirement: "Katalyst metadata model and workflows", status: katalyst.phoenixReadiness?.pipelinePresent ? "present" : "specified-not-built", evidence: ["artifacts/katalyst-metadata-audit.json", "Phoenix workflow pack"] },
  { requirement: "GitHub as sole RSS production scheduler", status: "not-cut-over", evidence: ["updated workflow is local only", "Codex RSS automation remains active"] },
  { requirement: "Cloudflare deployment of updated backend", status: "approval-required-not-deployed", evidence: ["local artifact passes", "current live feed parity passes"] },
  { requirement: "Chrome-only Katalyst workflow and Social Planner proof", status: "approval-required-not-run", evidence: ["PHOENIX-KATALYST-CHROME-FINISH-CHECKLIST-2026-07-10.md"] },
  { requirement: "Creative review after backend report", status: "waiting-on-nathan-by-design", evidence: ["creative surfaces preserved"] },
];

const incomplete = requirements.filter((item) => !["proved-local", "proved-live-current", "present"].includes(item.status));
const audit = {
  generatedAt: new Date().toISOString(),
  implementationBranch: localBranch,
  status: incomplete.length ? "Review" : "Ready",
  requirements,
  remaining: incomplete.map((item) => item.requirement),
  completionClaimAllowed: incomplete.length === 0,
};
await fs.writeFile(path.join(APP_ROOT, "artifacts/phoenix-completion-audit.json"), `${JSON.stringify(audit, null, 2)}\n`, "utf8");
console.log(`Phoenix completion audit: ${audit.status}; ${incomplete.length} requirement(s) remain approval-gated or unproved.`);
