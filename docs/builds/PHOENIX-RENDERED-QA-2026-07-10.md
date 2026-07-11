# Phoenix Rendered QA Evidence

Status: `Ready` for the backend release surface reviewed here. Katalyst workflow and Social Planner UI review remains separate and requires Nathan's logged-in Chrome profile.

## Approved target and method

- Target: local production build served from the clean Phoenix release worktree.
- Browser: Codex in-app browser; Nathan's Chrome profile was not used.
- Scope: rendered verification only. No forms were submitted and no CRM, email, social, or production data was changed.
- Live-site verification remains covered by the release audit's independent HTTP, metadata, content-type, manifest, and hash checks.

## Desktop verification

Viewport: 1440 by 900.

Routes checked:

- `/`
- `/founder-signal`
- `/market-intelligence`
- `/funding`
- `/studio`
- `/snapshot`
- `/about`
- `/contact`
- `/founder-signal/preferences`
- `/unsubscribe`
- `/privacy`
- `/terms`

Every route passed:

- expected unique page title and primary heading;
- main content landmark present;
- no horizontal overflow;
- no rendered images missing alternative text;
- no browser console errors;
- expected forms present on form routes.

## Mobile verification

Viewport: 390 by 844.

Routes checked:

- `/`
- `/founder-signal`
- `/snapshot`
- `/contact`
- `/founder-signal/preferences`
- `/unsubscribe`

Every route passed:

- expected title and primary heading;
- no horizontal overflow;
- no rendered images missing alternative text;
- no browser console errors;
- expected forms and controls remained visible and usable at the viewport level.

## Visual signoff

- Desktop homepage: header, hero, primary call to action, portrait panel, spacing, readability, and clipping reviewed successfully.
- Mobile unsubscribe: mobile header, field, submit control, spacing, readability, and clipping reviewed successfully.
- A full-page capture was rejected because the capture tool repeated sticky content while stitching. Viewport captures were used for visual evidence; this was a capture limitation, not a rendered-site defect.

Evidence files:

- `docs/builds/qa-evidence/phoenix-desktop-home.jpg`
- `docs/builds/qa-evidence/phoenix-mobile-unsubscribe.jpg`

## Approval boundary

This evidence completes the local rendered QA gate for the backend release. It does not approve or activate Katalyst workflows, marketing email, Social Planner RSS publishing, production form submissions, or creative changes.
