---
phase: 1
title: "Blog platform foundation"
status: completed
priority: P1
effort: "2h"
dependencies: []
---

# Phase 1: Blog platform foundation

## Context Links
- Spec §5 "Nền tảng Website/Blog": `docs/superpowers/specs/2026-07-02-manual-idea-save-and-prompt-copy-design.md`
- `lib/ai/prompts.ts:7` (`Platform`), `:9` (`PLATFORMS`), `:11` (`PLATFORM_LABELS`), `:18` (`PLATFORM_RULES`)
- `app/editor/[postId]/post-preview.tsx:17` (`ASPECT`), `:175` (`PostPreview` switch)
- `app/editor/[postId]/editor-workspace.tsx:72` (`PostPreview` call site)

## Overview
- **Priority:** P1 (foundation — do first).
- **Status:** pending.
- Add `"blog"` as a first-class platform. Adding it to the `Platform` union makes TypeScript flag every compiler-enforced `Record<Platform,…>` map, which is the scaffolding that guarantees later phases handle blog everywhere.

## Key Insights
- **Exactly 3 maps are compiler-enforced** (`Record<Platform,string>`) → build FAILS until `blog` added:
  - `PLATFORM_LABELS` (`prompts.ts:11`), `PLATFORM_RULES` (`prompts.ts:18`), `ASPECT` (`post-preview.tsx:17`).
- **3 maps are NOT enforced** (`Record<string,string>` + `?? "bg-muted"` fallback) → won't fail build, degrade to grey; add manually for correct color:
  - `PLATFORM_BADGE` (`idea-card.tsx:241`), `PLATFORM_COLOR` (`posts/page.tsx:25`, `post-card.tsx:15`).
- **`PostPreview` switch is NOT exhaustive** (`post-preview.tsx:175-179`, default→Facebook). TS will NOT error; blog silently renders as Facebook unless a `blog` branch is added explicitly.
- **Filters/tabs auto-pick-up blog** because they iterate `PLATFORMS`: `/posts` (`posts/page.tsx:105`), `/calendar` (`calendar/page.tsx:65`), editor tab bar (`editor-workspace.tsx:159`). No edits needed there — verify only.
- **Blog preview needs the idea title as heading.** `PostPreview` props currently have no title (`post-preview.tsx:167-173`). `PostView.ideaTitle` exists (`app/actions/post.ts:24`) and is available in `PlatformPanel` via `post.ideaTitle` — thread it through as a new optional `title` prop.

## Requirements
- Functional: `blog` selectable/creatable/filterable everywhere existing platforms are; blog preview shows title + body, no social like/share row.
- Non-functional: no schema change; `npm run lint` + `next build` pass; existing FB/IG/TikTok rendering unchanged.

## Architecture
Data flow (blog): `idea.title` → (blog post) `post.platform="blog"`, `post.caption`=body → `PostPreview title={post.ideaTitle} caption=body` → BlogFrame renders `<h-heading>{title}</h-heading>` + body, no engagement row. No new DB column; blog title is always derived from the linked idea (fallback to brandName when `ideaTitle` is null, e.g. an unlinked post).

`captionPrompt(brand, ideaTitle, "blog", outline, length)` uses new `PLATFORM_RULES.blog` — long-form SEO body, intro/body/conclusion, brand voice, few/no hashtags.

## Related Code Files
**Modify**
- `lib/ai/prompts.ts` — `Platform` union (+`"blog"`), `PLATFORMS` (+`"blog"`), `PLATFORM_LABELS.blog`, `PLATFORM_RULES.blog`.
- `app/editor/[postId]/post-preview.tsx` — `ASPECT.blog`, new optional `title?: string` on `PreviewProps`, new `BlogFrame`, add `blog` branch to `PostPreview`.
- `app/editor/[postId]/editor-workspace.tsx` — pass `title={post.ideaTitle}` into `PostPreview` (`PlatformPanel`).
- `app/ideas/idea-card.tsx` — `PLATFORM_BADGE.blog` (manual, non-enforced). *(Shared with Phase 3 — sequential.)*
- `app/posts/page.tsx` — `PLATFORM_COLOR.blog` (manual, non-enforced).
- `components/calendar/post-card.tsx` — `PLATFORM_COLOR.blog` (manual, non-enforced).

