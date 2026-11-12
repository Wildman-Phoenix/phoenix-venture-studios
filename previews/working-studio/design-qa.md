# Design QA — The Working Studio

final result: blocked

## Visual target

Generated concept board displayed in the authoring conversation: desktop and mobile portrait views, cream editorial workspace, numbered chapter rail, navy workbench. Implementation uses four consistent stages; the concept image's extra fifth chapter was removed. Generated image is a concept, not an implementation screenshot.

## Completed checks

- 14 core assertions executed successfully: valid/default input; missing and whitespace-only fields; task-specific factual/source/time-budget rules; literal text preservation in exported instructions; empty test rejection; incomplete review rejection; accepted completed review; zero/full progress; export status fidelity.
- Entire embedded JavaScript parsed successfully with new Function.
- Static HTML IDs checked for uniqueness.
- Source reviewed for escaping user-entered text before innerHTML.
- No external JavaScript, libraries, fonts, runtime API calls, or backend dependencies.
- Changing a test result clears previous review checkmarks.
- Mobile reset is available in the footer; the desktop rail control is also present.
- Current repo workflow triggers inspected before creating the isolated branch. No workflow was dispatched.
- Private Page embed insertion confirmed by edit receipt.

## Blocked verification

No usable execution environment was available; exec_command returned: "No usable execution environment is available. Wait for an environment to become available before using this tool."
No cloud-browser tool was available in the active tool catalog.

Therefore none of these are claimed passed:
- Desktop 1440x1000 and mobile 390x844 rendering.
- Narrow 320px, tablet, landscape, and 200% zoom layout.
- Rendered comparison against the visual target.
- Actual browser console checks.
- Keyboard traversal, dialog focus return, radio behavior, and focus after chapter changes.
- Full define → prepare → test → use flow in a browser.
- Clipboard success/denial and download behavior.
- Page sandbox rendering/capability behavior.
- Cloudflare preview deployment or live URL/sibling-route checks.

## Remaining completion steps

Run the browser checks above in an available environment, fix material issues, capture desktop/mobile screenshots, and update this report with evidence. Recover the existing PVS preview skill and full hub deployment artifact, publish through its authenticated preview-only route, then verify the new subpath and preserved sibling previews.

No auto-review denial occurred. Deployment was not attempted.

## Evidence-preservation repair — 2026-11-12

Independent review found that unchanged submitBrief() cleared the result, notes, routine, and passed state. The same regression was reproduced against the original source in the new handler harness.

Fixed behavior:
- Unchanged and trim-equivalent submissions preserve all downstream evidence and milestones.
- Draft input and task-selection events retain saved work and display a persistent pending-change warning.
- Reverting a draft restores the prior passed-state navigation.
- A materially changed brief archives its prior instructions, reviewed result, notes, routine, and an independent copy of review checks. New-version review starts fresh.
- Earlier evidence remains viewable and is included in copy/download exports.
- Explicit Start a new brief remains destructive only after its confirmation, now naming earlier versions too.

Verification: all 12 cases in test-brief-regression.mjs passed using the available JavaScript execution tool. Tests extract the current embedded script and call the actual submitBrief(), bind() input/change callbacks, canVisit(), exportBrief(), and renderHistory(). Navigation/render and announcements are stubbed; this is a handler regression test, NOT a browser test. Full script syntax validation passed. The original version fails the first unchanged-submit case.

Original source preserved at commit 93edf8fae47764b29fd9b41c3073d962d8490071. No history rewrite or production deployment.

## Parent/reviewer visual audit handoff

The independent reviewer reports local Chromium socket denial and a sign-in barrier on the private Page. This session still reports no usable execution environment. Visual/interaction QA therefore remains blocked, not passed.

When a browser is available, check desktop and mobile:
1. Complete a brief, prepared acknowledgment, passed test, notes, and saved use plan.
2. Revisit Define and submit unchanged. Confirm the result, notes, plan, checks, and milestones remain.
3. Type a change; confirm the persistent warning and retained saved-work export. Revert it; confirm prior progress returns.
4. Submit a real change. Confirm Earlier briefs shows the old evidence and the new version requires a fresh acknowledgment and test.
5. Copy/download saved work and inspect both current and earlier records.
6. Verify focus, keyboard operation, mobile details expansion, and status messages.

## Audio scope

No audio, video, recording, playback, or speech implementation exists. No audio audit was performed. This review covers source/handler behavior only; it must not be described as audio verification.
