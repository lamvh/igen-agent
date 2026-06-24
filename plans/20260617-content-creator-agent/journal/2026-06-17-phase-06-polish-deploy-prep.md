# Journal — Phase 6: Polish & Deploy Prep (v1 complete)

**Date:** 2026-06-17 · **Phase:** 6 (final) · **Status:** Completed

## What shipped
Dashboard (`/`) with live stats (ideas + posts by status) + empty state + nav to all sections. Settings (`/settings`) showing API-key status with a Claude "test key" button (tiny real call). Enriched `.env.example` + `.gitignore` `!.env.example` exception. README is now a complete run guide (install → env → migrate → dev, key-source table, deploy notes). Deploy work (auth/Postgres/object storage) documented as notes, not implemented — explicitly optional in spec.

## Key decisions
- **Keys never entered via UI** — Settings only reads `.env.local` status and tests; no key input field (avoids persisting/leaking secrets). Test is a real but cheap (`max_tokens:8`) Claude ping.
- **Gemini: status only, no test** — image gen is a stub, so there's nothing to call.
- **Deploy = docs, not code** — scope said "làm khi quyết định deploy"; README's Deploy section lists the three real changes (Postgres driver, R2/S3 for uploads, auth) without scaffolding them.

## Friction / notes
- **The build caught a stale-data bug.** Pages reading live DB/env (`/`, `/settings`, `/brand`, `/ideas`, `/assets`) were being **statically prerendered** (Next 16 default), so they'd freeze build-time data. Mutations revalidate some paths but `/` and `/settings` had no revalidation coverage at all. Fix: `export const dynamic = "force-dynamic"` on all five (verified the directive in Next 16 docs; `/calendar` + `/editor` were already dynamic via awaited searchParams/params). Build output confirms every data route is now `ƒ`. This is the most important correctness fix of the phase — and it only surfaced because I read the route-rendering table in the build output instead of trusting "it compiled."
- **Polish miss caught in review**: root `layout.tsx` still had the `"Create Next App"` scaffold title and `lang="en"` on a Vietnamese app. Fixed both (title template + `lang="vi"`).

## Code review → fixes applied
DONE_WITH_CONCERNS (no Critical/High/Medium; all 4 criteria met; force-dynamic coverage + security boundary verified clean). Applied both Low items: layout metadata/lang, and `testClaudeKey` status-based error messages (401/403 = bad key vs 429/5xx = transient).

## Verification
`npm run lint` clean · `npm run build` pass (all data routes dynamic, only `/_not-found` static) · smoke test: dashboard stat counts correct against seeded data.

## v1 retrospective (6 phases)
Recurring theme: this non-standard Next.js 16 had several behaviors that differ from training-data assumptions, each caught empirically rather than guessed —
1. `params`/`searchParams` are Promises (await them).
2. `'use server'` files may export only async functions (Phase 4 — moved consts to lib/).
3. Server-action body limit defaults to 1MB (Phase 5 — raised to 6mb for uploads).
4. Live-data pages prerender static unless forced dynamic (Phase 6).
The discipline of reading `node_modules/next/dist/docs` (per AGENTS.md) + checking the build's route table paid off repeatedly. Drizzle + better-sqlite3 synchronous transactions and local-date handling were the other two areas that needed runtime verification, not assumption.

## Future (out of v1 scope)
Real Gemini image generation; Better Auth; SQLite→Postgres; object storage for uploads; automated test suite.
