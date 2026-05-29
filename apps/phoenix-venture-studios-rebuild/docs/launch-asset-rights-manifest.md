# Phoenix Rebuild Launch Asset Rights Manifest

Last updated: May 23, 2026

This manifest is the launch-facing rights snapshot for public assets used by the Phoenix Venture Studios rebuild. Unknown or uncleared assets stay marked `needs-clearance` until Phoenix confirms provenance and public-use rights.

## Approved Phoenix-owned assets

| Scope | Status | Notes |
| --- | --- | --- |
| `public/images/signal-default.jpg` | `phoenix-owned-approved` | Default social/share image for homepage and fallback editorial use. |
| `public/images/signal-business-credit.jpg` | `phoenix-owned-approved` | Static Phoenix-owned editorial fallback. |
| `public/images/signal-market-risk.jpg` | `phoenix-owned-approved` | Static Phoenix-owned editorial fallback. |
| `public/images/signal-founder-strategy.jpg` | `phoenix-owned-approved` | Static Phoenix-owned editorial fallback. |
| `public/images/signal-venture-funding.jpg` | `phoenix-owned-approved` | Static Phoenix-owned editorial fallback. |
| `public/images/signal-ai-infrastructure.jpg` | `phoenix-owned-approved` | Static Phoenix-owned editorial fallback. |
| `public/images/signals/backgrounds/*.jpg` | `phoenix-owned-generated` | Phoenix-controlled background library for generated cards. |
| `public/images/signals/generated/*.jpg` | `phoenix-owned-generated` | Public RSS/social cards generated from Phoenix-owned backgrounds. No publisher hotlinks allowed. |

## Needs clearance before broader public reuse

| Scope | Status | Notes |
| --- | --- | --- |
| `src/assets/*.jpg` | `needs-clearance` | App imagery needs provenance confirmation before reuse outside the current rebuild. |
| `public/Preferred_Funding_Group_Overview.pdf` | `needs-clearance` | Public file exists, but launch rights/use scope should be explicitly confirmed. |

## Launch rule

If an RSS story cannot use an `allowed` source image under `rss-data/image-source-allowlist.json`, it must keep using a Phoenix-owned background/card from `public/images/signals/backgrounds/` or `public/images/signals/generated/`. New custom backgrounds are a manual creative request, not a cron responsibility.
