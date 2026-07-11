# Phoenix Release and Scheduler Cutover Packet

Status: `Needs you`

## Why this remains gated

The verified release candidate exists locally on `codex/phoenix-backend-release-candidate-v2`; use that branch's current HEAD recorded in the final implementation report. It is not on GitHub, so a successful run of the new manifest/parity workflow does not yet exist. The Codex RSS automation must remain active until that proof exists.

Candidate evidence:

- 257 files, about 29.15 MB; exact hashes and byte counts are in the release manifest.
- 30 currently referenced generated signal images.
- Existing shared-project invitation files preserved.
- Caches, backups, local evidence and unused generated images excluded.
- Clean `npm ci` and zero known npm vulnerabilities.
- RSS 68/68 and all backend, security, build and artifact gates passed.
- Release manifest: `/Users/nathanwildman/Documents/Codex/2026-07-10/review/outputs/phoenix-release-candidate-v2-manifest.json`.

## Release sequence

1. Use the current HEAD of scoped candidate `codex/phoenix-backend-release-candidate-v2`.
2. Push that candidate branch after Nathan approves the production release lane.
3. Review the diff and open a PR or approve the branch release path.
4. Run the GitHub `Phoenix RSS Autonomous Refresh` manually with slot `manual`.
5. Require RSS tests, schedule tests, security/backend checks, staged generation, manifest validation and deploy-artifact validation.
6. If output changed, deploy the exact manifest-backed artifact.
7. Require all six hashes to match on both `phoenixventurestudios-com.pages.dev` and `phoenixventurestudios.com`.
8. Require a generated signal page and image metadata check.
9. Only after the workflow is green, pause Codex automation `Phoenix RSS Smart Refresh`.
10. Optionally replace it with a read-only low-frequency failure monitor after separate approval.

## Rollback

- Failed generation or validation: current public RSS remains untouched.
- Failed promotion: directory swap restores the prior bundle.
- Failed Cloudflare parity: mark the run failed; do not call it Ready.
- Failed production deployment after a changed bundle: redeploy the prior recorded manifest reference.
- Do not pause the Codex RSS automation until GitHub production ownership is proven.

## Current scheduling contract

- 6:30 AM Detroit lane: refresh archives; advance Founder Market social only.
- 12:30 PM lane: refresh archives; advance Founder Tools social only.
- 6:30 PM lane: refresh archives; advance AI Attention social only.
- 12:30 AM lane: refresh archives only.
- Friday discovery lane: refresh/research only; no social advancement.

The schedule test fails if an archive is not capped at ten, a social queue is not capped at one, an unknown slot is used, or a slot advances the wrong social queue.
