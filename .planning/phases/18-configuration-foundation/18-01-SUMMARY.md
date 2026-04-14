---
phase: 18-configuration-foundation
plan: 01
subsystem: api
tags: [typescript, strava, astro, validation, event-config]

# Dependency graph
requires: []
provides:
  - src/lib/event-config.ts with 7 named validation constants (GUN_EPOCH_SECONDS, START_WINDOW_SECONDS, DAY1/DAY2 distance thresholds, DAY1_DATE, DAY2_DATE, EVENT_DATES)
  - strava-fetch-activity.js now returns distanceMeters and startDate in response payload
  - submit-confirm.astro transports distanceMeters and startDate through hidden form fields
affects: [19-validation-gates]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Named as-const exports pattern for event constants (mirrors segments.ts)"
    - "Single source of truth: all event validation thresholds in event-config.ts"

key-files:
  created:
    - src/lib/event-config.ts
  modified:
    - netlify/functions/strava-fetch-activity.js
    - src/pages/submit-confirm.astro

key-decisions:
  - "event-config.ts follows segments.ts naming pattern (named exports, as const, no default export)"
  - "distanceMeters/startDate added as optional fields in Payload type to avoid breaking existing submit flow"
  - "distanceMeters extracted from activity.distance (raw meters from Strava API)"
  - "startDate extracted from activity.start_date (UTC ISO string, distinct from start_date_local)"

patterns-established:
  - "Constants pattern: all event thresholds as named as-const exports in src/lib/event-config.ts"
  - "Transport pattern: hidden form fields carry validation data through submit-confirm to submit-result"

# Metrics
duration: 2min
completed: 2026-04-14
---

# Phase 18 Plan 01: Configuration Foundation Summary

**event-config.ts with 7 named validation constants, Strava fetch extended with distanceMeters/startDate, and submit-confirm transport layer wired for Phase 19 validation gates**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T23:32:04Z
- **Completed:** 2026-04-14T23:34:00Z
- **Tasks:** 2
- **Files modified:** 3 (1 created, 2 modified)

## Accomplishments
- Created `src/lib/event-config.ts` as the single source of truth for all event validation constants — GUN_EPOCH_SECONDS (1780747200), START_WINDOW_SECONDS (1800), DAY1_MIN_DISTANCE_METERS (156000), DAY2_MIN_DISTANCE_METERS (153000), DAY1_DATE, DAY2_DATE, and EVENT_DATES
- Removed hardcoded `["2026-06-06", "2026-06-07"]` array from strava-fetch-activity.js and imported EVENT_DATES from event-config.ts instead
- Extended strava-fetch-activity.js Step 8 return payload with `distanceMeters` (from `activity.distance`) and `startDate` (from `activity.start_date`)
- Extended submit-confirm.astro with hidden form fields `h-distanceMeters` and `h-startDate`, Payload type optional fields, and `populateHiddenFields` set() calls

## Task Commits

Each task was committed atomically:

1. **Task 1: Create event-config.ts and update strava-fetch-activity.js** - `b66f260` (feat)
2. **Task 2: Extend submit-confirm.astro transport layer** - `92bcfa9` (feat)

**Plan metadata:** *(final docs commit follows)*

## Files Created/Modified
- `src/lib/event-config.ts` - New file; all event validation constants as named as-const exports
- `netlify/functions/strava-fetch-activity.js` - Replaced hardcoded EVENT_DATES with import; added distanceMeters/startDate extraction and return
- `src/pages/submit-confirm.astro` - Added Payload type fields, hidden form inputs, and populateHiddenFields set() calls for distanceMeters and startDate

## Decisions Made
- Followed segments.ts naming pattern (named exports, as const, no default export) for consistency across the lib/ directory
- `distanceMeters` and `startDate` added as optional fields in Payload type to avoid any risk of breaking the existing submit flow
- `startDate` uses `activity.start_date` (UTC ISO string) rather than `start_date_local` — Phase 19 validation needs UTC epoch comparison against GUN_EPOCH_SECONDS

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 19 (Validation Gates) has everything it needs: named constants from event-config.ts, distanceMeters and startDate in the fetch response, and the transport chain in submit-confirm.astro
- No blockers for Phase 19 implementation

---
*Phase: 18-configuration-foundation*
*Completed: 2026-04-14*
