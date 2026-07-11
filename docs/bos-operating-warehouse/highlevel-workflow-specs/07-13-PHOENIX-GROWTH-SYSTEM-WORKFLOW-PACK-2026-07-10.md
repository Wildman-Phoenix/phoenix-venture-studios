# Phoenix Growth System Workflow Pack 07-13

Date: 2026-07-10

Provider label: `Katalyst (HighLevel)`
Mode: specification only; Chrome build and activation remain approval-gated

## Shared safety contract

All workflows require recorded consent before marketing, stop on `phoenix-unsubscribed` or DND, and must not store SSNs, bank credentials, account numbers, tax files, credit files, or sensitive documents. Funding decisions, partner sharing, claims, and referrals create a Nathan review task rather than an automatic external action. Test with masked contacts in `disabled`, then `shadow`; move to `primary` only after readback and delivery proof.

## 07 — Newsletter signup and contact sync

- Trigger: protected Phoenix signup submission after Turnstile and server validation.
- Filters: valid email and explicit marketing consent.
- Actions: upsert contact; set signup source/time, consent and newsletter status; add `phoenix-newsletter`, `phoenix-founder-signal`, and `phoenix-onboarding`; enroll in workflow 08.
- Stop/failure: no consent, invalid email, DND, or suppression. Log a masked failure and preserve the Supabase audit row.
- Acceptance: one masked contact, no duplicate, correct fields/tags, and workflow 08 enrollment.

## 08 — Immediate Founder Signal welcome

- Trigger: workflow 07 enrollment or approved reactivation.
- Filters: consent true, subscribed, not DND, welcome not previously delivered.
- Actions: send the approved welcome; record provider message ID and delivery timestamp; continue to workflow 09.
- Stop/failure: suppression or delivery failure. Remove onboarding eligibility on hard bounce and create an internal review item.
- Acceptance: one delivered message with the correct preference and unsubscribe links; re-entry does not duplicate it.

## 09 — Nathan founder note at approximately 24 hours

- Trigger: successful workflow 08 delivery.
- Wait: approximately 24 hours in the location timezone.
- Filters: still consented/subscribed and not route-complete.
- Actions: send the approved Nathan note and record the send.
- Stop/failure: unsubscribe, DND, buyer/client/route-complete tag, or prior send.
- Acceptance: send occurs after the wait once; suppression during the wait prevents it.

## 10 — Preferences request at approximately 72 hours

- Trigger: successful workflow 08 delivery.
- Wait: approximately 72 hours in the location timezone.
- Filters: subscribed and no `phoenix-preferences-complete` tag.
- Actions: send the canonical preferences link with stable UTM values.
- Stop/failure: unsubscribe, DND, completed preferences, or route-complete.
- Acceptance: correct link and one send; completion before the wait prevents it.

## 11 — Preferences update and segmentation

- Trigger: protected preference submission.
- Filters: matching contact; preference updates must never create or restore consent.
- Actions: update interests, segment, stage and preference fields; replace derived interest/stage tags; add `phoenix-preferences-complete`.
- Stop/failure: unknown contact or invalid payload routes to review without changing consent.
- Acceptance: segmentation changes while consent and suppression state remain exactly as they were.

## 12 — Weekly Founder Signal delivery

- Trigger: approved weekly publication webhook/campaign manifest.
- Filters: `phoenix-founder-signal`, consent true, subscribed, not DND/suppressed, and not already sent the same publication ID.
- Actions: send approved subject/body/CTA; record signal ID, provider message ID and sent time.
- Stop/failure: missing publication approval/hash, suppression, duplicate publication ID, or provider error.
- Acceptance: eligible masked contact receives once; suppressed and duplicate contacts receive nothing.

## 13 — Unsubscribe and suppression synchronization

- Trigger: Phoenix unsubscribe submission, Katalyst unsubscribe/DND webhook, hard bounce, or complaint.
- Actions: set consent false and status unsubscribed; add `phoenix-unsubscribed`; remove newsletter, Founder Signal, onboarding and preferences-complete audience tags; stop all Phoenix marketing workflows; mirror evidence to Supabase.
- Security: accept Katalyst callbacks only with a valid `X-GHL-Signature`.
- Failure: if either system is unavailable, retain the suppression event and retry; suppression wins over all other updates.
- Acceptance: unsubscribe from either side prevents welcome, drip and weekly delivery and cannot be reversed by a preferences update.

## Application Path routing workflows

The existing workflow 06 specification remains the intake coordinator. Its branches are:

- Funding review: move to `Funding Fit` or `Prep First`; create a Nathan task; never make financial claims or request restricted data.
- Consulting review: move to `Consulting Fit`; create a review task with the desired outcome and current tools.
- Certification/product: tag the interest and route to `Needs Review`; no incompatible nurture.
- Partnership/referral: move to `Partner Match`; require sharing consent and Nathan approval before any referral.
- Needs Nathan: move to `Needs Review`; create a task/notification containing only the minimum non-sensitive summary.

## Chrome build order and proof

Build 07 through 13 in order, then connect workflow 06 branches. Keep every workflow draft/disabled until masked tests prove trigger, filters, waits, branch, tags, fields, task, message, stop conditions, suppression, and re-entry behavior. Record workflow IDs in the Phoenix publication/run manifest. Publishing and Social Planner activation require Nathan's explicit final approval.
