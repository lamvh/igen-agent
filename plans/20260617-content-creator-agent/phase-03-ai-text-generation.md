---
phase: 3
title: "AI Text Generation"
status: completed
priority: P1
effort: "6-8h"
dependencies: [2]
---

# Phase 3: AI Text Generation

## Overview
Tích hợp Claude API để sinh **ý tưởng** (theo pillar + nền tảng) và **caption tiếng Việt** (biến thể riêng FB/IG/TikTok) từ brand profile. Trung tâm giá trị của app.

## Requirements
- Functional:
  - Idea Generator: nhập pillar/nền tảng → sinh danh sách ý tưởng (title), lưu vào bảng `idea`.
  - Caption Editor: chọn ý tưởng → sinh caption VN + hashtags theo từng nền tảng → sửa → lưu `post` (status=draft).
- Non-functional: API key đọc từ env runtime; nếu thiếu key → UI vẫn cho nhập caption thủ công (degrade gracefully); tông giọng lấy từ brand profile.

## Architecture
```
lib/ai/claude-client.ts     # khởi tạo @anthropic-ai/sdk, model claude-opus-4-8 (chất lượng cao nhất cho caption)
lib/ai/prompts.ts           # prompt template VN: idea-gen, caption-gen (nhúng brand + platform rules)
app/actions/generate.ts     # server actions: generateIdeas(), generateCaption()
app/ideas/page.tsx          # UI idea generator + list
app/editor/[postId]/page.tsx# caption editor
```
- **BẮT BUỘC đọc skill `claude-api` trước khi code client** (model id, params, streaming).
- Platform rules trong prompt: FB (dài, story), IG (ngắn + emoji + hashtag), TikTok (hook mạnh, CTA).

## Related Code Files
- Create: `lib/ai/claude-client.ts`, `lib/ai/prompts.ts`, `app/actions/generate.ts`, `app/ideas/page.tsx`, `app/editor/[postId]/page.tsx`
- Modify: `.env.local` (ANTHROPIC_API_KEY), `app/page.tsx` (link điều hướng)
- Delete: —

## Implementation Steps
1. `npm i @anthropic-ai/sdk`. Đọc skill `claude-api` để chốt model id + cách gọi.
2. `lib/ai/claude-client.ts`: client đọc `process.env.ANTHROPIC_API_KEY`; throw rõ ràng nếu thiếu.
3. `lib/ai/prompts.ts`: template tiếng Việt cho idea-gen + caption-gen, nhận brand + platform.
4. Server action `generateIdeas(pillar, platform)` → gọi Claude → parse JSON list → lưu `idea`.
5. Server action `generateCaption(ideaId, platform)` → caption + hashtags → tạo/cập nhật `post` draft.
6. UI `/ideas`: chọn pillar/platform, nút Generate, hiển thị list, nút "tạo caption".
7. UI `/editor/[postId]`: textarea caption + hashtags, nút regenerate, nút lưu.
8. Xử lý thiếu key: ẩn nút generate, hiện hint cắm key + cho nhập tay.

## Success Criteria
- [x] Sinh được >=5 ý tưởng VN theo pillar, lưu DB (IDEA_COUNT=6)
- [x] Sinh caption khác nhau cho FB/IG/TikTok từ cùng 1 ý tưởng (3 prompt riêng theo PLATFORM_RULES)
- [x] Sửa + lưu caption thành công (saveCaption)
- [x] Thiếu ANTHROPIC_API_KEY app không crash, cho nhập tay (hasApiKey gate + editor không cần key)

## Risk Assessment
- Output Claude không đúng JSON → dùng **structured outputs** (`messages.parse` + `zodOutputFormat`) thay vì prompt-and-parse; `parsed_output` null-safe ở mọi nơi.
- Chi phí token → Opus 4.8, `effort: "medium"`, `max_tokens: 2048`/lời gọi; không batch lớn.
- Key lộ → chỉ gọi Claude trong server action (`'use server'`); không client component nào import claude-client (verified).

## Completion Notes (Session 2026-06-17)
- Đã đọc skill `claude-api` (TypeScript): `@anthropic-ai/sdk` 0.104.2, `claude-opus-4-8`, adaptive-only (không temperature/top_p/budget_tokens), `output_config.effort`, `messages.parse` + `zodOutputFormat` (zod v4).
- Next 16: dynamic route `params` là Promise → `await params` (verified docs).
- Quyết định (user chốt): generateCaption tạo 1 post/nền tảng (3 draft/ý tưởng) → redirect editor; flow chỉ tạo post qua ý tưởng (không có nút post trắng riêng).
- Fixes sau code review:
  - **H1 (atomicity):** sinh cả 3 caption trước (`Promise.all`), insert một lần trong `db.transaction` → không còn post mồ côi khi 1 lời gọi Claude lỗi giữa chừng. (Verified runtime: transaction insert 3 row + returning id OK.)
  - **H2 (trust boundary):** validate `platform` qua `PLATFORMS.includes` thay vì cast `as Platform`.
  - **M3:** thêm comment cảnh báo prompt-injection cho multi-tenant tương lai.
- Verify: `npm run lint` clean · `npm run build` pass (TS clean; /ideas static, /editor/[postId] dynamic) · smoke test data layer (idea/post/sibling/saveCaption) + transaction path OK.
- README cập nhật (env ANTHROPIC_API_KEY, tính năng /ideas + /editor, cấu trúc thư mục).

### Deferred (non-blocking, YAGNI cho local v1)
- Chưa có unit test tự động (smoke test thủ công).
- `idea.platform` lưu nhưng generateCaption luôn sinh 3 nền tảng (đúng theo quyết định scope).
- max_tokens caption 2048 — nâng 3072 nếu thấy FB bị cắt.
