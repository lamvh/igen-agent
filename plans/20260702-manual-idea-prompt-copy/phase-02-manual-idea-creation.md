---
phase: 2
title: "Manual idea creation"
status: completed
priority: P1
effort: "1.5h"
dependencies: [1]
---

# Phase 2: Manual idea creation

## Context Links
- Spec §1 "Ý tưởng — thủ công HOẶC API".
- `app/actions/post.ts` (server actions; will add `createIdeaManual`).
- `app/actions/generate.ts:91-107` (`generateIdeas` — validation + option parsing pattern to mirror).
- `app/ideas/page.tsx:73` (renders `IdeasGenerator`), `app/ideas/ideas-generator.tsx` (AI form, currently early-returns when `!hasApiKey`).
- `db/schema.ts:37-57` (`idea` table: `brandId` NOT NULL, `title` NOT NULL, `pillar` nullable, `status` default `"draft"`).

## Overview
- **Priority:** P1.
- **Status:** pending.
- Add a small always-visible form to create an idea **without any API call**: Title (required) + Content pillar (optional; pick from `brand.pillars` or free-type). Inserts one `idea` row (`status:"draft"`).

## Key Insights
- `idea.brandId` is `NOT NULL` (`schema.ts:39-41`) → action must resolve `getBrand()` and reject if none.
- `idea.outlineVersions` default `"[]"`, `idea.tags` default `"[]"` → manual insert may omit them (DB defaults apply). Only supply `brandId`, `title`, `pillar`, `status`.
- The existing AI form (`ideas-generator.tsx:36-44`) hard-hides itself when `!hasApiKey`. The manual form must be a **separate component** so it renders unconditionally and does not collide with Phase 3's edits to `ideas-generator.tsx` (file-ownership separation).
- `revalidatePath("/ideas")` refreshes the SSR idea list after insert (same pattern as `generateIdeas:137`).

## Requirements
- Functional: create idea from title(+optional pillar) with zero token cost; new idea appears in the list; works with no API key.
- Non-functional: validate title non-empty server-side (public endpoint); friendly error if no brand.

## Architecture
Data flow: `ManualIdeaForm` (client, `useActionState`) → `createIdeaManual(prev, formData)` → validate title + `getBrand()` → `db.insert(idea)` → `revalidatePath("/ideas")` → `{success,message}`. Reuses `GenerateState`-shaped return for UI consistency.

Signature (mirrors `saveCaption`/`generateIdeas` `useActionState` shape):
`createIdeaManual(_prev: {success:boolean;message:string}, formData: FormData) => Promise<{success:boolean;message:string}>`.

## Related Code Files
**Modify**
- `app/actions/post.ts` — add `createIdeaManual`. *(Shared with Phase 4 — sequential.)*
- `app/ideas/page.tsx` — render `<ManualIdeaForm pillars={brand.pillars} />` above `<IdeasGenerator>` (inside the `brand` branch, ungated by `keyAvailable`).

**Create**
- `app/ideas/manual-idea-form.tsx` — client component (`"use client"`, `useActionState`).

**Delete** — none.

## Implementation Steps
1. `app/actions/post.ts`: add
   ```ts
   export async function createIdeaManual(
     _prev: { success: boolean; message: string },
     formData: FormData,
   ): Promise<{ success: boolean; message: string }> { … }
   ```
   - `const title = String(formData.get("title") ?? "").trim();` → if empty return `{success:false, message:"Vui lòng nhập tiêu đề ý tưởng."}`.
   - `const brand = await getBrand();` → if null return `{success:false, message:"Vui lòng tạo Brand Profile trước."}`.
   - `const pillar = String(formData.get("pillar") ?? "").trim() || null;`
   - `await db.insert(idea).values({ brandId: brand.id, title, pillar, status: "draft" });`
   - `revalidatePath("/ideas");` return `{success:true, message:"Đã lưu ý tưởng."}`.
2. `app/ideas/manual-idea-form.tsx`: `useActionState(createIdeaManual, {success:false,message:""})`; Title `<Input name="title" required>`, pillar `<select name="pillar">` (from `pillars`, with an empty option) or `<Input name="pillar">` when `pillars.length===0` (mirror `ideas-generator.tsx:55-65`); submit "Lưu ý tưởng"; show `state.message`. Reset title on success (optional).
3. `app/ideas/page.tsx`: import + render `<ManualIdeaForm pillars={brand.pillars} />` directly above `<IdeasGenerator … />` inside the existing `brand` block (`page.tsx:71-73`). Do NOT gate on `keyAvailable`.
4. `npm run lint` + `npx next build`.

## Todo List
- [x] `createIdeaManual` added to `post.ts` (title validation + brand check + insert)
- [x] `manual-idea-form.tsx` created (ungated, `useActionState`)
- [x] `page.tsx` renders `ManualIdeaForm` above `IdeasGenerator`, ungated
- [x] New idea appears in list after save (revalidate)
- [x] `npm run lint` + `next build` pass

## Success Criteria
- With **no** `ANTHROPIC_API_KEY`: entering a title + optional pillar and submitting creates an idea visible in the list; no crash, no token use.
- Empty title → inline validation error, no insert.
- No brand configured → friendly "create Brand Profile first" message.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Insert without brand (NOT NULL violation) | Low | High | `getBrand()` guard before insert |
| Manual form edits collide with Phase 3 generator edits | Med | Low | Separate `manual-idea-form.tsx` file |
| Whitespace-only title accepted | Low | Low | `.trim()` + non-empty check server-side |

## Security Considerations
- Server action is a public endpoint → validate title server-side (done), never trust client. Title is stored as-is (embedded into prompts later); single-user prompt-injection acceptance already documented — no new exposure.

## Next Steps
- Phase 3 adds the idea copy-prompt button (separate concern in `ideas-generator.tsx`). `post.ts` next edited in Phase 4 — keep sequential.
