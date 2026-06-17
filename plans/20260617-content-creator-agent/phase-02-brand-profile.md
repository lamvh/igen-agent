---
phase: 2
title: "Brand Profile"
status: pending
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
- [ ] Migration tạo đủ 4 bảng
- [ ] Tạo được brand profile, reload vẫn còn dữ liệu
- [ ] Sửa brand cập nhật đúng
- [ ] Form validate (báo lỗi khi thiếu tên/ngành)

## Risk Assessment
- SQLite không có mảng/JSON native → lưu pillars/assetIds/hashtags dạng JSON text, parse trong app. Mitigation: helper serialize/parse tập trung ở `lib/`.
