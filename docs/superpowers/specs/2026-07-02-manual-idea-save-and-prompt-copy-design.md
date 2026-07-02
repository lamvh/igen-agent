# Lưu ý tưởng thủ công + Copy prompt cho Claude app + Nền tảng Website/Blog

**Ngày:** 2026-07-02
**Trạng thái:** Đã duyệt thiết kế (chờ review spec)

## Bối cảnh & Mục tiêu

Hiện app chỉ tạo được nội dung khi có `ANTHROPIC_API_KEY` (ý tưởng, dàn ý, caption đều gọi Claude API). Thiếu key thì gần như không dùng được luồng sáng tạo.

Mục tiêu: cho phép dùng app **không tốn token API** bằng cách (1) lưu ý tưởng thủ công, và (2) xuất *text prompt* để người dùng copy sang **Claude app** (claude.ai / desktop) rồi dán kết quả ngược lại. API vẫn giữ nguyên như một lựa chọn song song. Thêm nền tảng **Website/Blog** bên cạnh Facebook/Instagram/TikTok.

Nguyên tắc: **KISS/YAGNI/DRY**. Không đổi schema, không migration. Tái dùng tối đa component & action sẵn có.

## Phát hiện quan trọng (đã có sẵn — tái dùng)

- Chỗ **dán kết quả ngược lại** đã tồn tại:
  - Outline: `OutlineEditor` (textarea + "Lưu dàn ý" → `saveIdeaOutline`).
  - Caption: `CaptionEditor` (textarea + "Lưu caption" → `saveCaption`).
- `CopyButton` (`components/shell/copy-button`) đã có (copy clipboard + fallback).
- Hàm dựng prompt thuần đã có trong `lib/ai/prompts.ts`: `ideaPrompt`, `outlinePrompt`, `captionPrompt`. Hiện chỉ chạy server-side trong lời gọi API.
- `Platform` là union `"facebook" | "instagram" | "tiktok"`; các map `PLATFORM_LABELS`, `PLATFORM_RULES`, `ASPECT`, `PLATFORM_BADGE` là `Record<Platform, …>` **toàn phần** → thêm `"blog"` sẽ khiến TypeScript báo lỗi tại mọi chỗ thiếu case (compiler chặn sót).

## Cách tiếp cận đã chọn

**Server action trả về chuỗi prompt** (không gọi API, không tính token, không ghi `usageLog`). Dùng lại đúng các hàm `*Prompt` để prompt-copy = prompt-API. Không truyền dữ liệu brand ra client, không nhân đôi logic prompt.

Đã cân nhắc & loại: (B) build prompt trên browser — lộ brand ra client + import logic vào bundle; (C) precompute ở server component — không hợp với prompt phụ thuộc lựa chọn động (pillar/nền tảng/độ dài).

## Yêu cầu chi tiết

### 1. Ý tưởng — thủ công HOẶC API
- Form thêm ý tưởng thủ công ở đầu `/ideas`: **Tiêu đề** (bắt buộc) + **Content pillar** (tùy chọn, chọn từ `brand.pillars`; cho nhập tay nếu chưa có pillar).
- Action `createIdeaManual(formData)`: validate title không rỗng, cần có brand → insert `idea` (title, pillar, status `"draft"`). Không gọi API.
- Form thủ công **luôn hiện** dù thiếu API key. Form `IdeasGenerator` (API) giữ nguyên; tách gate để form thủ công không bị ẩn cùng.

### 2. Dàn ý — API + Copy prompt
- Giữ `generateOutline` (API, đã bám tone/config brand qua `brandContext`).
- Thêm nút **"Copy prompt dàn ý"** trong `OutlineEditor` → action `buildOutlinePrompt(ideaId)` trả chuỗi từ `outlinePrompt(brand, idea.title)`; copy bằng `CopyButton`. Nút hiện *bất kể* API key. Dán kết quả vào textarea outline → "Lưu dàn ý".

### 3. Content/caption — API HOẶC Copy prompt
- Giữ nút sinh caption bằng API (`generateCaption`, `generateCaptionForPlatform`, `regenerateCaption`).
- Thêm nút **"Copy prompt caption"** trong `CaptionEditor` → action `buildCaptionPrompt(postId)` trả chuỗi từ `captionPrompt(brand, ideaTitle, platform, outline, length)` theo đúng platform của post. Hiện *bất kể* API key.

