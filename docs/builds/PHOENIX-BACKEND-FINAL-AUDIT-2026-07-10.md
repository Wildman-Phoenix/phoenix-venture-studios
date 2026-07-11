# Phoenix Backend Final Audit

Status: `Needs you`

## Fixed and verified

- Clean backend-only release; unrelated graduation, generated-media, and visual-page work excluded.
- RSS suite: 68/68.
- Backend route/feed checks, eleven security invariants, supervisor recovery, schedule rules, and production build pass.
- Six feeds and generated signal pages are live and match on both Cloudflare domains.
- Clean GitHub runners preserve inactive social queues by hydrating the last valid manifest and referenced Phoenix images before generation.
- Production artifact creation happens before preview RSS publication.
- Wrangler is pinned to 4.110.0 and completed a production deployment with live parity.
- Nine Supabase functions are deployed.
- Newsletter synchronization evidence is service-role-only.
- The public intelligence view now honors caller RLS.
- The maintenance event-trigger function is no longer publicly executable.
- Anonymous storage directory listing was removed from the public intelligence-image bucket.
- Supabase security advisor result: zero findings.
- Rendered QA passed on twelve desktop routes and six high-value mobile routes with no horizontal overflow, missing image alternative text, or browser console errors.
- Desktop homepage and mobile unsubscribe viewport captures received visual signoff; no forms or external systems were submitted or changed.

## Current schedules

- GitHub Actions: four daily RSS refreshes plus the Friday discovery sweep.
- Codex: Daily Ops Digest active.
- Codex: Phoenix RSS Smart Refresh active every six hours as temporary fallback.
- Four superseded Codex automations remain paused.
- The Codex RSS fallback must not be paused until GitHub has valid Cloudflare Actions credentials and one fully green production run.

## Cost position

- Cloudflare: no upgrade recommended; static Pages remains the correct low-cost architecture.
- Supabase: confirmed Free plan; no upgrade recommended from current evidence.
- GitHub Actions: deterministic Node/RSS work; no paid model calls are required.
- Routine RSS: no paid research or image generation. Existing assets, source fetches, and deterministic generation are used.
- Katalyst/HighLevel: existing subscription; this release introduced no verified incremental platform charge.
- Codex cost remains higher than necessary until the duplicate six-hour RSS fallback can be retired.

## Reconnect requirements

- GitHub Actions needs `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
- The ChatGPT HighLevel connector requires reauthentication; its OAuth grant returns `invalid_grant`.
- Local Cloudflare OAuth is healthy.
- Supabase connector and project are healthy.
- The older private Katalyst integration snapshot cannot be treated as current until its protected runtime token is available or the ChatGPT connector is reauthenticated.

## Katalyst and Chrome finish

Chrome is required only for workflow-definition and Social Planner UI work that the current public API does not expose.

1. Attach the already logged-in `Nathan Wildman RPBS` Chrome profile when Nathan is not using it.
2. Confirm the Rising Phoenix Business Services location before edits.
3. Refresh workflow, pipeline, field, tag, template, and social-account inventory.
4. Compare every Phoenix workflow against the 07-13 workflow pack and Application Path specification.
5. Create or correct the Phoenix pipeline, fields, tags, and workflow definitions as drafts/disabled.
6. Test signup, reactivation, preferences, unsubscribe, funding, consulting, certification/product, partnership/referral, not-sure, no-consent, and sensitive-data paths with masked contacts.
7. Verify suppression, incompatible-nurture stops, stages, tasks, messages, retries, and duplicate prevention.
8. Confirm Phoenix-owned LinkedIn, Facebook, and Instagram accounts; do not infer personal or unrelated accounts.
9. Configure the three RSS Social Planner feeds but keep them inactive.
10. Present the masked QA ledger and stop for explicit activation approval.

## Creative boundary

No brand, copy, image direction, or customer-experience redesign was performed. Nathan's creative review begins after the Katalyst finish and scheduler cutover are proven.

## Evidence index

- `docs/builds/PHOENIX-RENDERED-QA-2026-07-10.md`
- `docs/builds/qa-evidence/phoenix-desktop-home.jpg`
- `docs/builds/qa-evidence/phoenix-mobile-unsubscribe.jpg`
