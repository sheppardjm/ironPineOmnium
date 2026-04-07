---
phase: 05-submission-form-ux
plan: 04
subsystem: auth
tags: [strava, oauth, session-cookie, astro, netlify-functions]

# Dependency graph
requires:
  - phase: 05-02
    provides: submit-confirm page with payload decode and score preview; session cookie with athleteId
  - phase: 03-02
    provides: strava-callback.js OAuth token exchange; session cookie structure

provides:
  - Athlete firstname/lastname extracted from Strava OAuth token exchange and stored in strava_session cookie
  - strava-fetch-activity returns athleteFirstname/athleteLastname in response body
  - Token refresh in strava-fetch-activity preserves athlete name in rewritten session cookie
  - confirm page displays "Connected as [Firstname Lastname]" between heading and activity date
  - Hidden fields h-athleteFirstname/h-athleteLastname available for Phase 7 submit-result POST

affects:
  - 05-05
  - 07-submit-result
  - strava-review-submission

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tokenData.athlete fields (firstname/lastname) captured at authorization_code exchange — only time athlete object is present"
    - "Session cookie fields preserved across token refresh by explicit carry-forward in updatedPayload"
    - "UI fallback chain: name fields -> athleteId -> 'unknown' for backwards-compatible display"

key-files:
  created: []
  modified:
    - netlify/functions/strava-callback.js
    - netlify/functions/strava-fetch-activity.js
    - src/pages/submit-confirm.astro

key-decisions:
  - "05-04: athleteFirstname/athleteLastname only available from tokenData.athlete during authorization_code exchange — captured at that point and persisted in session cookie for all future requests"
  - "05-04: Token refresh explicitly carries athleteFirstname/athleteLastname from original session into updatedPayload — Strava refresh response never includes athlete object"
  - "05-04: UI fallback: if no name fields in session (pre-existing session), display 'Connected as Athlete #[id]'"

patterns-established:
  - "Session field carry-forward: when rewriting session cookie on token refresh, all non-token fields must be explicitly re-included from original session"

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 5 Plan 04: Strava Identity Display Summary

**Athlete firstname/lastname threaded from Strava OAuth exchange through session cookie and fetch-activity response into a "Connected as [name]" display on the confirm page**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-04-07T16:51:42Z
- **Completed:** 2026-04-07T16:53:43Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- strava-callback.js extracts `athleteFirstname` and `athleteLastname` from `tokenData.athlete` during the OAuth code exchange and stores them in the session cookie
- strava-fetch-activity.js includes athlete name in both the Step 8 response body and the token-refresh `updatedPayload` (ensuring name survives refresh cycles)
- submit-confirm.astro renders "Connected as [Firstname Lastname]" between the h1 and the activity date, with graceful fallback to "Connected as Athlete #[id]" for pre-existing sessions

## Task Commits

Each task was committed atomically:

1. **Task 1: Thread athlete name from OAuth through session to fetch-activity response** - `f883022` (feat)
2. **Task 2: Display Strava identity on the confirm page** - `95e7b97` (feat)

**Plan metadata:** (in progress — final commit follows)

## Files Created/Modified
- `netlify/functions/strava-callback.js` - Extracts `athleteFirstname`/`athleteLastname` from `tokenData.athlete`, includes both in `sessionPayload` JSON
- `netlify/functions/strava-fetch-activity.js` - Preserves athlete name in `updatedPayload` on token refresh; adds `athleteFirstname`/`athleteLastname` to Step 8 response body
- `src/pages/submit-confirm.astro` - Payload type extended; `#athlete-identity` element added; `renderPreview` populates identity display; hidden fields `h-athleteFirstname`/`h-athleteLastname` added; `populateHiddenFields` sets them; `.athlete-identity` CSS rule added

## Decisions Made
- Athlete name only available in the `authorization_code` exchange response (not refresh responses) — captured once at that point and persisted in the session cookie
- Token refresh in strava-fetch-activity must explicitly carry `athleteFirstname`/`athleteLastname` from the original session into the rewritten cookie since the refresh response omits the athlete object
- UI uses `?? ""` / `|| ""` fallbacks throughout for backwards compatibility with sessions that predate this change

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- The Strava identity gap from 05-VERIFICATION.md is now closed: riders see "Connected as [name]" on the confirm page
- Phase 5 verification criteria now fully met (score preview + identity display both complete)
- Phase 7 (submit-result) can use `athleteFirstname`/`athleteLastname` from hidden fields in the POST
- Strava athlete limit review (01-02) can now reference the confirm page as showing Strava connection identity

---
*Phase: 05-submission-form-ux*
*Completed: 2026-04-07*
