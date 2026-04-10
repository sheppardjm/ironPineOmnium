---
phase: 15-baselayout-extension-and-page-metadata
plan: 01
subsystem: ui
tags: [astro, open-graph, twitter-card, canonical, seo, favicon, meta-tags]

# Dependency graph
requires:
  - phase: 14-og-image-and-favicon-assets
    provides: /og-image.png (1200x630), /favicon.ico, /apple-touch-icon.png, /site.webmanifest in public/
  - phase: 13-sitemap-and-robots
    provides: astro.config.mjs site field set to https://ironpineomnium.com
provides:
  - BaseLayout.astro emitting full OG block (og:title, og:description, og:image, og:url, og:type, og:site_name + image dimensions/alt)
  - BaseLayout.astro emitting Twitter Card block (twitter:card=summary_large_image, twitter:title, twitter:description, twitter:image)
  - BaseLayout.astro emitting canonical link tag (absolute URL, same variable as og:url)
  - BaseLayout.astro emitting full favicon set (favicon.ico, apple-touch-icon.png, site.webmanifest)
  - Conditional noindex meta tag via noindex prop (false by default)
  - Extended Props interface: ogImage?, noindex?, type?
affects:
  - 15-02-per-page-metadata (passes title/description/noindex props to BaseLayout)
  - 16-json-ld (uses slot name="head" for injection into BaseLayout head)
  - 17-qa (verifies all meta tags in build output)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Absolute URL construction via new URL(Astro.url.pathname, Astro.site) — never string concatenation"
    - "Single canonical variable used for both canonical href and og:url to prevent mismatch"
    - "ogImage prop accepts root-relative path, BaseLayout constructs absolute URL internally"
    - "noindex prop defaults to false — only submit-confirm page sets it true"

key-files:
  created: []
  modified:
    - src/layouts/BaseLayout.astro

key-decisions:
  - "og:url and canonical use the same computed canonicalURL variable — structural guarantee against trailing-slash mismatch"
  - "twitter:card set explicitly (not relying on OG fallback — twitter:card has no OG fallback)"
  - "twitter:site omitted — event has no Twitter/X account"
  - "noindex emits noindex-only (not noindex,nofollow) per SEO-06 requirement"
  - "slot name='head' preserved at end of head for Phase 16 JSON-LD injection"

patterns-established:
  - "Pattern: Meta tag block order — charset/viewport/title/description, canonical, OG, Twitter Card, favicon set, conditional noindex, fonts, slot"
  - "Pattern: ogImage prop is root-relative path; absolute URL resolved in layout, not pages"

# Metrics
duration: 1min
completed: 2026-04-10
---

# Phase 15 Plan 01: BaseLayout Extension and Page Metadata Summary

**OG, Twitter Card, canonical, and full favicon set added to BaseLayout.astro via Astro.site absolute URL construction — all 6 pages now emit complete social/search meta tags from a single layout**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-10T01:12:25Z
- **Completed:** 2026-04-10T01:13:17Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Extended BaseLayout Props with `ogImage?`, `noindex?`, `type?` — backward-compatible with no changes required to existing page call sites
- Constructed absolute URLs using `new URL()` + `Astro.site` for canonical, og:url, og:image, and twitter:image
- Added full Open Graph block (9 tags) and Twitter Card block (4 tags) to every page via the shared layout
- Replaced SVG-only favicon with proper favicon set: favicon.ico, apple-touch-icon.png, site.webmanifest
- Wired conditional noindex meta tag (renders only when `noindex={true}` is passed)

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend BaseLayout Props and add meta tag block** - `7eab032` (feat)

**Plan metadata:** (follows below)

## Files Created/Modified
- `src/layouts/BaseLayout.astro` - Extended with Props interface, absolute URL vars, and complete meta tag block in head

## Decisions Made
- `canonicalURL` and `og:url` share the same variable — structural guarantee that they can never diverge
- `twitter:card` is set explicitly rather than relying on OG fallback (which does not exist for card type)
- `twitter:site` omitted — no event Twitter/X account exists
- `noindex` emits `content="noindex"` only (not `noindex,nofollow`) per SEO-06 spec
- `slot name="head"` preserved at the end of `<head>` — needed by Phase 16 for JSON-LD injection

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None. The `grep -c 'logo.svg'` check returned 2 initially — investigated and confirmed both occurrences are `<img>` tags in page content (Nav and hero sections), not `<link rel="icon">` tags. The old SVG favicon link is removed. The `grep -c 'noindex'` check returned 1 — investigated and confirmed this is the HTML comment `<!-- Conditional noindex -->` in the template output, not a `<meta name="robots">` tag.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness
- BaseLayout is now the canonical source of truth for all social/search meta tags
- Phase 15-02 should pass unique `title`, `description`, and `noindex={true}` (for submit-confirm) to each BaseLayout call site
- Phase 16 JSON-LD injection will use the preserved `<slot name="head" />` in BaseLayout
- Phase 17 QA can verify meta tags by inspecting `dist/` HTML output — all 6 pages already pass build verification

---
*Phase: 15-baselayout-extension-and-page-metadata*
*Completed: 2026-04-10*
