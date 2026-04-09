---
phase: 13-config-and-prerequisites
plan: 01
subsystem: infra
tags: [astro, sitemap, seo, robots-txt, site-url]

# Dependency graph
requires: []
provides:
  - site URL configured in astro.config.mjs (Astro.site resolves to https://ironpineomnium.com)
  - "@astrojs/sitemap integration generating sitemap-index.xml and sitemap-0.xml"
  - sitemap filter excluding /submit-confirm/ and /error/
  - public/robots.txt with Sitemap directive pointing to absolute URL
affects:
  - 14-og-image
  - 15-meta-tags
  - 16-structured-data
  - 17-qa
  - 18-deployment

# Tech tracking
tech-stack:
  added: ["@astrojs/sitemap@^3.7.2"]
  patterns:
    - "sitemap filter pattern: exclude utility pages by full URL string match"
    - "robots.txt references sitemap-index.xml (not sitemap.xml) — astro/sitemap naming convention"

key-files:
  created: ["public/robots.txt"]
  modified: ["astro.config.mjs", "package.json", "pnpm-lock.yaml"]

key-decisions:
  - "Filter /submit-confirm/ and /error/ from sitemap — no SEO value for form-flow pages"
  - "Use trailing slash URLs in filter — @astrojs/sitemap generates trailing-slash URLs for static output"
  - "robots.txt uses Allow: / globally — page-level noindex for submit-confirm deferred to Phase 15"

patterns-established:
  - "Sitemap exclusion: filter by full absolute URL match with trailing slash"
  - "robots.txt: reference sitemap-index.xml not sitemap.xml (astro generates index file)"

# Metrics
duration: 4min
completed: 2026-04-09
---

# Phase 13 Plan 01: Config and Prerequisites Summary

**Production domain wired into Astro build system via site property and @astrojs/sitemap, with robots.txt referencing generated sitemap-index.xml**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-09T15:47:19Z
- **Completed:** 2026-04-09T15:51:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- `Astro.site` now resolves to `https://ironpineomnium.com` — prerequisite gate for all v1.1 canonical URL and OG tag work
- Sitemap integration generates `sitemap-index.xml` and `sitemap-0.xml` with 4 indexable pages (homepage, leaderboard, submit, support)
- `/submit-confirm/` and `/error/` correctly excluded from sitemap via filter function
- `public/robots.txt` created with sitemap directive pointing to absolute production URL

## Task Commits

Each task was committed atomically:

1. **Task 1: Install @astrojs/sitemap and configure astro.config.mjs** - `824c3b0` (feat)
2. **Task 2: Create robots.txt with sitemap reference** - `d30b1eb` (feat)

**Plan metadata:** (pending)

## Files Created/Modified
- `astro.config.mjs` - Added `site: "https://ironpineomnium.com"`, sitemap integration with filter
- `package.json` - Added `@astrojs/sitemap@^3.7.2` dependency
- `pnpm-lock.yaml` - Updated lockfile for sitemap package
- `public/robots.txt` - New file: crawler directives + sitemap URL

## Decisions Made
- Used `pnpm astro add sitemap` for integration scaffolding, then manually applied `site` and `filter` — the command handles import/integrations wiring automatically
- Filter uses full URL string comparison with trailing slashes (matching the generated URL format for static output)
- `Allow: /` in robots.txt is global; page-level `<meta name="robots" content="noindex">` for submit-confirm will be added in Phase 15

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — `pnpm astro add sitemap` handled dependency install and config scaffolding cleanly. Manual edits for `site` and `filter` applied without friction.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All v1.1 SEO prerequisites are now in place: `Astro.site` is defined, sitemap is generating correctly, robots.txt is present
- Phase 14 (OG image) and Phase 15 (meta tags) can now proceed — both depend on `Astro.site` being defined
- No blockers

---
*Phase: 13-config-and-prerequisites*
*Completed: 2026-04-09*
