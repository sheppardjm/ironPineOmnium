# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-09)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** v1.1 SEO & Social Sharing — Phase 13: Config and Prerequisites

## Current Position

Phase: 13 of 18 (Config and Prerequisites)
Plan: 01 of 01 in phase
Status: In progress
Last activity: 2026-04-09 — Completed 13-01-PLAN.md (site URL, sitemap, robots.txt)

Progress: [██████████░░░░░░░░░░] v1.0 complete, v1.1 in progress (13/18)

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- v1.1 scoping: Single static OG image (not per-page or dynamic) — Satori/Sharp has documented Netlify friction
- v1.1 scoping: Extend BaseLayout.astro directly, no astro-seo library — Astro 6 compat unconfirmed for third-party
- v1.1 architecture: `site` URL in astro.config.mjs is prerequisite gate — must be set before any other tag work
- 13-01 sitemap filter: Use full URL with trailing slash for exclude match (static output format)
- 13-01 robots.txt: References sitemap-index.xml (not sitemap.xml) — astro/sitemap naming convention

### Pending Todos

- Follow up on Strava athlete limit review by 2026-04-22 if no response (developers@strava.com)
- Update companion sites (mkUltraGravel, hiawathasRevenge) to link to ironpineomnium.com

### Blockers/Concerns

- **[Pending]**: Strava athlete limit review submitted 2026-04-08 — awaiting approval (7-10 business day window, follow up by 2026-04-22)
- **[Note]**: If not approved by 2026-06-01, activate CSV manual entry fallback procedure (scripts/csv-fallback.ts)
- **[Note]**: OG image (Phase 14) is a design deliverable — highest-effort item in the milestone; plan creation time accordingly
- **[Note]**: Do not share any social links until Phase 17 QA clears — platform caches lock in broken previews for ~30 days

## Session Continuity

Last session: 2026-04-09
Stopped at: Completed 13-01-PLAN.md — site URL, @astrojs/sitemap, robots.txt
Resume file: None
