type NewsletterMode = "disabled" | "shadow" | "primary";

export type NewsletterProfilePayload = {
  biggestChallenge?: string | null;
  currentStage?: string | null;
  firstName?: string | null;
  interactiveNewsletterPreference?: boolean | null;
  interests?: string[];
  lastFounderSignalSentAt?: string | null;
  phoenixSegment?: string | null;
  primaryInterest?: string | null;
  whatAreYouBuilding?: string | null;
};

export type NewsletterUpsertPayload = {
  email: string;
  marketingConsent: boolean;
  profile?: NewsletterProfilePayload;
  reactivate?: boolean;
  signupSource?: string | null;
};

export type NewsletterQueuePayload = {
  audienceTag: string;
  canonicalLinks: string[];
  entryCount: number;
  heroAngle: string;
  htmlBody: string;
  previewText: string;
  segmentKey: string;
  sourceSlugs: string[];
  subjectLine: string;
  textBody: string;
};

export type NewsletterDeliveryResult = {
  delivered: boolean;
  error?: string;
  provider: "gohighlevel";
  reason: string;
};

export type NewsletterSyncResult = {
  alreadySubscribed?: boolean;
  contactId?: string | null;
  delivered?: NewsletterDeliveryResult;
  mode: NewsletterMode;
  provider: "gohighlevel";
  reactivated?: boolean;
  status: "created" | "disabled" | "existing" | "queued" | "skipped" | "unsubscribed" | "updated";
  warnings?: string[];
};

type HighLevelRequestOptions = {
  method?: string;
  path: string;
  body?: Record<string, unknown> | null;
};

type HighLevelContactResponse = {
  contact?: {
    id?: string;
    email?: string;
    tags?: string[];
    dnd?: boolean;
    dndSettings?: Record<string, { status?: string }>;
  };
  id?: string;
};

type HighLevelDuplicateSearchResponse = {
  contact?: {
    id?: string;
    email?: string;
  };
  duplicate?: {
    id?: string;
    email?: string;
  };
};

type HighLevelCustomField = {
  id?: string;
  fieldKey?: string;
  name?: string;
};

type HighLevelConfig = {
  apiBaseUrl: string;
  apiVersion: string;
  locationId: string | null;
  mode: NewsletterMode;
  preferencesWorkflowId: string | null;
  privateIntegrationToken: string | null;
  reactivationWorkflowId: string | null;
  signupWorkflowId: string | null;
  unsubscribeWorkflowId: string | null;
  weeklyAudienceTag: string;
  weeklyWebhookToken: string | null;
  weeklyWebhookUrl: string | null;
};

const NEWSLETTER_PROVIDER = "gohighlevel" as const;
const BASE_TAGS = ["phoenix-newsletter", "phoenix-founder-signal"];
const ONBOARDING_TAG = "phoenix-onboarding";
const PREFERENCES_COMPLETE_TAG = "phoenix-preferences-complete";
const UNSUBSCRIBED_TAG = "phoenix-unsubscribed";
const CONTACT_FIELD_DEFS = [
  { fieldKey: "contact.phoenix_signup_timestamp", name: "Phoenix Signup Timestamp" },
  { fieldKey: "contact.phoenix_signup_source", name: "Phoenix Signup Source" },
  { fieldKey: "contact.phoenix_marketing_consent", name: "Phoenix Marketing Consent" },
  { fieldKey: "contact.phoenix_newsletter_status", name: "Phoenix Newsletter Status" },
  { fieldKey: "contact.phoenix_current_stage", name: "Phoenix Current Stage" },
  { fieldKey: "contact.phoenix_primary_interest", name: "Phoenix Primary Interest" },
  { fieldKey: "contact.phoenix_biggest_challenge", name: "Phoenix Biggest Challenge" },
  { fieldKey: "contact.phoenix_what_are_you_building", name: "Phoenix What Are You Building" },
  { fieldKey: "contact.phoenix_interactive_newsletter_preference", name: "Phoenix Interactive Newsletter Preference" },
  { fieldKey: "contact.phoenix_interests", name: "Phoenix Interests" },
  { fieldKey: "contact.phoenix_segment", name: "Phoenix Segment" },
  { fieldKey: "contact.phoenix_last_founder_signal_sent_at", name: "Phoenix Last Founder Signal Sent At" },
];

