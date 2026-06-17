---
phase: 5
title: "Asset Library"
status: pending
priority: P2
effort: "4-5h"
dependencies: [4]
---

# Phase 5: Asset Library

## Overview
Thư viện ảnh: upload thủ công + gắn vào post. Nút "sinh ảnh AI" (Gemini) khai báo sẵn nhưng **disable cho tới khi có GEMINI_API_KEY**.

## Requirements
- Functional: upload ảnh, lưu vào storage local + bảng `asset`, gắn asset vào post, xem grid thư viện.
- Non-functional: ảnh lưu trong `public/uploads/` (local-first); path lưu DB.

## Architecture
```
public/uploads/             # nơi lưu ảnh local
app/assets/page.tsx         # grid thư viện
app/actions/asset.ts        # uploadAsset, listAssets, attachAssetToPost
lib/ai/gemini-client.ts     # stub sinh ảnh, gate theo GEMINI_API_KEY (phase sau khi có key)
```
- Upload qua server action ghi file vào `public/uploads/`, tạo `asset` row.
- Image-gen: skill `ai-multimodal`/`ai-artist` (Nano Banana) — chỉ kích hoạt khi có key; v1 nút disable + hint.

## Related Code Files
- Create: `app/assets/page.tsx`, `app/actions/asset.ts`, `lib/ai/gemini-client.ts`, `public/uploads/.gitkeep`
- Modify: `app/editor/[postId]/page.tsx` (chọn/gắn ảnh), `components/calendar/post-card.tsx` (hiện thumbnail)
- Delete: —

## Implementation Steps
1. Server action `uploadAsset(file)`: lưu `public/uploads/`, tạo `asset` row (type=image, path).
2. `app/assets/page.tsx`: grid hiển thị ảnh + nút upload + nút "sinh AI" (disabled nếu thiếu key).
3. `attachAssetToPost(postId, assetId)`: cập nhật `post.assetIds`.
4. Editor: picker chọn ảnh từ thư viện hoặc upload mới.
5. `lib/ai/gemini-client.ts`: hàm `generateImage(prompt)` chỉ chạy khi `GEMINI_API_KEY` có; nếu thiếu → throw có hướng dẫn.
6. Hiện hint cách lấy GEMINI_API_KEY (aistudio.google.com) ở trang assets.

## Success Criteria
- [ ] Upload ảnh thành công, hiện trong thư viện
- [ ] Gắn ảnh vào post, hiện thumbnail trên calendar
- [ ] Nút sinh AI disable + có hint khi thiếu key
- [ ] (khi có key) sinh được ảnh từ prompt

## Risk Assessment
- `public/uploads/` không hợp serverless khi deploy (filesystem ephemeral). Mitigation: phase deploy chuyển sang object storage (R2/S3) — ghi chú ở Phase 6.
