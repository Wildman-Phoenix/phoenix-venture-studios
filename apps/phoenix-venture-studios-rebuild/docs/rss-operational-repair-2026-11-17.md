# RSS coverage/alert repair — November 17, 2026

## Evidence, not assumptions
- Source base: `a5636835c92ffc918a8626d082fb9bd4be972360`.
- Latest inspected production run: 43957323993, job 133615207238, November 16, 21:10–21:12 UTC. Required deployment-secret presence checks and 70 engine tests passed. Deployment was **skipped** because output_changed=false.
- Artifact 14272368358 contains current generation reports: archive market 60 held, tools 43 held, AI 5 held, selected zero in all three. Review queue 158 includes 50 social-lane candidates; counts are not unique across lanes.
- Collection ran: market parsed 1,509 and AI parsed 1,574. All archive held-item records reported codex-image-pending; aggregate editorial-held counts are 60/42/5. This is unfinished editorial/image production, not proven missing credentials or a Swift runtime failure.
- The previous report's allFresh=true refers to **report generation**, not fresh published coverage. A technically successful empty run was misleadingly green.
- Public raw GETs from this cloud shell returned 403 for the three JSON feeds and manifest on November 17. No bypass attempted. These checks do not establish current Cloudflare deployment identity or complete live-asset parity.

## Changes
1. Add always-run operational health assessment to the existing workflow before artifact preparation. It runs without npm dependencies, writes JSON/Markdown evidence, outputs GitHub warning/error annotations and job summary. Failed/stale/missing evidence is red; empty, held or no-new-selection lanes are yellow. Nonempty items must still satisfy unchanged source/editorial/image promotion gates to count as eligible.
2. Include all independent promotion reasons and exact original URL in held-item reports. Image-only holdReason no longer conceals source-date/editorial blockers.
3. Correct the private HTML health report: zero-selection sections are attention, never fresh; image-review queue arrays reach their intended handler.
4. Add ten health regressions to rss:test. No source registry, freshness period, approval predicate, ownership policy or social publishing setting is relaxed.

GitHub annotations are **not a delivered user message**. A root-owned watchdog must read run status/artifacts and notify Nathan promptly about zero-output, missed runs (>30h), failures, specific approvals, and recovery. This patch does not claim that notification delivery is configured.

## Verification
- `npm run rss:test`: ten new health tests + existing 70 engine tests passed, plus source-repair/preservation fixtures.
- Used Node 24.22.1 in this cloud; production workflow remains pinned Node 22.23.1. Production CI on the exact patch is still required.
- Applied assessment to actual November 16 artifact: YELLOW, contentRestored=false, three empty archive lanes, 108 held archive records.
- No source/production feeds, images, dates, private approval stamps or credentials changed by the assessment. Local synthetic tests only.

## Remaining recovery gates
- Complete and approve a genuinely current, source-bound original brief and owned/licensed article-specific art. A rerun alone does not fill the review queue.
- Preserve deliberately paused social consumers. Draft preparation is not social-send approval.
- Verify current authorized Cloudflare project/deployment/rollback and complete current asset/configuration baseline; do not deploy old development output or omit generated archive/images.
- Review exact content/release scope before production publication. No main push or production deployment is included in this patch.