function readConfig(): HighLevelConfig {
  const modeValue = (Deno.env.get("HIGHLEVEL_NEWSLETTER_MODE") || "shadow").trim().toLowerCase();
  const mode: NewsletterMode = modeValue === "primary" || modeValue === "disabled" || modeValue === "shadow"
    ? modeValue
    : "shadow";

  return {
    apiBaseUrl: (Deno.env.get("HIGHLEVEL_API_BASE_URL") || "https://services.leadconnectorhq.com").replace(/\/$/, ""),
    apiVersion: Deno.env.get("HIGHLEVEL_API_VERSION") || "2021-07-28",
    locationId: Deno.env.get("HIGHLEVEL_LOCATION_ID") ?? null,
    mode,
    preferencesWorkflowId: Deno.env.get("HIGHLEVEL_NEWSLETTER_PREFERENCES_WORKFLOW_ID") ?? null,
    privateIntegrationToken: Deno.env.get("HIGHLEVEL_PRIVATE_INTEGRATION_TOKEN") ?? null,
    reactivationWorkflowId: Deno.env.get("HIGHLEVEL_NEWSLETTER_REACTIVATION_WORKFLOW_ID") ?? null,
    signupWorkflowId: Deno.env.get("HIGHLEVEL_NEWSLETTER_SIGNUP_WORKFLOW_ID") ?? null,
    unsubscribeWorkflowId: Deno.env.get("HIGHLEVEL_NEWSLETTER_UNSUBSCRIBE_WORKFLOW_ID") ?? null,
    weeklyAudienceTag: Deno.env.get("HIGHLEVEL_NEWSLETTER_WEEKLY_AUDIENCE_TAG") || "phoenix-founder-signal",
    weeklyWebhookToken: Deno.env.get("HIGHLEVEL_NEWSLETTER_WEEKLY_WEBHOOK_TOKEN") ?? null,
    weeklyWebhookUrl: Deno.env.get("HIGHLEVEL_NEWSLETTER_WEEKLY_WEBHOOK_URL") ?? null,
  };
}

function isConfigured(config = readConfig()): boolean {
  return Boolean(config.locationId && config.privateIntegrationToken);
}

export function isNewsletterProviderConfigured(): boolean {
  return isConfigured(readConfig());
}

function buildHeaders(config: HighLevelConfig): HeadersInit {
  return {
    accept: "application/json",
    authorization: `Bearer ${config.privateIntegrationToken}`,
    "content-type": "application/json",
    version: config.apiVersion,
  };
}

