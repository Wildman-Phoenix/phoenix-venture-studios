# Phoenix Release and Scheduler Cutover Packet

Status: `Needs you`

## Current truth

- Backend release merged to GitHub through PRs 1-6.
- Cloudflare production was deployed from the authenticated local release lane.
- Six RSS feeds match on `phoenixventurestudios-com.pages.dev` and `phoenixventurestudios.com`.
- Generated signal-page metadata and images pass live verification.
- Supabase is active on the Free plan; nine changed Edge Functions and three migrations are deployed.
- Supabase security advisors report zero findings after hardening.
- GitHub clean-run generation now hydrates and hash-verifies the last valid live bundle before advancing one scheduled social queue.
- GitHub tests, hydration, generation, RSS validation, production preparation, preview publication, and deploy-artifact validation pass.
- GitHub deployment stops because `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` are empty in Actions.
- Codex `Phoenix RSS Smart Refresh` remains active until one scheduled GitHub run completes production deployment and live parity.

## Reconnect and cutover

1. Add a scoped Cloudflare Pages token to GitHub Actions as `CLOUDFLARE_API_TOKEN`.
2. Add the matching account identifier as `CLOUDFLARE_ACCOUNT_ID`.
3. Run `Phoenix RSS Autonomous Refresh` manually or wait for the next scheduled run.
4. Require every step, production deploy, Pages alias parity, and custom-domain parity to pass.
5. Pause Codex automation `Phoenix RSS Smart Refresh` only after that evidence exists.
6. Optionally replace it with a low-frequency read-only failure monitor.

## Scheduling contract

- 6:30 AM Detroit: archives plus Founder Market social.
- 12:30 PM Detroit: archives plus Founder Tools social.
- 6:30 PM Detroit: archives plus AI Attention social.
- 12:30 AM Detroit: archives only.
- Friday discovery: research/refresh only; no extra social item.

The workflow is schedule/manual only. Normal code pushes do not create RSS runs.

## Rollback

- Hydration verifies the prior live manifest before generation.
- Failed generation or validation leaves the current public release untouched.
- Invalid or preserved feeds are `Review`, not success.
- Deployment completion requires independent parity on the Pages alias and custom domain.
