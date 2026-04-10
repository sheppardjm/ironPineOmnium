# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** v1.1 SEO & Social Sharing — Phase 15: BaseLayout Extension and Page Metadata

## Current Position

Phase: 15 of 18 (BaseLayout Extension and Page Metadata)
Plan: 02 of 02
Status: Phase complete
Last activity: 2026-04-09 — Completed 15-02-PLAN.md (per-page metadata: titles, descriptions, noindex)

Progress: [████████████████░░░░] v1.0 complete, v1.1 phase 15 done (16/18)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.1 scoping: Single static OG image (not per-page or dynamic) — Satori/Sharp has documented Netlify friction
- v1.1 scoping: Extend BaseLayout.astro directly, no astro-seo library — Astro 6 compat unconfirmed for third-party
- v1.1 architecture: `site` URL in astro.config.mjs is prerequisite gate — must be set before any other tag work
- 13-01 sitemap filter: Use full URL with trailing slash for exclude match (static output format)
- 13-01 robots.txt: References sitemap-index.xml (not sitemap.xml) — astro/sitemap naming convention
- 14-02 favicon gen: sharp + ImageMagick combo (sharp for PNG, ImageMagick for ICO multi-size); script in scripts/
- 14-01 OG image: two-column editorial layout with @napi-rs/canvas; 53KB PNG; logo as silhouette on dark panel
- 15-01 canonical/og:url: Same computed variable used for both — structural guarantee against trailing-slash mismatch
- 15-01 twitter:card: Set explicitly (no OG fallback exists for card type)
- 15-01 noindex: Emits noindex-only (not noindex,nofollow) per SEO-06 — sitemap exclusion handles crawl separately

### Pending Todos

- Follow up on Strava athlete limit review by 2026-04-22 if no response (developers@strava.com)
- Update companion sites (mkUltraGravel, hiawathasRevenge) to link to ironpineomnium.com

### Blockers/Concerns

- **[Pending]**: Strava athlete limit review submitted 2026-04-08 — awaiting approval (7-10 business day window, follow up by 2026-04-22)
- **[Note]**: If not approved by 2026-06-01, activate CSV manual entry fallback procedure (scripts/csv-fallback.ts)
- **[Note]**: Do not share any social links until Phase 17 QA clears — platform caches lock in broken previews for ~30 days

## Session Continuity

Last session: 2026-04-09
Stopped at: Completed 15-02-PLAN.md — Phase 15 fully complete; ready for Phase 16 (JSON-LD)
Resume file: None
