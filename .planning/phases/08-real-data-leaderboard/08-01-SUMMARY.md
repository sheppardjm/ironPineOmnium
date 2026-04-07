---
phase: 08-real-data-leaderboard
plan: 01
subsystem: data
tags: [astro, vite, import-meta-glob, typescript, leaderboard, kom-scoring, athlete-loader]

# Dependency graph
requires:
  - phase: 07-data-persistence
    provides: athlete JSON files written to public/data/results/athletes/ by submit-result.js
  - phase: 06-scoring-extraction
    provides: KOM_SEGMENT_IDS and SECTOR_SEGMENT_IDS constants in segments.ts
  - phase: 01-compliance-and-prerequisites
    provides: RiderResult and CategoryId types in types.ts
provides:
  - loadAthleteResults() reading all athlete JSON files at build time via import.meta.glob
  - AthleteJson interface matching the schema written by submit-result.js
  - computeKomPoints() with time-based ranking (komEfforts present) and presence-count fallback (CSV submissions)
  - hasLiveData boolean computed at build time
affects: [08-02-wire-leaderboard, 08-03-remove-sample-data, 08-04-empty-state]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "import.meta.glob with eager: true for build-time JSON file loading from public/"
    - "Dual-mode KOM scoring: Approach A (time-based rank) when komEfforts present; Approach B (count fallback) when absent"
    - "Category peer filtering before KOM rank computation to ensure within-category comparison"

key-files:
  created:
    - src/lib/athlete-loader.ts
  modified: []

key-decisions:
  - "08-01: import.meta.glob path '../../public/data/results/athletes/*.json' resolves correctly from src/lib/ — two levels up reaches project root, then into public/"
  - "08-01: KOM scoring uses Approach A (time-based ranking) when komEfforts is non-empty; Approach B (komSegmentIds.length) for CSV fallback — consistent with research recommendation"
  - "08-01: computeKomPoints receives peersInCategory (already filtered to valid, complete athletes) — KOM rank is within-category only"
  - "08-01: loadAthleteResults() returns { riders, hasLiveData } tuple — hasLiveData = riders.length > 0, computed at build time"
  - "08-01: Scoring weights NOT applied in athlete-loader.ts — raw komPoints scalar passed to scoreOmnium() which applies defaultScoringConfig"

patterns-established:
  - "Pattern: loadAthleteResults() is the single build-time entry point for real athlete data — Leaderboard.astro calls this, not import.meta.glob directly"
  - "Pattern: AthleteJson is the raw schema type; RiderResult is the scoring-engine type — athlete-loader.ts owns the transformation between them"

# Metrics
duration: 1min
completed: 2026-04-07
---

# Phase 8 Plan 01: Athlete Loader Summary

**Build-time athlete JSON loader using import.meta.glob with dual-mode KOM scoring (time-based ranking or presence-count fallback for CSV submissions)**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-07T18:52:05Z
- **Completed:** 2026-04-07T18:52:59Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Created `src/lib/athlete-loader.ts` with `loadAthleteResults()` and `AthleteJson` interface
- KOM scoring handles both Strava submissions (time-based ranking per segment) and CSV fallback (presence count)
- Build succeeds with zero athlete JSON files — returns `{ riders: [], hasLiveData: false }`

## Task Commits

Each task was committed atomically:

1. **Task 1: Create athlete-loader.ts with AthleteJson type and loadAthleteResults()** - `cba97db` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `src/lib/athlete-loader.ts` - AthleteJson interface, computeKomPoints() internal function, loadAthleteResults() exported function

## Decisions Made

- KOM scoring uses Approach A (time-based ranking per segment) when `komEfforts` is present and non-empty. Falls back to Approach B (`komSegmentIds.length`) for CSV fallback athletes without `komEfforts`. This was the research recommendation and handles the known schema gap.
- The glob path `'../../public/data/results/athletes/*.json'` must be a static string literal (Vite constraint). Verified resolves correctly from `src/lib/`.
- `hasLiveData` is computed at build time as `riders.length > 0` — no client-side computation needed.
- `computeKomPoints` receives pre-filtered `peersInCategory` (complete athletes with valid category in same category) so KOM rank comparison is always within-category.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `loadAthleteResults()` is ready for wiring into `Leaderboard.astro` (08-02)
- Returns `{ riders: RiderResult[]; hasLiveData: boolean }` — Leaderboard.astro passes `riders` to `scoreOmnium()` and uses `hasLiveData` for the results indicator
- Zero athlete files returns empty array cleanly — the empty-state UI (08-04) can guard on `hasLiveData`

---
*Phase: 08-real-data-leaderboard*
*Completed: 2026-04-07*
