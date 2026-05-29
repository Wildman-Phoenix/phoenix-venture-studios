# Phoenix Rebuild Live Launch Config Checklist

Last updated: May 27, 2026

This checklist documents the live configuration and manual cutover path for root hosting on `https://phoenixventurestudios.com` using the dedicated Cloudflare Pages production project `phoenixventurestudios-com`. Secrets stay in Cloudflare Pages or Supabase function secrets, never in the repository.

## Production topology

- Production Pages project: `phoenixventurestudios-com`
- Canonical host: `https://phoenixventurestudios.com`
- Redirect host: `https://www.phoenixventurestudios.com` -> `https://phoenixventurestudios.com`
- Preview hub remains separate:
  - Pages project: `phoenix-previews`
  - URL family: `https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild/`
- Do not cut production traffic out of the shared preview hub. Production deploys should use the app-local `dist` artifact only.

## Cloudflare Pages public environment variables

Set these on the `phoenixventurestudios-com` Pages project before the production deploy.

| Variable | Required for | Production expectation |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | frontend Supabase client | Must match the production Supabase project URL. |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | frontend Supabase client | Public anon/publishable key only. |
| `VITE_TURNSTILE_SITE_KEY` | form captcha widget | Public site key for client-side Turnstile rendering. |
| `VITE_BASE_PATH` | build routing | Must be `/` for root hosting. |
| `PHOENIX_RSS_SITE_URL` | static RSS generation and signal page metadata | Must be `https://phoenixventurestudios.com`. |

Notes:

- `VITE_BASE_PATH=/` is required because `vite.config.ts` reads `env.VITE_BASE_PATH || "/"`.
- `PHOENIX_RSS_SITE_URL` must be the apex host so generated RSS items and static signal detail pages emit production canonicals and share images.
- Keep preview builds overriding `VITE_BASE_PATH=/phoenix-venture-studios-rebuild/` and `PHOENIX_RSS_SITE_URL=https://previews.phoenixventurestudios.com/phoenix-venture-studios-rebuild`.
- `VITE_TURNSTILE_SITE_KEY` must be a real production widget before DNS cutover. Cloudflare's documented testing key `1x00000000000000000000AA` is acceptable only for staging smoke tests and must never be cut live.

## Turnstile provisioning

Before cutover, create or verify a real Turnstile widget in Cloudflare for:

- `phoenixventurestudios.com`
- `www.phoenixventurestudios.com`

Store the public site key where the production artifact build can read it, and store the matching secret key as `TURNSTILE_SECRET_KEY` in the production Supabase project. The server-side validator now fails closed when the secret is missing, so leaving this half-configured will break public forms by design.

## Supabase Edge Function secrets

Set these on the production Supabase project before any live form or email verification.

| Secret | Required for | Notes |
| --- | --- | --- |
| `SUPABASE_SERVICE_ROLE_KEY` | admin writes, feed composition, form handlers | Required by multiple edge functions. Keep server-side only. |
| `TURNSTILE_SECRET_KEY` | captcha validation | Required for strict Turnstile verification in `validate-form`. |
| `RESEND_API_KEY` | welcome/onboarding/newsletter delivery flows | Required for `newsletter-welcome`, `onboarding-nathan-intro`, `onboarding-preferences-ask`, `process-onboarding-drip`, and `send-founder-signal`. |
| `SITE_URL` | function-generated links where still referenced | Must be `https://phoenixventurestudios.com`. |

## Production function registration checks

Confirm the production Supabase project has the newsletter-related edge functions deployed and callable:

- `submit-form`
- `newsletter-welcome`
- `onboarding-nathan-intro`
- `onboarding-preferences-ask`
- `process-onboarding-drip`
- `compose-founder-signal`
- `send-founder-signal`

These names must stay aligned with `supabase/config.toml` and the deployed project. Do not add secret values to this repo while verifying them.

## Resend and manual-send readiness

1. In Resend, verify the sending domain and the `signal@phoenixventurestudios.com` sender used by the newsletter and onboarding functions.
2. In the production Supabase project, set `RESEND_API_KEY` and `SITE_URL=https://phoenixventurestudios.com` before testing any welcome, onboarding, or weekly-send flow.
3. Confirm the production site exposes working public routes used inside emails:
   - `https://phoenixventurestudios.com/unsubscribe`
   - `https://phoenixventurestudios.com/founder-signal/preferences`
   - `https://phoenixventurestudios.com/market-intelligence`
4. Treat `send-founder-signal` as a manual-send function at launch. Do not auto-run it until a real brief has been reviewed and approved.
5. Before the first live send, manually verify that at least one approved `weekly_brief_runs` record exists and that unsubscribe placeholders are still being injected at send time.
6. For onboarding drip tests, invoke the sequence manually in a safe test context first:
   - signup via `submit-form`
   - immediate `newsletter-welcome`
   - delayed `onboarding-nathan-intro`
   - delayed `onboarding-preferences-ask`
7. If Resend is intentionally absent in a test environment, expect log-only behavior from the welcome/onboarding functions and do not mistake that for live delivery readiness.

## Production artifact build

