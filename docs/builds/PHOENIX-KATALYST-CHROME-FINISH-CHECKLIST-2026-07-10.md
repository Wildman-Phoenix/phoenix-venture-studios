# Phoenix Katalyst Chrome Finish Checklist

Status: `Needs you` before live writes

Location to confirm: `Rising Phoenix Business Services`
Operator label: `Katalyst (HighLevel)`

## Before Chrome

- Reauthenticate the separate ChatGPT HighLevel connector if Nathan wants connector access; the private API already works.
- Use the existing logged-in Chrome profile only when Nathan explicitly makes it available.
- Confirm the location name and ID against the metadata audit.
- Keep all new workflows draft/disabled.
- Use masked test contacts only.

## Metadata build requiring approval

Create and read back:

- Pipeline `Phoenix Applications`.
- Stages: New, Needs Review, Funding Fit, Consulting Fit, Prep First, Partner Match, Referred, Not Fit.
- The 17 missing Phoenix/newsletter/application fields listed in `artifacts/katalyst-metadata-audit.json`.
- The nine missing Phoenix/application tags listed in that audit.

Do not archive the 11 duplicate or 11 archive-candidate workflows during this pass. Present the exact names first; deletion/archive is a separate approval.

## Workflow definition review

Build in the dependency order documented in `07-13-PHOENIX-GROWTH-SYSTEM-WORKFLOW-PACK-2026-07-10.md` and the existing Application Path workflow 06 spec.

For each workflow record:

- workflow ID and draft/published state;
- trigger and re-entry setting;
- consent, subscribed and DND filters;
- waits in the Rising Phoenix timezone;
- branches, tags, fields and opportunity stage;
- incompatible-nurture stop conditions;
- task/notification owner;
- failure and retry behavior;
- masked positive and negative test evidence.

## Masked acceptance matrix

Test: signup, reactivation, preferences, unsubscribe, funding fit, consulting fit, certification/product, partnership/referral, not sure, no consent and sensitive-data request.

Pass only when the expected contact, tags, fields, stage, enrollment, internal task, message status and suppression behavior are visible. A preference update must not restore consent. An unchanged publication ID must not send twice.

## Social Planner

API inventory currently shows these potentially relevant business pages:

- Facebook Page: `Rising Phoenix Business Services`.
- LinkedIn Page: `Rising Phoenix Business Services`.

No clearly Phoenix-owned Instagram Business account is present in the API inventory. Do not substitute `upnorth_wildman`, AI News, Nathan's personal LinkedIn profile, SOLE, TikTok or another account by assumption.

After Nathan approves account selection:

- connect `/rss/social.xml`, `/rss/tools-social.xml`, `/rss/ai-attention-social.xml`;
- include RSS descriptions;
- fetch one unique item;
- verify image, Phoenix canonical URL, GUID, metadata and clean copy;
- prove an unchanged GUID does not repost;
- keep X outside RSS automation.

## Final activation boundary

Stop with workflows draft/disabled and Social Planner inactive. Present the complete masked QA ledger. Publishing workflows, sending live email, selecting accounts and activating RSS posting each require Nathan's explicit approval.
