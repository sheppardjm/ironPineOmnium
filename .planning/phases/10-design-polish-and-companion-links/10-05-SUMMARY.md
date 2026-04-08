---
phase: 10-design-polish-and-companion-links
plan: 05
subsystem: ui
tags: [astro, light-mode, error-page, css, oauth, strava]

requires:
  - phase: 10-01
    provides: light-base theme with .primary-button dark-on-light and global CSS tokens

provides:
  - Redesigned error.astro: light-mode centered layout with logo, ember eyebrow, contextual messages
  - Primary CTA "Connect with Strava Again" linking to /api/strava-auth
  - Secondary CTA "Back to Home" linking to /
  - Script block preserved: reason-code to user-friendly message mapping unchanged

affects:
  - 10-06 (final plan can confirm error page visual consistency with full site)

tech-stack:
  added: []
  patterns:
    - "Error page uses .primary-button global style (no scoped override) — consistent with light-base pattern"
    - "Scoped .secondary-button defined for light-mode context (transparent bg, dark border, night-900 text)"

key-files:
  created: []
  modified:
    - src/pages/error.astro

key-decisions:
  - "No scoped .primary-button — global style (dark bg on light page) handles it per 10-01 pattern"
  - "Eyebrow class renamed error-eyebrow with ember-500 color to signal error context (not fern-500)"
  - "min-height: 80vh on error-shell (not 100vh) — nav bar occupies top ~72px so full page height would misalign"

patterns-established:
  - "Light-mode error page: centered single-column card, no border/shadow, open layout"

duration: 1min
completed: 2026-04-08
---

# Phase 10 Plan 05: Error Page Redesign Summary

**Converted error.astro from dark fir-900 card to light-mode centered layout with ember eyebrow, logo mark, and "Connect with Strava Again" primary CTA**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-08T15:00:46Z
- **Completed:** 2026-04-08T15:01:45Z
- **Tasks:** 1
- **Files modified:** 1 (error.astro)

## Accomplishments
- Replaced dark card (fir-900 bg, fir-700 border, shadow) with open centered light-mode layout
- Added logo.svg brand mark at top (64x48, 60% opacity)
- Ember-colored eyebrow "Connection Error" in JetBrains Mono; h1 "Something went wrong"
- Changed primary CTA text from "Try Again" to "Connect with Strava Again" per CONTEXT.md
- Removed all scoped dark-mode styles; replaced with minimal light-mode style block
- Script block preserved exactly: four reason codes (strava_denied, csrf_mismatch, token_exchange_failed, insufficient_scope)

## Task Commits

1. **Task 1: Redesign error.astro for light mode** - `d15a1fc` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/error.astro` - Light-mode centered layout with logo, ember eyebrow, updated CTA text; script unchanged; scoped dark styles removed

## Decisions Made
- No scoped `.primary-button` definition — global style from 10-01 handles dark-button-on-light correctly; adding a scoped override would fight the global rule
- Eyebrow renamed to `.error-eyebrow` with `--color-ember-500` to semantically signal error state (fern-500 was neutral, ember reads as warning/action)
- `min-height: 80vh` instead of `100vh` to account for the sticky nav bar (~72px) so the error card visually centers in the visible viewport

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build succeeded on first attempt, all six verification checks passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Error page is fully light-mode consistent; no further error page work needed
- Plan 10-06 (final plan) can proceed without any blockers from this plan

---
*Phase: 10-design-polish-and-companion-links*
*Completed: 2026-04-08*
