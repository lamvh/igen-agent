---
title: Content Creator Web App
description: ''
status: completed
priority: P2
branch: ''
tags: []
blockedBy: []
blocks: []
created: '2026-06-16T23:29:08.805Z'
createdBy: 'ck:plan'
source: skill
---

# Content Creator Web App

## Overview

Web app sinh content + quản lý lịch đăng cho **1 thương hiệu kinh doanh** (tiếng Việt). Sinh caption/bài + ý tưởng/kế hoạch (Claude API), upload ảnh thủ công (sinh ảnh AI hoãn tới khi có Gemini key). Hỗ trợ FB/IG/TikTok qua enum `platform`. Đăng thủ công (không auto-post). Local-first, deploy sau.

**Stack:** Next.js (App Router) · SQLite + Drizzle ORM · Claude API · Tailwind + shadcn/ui · chưa auth (v1).

**Design doc:** [brainstorm-content-creator-web-app-design.md](./brainstorm-content-creator-web-app-design.md) · **Playbook:** [skill-commands-playbook.md](./skill-commands-playbook.md)

**Prerequisites:** Node 18+. ANTHROPIC_API_KEY (cắm runtime cho Phase 3; trước đó editor dùng thủ công). GEMINI_API_KEY (Phase 5, optional).

## Phases

| Phase | Name | Status |
|-------|------|--------|
| 1 | [Setup Next.js + DB](./phase-01-setup-next-js-db.md) | Completed |
| 2 | [Brand Profile](./phase-02-brand-profile.md) | Completed |
| 3 | [AI Text Generation](./phase-03-ai-text-generation.md) | Completed |
| 4 | [Content Calendar](./phase-04-content-calendar.md) | Completed |
| 5 | [Asset Library](./phase-05-asset-library.md) | Completed |
| 6 | [Polish & Deploy Prep](./phase-06-polish-deploy-prep.md) | Completed |

## Dependencies

<!-- Cross-plan dependencies -->

## Validation Log

### Session 1 — 2026-06-17

**Verification Results**
- Tier: Full (6 phases) → nhưng dự án greenfield, mọi file là "Create" → không có codebase/symbol để grep đối chiếu.
- Claims checked: 0 verifiable (no existing code) · Failed: 0 · Unverified: 0.

**Quyết định đã chốt:**
1. **Model AI:** `claude-opus-4-8` (Opus) cho sinh ý tưởng + caption — ưu tiên chất lượng. → Phase 3 cập nhật.
2. **Idea generation:** sinh lẻ từng ý tưởng theo pillar (không batch cả tháng ở v1). → Phase 3 giữ nguyên.
3. **Export lịch (CSV/ICS):** chưa làm ở v1, chỉ copy thủ công. → Phase 4 giữ nguyên; bỏ khỏi unresolved questions.

### Whole-Plan Consistency Sweep
- Đã rà `plan.md` + 6 phase: không còn tham chiếu "sonnet" (Phase 3 đã đổi sang opus, gồm cả mục Risk). Không có thuật ngữ/contract mâu thuẫn. Export đã được loại khỏi câu hỏi mở trong design doc.
- Kết quả: **0 mâu thuẫn còn lại.**
