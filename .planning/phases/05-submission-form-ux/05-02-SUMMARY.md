---
phase: 05-submission-form-ux
plan: 02
subsystem: ui
tags: [astro, base64url, form-validation, score-preview, client-side-script]

# Dependency graph
requires:
  - phase: 05-01
    provides: base64url payload shape from /submit — { activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds }
  - phase: 04-01
    provides: strava-fetch-activity response shape and field types
  - phase: 01-01
    provides: scoring weights (day1Weight 0.35, sectorWeight 0.45, komWeight 0.2) and segment counts (7 sector, 3 KOM)
provides:
  - "/submit-confirm page with payload decode, score preview, and identity form"
  - "fromBase64url decode function (inverse of btoa-based encoding in submit.astro)"
  - "Score preview showing Day 1 moving time (35%), Day 2 sectors (45%), Day 2 KOM (20%)"
  - "Hidden fields preserving all payload data for Phase 7 submit-result POST"
  - "Identity form requiring display name and category (men/women/non-binary)"
  - "Cancel flow returning rider to /submit"
affects:
  - phase: 05-03 (submit-result page will POST using hidden fields from this page)
  - phase: 07 (submit-result Netlify function receives name + category + payload fields)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "fromBase64url decode: replace - + _ / pad = then atob+JSON.parse (inverse of btoa in submit.astro)"
    - "Score preview populated via innerHTML in DOMContentLoaded client script"
    - "setCustomValidity for soft form validation without native browser bubbles until submit"
    - "Hidden inputs carry payload data across pages for multi-step form flow"

key-files:
  created:
    - src/pages/submit-confirm.astro
    - dist/submit-confirm/index.html
    - dist/_astro/submit-confirm@_@astro.DTAvtgHg.css
  modified: []

key-decisions:
  - "Payload decode uses fromBase64url (exact inverse of btoa encoding established in 05-01) — no new encoding scheme"
  - "Missing or malformed payload silently redirects to /submit — no error page needed"
  - "Form submit handler uses Phase 7 placeholder (sets button text to 'Submission ready') — actual POST deferred"
  - "sectorEfforts object and komSegmentIds array JSON.stringified into hidden inputs — preserved exactly for Phase 7"
  - "Score preview cards use innerHTML assignment from script — keeps HTML skeleton minimal and avoids SSR"

patterns-established:
  - "Multi-step form: encode data in URL, decode on confirm page, carry in hidden fields for final POST"
  - "Preview card structure: preview-label (uppercase eyebrow) + preview-value (display value) + preview-explain (weight context)"

# Metrics
duration: 2min
completed: 2026-04-06
---

# Phase 5 Plan 02: Submit-Confirm Page Summary

**Client-side confirm page decodes base64url payload, renders score preview with 35%/45%/20% weight cards, collects display name + category, and preserves all payload data in hidden fields for Phase 7's submit-result POST**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-06T22:17:44Z
- **Completed:** 2026-04-06T22:19:44Z
- **Tasks:** 1
- **Files modified:** 1 created

## Accomplishments

- Created /submit-confirm with base64url payload decode and graceful redirect to /submit on missing/malformed payload
- Score preview renders all three components inline: Day 1 moving time (35%), Day 2 sector count + total time (45%), Day 2 KOM count (20%)
- Identity form validates name (required text) and category (required select: men/women/non-binary) before allowing submission
- Hidden inputs carry activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts (JSON), komSegmentIds (JSON) ready for Phase 7

## Task Commits

Each task was committed atomically:

1. **Task 1: Create submit-confirm.astro with payload decode and score preview** - `fe65819` (feat)

**Plan metadata:** (pending docs commit)

## Files Created/Modified

- `src/pages/submit-confirm.astro` — Confirm page: payload decode, score preview with weight labels, identity form, hidden fields, cancel flow
- `dist/submit-confirm/index.html` — Built output (499 lines in source)
- `dist/_astro/submit-confirm@_@astro.DTAvtgHg.css` — Scoped styles bundle

## Decisions Made

- Payload decode uses `fromBase64url` as the exact inverse of `btoa` encoding from 05-01 — no new encoding scheme introduced
- Missing or malformed payload silently redirects to `/submit` rather than showing an error page — simplest correct behavior
- Form submit placeholder sets button text to "Submission ready" and disables it — Phase 7 will replace with actual POST
- `sectorEfforts` (object) and `komSegmentIds` (array) are `JSON.stringify`-d into hidden inputs so Phase 7 can parse them back
- Score preview cards use `innerHTML` assignment in DOMContentLoaded — keeps the Astro template skeleton minimal

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None — build succeeded on first attempt. Note: Node 22 required (`volta run --node 22.22.2 pnpm build`) consistent with established project pattern.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- /submit-confirm page is complete and compiled to dist
- Hidden fields are in place — Phase 7 (submit-result function) can read activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds from form POST body
- Cancel flow (`href="/submit"`) is in place
- Identity fields (name + category) are validated and ready
- Placeholder confirm behavior must be replaced in Phase 7 with actual `fetch("/api/submit-result", ...)`

---
*Phase: 05-submission-form-ux*
*Completed: 2026-04-06*
