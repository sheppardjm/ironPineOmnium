---
phase: 06-scoring-extraction
plan: 02
subsystem: ui
tags: [astro, warning, scoring, day2, sectors, kom, amber]

# Dependency graph
requires:
  - phase: 06-01
    provides: komEfforts extraction and confirm page wiring for KOM display
  - phase: 05-02
    provides: submit-confirm.astro with score preview rendering in renderPreview()
provides:
  - Day 2 zero-match warning UI with amber styling for sectors and KOM
  - "Not applicable for Day 1" neutral text (replaces ambiguous "No timed sectors matched")
affects: [06-03, 07-submit-result]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side date literal for event day detection (2026-06-07 hardcoded in browser script, not shared from server-side constant)"
    - "CSS !important override for warning colors within shared preview card context"

key-files:
  created: []
  modified:
    - src/pages/submit-confirm.astro

key-decisions:
  - "2026-06-07 literal is appropriate client-side hardcode — event date is stable, server-side EVENT_DATES not accessible in browser script"
  - "warning-value and warning-explain use !important to override preview-value/preview-explain defaults within the card"
  - "Day 1 neutral text updated from 'No timed sectors matched' to 'Not applicable for Day 1 activities' for clarity"

patterns-established:
  - "Day detection pattern: payload.startDateLocal === '2026-06-07' for conditional rendering"

# Metrics
duration: 1min
completed: 2026-04-07
---

# Phase 6 Plan 02: Day 2 Zero-Match Warning Summary

**Amber warning added to confirm page for Day 2 activities with zero sector or KOM matches, explaining the 45%/20% scoring impact without blocking submission**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-07T17:28:42Z
- **Completed:** 2026-04-07T17:29:31Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Day 2 activities with 0 sector matches show amber warning: "0 of 7 sectors matched" with 45% scoring impact explanation
- Day 2 activities with 0 KOM matches show amber warning: "0 of 3 KOM segments matched" with 20% scoring impact explanation
- Day 1 activities show clear neutral text ("Not applicable for Day 1 activities") instead of ambiguous "No timed sectors matched"
- Warning renders using existing ember color var (`--color-ember-400, #dd8258`) for visual consistency with error text elsewhere

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Day 2 zero-match warning to confirm page** - `0271b15` (feat)

**Plan metadata:** _(docs commit below)_

## Files Created/Modified
- `src/pages/submit-confirm.astro` - Added isDay2 check in sectors and KOM zero-count branches; added `.zero-match-warning`, `.warning-value`, `.warning-explain` CSS classes

## Decisions Made
- `2026-06-07` used as a client-side literal — the `EVENT_DATES` constant lives in the server-side Netlify Function and is not accessible in the browser `<script>` block. The date is stable and appropriate to hardcode here.
- Updated Day 1 neutral text from "No timed sectors matched for this activity" to "Not applicable for Day 1 activities" — clearer because Day 1 (Hiawatha's Revenge) genuinely has no timed sectors.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Phase 6 plan 02 complete; zero-match warning UX now satisfies Phase 6 success criterion #4
- Ready for 06-03 (scoring calculation logic) or Phase 7 (submit-result POST handler)

---
*Phase: 06-scoring-extraction*
*Completed: 2026-04-07*
