---
phase: 15-baselayout-extension-and-page-metadata
plan: 02
subsystem: ui
tags: [astro, seo, meta-tags, noindex, open-graph, page-metadata]

# Dependency graph
requires:
  - phase: 15-01-baselayout-extension
    provides: BaseLayout.astro with title/description/noindex props and full OG/Twitter Card emission
provides:
  - All 6 pages with unique, descriptive <title> values
  - All 6 pages with unique <meta name="description"> values matching og:description
  - submit-confirm.astro emitting <meta name="robots" content="noindex">
  - Complete per-page metadata for SEO and social sharing
affects:
  - 16-json-ld (all pages now have correct titles/descriptions; JSON-LD will augment)
  - 17-qa (verifies per-page metadata in dist/ HTML output)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "noindex={true} prop pattern for excluding transient flow pages from search indexing"
    - "leaderboard.astro converted from single-line to multi-line BaseLayout call to add description"

key-files:
  created: []
  modified:
    - src/pages/index.astro
    - src/pages/leaderboard.astro
    - src/pages/submit.astro
    - src/pages/submit-confirm.astro
    - src/pages/error.astro

key-decisions:
  - "support.astro unchanged — existing props already matched target values exactly"
  - "error.astro description updated to include full site name for brand consistency in search snippets"
  - "leaderboard.astro converted to multi-line BaseLayout call to accept description prop"
  - "submit-confirm.astro noindex={true} — transient submission flow page has no standalone search value"

patterns-established:
  - "Pattern: noindex={true} passed via prop to BaseLayout — pages never emit robots meta directly"

# Metrics
duration: 5min
completed: 2026-04-09
---

# Phase 15 Plan 02: Per-Page Metadata Summary

**Unique, descriptive title and meta description applied to all 6 pages; submit-confirm marked noindex via BaseLayout prop — Phase 15 SEO metadata requirements fully satisfied**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-09T21:15:00Z
- **Completed:** 2026-04-09T21:20:00Z
- **Tasks:** 1
- **Files modified:** 5

## Accomplishments
- Updated index.astro with substantive description covering the full weekend format (fondo + grinduro + Strava submission)
- Added missing description prop to leaderboard.astro (previously had title only), converting to multi-line format
- Updated submit.astro title from "Submit Activity" to "Submit Your Activity" and improved description specificity
- Added `noindex={true}` to submit-confirm.astro — `<meta name="robots" content="noindex">` now emits in dist output
- Updated error.astro description with full site name for brand consistency in search snippets
- All 6 pages verified to have unique title and description values — no duplicates

## Task Commits

Each task was committed atomically:

1. **Task 1: Update page titles, descriptions, and noindex** - `c3b289b` (feat)

**Plan metadata:** (follows below)

## Files Created/Modified
- `src/pages/index.astro` - Updated description to substantive weekend summary
- `src/pages/leaderboard.astro` - Added description prop, converted to multi-line BaseLayout call
- `src/pages/submit.astro` - Updated title ("Submit Your Activity") and description
- `src/pages/submit-confirm.astro` - Added noindex={true} prop
- `src/pages/error.astro` - Updated description with full site name

## Decisions Made
- support.astro had the exact target title and description already set — left unchanged to avoid unnecessary diff
- error.astro description extended to "...return to the Iron & Pine Omnium home page" for brand consistency (vs. plain "return home")
- noindex applied to submit-confirm only, as specified by SEO-06 — error.astro intentionally excluded from noindex

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- Phase 15 complete: BaseLayout emits full meta tag block (15-01) and all pages have unique per-page metadata (15-02)
- Phase 16 JSON-LD can inject structured data via `<slot name="head" />` in BaseLayout
- Phase 17 QA can verify final meta output across all dist/ HTML files — all 6 pages pass build verification

---
*Phase: 15-baselayout-extension-and-page-metadata*
*Completed: 2026-04-09*
