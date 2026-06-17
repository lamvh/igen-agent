---
phase: 2
title: "Brand Profile"
status: completed
priority: P1
effort: "4-5h"
dependencies: [1]
---

# Phase 2: Brand Profile

## Overview
Định nghĩa data model lõi (Brand/Idea/Post/Asset) + màn hình CRUD cho Brand Profile (1 thương hiệu). Đây là đầu vào ngữ cảnh cho mọi phần sinh content sau.

## Requirements
- Functional: tạo/sửa/xem 1 brand profile gồm tên, ngành, sản phẩm, tông giọng, audience, content pillars (list).
- Non-functional: validate form; lưu DB; pillars là mảng (lưu JSON text trong SQLite).

## Architecture
Schema Drizzle (đặt enum dạng text + check trong code):
```ts
brand   { id, name, industry, products(text), toneOfVoice(text), audience(text), pillars(json text), createdAt }
idea    { id, brandId, title, pillar, platform, status, createdAt }   // dùng từ phase 3
post    { id, ideaId?, platform, caption, hashtags(text), scheduledDate?, status, assetIds(json), createdAt } // phase 4
asset   { id, type, path, prompt?, postId?, createdAt }               // phase 5
// platform: 'facebook'|'instagram'|'tiktok'
// post.status: 'draft'|'scheduled'|'posted'
```
Phase 2 chỉ build UI cho `brand`; các bảng khác khai báo schema sẵn để migration 1 lần.

## Related Code Files
- Create: `app/brand/page.tsx` (form CRUD), `app/actions/brand.ts` (server actions), `lib/validations/brand.ts` (zod)
- Modify: `db/schema.ts` (thêm 4 bảng), chạy `db:generate` + `db:migrate`
- Delete: —

## Implementation Steps
1. Khai báo 4 bảng trong `db/schema.ts` (đầy đủ cho cả các phase sau, tránh nhiều lần migrate).
2. `npm run db:generate && npm run db:migrate`.
3. Zod schema validate brand (`lib/validations/brand.ts`).
4. Server actions: `getBrand`, `upsertBrand` (`app/actions/brand.ts`).
5. UI form `/brand` với shadcn (input/textarea + pillars dạng tag/list thêm-xóa).
6. Vì 1 brand: nếu chưa có → form tạo; có rồi → form sửa (single-row pattern).

## Success Criteria
- [x] Migration tạo đủ 4 bảng (asset, brand, idea, post — verified trong local.db)
- [x] Tạo được brand profile, reload vẫn còn dữ liệu (Server Component re-fetch + getBrand)
- [x] Sửa brand cập nhật đúng (single-row upsert)
- [x] Form validate (báo lỗi khi thiếu tên/ngành — zod safeParse)

## Risk Assessment
- SQLite không có mảng/JSON native → lưu pillars/assetIds/hashtags dạng JSON text, parse trong app. Mitigation: helper serialize/parse tập trung ở `lib/json.ts` (parse an toàn → [] khi lỗi).

## Completion Notes (Session 2026-06-17)
- Đã đổi sang zod v4 (4.4.3); `error.flatten().fieldErrors` vẫn hợp lệ (instance method còn live, không deprecated).
- Đã đọc node_modules/next/dist/docs (Next 16): server actions dùng `'use server'`, `useActionState(prevState, formData)`, `revalidatePath`.
- Hardening đã áp dụng: `upsertBrand` bọc try/catch trả `BrandFormState` thay vì để exception thoát boundary.
- Verify: `npm run lint` clean · `npm run build` pass (TS clean, route /brand) · migration tạo 4 bảng · smoke test insert/read/delete + pillars JSON round-trip OK.
- README.md cập nhật (setup, scripts, tính năng Brand Profile, cấu trúc thư mục).

### Deferred (non-blocking, từ code review — YAGNI cho local v1)
- Chưa có unit test cho `lib/json.ts` + nhánh insert/update của `upsertBrand`.
- Pillar rows dùng `key={index}` (focus có thể nhảy khi xóa giữa danh sách) — cosmetic.
- Form không re-sync sau save thành công (chỉ lệch nếu server normalize pillars; hiện chưa normalize).
