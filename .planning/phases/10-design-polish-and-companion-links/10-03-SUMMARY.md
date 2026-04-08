---
phase: 10-design-polish-and-companion-links
plan: 03
subsystem: ui
tags: [astro, css, split-layout, form, strava, light-theme]

requires:
  - phase: 10-design-polish-and-companion-links/10-01
    provides: .split-shell, .split-brand, .split-form, .form-field, .submit-error-banner, .primary-button (dark on light) in global.css

provides:
  - Redesigned submit.astro with split layout (brand panel left, form right)
  - Bold brand panel: logo, brand-eyebrow, brand-title, brand-body on dark background
  - Borderless-bottom URL input via global .form-field styles
  - Prominent error banner via global .submit-error-banner (display:none/block toggle)
  - Removed all old scoped styles (.submit-shell, .submit-card, .primary-button overrides)

affects:
  - 10-04 through 10-06 (submit.astro redesign is complete; confirm page follows same split pattern)

tech-stack:
  added: []
  patterns:
    - "Split layout on form pages: .split-shell > .split-brand + .split-form; brand panel on left carries logo and event identity"
    - "Error banners: use .submit-error-banner with style.display toggle (not hidden attribute) for div elements"

key-files:
  created: []
  modified:
    - src/pages/submit.astro

key-decisions:
  - "Error element changed from <p hidden> to <div style='display:none'> to accommodate .submit-error-banner block styles"
  - "TypeScript cast updated from HTMLParagraphElement to HTMLDivElement to match new element type"
  - "Entire old scoped <style> block removed — all submit page styling now from global.css or minimal page-specific scoped block"
  - "brand-eyebrow uses --font-mono (JetBrains Mono) for label identity on dark panel"

patterns-established:
  - "Submit/confirm split pages: brand panel uses .split-brand (dark bg), form panel uses .split-form (light bg)"
  - "Page-specific scoped styles kept minimal: only layout helpers (.form-content) and typography (.brand-title, .form-heading) not in global.css"

duration: 1min
completed: 2026-04-08
---

# Phase 10 Plan 03: Submit Page Redesign Summary

**Replaced centered dark card submit form with split layout: dark brand panel (logo + "Submit Your Ride" heading) on left, light form panel with borderless URL input on right**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-08T15:00:25Z
- **Completed:** 2026-04-08T15:01:58Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Rewrote submit.astro HTML structure from `.submit-shell > .submit-card` to `.split-shell > .split-brand + .split-form`
- Brand panel includes logo SVG, mono eyebrow label, large display heading, body copy — all on dark background from global .split-brand
- Form panel uses global `.form-field` for borderless-bottom URL input and `.submit-error-banner` for bold error display
- Removed 130 lines of old scoped styles (dark card styles, scoped .primary-button, scoped input, .eyebrow overrides)
- Preserved all client-side script logic exactly: toBase64url, fetch to /api/strava-fetch-activity, 401 redirect, error handling, success redirect

## Task Commits

1. **Task 1: Redesign submit.astro with split layout** - `b7d1184` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/pages/submit.astro` - Split layout with brand panel and form panel; old scoped styles removed; script logic unchanged

## Decisions Made
- Error element type changed from `<p hidden>` to `<div style="display:none">` — the global `.submit-error-banner` uses `display:block` as a block element so a div is semantically correct and avoids `hidden` attribute conflicts
- TypeScript cast on errorEl updated from `HTMLParagraphElement` to `HTMLDivElement` to match
- `brand-eyebrow` uses `--font-mono` to match the editorial label style from the design direction (mono caps labels on dark panels)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None — build succeeded on first attempt. All verification checks passed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Submit page split layout complete; confirm page (10-04) follows the same .split-shell pattern
- All global styles (.split-shell, .form-field, .submit-error-banner) already in place from 10-01
- Script logic unchanged — functional behavior identical to pre-redesign

---
*Phase: 10-design-polish-and-companion-links*
*Completed: 2026-04-08*
