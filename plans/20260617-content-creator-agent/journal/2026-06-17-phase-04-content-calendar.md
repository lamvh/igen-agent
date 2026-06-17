# Journal — Phase 4: Content Calendar

**Date:** 2026-06-17 · **Phase:** 4 (Content Calendar) · **Status:** Completed

## What shipped
Month-view content calendar at `/calendar`. Posts with a `scheduledDate` render on their day; month nav (←/→ via `?y=&m=`), platform filter (`?platform=`), per-card status change (draft→scheduled→posted) and copy caption+hashtags to clipboard. Editor (`/editor/[postId]`) gains a date picker (`schedule-control.tsx`) that sets `scheduledDate` + status. Manual posting only — no auto-post.

## Key decisions
- **No date-fns** (KISS): a month grid doesn't justify a dependency. `lib/date.ts` standardizes on **local time** across store/query/render — the discipline that makes the timezone story correct. VN has no DST, so no edge cases in practice.
- **No drag-drop**: spec marked it optional ("only if time") — deferred.
- **6-week Monday-start grid**: `(getDay()+6)%7` offset; 6 weeks always cover any month layout. Spillover cells from adjacent months are empty by construction (the month-range query only fetches in-month posts).

## Friction / notes
- **Next 16 `'use server'` export rule** — the build failed with `invalid-use-server-value` because `app/actions/calendar.ts` exported a runtime const (`POST_STATUSES`) that a client component imported. A `'use server'` file may export **only async functions**. Fix: moved the const + types to `lib/post-status.ts`; client components import the value from there, the async actions from `calendar.ts`. (`export type` is erased at compile, so it never violated the rule — Phase 3's type exports were fine; the runtime value was the trigger.) This is the kind of version-drift breakage AGENTS.md warned about — caught by the build, not assumed.
- **Local-date round-trip verified empirically**: a post scheduled to local June 20 stores as a unix timestamp, round-trips through Drizzle, and `dateKey(new Date(...))` extracts the correct local Y-M-D for both the month-range filter and the grid cell.

## Code review → fixes applied
DONE_WITH_CONCERNS (no Critical; all 4 acceptance criteria + `'use server'` cleanliness verified). Applied:
- **H1**: clipboard copy now optional-chains `navigator.clipboard` + `.catch` + fallback message (insecure-origin / LAN-HTTP-from-phone is a real path for a local tool).
- **M1**: reject empty `?y=`/`?m=` (`Number("")===0` would render a year-0 blank calendar) — positive-integer guard.
- **M2**: post-card surfaces `updatePostStatus` failure instead of the controlled select silently lying.
- **M3**: schedule/status actions also `revalidatePath('/editor/[postId]')`.

## Verification
`npm run lint` clean · `npm run build` pass (/calendar + /editor dynamic, others static) · smoke test: schedule → in-month query, status change persists, unschedule removes, local-date round-trip all OK.

## Deferred (YAGNI for local v1)
Drag-drop reschedule; action existence checks (L1); strict date-overflow rejection (L2); automated tests.

## Next
Phase 5 — Asset Library (manual image upload; AI image gen deferred until GEMINI_API_KEY).
