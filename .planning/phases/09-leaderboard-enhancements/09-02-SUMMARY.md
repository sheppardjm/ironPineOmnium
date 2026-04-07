---
phase: 09-leaderboard-enhancements
plan: "02"
subsystem: ui
tags: [css, mobile, sticky, touch, leaderboard, responsive]

# Dependency graph
requires:
  - phase: 09-01
    provides: column headers, search input, .search-hidden toggle

provides:
  - Mobile-readable leaderboard at 375px with no forced horizontal scroll
  - Sticky Rider column (position: sticky) with opaque background at all viewports
  - Hidden .score-note sub-rows on mobile to save vertical space
  - Compact rank pills (1.6rem) and reduced cell padding on mobile
  - touch-action: manipulation on tab buttons and search input

affects: [09-03, future mobile testing phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Sticky column via position:sticky + z-index layering (thead z-index:3 > tbody z-index:2)"
    - "Mobile-first min-width: 0 override removes forced table overflow"
    - "touch-action: manipulation on interactive controls eliminates 300ms tap delay"

key-files:
  created: []
  modified:
    - src/styles/global.css

key-decisions:
  - "09-02: :nth-child(2) selector targets Rider column — no markup changes needed to Leaderboard.astro"
  - "09-02: background-color: var(--color-night-950) on sticky cells prevents bleed-through at all viewport widths"
  - "09-02: First-row amber gradient approximated with #0e1513 on sticky cell to avoid jarring contrast"
  - "09-02: Rows have no onclick handlers so SC-4 (no accidental row tap navigation) is satisfied structurally"
  - "09-02: white-space: nowrap on mobile cells keeps score values on one line without wrapping"

patterns-established:
  - "Sticky table column: th/td:nth-child(N) with position:sticky + opaque background-color override"
  - "Mobile table: min-width: 0 + white-space: nowrap avoids overflow while maintaining scroll-on-demand"

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 9 Plan 02: Mobile Leaderboard Layout Summary

**Sticky Rider column with opaque background at all viewports, mobile table readable at 375px via min-width: 0 + compact cells, and touch-action: manipulation on tab/search controls**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-07T19:34:42Z
- **Completed:** 2026-04-07T19:36:09Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Rider column (2nd) is sticky at all viewports with `var(--color-night-950)` opaque background; `z-index` layering prevents header cell from scrolling under body cells
- At 375px, table drops forced `min-width` to 0, reduces cell padding/font-size, applies `white-space: nowrap`, and hides `.score-note` sub-rows — rider name and total score stay visible
- `touch-action: manipulation` on `.tab-button` and `.search-input` eliminates 300ms tap delay and prevents accidental double-tap zoom on mobile

## Task Commits

Each task was committed atomically:

1. **Task 1: Sticky Rider column and mobile table layout at 375px** - `1fb6447` (feat)
2. **Task 2: Touch target safety — touch-action and spacing validation** - `83f7556` (feat)

**Plan metadata:** (created in this step, committed below)

## Files Created/Modified

- `src/styles/global.css` — Added sticky column rules after hover block; replaced `min-width: 40rem` mobile rule with expanded mobile overrides; added `touch-action: manipulation` to `.tab-button` and `.search-input`

## Decisions Made

- `:nth-child(2)` selector used for sticky Rider column targeting — no markup change to `Leaderboard.astro` needed, existing DOM order is stable
- First-row sticky cell override uses `#0e1513` to approximate the amber gradient background so the sticky cell doesn't look jarring on the highlighted leader row
- Hover override on sticky cell uses solid `rgba(15, 22, 20, 1)` rather than semi-transparent to prevent content bleed-through during scroll
- `white-space: nowrap` on mobile cells chosen over column-width constraints — simpler and self-healing if column count changes
- SC-4 (no accidental row tap) satisfied structurally: `<tr>` elements in `Leaderboard.astro` have zero onclick/event handlers, confirmed by code review

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Mobile leaderboard is production-ready at 375px with sticky column and safe touch targets
- 09-03 (final polish / Strava review prep) can proceed — UI is now complete enough to screenshot for Strava athlete limit review submission
- Strava review deferred per STATE.md — submit after UI is fully complete

---
*Phase: 09-leaderboard-enhancements*
*Completed: 2026-04-07*
