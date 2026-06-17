---
phase: 4
title: "Content Calendar"
status: pending
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
- [ ] Post hiện đúng ngày trên lịch
- [ ] Đổi ngày + trạng thái lưu DB
- [ ] Lọc theo nền tảng hoạt động
- [ ] Copy caption+hashtags ra clipboard

## Risk Assessment
- Tự build calendar dễ sa đà timezone/tuần. Mitigation: dùng `date-fns`, chuẩn hóa ngày local, giữ view tháng tối giản trước.
