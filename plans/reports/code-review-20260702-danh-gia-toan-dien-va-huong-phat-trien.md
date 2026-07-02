# Báo cáo Đánh giá Source Code & Hướng Phát triển — igen-agent

**Ngày:** 2026-07-02 · **Phạm vi:** Toàn bộ codebase (68 file TS/TSX, ~6.350 dòng, không tính shadcn/ui)
**Phương pháp:** 3 reviewer độc lập chạy song song (Bảo mật/Auth · Data layer/AI · Frontend/UX) + kiểm chứng build/lint thực tế.

---

## 1. Tổng quan dự án

Web app sinh nội dung + quản lý lịch đăng cho 1 thương hiệu (tiếng Việt), local-first, đang chuẩn bị deploy public.

- **Stack:** Next.js 16 (App Router) · React 19 · libSQL/Turso + Drizzle ORM · Tailwind 4 + shadcn/ui · zod · Claude API (`claude-opus-4-8`)
- **Tiến độ:** 21 commits trong ~2 tuần (17/06 → 02/07), đã hoàn thành v1 (6 phases theo plan). Đang có ~272 dòng chưa commit (tính năng lưu ý tưởng thủ công + copy prompt).

## 2. Kết quả kiểm chứng

| Hạng mục | Kết quả |
|----------|---------|
| `npm run build` (production) | ✅ Pass — compile 2.3s, TypeScript pass |
| `tsc --noEmit` | ✅ Pass |
| `npm run lint` | ⚠️ 4 lỗi `react-hooks/set-state-in-effect` (3 ở `caption-editor.tsx:53,56,68`, 1 ở `ideas-list.tsx:44`) |
| Unit/integration tests | ❌ Chưa có test nào |

## 3. Đánh giá tổng thể

**Điểm chung: 7/10 cho giai đoạn v1 local-first. Chưa sẵn sàng deploy public** cho tới khi vá 2 lỗi Critical về auth.

| Hạng mục | Điểm | Nhận xét |
|----------|------|----------|
| Kiến trúc | 8/10 | RSC boundaries chuẩn, server actions, client islands đúng chỗ |
| Bảo mật | 4/10 | Crypto tốt nhưng mô hình authorization hỏng khi deploy public |
| Data layer | 7.5/10 | Tránh N+1 chủ động, transaction đúng chỗ; thiếu index, 1 bug LIKE |
| AI integration | 7.5/10 | Structured outputs + zod, usage logging tốt; error boundary chưa nhất quán |
| Frontend/UX | 7/10 | useActionState + revalidatePath nhất quán; vài bug optimistic-state |
| Chất lượng code | 7/10 | TS đầy đủ, không `any`; 2 file vượt xa quy tắc 200 dòng |
| Kiểm thử | 2/10 | Không có test |

### Điểm mạnh nổi bật (đã xác minh)

- **Crypto đúng chuẩn:** HMAC verify dùng `crypto.timingSafeEqual` (`lib/auth/token.ts:34-36`); cookie `httpOnly` + `secure` + `sameSite: lax` + kiểm expiry.
- **API key không bao giờ lộ ra client** — mọi lời gọi Claude ở server action; `testClaudeKey` chỉ trả boolean.
- **Không SQL injection** — toàn bộ qua Drizzle parameterized queries; ID được validate `Number.isInteger` + allowlist enum ở mọi action.
- **Tránh N+1 chủ động:** batch `inArray` ở `listIdeas`/`listAllPosts`/`listScheduledPosts`; pagination `limit+1`.
- **`safeRead` fallback** (`db/index.ts:39-47`) scope đúng chỉ cho read, xử lý đúng bẫy empty-string.
- **Structured outputs** (zodOutputFormat) + null-guard mọi lời gọi Claude — không lo JSON hỏng.
- **Usage logging cách ly lỗi** (`lib/ai/usage.ts:34-44`) — telemetry hỏng không làm hỏng generation.
- **Upload an toàn về path:** tên file `randomUUID()` + extension ép từ MIME map → không path traversal.
- **Form UX nhất quán:** `useActionState` + `pending` + `aria-live="polite"` trên mọi form.

## 4. Phát hiện theo mức độ

### 🔴 Critical (chặn deploy public — phải sửa trước)

| # | Vấn đề | Vị trí |
|---|--------|--------|
| C1 | **Server actions KHÔNG kiểm tra session.** `getSession()` chỉ được gọi duy nhất ở `app/login/page.tsx:14`. Toàn bộ mutation (delete/upload/save/generate/upsertBrand...) chỉ dựa vào redirect của `proxy.ts` — docs Next.js 16 ghi rõ proxy "không dùng làm authorization". Kẻ tấn công chưa đăng nhập có thể POST action-id tới `/login` (route public) và gọi bất kỳ mutation nào. | `app/actions/*.ts`, `proxy.ts:11` |
| C2 | **Credentials mặc định `admin/admin` + `SESSION_SECRET` fallback nằm trong source.** Deploy public quên set env → ai cũng đăng nhập được, tệ hơn: secret công khai cho phép **giả mạo token hợp lệ** vượt qua cả proxy. | `lib/auth/config.ts:10-15` |

