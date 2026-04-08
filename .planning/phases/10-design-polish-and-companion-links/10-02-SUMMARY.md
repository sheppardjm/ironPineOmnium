---
phase: 10-design-polish-and-companion-links
plan: 02
subsystem: ui
tags: [astro, light-theme, leaderboard, podium, landing-page, companion-links]

requires:
  - phase: 10-01
    provides: light-base CSS foundation, .section-dark wrapper, Nav component
  - phase: 09-leaderboard-enhancements
    provides: Leaderboard.astro with search, sticky columns, mobile layout

provides:
  - PodiumPreview.astro: build-time top-3 per category podium component with placeholder state
  - leaderboard.astro: dedicated /leaderboard page wrapping Leaderboard in .section-dark
  - index.astro redesigned: PodiumPreview replaces full Leaderboard, Submit Results CTA added, companion URLs fixed
  - Hero CTA updated to link to /leaderboard (not #leaderboard anchor)

affects:
  - 10-03 through 10-06 (subsequent plans; landing page structure now established)

tech-stack:
  added: []
  patterns:
    - "PodiumPreview: build-time scoreOmnium() call, top3 slice per category, light card layout"
    - "Landing page: full Leaderboard lives at /leaderboard; index shows only top-3 preview"

key-files:
  created:
    - src/components/PodiumPreview.astro
    - src/pages/leaderboard.astro
  modified:
    - src/pages/index.astro

key-decisions:
  - "Companion site URLs replaced: file:/// paths -> https://hiawathasrevenge.com + https://mkultragravel.com"
  - "PodiumPreview kept on light background (no .section-dark wrapper) — podium cards designed for light surface"
  - "Hero CTA updated to /leaderboard; #leaderboard anchor retained for podium preview section scroll"
  - "Submit Results CTA placed after scoring section (riders learn about event first, per CONTEXT.md)"

patterns-established:
  - "Dedicated route pattern: full feature lives at /route, landing page shows preview/teaser"
  - "leaderboard.astro wraps Leaderboard in .section-dark to inherit all dark leaderboard styles"

duration: 3min
completed: 2026-04-08
---

# Phase 10 Plan 02: Landing Page Redesign Summary

**PodiumPreview component (top-3 per category, light card layout) + dedicated /leaderboard page + index.astro redesigned with Submit Results CTA and real companion site URLs replacing file:/// paths**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-08T15:00:18Z
- **Completed:** 2026-04-08T15:02:43Z
- **Tasks:** 2
- **Files modified:** 3 (PodiumPreview.astro created, leaderboard.astro created, index.astro updated)

## Accomplishments
- Created PodiumPreview.astro: build-time top-3 per category using loadAthleteResults() + scoreOmnium(); placeholder shown when no data
- Created leaderboard.astro: dedicated /leaderboard page with full Leaderboard component in .section-dark wrapper
- Updated index.astro: removed Leaderboard import, added PodiumPreview, added Submit Results CTA, fixed companion URLs, updated hero CTA to /leaderboard

## Task Commits

1. **Task 1: Create PodiumPreview component and leaderboard page** - `e75c61f` (feat)
2. **Task 2: Redesign index.astro for light-base theme** - `eab2258` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/components/PodiumPreview.astro` - Build-time podium: top-3 per category cards on light surface, placeholder when no data, "View Full Leaderboard" CTA
- `src/pages/leaderboard.astro` - Dedicated /leaderboard page; wraps Leaderboard in .section-dark; live/pending status badge
- `src/pages/index.astro` - Removed Leaderboard import; added PodiumPreview; fixed eventLinks URLs; added Submit Results CTA section; hero CTA -> /leaderboard

## Decisions Made
- Companion site URLs replaced with real https:// domains (hiawathasrevenge.com, mkultragravel.com) — file:/// paths were local dev artifacts
- PodiumPreview kept on light background (not wrapped in .section-dark) — cards designed for light surface with white bg and subtle border
- Submit Results CTA placed after scoring section, before leaderboard preview — matches CONTEXT.md "riders learn about event first, then submit" direction
- Hero CTA updated from `#leaderboard` anchor to `/leaderboard` page — full table now has its own route

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — both builds succeeded on first attempt; all six verification checks passed.

## Next Phase Readiness
- Landing page structure complete; PodiumPreview and /leaderboard are live
- Submit Results CTA visible and linked to /submit
- Companion site links now use real production URLs
- Plans 10-03 through 10-06 can proceed on this foundation

---
*Phase: 10-design-polish-and-companion-links*
*Completed: 2026-04-08*
