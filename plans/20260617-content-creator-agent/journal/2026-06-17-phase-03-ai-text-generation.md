# Journal — Phase 3: AI Text Generation

**Date:** 2026-06-17 · **Phase:** 3 (AI Text Generation) · **Status:** Completed

## What shipped
Claude-powered content generation. `/ideas` generates ~6 Vietnamese idea titles per pillar+platform (saved to `idea`); "Tạo caption" generates per-platform captions (FB/IG/TikTok) for an idea as 3 draft `post` rows, then redirects to `/editor/[postId]`. Caption editor edits caption + hashtags with a platform switcher. All Claude calls in server actions — key never reaches client. Graceful degradation when `ANTHROPIC_API_KEY` is absent (generate UI hidden, manual caption entry still works).

## Key decisions
- **Structured outputs over prompt-and-parse**: `messages.parse()` + `zodOutputFormat(schema)` (zod v4) for both idea list and caption — directly kills the phase's "Claude output không đúng JSON" risk. `parsed_output` null-safe everywhere.
- **Model/params per claude-api skill**: `claude-opus-4-8`, `output_config.effort: "medium"`, `max_tokens: 2048`. Opus 4.8 is adaptive-only — no `temperature`/`top_p`/`budget_tokens` (they 400), so none used.
- **One post per platform** (user decision): 3 draft posts per idea, fits the single platform+caption-per-row schema cleanly.
- **Idea-driven flow only** (user decision): posts created via generateCaption, no standalone blank-post path.

## Friction / notes
- **`.ckignore` carry-over**: the `!node_modules` allow-rule (added Phase 2 so I could read Next 16 docs) was still in place — used it to verify SDK type defs (`messages.parse`, `zodOutputFormat` imports `zod/v4`, `db.transaction` sync API) directly rather than guessing. Worth deciding whether to keep it for remaining phases.
- **Next 16 dynamic params are a Promise** — `await params` in `/editor/[postId]`. Verified in docs, not assumed.
- **redirect() must stay outside try/catch** — `redirect()` throws `NEXT_REDIRECT` control-flow; catching it would swallow the navigation. Code review confirmed placement correct.

## Code review → fixes applied
DONE_WITH_CONCERNS (no Critical; all 4 acceptance criteria + 8 focus items verified). Applied:
- **H1 (atomicity)**: original loop inserted one post per Claude call → a mid-loop timeout left orphan posts. Refactored to resolve all 3 captions (`Promise.all`) then insert in one synchronous `db.transaction`. Verified at runtime.
- **H2 (trust boundary)**: replaced `as Platform` cast with `PLATFORMS.includes` validation — server actions are public endpoints.
- **M3**: prompt-injection trust-boundary comment for future multi-tenant.

## Verification
`npm run lint` clean · `npm run build` pass (TS clean, /ideas static, /editor/[postId] dynamic) · smoke test: idea/post/sibling/saveCaption data layer + Drizzle sync transaction multi-insert all OK.

## Deferred (YAGNI for local v1)
Automated tests; `idea.platform` is informational only (generateCaption always does 3 platforms by design); bump caption max_tokens if FB truncates.

## Next
Phase 4 — Content Calendar (scheduledDate on posts; no CSV/ICS export in v1).
