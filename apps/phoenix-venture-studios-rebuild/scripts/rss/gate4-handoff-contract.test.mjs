import assert from "node:assert/strict";
import test from "node:test";

import {
  canonicalBundleHash,
  signaturesMatch,
  signedHeaders,
  validateGate4Response
} from "./gate4-handoff-contract.mjs";

const bundle = {
  schemaVersion: "1.0.0",
  clientKey: "phoenix",
  runId: "run-1",
  queueRevision: "gate4-shadow-review-1",
  createdAt: "2026-08-06T12:00:00.000Z",
  scheduledSlot: "shadow-intelligence",
  sourceCitations: [{
    sourceId: "openai-news",
    title: "Official update",
    url: "https://openai.com/news/update",
    publishedAt: "2026-08-06T11:50:00.000Z"
  }],
  candidates: [{
    candidateId: "a".repeat(64),
    status: "editorial_review",
    title: "Official update",
    internalUrl: "/founder-signal/signals/official-update/",
    originalUrl: "https://openai.com/news/update",
    trendEvidence: [],
    editorialOutput: "Hook\n\nSummary",
    editorialDraft: {
      headline: "Official update",
      hook: "Hook",
      summary: "Summary",
      whyItMatters: "Why",
      watchPoint: "Watch",
      engagementQuestion: "Question?"
    },
    decisionEvidence: {
      decision: "watch",
      confidence: 0.8,
      urgency: 70,
      founderRelevance: 0.9,
      reasons: ["Official"]
    },
    imageDirection: {
      strategy: "phoenix_composite",
      scene: "A signal room",
      rationale: "Operational",
      avoid: ["generic robot"]
    },
    publicImageEligible: false,
    freshness: "fresh",
    candidateOrigin: "fresh"
  }]
};
const bundleHash = canonicalBundleHash(bundle);

test("Gate 4 bundle validates exact immutable shadow identity", () => {
  assert.equal(validateGate4Response({
    mode: "shadow",
    handoffId: "handoff-1",
    queueRevision: bundle.queueRevision,
    bundleHash,
    bundle
  }, {
    handoffId: "handoff-1",
    queueRevision: bundle.queueRevision,
    bundleHash
  }), bundle);
});

test("Gate 4 refuses changed bundle content and release-like candidates", () => {
  assert.throws(() => validateGate4Response({
    mode: "shadow",
    handoffId: "handoff-1",
    queueRevision: bundle.queueRevision,
    bundleHash,
    bundle: { ...bundle, candidates: [{ ...bundle.candidates[0], title: "Changed" }] }
  }, {
    handoffId: "handoff-1",
    queueRevision: bundle.queueRevision,
    bundleHash
  }), /hash changed/);

  assert.throws(() => validateGate4Response({
    mode: "shadow",
    handoffId: "handoff-1",
    queueRevision: bundle.queueRevision,
    bundleHash: canonicalBundleHash({
      ...bundle,
      candidates: [{ ...bundle.candidates[0], status: "automatic_eligible" }]
    }),
    bundle: {
      ...bundle,
      candidates: [{ ...bundle.candidates[0], status: "automatic_eligible" }]
    }
  }, {
    handoffId: "handoff-1",
    queueRevision: bundle.queueRevision,
    bundleHash: canonicalBundleHash({
      ...bundle,
      candidates: [{ ...bundle.candidates[0], status: "automatic_eligible" }]
    })
  }), /editorial review/);
});

test("Gate 4 request signatures bind timestamp, method, path, and body", () => {
  const first = signedHeaders({
    secret: "test-secret",
    timestamp: "1786020000",
    method: "POST",
    pathWithQuery: "/api/phoenix-handoff/handoff-1/evidence",
    body: "{\"accepted\":true}"
  });
  const second = signedHeaders({
    secret: "test-secret",
    timestamp: "1786020000",
    method: "POST",
    pathWithQuery: "/api/phoenix-handoff/handoff-1/evidence",
    body: "{\"accepted\":true}"
  });
  const changed = signedHeaders({
    secret: "test-secret",
    timestamp: "1786020000",
    method: "POST",
    pathWithQuery: "/api/phoenix-handoff/handoff-1/evidence",
    body: "{\"accepted\":false}"
  });

  assert.equal(signaturesMatch(first["x-phoenix-signature"], second["x-phoenix-signature"]), true);
  assert.equal(signaturesMatch(first["x-phoenix-signature"], changed["x-phoenix-signature"]), false);
});
