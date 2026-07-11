# Supabase Continuity Risk Audit

Date: June 8, 2026

Scope: Phoenix rebuild app continuity risk if Supabase project `kqhteuhrhkqrsxynvxln` is auto-paused after the June 7, 2026 warning.

## Current dependency summary

- The rebuild frontend is wired directly to this Supabase project through `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- The repo-level Supabase binding is explicit in `supabase/config.toml` with `project_id = "kqhteuhrhkqrsxynvxln"`.
- The app uses this project for three categories of runtime work:
  - protected public forms and lead capture
  - newsletter/onboarding/send flows
  - intelligence/editorial reads and edge-function-backed feed generation

Assumption for this audit: a paused project means browser calls to Supabase, PostgREST view reads, and Edge Function invocations are unavailable until the project is resumed.

## User-facing flows that rely on this project

### Hard launch blockers if paused

- Newsletter signup:
  - homepage/signup component calls `validate-form`, `submit-form`, then `newsletter-welcome`
  - break result: signup fails or cannot save, and welcome email cannot queue
- Founder Signal signup:
  - `/founder-signal` calls `validate-form`, `submit-form` for subscription, optional `submit-form` for preferences, then `newsletter-welcome`
  - break result: no new subscribers, no saved interests, no welcome email
- Contact and funding lead capture:
  - `/contact`, `/funding`, `/preferred-funding`, `/sigma-funding`, `/snapshot`, and post-booking follow-up all depend on `validate-form` plus `submit-form`
  - break result: no protected form can submit; lead capture stops
- Unsubscribe:
  - `/unsubscribe` uses `validate-form` and `submit-form`
  - break result: unsubscribe requests cannot be processed
- Venture Snapshot result generation:
  - `/snapshot` first saves the lead through `submit-form`, then calls `venture-snapshot`
  - break result: no lead saved and no generated snapshot response

### Partial or mixed degradation if paused

- Market Intelligence main feed:
  - `founder-intelligence` is used at runtime, but `src/lib/market-intelligence-feed.ts` falls back to static RSS content if the function fails
  - likely result: page still renders, but freshness and live intelligence generation degrade
- Founder intelligence ticker/card component:
  - `src/components/FounderIntelligenceFeed.tsx` uses Supabase first and only falls back to static RSS when local Supabase config is missing, not when a live call fails
  - likely result: visible feed error state instead of fallback when the project is paused
- Phoenix Editorial rail on `/market-intelligence`:
  - direct read from `public_intelligence_entries`
  - break result: editorial cards disappear or stay empty
- Intelligence detail routes:
  - `/intelligence/:slug` reads `public_intelligence_entries`
  - break result: detail routes redirect away because the record cannot load

### Mostly launch-adjacent, but still continuity-relevant

- Share/unfurl support for intelligence entries:
  - `og-share` reads `public_intelligence_entries`
  - break result: share image/meta generation for those routes becomes unreliable
- Capital and sigma email follow-up helpers:
  - `capital-lead-notify`, `capital-welcome-email`, `sigma-lead-notify`, `capital-followup-email`
  - break result: some leads may still save if `submit-form` worked, but notifications/follow-ups would not run if the project is paused
- Newsletter/onboarding operations:
  - `onboarding-nathan-intro`, `onboarding-preferences-ask`, `process-onboarding-drip`, `send-founder-signal`
  - break result: subscribers stop receiving downstream onboarding and weekly sends

## Supabase-backed data/functions currently in use

### Publicly hit edge functions

- `validate-form`
- `submit-form`
- `newsletter-welcome`
- `venture-snapshot`
- `founder-intelligence`
- `capital-lead-notify`
- `capital-welcome-email`
- `sigma-lead-notify`

### Runtime reads/writes behind those flows

- Tables/views touched by current flows:
  - `leads`
  - `newsletter_subscribers`
  - `subscriber_profiles`
  - `post_booking_interactions`
  - `form_security_log`
  - `weekly_brief_runs`
  - `intelligence_entries`
  - `public_intelligence_entries`
  - `image_health_runs`
- Storage dependency:
  - `phoenix-editorial` and `founder-intelligence` write/read Supabase storage for intelligence images

## What would break at launch if nothing changes

- Public lead capture is not launch-safe without an active Supabase project.
- Turnstile validation is not launch-safe without an active Supabase project because `validate-form` is the server-side gate.
- Unsubscribe compliance flow is not launch-safe without an active Supabase project.
- Venture Snapshot is not launch-safe without an active Supabase project.
- Founder Signal list growth is not launch-safe without an active Supabase project.
- Market intelligence content is only partially resilient:
  - static RSS-backed sections can survive
  - direct `public_intelligence_entries` reads cannot

## Minimum continuity actions before launch

1. Confirm ownership of the continuity decision.
   - Either keep `kqhteuhrhkqrsxynvxln` active through launch, or replace it and rotate all env/config references before launch.

2. Prove the project is active now.
   - Open the Supabase dashboard for `kqhteuhrhkqrsxynvxln`.
   - Verify the project is not paused and can run Edge Functions and database reads.

3. Verify the frontend is pointed at the intended live project.
   - Check Cloudflare Pages production env vars:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Confirm they point to the same live project you intend to keep active.

4. Verify the launch-critical functions are deployed and callable.
   - Required before launch:
     - `validate-form`
     - `submit-form`
     - `newsletter-welcome`
     - `venture-snapshot`
   - Required if their pages are in launch scope:
     - `founder-intelligence`
     - `capital-lead-notify`
     - `capital-welcome-email`
     - `sigma-lead-notify`

5. Run a minimum smoke test against the real live stack.
   - Submit a safe test through homepage newsletter signup.
   - Submit a safe test through `/founder-signal` with at least one interest selected.
   - Submit a safe test through one lead form:
     - `/contact` or `/funding`
   - Submit a safe test through `/snapshot` and confirm the generated result returns.
   - Submit a safe test through `/unsubscribe`.
   - Load `/market-intelligence` and one `/intelligence/:slug` route.

6. Decide whether market intelligence needs true runtime continuity or only static continuity.
   - If launch only needs static signal pages and RSS, the site can tolerate a partial Supabase outage better.
   - If launch expects live editorial cards, intelligence detail routes, or runtime feed freshness, Supabase continuity is a hard dependency.

## Practical recommendation

- Treat Supabase project continuity as a launch gate, not a post-launch cleanup item.
- If Phoenix wants zero launch risk this week, the fastest path is:
  - keep `kqhteuhrhkqrsxynvxln` active through launch
  - verify the critical functions above
  - run the live smoke tests above
- Do not assume the static Cloudflare deployment makes the launch independent from Supabase. It does not. The public site can render without Supabase, but the key conversion and compliance flows cannot.

## Open risks

- This audit maps code-level dependency only. It does not prove the current live Supabase project is still active or fully deployed.
- The market intelligence experience is split between static fallback and runtime-only Supabase reads, so continuity is uneven unless those runtime reads are intentionally removed or replaced.
- If the project is replaced instead of resumed, every Pages env var, Supabase secret, function deployment target, and any DB/view/storage assumptions must be revalidated before launch.
