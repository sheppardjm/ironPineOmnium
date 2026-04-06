---
phase: 04-activity-fetching-and-validation
plan: 01
subsystem: api
tags: [netlify-functions, strava-api, cookie-es, segment-extraction, validation]

# Dependency graph
requires:
  - phase: 03-strava-oauth
    provides: strava_session cookie with athleteId/accessToken/refreshToken/expiresAt
  - phase: 01-compliance-and-prerequisites
    provides: segments.ts with SECTOR_SEGMENT_IDS and KOM_SEGMENT_IDS as string arrays
provides:
  - strava-fetch-activity Netlify Function handling complete activity fetch and validation pipeline
  - Structured JSON response with activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds
  - All user-recoverable errors as HTTP 200 with { error: "code" } — not HTTP error codes
affects:
  - 04-02 (scoring)
  - 04-03 (persistence)
  - 04-04 (submission flow UI)
  - Any phase that processes fetched activity data

# Tech tracking
tech-stack:
  added: []
  patterns:
    - multiValueHeaders for conditional Set-Cookie re-serialization when token refreshed
    - All user-recoverable validation errors use HTTP 200 with structured { error } JSON
    - HTTP 401 only for session/auth infrastructure failures (no_session, token_refresh_failed)
    - String(effort.segment.id) conversion before comparing to segments.ts string arrays
    - Fastest-effort deduplication for segments ridden multiple times

key-files:
  created:
    - netlify/functions/strava-fetch-activity.js
  modified: []

key-decisions:
  - "All validation errors (invalid_url, wrong_athlete, wrong_date, activity_not_found, etc.) use HTTP 200 with structured { error } — only session failures use HTTP 401"
  - "Date validation uses start_date_local.slice(0,10) without new Date() or timezone math — the local date portion is correct despite the misleading Z suffix"
  - "Segment effort deduplication keeps fastest (lowest elapsed_time) effort per segment — prevents double-counting for riders who ride a sector twice"
  - "Strava 401 responses treated as activity_not_found — since token was already refreshed, 401 means inaccessible/private, not expired"

patterns-established:
  - "Conditional multiValueHeaders: spread into return object only when Object.keys().length is truthy"
  - "Import segments.ts from netlify/functions/ via ../../src/lib/segments.ts — bundler resolves .ts at build time"
  - "komSegmentIds deduplication via Set then Array.from()"

# Metrics
duration: 1min
completed: 2026-04-06
---

# Phase 4 Plan 1: strava-fetch-activity Function Summary

**Netlify Function that fetches a Strava activity by URL, validates ownership and date (June 6-7, 2026), extracts sector effort times and KOM completion flags, and returns structured JSON using the established v1 ESM handler pattern**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-06T17:57:27Z
- **Completed:** 2026-04-06T17:58:26Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Complete 8-step activity fetch pipeline in a single Netlify Function: session read, token refresh with cookie re-serialization, URL regex parse, Strava API fetch with include_all_efforts=true, ownership check, date validation, segment extraction, trimmed response
- All 9 structured error codes implemented: no_session, token_refresh_failed, invalid_url, activity_not_found, rate_limited, strava_api_error, network_error, wrong_athlete, wrong_date
- Segment effort extraction handles duplicate efforts per segment (keeps fastest), deduplicates KOM segment completions via Set

## Task Commits

Each task was committed atomically:

1. **Task 1: Create strava-fetch-activity.js with full activity fetch, validation, and segment extraction** - `4b9cec6` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `netlify/functions/strava-fetch-activity.js` - Core activity fetch/validation/segment extraction endpoint

## Decisions Made

- All validation errors (invalid_url, wrong_athlete, wrong_date, activity_not_found, rate_limited, strava_api_error, network_error) use HTTP 200 with structured `{ error: "code" }` JSON. Only session/auth infrastructure failures (no_session, token_refresh_failed) use HTTP 401. This follows the structured error pattern from Phase 3 research.
- Date validation uses `activity.start_date_local.slice(0, 10)` directly — no `new Date()` construction or timezone math. The `start_date_local` field's date portion is the local date despite its misleading Z suffix.
- For duplicate efforts on the same segment (rider did it twice), the fastest (lowest `elapsed_time`) is kept. This is fairest for scoring and prevents double-counting.
- Strava 401 responses after a successful token refresh are treated as `activity_not_found` — since the token is valid, 401 means the activity is private or belongs to another athlete.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- `pnpm build` initially ran with Node 20 (system default) which Astro 6 rejects. Used `volta run --node 22.22.2 pnpm build` per the established project pattern. Build passed cleanly.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `strava-fetch-activity.js` is ready to be called from the submission UI (Phase 4 Plan 4)
- The response shape (`activityId`, `athleteId`, `movingTimeSeconds`, `startDateLocal`, `sectorEfforts`, `komSegmentIds`) is the input contract for the scoring function (Phase 4 Plan 2)
- No blockers for proceeding to Plan 02 (scoring function)

---
*Phase: 04-activity-fetching-and-validation*
*Completed: 2026-04-06*
