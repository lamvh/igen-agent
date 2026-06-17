---
phase: 6
title: "Polish & Deploy Prep"
status: completed
priority: P2
effort: "4-6h"
dependencies: [5]
---

# Phase 6: Polish & Deploy Prep

## Overview
Hoàn thiện UX, hướng dẫn cắm API key, và chuẩn bị deploy (auth + object storage + Postgres) — không bắt buộc deploy ngay.

## Requirements
- Functional: dashboard tổng quan; trang Settings cắm/kiểm tra API key; (chuẩn bị) auth + storage cho deploy.
- Non-functional: responsive; thông báo lỗi rõ ràng; README hướng dẫn chạy.

## Architecture
- Dashboard `app/page.tsx`: tổng quan (số ý tưởng, post theo trạng thái, link nhanh).
- Settings `app/settings/page.tsx`: nhập/test ANTHROPIC_API_KEY & GEMINI_API_KEY (lưu env hoặc DB config — local).
- Deploy prep (ghi chú + scaffold, làm khi quyết định deploy):
  - Auth: skill `better-auth` (email/password).
  - Storage: chuyển `public/uploads/` → R2/S3 (skill `storage`).
  - DB: SQLite → Postgres (đổi Drizzle driver + DATABASE_URL).

## Related Code Files
- Create: `app/settings/page.tsx`, `README.md`
- Modify: `app/page.tsx` (dashboard), các trang (responsive polish), `.env.example`
- Delete: —

## Implementation Steps
1. Dashboard tổng quan với số liệu cơ bản + điều hướng.
2. Trang Settings: form key + nút test gọi thử Claude/Gemini, báo trạng thái.
3. Responsive + empty states + toast lỗi/thành công.
4. `README.md`: cách chạy local, lấy ANTHROPIC_API_KEY & GEMINI_API_KEY, migrate DB.
5. `.env.example` liệt kê biến môi trường.
6. (Optional, khi deploy) viết phase con: better-auth + R2/S3 + Postgres + `/ck:deploy`.

## Success Criteria
- [x] Dashboard hiện đúng số liệu (getDashboardStats; verified)
- [x] Settings test được key, báo trạng thái (getKeyStatus + testClaudeKey)
- [x] README đủ để người mới chạy được app (install→env→migrate→dev + bảng key)
- [x] App responsive, không lỗi console nghiêm trọng

## Risk Assessment
- Lưu API key trong DB/env local OK; khi deploy public phải dùng secret manager, không commit key. Mitigation: tài liệu hóa rõ trong README + `.gitignore` đã chặn `.env*` (thêm `!.env.example`).

## Completion Notes (Session 2026-06-17)
- Dashboard: stats strip (ý tưởng + post theo trạng thái) + empty state khi chưa có brand + nav 5 mục.
- Settings: trạng thái key + test Claude (lời gọi nhỏ max_tokens:8). KHÔNG nhập key qua UI (chỉ .env.local) — tránh lộ.
- `.env.example` enrich (URL lấy key, comment); `.gitignore` thêm `!.env.example` (vẫn chặn .env.local — verified).
- Deploy: chỉ tài liệu hóa (Postgres + R2/S3 + auth) trong README, KHÔNG implement (đúng scope optional).
- **Fix quan trọng (build phát hiện):** các trang đọc DB/env (`/`, `/settings`, `/brand`, `/ideas`, `/assets`) bị Next prerender static → dữ liệu build-time (stale). Thêm `export const dynamic = "force-dynamic"` để render lúc request. `/calendar` + `/editor` đã dynamic sẵn (searchParams/params). Build output: mọi route data đều ƒ.
- Fix sau code review (Low): `layout.tsx` đổi title "Create Next App" → "Content Creator" (template per-page) + `lang="vi"`; `testClaudeKey` phân biệt 401/403 (key sai) vs 429/5xx (tạm thời).
- Verify: lint clean · build pass (mọi route dynamic) · smoke test stats counts OK.

## v1 hoàn thành
6/6 phase done. Mở rộng tương lai: sinh ảnh AI thật (Gemini), auth + Postgres + object storage để deploy public.
