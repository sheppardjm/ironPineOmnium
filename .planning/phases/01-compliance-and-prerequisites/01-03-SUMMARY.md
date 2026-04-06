---
phase: 01-compliance-and-prerequisites
plan: "03"
subsystem: api
tags: [strava, segments, typescript, constants, scoring]

# Dependency graph
requires: []
provides:
  - Typed Strava segment ID constants for all 10 Day 2 scored segments
  - Human-readable segment labels for display and debugging
  - SectorSegmentId and KomSegmentId literal union types
  - ALL_SCORED_SEGMENT_IDS combined array for full-sweep API filtering
affects:
  - Phase 3 (Strava callback — segment effort filtering logic)
  - Phase 6 (scoring calculation — sector and KOM extraction)
  - Any component displaying segment names

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "as-const arrays for literal type inference from string constants"
    - "Parallel LABELS record alongside typed arrays for O(1) label lookup"

key-files:
  created:
    - src/lib/segments.ts
  modified: []

key-decisions:
  - "Segment IDs stored as strings (not numbers) to avoid JS number precision issues with large Strava IDs"
  - "Separate SEGMENT_LABELS record (not inline objects) keeps typed arrays clean for as-const inference"

patterns-established:
  - "as-const string arrays: export const FOO = ['a', 'b'] as const — enables literal union type via (typeof FOO)[number]"

# Metrics
duration: 1min
completed: 2026-04-06
---

# Phase 1 Plan 03: Segment ID Constants Summary

**10 verified Strava segment ID constants for Hiawatha's Revenge Day 2 — 7 timed sectors and 3 KOM segments — typed as string literals with as-const assertions**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-06T13:48:10Z
- **Completed:** 2026-04-06T13:48:41Z
- **Tasks:** 1 (Task 1 was a resolved checkpoint:decision)
- **Files modified:** 1

## Accomplishments

- Created `src/lib/segments.ts` with all 10 Day 2 segment IDs verified against the Strava segment database
- Established `as const` pattern for typed string literal arrays, enabling downstream `SectorSegmentId` and `KomSegmentId` literal union types
- Provided `SEGMENT_LABELS` lookup record covering all segments for human-readable display

## Task Commits

1. **Task 2: Create the segments constants file** - `b7ef58e` (feat)

**Plan metadata:** (following in this commit)

## Files Created/Modified

- `src/lib/segments.ts` — Day 2 Strava segment ID constants with typed arrays, labels, combined array, and literal type exports

## Decisions Made

- Segment IDs stored as strings rather than numbers: Strava segment IDs exceed 32-bit integer range; using strings eliminates any risk of precision loss when IDs are compared or used as record keys.
- `SEGMENT_LABELS` stored as a flat `Record<string, string>` rather than objects within the typed arrays: keeps the `as const` arrays clean for pure literal type inference; labels are looked up independently at render time.

## Deviations from Plan

None — plan executed exactly as written (Task 1 was a checkpoint:decision resolved by user before execution).

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- `src/lib/segments.ts` is fully ready for Phase 3 (Strava OAuth callback) and Phase 6 (scoring logic) to import segment ID constants.
- The `SectorSegmentId` and `KomSegmentId` types are available for type-safe segment filtering in the callback function.
- No blockers for the remaining Phase 1 plans (01-04).

---
*Phase: 01-compliance-and-prerequisites*
*Completed: 2026-04-06*