**Cách sửa:** thêm `requireSession()` ở đầu mọi mutating action (hoặc DAL tập trung); production thiếu `SESSION_SECRET`/`AUTH_PASSWORD` thì throw ngay lúc boot thay vì fallback.

### 🟠 High

| # | Vấn đề | Vị trí |
|---|--------|--------|
| H1 | Không rate-limit login → brute-force tự do với 1 tài khoản admin đoán được | `app/actions/auth.ts:14-25` |
| H2 | Password so sánh plaintext, non-constant-time (`!==`) | `app/actions/auth.ts:18` |
| H3 | **Bug chức năng:** `escapeLike` vô hiệu — Drizzle `like()` không phát `ESCAPE` clause, backslash thành ký tự literal → tìm kiếm chứa `%`/`_` trả kết quả sai/rỗng | `app/actions/post.ts:150,155,159` |
| H4 | Ghi DB **sau khi** gọi Claude không bọc try/catch → lỗi ghi (Turso hiccup) trả 500 thô, **mất kết quả đã tốn token** | `app/actions/generate.ts:235,253,290,344,407` |
| H5 | Toggle tag fire-and-forget, không rollback/không báo lỗi → UI lệch DB âm thầm | `app/ideas/idea-actions.tsx:168-170` |
| H6 | Post không có idea → `ideaId ?? 0` → nút generate "chết" luôn fail | `app/editor/[postId]/page.tsx:62`, `editor-workspace.tsx:188` |
| H7 | Lỗi lên lịch hiển thị **màu xanh như thành công**; clear ngày optimistic không rollback | `app/editor/[postId]/schedule-control.tsx:33-38,64-66` |

### 🟡 Medium (nợ kỹ thuật nên xử lý sớm)

1. **Không có index nào** ngoài PK — hot columns: `idea.brand_id`, `post.idea_id/status/platform/scheduled_date` (`db/schema.ts`, toàn bộ migrations).
2. **Query không giới hạn:** `listAllPosts` không `.limit()`; `removeBrandTag`/`deleteAsset` select toàn bảng rồi loop (`post.ts:267`, `brand.ts:146`, `asset.ts:91`).
3. **Date helper phụ thuộc timezone runtime** (`lib/date.ts:7-33`) — hiện chạy đúng "nhờ may" (ICT +7); server UTC + user offset âm sẽ lệch ngày trên lịch. Nên lưu `YYYY-MM-DD` dạng text.
4. **Vi phạm quy tắc 200 dòng:** `generate.ts` (526), `idea-card.tsx` (484), `post.ts` (439), `idea-actions.tsx` (294) — đều có ranh giới tách rõ (chi tiết mục 6).
5. **Kéo post trên lịch âm thầm hạ cấp `posted` → `scheduled`/`draft`** — mất lịch sử đã đăng (`app/actions/calendar.ts:52-59`).
6. **DRY:** `PLATFORM_COLOR`/`STATUS_LABEL`/`selectClass` lặp 3 nơi và đã bắt đầu lệch nhau → gom vào `lib/platform-ui.ts`.
7. **Optimistic-state bugs:** asset-picker rollback dùng stale closure (`asset-picker.tsx:41-51`); pagination dedup sót trùng cross-page → duplicate React key (`ideas-list.tsx:50-53`).
8. **A11y:** tab bar editor thiếu `role="tablist"`/`aria-selected` (`editor-workspace.tsx:159`); card lồng button trong `role="button"` (`idea-card.tsx:290`); toggle thiếu `aria-pressed`.
9. Upload chỉ tin MIME client, chưa check magic bytes (`asset.ts:38`) — impact thấp vì extension bị ép, nhưng nên thêm.

### ⚪ Low (ghi nhận, sửa khi tiện)

- `asset.post_id` là cột chết — linkage thực nằm ở `post.assetIds` JSON; hai thiết kế cạnh tranh (`db/schema.ts:95`).
- Image-prompt log usage sai `kind:"caption"` → thống kê chi phí lệch (`generate.ts:210`).
- Anthropic client không set `timeout` — default SDK 10 phút vượt limit serverless (`claude-client.ts:26`).
- `getBrand()` gọi lặp 2 lần trong 1 flow (`generate.ts:200,361`).
- Comment schema còn ghi "3 nền tảng" trong khi đã thêm `blog`; `toPlatform` silent-fallback về `facebook`.
- Regenerate âm thầm xóa bản sửa tay chưa lưu (outline/caption) — nên confirm khi dirty.
- `/uploads/*` phục vụ không cần auth (giảm nhẹ bởi tên UUID); copy-button nuốt lỗi clipboard; dialog xóa nhóm post không nói rõ chỉ xóa 1 bài.
- TOCTOU race trên `upsertBrand`/tags/outline — chấp nhận được khi single-user.

## 5. Đánh giá mức độ phát triển hiện tại

**Giai đoạn: v1 hoàn chỉnh về tính năng, chất lượng nền tảng tốt, chưa production-ready.**

