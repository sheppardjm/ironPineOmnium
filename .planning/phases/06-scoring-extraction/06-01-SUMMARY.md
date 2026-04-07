---
phase: 06-scoring-extraction
plan: 01
subsystem: api
tags: [strava, segment-extraction, scoring, komEfforts, sectorEfforts]

# Dependency graph
requires:
  - phase: 05-submission-form-ux
    provides: submit-confirm.astro payload pipeline and hidden field pattern
  - phase: 04-activity-fetching
    provides: strava-fetch-activity.js with sectorEfforts pattern
provides:
  - komEfforts map (segId -> elapsedSeconds) extracted in strava-fetch-activity.js
  - KOM climb time display on confirm page preview
  - komEfforts hidden field wired for Phase 7 form POST
affects:
  - 06-02 (scoring logic)
  - 07-submission (stores komEfforts in athlete JSON)
  - 08-leaderboard (ranks by KOM times)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "komEfforts deduplication: keep fastest elapsed_time per KOM segment (mirrors sectorEfforts pattern)"
    - "Dual KOM fields: komSegmentIds (presence list) + komEfforts (time map) for backward compat"

key-files:
  created: []
  modified:
    - netlify/functions/strava-fetch-activity.js
    - src/pages/submit-confirm.astro

key-decisions:
  - "06-01: komEfforts uses same deduplication pattern as sectorEfforts (keep fastest/lowest elapsed_time)"
  - "06-01: komSegmentIds retained alongside komEfforts for backward compatibility"
  - "06-01: KOM time display conditioned on komTimeTotal > 0 to handle missing data gracefully"

patterns-established:
  - "KOM time extraction: iterate efforts, filter by KOM_SEGMENT_IDS, deduplicate to fastest per segment"

# Metrics
duration: 1min
completed: 2026-04-07
---

# Phase 6 Plan 01: KOM Elapsed Time Extraction Summary

**komEfforts map (segId -> elapsedSeconds) extracted from Strava activity and wired through confirm page payload with climb time display**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-07T17:25:26Z
- **Completed:** 2026-04-07T17:26:33Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Extended `strava-fetch-activity.js` to extract KOM elapsed times into a `komEfforts` map using the same fastest-effort deduplication pattern as `sectorEfforts`
- Updated confirm page to display total KOM climb time alongside segment count in the KOM preview card
- Added `h-komEfforts` hidden field populated by `populateHiddenFields()` for Phase 7 to consume in form POST

## Task Commits

Each task was committed atomically:

1. **Task 1: Add komEfforts extraction to strava-fetch-activity.js** - `ff412a3` (feat)
2. **Task 2: Wire komEfforts through confirm page payload and display** - `afc2481` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `netlify/functions/strava-fetch-activity.js` - Added komEfforts loop and included in Step 8 response
- `src/pages/submit-confirm.astro` - Added Payload type field, KOM preview with times, hidden input, populateHiddenFields call

## Decisions Made
- `komEfforts` uses the same deduplication pattern as `sectorEfforts`: iterate all efforts, keep the fastest (lowest `elapsed_time`) per segment ID — consistent with Decision 04-01
- `komSegmentIds` is retained alongside `komEfforts` for backward compatibility; the presence list and time map serve complementary purposes
- KOM time display in the preview is conditioned on `komTimeTotal > 0` to handle cases where the payload comes from an older fetch that lacks `komEfforts`

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `komEfforts` is now available in the form POST payload for Phase 7 to store in the athlete JSON
- Phase 7 should include `komEfforts` when writing the athlete file so Phase 8 can rank by climb times
- DATA-03 requirement (comparing submitted effort times for KOM scoring) is now satisfied at the data layer

---
*Phase: 06-scoring-extraction*
*Completed: 2026-04-07*
