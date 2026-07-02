---
name: project-igen-agent-patterns
description: igen-agent conventions for server-action validation, dedup, and single-brand v1 scope — reference when reviewing new server actions in this repo
metadata:
  type: project
---

igen-agent (Next.js 16 App Router, libSQL/Turso + Drizzle) is a single-user, single-brand v1 app (see comment at `app/actions/post.ts:248`: "Phạm vi toàn DB (v1 chỉ 1 brand)"). This shapes what counts as a real vs theoretical finding during review:

- **No cross-brand/ownership checks on `ideaId`/`postId` params** in server actions (e.g. `generateOutline`, `createEmptyPost`, `buildOutlinePrompt`, `buildCaptionPrompt`) is the established pattern, not a gap — there's only ever one brand. Don't flag missing ownership checks here unless multi-tenancy is introduced.
- **Check-then-insert dedup races** (e.g. `generateCaptionForPlatform`, mirrored by `createEmptyPost` in the 2026-07 manual-idea-prompt-copy feature) are a known, accepted TOCTOU pattern repo-wide — no unique DB constraint backs the platform-per-idea dedup. Flag only if a *new* action introduces a *novel* race, not when it mirrors an existing one.
- **Untrusted `ideaId`/`postId` passed as raw numbers** (not FormData) to server actions like `generateOutline(ideaId: number)` are not defensively validated with `Number.isInteger` — they rely on the DB query returning zero rows and a friendly "not found" message. This is consistent codebase-wide; only flag if a new action deviates by throwing raw errors instead of the friendly not-found pattern.
- **Free-text pillar fields** are intentionally not allowlisted against `brand.pillars` server-side (UI offers both a `<select>` and a free-text fallback input) — this is by design in `generateIdeas`, `buildIdeaPrompt`, and `createIdeaManual` alike.
- Prompt-builder ("copy prompt", no-API-cost) actions in this codebase are added as siblings to the real Claude-calling actions and should be checked for exact logic parity (same `toCount`/`toLength`/`toGoal`/`toOptionalText` helpers, same `xPrompt()` call signature) — see `app/actions/generate.ts` `buildIdeaPrompt`/`buildOutlinePrompt`/`buildCaptionPrompt` vs `generateIdeas`/`generateOutline`/`regenerateCaption`.
- **Asset↔post linkage is one-directional via `post.assetIds` JSON** (`app/actions/asset.ts` attachAssetToPost); the `asset.post_id` FK column exists in schema but is never written (uploadAsset inserts without it) — it's a dead column, don't assume FK-based joins for assets.
- Known pre-existing lint debt (not to re-flag as new): 4 `react-hooks/set-state-in-effect` errors in `app/editor/[postId]/caption-editor.tsx` (~lines 53/56/68) and `app/ideas/ideas-list.tsx` (~line 44). Verify via `git stash` if in doubt whether it pre-dates the current diff.
- Frontend conventions (observed 2026-07 full review): manual optimistic-state + `useTransition` instead of React 19 `useOptimistic` is the repo-wide pattern; PLATFORM color maps + STATUS_LABEL are duplicated across `app/posts/page.tsx`, `components/calendar/post-card.tsx`, `app/ideas/idea-card.tsx` (known DRY debt); `selectClass` string duplicated in 3 ideas components. Outline/caption sync after `router.refresh()` is done via remount-by-key (`key={idea.outline}`) — intentional, don't flag as bug.
