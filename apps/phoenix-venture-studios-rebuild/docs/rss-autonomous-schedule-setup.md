# Phoenix RSS Autonomous Schedule Setup

This checklist turns the local two-feed RSS system into a live unattended GitHub schedule.

## Current Feed URLs

- Founder Market: `https://phoenixventurestudios.com/rss/feed.xml`
- Founder Tools: `https://phoenixventurestudios.com/rss/tools.xml`
- Compatibility alias: `https://phoenixventurestudios.com/rss/ai-attention.xml`

## GitHub Requirements

The workflow file is `.github/workflows/phoenix-rss-autonomous.yml`.

Before the four daily cron runs can execute, the repository must have:

- The workflow and RSS source files committed and pushed.
- The GitHub app or local git remote connected to the real repository.
- These GitHub Actions secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_TURNSTILE_SITE_KEY`

## Schedule

The workflow runs at:

- `09:30 UTC`
- `14:30 UTC`
- `19:30 UTC`
- `02:30 UTC`

These map to the intended four daily checks during Eastern Daylight Time. They are not DST-aware, so winter local time shifts by one hour unless the cron values are updated.

## Safety Gates

Each scheduled run performs:

1. `npm run rss:test`
2. `npm run rss:autonomous`
3. `npm run rss:validate`
4. Publish/build/deploy only when `output_changed == true`
5. `node scripts/rss/validate-rss-output.mjs --deploy-artifacts`
6. Cloudflare Pages deploys only after deploy-artifact validation passes

The autonomous runner snapshots `public/rss` before generation and restores the prior RSS bundle if the new two-feed run is invalid.

## Manual Verification

After the first scheduled run, verify:

- GitHub Actions run is green.
- `https://phoenixventurestudios.com/rss/feed.xml` returns `200`.
- `https://phoenixventurestudios.com/rss/tools.xml` returns `200`.
- `https://phoenixventurestudios.com/rss/ai-attention.xml` still returns `200`.
- A current signal page has raw `og:image` and `twitter:image` metadata.
- Generated image URLs return `200 image/jpeg`.
