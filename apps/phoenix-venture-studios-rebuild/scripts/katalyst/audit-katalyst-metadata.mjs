import fs from "node:fs/promises";
import path from "node:path";

function parseArgs(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) values[argv[index]?.replace(/^--/, "")] = argv[index + 1];
  return values;
}

async function loadEnvFile(filePath) {
  const raw = await fs.readFile(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
  }
}

const args = parseArgs(process.argv.slice(2));
if (args["env-file"]) await loadEnvFile(path.resolve(args["env-file"]));

const token = process.env.HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN;
const locationId = process.env.HIGHLEVEL_LOCATION_ID;
const baseUrl = (process.env.HIGHLEVEL_API_BASE_URL || "https://services.leadconnectorhq.com").replace(/\/$/, "");
const version = process.env.HIGHLEVEL_API_VERSION || "2021-07-28";
if (!token || !locationId) throw new Error("HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN and HIGHLEVEL_LOCATION_ID are required");

async function read(pathname, apiVersion = version) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    headers: { authorization: `Bearer ${token}`, accept: "application/json", version: apiVersion },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) return { error: `HTTP ${response.status}`, message: body.message || body.error || "Unavailable" };
  return body;
}

const [locationPayload, workflowPayload, pipelinePayload, fieldPayload, tagPayload, socialPayload] = await Promise.all([
  read(`/locations/${locationId}`),
  read(`/workflows/?locationId=${locationId}`),
  read(`/opportunities/pipelines?locationId=${locationId}`),
  read(`/locations/${locationId}/customFields`),
  read(`/locations/${locationId}/tags`),
  read(`/social-media-posting/${locationId}/accounts`, "2023-02-21"),
]);

const workflows = workflowPayload.workflows || workflowPayload.data || [];
const counts = new Map();
for (const workflow of workflows) {
  const key = String(workflow.name || "").trim().toLowerCase();
  counts.set(key, (counts.get(key) || 0) + 1);
}

function classifyWorkflow(workflow) {
  const name = String(workflow.name || "").trim();
  const normalized = name.toLowerCase();
  if (/phoenix|founder signal|newsletter|application path/.test(normalized)) return "phoenix_dependency";
  if ((counts.get(normalized) || 0) > 1) return "duplicate";
  if (workflow.status === "draft" && (/^new workflow\s*:/i.test(name) || /^recipe\s*-/i.test(name))) return "archive_candidate";
  if (workflow.status === "published") return "keep";
  return "unrelated";
}

const fields = fieldPayload.customFields || [];
const tags = tagPayload.tags || [];
const accounts = socialPayload.results?.accounts || [];
const classifiedWorkflows = workflows.map((item) => ({ id: item.id, name: item.name, status: item.status, classification: classifyWorkflow(item) }));
const workflowClassificationCounts = Object.fromEntries(
  ["keep", "archive_candidate", "duplicate", "unrelated", "phoenix_dependency"].map((classification) => [
    classification,
    classifiedWorkflows.filter((item) => item.classification === classification).length,
  ]),
);
const expectedFieldKeys = [
  "contact.phoenix_signup_timestamp", "contact.phoenix_signup_source", "contact.phoenix_marketing_consent",
  "contact.phoenix_newsletter_status", "contact.phoenix_current_stage", "contact.phoenix_primary_interest",
  "contact.phoenix_biggest_challenge", "contact.phoenix_what_are_you_building",
  "contact.phoenix_interactive_newsletter_preference", "contact.phoenix_interests", "contact.phoenix_segment",
  "contact.phoenix_last_founder_signal_sent_at", "contact.application_goal", "contact.business_stage",
  "contact.urgency", "contact.preferred_next_step", "contact.consent_to_contact",
];
const expectedTags = [
  "phoenix-newsletter", "phoenix-founder-signal", "phoenix-onboarding", "phoenix-preferences-complete",
  "phoenix-unsubscribed", "intake-started", "intake-needs-review", "funding-fit", "consulting-fit",
  "prep-first", "partner-match-ready", "referral-approved",
];
const report = {
  generatedAt: new Date().toISOString(),
  providerLabel: "Katalyst (HighLevel)",
  contactDataIncluded: false,
  location: {
    id: locationPayload.location?.id || locationId,
    name: locationPayload.location?.name || "Unknown",
    timezone: locationPayload.location?.timezone || null,
  },
  workflows: {
    count: workflows.length,
    published: workflows.filter((item) => item.status === "published").length,
    draft: workflows.filter((item) => item.status === "draft").length,
    classificationCounts: workflowClassificationCounts,
    items: classifiedWorkflows,
  },
  pipelines: (pipelinePayload.pipelines || []).map((pipeline) => ({
    id: pipeline.id,
    name: pipeline.name,
    stages: (pipeline.stages || []).map((stage) => ({ id: stage.id, name: stage.name })),
  })),
  customFields: fields.map((field) => ({ id: field.id, name: field.name, fieldKey: field.fieldKey, dataType: field.dataType })),
  tags: tags.map((tag) => ({ id: tag.id, name: tag.name })),
  socialAccounts: accounts.map((account) => ({ id: account.id, name: account.name, platform: account.platform, type: account.type })),
  phoenixReadiness: {
    pipelinePresent: (pipelinePayload.pipelines || []).some((pipeline) => pipeline.name === "Phoenix Applications"),
    missingFieldKeys: expectedFieldKeys.filter((key) => !fields.some((field) => field.fieldKey === key)),
    missingTags: expectedTags.filter((name) => !tags.some((tag) => tag.name === name)),
    socialAccountSelectionApproved: false,
  },
  readErrors: [workflowPayload, pipelinePayload, fieldPayload, tagPayload, socialPayload]
    .filter((payload) => payload.error)
    .map((payload) => ({ error: payload.error, message: payload.message })),
};

const output = `${JSON.stringify(report, null, 2)}\n`;
if (args.output) {
  const outputPath = path.resolve(args.output);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output, "utf8");
  console.log(`Wrote metadata-only Katalyst audit to ${outputPath}`);
} else {
  process.stdout.write(output);
}
