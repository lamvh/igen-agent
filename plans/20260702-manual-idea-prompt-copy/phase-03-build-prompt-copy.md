---
phase: 3
title: "Build-prompt actions + copy buttons"
status: completed
priority: P1
effort: "3h"
dependencies: [1]
---

# Phase 3: Build-prompt actions + copy buttons

## Context Links
- Spec §2 (outline copy), §3 (caption copy), §"Cách tiếp cận".
- Pure builders: `lib/ai/prompts.ts` — `ideaPrompt(brand,pillar,opts)` (`:96`), `outlinePrompt(brand,ideaTitle)` (`:156`), `captionPrompt(brand,ideaTitle,platform,outline?,length?)` (`:225`).
- `app/actions/generate.ts` — option parsers `toCount/toLength/toGoal/toOptionalText` (`:57-77`), `NO_BRAND` (`:81`), `GenerateState` (`:79`); `generateIdeas` (`:91`) as the parsing reference.
- `components/shell/copy-button.tsx` (`CopyButton`).
- Wire sites: `app/ideas/ideas-generator.tsx` (idea), `app/ideas/idea-card.tsx:80` `OutlineEditor` (outline), `app/editor/[postId]/caption-editor.tsx` (caption).

## Overview
- **Priority:** P1 (core value).
- **Status:** pending.
- Add three server actions that return the exact prompt string (no Claude call, no token cost) and three "Copy prompt" buttons that render **regardless of API key**. User pastes the prompt into the Claude app, then pastes the result back into the existing outline/caption textareas.

## Key Insights
- **`ideaPrompt` requires `IdeaOptions`** (`prompts.ts:82-90`: count, length, goal, target?, tone?). `buildIdeaPrompt` must parse the same form fields as `generateIdeas` (reuse `to*` helpers) so the copied prompt is byte-identical to the API one.
- **`captionPrompt` takes a `length`** that `post` does NOT store. Use default `"medium"` (matches `regenerateCaption:450` which also omits length). Document: copy-prompt caption uses medium length.
- **Blog dependency:** `buildCaptionPrompt` for a blog post calls `captionPrompt(...,"blog",...)` → needs `PLATFORM_RULES.blog` (Phase 1). Hence `dependencies:[1]`.
- **Must NOT gate on `hasApiKey`** and **must NOT** call `getClaudeClient`/`logUsage`. Only `getBrand()` + DB reads. Missing brand → reuse `NO_BRAND`.
- **Return shape** extends `GenerateState`: `{ success: boolean; message: string; prompt?: string }`.
- **DRY the UX:** a new `CopyPromptButton` client component wraps: click → `useTransition` → call an async `action` → on success store `prompt` in state + render `CopyButton` (and a collapsible preview) → on failure show `message`. All 3 sites reuse it.
- **Idea button needs live form values.** `ideas-generator.tsx` uses uncontrolled selects with `defaultValue`. The copy button reads the enclosing `<form>` via a ref: `buildIdeaPrompt(new FormData(formRef.current))` → same fields, same parsing → identical prompt.
- **Gate reinterpretation (needs confirm):** `ideas-generator.tsx:36-44` currently returns a no-form hint when `!hasApiKey`, so the idea copy button (which lives with the option fields) can't render without a key. To satisfy "idea copy button renders regardless of key" while keeping copy-prompt == API-prompt (same fields), render the option fields always; gate only the **"Sinh ý tưởng" (API submit)** button + no-key hint. This slightly reinterprets the spec's "AI generator form stays gated as-is". See Open Questions.

## Requirements
- Functional: 3 copy buttons produce prompts identical to the API path; all visible with zero API key; friendly error when no brand.
- Non-functional: no token cost, no `usageLog` writes, no Claude client import in these actions' call path; no brand data reaches the client bundle.

## Architecture
```
Client button ──(useTransition)──> server action (getBrand + DB read + *Prompt) ──> {success,message,prompt?}
      └── on prompt: render <CopyButton text={prompt}/> + preview
```
Actions (in `app/actions/generate.ts`):
- `buildIdeaPrompt(formData: FormData): Promise<GenerateState & {prompt?:string}>` — parse pillar (required) + opts via existing `to*` helpers → `ideaPrompt(brand, pillar, opts)`.
- `buildOutlinePrompt(ideaId: number): Promise<GenerateState & {prompt?:string}>` — load idea → `outlinePrompt(brand, idea.title)`.
- `buildCaptionPrompt(postId: number): Promise<GenerateState & {prompt?:string}>` — load post (+ linked idea title/outline) → `captionPrompt(brand, ideaTitle||"(nội dung tự do)", toPlatform(post.platform), outline, "medium")`.

No `hasApiKey` checks; no `getClaudeClient`; no `logUsage`.

## Related Code Files
**Modify**
- `app/actions/generate.ts` — add the 3 build-prompt actions (reuse `to*`, `NO_BRAND`, `toPlatform`). Extend return type inline (`GenerateState & {prompt?:string}`) or a local `PromptState` type.
- `app/ideas/ideas-generator.tsx` — always render option fields; gate only API submit + no-key hint; add `formRef` + `CopyPromptButton` (idea).
- `app/ideas/idea-card.tsx` — `OutlineEditor`: add ungated `CopyPromptButton` (outline) using `buildOutlinePrompt(ideaId)`. *(Shared with Phase 1 — sequential.)*
- `app/editor/[postId]/caption-editor.tsx` — add ungated `CopyPromptButton` (caption) using `buildCaptionPrompt(post.id)`.

