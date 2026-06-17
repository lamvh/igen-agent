# Content Creator Web App

Web app sinh nội dung + quản lý lịch đăng cho **1 thương hiệu** (tiếng Việt). Sinh caption/bài + ý tưởng bằng Claude API, upload ảnh thủ công, hỗ trợ Facebook / Instagram / TikTok. Đăng thủ công (không auto-post). Local-first.

**Stack:** Next.js 16 (App Router) · SQLite + Drizzle ORM · Tailwind + shadcn/ui · zod · Claude API (`claude-opus-4-8`).

## Yêu cầu

- Node 18+
- `ANTHROPIC_API_KEY` — để sinh ý tưởng/caption tự động. Thiếu key app vẫn chạy: chỉ ẩn nút sinh, vẫn nhập/sửa caption thủ công được.

## Bắt đầu

```bash
npm install
npm run db:migrate   # tạo local.db + bảng
npm run dev          # http://localhost:3000
```

Cấu hình qua `.env.local`:

```
DATABASE_URL=file:./local.db   # mặc định nếu bỏ trống
ANTHROPIC_API_KEY=             # để trống nếu chưa có; sinh AI sẽ tắt
```

> Đặt `ANTHROPIC_API_KEY` rồi khởi động lại dev server để bật sinh ý tưởng/caption.

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

### Ý tưởng & Caption (`/ideas`)

Sinh nội dung bằng Claude (`claude-opus-4-8`), dùng ngữ cảnh từ Brand Profile:

- **Sinh ý tưởng**: chọn content pillar + nền tảng (FB/IG/TikTok) → sinh ~6 tiêu đề ý tưởng, lưu vào DB.
- **Tạo caption**: từ 1 ý tưởng → sinh caption riêng cho cả 3 nền tảng (1 bản nháp/nền tảng) rồi chuyển sang trình soạn thảo.
- Quy tắc theo nền tảng nằm trong prompt: FB (dài, kể chuyện), IG (ngắn + emoji + nhiều hashtag), TikTok (hook mạnh + CTA).
- Output dùng **structured outputs** (zod) nên parse an toàn, không lo JSON hỏng.
- Thiếu `ANTHROPIC_API_KEY`: ẩn nút sinh, vẫn nhập caption thủ công được.

### Soạn caption (`/editor/[postId]`)

Sửa caption + hashtags của một bản nháp; chuyển nhanh giữa các nền tảng cùng ý tưởng; **gán ngày đăng** (đặt trạng thái “Đã lên lịch”); lưu thủ công (cũng dùng khi không có API key). Tất cả lời gọi Claude chạy ở server action — API key không bao giờ lộ ra client.

### Lịch nội dung (`/calendar`)

Lịch tháng xếp các post theo `scheduledDate`:

- Điều hướng tháng (←/→), lọc theo nền tảng (FB/IG/TikTok/tất cả).
- Mỗi post hiện badge nền tảng + trạng thái, snippet caption (click mở editor).
- Đổi trạng thái ngay trên thẻ (Nháp → Đã lên lịch → Đã đăng).
- Nút **Copy** ghép caption + hashtags vào clipboard để đăng thủ công (không auto-post).
- Ngày dùng giờ local nhất quán (không lệch timezone).

## Cấu trúc thư mục

```
app/
  page.tsx                 # dashboard
  brand/                   # Brand Profile (page + form)
  ideas/
    page.tsx               # Idea generator + danh sách (Server Component)
    ideas-generator.tsx    # form sinh ý tưởng (Client)
    create-caption-button.tsx # nút tạo caption / ý tưởng (Client)
  editor/[postId]/
    page.tsx               # caption editor (Server Component)
    caption-editor.tsx     # form sửa caption (Client)
    schedule-control.tsx   # gán ngày đăng (Client)
  calendar/
    page.tsx               # lịch tháng + lọc nền tảng (Server Component)
  actions/
    brand.ts               # getBrand, upsertBrand
    generate.ts            # generateIdeas, generateCaption (gọi Claude)
    post.ts                # listIdeas, getPost, getSiblingPosts, saveCaption
    calendar.ts            # listScheduledPosts, updatePostSchedule, updatePostStatus
components/calendar/
  month-grid.tsx           # lưới tháng (Server Component)
  post-card.tsx            # thẻ post: badge + đổi trạng thái + copy (Client)
db/
  schema.ts                # Drizzle schema (brand, idea, post, asset)
  index.ts                 # Drizzle client (better-sqlite3)
  migrate.ts               # chạy migration
lib/
  json.ts                  # serialize/parse JSON text (pillars, hashtags...)
  date.ts                  # helper ngày local + lưới tháng
  post-status.ts           # hằng số + kiểu trạng thái/calendar (client dùng được)
  ai/
    claude-client.ts       # Anthropic client + hasApiKey + model id
    prompts.ts             # prompt VN + quy tắc nền tảng
  validations/             # zod schema (brand, generate)
components/ui/             # shadcn components
drizzle/                   # file migration sinh ra
```

## Lộ trình

Xem `plans/20260617-content-creator-agent/plan.md`. Đã xong: Phase 1 (setup), Phase 2 (Brand Profile), Phase 3 (sinh nội dung AI), Phase 4 (lịch nội dung). Tiếp theo: Phase 5 (thư viện ảnh).