The preview publisher writes to the shared preview hub and is not the production cutover path. For production, prepare the app-local `dist` folder with root-hosted routing and static signal detail pages:

```bash
cd "/Users/nathanwildman/Documents/New project/apps/phoenix-venture-studios-rebuild"
export VITE_SUPABASE_URL="https://<production-project>.supabase.co"
export VITE_SUPABASE_PUBLISHABLE_KEY="<production-publishable-key>"
export VITE_TURNSTILE_SITE_KEY="<turnstile-site-key>"
export PHOENIX_RSS_SITE_URL="https://phoenixventurestudios.com"
npm run prepare:production
```

What this helper does:

- runs `npm run build` with `VITE_BASE_PATH=/`
- generates static signal detail pages in `dist/founder-signal/signals/<slug>/index.html`
- writes production `_redirects` into `dist/_redirects` for SPA routes
- prints the exact `wrangler pages deploy` command for the dedicated production Pages project

Manual deploy command after the helper passes:

```bash
cd "/Users/nathanwildman/Documents/New project"
wrangler pages deploy apps/phoenix-venture-studios-rebuild/dist --project-name phoenixventurestudios-com
```

Use that dedicated Pages project only. Do not deploy the rebuild’s production artifact to `phoenix-previews`.

## Cutover sequence

1. Freeze content and config changes on the old live site and on the rebuild during the cutover window.
2. Verify the `phoenixventurestudios-com` Pages project has both custom domains attached:
   - `phoenixventurestudios.com`
   - `www.phoenixventurestudios.com`
3. Confirm the production Pages env vars above are set on `phoenixventurestudios-com`.
4. Confirm the production Supabase secrets and edge functions above are ready.
5. Run `PHOENIX_RSS_SITE_URL=https://phoenixventurestudios.com npm run rss:generate`.
6. Run the production artifact helper:
   - `node scripts/preview/prepare-production-pages.mjs`
7. Deploy the prepared `dist` folder to the dedicated Pages project:
   - `wrangler pages deploy apps/phoenix-venture-studios-rebuild/dist --project-name phoenixventurestudios-com`
8. Validate the deployed Pages hostname before touching DNS:
   - homepage
   - `/funding`
   - `/snapshot`
   - `/market-intelligence`
   - `/founder-signal`
   - `/contact`
   - one or two `/founder-signal/signals/<slug>/` pages
9. In Cloudflare DNS, remove only the old Lovable web-serving records for the website hostnames:
   - apex `A` record pointing to `185.158.133.1`
   - `www` `A` record pointing to `185.158.133.1`
   - any Lovable-only `AAAA` or `CNAME` records for `@` or `www` if they still exist
10. Set the website hostnames to the dedicated Pages project target:
   - `CNAME @ -> phoenixventurestudios-com.pages.dev`
   - `CNAME www -> phoenixventurestudios-com.pages.dev`
   - If Cloudflare blocks the new CNAME, fully remove the old `A` record first, then add the CNAME.
11. Do not remove unrelated records:
   - MX
   - SPF
   - DKIM
   - DMARC
   - ownership or verification TXT records not tied to old web serving
12. After the old web records are removed, wait for the Pages domain bindings to move from pending to active.
13. Confirm `www` redirects to apex and that the apex host serves the rebuild.
14. Keep the old Lovable hosting active until post-cutover verification is complete.

## Rollback sequence

1. Keep a copy of the pre-cutover `@` and `www` DNS records, including proxy state and TTL.
2. If Pages activation or live traffic validation fails, restore the prior website records:
   - apex -> `185.158.133.1`
   - `www` -> `185.158.133.1`
3. Re-check that the old live site answers on `www`.
4. If rollback will last more than a brief incident window, detach the custom domains from `phoenixventurestudios-com` after traffic is safely back on the old site.
5. Do not cancel Lovable hosting until the new Pages production site has passed verification and remained stable for a short buffer window.

## Post-cutover validation

Run these checks on the live domain immediately after DNS changes settle:

1. `https://phoenixventurestudios.com/` returns `200`.
2. `https://www.phoenixventurestudios.com/` returns a redirect to `https://phoenixventurestudios.com/`.
3. Key routes render without 404 fallback issues:
   - `/`
   - `/funding`
   - `/snapshot`
   - `/market-intelligence`
   - `/founder-signal`
   - `/contact`
4. At least two signal detail pages load and show production `og:url`, `og:image`, and `twitter:image` tags.
5. `https://phoenixventurestudios.com/rss/feed.xml`
6. `https://phoenixventurestudios.com/rss/ai-attention.xml`
7. `https://phoenixventurestudios.com/sitemap.xml`
8. `https://phoenixventurestudios.com/robots.txt`
9. Submit one safe form test and confirm the expected Supabase and Turnstile path succeeds.
10. If onboarding/newsletter is in scope for launch day, run the manual test path before any real send.

## Launch gate

Do not remove the old web DNS records or cancel Lovable hosting until all of the following are true:

- the dedicated Pages project serves the correct build
- Pages domain bindings are ready to activate
- production env vars and Supabase secrets match the expectations above
- root-hosted app routes and generated signal pages validate on the deployed artifact
- one post-cutover smoke test passes on the real live host
