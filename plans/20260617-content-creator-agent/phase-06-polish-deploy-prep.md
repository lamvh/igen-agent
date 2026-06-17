---
phase: 6
title: "Polish & Deploy Prep"
status: pending
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
- [ ] Dashboard hiện đúng số liệu
- [ ] Settings test được key, báo trạng thái
- [ ] README đủ để người mới chạy được app
- [ ] App responsive, không lỗi console nghiêm trọng

## Risk Assessment
- Lưu API key trong DB/env local OK; khi deploy public phải dùng secret manager, không commit key. Mitigation: tài liệu hóa rõ trong README + `.gitignore` đã chặn `.env*`.
