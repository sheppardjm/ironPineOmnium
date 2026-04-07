---
phase: 07-data-persistence
plan: 01
subsystem: database
tags: [github-contents-api, netlify-functions, astro, cookie-es, persistence]

# Dependency graph
requires:
  - phase: 05-submission-form-ux
    provides: submit-confirm.astro with hidden inputs carrying payload data for Phase 7 POST
  - phase: 03-strava-oauth
    provides: strava_session cookie with athleteId for server-side identity verification
provides:
  - submit-result.js Netlify Function: session validation, athlete ID enforcement, GitHub GET-then-PUT, identity lock, build hook trigger
  - submit-confirm.astro: wired form handler that POSTs JSON to /api/submit-result and redirects on success
affects: [08-leaderboard-display, 09-admin, 10-deauth]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - GitHub-as-database GET-then-PUT with SHA-based optimistic concurrency for athlete JSON files
    - Fire-and-forget build hook trigger (fetch without await, .catch(() => {}))
    - Identity lock pattern: displayName/category frozen after first write, subsequent writes use existingData values
    - activityId deduplication with "manual" sentinel exception
    - 409 SHA conflict single-retry pattern for write races

key-files:
  created:
    - netlify/functions/submit-result.js
  modified:
    - src/pages/submit-confirm.astro

key-decisions:
  - "07-01: submit-result reads strava_session for athleteId only — no Strava API calls, no token refresh"
  - "07-01: All validation errors (invalid_payload, invalid_date, etc.) return HTTP 200 with { error } JSON — 401/403 only for session/mismatch failures"
  - "07-01: 409 SHA conflict handled with single retry (re-GET then re-PUT) — two consecutive conflicts return write_conflict error"
  - "07-01: Build hook triggered fire-and-forget after successful PUT — latency not critical for submission confirmation"

patterns-established:
  - "GitHub write pattern: GET for SHA → build object → PUT with SHA → handle 409 with retry"
  - "Identity lock: on re-submission, use existingData.displayName + existingData.category, discard request body values"

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 7 Plan 1: Submit Result Summary

**GitHub-as-database write path: submit-result.js Netlify Function writes athlete JSON via Contents API with SHA concurrency, identity lock, and fire-and-forget build trigger**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-07T17:55:08Z
- **Completed:** 2026-04-07T17:56:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Created submit-result.js with complete GitHub Contents API GET-then-PUT persistence flow
- Enforced athlete ID match between session cookie and submitted payload (security)
- Implemented identity lock so displayName and category cannot be changed via re-submission
- Wired submit-confirm.astro to POST JSON with real fetch handler, replacing placeholder code

## Task Commits

Each task was committed atomically:

1. **Task 1: Create netlify/functions/submit-result.js** - `d5fee07` (feat)
2. **Task 2: Wire submit-confirm.astro form to POST JSON to submit-result** - `f2436e3` (feat)

**Plan metadata:** `[pending]` (docs: complete plan)

## Files Created/Modified
- `netlify/functions/submit-result.js` - POST handler: session validation, athlete ID enforcement, GitHub GET-then-PUT with SHA concurrency, identity lock, deduplication, fire-and-forget build hook
- `src/pages/submit-confirm.astro` - Form handler made async; placeholder replaced with fetch POST to /api/submit-result, redirects to /?submitted=true on success, error alerts + button re-enable on failure

## Decisions Made
- submit-result reads strava_session for athleteId only — no Strava API calls, no token refresh needed
- All validation errors use HTTP 200 + { error } JSON (consistent with strava-fetch-activity.js pattern); 401 for missing/bad session, 403 for athlete mismatch
- 409 SHA conflict retried once (re-GET then re-PUT) — if second attempt also fails, return write_conflict
- Build hook triggered fire-and-forget: no await, .catch(() => {}) silences unhandled rejection

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no new external service configuration required. Existing env vars (GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK) already required by Phase 2.

## Next Phase Readiness
- Submit persistence path is complete: confirm page → submit-result.js → GitHub JSON file → Netlify build
- Phase 7 Plan 2 (deauth/delete) can now build on the same athlete JSON file path pattern
- Leaderboard display (Phase 8) can read from public/data/results/athletes/*.json once data exists

---
*Phase: 07-data-persistence*
*Completed: 2026-04-07*
