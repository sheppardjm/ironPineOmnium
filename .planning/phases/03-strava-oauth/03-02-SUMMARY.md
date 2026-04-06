---
phase: 03-strava-oauth
plan: 02
subsystem: auth
tags: [strava, oauth, csrf, cookies, token-refresh, netlify-functions]

# Dependency graph
requires:
  - phase: 03-01
    provides: strava-auth.js that sets strava_csrf cookie and initiates OAuth redirect
  - phase: 02-01
    provides: v1 ESM handler syntax pattern (export const handler)
provides:
  - strava-callback.js — OAuth callback handler with CSRF verification, code exchange, session cookie
  - strava-tokens.js — Shared token refresh utility for Phase 4+ functions
affects: [04-strava-api, 05-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "multiValueHeaders for multiple Set-Cookie headers in v1 Lambda functions"
    - "CSRF verification: compare strava_csrf cookie to state query param"
    - "Session cookie stores JSON payload with athleteId, accessToken, refreshToken, expiresAt"
    - "Shared lib/ utilities in netlify/functions/lib/ — no handler export, pure ESM"
    - "5-minute buffer (BUFFER_SECONDS=300) before token expiry triggers refresh"

key-files:
  created:
    - netlify/functions/strava-callback.js
    - netlify/functions/lib/strava-tokens.js
  modified: []

key-decisions:
  - "multiValueHeaders used for two Set-Cookie headers — headers['Set-Cookie'] would drop all but last"
  - "athlete.id from token exchange response converted to String() immediately — Strava returns numeric ID"
  - "strava-tokens.js is a pure utility with no handler export — placed in lib/ subdirectory"
  - "5-minute refresh buffer (BUFFER_SECONDS=300) chosen to avoid edge cases at exact expiry"
  - "Refresh always returns the new refresh_token — Strava may rotate it on each refresh"

patterns-established:
  - "lib/ subdirectory in netlify/functions/ for shared utilities — not exposed as function endpoints"
  - "updated flag pattern: refresh utility returns { updated: boolean } so callers know when to persist"
  - "Scope check splits on comma and uses .includes() — handles Strava's comma-separated scope list"

# Metrics
duration: 1min
completed: 2026-04-06
---

# Phase 3 Plan 02: Strava OAuth Callback Summary

**Strava OAuth callback with CSRF verification, code exchange via fetch, HttpOnly session cookie using multiValueHeaders, and a reusable getValidAccessToken() refresh utility with 5-minute buffer**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-06T16:45:08Z
- **Completed:** 2026-04-06T16:46:23Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments
- OAuth callback handler verifies CSRF nonce, checks activity:read_all scope, and exchanges auth code for tokens in 5 sequential steps
- Session stored in HttpOnly strava_session cookie with athleteId (as string), tokens, and expiry; CSRF cookie cleared atomically using multiValueHeaders
- Reusable getValidAccessToken() utility in lib/ handles silent refresh with 5-minute buffer and always returns the potentially-rotated refresh token

## Task Commits

Each task was committed atomically:

1. **Task 1: Create strava-callback.js with full OAuth callback logic** - `f42ce29` (feat)
2. **Task 2: Create strava-tokens.js token refresh utility** - `d0c68f1` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `netlify/functions/strava-callback.js` - OAuth callback handler with denial handling, CSRF verification, scope check, token exchange, session/CSRF cookie management
- `netlify/functions/lib/strava-tokens.js` - Shared token refresh utility; getValidAccessToken() refreshes when expiresAt is within 5 minutes, returns updated flag

## Decisions Made
- **multiValueHeaders for two Set-Cookie headers:** Using `headers['Set-Cookie']` in Lambda/v1 functions only keeps the last value; multiValueHeaders correctly sends both the session cookie and the CSRF-clearing cookie.
- **athlete.id converted to String() immediately:** Strava returns a numeric athlete ID but the project convention (01-01) is to store athleteId as a plain string.
- **lib/ subdirectory pattern:** Utilities that are not Netlify Function endpoints go in `netlify/functions/lib/` — they share the ESM module environment but have no `handler` export and are not exposed as HTTP endpoints.
- **5-minute refresh buffer:** BUFFER_SECONDS=300 provides a comfortable window before token expiry to avoid race conditions at the exact expiry boundary.
- **Refresh token always updated:** Strava may rotate the refresh token on each refresh grant; the utility always returns `data.refresh_token` from the response, never the original.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - both files created cleanly, build passed on first attempt.

## User Setup Required

None - no new environment variables or external service configuration required. STRAVA_CLIENT_ID and STRAVA_CLIENT_SECRET were already established in Phase 2.

## Next Phase Readiness
- OAuth flow is complete end-to-end: strava-auth.js initiates → strava-callback.js completes → strava_session cookie holds tokens
- strava-tokens.js is ready for Phase 4 (Strava API calls) to import getValidAccessToken()
- Callers that use getValidAccessToken() must check the `updated` flag and re-serialize the session cookie if true

---
*Phase: 03-strava-oauth*
*Completed: 2026-04-06*
