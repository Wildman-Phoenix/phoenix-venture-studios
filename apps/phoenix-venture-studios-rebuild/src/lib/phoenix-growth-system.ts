export type PhoenixLane = "website" | "rss" | "social" | "email" | "katalyst" | "combined";
export type PhoenixStatus = "Ready" | "Review" | "Needs you" | "Blocked";
export type PhoenixRisk = "local-safe" | "approval-required" | "restricted";

export type PhoenixChangeIntent = {
  id: string;
  requestedAt: string;
  requestSummary: string;
  businessOutcome: string;
  audience: string;
  lanes: PhoenixLane[];
  canonicalCta: string;
  sourceRefs: string[];
  claimsRequiringProof: string[];
  creativeDirectionStatus: "provided" | "waiting-on-nathan" | "not-required";
  risk: PhoenixRisk;
  approvalRequired: boolean;
  acceptanceTests: string[];
};

export type PhoenixPublicationManifest = {
  changeIntentId: string;
  websiteRoutes: string[];
  rssFeedIds: string[];
  signalSlugs: string[];
  socialQueues: string[];
  katalyst: {
    tags: string[];
    customFieldKeys: string[];
    pipelineId?: string;
    workflowIds: string[];
    segment?: string;
  };
  email?: {
    subject: string;
    previewText: string;
    ctaUrl: string;
  };
  imageRightsStatus: "owned-or-licensed" | "allowlisted" | "manual-review" | "not-applicable";
  trackedUrls: string[];
  artifactHashes: Record<string, string>;
  approvalState: "draft" | "approved" | "released" | "rolled-back";
  rollbackRef?: string;
};

export type PhoenixRunLedger = {
  runId: string;
  startedAt: string;
  finishedAt?: string;
  status: PhoenixStatus;
  commands: Array<{ command: string; exitCode: number; durationMs: number }>;
  sources: { fetched: number; skipped: number; errors: number };
  items: { selected: number; skipped: number; manualReview: number };
  images: { generated: number; reused: number; families: Record<string, number> };
  generatedPages: number;
  externalRequests: Record<string, number>;
  cacheHits: number;
  modelUsage: Array<{ provider: string; model: string; inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number }>;
  cloudflare?: { project: string; deploymentId?: string; aliasParity: boolean; customDomainParity: boolean };
  katalyst?: { locationId: string; metadataReadback: boolean; contactDataIncluded: false };
  warnings: string[];
  blockers: string[];
};
