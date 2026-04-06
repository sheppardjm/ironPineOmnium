---
phase: 03-strava-oauth
plan: 01
subsystem: auth
tags: [oauth, strava, csrf, cookie-es, astro]

requires:
  - phase: 02-netlify-infrastructure
    provides: Netlify Functions v1 ESM handler pattern, netlify.toml routing
provides:
  - OAuth initiation endpoint (strava-auth.js) with CSRF nonce
  - Error page (error.astro) for all OAuth failure reasons
  - cookie-es dependency for cookie serialization
affects: [03-strava-oauth]

tech-stack:
  added: [cookie-es]
  patterns: [CSRF nonce via HttpOnly cookie, client-side query param reading in static Astro]

key-files:
  created: [netlify/functions/strava-auth.js, src/pages/error.astro]
  modified: [package.json, pnpm-lock.yaml]

key-decisions:
  - "CSRF nonce is 32 random bytes hex-encoded (64 chars) — sufficient entropy for single-use state param"
  - "strava_csrf cookie maxAge set to 600s (10 min) — generous for OAuth redirect round-trip"
  - "error.astro uses client-side script to read reason query param — Astro static mode has no runtime SSR"
  - "Secure flag relaxed when NETLIFY_DEV=true — allows local dev without HTTPS"

patterns-established:
  - "OAuth error redirect pattern: redirect to /error?reason={code} with client-side message mapping"
  - "Cookie serialization pattern: import serialize from cookie-es, set via headers['Set-Cookie']"

duration: 8min
completed: 2026-04-06
---

# Plan 03-01: Auth Redirect + Error Page Summary

**OAuth initiation endpoint with CSRF nonce cookie and error page handling 5 failure reason codes**

## Performance

- **Duration:** ~8 min
- **Tasks:** 2
- **Files created:** 2
- **Files modified:** 2

## Accomplishments
- strava-auth.js redirects to Strava OAuth with correct params (client_id, redirect_uri, scope=activity:read_all, state nonce)
- CSRF nonce stored in HttpOnly cookie with secure defaults (secure in prod, relaxed in dev)
- error.astro renders user-friendly messages for 5 OAuth failure reasons via client-side script
- Build passes cleanly with new error page route at /error/

## Task Commits

1. **Task 1: Install cookie-es and create strava-auth.js** - `8bb8ee1` (feat)
2. **Task 2: Create error.astro OAuth failure page** - `bc20ae8` (feat)

## Files Created/Modified
- `netlify/functions/strava-auth.js` - OAuth initiation endpoint with CSRF nonce
- `src/pages/error.astro` - Error page with 5 reason code mappings
- `package.json` - Added cookie-es dependency
- `pnpm-lock.yaml` - Lock file updated

## Decisions Made
- Used client-side script for error reason mapping since Astro static mode can't read query params at runtime
- Styled error page with CSS custom properties matching site design system (fir, mist, ember, fern colors)

## Deviations from Plan
None - plan executed as specified.

## Issues Encountered
None.

## Next Phase Readiness
- strava-auth.js ready for callback function to reference (03-02 depends on CSRF cookie pattern)
- error.astro ready to receive redirects from callback function failures
- cookie-es available for callback function's cookie parsing needs

---
*Phase: 03-strava-oauth*
*Completed: 2026-04-06*
