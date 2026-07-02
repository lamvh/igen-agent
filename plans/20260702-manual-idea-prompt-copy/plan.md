---
title: Manual Idea Save + Copy-Prompt + Website/Blog Platform
description: 'Use the app with zero token cost: save ideas manually, copy Claude-ready prompts, create empty drafts, and add a Website/Blog platform.'
status: completed
priority: P2
branch: ''
tags: [no-api, prompt-copy, blog-platform, ideas, editor]
blockedBy: []
blocks: []
created: '2026-07-02'
createdBy: 'ck:plan'
source: skill
---

# Manual Idea Save + Copy-Prompt + Website/Blog Platform

## Overview

Make the app usable **without `ANTHROPIC_API_KEY`** and **without spending tokens**:
1. Save ideas manually (no Claude call).
2. Export the exact `*Prompt` strings the API uses so the user can paste them into the Claude app and paste results back (reusing existing outline/caption textareas).
3. Create empty draft posts to paste externally-generated captions into.
4. Add a **Website/Blog** platform alongside Facebook/Instagram/TikTok.

**Source of truth:** [`docs/superpowers/specs/2026-07-02-manual-idea-save-and-prompt-copy-design.md`](../../docs/superpowers/specs/2026-07-02-manual-idea-save-and-prompt-copy-design.md)

**Principles:** KISS / YAGNI / DRY. No DB schema change, no migration. Reuse existing components (`CopyButton`, `OutlineEditor`, `CaptionEditor`, `saveIdeaOutline`, `saveCaption`) and pure prompt builders (`ideaPrompt`, `outlinePrompt`, `captionPrompt`).

**Stack:** Next.js 16 (App Router, RSC + server actions) · libSQL/Turso + Drizzle · Tailwind + shadcn/ui · `@anthropic-ai/sdk`.

## Phases

| Phase | Name | Status | Effort |
|-------|------|--------|--------|
| 1 | [Blog platform foundation](./phase-01-blog-platform-foundation.md) | completed | 2h |
| 2 | [Manual idea creation](./phase-02-manual-idea-creation.md) | completed | 1.5h |
| 3 | [Build-prompt actions + copy buttons](./phase-03-build-prompt-copy.md) | completed | 3h |
| 4 | [Manual empty draft post](./phase-04-manual-empty-post.md) | completed | 1.5h |

## Dependencies

- **Order: 1 → 2 → 3 → 4** (sequential recommended).
- Phase 1 first: adds `"blog"` to `Platform`; TypeScript then forces every `Record<Platform,…>` site to add the case (build-time scaffolding).
- Phase 3 `buildCaptionPrompt` needs `PLATFORM_RULES.blog` (Phase 1) for correct blog prompts.
- Phase 4 `createEmptyPost(ideaId, "blog")` needs `"blog"` in `PLATFORMS` (Phase 1).

**Shared-file constraints (must run sequentially, not parallel):**
- `app/actions/post.ts` — edited in Phase 2 (`createIdeaManual`) **and** Phase 4 (`createEmptyPost`).
- `app/ideas/idea-card.tsx` — edited in Phase 1 (`PLATFORM_BADGE.blog`) **and** Phase 3 (outline copy button).

## Key Cross-Cutting Decisions

1. **Copy-prompt = API-prompt.** Build-prompt actions reuse the same `*Prompt` builders as the API paths, so pasted prompts are byte-identical to what the API sends. No prompt logic in the client bundle; no brand data leaks to client.
2. **Build-prompt actions never touch Claude.** No `getClaudeClient`, no `hasApiKey` gate, no `logUsage`. Only `getBrand` + DB read. Missing brand → friendly `{success:false}`.
3. **Shared `CopyPromptButton`** client component (new) wraps the pending/error/result+`CopyButton` UX for all 3 copy sites (idea/outline/caption) — DRY.
4. **AI generator fields ungated for display.** The idea copy-prompt needs the generator's option fields (count/length/goal/target/tone) to render without a key; only the API submit button + no-key hint stay gated. See Phase 3 open question.

## Verification (no test runner)

- `npm run lint` (`eslint`) + `npx next build` (TypeScript enforces `Record<Platform,…>` completeness).
- Manual QA checklist per phase, run twice: with and without `ANTHROPIC_API_KEY`.

## Out of Scope (YAGNI)

Image-prompt copy button (Gemini); auto-parse of pasted Claude JSON; dedicated blog title column.

## Open Questions

- ~~AI generator gate reinterpretation~~ — resolved (see Phase 3). Rendering option fields always, gating only the submit button.

## Post-Implementation Notes

- All 4 phases implemented, `npx next build` clean, `code-reviewer` subagent run — no Critical/High/Medium findings. One Low-priority suggestion (cap `idea.title` length in `createIdeaManual`) applied.
- `npm run lint` reports 4 pre-existing `react-hooks/set-state-in-effect` errors in `caption-editor.tsx`/`ideas-list.tsx`, verified via `git stash` to predate this work — out of scope, not fixed.
- README.md updated to document the blog platform and no-API-key flows (manual idea save, copy-prompt, empty draft).
- Not committed — per global "no branch/commit unless explicitly asked" rule, changes remain in the working tree for the user to review and commit.
