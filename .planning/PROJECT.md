# Iron & Pine Omnium

## What This Is

A two-day gravel cycling omnium site for the Hiawatha National Forest in Michigan's Upper Peninsula. Riders submit Strava activities after each day — Saturday's Hiawatha's Revenge fondo and Sunday's MK Ultra Gravel grinduro — and the site computes combined leaderboards for men's, women's, and non-binary categories using weighted moving time, sector times, and KOM points. Built with Strava OAuth, GitHub-based data persistence, and a Netlify-hosted static site that rebuilds on each submission.

## Core Value

Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days of riding fairly across three categories.

## Requirements

### Validated

- ✓ Strava OAuth with activity:read_all scope and silent token refresh — v1.0
- ✓ Activity URL parsing, API fetch, ownership verification, and date validation — v1.0
- ✓ Score preview with inline explanation before submission — v1.0
- ✓ Day 1 + Day 2 association via Strava athlete ID — v1.0
- ✓ Display name and category capture (men/women/non-binary) — v1.0
- ✓ Moving time extraction (Day 1) and sector/KOM extraction (Day 2) — v1.0
- ✓ Per-component score columns with name search, mobile-readable at 375px — v1.0
- ✓ Real rider data on leaderboard with live/awaiting indicator — v1.0
- ✓ GitHub Contents API persistence with Netlify rebuild hooks — v1.0
- ✓ KOM ranking from elapsed times (not Strava kom_rank) — v1.0
- ✓ Editorial race-poster design with sticky nav and Submit Results CTA — v1.0
- ✓ Strava API compliance: only computed scores and rider-chosen names displayed publicly — v1.0
- ✓ Strava athlete limit review submitted (2026-04-08, pending approval) — v1.0
- ✓ Strava deauth webhook deletes athlete data on revocation — v1.0

### Active

*(No active requirements — next milestone not yet planned)*

### Out of Scope

- Admin approval flow — trust-based submission, no moderation layer
- Real-time live timing — results update after submission, not live during rides
- Registration system — no pre-registration or entry fees handled here
- Mobile app — web only
- Multi-event season tracking — single weekend event only
- Email / push notifications — disproportionate infrastructure for 50-100 riders

## Context

- **Shipped v1.0** on 2026-04-08 with 6,526 LOC across TypeScript, Astro, JS, and CSS
- **Tech stack:** Astro 6, TypeScript, Tailwind CSS 4, pnpm, Netlify Functions v1 (ESM)
- **Hosting:** Netlify with SSR-capable functions for OAuth and data writes; static build for pages
- **Data:** Athlete JSON files in GitHub repo, read at build time via import.meta.glob
- **Design:** Editorial race-poster aesthetic with Spectral, Karla, and JetBrains Mono fonts on light backgrounds
- **Strava review:** Submitted 2026-04-08, 7-10 business day window, follow up by 2026-04-22
- **Event date:** June 6-7, 2026 — site must be submission-ready
- **Companion sites:** mkUltraGravel and hiawathasRevenge need to link here for submissions/results (separate repos)

## Constraints

- **Deadline**: Event is June 6-7, 2026 — site must be submission-ready by then
- **Tech stack**: Astro 6, TypeScript, Tailwind CSS 4, pnpm — established and should not change
- **Hosting**: Netlify with SSR-capable functions (Strava OAuth, GitHub API writes)
- **Strava API**: Rate limits and OAuth token management; one API key for the whole event; athlete limit approval pending
- **Design**: Spectral / Karla / JetBrains Mono font stack with editorial race-poster visual language

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single submission site | Avoids cross-site data sharing and duplicate OAuth flows | ✓ Good — clean architecture |
| Trust-based submissions | Small community event, no need for admin overhead | ✓ Good — no issues |
| Strava athlete ID as rider identity | Natural link between day 1 and day 2 activities | ✓ Good — clean association |
| GitHub Contents API for persistence | Static site reads JSON at build time, no database needed | ✓ Good — simple and effective |
| Netlify Functions v1 ESM | Compatibility with Netlify platform | ✓ Good — all functions work |
| Deferred Strava review to Phase 12 | Needed finished UI for screenshots | ✓ Good — submitted with real screenshots |
| Editorial race-poster redesign | Previous dark theme felt generic | ✓ Good — distinctive visual identity |
| CSV manual fallback procedure | Contingency if Strava approval delayed | — Pending (activate if needed by 2026-06-01) |

---
*Last updated: 2026-04-08 after v1.0 milestone*
