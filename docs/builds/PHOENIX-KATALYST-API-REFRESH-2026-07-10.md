# Phoenix Katalyst API Refresh

Status: `Ready` for metadata inventory; `Needs you` for approval-gated creation and the final Chrome workflow-definition review.

## Connection truth

- Provider label: `Katalyst (HighLevel)`.
- Location: `Rising Phoenix Business Services`.
- Location ID: `dLFChrqjcIIeGUaHK4z5`.
- Private integration API: healthy.
- ChatGPT HighLevel connector: separate connection; currently expired, but not required for the private API lane.
- Audit mode: read-only metadata; no contacts retrieved and no CRM records changed.
- API read errors: none.

## Current inventory

- 71 workflows: 31 published and 40 draft.
- 31 workflow keep candidates.
- 11 archive candidates.
- 11 duplicate-name candidates.
- 18 unrelated workflows.
- No workflow currently classified as a Phoenix, Founder Signal, newsletter, or Application Path dependency.
- 5 pipelines; `Phoenix Applications` is absent.
- 48 custom fields; the planned Phoenix field set is absent.
- 71 tags; three Phoenix base tags are present and nine planned operating tags are absent.
- 10 connected social accounts; no account is selected automatically.

## Missing Phoenix objects

Pipeline:

- `Phoenix Applications`

Planned field groups still missing:

- signup timestamp, source, consent, and newsletter status;
- Phoenix stage, interest, challenge, and build context;
- preferences, interests, segment, and last-send state;
- Application Path goal, business stage, urgency, next step, and contact consent.

Planned tags still missing:

- `phoenix-preferences-complete`
- `phoenix-unsubscribed`
- `intake-started`
- `intake-needs-review`
- `funding-fit`
- `consulting-fit`
- `prep-first`
- `partner-match-ready`
- `referral-approved`

## Next safe execution boundary

The API inventory is current. Creation of the missing pipeline, fields, tags, workflow definitions, workflow publication, social account selection, and live test enrollment remains approval-gated. Workflow-definition inspection and Social Planner configuration remain the final logged-in Chrome lane.