- ✅ Đủ vòng đời nội dung: Brand → Ý tưởng → Dàn ý (có version history) → Caption đa nền tảng → Lịch → Ảnh.
- ✅ Điểm khác biệt tốt: **chế độ không cần API key** (copy-prompt sang Claude app) — giảm rào cản chi phí, phù hợp người dùng cá nhân VN.
- ✅ Velocity cao: 6 phases trong 2 tuần, plan/docs kỷ luật.
- ⚠️ Ba khoảng trống hệ thống: **(1) authorization, (2) test = 0, (3) ảnh chưa lên object storage** (blocker Vercel — upload sẽ fail trên serverless, đã ghi nhận trong README).

## 6. Hướng phát triển tương lai (đề xuất)

### Giai đoạn 1 — Vá bảo mật & bug chức năng (1–2 ngày, TRƯỚC deploy)

1. `requireSession()` cho mọi mutating server action (C1).
2. Fail-fast khi production thiếu `SESSION_SECRET`/`AUTH_PASSWORD`; bỏ default secret (C2).
3. Rate-limit login + hash password (H1, H2).
4. Sửa `escapeLike` bằng `sql\`... LIKE ${p} ESCAPE '\\'\`` (H3); bọc try/catch các DB-write sau lời gọi Claude (H4).
5. Sửa 3 bug UI: tag rollback, `ideaId ?? 0`, schedule error màu xanh (H5–H7). Sửa 4 lỗi lint.

### Giai đoạn 2 — Sẵn sàng deploy Vercel (3–5 ngày)

1. **Object storage cho ảnh** (Cloudflare R2/S3): sửa `uploadAsset` ghi bucket, lưu URL vào `asset.path` — blocker cuối cùng theo README.
2. Thêm index cho `idea.brand_id`, `post.(idea_id, status, platform, scheduled_date)`.
3. Set `timeout` 60–120s cho Anthropic client; chuẩn hóa `scheduledDate` sang text `YYYY-MM-DD` (tránh bug timezone).
4. Guard không hạ cấp post `posted` khi kéo lịch (hoặc confirm).
5. **Test tối thiểu:** unit cho `lib/date.ts`, `lib/json.ts`, `escapeLike`, auth token; integration cho 3 server action quan trọng (generate, saveCaption, uploadAsset). Vitest phù hợp stack này.

### Giai đoạn 3 — Trả nợ kỹ thuật (song song, ~1 tuần)

1. Tách file lớn: `generate.ts` → coercion helpers + `prompt-copy.ts` + image-prompt module; `post.ts` → tách `idea.ts`; `idea-card.tsx` → 3 component con.
2. Gom `PLATFORM_COLOR`/`STATUS_LABEL` vào `lib/platform-ui.ts`; hợp nhất copy-button.
3. A11y pass (tablist, aria-pressed, card semantics).
4. Dọn schema: bỏ cột chết `asset.post_id`, thêm `kind:"image"` cho usage log, cập nhật comment platform.

### Giai đoạn 4 — Tính năng mới (theo lộ trình README + đề xuất thêm)

| Tính năng | Giá trị | Ghi chú |
|-----------|---------|---------|
| **Sinh ảnh AI (Gemini/Nano Banana)** | Cao — nút đã chờ sẵn, `imagePrompt` đã có trong schema | Hoàn thiện `gemini-client.ts` stub; ảnh sinh ra ghi thẳng lên R2 (làm sau Giai đoạn 2) |
| **Dashboard chi phí AI** | Trung | `usage_log` đã có dữ liệu — chỉ cần trang thống kê token/chi phí theo ngày/kind |
| Xuất lịch (ICS/CSV) + nhắc đăng bài | Trung | Local-first, không cần tích hợp API mạng xã hội |
| Multi-brand | Trung-thấp | Schema đã có `brandId` sẵn — chủ yếu là UI switcher + sửa các race TOCTOU |
| Auto-post qua API (FB/IG) | Thấp trước mắt | Chi phí duyệt app Meta cao; copy-thủ-công đang là lựa chọn đúng |
| Phân tích hiệu quả bài đăng | Sau cùng | Cần auto-post hoặc nhập số liệu tay trước |

**Định hướng kiến trúc dài hạn:** giữ triết lý local-first + single-brand đơn giản (YAGNI đang được tuân thủ tốt). Chỉ chuyển Postgres/multi-tenant khi thực sự có nhu cầu nhiều người dùng — libSQL/Turso hiện tại đủ tốt và đã serverless-ready.

## 7. Câu hỏi chưa giải quyết

1. Deploy public là multi-user thật hay vẫn single-admin? (quyết định độ ưu tiên H2)
2. Kéo post `posted` trên lịch có chủ đích hạ về `scheduled` không, hay là bug UX?
3. Xóa "nhóm bài" ở `/posts` chỉ xóa bài đại diện — đúng ý đồ hay cần xóa cả nhóm?
4. Nền tảng `blog` đã rollout đủ mọi nơi (editor tabs, dedup) hay đang chuyển tiếp?