### 4. Lưu caption từ nguồn ngoài (không API)
- Vấn đề: post hiện chỉ được tạo qua API.
- Thêm nút **"Tạo nháp trống"** (chọn platform) trong panel ý tưởng (`CaptionCreator`) → action `createEmptyPost(ideaId, platform)` tạo `post` caption rỗng, status `"draft"`, chặn trùng platform như `generateCaptionForPlatform` → mở/điều hướng editor. Không cần API key.
- Trong editor: copy prompt caption → dùng Claude app → dán vào textarea caption → "Lưu caption" (đã có).

### 5. Nền tảng Website/Blog
- Thêm `"blog"` vào `Platform` và `PLATFORMS`.
- `PLATFORM_LABELS.blog = "Website/Blog"`.
- `PLATFORM_RULES.blog`: bài dài dạng blog/SEO, có mở bài–thân bài–kết, giọng chuẩn brand, ít hoặc không hashtag.
- `ASPECT.blog`: tỉ lệ ảnh bìa (vd `aspect-[16/9]`).
- `PLATFORM_BADGE.blog`: màu badge riêng.
- `post-preview.tsx`: thêm biến thể preview **"bài viết/blog"** (tiêu đề + thân bài, bỏ hành động social tim/share). Blog dùng `idea.title` làm tiêu đề, `caption` làm thân bài. **Không thêm cột DB.**
- Bộ lọc nền tảng ở `/posts`, `/calendar`, `components/calendar/post-card.tsx` thêm mục Website/Blog (đa số tự có nhờ dùng `PLATFORMS`/labels).

## Kiến trúc & Data flow

- Không đổi `db/schema.ts`. Blog = giá trị `post.platform` mới; tiêu đề blog lấy từ `idea.title`.
- Action build-prompt: `(...args) => Promise<{ success: boolean; message: string; prompt?: string }>`; thiếu brand → `success:false, message:"Vui lòng tạo Brand Profile trước."`. Không `logUsage`.
- Client: bấm nút → gọi action → nhận `prompt` → hiển thị + `CopyButton`. Xử lý pending/error như các nút hiện có (`useTransition`).

## Files sẽ sửa/tạo

- `lib/ai/prompts.ts` — thêm platform `blog` + rule (hàm prompt thuần đã có).
- `app/actions/generate.ts` — `buildIdeaPrompt`, `buildOutlinePrompt`, `buildCaptionPrompt` (không API).
- `app/actions/post.ts` — `createIdeaManual`, `createEmptyPost`.
- `app/ideas/page.tsx` — bỏ gate ẩn form thủ công khi thiếu key.
- `app/ideas/ideas-generator.tsx` — form thủ công + copy prompt ý tưởng.
- `app/ideas/idea-actions.tsx` — `CaptionCreator` thêm "Tạo nháp trống".
- `app/ideas/idea-card.tsx` — copy prompt outline trong `OutlineEditor`.
- `app/editor/[postId]/caption-editor.tsx` — copy prompt caption.
- `app/editor/[postId]/post-preview.tsx` — preview blog.
- `app/posts/page.tsx`, `app/calendar/page.tsx`, `components/calendar/post-card.tsx` — badge/filter blog.

## Success Criteria

- Không có `ANTHROPIC_API_KEY`: tạo được ý tưởng thủ công; copy được prompt ý tưởng/dàn ý/caption; tạo nháp trống + dán & lưu caption; chọn/lưu nội dung platform Website/Blog. App không crash.
- Có key: mọi luồng API cũ hoạt động như trước; nút copy-prompt hiện song song.
- Prompt copy giống hệt prompt mà API dùng (cùng hàm `*Prompt`).
- `npm run lint` + build TypeScript pass (compiler xác nhận đủ case blog).
- Không có file migration mới.

## Rủi ro & Giảm thiểu

- **Sót case blog** trong các `Record<Platform,…>` → TypeScript báo lỗi build, sửa hết trước khi merge.
- **Nút copy hiện cả khi chưa có brand** → action trả lỗi thân thiện, không crash.
- **Trùng post khi tạo nháp trống** → tái dùng logic chặn trùng platform của `generateCaptionForPlatform`.
- **Prompt injection** từ text brand/idea nhúng thẳng — chấp nhận cho bản local single-user (đã ghi chú trong `prompts.ts`); không mở rộng phạm vi ở đợt này.

## Ngoài phạm vi (YAGNI)

- Copy-prompt cho prompt ảnh (Gemini) — đã có nút tạo bằng API, không thêm copy-prompt đợt này.
- Round-trip tự parse JSON kết quả từ Claude app (người dùng dán text thủ công).
- Cột tiêu đề riêng cho blog.

## Câu hỏi tồn đọng

- Không có. (Đã chốt: giữ copy-prompt cho outline; blog dùng `idea.title` làm tiêu đề.)
