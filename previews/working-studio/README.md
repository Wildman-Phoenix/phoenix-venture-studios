# The Working Studio — Phoenix Venture Studios

Standalone participant-workspace prototype, created 2026-11-12.

## Scope

Companion to Raven's separately owned offer page, QR, and slide. This workspace helps a participant define one real task, prepare bot/dot instructions, review a test, and record a use plan. It does not create a bot, connect an account, make API requests, book sessions, or accept payment.

No price or session duration is presented as finalized. PVS working palette informed the design; brand approval and original logo provenance are not asserted. The app uses a text wordmark and local Georgia/Arial font fallbacks, so no remote font or asset is required.

## Open locally

Open index.html directly in a current browser, or from the repository root:

```sh
python3 -m http.server 4173 --bind 127.0.0.1 --directory previews/working-studio
```

Then open http://127.0.0.1:4173 in that browser. This command was not run in the authoring session because no execution environment was available.

## Behavior

- Four tasks: meeting follow-up, research brief, weekly planning, custom.
- Goal/input/output validation; task-specific instruction template.
- Preferred tool can be Grok bot, a dot, another assistant, or decide together.
- Explicit participant acknowledgment before entering the test stage.
- Test result and all three review checks required before marking passed.
- Editing the test result resets prior review checks.
- Editing the brief preserves saved evidence and warns that draft changes are pending; later chapters are unavailable until the draft is reverted or rebuilt.
- Submitting an unchanged brief preserves its reviewed result, notes, use plan, checks, and milestones.
- Rebuilding a materially changed brief archives the earlier instructions and all evidence, then starts a fresh review for the new version. Earlier briefs remain visible and are included in saved-work exports.
- Copy includes a selectable-text fallback when clipboard access fails.
- Download exports a plain-text instruction sheet or complete field guide.
- New-brief confirmation protects against accidental in-tab reset.
- Progress counts recorded participant milestones, not automatic proof.
- In-memory state only. Refreshing or leaving clears it; export is available.
- Responsive layouts, visible focus, native form controls, live status, skip link, reduced motion support are implemented but browser QA remains blocked.

## Verification

14 core logic assertions passed in the available JavaScript execution tool, plus complete script syntax validation and static ID-uniqueness check. These are not browser tests. See design-qa.md for the exact blocked checks.

The evidence-preservation fix adds 12 regression cases against the actual source submit and input/change handlers with a minimal DOM harness. The original version fails the unchanged-submit case; the revised version passes all 12 cases. These ran in the available JavaScript execution tool, not Chromium. To reproduce with Node:

```sh
node previews/working-studio/test-brief-regression.mjs
```

The original prototype remains in Git history at commit `93edf8fae47764b29fd9b41c3073d962d8490071`.

No audio, video, or speech feature is implemented. No audio playback/recording or speech interaction audit has been performed.

## Preview deployment

Intended destination: a NEW /working-studio/ subpath on the existing previews.phoenixventurestudios.com hub. This destination is proposed, not deployed or verified.

The existing repo scripts inspected:
- apps/phoenix-venture-studios-rebuild/scripts/preview/publish-preview-app.mjs
- apps/phoenix-venture-studios-rebuild/scripts/preview/ensure-preview-routes.mjs

The former stages into an existing output/phoenix-previews-upload tree and preserves hub entries. It is not a verified deploy command for this standalone prototype. The guard restricts Functions to /api/* and writes noindex/robots rules.

To finish through the authorized workflow:
1. Recover the PVS Cloudflare preview skill and CURRENT complete hub artifact.
2. Add only working-studio/index.html to that artifact; preserve all sibling routes, assets, headers, Functions, and redirects.
3. Do not deploy this single folder as the whole phoenix-previews project: it could replace other previews.
4. Run desktop/mobile/browser QA, keyboard and copy/download checks.
5. Use the existing authenticated preview publishing route only.
6. Verify the new URL and existing sibling previews after publication.

No production or default-branch files were changed. No credentials, access settings, custom domains, payment items, or Cloudflare resources were created or modified.

## Review artifact

Private Page containing the HTML prototype:
https://chatgpt.com/space/page_27cac29378288191b2d6b7df53c62acc

This Page is not a Cloudflare deployment. Rendering and interactions in the Page sandbox have not been visually verified.
