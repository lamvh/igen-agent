# Journal — Content view (/posts) [post-v1 enhancement]

**Date:** 2026-06-17 · **Type:** enhancement (user request) · **Status:** Done

## Why
After v1 shipped, the user noted there was no way to **see drafted content**. Drafts (`status=draft`, no `scheduledDate`) only existed implicitly: the calendar filters `isNotNull(scheduledDate)` so it never shows them, and `/ideas` only lists ideas + a create-caption button. A draft caption, once generated, was effectively invisible until scheduled.

## What shipped
- `listAllPosts({status?, platform?})` in `app/actions/post.ts` — all posts newest-first, optional filters, with idea title + first-asset thumbnail resolved via two batched `inArray` queries (reuses the verified `listScheduledPosts` pattern, no N+1).
- `/posts` page — flat list (user's choice over drafts-only/grouped), status + platform filter chips, badges, caption snippet, thumbnail, scheduled date, click → editor. `force-dynamic` (live DB).
- Linked from dashboard nav + a "Xem nội dung đã tạo →" link on `/ideas`.

## Code review → fix applied
DONE_WITH_CONCERNS. Reviewer caught a **High** bug I introduced (B1): the filter `href()` used `next.status ?? status`, so the "Mọi trạng thái" reset chip (`{status: undefined}`) fell back to the *current* status — reset chips were no-ops, user couldn't return to unfiltered. **Lint/build/smoke all passed** because it's link-builder logic, not types or DB. Fixed with `"status" in next ? next.status : status` (distinguish "absent" from "explicitly cleared"). Also added M1 comment noting intentional whole-DB / single-brand scope.

Lesson: a smoke test on the action doesn't cover page-level URL/state logic — that class of bug needs either a UI test or careful manual trace. The reviewer's read-through caught what automated checks structurally couldn't.

## Verification
`npm run lint` clean · `npm run build` pass (/posts dynamic) · smoke test: status filter, ideaTitle/thumbnail joins, newest-first all OK · filter-reset logic re-traced by hand after fix.

## Deferred
Pagination + index when post volume grows (L2); brand-scoping when multi-brand (M1); external-URL thumbnails need next.config remotePatterns at object-storage migration (L1).
