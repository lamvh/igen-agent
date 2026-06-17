# Content Creator Agent — Skill Commands Playbook

> Tài liệu: danh sách lệnh skill / slash command để xây + vận hành "content creator agent".
> Dự án: web app sinh content + lịch đăng cho 1 thương hiệu (tiếng Việt, ngành kinh doanh/sản phẩm).
> Ngày: 2026-06-17. Trạng thái thiết kế: **ĐÃ DUYỆT (v2)** → chuyển sang `/ck:plan`.
> Design doc: `brainstorm-content-creator-web-app-design.md` (cùng thư mục).

---

## A. Tóm tắt quyết định (đã chốt)

| Mục | Quyết định |
|---|---|
| Hình thức | Web app (build ngay từ đầu) |
| Mức độ | Sinh content + quản lý lịch đăng (đăng thủ công, **không** auto-post) |
| Nội dung | Text (caption/bài) + Hình ảnh AI (hoãn) + Ý tưởng/kế hoạch. **Không video.** |
| Ngành | Kinh doanh / sản phẩm |
| Ngôn ngữ | Tiếng Việt |
| Quy mô | 1 thương hiệu, 1 user |
| Stack | Next.js (App Router) + SQLite + Claude API (text) + Gemini API (ảnh, sau) + Tailwind/shadcn |
| API key | Chưa có ANTHROPIC_API_KEY, chưa có GEMINI_API_KEY |

---

## B. Playbook — Lệnh skill để BUILD app (theo thứ tự)

### Bước 1 — Lập kế hoạch
```
/ck:plan   (truyền design doc này làm context)
```
- Tạo plan theo phase trong `plans/`. Dùng bản default (feature mới, chưa có test cũ).
- Sau khi có plan: `/ck:plan:validate` để soi câu hỏi còn thiếu (tùy chọn).

### Bước 2 — Khởi tạo dự án + tài liệu
```
/ckm:docs:init        # tạo docs/ ban đầu cho codebase
```
- Skill nền: `web-frameworks` (Next.js App Router), `databases` (SQLite schema).

### Bước 3 — Thực thi theo plan
```
/ck:cook <đường-dẫn-phase>      # implement từng phase
```
- Skill domain kích hoạt trong lúc cook:
  - `frontend-development` — component React/TypeScript
  - `ui-styling` — Tailwind + shadcn/ui
  - `frontend-design` — dựng UI từ mockup nếu cần
  - `databases` — schema + query SQLite (Drizzle/Prisma)
  - `backend-development` — API routes Next.js
  - `claude-api` — tích hợp Claude API sinh text (BẮT BUỘC đọc trước khi code phần gọi Claude)
  - `ai-multimodal` / `ai-artist` — sinh ảnh qua Gemini (phase sau)

### Bước 4 — Kiểm thử + review
```
/ck:test            # chạy test
/ck:code-review     # review chất lượng
```

### Bước 5 — Deploy (khi xong v1)
```
/ck:deploy          # auto-detect (Vercel hợp Next.js nhất)
```

### Bước 6 — Ghi nhật ký
```
/ck:journal
```

---

## C. Playbook — Lệnh skill để VẬN HÀNH content (sau khi có app, hoặc dùng song song ngay)

> Các lệnh này sinh content **ngay trong Claude Code** — dùng được trước cả khi app xong.

### Thiết lập thương hiệu
```
/ckm:init            # khởi tạo marketing project + brand
/ckm:persona         # xây chân dung khách hàng
```

### Sinh ý tưởng & kế hoạch
```
/ckm:campaign:create     # chiến dịch + content calendar
/ckm:plan                # kế hoạch nội dung
/ckm:competitor          # phân tích đối thủ (tùy chọn)
```

### Viết content
```
/ckm:social              # post đa nền tảng (FB/IG/TikTok)
/ckm:write:good          # caption/bài chất lượng (tiếng Việt)
/ckm:write:formula       # dùng công thức AIDA/PAS/BAB
/ckm:email               # nếu cần email (tùy chọn)
```
- Skill nền: `copywriting`, `social`, `content-marketing`, `marketing-psychology`.

### Sinh hình ảnh (cần GEMINI_API_KEY)
```
/ai-artist               # mockup/visual với Nano Banana
```
- Hoặc skill `ai-multimodal` cho Imagen/Nano Banana.

### Lịch đăng & quản lý
```
/ckm:social:schedule     # lên lịch đăng
/ckm:dashboard           # dashboard marketing trên browser
/ckm:hub                 # Content Hub — thư viện asset
```

### Báo cáo
```
/ckm:analyze:report      # báo cáo hiệu suất (khi đã đăng)
```

---

## D. Việc cần chuẩn bị (bạn làm)

- [ ] Lấy **ANTHROPIC_API_KEY** tại console.anthropic.com → để app gọi Claude sinh text.
- [ ] Lấy **GEMINI_API_KEY** tại aistudio.google.com → để sinh ảnh (giai đoạn sau).
- [ ] Quyết định tên thương hiệu + ngành + sản phẩm cụ thể (đầu vào cho brand profile).

---

## E. Câu hỏi mở (chờ bạn chốt để hoàn thiện thiết kế)

1. Bạn muốn **chỉnh gì** trong thiết kế web app? (tính năng / stack / data model)
2. Có cần **đa nền tảng ngay** (FB+IG+TikTok) hay làm 1 nền tảng trước?
3. App chạy **local cá nhân** hay sẽ **deploy public** (ảnh hưởng việc cần auth)?
