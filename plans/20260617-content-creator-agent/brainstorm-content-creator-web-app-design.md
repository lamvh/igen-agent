# Brainstorm — Content Creator Web App (Design v2)

> Ngày: 2026-06-17 · Trạng thái: **ĐÃ DUYỆT** · Tiếp theo: `/ck:plan`

## 1. Problem statement
Cần "content creator agent" cho **1 thương hiệu kinh doanh** của user: sinh **caption/bài tiếng Việt + ý tưởng/kế hoạch + ảnh AI (hoãn)**, quản lý **lịch đăng** cho Facebook/Instagram/TikTok (đăng thủ công). Đóng gói thành **web app** ngay từ đầu.

## 2. Yêu cầu (đã chốt)
- Hình thức: **Web app** (build ngay)
- Mức độ: **Sinh content + lịch đăng**, đăng thủ công (không auto-post)
- Nội dung: Text (VN) + Ý tưởng/kế hoạch + Ảnh AI (hoãn tới khi có Gemini key). **Không video.**
- Ngành: Kinh doanh/sản phẩm · Ngôn ngữ: Tiếng Việt · Quy mô: 1 brand, 1 user
- Triển khai: **Local trước, deploy sau**
- API key: **chưa có** ANTHROPIC_API_KEY & GEMINI_API_KEY

## 3. Approaches đã cân nhắc
- **A. Workflow ckm thuần (0 code):** nhanh nhất nhưng user muốn sản phẩm độc lập → loại cho mục tiêu chính (vẫn dùng song song để sinh content).
- **B. Web app riêng (CHỌN):** độc lập, UI riêng, dùng lâu dài. Tốn công hơn nhưng đúng nhu cầu.
- **C. Desktop/CLI:** loại — web hợp dashboard + calendar nhất, đa thiết bị.

## 4. Giải pháp chốt — Web app (Design v2)

### Tech stack
- Next.js (App Router) — full-stack 1 codebase
- SQLite + Drizzle ORM (deploy sau đổi Postgres, schema giữ nguyên)
- Claude API (sinh text VN) — cắm key sau
- Gemini API (sinh ảnh) — phase sau
- Tailwind + shadcn/ui
- Auth: chưa có ở v1; thêm `better-auth` khi deploy public

### Tính năng v1
- ✅ Brand Profile (1 brand)
- ✅ Idea Generator (theo pillar + nền tảng)
- ✅ Caption Editor (biến thể FB/IG/TikTok, sửa & lưu)
- ✅ Content Calendar (kéo-thả, trạng thái draft/scheduled/posted)
- ✅ Upload ảnh thủ công
- ⏸️ Hoãn: sinh ảnh AI (Gemini key), analytics, auth

### Phạm vi nền tảng
Hỗ trợ cả FB + IG + TikTok ngay qua enum `platform` (chi phí thêm ~0). UI generic → thêm nền tảng = thêm enum.

### Data model
```
Brand(id, name, industry, products, toneOfVoice, audience, pillars[])
Idea(id, brandId, title, pillar, platform, status)
Post(id, ideaId?, platform, caption, hashtags, scheduledDate, status, assetIds[])
Asset(id, type, path, prompt?, postId?)
-- platform: facebook|instagram|tiktok ; status(Post): draft|scheduled|posted ; type(Asset): image
```

## 5. Phases dự kiến
1. Setup (Next.js + Drizzle + SQLite + Tailwind/shadcn)
2. Brand Profile (schema + CRUD UI)
3. AI text generation (Claude API): idea generator + caption generator (multi-platform)
4. Content Calendar / scheduler UI
5. Asset Library + upload ảnh thủ công (image-gen gated theo Gemini key)
6. Polish + hướng dẫn cắm API key + chuẩn bị auth/deploy

## 6. Success metrics (v1)
Tạo brand profile → sinh ý tưởng theo pillar → sinh caption VN cho 3 nền tảng → xếp lên calendar → copy đăng thủ công. App chạy local không lỗi.

## 7. Risks & assumptions
- Cần ANTHROPIC_API_KEY cho phần sinh text → thiết kế cho cắm key runtime; trước đó editor vẫn dùng thủ công.
- Sinh ảnh AI hoãn tới khi có GEMINI_API_KEY.
- Không auto-post (cần app review FB/IG/TikTok) — để giai đoạn rất sau.
- SQLite → Postgres khi deploy: dùng Drizzle để migrate dễ.

## 8. Unresolved questions
- Tên/ngành/sản phẩm cụ thể của thương hiệu (đầu vào brand profile) — user cung cấp khi cook.

## 9. Validation decisions (2026-06-17)
- Model AI: **claude-opus-4-8** (ưu tiên chất lượng).
- Idea generation: sinh **lẻ từng ý tưởng** theo pillar (không batch tháng ở v1).
- Export lịch CSV/ICS: **chưa làm** ở v1 (chỉ copy thủ công).