**Create**
- `components/shell/copy-prompt-button.tsx` — reusable client component.

**Delete** — none.

## Implementation Steps
1. `generate.ts`: define `type PromptState = { success: boolean; message: string; prompt?: string };` (or inline).
2. `buildIdeaPrompt(formData)`: `const brand = await getBrand(); if(!brand) return NO_BRAND;` → `const pillar = String(formData.get("pillar")??"").trim(); if(!pillar) return {success:false,message:"Vui lòng chọn/nhập content pillar."};` → build `opts` exactly as `generateIdeas:101-107` using `toCount/toLength/toGoal/toOptionalText` → `return {success:true, message:"", prompt: ideaPrompt(brand,pillar,opts)};`. No Claude, no logUsage.
3. `buildOutlinePrompt(ideaId)`: `getBrand()` guard → `db.select…from(idea).where(eq(idea.id,ideaId)).limit(1)` → not found error → `return {success:true,message:"",prompt: outlinePrompt(brand,current.title)};`.
4. `buildCaptionPrompt(postId)`: `getBrand()` guard → load post; if `post.ideaId`, load idea for `title`+`outline` → `return {success:true,message:"",prompt: captionPrompt(brand, ideaTitle||"(nội dung tự do)", toPlatform(post.platform), outline, "medium")};`. (Mirror `regenerateCaption:433-441` for title/outline lookup.)
5. `components/shell/copy-prompt-button.tsx`:
   ```tsx
   "use client";
   export function CopyPromptButton({ action, label = "Copy prompt" }:{
     action: () => Promise<{success:boolean;message:string;prompt?:string}>;
     label?: string;
   }) { /* useTransition; on success setPrompt; show CopyButton(text=prompt) + collapsible <pre>; on error show message */ }
   ```
   Reuse `CopyButton` for the actual clipboard write. Include pending spinner + `aria-live` error.
6. `ideas-generator.tsx`: remove the `!hasApiKey` early return; wrap the form fields so they always render. Add `const formRef = useRef<HTMLFormElement>(null)` on the `<form>`. Add `<CopyPromptButton action={() => buildIdeaPrompt(new FormData(formRef.current!))} label="Copy prompt ý tưởng" />` next to the submit area. Gate only the "Sinh ý tưởng" `<Button type="submit">` and show the no-key hint inline when `!hasApiKey`.
7. `idea-card.tsx` `OutlineEditor`: add `<CopyPromptButton action={() => buildOutlinePrompt(ideaId)} label="Copy prompt dàn ý" />` near the "Lưu dàn ý" row (ungated; independent of the existing `hasApiKey && outline` refine block).
8. `caption-editor.tsx`: add `<CopyPromptButton action={() => buildCaptionPrompt(post.id)} label="Copy prompt caption" />` near the Caption label row (ungated; the existing "Viết lại bằng AI" stays `hasApiKey`-gated).
9. `npm run lint` + `npx next build`.

## Todo List
- [x] `buildIdeaPrompt` (form parse via `to*`, no Claude/logUsage)
- [x] `buildOutlinePrompt` (idea lookup)
- [x] `buildCaptionPrompt` (post+idea lookup, platform, length="medium")
- [x] `CopyPromptButton` reusable component
- [x] idea-generator: ungate fields, gate submit only, wire idea copy button via formRef
- [x] OutlineEditor: outline copy button (ungated)
- [x] caption-editor: caption copy button (ungated)
- [x] `npm run lint` + `next build` pass
- [x] Confirm no `getClaudeClient`/`logUsage`/`hasApiKey` in the 3 new actions

## Success Criteria
- With **no** API key: all 3 copy buttons visible; clicking returns a prompt and copies it; `usageLog` row count unchanged (verify via DB).
- Copied idea/outline/caption prompt equals the string the API path builds for the same inputs (same `*Prompt` fn, same args) — spot-check by diffing against a known API prompt.
- No brand → friendly message, no crash.
- Existing API flows (`generateIdeas/generateOutline/refineOutline/generateCaption/generateCaptionForPlatform/regenerateCaption`) unchanged.

## Risk Assessment
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Accidental Claude/logUsage in build actions (token cost) | Med | High | Code-review checklist; grep the 3 actions for `getClaudeClient`/`logUsage` |
| Idea copy prompt ≠ API prompt (fields drift) | Med | Med | Reuse identical `to*` helpers + same FormData source |
| `formRef.current` null at click | Low | Med | Button inside `<form>`; guard `formRef.current!` only after mount |
| Ungating generator changes UX beyond intent | Med | Low | See Open Question; confirm with user |
| Brand text leaks to client via prompt | Low | Med | Prompt built server-side; only final string returned (acceptable — it is meant to be copied) |

## Security Considerations
- Prompts embed brand + idea text (as the API already does). The returned prompt is intentionally user-facing (to paste into Claude app) — acceptable for single-user local. No API key or client secret involved. Actions are read-only (no DB writes).

## Open Questions
- ~~AI generator gate reinterpretation~~ — **RESOLVED 2026-07-02:** proceed with rendering the option fields always; gate only the "Sinh ý tưởng" API submit button + no-key hint (planner's recommendation, DRY). User did not respond to the confirmation prompt within timeout; defaulted to this option as it's the lowest-risk, most maintainable path. **Reversible** — flag if this UX change (form no longer fully hidden without a key) is unwanted after review.

## Next Steps
- Phase 4 adds empty-draft creation so the caption copy-prompt has a post to paste into when no API-generated post exists yet.
