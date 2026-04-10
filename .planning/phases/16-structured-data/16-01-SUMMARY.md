---
phase: 16-structured-data
plan: 01
subsystem: seo
tags: [json-ld, structured-data, schema.org, event, rich-results, google]

# Dependency graph
requires:
  - phase: 15-baselayout-metadata
    provides: BaseLayout with slot name="head" for head injection
provides:
  - Event JSON-LD schema on homepage head for Google rich result eligibility
affects: [17-qa, google-rich-results, search-discoverability]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "JSON-LD injected via slot='head' on BaseLayout; set:html prevents Astro HTML-escaping"

key-files:
  created: []
  modified:
    - src/pages/index.astro

key-decisions:
  - "Use @type Event (not SportsEvent) — Event is the only type documented for Google event rich result cards"
  - "Use set:html={JSON.stringify(eventSchema)} — mandatory to prevent &quot; entities that break JSON parsing"
  - "Date-only format (2026-06-06) for startDate/endDate — no fabricated times per Google accuracy guidelines"
  - "No streetAddress — event is on forest roads; addressLocality + addressRegion + addressCountry is sufficient and honest"
  - "sport: Cycling added as supplemental property for semantic accuracy alongside @type: Event"

patterns-established:
  - "JSON-LD injection pattern: slot='head' + set:html on script tag in page component"

# Metrics
duration: 1min
completed: 2026-04-09
---

# Phase 16 Plan 01: Structured Data Summary

**Event JSON-LD schema injected into homepage head via slot="head" + set:html, enabling Google rich result event card eligibility for Iron & Pine Omnium**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-10T01:47:08Z
- **Completed:** 2026-04-10T01:47:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added `eventSchema` object to `index.astro` frontmatter with all required Google Event rich result properties
- Injected `<script type="application/ld+json">` into `<head>` via BaseLayout's `slot="head"` mechanism
- Used `set:html` to serialize JSON without HTML-escaping — verified zero `&quot;` entities in built output
- Build verified clean; all 8 verification checks pass

## Task Commits

Each task was committed atomically:

1. **Task 1: Add Event JSON-LD schema to index.astro** - `21594bd` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/pages/index.astro` - Added eventSchema object in frontmatter and JSON-LD script tag injected via slot="head"

## Decisions Made

- **@type Event not SportsEvent:** Research confirmed Event is the only type documented as eligible for Google's event rich result cards. SportsEvent is not mentioned in Google's structured data documentation for this feature.
- **set:html is mandatory:** Without it, Astro HTML-escapes JSON content producing `&quot;` entities that silently break JSON parsing. Curly-brace interpolation as children also gets HTML-escaped.
- **Date-only startDate/endDate:** No specific start times known; fabricating a time would violate Google's accuracy guidelines. ISO 8601 date-only format is valid.
- **No streetAddress:** Event is on Hiawatha National Forest roads — no fixed venue address exists. addressLocality + addressRegion + addressCountry is accurate.
- **sport: Cycling added:** Supplemental semantic property alongside @type: Event for richer machine understanding.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Homepage now emits a valid Event JSON-LD block in `<head>`
- Google's Rich Result Test can be used to validate: https://search.google.com/test/rich-results
- Ready for Phase 17 QA — structured data should be included in QA validation pass
- No blockers

---
*Phase: 16-structured-data*
*Completed: 2026-04-09*
