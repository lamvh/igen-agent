# Content Creator Web App

Web app sinh nội dung + quản lý lịch đăng cho **1 thương hiệu** (tiếng Việt). Sinh caption/bài + ý tưởng bằng Claude API, upload ảnh thủ công, hỗ trợ Facebook / Instagram / TikTok / Website-Blog. Đăng thủ công (không auto-post). Local-first.

**Dùng được cả khi không có API key:** lưu ý tưởng thủ công, copy prompt (ý tưởng/dàn ý/content) để dán sang Claude app hoặc AI agent bất kỳ rồi dán kết quả ngược lại — không tốn token.

**Stack:** Next.js 16 (App Router) · libSQL/Turso + Drizzle ORM · Tailwind + shadcn/ui · zod · Claude API (`claude-opus-4-8`).

### Tính năng nổi bật

- 🏷️ **[Brand Profile](#brand-profile-brand)** — thiết lập thương hiệu 1 lần, làm ngữ cảnh cho mọi nội dung sinh ra.
- 💡 **[Ý tưởng & Caption](#ý-tưởng--caption-ideas)** — sinh ý tưởng + caption theo từng nền tảng bằng Claude, hoặc **copy prompt** dán sang AI khác (không tốn token).
- 📝 **[Nội dung](#nội-dung-posts)** — xem mọi caption (kể cả nháp), gom theo ý tưởng, lọc trạng thái/nền tảng.
- ✏️ **[Soạn caption](#soạn-caption-editorpostid)** — sửa caption/hashtags, gắn ảnh, gán ngày đăng.
- 📅 **[Lịch nội dung](#lịch-nội-dung-calendar)** — lịch tháng theo ngày đăng, đổi trạng thái, copy caption để đăng thủ công.
- 🖼️ **[Thư viện ảnh](#thư-viện-ảnh-assets)** — upload ảnh, gắn vào bài đăng.
- 🔐 **[Đăng nhập](#đăng-nhập-login)** — cổng auth chặn toàn bộ app, cookie ký HMAC.

### Luồng sử dụng

1. **Đăng nhập** tại `/login` (mặc định `admin` / `admin`).
2. **Tạo Brand Profile** tại `/brand` — tên, ngành, tông giọng, content pillars.
3. **Sinh ý tưởng** tại `/ideas`: chọn pillar + nền tảng → Claude sinh ~6 ý tưởng (hoặc nhập tay / copy prompt nếu không có key).
4. **Tạo caption** từ ý tưởng → app sinh bản nháp riêng cho từng nền tảng và mở trình soạn thảo.
5. **Soạn & lên lịch** tại `/editor/[postId]`: chỉnh caption, gắn ảnh từ thư viện, gán ngày đăng.
6. **Theo dõi trên lịch** tại `/calendar`: đến ngày đăng, bấm **Copy** để lấy caption + hashtags rồi đăng thủ công lên nền tảng, sau đó đổi trạng thái thành "Đã đăng".

Chi tiết từng tính năng xem mục [Tính năng](#tính-năng) bên dưới.

## Yêu cầu

- Node 18+
- `ANTHROPIC_API_KEY` — để sinh ý tưởng/caption tự động. Thiếu key app vẫn chạy: chỉ ẩn nút sinh, vẫn nhập/sửa caption thủ công được.

## Bắt đầu

```bash
npm install
cp .env.example .env.local   # rồi điền key (xem bên dưới)
npm run db:migrate           # tạo local.db + bảng
npm run dev                  # http://localhost:3000
```

### Lấy API key

| Biến | Dùng cho | Lấy tại |
|------|----------|---------|
| `ANTHROPIC_API_KEY` | Sinh ý tưởng + caption (Claude) | https://console.anthropic.com |
| `GEMINI_API_KEY` | Sinh ảnh AI (sắp có) | https://aistudio.google.com |

Để trống cũng được — app vẫn chạy, chỉ ẩn nút sinh tự động (vẫn nhập/sửa thủ công). Sau khi điền key, **khởi động lại dev server**. Kiểm tra trạng thái + test key tại trang **Cài đặt** (`/settings`).

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

- **Sinh ý tưởng**: chọn content pillar + nền tảng (FB/IG/TikTok/Blog) → sinh ~6 tiêu đề ý tưởng, lưu vào DB.
- **Tạo caption**: từ 1 ý tưởng → sinh caption riêng cho từng nền tảng (1 bản nháp/nền tảng) rồi chuyển sang trình soạn thảo.
- Quy tắc theo nền tảng nằm trong prompt: FB (dài, kể chuyện), IG (ngắn + emoji + nhiều hashtag), TikTok (hook mạnh + CTA), Website/Blog (dài chuẩn SEO, mở-thân-kết, ít hashtag).
- Output dùng **structured outputs** (zod) nên parse an toàn, không lo JSON hỏng.
- **Không có `ANTHROPIC_API_KEY` vẫn dùng được đầy đủ**:
  - **Lưu ý tưởng thủ công** (chỉ cần tiêu đề, không gọi Claude).
  - **Copy prompt** (ý tưởng / dàn ý / content) — sinh đúng prompt mà API dùng, không tốn token. Dàn ý có tùy chọn mức độ (Ngắn gọn / Tiêu chuẩn / Chuyên sâu) + góc nhìn (Giọng thương hiệu / Cá nhân trải nghiệm / Chuyên gia), áp dụng cho cả tạo bằng API lẫn copy prompt. Prompt content là brief đầy đủ nhất (ý tưởng + dàn ý + brand context + quy tắc nền tảng, độ dài tùy chọn) để dán sang Claude app hoặc AI agent bất kỳ triển khai thành bài hoàn chỉnh. Copy được ngay trong panel ý tưởng (chọn nền tảng + độ dài, không cần tạo post trước) hoặc trong editor của post.
  - **Tạo nháp trống** cho 1 nền tảng → mở trình soạn, dán caption lấy từ Claude app rồi lưu như bình thường.

### Nội dung (`/posts`)

Xem **mọi caption đã tạo, gồm bản nháp** (không cần lên lịch mới thấy):

- Lưới card gom theo chủ đề (ý tưởng), mới nhất trước; mỗi card có thumbnail, tiêu đề ý tưởng, snippet caption và chip từng nền tảng (kèm chấm màu trạng thái) — bấm chip mở trình soạn của đúng bài đó.
- Lọc theo trạng thái (Nháp / Đã lên lịch / Đã đăng) và nền tảng; phân trang 20 bài/trang (`?page=N`).
- Trang `/ideas` cũng phân trang 18 ý tưởng/trang (bỏ infinite scroll).
- Link back về ý tưởng gốc: icon 💡 trên mỗi nhóm (và tên ý tưởng trong editor) mở thẳng panel ý tưởng qua deep-link `/ideas?idea=<id>`.

### Soạn caption (`/editor/[postId]`)

Sửa caption + hashtags của một bản nháp; chuyển nhanh giữa các nền tảng cùng ý tưởng; **gán ngày đăng** (đặt trạng thái “Đã lên lịch”); lưu thủ công (cũng dùng khi không có API key). Tất cả lời gọi Claude chạy ở server action — API key không bao giờ lộ ra client.

### Lịch nội dung (`/calendar`)

Lịch tháng xếp các post theo `scheduledDate`:

- Điều hướng tháng (←/→), lọc theo nền tảng (FB/IG/TikTok/Blog/tất cả).
- Mỗi post hiện badge nền tảng + trạng thái, snippet caption (click mở editor).
- Đổi trạng thái ngay trên thẻ (Nháp → Đã lên lịch → Đã đăng).
- Nút **Copy** ghép caption + hashtags vào clipboard để đăng thủ công (không auto-post).
- Thẻ post hiện thumbnail ảnh đính kèm (nếu có).
- Ngày dùng giờ local nhất quán (không lệch timezone).

### Thư viện ảnh (`/assets`)

Quản lý ảnh để gắn vào bài đăng (local-first):

- **Upload ảnh** (PNG/JPG/WebP/GIF, ≤5MB) → lưu vào `public/uploads/`, tạo bản ghi `asset`.
- Grid xem toàn bộ ảnh đã tải.
- Trong trình soạn caption: chọn ảnh từ thư viện để **gắn/bỏ gắn** vào post (toggle), ảnh đầu hiện làm thumbnail trên lịch.
- **Sinh ảnh AI** (Gemini/Nano Banana): nút khai báo sẵn nhưng **disable** cho tới khi có `GEMINI_API_KEY` (hint lấy key tại aistudio.google.com).

> Ảnh upload không được commit (gitignore `public/uploads/*`). Khi deploy serverless cần chuyển sang object storage (R2/S3) — xem mục Deploy.

### Đăng nhập (`/login`)

Cổng đăng nhập đơn giản chặn truy cập toàn bộ app (chống lộ dữ liệu):

- **`proxy.ts`** (Next.js 16 — thay cho middleware) chặn mọi route trừ `/login`; chưa đăng nhập → chuyển về `/login`.
- Phiên lưu trong cookie `httpOnly` **ký HMAC-SHA256** (`node:crypto`, không thêm dependency); cookie giả/sửa sẽ bị từ chối.
- **Thông tin mặc định: `admin` / `admin`.** Đổi bằng biến môi trường `AUTH_USERNAME` / `AUTH_PASSWORD`; đặt `SESSION_SECRET` (chuỗi ngẫu nhiên) khi deploy — nhờ vậy mật khẩu thật không nằm trong repo.
- Nút **Đăng xuất** ở cuối thanh điều hướng (xóa phiên).

### Dashboard (`/`) & Cài đặt (`/settings`)

- **Dashboard**: số liệu nhanh (số ý tưởng, post theo trạng thái nháp/đã lên lịch/đã đăng) + điều hướng tới mọi mục; empty state khi chưa có brand.
- **Cài đặt**: xem trạng thái `ANTHROPIC_API_KEY` / `GEMINI_API_KEY` và **test** key Claude bằng một lời gọi nhỏ. Không nhập key qua UI (tránh lộ) — cấu hình trong `.env.local`.

## Cấu trúc thư mục

```
proxy.ts                   # cổng auth: chặn route chưa đăng nhập (Next.js 16)
app/
  page.tsx                 # dashboard (số liệu + điều hướng)
  login/
    page.tsx               # trang đăng nhập (Server Component)
    login-form.tsx         # form đăng nhập (Client)
  settings/
    page.tsx               # cài đặt: trạng thái key (Server Component)
    claude-test-button.tsx # test key Claude (Client)
  brand/                   # Brand Profile (page + form)
  ideas/
    page.tsx               # Idea generator + danh sách (Server Component)
    ideas-generator.tsx    # form sinh ý tưởng bằng AI (Client) — luôn hiện, chỉ ẩn nút submit khi thiếu key
    manual-idea-form.tsx   # form lưu ý tưởng thủ công, không gọi API (Client)
    create-caption-button.tsx # nút tạo caption / ý tưởng (Client)
  editor/[postId]/
    page.tsx               # caption editor (Server Component)
    caption-editor.tsx     # form sửa caption (Client)
    schedule-control.tsx   # gán ngày đăng (Client)
    asset-picker.tsx       # chọn/gắn ảnh từ thư viện (Client)
  posts/
    page.tsx               # danh sách mọi post + lọc trạng thái/nền tảng (Server Component)
  calendar/
    page.tsx               # lịch tháng + lọc nền tảng (Server Component)
  assets/
    page.tsx               # thư viện ảnh (Server Component)
    upload-form.tsx        # form upload + nút sinh AI (Client)
  actions/
    brand.ts               # getBrand, upsertBrand
    generate.ts            # generateIdeas, generateCaption (gọi Claude) + buildIdeaPrompt/buildOutlinePrompt/buildCaptionPrompt (copy-prompt, không gọi Claude)
    post.ts                # listIdeas, getPost, getSiblingPosts, listAllPosts, saveCaption, createIdeaManual, createEmptyPost (không gọi Claude)
    calendar.ts            # listScheduledPosts, updatePostSchedule, updatePostStatus
    asset.ts               # uploadAsset, listAssets, attachAssetToPost
    stats.ts               # getDashboardStats
    settings.ts            # getKeyStatus, testClaudeKey
    auth.ts                # login, logout (server actions)
components/shell/
  copy-button.tsx          # nút copy 1 đoạn text vào clipboard
  copy-prompt-button.tsx   # nút sinh + hiện + copy 1 prompt (dùng cho copy-prompt ý tưởng/dàn ý/caption)
components/calendar/
  month-grid.tsx           # lưới tháng (Server Component)
  post-card.tsx            # thẻ post: thumbnail + badge + đổi trạng thái + copy (Client)
public/uploads/            # ảnh upload (gitignore nội dung)
db/
  schema.ts                # Drizzle schema (brand, idea, post, asset)
  index.ts                 # Drizzle client (libSQL/Turso)
  migrate.ts               # chạy migration
lib/
  auth/
    config.ts              # thông tin đăng nhập + secret (env đè mặc định)
    token.ts               # ký/kiểm cookie HMAC (dùng cả trong proxy)
    session.ts             # tạo/xóa/đọc phiên qua cookie (server-only)
  json.ts                  # serialize/parse JSON text (pillars, hashtags...)
  date.ts                  # helper ngày local + lưới tháng
  post-status.ts           # hằng số + kiểu trạng thái/calendar (client dùng được)
  ai/
    claude-client.ts       # Anthropic client + hasApiKey + model id
    prompts.ts             # prompt VN + quy tắc nền tảng
    gemini-client.ts       # stub sinh ảnh + hasGeminiKey (gate)
  validations/             # zod schema (brand, generate)
components/ui/             # shadcn components
drizzle/                   # file migration sinh ra
```

## Deploy (chuẩn bị)

App là **local-first**; deploy public (vd Vercel) cần ba việc:

1. **Database** ✅ (đã chuyển sang libSQL/Turso — serverless, không cần dựng DB server): driver Drizzle dùng `drizzle-orm/libsql`. Cách dùng:
   - Local dev: giữ `DATABASE_URL=file:./local.db` (không cần token).
   - Turso: tạo DB free tại [turso.tech](https://turso.tech), rồi set `DATABASE_URL=libsql://<db>.turso.io` + `TURSO_AUTH_TOKEN=...`. Chạy `npm run db:push` (hoặc `db:migrate`) một lần để tạo bảng. Trên Vercel: thêm 2 biến này vào Environment Variables.
2. **Lưu ảnh** ⚠️ (chưa làm — vẫn là blocker cho Vercel): `public/uploads/` không bền trên serverless (filesystem read-only/ephemeral) → chuyển object storage (Cloudflare R2 / S3). Sửa `uploadAsset` ghi lên bucket, lưu URL vào `asset.path`. Cho tới khi xong, upload ảnh trên Vercel sẽ thất bại.
3. **Auth** ✅ (đã có cổng đăng nhập admin): xem mục **Đăng nhập** bên dưới. Trước khi mở public, đổi mật khẩu + đặt `SESSION_SECRET`.

**Bảo mật:** không commit key thật. `.env.local` đã được `.gitignore`; khi deploy dùng secret manager của nền tảng, không hardcode.

## Lộ trình

Xem `plans/20260617-content-creator-agent/plan.md`. **Hoàn thành v1:** Phase 1 (setup) · Phase 2 (Brand Profile) · Phase 3 (sinh nội dung AI) · Phase 4 (lịch nội dung) · Phase 5 (thư viện ảnh) · Phase 6 (polish & deploy prep). Mở rộng sau: sinh ảnh AI (Gemini), auth + Postgres + object storage để deploy.
