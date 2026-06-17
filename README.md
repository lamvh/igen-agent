# Content Creator Web App

Web app sinh nội dung + quản lý lịch đăng cho **1 thương hiệu** (tiếng Việt). Sinh caption/bài + ý tưởng bằng Claude API, upload ảnh thủ công, hỗ trợ Facebook / Instagram / TikTok. Đăng thủ công (không auto-post). Local-first.

**Stack:** Next.js 16 (App Router) · SQLite + Drizzle ORM · Tailwind + shadcn/ui · zod · Claude API (Phase 3).

## Yêu cầu

- Node 18+
- (Phase 3) `ANTHROPIC_API_KEY` — chưa cần ở Phase 2

## Bắt đầu

```bash
npm install
npm run db:migrate   # tạo local.db + bảng
npm run dev          # http://localhost:3000
```

Cấu hình DB qua `.env.local` (mặc định nếu bỏ trống):

```
DATABASE_URL=file:./local.db
```

## Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Chạy dev server |
| `npm run build` | Build production |
| `npm run lint` | ESLint |
| `npm run db:generate` | Sinh file migration từ `db/schema.ts` |
| `npm run db:migrate` | Áp dụng migration → `local.db` |

> **Lưu ý:** Sau khi sửa `db/schema.ts`, chạy `db:generate` rồi `db:migrate`.

## Tính năng

### Brand Profile (`/brand`)

Thiết lập 1 thương hiệu — đầu vào ngữ cảnh cho mọi phần sinh nội dung sau:

- Tên thương hiệu *(bắt buộc)*, Ngành *(bắt buộc)*
- Sản phẩm / dịch vụ, Tông giọng, Đối tượng khách hàng
- **Content pillars**: danh sách động (thêm/xóa từng mục)

Cơ chế single-brand: lần đầu là form tạo; sau đó là form sửa. Validate phía server bằng zod (báo lỗi khi thiếu tên/ngành). Truy cập từ trang chủ hoặc trực tiếp `/brand`.

## Cấu trúc thư mục

```
app/
  page.tsx              # dashboard
  brand/
    page.tsx            # trang Brand Profile (Server Component)
    brand-form.tsx      # form CRUD (Client Component)
  actions/
    brand.ts            # server actions: getBrand, upsertBrand
db/
  schema.ts             # Drizzle schema (brand, idea, post, asset)
  index.ts              # Drizzle client (better-sqlite3)
  migrate.ts            # chạy migration
lib/
  json.ts              # serialize/parse JSON text (pillars, hashtags...)
  validations/brand.ts  # zod schema cho brand
components/ui/          # shadcn components
drizzle/                # file migration sinh ra
```

## Lộ trình

Xem `plans/20260617-content-creator-agent/plan.md`. Đã xong: Phase 1 (setup), Phase 2 (Brand Profile). Tiếp theo: Phase 3 (sinh nội dung AI).
