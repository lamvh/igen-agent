# Journal — Phase 5: Asset Library

**Date:** 2026-06-17 · **Phase:** 5 (Asset Library) · **Status:** Completed

## What shipped
Manual image library at `/assets`: upload (PNG/JPG/WebP/GIF, ≤5MB) to `public/uploads/`, grid view. In the caption editor, an asset picker toggles images onto a post (`post.assetIds`); the calendar post-card shows the first attached image as a thumbnail. AI image generation (Gemini/Nano Banana) is a throwing stub gated on `GEMINI_API_KEY` with a disabled button + hint — deferred per spec until a key exists.

## Key decisions
- **Safe filesystem path**: filename is `randomUUID() + ext`, where `ext` comes from a MIME whitelist map — no user-controlled string ever reaches the FS path (path-traversal-proof).
- **assetIds as the attachment model** (JSON number[] on post, toggled), not `asset.postId` — supports many assets per post, reuses existing JSON helpers.
- **Thumbnail batched, not N+1**: `listScheduledPosts` collects all first-asset IDs and resolves them in one `inArray` query.
- **next/image `unoptimized`** for local `/uploads` paths — same-origin static, no `remotePatterns` needed.
- **AI gen stub**: `generateImage` throws (missing key → guidance; with key → not-implemented). Honors the spec's "declare but disable" intent without faking functionality.

## Friction / notes
- **Next 16 default server-action body limit is 1MB** — caught by code review (not the build, since it's a runtime framework limit). My form advertises 5MB, so 1-5MB uploads would have failed silently at the framework layer. Fixed with `experimental.serverActions.bodySizeLimit: "6mb"` in next.config.ts, verified against the in-repo Next docs (`serverActions.md` confirms 1MB default + `experimental.serverActions` shape). This is exactly the kind of version-specific gotcha AGENTS.md warns about — the docs-read habit paid off again.

## Code review → fix applied
DONE_WITH_CONCERNS (no Critical/High; all acceptance criteria met; upload path confirmed traversal-safe). Applied **L1** (bodySizeLimit). Deferred (reviewer-confirmed acceptable for local single-user v1): M1 picker prop-resync, M2 asset-existence check, M3 orphan-file cleanup / asset-delete (→ Phase 6 object storage), L2 magic-byte MIME sniff.

## Verification
`npm run lint` clean · `npm run build` pass (/assets static) · smoke test: upload file-write (mkdir+writeFile → /uploads/<uuid>, cleanup leaves .gitkeep), asset insert/list/attach-toggle, thumbnail resolution all OK.

## Deferred (YAGNI / Phase 6)
Object storage migration (public/uploads is ephemeral on serverless); asset delete + orphan GC; real Gemini image gen when key available; automated tests.

## Next
Phase 6 — Polish & Deploy Prep (object storage note, env/deploy docs, final polish).
