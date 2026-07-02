---
phase: 4
title: "Manual empty draft post"
status: completed
priority: P1
effort: "1.5h"
dependencies: [1, 3]
---

# Phase 4: Manual empty draft post

## Context Links
- Spec §4 "Lưu caption từ nguồn ngoài (không API)".
- `app/actions/generate.ts:375-416` (`generateCaptionForPlatform` — dedup pattern to reuse) and `:350-367` (`generateCaption` — redirect pattern).
- `app/actions/post.ts` (will add `createEmptyPost`).
- `app/ideas/idea-actions.tsx:35` (`CaptionCreator` — where to add the "Tạo nháp trống" control).
- `db/schema.ts:59-73` (`post` table: `caption` default `""`, `status` default `"draft"`).

## Overview
- **Priority:** P1.
- **Status:** pending.
- Add a "Tạo nháp trống" (create empty draft) control so users can make a `post` row with an empty caption **without any API call**, then paste externally-generated content (from Phase 3 copy-prompt flow) into the existing caption textarea and save via `saveCaption`.

## Key Insights
- **The only path that creates a post today is API** (`generateCaption`, `generateCaptionForPlatform`). Without a key, users cannot reach `/editor/[postId]`. This phase unblocks the paste-back loop.
- **Reuse the dedup check** from `generateCaptionForPlatform:391-396` verbatim: `and(eq(post.ideaId,ideaId), eq(post.platform,platform))` → block if a post for that platform already exists.
- **Platform validation:** reuse `PLATFORMS.includes(platform)` guard (`generateCaptionForPlatform:382`). After Phase 1, `"blog"` is valid → users can create empty blog drafts.
- **Navigation:** the panel control is client-side (`CaptionCreator` uses `useTransition`, `idea-actions.tsx:39`). Two viable patterns:
  - (A) server-side `redirect(\`/editor/\${id}\`)` like `generateCaption:367` — throws-to-redirect inside the transition (proven to work in `CaptionCreator.onCreate`).
  - (B) return `{success,message,postId?}` and client `router.push`.
  - **Recommend (B)** — cleaner error surfacing for an always-visible control and avoids redirect-in-transition edge cases; requires importing `useRouter` in `idea-actions.tsx`.
- `CaptionCreator` currently only renders inside `hasApiKey && (...)` in `idea-card.tsx:388-395`. The empty-draft control must be visible **without** a key. Move the "Tạo nháp trống" block so it renders regardless of key (either always-render `CaptionCreator` with the API "Tạo caption" button gated internally, or render the empty-draft control as a sibling that is always shown). Recommend: always render `CaptionCreator`; gate only its API "Tạo caption" button by a `hasApiKey` prop.

## Requirements
- Functional: pick a platform (incl. blog) → create an empty draft → land in `/editor/[postId]`; paste + "Lưu caption" works (existing path). No API key needed.
- Non-functional: no token cost; block duplicate platform per idea; validate platform.

## Architecture
Data flow: `CaptionCreator` (platform select + "Tạo nháp trống" button) → `createEmptyPost(ideaId, platform)` → validate platform + dedup → `db.insert(post){ideaId, platform, caption:"", status:"draft"}` returning id → `{success, message, postId}` → client `router.push('/editor/'+postId)`. In editor, existing `CaptionEditor` textarea + `saveCaption` handle paste-back; Phase 3 caption copy-prompt button provides the prompt.

Signature: `createEmptyPost(ideaId: number, platform: Platform): Promise<{success:boolean;message:string;postId?:number}>`.

## Related Code Files
**Modify**
- `app/actions/post.ts` — add `createEmptyPost`. *(Shared with Phase 2 — sequential.)* Needs imports: `PLATFORMS`, `type Platform` (from `@/lib/ai/prompts`), `and` (already imported), `post` (already imported).
- `app/ideas/idea-actions.tsx` — add "Tạo nháp trống" control in `CaptionCreator` (always visible); `useRouter().push` on success; add `hasApiKey` prop to gate the existing API "Tạo caption" button.
- `app/ideas/idea-card.tsx` — pass `hasApiKey` to `CaptionCreator` and render it ungated (remove/adjust the `hasApiKey && (…)` wrapper at `:388`). *(Shared with Phases 1 & 3 — sequential.)*

