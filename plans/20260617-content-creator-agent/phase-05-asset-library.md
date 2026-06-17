---
phase: 5
title: "Asset Library"
status: completed
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
- [x] Upload ảnh thành công, hiện trong thư viện (validate mime/size; lưu public/uploads)
- [x] Gắn ảnh vào post, hiện thumbnail trên calendar (toggle assetIds; thumbnail = ảnh đầu)
- [x] Nút sinh AI disable + có hint khi thiếu key
- [~] (khi có key) sinh được ảnh từ prompt — stub gated, hoãn tới khi có GEMINI_API_KEY (đúng scope)

## Risk Assessment
- `public/uploads/` không hợp serverless khi deploy (filesystem ephemeral). Mitigation: phase deploy chuyển sang object storage (R2/S3) — ghi chú ở Phase 6.

## Completion Notes (Session 2026-06-17)
- Upload qua server action: `File` từ FormData → ghi `public/uploads/<uuid>.<ext>` (ext lấy từ MIME whitelist, KHÔNG từ tên file → không path traversal) → asset row.
- Validate: mime ∈ {png,jpeg,webp,gif}, ≤5MB (check size trước khi đọc buffer).
- Gắn ảnh: `attachAssetToPost` toggle `post.assetIds` (JSON number[]); thumbnail trên lịch = ảnh đầu, resolve bằng 1 query `inArray` (không N+1).
- Gemini: stub `generateImage` throw khi thiếu key / chưa triển khai; `hasGeminiKey` gate nút UI.
- next/image `unoptimized` cho path local `/uploads` (same-origin, không cần remotePatterns).
- **Fix sau code review (L1):** mặc định Next giới hạn body server action **1MB** → upload 1-5MB sẽ lỗi ở tầng framework. Đã thêm `experimental.serverActions.bodySizeLimit: "6mb"` vào next.config.ts (verified docs).
- Verify: lint clean · build pass (route /assets static) · smoke test: upload file-write (mkdir+writeFile→/uploads/<uuid>), asset insert/list/attach-toggle, thumbnail resolution OK.
- README + .gitignore cập nhật (bỏ qua public/uploads/* trừ .gitkeep).

### Deferred (non-blocking, reviewer xác nhận chấp nhận cho local single-user v1)
- M1: AssetPicker dùng useState seed 1 lần (không resync nếu prop đổi từ nguồn khác) — local state là source of truth, ổn cho v1.
- M2: `attachAssetToPost` không kiểm asset tồn tại — downstream tự lành (getAssetsByIds/thumbnail drop id lạ).
- M3: file mồ côi nếu insert DB lỗi sau writeFile; chưa có delete/GC asset — xử lý ở Phase 6 (object storage).
- L2: validate MIME theo client-declared (spoofable) — threat model single-user; thêm magic-byte khi multi-user.
- Chưa có test tự động.
