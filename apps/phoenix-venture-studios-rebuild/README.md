# Phoenix Venture Studios Rebuild

Phoenix Venture Studios rebuild is a Vite/React frontend with Supabase Edge Functions and a static RSS/signal-page pipeline.

This repo is no longer documented as a Lovable-hosted project. The intended deployment model is:

- frontend build deployed manually or via CI to Cloudflare Pages
- Supabase Edge Functions deployed from the `supabase/functions` directory
- RSS/static signal output generated locally or in automation, then published to the site deploy target

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Supabase

## Local development

Requirements:

- Node.js 20+
- npm

Install and run:

```sh
cd apps/phoenix-venture-studios-rebuild
npm install
npm run dev
```

Useful scripts:

```sh
npm run build
npm run preview
npm run test
npm run rss:test
npm run rss:generate
npm run rss:publish-preview
npm run preview:publish
```

## Environment

Frontend and build flows rely on environment values rather than a platform-specific editor.

Common values:

- `VITE_BASE_PATH=/` for apex production hosting
- `SITE_URL=https://phoenixventurestudios.com`
- `PHOENIX_RSS_SITE_URL=https://phoenixventurestudios.com`
- `OPENAI_API_KEY` for AI-backed snapshot/editorial/image generation
- `PERPLEXITY_API_KEY` only if visual research is desired in editorial generation
- Supabase project values required by Edge Functions:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_ANON_KEY` where applicable
- Email/send flows may also require:
  - `RESEND_API_KEY`

If `OPENAI_API_KEY` is unavailable, some functions now fall back to deterministic local output or skip generated images instead of depending on Lovable.

## Frontend deployment

For production at `https://phoenixventurestudios.com/`:

1. Build with `VITE_BASE_PATH=/`.
2. Deploy the built app root to Cloudflare Pages or another static host at the domain apex.
3. Configure root-level SPA rewrites for app routes.
4. Regenerate RSS/static signal pages with apex URLs before publishing.

Preview scripts under `scripts/preview` and `scripts/rss/publish-preview-rss.mjs` are still for preview/subpath publishing. They should not be treated as the final apex deployment artifact.

## Supabase Edge Functions

Functions in `supabase/functions` are deployed through Supabase, not Cloudflare Pages. Typical flow:

```sh
supabase functions deploy venture-snapshot
supabase functions deploy phoenix-editorial
supabase functions deploy founder-intelligence
supabase functions deploy onboarding-nathan-intro
```

Set secrets in Supabase for the required runtime environment values before deploying.

## RSS and preview publishing

The RSS pipeline and preview publishing helpers live under:

- `scripts/rss/`
- `scripts/preview/`

The preview helpers publish into the preview hub output tree and are useful for QA. Production publishing should use apex-aligned URLs and root deployment paths.

## Operational notes

- Do not assume preview output is production-ready.
- Do not assume generated RSS/static pages are apex-ready unless they were regenerated with production site URLs.
- The dev-only `lovable-tagger` package may still appear in local tooling, but production runtime should not depend on Lovable services.
