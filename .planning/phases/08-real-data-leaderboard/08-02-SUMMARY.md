---
phase: 08-real-data-leaderboard
plan: 02
subsystem: ui
tags: [astro, leaderboard, athlete-loader, scoring, empty-state, live-data]

# Dependency graph
requires:
  - phase: 08-01
    provides: loadAthleteResults() returning { riders, hasLiveData } from athlete JSON files
  - phase: 06-scoring-extraction
    provides: scoreOmnium() and defaultScoringConfig for ranking riders
provides:
  - Leaderboard.astro wired to real athlete data via loadAthleteResults()
  - Empty state UI when zero athlete files exist ("Results will appear here after riders submit.")
  - Winner banner and table guarded against empty entries arrays
  - Dynamic eyebrow in Leaderboard: "Live Results" or "Awaiting Submissions"
  - Dynamic h2 heading in index.astro: "Current standings." or "Awaiting submissions."
  - Status badge in index.astro (green "Live results" / amber "Awaiting submissions")
  - All sample data language removed from the leaderboard rendering path
affects: [08-03, 08-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - hasLiveData boolean flows from athlete-loader through component prop to conditional rendering
    - Empty state guarding pattern: ternary on hasLiveData wraps tab-list and panels
    - Per-category empty state: board.entries.length > 0 guards winner banner and table independently

key-files:
  created: []
  modified:
    - src/components/Leaderboard.astro
    - src/pages/index.astro
    - src/styles/global.css

key-decisions:
  - "Tab list rendered conditionally — only when hasLiveData is true (no empty tabs when no data)"
  - "Winner banner accessed via board.entries[0] guarded by board.entries.length > 0 conditional — no crash on zero riders"
  - "Status badge uses class:list pattern already established in codebase"

patterns-established:
  - "hasLiveData boolean: computed once in athlete-loader, threaded through Leaderboard template for all conditional rendering"
  - "Empty state at two levels: global (no data at all) and per-category (data present but category has zero entries)"

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 8 Plan 02: Real Data Leaderboard UI Summary

**Leaderboard.astro wired to loadAthleteResults() with empty-state guarding and live/pending status indicator in index.astro**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-07T18:55:36Z
- **Completed:** 2026-04-07T18:57:36Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Replaced sampleRiders import with loadAthleteResults() — leaderboard now driven entirely by athlete JSON files
- Added empty-state rendering at two levels: global (no riders) and per-category (category has zero entries)
- Winner banner and table guarded against undefined board.entries[0] — no crash with zero athletes
- Dynamic "Live Results" / "Awaiting Submissions" eyebrow in Leaderboard.astro based on hasLiveData
- Status badge (green live / amber pending) and dynamic heading in index.astro leaderboard section
- All "Sample standings" and "sample rider data" language removed from the rendering path

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace sample data with real data pipeline in Leaderboard.astro** - `d6dc6fb` (feat)
2. **Task 2: Update index.astro leaderboard section heading and add status badge** - `e4596d2` (feat)

## Files Created/Modified
- `src/components/Leaderboard.astro` - Real data pipeline, empty state handling, dynamic eyebrow
- `src/pages/index.astro` - Dynamic heading, status badge, formula note updated
- `src/styles/global.css` - Added .status-badge, .status-live, .status-pending, .leaderboard-empty, .leaderboard-empty-text, .category-empty

## Decisions Made
- Tab list is conditionally rendered only when hasLiveData is true — no empty category tabs shown when there are no riders
- Winner banner accessed via board.entries[0] is guarded with board.entries.length > 0 ternary — prevents crash when a category has zero riders but other categories have data
- Status badge uses Astro class:list pattern (already established in codebase) for conditional CSS class binding

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Real data pipeline is complete end-to-end: athlete JSON → loadAthleteResults() → scoreOmnium() → Leaderboard.astro
- Empty state handles the pre-event period correctly — no crashes, clear messaging
- Build succeeds with zero athlete files (current state) and will render scored results once files are added
- Ready for 08-03 (submission form integration) and 08-04 (end-to-end testing with real athlete data)

---
*Phase: 08-real-data-leaderboard*
*Completed: 2026-04-07*
