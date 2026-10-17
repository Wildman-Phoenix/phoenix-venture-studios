# Friday source collection repair

Production baseline c34b2c8; use the existing phoenix-rss-daily-production.yml workflow. Do not restore the deleted legacy workflow or add another collector.

- Reserve the existing Matt Wolfe, Future Tools and Friday corroboration source IDs within the eight-source research cap for Founder Tools on Detroit Fridays. Other feeds retain their existing selection.
- YouTube's native feed currently returns 404. The existing collector falls back to the configured official public channel videos page, verifies channel identity and reads video metadata. It uses no transcript, playback, cookie or private endpoint. Relative channel dates are approximate; the source date/editorial/corroboration gates continue to apply before public promotion.
- Reports expose researchSelectedIds so enabled registry sources cannot be confused with actual selected collection sources.
- An empty/held run retains a prior feed only when every item still satisfies the source-bound editorial, date and image review gate. Legacy unreviewed source notes are not restored.
- One original Phoenix briefing, based on the official October 15 Anthropic release note, is limited to the Founder Tools archive. Its body makes no Phoenix benchmark claim; source evidence and reviewer attribution are recorded in the existing manual registry. Story-specific generated Phoenix artwork is included.

Release manually with run_slot=manual. This refreshes archives while leaving social lane content alone. Compare all social payload hashes with the current live baseline before and after deployment. No newsletter/email sends, subscription/recipient changes, paid services, new credentials, or access expansion are part of this repair.

Checks: npm run rss:test includes the source/preservation regressions plus the existing engine suite; npm run rss:test:supervisor; npm run rss:test:schedule; npm run rss:validate. Then use the current production workflow's build, artifact, deployment and live parity gates. A missing optional Perplexity key remains an explicit skip; no credential is created by the repair.
