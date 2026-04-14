---
phase: 19-fetch-pipeline-validation-gates
plan: 01
subsystem: api
tags: [strava, validation, fetch, netlify-functions, astro, event-config]

# Dependency graph
requires:
  - phase: 18-configuration-foundation
    provides: event-config.ts with DAY1_DATE, DAY2_DATE, DAY1/2_MIN_DISTANCE_METERS, GUN_EPOCH_SECONDS, START_WINDOW_SECONDS; distanceMeters and startDate extraction in strava-fetch-activity.js
provides:
  - Three validation gates in strava-fetch-activity.js rejecting invalid activities at fetch time
  - Human-readable error messages in submit.astro surfacing each rejection to the rider
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Validation at fetch time only — no double-validation in submit-result.js"
    - "HTTP 200 with error code for all user-recoverable validation failures"
    - "multiValueHeaders spread preserved on every early-return path for token-refresh cookie integrity"
    - "Gate ordering: hidden_start_time before epoch arithmetic to prevent false positives on T00:00:01Z"

key-files:
  created: []
  modified:
    - netlify/functions/strava-fetch-activity.js
    - src/pages/submit.astro

key-decisions:
  - "DAY2_DATE imported even though not used in gate logic — matches plan's import spec exactly"
  - "isDay1 determined from localDateStr === DAY1_DATE; Day 2 is implicit fallback (no explicit DAY2_DATE comparison needed)"
  - "minDistanceKm hardcoded as integer (156/153) in JSON response alongside the computed actualDistanceKm — avoids floating-point conversion artifacts"

patterns-established:
  - "Validation gate ordering: privacy/obfuscation checks (hidden_start_time) before correctness checks (distance) before window checks (start_too_late)"
  - "All new error return paths include ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}) spread"

# Metrics
duration: 2min
completed: 2026-04-14
---

# Phase 19 Plan 01: Fetch Pipeline Validation Gates Summary

**Three anti-sandbagging gates in strava-fetch-activity.js — hidden start time, per-day distance minimums, and Day 1 start-window — each surfaced as a rider-readable error on submit.astro**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-14T23:54:39Z
- **Completed:** 2026-04-14T23:56:37Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Added three ordered validation gates to strava-fetch-activity.js that run after Phase 18's field extraction and before the success return
- VAL-04: Rejects activities with hidden start time (T00:00:01Z) before any epoch arithmetic to prevent false start-time failures
- VAL-01/02: Rejects activities under 156 km (Day 1) or 153 km (Day 2) with the rider's actual distance and the day's minimum
- VAL-03: Rejects Day 1 activities starting more than 30 minutes after the 8:00 AM ET gun — Day 2 is fully exempt
- All three error codes render human-readable messages on submit.astro with the rider's actual value and the required threshold

## Task Commits

Each task was committed atomically:

1. **Task 1: Add validation gates to strava-fetch-activity.js** - `1e6a70c` (feat)
2. **chore: Add DAY2_DATE to import per plan spec** - `642c34c` (chore, minor follow-up)
3. **Task 2: Add error message handlers to submit.astro** - `c823693` (feat)

**Plan metadata:** (docs commit follows this summary)

## Files Created/Modified

- `netlify/functions/strava-fetch-activity.js` - Extended event-config import, added Step 7.5 validation gate block with three gates in correct order
- `src/pages/submit.astro` - Added three else-if branches after wrong_date handler for distance_too_short, start_too_late, and hidden_start_time

## Decisions Made

- **DAY2_DATE imported but unused**: Plan specifies it in the import block; added for exactness even though gate logic only references DAY1_DATE for the isDay1 check.
- **minDistanceKm as integer in response**: Hardcoded as 156/153 in the JSON body rather than dividing the meter constant, avoiding any floating-point display artifacts (156000/1000 = 156 exactly, but explicit is clearer).
- **Gate placement as Step 7.5**: Inserted after segment extraction (Step 7) and before the return (Step 8) — keeps all validation in one named block, easy to find.

## Deviations from Plan

None — plan executed exactly as written. The one minor addition was including `DAY2_DATE` in the import (a plan-specified constant that implementation didn't strictly need), applied immediately as a clean follow-up commit.

## Issues Encountered

None. The `leaderboard.astro` TypeScript error reported by `npx astro check` is a pre-existing conflict unrelated to this phase (confirmed by stash test).

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Phase 19 complete. v1.2 Scoring Integrity is done — both phases (18 configuration foundation, 19 fetch pipeline validation gates) are shipped.
- No further phases planned for v1.2 per STATE.md (phases reduced from 3 to 2 — no Phase 20).
- Remaining v1.2 concern: Strava athlete limit review pending (follow up by 2026-04-22 if no response).

---
*Phase: 19-fetch-pipeline-validation-gates*
*Completed: 2026-04-14*
