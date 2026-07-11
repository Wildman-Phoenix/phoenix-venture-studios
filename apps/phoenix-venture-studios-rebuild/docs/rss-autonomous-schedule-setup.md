# Phoenix RSS Autonomous Schedule Setup

This checklist turns the local two-feed RSS system into a live unattended GitHub schedule.

## Current Feed URLs

- Founder Market: `https://phoenixventurestudios.com/rss/feed.xml`
- Founder Tools: `https://phoenixventurestudios.com/rss/tools.xml`
- AI Attention: `https://phoenixventurestudios.com/rss/ai-attention.xml`
- GoHighLevel one-at-a-time market queue: `https://phoenixventurestudios.com/rss/social.xml`
- GoHighLevel one-at-a-time tools queue: `https://phoenixventurestudios.com/rss/tools-social.xml`
- GoHighLevel one-at-a-time AI Attention queue: `https://phoenixventurestudios.com/rss/ai-attention-social.xml`

## GitHub Requirements

The workflow file is `.github/workflows/phoenix-rss-autonomous.yml`.

Before the live cron can execute, the repository must have:

- The workflow and RSS source files committed and pushed.
- The GitHub app or local git remote connected to the real repository.
- These GitHub Actions secrets:
  - `CLOUDFLARE_API_TOKEN`
  - `CLOUDFLARE_ACCOUNT_ID`
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_KEY`
  - `VITE_TURNSTILE_SITE_KEY`

## Schedule

The checked-in workflow currently runs on a six-hour cadence:

- GitHub cron: `30 4 * * *`
- GitHub cron: `30 10 * * *`
- GitHub cron: `30 16 * * *`
- GitHub cron: `30 22 * * *`

There is also a Friday AI trend sweep:

- GitHub cron: `30 13 * * 5`

For RSS-to-social, use the one-at-a-time queue URL that matches the exact feed family you want and set the consumer to check more frequently than the feed if needed. Do not connect the 10-item archive feeds to auto-post unless you want multiple items ingested at once.

## Safety Gates

Each scheduled run performs:

1. `npm run rss:test`
2. `npm run rss:autonomous`
3. `npm run rss:validate`
4. Publish/build/deploy only when `output_changed == true`
5. `node scripts/rss/validate-rss-output.mjs --deploy-artifacts`
6. Cloudflare Pages deploys only after deploy-artifact validation passes

The autonomous runner snapshots `public/rss` before generation and restores the prior RSS bundle if the new run is invalid. The normal archive feeds keep 10 items; the social queue feeds expose one item at a time.

Use `npm run rss:autonomous` for production-style queue rotation. A plain `npm run rss:generate` refreshes the files, but it does not update `autonomous-history.json`, so it is not the right command for confirming one-at-a-time queue advancement.

## Manual Verification

After the first scheduled run, verify:

- GitHub Actions run is green.
- `https://phoenixventurestudios.com/rss/feed.xml` returns `200`.
- `https://phoenixventurestudios.com/rss/tools.xml` returns `200`.
- `https://phoenixventurestudios.com/rss/ai-attention.xml` returns `200` and self-identifies as `/rss/ai-attention.xml`.
- `https://phoenixventurestudios.com/rss/social.xml` returns `200` and contains one item.
- `https://phoenixventurestudios.com/rss/tools-social.xml` returns `200` and contains one item.
- `https://phoenixventurestudios.com/rss/ai-attention-social.xml` returns `200` and contains one item.
- A current signal page has raw `og:image` and `twitter:image` metadata.
- Generated image URLs return `200 image/jpeg`.
