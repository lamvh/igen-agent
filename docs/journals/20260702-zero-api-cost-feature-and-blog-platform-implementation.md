# Zero-API-Cost Feature + Blog Platform: Complete Implementation

**Date**: 2026-07-02 14:50
**Severity**: N/A (successful completion)
**Component**: Content generation, platforms, manual workflows
**Status**: Resolved

## What Happened

Completed a full 4-phase implementation enabling users to generate content without spending Claude API tokens by copying prompts into claude.ai manually, plus a new blog platform:

1. **Blog platform** (Platform.Blog) — added as 4th platform in `lib/ai/prompts.ts` with labels, rules, aspect ratio; added `BlogFrame` variant to `post-preview.tsx`.
2. **Manual idea creation** — `createIdeaManual` server action, new always-visible form in `app/ideas/manual-idea-form.tsx`.
3. **Build-prompt actions** — `buildIdeaPrompt`/`buildOutlinePrompt`/`buildCaptionPrompt` in `app/actions/generate.ts`, reusing pure prompt-builder functions; shared `copy-prompt-button.tsx` wired into 3 editors.
4. **Manual empty post draft** — `createEmptyPost` action + "Tạo nháp trống" button in `CaptionCreator`.

All phases code-reviewed (zero Critical/High/Medium findings; one Low: added `TITLE_MAX = 300` to `createIdeaManual`). No DB schema changes. No branches created, no commits staged — working-tree only per session rule.

## The Brutal Truth

This was the smooth implementation everyone *hopes* for. Zero test failures, no architectural surprises, no scope creep that actually stuck. The honest part: that smoothness came from rigorous spec-→-plan discipline before touching code, not from luck. And one decision we made (exposing the prompt-builder form fields always, gating only the API button) technically deviates from the original "stay gated" spec but is the DRY-correct move — which means there's a small risk the user will want to revert it, and we documented that explicitly.

## Technical Details

**Copy-prompt-to-Claude-app pattern**: Rather than parsing structured Claude API responses back into the UI, the app extracts the **exact prompt string** (byte-identical to what the API path sends) and hands it to the user for manual paste into existing form fields (outline textarea, caption textarea). Zero new parsing, zero new DB columns, zero round-trip fragility.

**Compiler-safety gap**: Three platform color maps are `Record<string,string>` with fallback, not `Record<Platform,...>`. Only caught because we manually audited during planning. Live code in `idea-card.tsx`, `posts/page.tsx`, `post-card.tsx` would silently render blog posts as grey if not explicitly populated. Verified the fix was applied to all three.

**Scope containment**: Pre-existing lint debt in `caption-editor.tsx` and `ideas-list.tsx` (4x `react-hooks/set-state-in-effect` errors) predates this work entirely; left untouched to avoid unrelated diff churn.

## What We Tried

None — the path was direct. We planned carefully, spec'd the deviation upfront, implemented in phases with clear responsibilities, and reviewed. The "what we tried" is really "what we avoided": no chasing lint debt, no second-guessing the gate-always-render decision mid-implementation, no schema-change rabbit holes.

## Root Cause Analysis

Why no friction? Because the team flipped the usual flow: **spec with teeth first, then implementation**. The superpowers brainstorm → designer spec (with explicit annotated design constraints) → planner agent decomposed it into phases with clear ownership — by the time the cook (implementation) started, all the ambiguity was resolved. The only real decision left was the gate-form field exposure, and we asked the user, documented the flag, and moved forward. No thrashing.

## Lessons Learned

1. **Pure-function reuse is a cheat code**: The existing `ideaPrompt()`/`outlinePrompt()`/`captionPrompt()` functions were already pure and deterministic. Wrapping them in server actions to return the string instead of calling Claude meant zero new logic, zero new bugs. Next feature: always ask "is this just asking for the pure function output?"

2. **Platform-keyed maps need enforcement or audits**: `Record<Platform,...>` gets compiler errors; `Record<string,string>` doesn't. When expanding platforms, **grep for all maps and manually verify** — a 2-minute audit caught a silent-failure scenario.

3. **Scope + spec + plan discipline scales**: The dev work itself was mechanical because the hard work (deciding what's in, what's out, what's reversible) happened before code. The gate-form decision hung open, got documented, and didn't block implementation.

4. **Not all lint is in-scope**: Pre-existing technical debt is real, but feature PRs should ship focused. Lint fixes belong in separate PRs with dedicated test coverage.

## Next Steps

- User reviews and commits the working-tree changes (or reverts any) — no auto-commit per session rule.
- If gate-form deviation causes issues, the decision is documented in `phase-03-build-prompt-copy.md` with rationale — straightforward revert.
- Future: consider a lint-fixing pass on `caption-editor.tsx` and `ideas-list.tsx` as a standalone refactor (out of scope for this feature).