**Create** — none.
**Delete** — none.

## Implementation Steps
1. `prompts.ts`: `export type Platform = "facebook" | "instagram" | "tiktok" | "blog";` and add `"blog"` to `PLATFORMS`.
2. `prompts.ts`: `PLATFORM_LABELS.blog = "Website/Blog"`.
3. `prompts.ts`: `PLATFORM_RULES.blog` — e.g. "Website/Blog: bài dài chuẩn SEO, có mở bài–thân bài–kết bài rõ ràng, giọng chuẩn brand, ít hoặc không dùng hashtag, chèn tiêu đề phụ nếu cần." (Verify byte-consistency of tone with existing rules.)
4. `next build` now — fix the 3 enforced maps if any missed; confirm `ASPECT.blog = "aspect-[16/9]"` in `post-preview.tsx`.
5. `post-preview.tsx`: add `title?: string` to `PreviewProps`; write `BlogFrame(props)` — card with heading (`props.title || props.brandName`), `CaptionText` as body, `MediaFrame platform="blog"` (16/9 cover) optional, **no** like/comment/share row; add `if (props.platform === "blog") return <BlogFrame {...props} />;` in `PostPreview` before the Facebook fallback.
6. `editor-workspace.tsx`: in `PlatformPanel`, pass `title={post.ideaTitle}` to `<PostPreview>`. (Confirm `PostView.ideaTitle` is threaded into `posts` — it is, via `getIdeaPosts`.)
7. `idea-card.tsx` `PLATFORM_BADGE`, `posts/page.tsx` `PLATFORM_COLOR`, `post-card.tsx` `PLATFORM_COLOR`: add a distinct `blog` color (e.g. `bg-amber-100 text-amber-700 …`).
8. Verify (no edit) that `/posts`, `/calendar`, and editor tab bar show a Website/Blog chip/tab (they map over `PLATFORMS`).
9. `npm run lint` + `npx next build`.

## Todo List
- [x] `Platform` union + `PLATFORMS` include `"blog"`
- [x] `PLATFORM_LABELS.blog` = "Website/Blog"
- [x] `PLATFORM_RULES.blog` written (SEO long-form, low hashtag)
- [x] `ASPECT.blog` = "aspect-[16/9]"
- [x] `BlogFrame` + `title?` prop + `blog` branch in `PostPreview`
- [x] `editor-workspace` passes `title={post.ideaTitle}`
- [x] `PLATFORM_BADGE.blog`, `PLATFORM_COLOR.blog` (2 files)
- [x] Verify blog chip/tab appears in /posts, /calendar, editor
- [x] `npm run lint` + `next build` pass

## Success Criteria
- `next build` passes with `blog` in `Platform` (compiler confirms all `Record<Platform,…>` covered).
- Selecting Website/Blog in editor tab bar renders BlogFrame: title heading + body, **no** like/share row.
- `/posts` + `/calendar` show a Website/Blog filter chip with distinct (non-grey) color.
- FB/IG/TikTok previews unchanged.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Missed non-enforced map → blog badge grey | Med | Low | Manual add in the 3 `Record<string>` maps; QA visual check |
| `PostPreview` silently renders blog as Facebook | Med | Med | Explicit `blog` branch (step 5); QA the blog tab |
| `ideaTitle` null (unlinked post) → empty blog heading | Low | Low | Fallback `title || brandName` in BlogFrame |
| Blog rule tone inconsistent w/ existing prompts | Low | Low | Mirror phrasing/style of existing `PLATFORM_RULES` entries |

## Security Considerations
- None new. Blog rule text is embedded into prompts like existing rules; prompt-injection posture unchanged (documented single-user acceptance in `prompts.ts:27-31`).

## Next Steps
- Enables Phase 3 (`buildCaptionPrompt` blog rule) and Phase 4 (`createEmptyPost` blog). Proceed to Phase 2 in parallel-safe fashion (different files) or sequentially.
