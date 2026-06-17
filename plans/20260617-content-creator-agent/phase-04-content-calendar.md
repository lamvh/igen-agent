---
phase: 4
title: "Content Calendar"
status: completed
priority: P1
effort: "5-6h"
dependencies: [3]
---

# Phase 4: Content Calendar

## Overview
Bảng lịch nội dung: xếp các `post` vào ngày theo nền tảng, đổi trạng thái draft → scheduled → posted, copy caption để đăng thủ công.

## Requirements
- Functional: xem lịch tháng; gán `scheduledDate` cho post; lọc theo nền tảng; đổi trạng thái; nút copy caption + hashtags.
- Non-functional: thao tác mượt; không cần auto-post.

## Architecture
```
app/calendar/page.tsx       # view lịch tháng (grid ngày)
components/calendar/*        # ô ngày, thẻ post, badge nền tảng/trạng thái
app/actions/post.ts         # updatePostSchedule, updatePostStatus, listPosts
```
- Calendar render từ `post.scheduledDate`. Bắt đầu bằng grid tháng đơn giản (không cần lib nặng); kéo-thả là tùy chọn nâng cao.
- Badge màu theo platform + status.

## Related Code Files
- Create: `app/calendar/page.tsx`, `components/calendar/month-grid.tsx`, `components/calendar/post-card.tsx`, `app/actions/post.ts`
- Modify: `app/editor/[postId]/page.tsx` (thêm chọn ngày đăng), `app/page.tsx` (link)
- Delete: —

## Implementation Steps
1. Server actions trong `app/actions/post.ts`: `listPosts(month)`, `updatePostSchedule(id, date)`, `updatePostStatus(id, status)`.
2. `month-grid.tsx`: lưới 7xN theo tháng, render post-card vào đúng ngày.
3. `post-card.tsx`: hiện platform badge, status, snippet caption; menu đổi trạng thái + copy.
4. Bộ lọc theo nền tảng (facebook/instagram/tiktok/all).
5. Trong editor: thêm date picker gán `scheduledDate`, set status=scheduled.
6. Nút "Copy" ghép caption + hashtags vào clipboard cho đăng thủ công.
7. (Optional) kéo-thả đổi ngày — chỉ làm nếu còn thời gian.

## Success Criteria
- [x] Post hiện đúng ngày trên lịch (group theo dateKey local; verified round-trip)
- [x] Đổi ngày + trạng thái lưu DB (updatePostSchedule/updatePostStatus)
- [x] Lọc theo nền tảng hoạt động (?platform= validate qua PLATFORMS)
- [x] Copy caption+hashtags ra clipboard (có fallback khi không secure context)

## Risk Assessment
- Tự build calendar dễ sa đà timezone/tuần. Mitigation: **không dùng date-fns** (YAGNI cho view tháng), thay vào đó `lib/date.ts` chuẩn hóa **giờ local nhất quán** (store + query + render). VN không có DST nên an toàn.

## Completion Notes (Session 2026-06-17)
- Quyết định: bỏ kéo-thả (spec đánh dấu optional), bỏ date-fns (KISS).
- **Next 16 constraint gặp & sửa:** file `'use server'` chỉ được export async function. `POST_STATUSES` (const) + types tách sang `lib/post-status.ts` để client component import được; `calendar.ts` chỉ export async actions. (`export type` bị xóa lúc compile nên không vi phạm.)
- Calendar render từ `post.scheduledDate`; lưới 6 tuần, bắt đầu Thứ Hai (`(getDay()+6)%7`).
- Lên lịch trong editor (`schedule-control.tsx`) đặt status=scheduled; bỏ lịch → draft.
- Fixes sau code review:
  - **H1:** copy clipboard có optional-chain + `.catch` + thông báo fallback (secure-context/LAN HTTP).
  - **M1:** chặn `?y=`/`?m=` rỗng (Number("")===0 → lịch năm 0); chỉ nhận số nguyên dương.
  - **M2:** post-card hiện lỗi khi updatePostStatus thất bại (trước đó select "nói dối").
  - **M3:** revalidate cả `/editor/[postId]` khi đổi lịch/trạng thái.
- Verify: lint clean · build pass (/calendar + /editor dynamic) · smoke test schedule/list-by-month/status/unschedule + local-date round-trip OK.
- README cập nhật (tính năng /calendar + date picker editor, cấu trúc thư mục).

### Deferred (non-blocking, YAGNI cho local v1)
- Kéo-thả đổi ngày.
- L1: action không kiểm post tồn tại (update 0 row vẫn báo success) — vô hại single-user.
- L2: `parseDateInput` chấp nhận ngày tràn (vd 2026-02-31 → 03-03); `<input type=date>` không phát ra giá trị này.
- Chưa có test tự động (smoke thủ công).
