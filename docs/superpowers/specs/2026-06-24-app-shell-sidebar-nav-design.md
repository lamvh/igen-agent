# App Shell with Sidebar Navigation — Design

Date: 2026-06-24
Status: Approved

## Problem

App has no shared header/navigation. Each page is standalone, wrapped in its own
`<main className="mx-auto max-w-... px-6 py-12">`. Navigation only happens via dashboard
cards. Users have no persistent way to move between the 7 destinations.

## Decision

Add a left-sidebar app shell with light polish (top page-title strip). No theme toggle.
The CSS already ships `--sidebar-*` tokens, so the theme anticipates this.

## Destinations (single source of truth)

`lib/nav.ts` exports the nav list — href, label, icon (lucide-react). Consumed by both
sidebar and dashboard cards so they never drift.

1. `/` — Tổng quan (Dashboard)
2. `/brand` — Brand Profile
3. `/ideas` — Ý tưởng & Caption
4. `/posts` — Nội dung
5. `/calendar` — Lịch nội dung
6. `/assets` — Thư viện ảnh
7. `/settings` — Cài đặt

## Architecture

- `lib/nav.ts` — `NAV_ITEMS` array (href, label, desc, cta, icon) + `titleForPath(pathname)` helper.
- `components/shell/app-sidebar.tsx` — client component. Vertical rail (logo, nav links,
  icons, active highlight via `usePathname()`). Mobile: hidden, replaced by hamburger →
  nav opens in existing `Dialog`.
- `components/shell/app-shell.tsx` — client component composing sidebar + page area + top
  title strip. Title derived from `titleForPath(usePathname())`.
- `app/layout.tsx` — wraps `{children}` in `<AppShell>`.

## Layout

Desktop: fixed ~240px sidebar left; page area right with a header strip (current page title)
then page content. Mobile (<md): sidebar hidden; top bar with hamburger opening nav dialog.

## Page content changes

- Shell owns outer vertical padding. Per-page `<main className="mx-auto max-w-... px-6 py-12">`
  keep their `max-w-*` (line length) but drop redundant vertical padding where double-padded.
- Remove redundant per-page `<h1>` titles (Brand Profile, Nội dung, etc.) since the header
  strip now shows the page title. Dashboard keeps its hero heading.
- Editor (`/editor/[postId]`) stays inside the shell.

## Error/edge handling

- Active state: no match → no highlight, generic/empty title. No new data fetching, so no
  new failure modes.

## Testing

- `npm run build` compiles.
- Visual: each route renders with correct active highlight + title; mobile hamburger opens nav.
