---
phase: 3
title: "AI Text Generation"
status: pending
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
- [ ] Sinh được >=5 ý tưởng VN theo pillar, lưu DB
- [ ] Sinh caption khác nhau cho FB/IG/TikTok từ cùng 1 ý tưởng
- [ ] Sửa + lưu caption thành công
- [ ] Thiếu ANTHROPIC_API_KEY app không crash, cho nhập tay

## Risk Assessment
- Output Claude không đúng JSON → dùng prompt yêu cầu JSON + parse phòng thủ (try/catch, fallback text). 
- Chi phí token → Opus đắt hơn; giới hạn max_tokens hợp lý, không sinh batch lớn không cần thiết.
- Key lộ → chỉ gọi Claude ở server action, không bao giờ client-side.
