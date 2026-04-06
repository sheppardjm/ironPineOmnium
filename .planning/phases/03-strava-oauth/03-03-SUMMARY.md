---
phase: 03-strava-oauth
plan: 03
subsystem: auth
tags: [oauth, strava, e2e-test, netlify-dev]

requires:
  - phase: 03-strava-oauth
    provides: strava-auth.js, strava-callback.js, error.astro
provides:
  - Verified end-to-end OAuth round-trip with real Strava account
  - netlify.toml dev config fixed for multi-project environments
affects: [04-activity-fetching]

tech-stack:
  added: []
  patterns: [netlify dev #static framework for port-conflict-free local dev]

key-files:
  created: []
  modified: [netlify.toml]

key-decisions:
  - "netlify dev switched to framework=#static — serves from dist/ directly, avoids Astro dev server port auto-increment conflicts"
  - "STRAVA_REDIRECT_URI must be temporarily changed to localhost for local OAuth testing"

patterns-established:
  - "Local OAuth testing: change STRAVA_REDIRECT_URI to http://localhost:8888/api/strava-callback and Strava callback domain to localhost"
  - "netlify dev with #static: run astro build before testing page changes, functions still hot-reload"

duration: 15min
completed: 2026-04-06
---

# Plan 03-03: End-to-end OAuth Round-trip Test Summary

**Full OAuth flow verified with real Strava account — happy path, denial, and error page rendering all confirmed**

## Performance

- **Duration:** ~15 min (includes debugging netlify dev port issue)
- **Tasks:** 2 (pre-flight + human verification)
- **Files modified:** 1

## Accomplishments
- Happy path: /api/strava-auth → Strava consent → callback → session cookie with athleteId, accessToken, refreshToken, expiresAt
- Denial path: cancel on Strava → /error?reason=strava_denied with user-friendly message
- Error page: csrf_mismatch and insufficient_scope reason codes render correct messages
- CSRF cookie cleared after successful exchange
- Session cookie contains all required fields with correct types (athleteId as string)

## Task Commits

1. **Task 1: Pre-flight checks** — no commit (verification only)
2. **Task 2: Human verification** — checkpoint, all 3 tests approved
3. **netlify.toml fix** — `e621003` (fix)

**Plan metadata:** see below

## Files Created/Modified
- `netlify.toml` — switched [dev] to framework=#static, removed hardcoded targetPort

## Decisions Made
- Switched netlify dev to `#static` framework mode to avoid port conflicts when multiple Astro projects run simultaneously
- Documented that local OAuth testing requires temporarily changing STRAVA_REDIRECT_URI and Strava callback domain

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] netlify dev port mismatch causing 404 on error page**
- **Found during:** Task 2 (human verification)
- **Issue:** netlify.toml had hardcoded targetPort=4321 but Astro auto-incremented to 4323 due to port conflicts from other running projects
- **Fix:** Switched to framework="#static" which serves from dist/ directly without proxying to Astro dev server
- **Files modified:** netlify.toml
- **Verification:** All three test paths confirmed working
- **Committed in:** e621003

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was necessary to complete verification. No scope creep.

## Issues Encountered
- STRAVA_REDIRECT_URI was set to production URL — needed temporary change to localhost for local testing
- Multiple Astro projects running simultaneously caused port 4321 to be occupied

## Next Phase Readiness
- OAuth flow fully operational — Phase 4 can use strava_session cookie and getValidAccessToken()
- netlify dev config stable for multi-project environments

---
*Phase: 03-strava-oauth*
*Completed: 2026-04-06*