async function highLevelRequest<T>(config: HighLevelConfig, options: HighLevelRequestOptions): Promise<T> {
  const response = await fetch(`${config.apiBaseUrl}${options.path}`, {
    method: options.method || (options.body ? "POST" : "GET"),
    headers: buildHeaders(config),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`HighLevel ${options.method || "GET"} ${options.path} failed: ${response.status} ${message}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return await response.json() as T;
}

async function assertCustomFields(config: HighLevelConfig): Promise<void> {
  const payload = await highLevelRequest<{ customFields?: HighLevelCustomField[] }>(config, {
    path: `/locations/${config.locationId}/customFields`,
  });

  const existing = new Set((payload.customFields || []).map((field) => field.fieldKey).filter(Boolean));
  const missing = CONTACT_FIELD_DEFS.filter((field) => !existing.has(field.fieldKey));
  if (missing.length) {
    throw new Error(`HighLevel metadata is not provisioned: ${missing.map((field) => field.fieldKey).join(", ")}`);
  }
}

function compactTags(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])];
}

function deriveSegment(profile?: NewsletterProfilePayload): string | null {
  if (profile?.phoenixSegment?.trim()) {
    return profile.phoenixSegment.trim();
  }

  const stage = profile?.currentStage?.toLowerCase() || "";
  const interest = profile?.primaryInterest?.toLowerCase() || "";

  if (interest.includes("capital") || stage.includes("fund")) return "capital-readiness";
  if (interest.includes("ai") || interest.includes("automation")) return "ai-operator";
  if (interest.includes("consult") || interest.includes("service")) return "consulting-service-business";
  return "general-founder-signal";
}

function deriveInterestTags(profile?: NewsletterProfilePayload): string[] {
  const tags: string[] = [];
  if (profile?.primaryInterest) {
    tags.push(`interest-${profile.primaryInterest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`);
  }
  if (profile?.currentStage) {
    tags.push(`stage-${profile.currentStage.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`);
  }
  for (const interest of profile?.interests || []) {
    tags.push(`interest-${interest.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`);
  }
  return compactTags(tags);
}

function buildCustomFields(payload: NewsletterUpsertPayload, includeSubscriptionFields = true): Array<{ key: string; field_value: string }> {
  const profile = payload.profile;
  const segment = deriveSegment(profile);
  const joinedInterests = (profile?.interests || []).join(", ");
  const values: Array<[string, string | null | undefined]> = [
    ...(includeSubscriptionFields ? [
      ["contact.phoenix_signup_timestamp", new Date().toISOString()],
      ["contact.phoenix_signup_source", payload.signupSource || "phoenix-site"],
      ["contact.phoenix_marketing_consent", String(payload.marketingConsent)],
      ["contact.phoenix_newsletter_status", payload.reactivate ? "reactivated" : "active"],
    ] as Array<[string, string]> : []),
    ["contact.phoenix_current_stage", profile?.currentStage],
    ["contact.phoenix_primary_interest", profile?.primaryInterest],
    ["contact.phoenix_biggest_challenge", profile?.biggestChallenge],
    ["contact.phoenix_what_are_you_building", profile?.whatAreYouBuilding],
    ["contact.phoenix_interactive_newsletter_preference", profile?.interactiveNewsletterPreference == null ? null : String(profile.interactiveNewsletterPreference)],
    ["contact.phoenix_interests", joinedInterests || null],
    ["contact.phoenix_segment", segment],
    ["contact.phoenix_last_founder_signal_sent_at", profile?.lastFounderSignalSentAt],
  ];

  return values
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim() !== "")
    .map(([key, value]) => ({ key, field_value: String(value) }));
}

function parseContactId(payload: HighLevelContactResponse | Record<string, unknown>): string | null {
  const nested = (payload as HighLevelContactResponse).contact?.id;
  const direct = (payload as HighLevelContactResponse).id;
  return nested || direct || null;
}

async function addTags(config: HighLevelConfig, contactId: string, tags: string[]): Promise<void> {
  if (!tags.length) return;
  await highLevelRequest(config, {
    path: `/contacts/${contactId}/tags`,
    body: { tags },
  });
}

async function removeTags(config: HighLevelConfig, contactId: string, tags: string[]): Promise<void> {
  if (!tags.length) return;
  await highLevelRequest(config, {
    method: "DELETE",
    path: `/contacts/${contactId}/tags`,
    body: { tags },
  });
}

async function addContactToWorkflow(config: HighLevelConfig, contactId: string, workflowId: string | null): Promise<boolean> {
  if (!workflowId) {
    return false;
  }

  await highLevelRequest(config, {
    path: `/contacts/${contactId}/workflow/${workflowId}`,
    body: {},
  });
  return true;
}

async function findContactIdByEmail(config: HighLevelConfig, email: string): Promise<string | null> {
  const params = new URLSearchParams({
    email,
    locationId: config.locationId || "",
  });
  const payload = await highLevelRequest<HighLevelDuplicateSearchResponse>(config, {
    path: `/contacts/search/duplicate?${params.toString()}`,
  });

  return payload.contact?.id || payload.duplicate?.id || null;
}

async function contactIsSuppressed(config: HighLevelConfig, contactId: string): Promise<boolean> {
  const payload = await highLevelRequest<HighLevelContactResponse>(config, {
    path: `/contacts/${contactId}`,
  });
  const contact = payload.contact;
  if (!contact) return true;
  if (contact.dnd || (contact.tags || []).includes(UNSUBSCRIBED_TAG)) return true;
  return Object.values(contact.dndSettings || {}).some((setting) => setting?.status === "active");
}

async function sendEmailToContact(
  config: HighLevelConfig,
  contactId: string,
  subject: string,
  html: string,
): Promise<NewsletterDeliveryResult> {
  await highLevelRequest(config, {
    path: "/conversations/messages",
    body: {
      contactId,
      html,
      subject,
      type: "Email",
    },
  });

  return {
    delivered: true,
    provider: NEWSLETTER_PROVIDER,
    reason: "email_queued",
  };
}

export function getNewsletterMode(): NewsletterMode {
  return readConfig().mode;
}

export function isPrimaryNewsletterMode(): boolean {
  const config = readConfig();
  return config.mode === "primary" && isConfigured(config);
}

export async function upsertNewsletterSubscriber(payload: NewsletterUpsertPayload): Promise<NewsletterSyncResult> {
  const config = readConfig();
  if (!isConfigured(config) || config.mode === "disabled") {
    return {
      mode: config.mode,
      provider: NEWSLETTER_PROVIDER,
      status: "disabled",
      warnings: ["HighLevel newsletter sync is disabled or not configured."],
    };
  }

  await assertCustomFields(config);

  const contactResponse = await highLevelRequest<HighLevelContactResponse>(config, {
    path: "/contacts/upsert",
    body: {
      locationId: config.locationId,
      email: payload.email,
      firstName: payload.profile?.firstName || undefined,
      customFields: buildCustomFields(payload),
    },
  });

  const contactId = parseContactId(contactResponse);
  if (!contactId) {
    throw new Error("HighLevel did not return a contact ID for newsletter upsert.");
  }

  const tags = compactTags([
    ...BASE_TAGS,
    ONBOARDING_TAG,
    payload.reactivate ? "phoenix-reactivated" : null,
    ...deriveInterestTags(payload.profile),
  ]);

  await addTags(config, contactId, tags);
  await removeTags(config, contactId, [UNSUBSCRIBED_TAG]);

  const workflowQueued = await addContactToWorkflow(
    config,
    contactId,
    payload.reactivate ? config.reactivationWorkflowId : config.signupWorkflowId,
  );

  return {
    contactId,
    delivered: {
      delivered: workflowQueued,
      provider: NEWSLETTER_PROVIDER,
      reason: workflowQueued ? "workflow_queued" : "contact_synced",
    },
    mode: config.mode,
    provider: NEWSLETTER_PROVIDER,
    reactivated: Boolean(payload.reactivate),
    status: payload.reactivate ? "updated" : "created",
    warnings: workflowQueued ? [] : ["No HighLevel signup workflow ID configured; contact synced without workflow enrollment."],
  };
}

export async function updateNewsletterSubscriberPreferences(
  email: string,
  profile: NewsletterProfilePayload,
): Promise<NewsletterSyncResult> {
  const config = readConfig();
  if (!isConfigured(config) || config.mode === "disabled") {
    return {
      mode: config.mode,
      provider: NEWSLETTER_PROVIDER,
      status: "disabled",
      warnings: ["HighLevel newsletter sync is disabled or not configured."],
    };
  }

  await assertCustomFields(config);

  const contactId = await findContactIdByEmail(config, email);
  if (!contactId) {
    throw new Error("HighLevel subscriber does not exist; preferences cannot create a marketing contact.");
  }

  const response = await highLevelRequest<HighLevelContactResponse>(config, {
    method: "PUT",
    path: `/contacts/${contactId}`,
    body: {
      firstName: profile.firstName || undefined,
      customFields: buildCustomFields({
        email,
        marketingConsent: false,
        profile,
        signupSource: "phoenix-preferences",
      }, false),
    },
  });

  const updatedContactId = parseContactId(response) || contactId;
  if (!updatedContactId) {
    throw new Error("HighLevel did not return a contact ID for subscriber preferences.");
  }

  const tags = compactTags([
    PREFERENCES_COMPLETE_TAG,
    ...deriveInterestTags(profile),
  ]);
  await addTags(config, updatedContactId, tags);
  const workflowQueued = await addContactToWorkflow(config, updatedContactId, config.preferencesWorkflowId);

  return {
    contactId: updatedContactId,
    delivered: {
      delivered: workflowQueued,
      provider: NEWSLETTER_PROVIDER,
      reason: workflowQueued ? "workflow_queued" : "preferences_synced",
    },
    mode: config.mode,
    provider: NEWSLETTER_PROVIDER,
    status: "updated",
    warnings: workflowQueued ? [] : ["No HighLevel preferences workflow ID configured; profile synced without workflow enrollment."],
  };
}

export async function unsubscribeNewsletterSubscriber(email: string): Promise<NewsletterSyncResult> {
  const config = readConfig();
  if (!isConfigured(config) || config.mode === "disabled") {
    return {
      mode: config.mode,
      provider: NEWSLETTER_PROVIDER,
      status: "disabled",
      warnings: ["HighLevel newsletter sync is disabled or not configured."],
    };
  }

  const response = await highLevelRequest<HighLevelContactResponse>(config, {
    path: "/contacts/upsert",
    body: {
      locationId: config.locationId,
      email,
      customFields: [
        { key: "contact.phoenix_newsletter_status", field_value: "unsubscribed" },
      ],
    },
  });

  const contactId = parseContactId(response);
  if (!contactId) {
    throw new Error("HighLevel did not return a contact ID for newsletter unsubscribe.");
  }

  await addTags(config, contactId, [UNSUBSCRIBED_TAG]);
  await removeTags(config, contactId, [...BASE_TAGS, ONBOARDING_TAG, PREFERENCES_COMPLETE_TAG]);
  await addContactToWorkflow(config, contactId, config.unsubscribeWorkflowId);

  return {
    contactId,
    delivered: {
      delivered: true,
      provider: NEWSLETTER_PROVIDER,
      reason: "unsubscribe_synced",
    },
    mode: config.mode,
    provider: NEWSLETTER_PROVIDER,
    status: "unsubscribed",
  };
}

export async function deliverTransactionalEmailViaHighLevel(
  email: string,
  subject: string,
  html: string,
): Promise<NewsletterDeliveryResult> {
  const config = readConfig();
  if (!isConfigured(config) || config.mode === "disabled") {
    return {
      delivered: false,
      error: "HighLevel newsletter delivery is disabled or not configured.",
      provider: NEWSLETTER_PROVIDER,
      reason: "provider_unavailable",
    };
  }

  const contactId = await findContactIdByEmail(config, email);
  if (!contactId) {
    return {
      delivered: false,
      error: `No HighLevel contact found for ${email}.`,
      provider: NEWSLETTER_PROVIDER,
      reason: "contact_missing",
    };
  }

  if (await contactIsSuppressed(config, contactId)) {
    return {
      delivered: false,
      error: "HighLevel contact is unsubscribed or suppressed.",
      provider: NEWSLETTER_PROVIDER,
      reason: "contact_suppressed",
    };
  }

  try {
    return await sendEmailToContact(config, contactId, subject, html);
  } catch (error) {
    return {
      delivered: false,
      error: error instanceof Error ? error.message : "HighLevel transactional email failed",
      provider: NEWSLETTER_PROVIDER,
      reason: "delivery_failed",
    };
  }
}

export async function queueFounderSignalForHighLevel(payload: NewsletterQueuePayload): Promise<NewsletterSyncResult> {
  const config = readConfig();
  if (!isConfigured(config) || config.mode === "disabled") {
    return {
      mode: config.mode,
      provider: NEWSLETTER_PROVIDER,
      status: "disabled",
      warnings: ["HighLevel weekly send sync is disabled or not configured."],
    };
  }

  if (!config.weeklyWebhookUrl) {
    return {
      mode: config.mode,
      provider: NEWSLETTER_PROVIDER,
      status: "skipped",
      warnings: ["No HighLevel weekly webhook URL configured; weekly newsletter payload was not queued."],
    };
  }

  const headers: HeadersInit = {
    "content-type": "application/json",
  };
  if (config.weeklyWebhookToken) {
    headers.authorization = `Bearer ${config.weeklyWebhookToken}`;
  }

  const response = await fetch(config.weeklyWebhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider: NEWSLETTER_PROVIDER,
      locationId: config.locationId,
      audienceTag: payload.audienceTag || config.weeklyAudienceTag,
      newsletter: payload,
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`HighLevel weekly webhook failed: ${response.status} ${message}`);
  }

  return {
    delivered: {
      delivered: true,
      provider: NEWSLETTER_PROVIDER,
      reason: "weekly_payload_queued",
    },
    mode: config.mode,
    provider: NEWSLETTER_PROVIDER,
    status: "queued",
  };
}
