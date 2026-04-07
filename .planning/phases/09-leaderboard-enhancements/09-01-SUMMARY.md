---
phase: 09-leaderboard-enhancements
plan: 01
subsystem: ui
tags: [astro, css, client-side-filtering, leaderboard, search, accessibility]

# Dependency graph
requires:
  - phase: 08-real-data-leaderboard
    provides: Leaderboard.astro component with tab panel system and hasLiveData flag
provides:
  - Self-explanatory column headers (# / Rider / Day 1 / Day 2 Sectors / KOM / Total)
  - Real-time rider name search filtering across all category panels
affects:
  - 09-02 (leaderboard enhancements — subsequent plans build on this UI foundation)
  - 09-03 (any further leaderboard polish)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "search-hidden CSS class for non-destructive row hiding (separate from panel [hidden] attribute)"
    - "Cross-panel filtering: querySelectorAll on parent [data-leaderboard] element spans all tab panels"

key-files:
  created: []
  modified:
    - src/components/Leaderboard.astro
    - src/styles/global.css

key-decisions:
  - "search-hidden uses classList.toggle (not row.hidden) to avoid conflicting with tab panel [hidden] attribute"
  - "Search input queries all tbody tr across entire [data-leaderboard] element — filtering is global across all three category panels simultaneously"
  - "Search input conditionally rendered only when hasLiveData is true — not rendered in empty-state leaderboard"

patterns-established:
  - "Non-destructive row visibility: use custom CSS class (.search-hidden) rather than native [hidden] when other hidden mechanisms are in play"

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 9 Plan 01: Leaderboard Enhancements — Headers + Search Summary

**Self-explanatory column headers (# / Day 1 / Day 2 Sectors) and real-time client-side rider name search filtering across all category tabs using classList.toggle('search-hidden')**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-07T19:29:51Z
- **Completed:** 2026-04-07T19:31:51Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Renamed table column headers from opaque ("Rank", "Time", "Sectors") to self-explanatory ("# ", "Day 1", "Day 2 Sectors") without changing any td cells or score-note content
- Added conditionally-rendered search input (only when hasLiveData is true) with correct ordering inside .leaderboard-head: intro → search → tab-list
- Implemented cross-panel filtering script that queries all tbody tr across the entire [data-leaderboard] element, so typing a name filters results regardless of which tab is active
- Added .search-input and .search-hidden CSS rules that visually match the existing tab-button/secondary-button design language (border, border-radius, background, transition)

## Task Commits

Each task was committed atomically:

1. **Task 1: Rename column headers to self-explanatory labels** - `53199d3` (feat)
2. **Task 2: Add search input and client-side row filtering** - `bb1057e` (feat)

**Plan metadata:** (see docs commit below)

## Files Created/Modified

- `src/components/Leaderboard.astro` - Updated thead headers; added search input HTML (conditional on hasLiveData); extended script block with search filtering logic
- `src/styles/global.css` - Added .search-input and .search-hidden rules inside @layer components

## Decisions Made

- **search-hidden vs row.hidden:** Used classList.toggle('search-hidden') rather than setting `row.hidden = true` to avoid conflict with the tab panel [hidden] attribute system. Native [hidden] on panels makes rows invisible regardless of panel state; CSS class is additive and scoped only to row visibility.
- **Global querySelectorAll scope:** The search query targets `leaderboard.querySelectorAll('tbody tr')` on the entire [data-leaderboard] wrapper, not a single active panel. This means rows in all three category panels are filtered simultaneously — switching tabs after a search still shows the filtered view.
- **Conditional render only when hasLiveData:** The input is inside a `{hasLiveData && ...}` block. When the leaderboard is in the empty-state (no submissions), there is nothing to search, so the input is not rendered.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the build succeeded on first attempt for both tasks. The `dist/index.html` did not contain the search input (as expected: `hasLiveData` is false when no athlete JSON files are present), but the compiled CSS and script confirmed correct output.

## User Setup Required

None - no external service configuration required. All changes are static build-time only.

## Next Phase Readiness

- Column headers are now self-explanatory for riders unfamiliar with the omnium scoring model (LEAD-01 complete)
- Real-time name search works across all category tabs (LEAD-02 complete)
- Ready for 09-02 (next leaderboard enhancement plan)

---
*Phase: 09-leaderboard-enhancements*
*Completed: 2026-04-07*
