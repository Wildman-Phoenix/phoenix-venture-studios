# Phoenix Growth System Runbook

## Operating goal

Keep the existing Phoenix website and creative system intact while making the backend reliable, inexpensive, recoverable, and conversationally controllable.

## System ownership

- React and Cloudflare Pages: public website, generated signal pages, RSS and static assets.
- GitHub Actions: only production RSS schedule and deployment lane.
- Katalyst (HighLevel): CRM, consent-aware workflows, email, social planning and operational reporting after approval.
- Supabase: protected intake, Turnstile validation, suppression evidence, audit and fallback.
- Codex: request classification, local build, validation, evidence, cost ledger and approved release coordination.

## Hard release gate

`tests -> staged generation -> validation -> changed-output proof -> SHA-256 manifest -> atomic promotion -> artifact preparation -> deploy -> Pages alias verification -> custom-domain verification`

Never publish an invalid or unmanifested bundle. A preserved feed is `Review`, not clean success. The prior public RSS directory is retained until the promoted directory is active.

## Normal verification

From the Phoenix app:

1. Run the 68-test RSS suite.
2. Run the RSS supervisor smoke test.
3. Run TypeScript and backend route/feed validation.
4. Run the production proof build.
5. For a release, use the autonomous runner; deploy only when its output says valid and changed.
6. Verify all six XML feeds on both Cloudflare addresses.

## Scheduling

GitHub Actions is the intended owner of the four daily RSS runs. Its deterministic gate is proven through deploy-artifact validation, but unattended production deployment still requires the Cloudflare Actions secrets. Keep the Codex six-hour RSS fallback active until one fully green GitHub production run proves deployment and both-domain parity. Daily Ops Digest remains unchanged. Slack and unrelated paused automations are outside this runbook.

## Katalyst rules

Use API reads for inventory and evidence. Do not query broad contact lists. Workflow definitions and Social Planner account selection are reviewed in the logged-in Chrome profile last. No workflow publication, CRM mutation, email activation, social activation, or account selection occurs without Nathan's explicit approval.

## Recovery

- Generation failure: leave current `public/rss` in place and mark `Blocked` or `Review`.
- Promotion failure: restore the rollback directory before exiting.
- Deployment parity failure: deployment is failed even if the Pages command succeeded.
- Katalyst delivery uncertainty: suppression wins; remain in `shadow` or `disabled`.
- Secret or contact leakage: stop, remove the artifact from reporting, rotate affected credentials if needed, and review logs.

## Creative boundary

Nathan owns final brand, copy, image and customer-experience direction. Backend work may add contracts, validators, routing consistency, security and evidence, but must not redesign public creative surfaces before that direction is supplied.