**Create** — none (reuses editor + `saveCaption`).
**Delete** — none.

## Implementation Steps
1. `app/actions/post.ts`: add
   ```ts
   export async function createEmptyPost(
     ideaId: number, platform: Platform,
   ): Promise<{ success: boolean; message: string; postId?: number }> { … }
   ```
   - Validate `ideaId` integer > 0; `if(!PLATFORMS.includes(platform)) return {success:false,message:"Nền tảng không hợp lệ."}`.
   - Confirm idea exists: `db.select().from(idea).where(eq(idea.id,ideaId)).limit(1)` → not found error.
   - Dedup: `db.select({id:post.id}).from(post).where(and(eq(post.ideaId,ideaId),eq(post.platform,platform))).limit(1)` → if exists `{success:false,message:"Nền tảng này đã có nội dung."}`.
   - Insert: `const ids = await db.insert(post).values({ ideaId, platform, caption:"", status:"draft" }).returning({id:post.id});` → `const postId = ids[0]?.id;` guard null.
   - `revalidatePath("/ideas");` `return {success:true, message:"Đã tạo nháp.", postId};`.
2. `app/ideas/idea-actions.tsx`: in `CaptionCreator`, add `hasApiKey` prop. Keep the platform `<select>` (reuse existing state). Add a second button "Tạo nháp trống" (always visible) that calls `createEmptyPost(ideaId, platform)` in `start(async…)`; on `res.success && res.postId` → `router.push('/editor/'+res.postId)`, else `setError`. Gate the existing API "Tạo caption" button (and length select requirement) behind `hasApiKey`. Empty-draft only requires platform (not length).
3. `app/ideas/idea-card.tsx`: render `<CaptionCreator ideaId={idea.id} hasApiKey={hasApiKey} />` **ungated** (so empty-draft shows without a key); the "Tạo nội dung" section header can stay, but drop the `hasApiKey &&` wrapper around `CaptionCreator` at `:388`.
4. `npm run lint` + `npx next build`.

## Todo List
- [x] `createEmptyPost` (platform validate + idea exists + dedup + insert returning id)
- [x] `CaptionCreator`: always-visible "Tạo nháp trống" button + `router.push`
- [x] `CaptionCreator`: `hasApiKey` prop gates API "Tạo caption" only
- [x] `idea-card.tsx`: render `CaptionCreator` ungated, pass `hasApiKey`
- [x] Empty-draft supports blog platform
- [x] `npm run lint` + `next build` pass

## Success Criteria
- With **no** API key: from an idea panel, pick a platform (incl. Website/Blog), click "Tạo nháp trống" → lands in `/editor/[postId]` with empty caption; paste text + "Lưu caption" persists it.
- Creating a second draft for a platform that already has a post → blocked with "Nền tảng này đã có nội dung."
- No token cost; `usageLog` unchanged.
- Existing API "Tạo caption" flow unchanged when a key is present.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Duplicate posts per platform | Med | Med | Reuse exact dedup query from `generateCaptionForPlatform` |
| redirect-in-transition edge (if pattern A chosen) | Low | Med | Use pattern B (return postId + `router.push`) |
| `CaptionCreator` API button shows without key | Low | Low | `hasApiKey` prop gates API button; empty-draft ungated |
| `post.ts` edit collides with Phase 2 | Med | Low | Sequential execution; distinct functions |
| Invalid/blog platform slips dedup | Low | Low | `PLATFORMS.includes` guard before insert |

## Security Considerations
- Server action validates `ideaId` + `platform` (public endpoint). Insert writes only empty caption/draft — no untrusted content stored at creation. No API key involved.

## Next Steps
- Feature complete. Finalize: run `npm run lint` + `next build`, execute the with-key / without-key manual QA matrix across all 4 phases, then update `README.md` (per project rule) and `docs/` if platform list/feature set changed. (No git branch/commit as part of execution — user manages git.)
