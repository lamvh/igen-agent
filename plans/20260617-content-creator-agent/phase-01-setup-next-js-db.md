---
phase: 1
title: Setup Next.js + DB
status: completed
priority: P1
effort: 3-4h
dependencies: []
---

# Phase 1: Setup Next.js + DB

## Overview
Khởi tạo dự án Next.js (App Router) + Tailwind/shadcn + SQLite/Drizzle, có schema rỗng chạy được migration. Nền móng cho mọi phase sau.

## Requirements
- Functional: app chạy `npm run dev`, mở được trang chủ; DB SQLite tạo file + chạy migration thành công.
- Non-functional: TypeScript strict; cấu trúc thư mục rõ ràng; mỗi file < 200 dòng.

## Architecture
```
app/                # Next.js App Router (pages, layouts)
  layout.tsx
  page.tsx          # dashboard trống
components/ui/       # shadcn components
db/
  schema.ts         # Drizzle schema (rỗng ở phase này)
  index.ts          # khởi tạo Drizzle + SQLite client
  migrate.ts        # chạy migration
lib/                # tiện ích dùng chung
drizzle.config.ts
.env.local          # DATABASE_URL=file:./local.db (gitignore)
```

## Related Code Files
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`, `db/schema.ts`, `db/index.ts`, `app/layout.tsx`, `app/page.tsx`, `.env.local`, `.gitignore`
- Modify: —
- Delete: —

## Implementation Steps
1. `npx create-next-app@latest` (App Router, TypeScript, Tailwind, src dir tùy chọn — giữ root `app/`).
2. Cài shadcn/ui: `npx shadcn@latest init`, thêm vài component nền (button, input, card, dialog).
3. Cài Drizzle + better-sqlite3: `npm i drizzle-orm better-sqlite3 && npm i -D drizzle-kit`.
4. Tạo `db/index.ts` (Drizzle + better-sqlite3 client), `db/schema.ts` (rỗng), `drizzle.config.ts`.
5. Thêm script `db:generate` / `db:migrate` vào package.json; chạy thử tạo `local.db`.
6. `.gitignore` cho `local.db`, `.env*`, `node_modules`, `.next`.
7. Trang chủ tối giản xác nhận app + DB hoạt động.

## Success Criteria
- [x] `npm run dev` mở trang chủ không lỗi (build + static gen `/` pass)
- [x] `npm run db:migrate` tạo `local.db` thành công (bảng `__drizzle_migrations`)
- [x] shadcn component render được (Card trên trang chủ)
- [x] TypeScript build sạch (`npm run build`)

## Risk Assessment
- better-sqlite3 cần native build → nếu lỗi trên macOS, đảm bảo Xcode CLT. Mitigation: fallback `libsql`/`@libsql/client` nếu cần (cũng hợp deploy sau).
