---
phase: 07-data-persistence
plan: 02
subsystem: infra
tags: [netlify-functions, strava-webhook, github-api, deauth, esm]

# Dependency graph
requires:
  - phase: 07-01
    provides: submit-result.js and GitHub Contents API write pattern
provides:
  - strava-webhook.js Netlify Function handling Strava subscription handshake (GET) and deauth events (POST)
  - Automatic athlete JSON file deletion from GitHub on Strava deauth
  - Rebuild trigger on deauth to remove rider from leaderboard
affects:
  - 07-03 (webhook subscription registration requires this handler to be deployed and verified)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GitHub GET-then-DELETE pattern: fetch SHA via GET /contents/{path}, then DELETE with sha in body"
    - "Strava webhook always-200 pattern: catch all errors internally, never return non-200 to Strava"
    - "Fire-and-forget build hook: fetch(hookUrl, { method: 'POST' }).catch(() => {})"

key-files:
  created:
    - netlify/functions/strava-webhook.js
  modified: []

key-decisions:
  - "POST handler always returns 200/EVENT_RECEIVED regardless of internal errors — Strava retries on non-200 and retry is fine (idempotent delete)"
  - "Both string 'false' and boolean false checked for authorized field — Strava sends string but defensive check added"
  - "GET-then-DELETE pattern required by GitHub Contents API — SHA must be retrieved before file can be deleted"
  - "No imports used — fetch() is built-in (Node 18+), no cookie parsing needed in this function"
  - "404 on GET treated as already-deleted — no error, no action, returns 200 normally"
  - "Build hook only triggered after successful DELETE (not on 404/already-gone) — avoids spurious rebuilds"

patterns-established:
  - "Strava webhook pattern: validate GET handshake, detect deauth in POST, always return 200"
  - "GitHub delete pattern: GET for SHA → DELETE with SHA → trigger rebuild on success"

# Metrics
duration: 1min
completed: 2026-04-07
---

# Phase 7 Plan 02: Strava Webhook Function Summary

**Netlify Function handling Strava subscription handshake (GET hub.challenge echo) and deauth events (POST GitHub file delete + rebuild trigger) with always-200 response pattern**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-07T17:58:38Z
- **Completed:** 2026-04-07T17:59:20Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- GET handler validates Strava subscription handshake by comparing hub.verify_token to STRAVA_VERIFY_TOKEN env var and echoing hub.challenge as JSON
- POST handler detects deauth events (object_type=athlete, aspect_type=update, authorized=false), deletes athlete JSON from GitHub via GET-then-DELETE pattern, and triggers rebuild
- Always returns 200 to Strava regardless of internal errors — prevents infinite retry loops

## Task Commits

Each task was committed atomically:

1. **Task 1: Create netlify/functions/strava-webhook.js** - `be29111` (feat)

**Plan metadata:** _(pending)_

## Files Created/Modified

- `netlify/functions/strava-webhook.js` - Dual GET/POST Strava webhook handler; GET validates subscription handshake, POST detects deauth, deletes athlete JSON from GitHub, triggers rebuild

## Decisions Made

- POST handler always returns 200/EVENT_RECEIVED regardless of internal GitHub API errors — Strava retries on non-200, and retrying a delete is idempotent
- Both `authorized === "false"` (string) and `authorized === false` (boolean) are checked — Strava sends string but boolean check added defensively
- GET-then-DELETE is required by GitHub Contents API — SHA must be fetched before deletion
- 404 on GET treated as already-deleted — skip action, return 200 normally
- Build hook only fired after successful DELETE, not after 404/already-gone — avoids spurious rebuilds when deauth arrives twice
- No npm imports used — fetch() is Node 18+ built-in, no cookie parsing required in this function

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no new environment variables introduced. Existing env vars required by this function (STRAVA_VERIFY_TOKEN, GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO, NETLIFY_BUILD_HOOK) were established in prior phases.

## Next Phase Readiness

- strava-webhook.js is deployed on next git push to Netlify
- Plan 07-03 can now register the Strava webhook subscription pointing at the deployed function URL
- GET handshake ready for Strava to validate during subscription registration
- No blockers

---
*Phase: 07-data-persistence*
*Completed: 2026-04-07*
