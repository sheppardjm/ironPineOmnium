---
phase: 05-submission-form-ux
plan: 01
subsystem: ui
tags: [astro, forms, fetch, base64url, strava-oauth]

# Dependency graph
requires:
  - phase: 04-activity-fetching
    provides: strava-fetch-activity function with validated JSON response shape
  - phase: 03-strava-oauth
    provides: strava-callback.js OAuth flow and strava_session cookie
provides:
  - /submit page: centered card with Strava activity URL input form
  - Client-side fetch flow: POST to strava-fetch-activity, inline error display, base64url redirect
  - OAuth recovery: 401 redirects to /api/strava-auth, callback returns to /submit
affects:
  - 05-02: submit-confirm page consumes base64url payload query param set here
  - 05-03: any further submission pages depend on this entry-point URL

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client-side fetch in Astro static page (no SSR)
    - base64url encoding with btoa + replace chain (ASCII-safe payload)
    - Inline error display with hidden paragraph elements
    - Astro scoped styles with CSS custom property fallbacks

key-files:
  created:
    - src/pages/submit.astro
  modified:
    - netlify/functions/strava-callback.js

key-decisions:
  - "btoa() used directly (no TextEncoder) — payload is all ASCII numeric IDs, ISO dates, and number values"
  - "TypeScript used in Astro script tag (not is:inline) so Vite compiles and bundles it"
  - "Scoped .primary-button overrides global pill style with border: none for form button context"

patterns-established:
  - "Client-side error handling pattern: hidden <p> element toggled with .hidden attribute"
  - "Auth gate pattern: check res.status === 401 before parsing JSON, redirect to /api/strava-auth"
  - "Payload handoff pattern: base64url JSON in query param, decoded by receiving page"

# Metrics
duration: 1min
completed: 2026-04-06
---

# Phase 5 Plan 1: Submit Page Summary

**Activity URL input form with client-side Strava fetch, inline error display, base64url payload redirect to /submit-confirm, and OAuth callback fixed to return riders to /submit**

## Performance

- **Duration:** 1 min 19 sec
- **Started:** 2026-04-06T22:13:37Z
- **Completed:** 2026-04-06T22:14:56Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `/submit` page as the entry point for the entire submission flow
- Client-side script handles all fetch states: loading, 401 auth redirect, validation errors, and success redirect
- Fixed OAuth callback so riders return to `/submit` (not homepage) after authenticating

## Task Commits

Each task was committed atomically:

1. **Task 1: Create src/pages/submit.astro** - `eaa050a` (feat)
2. **Task 2: Update strava-callback.js to redirect to /submit** - `8ac52f5` (fix)

**Plan metadata:** see docs commit below

## Files Created/Modified

- `src/pages/submit.astro` - Activity URL input form with fetch/error/redirect logic
- `netlify/functions/strava-callback.js` - Success redirect changed from "/" to "/submit"

## Decisions Made

- Used `btoa()` directly without TextEncoder — payload fields (activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds) are all ASCII-safe numeric strings, ISO dates, and number values. No Unicode encoding needed.
- Used TypeScript in the Astro `<script>` tag (not `is:inline`) so Vite type-checks and bundles it. This provides type safety on the error record and DOM element casts.
- Scoped `.primary-button` in submit.astro overrides the global pill-style button to use `border: none` for the `<button>` form element context. The global `.primary-button` is designed for `<a>` tags.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Build required `volta run --node 22.22.2 pnpm build` (Node 20 from system path rejected by Astro >=22.12.0). This is a known environment constraint documented in STATE.md.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- `/submit` page is live and forms the entry point for the submission flow
- The base64url payload format (`activityId`, `athleteId`, `movingTimeSeconds`, `startDateLocal`, `sectorEfforts`, `komSegmentIds`) is ready to be consumed by the `/submit-confirm` page (Plan 02)
- OAuth callback correctly routes authenticated riders back to `/submit`
- No blockers for Plan 02

---
*Phase: 05-submission-form-ux*
*Completed: 2026-04-06*
