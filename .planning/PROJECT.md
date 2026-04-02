# Iron & Pine Omnium

## What This Is

A two-day gravel cycling omnium site for the Hiawatha National Forest in Michigan's Upper Peninsula. Riders submit Strava activities here after each day — Saturday's MK Ultra Gravel fondo and Sunday's Hiawatha's Revenge grinduro — and the site computes combined leaderboards for men's, women's, and non-binary categories using weighted moving time, sector times, and KOM points.

## Core Value

Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days of riding fairly across three categories.

## Requirements

### Validated

- ✓ Scoring engine with configurable weights (35% day 1 moving time, 45% day 2 sectors, 20% KOM) — existing
- ✓ Category leaderboards with benchmarks per category (men, women, non-binary) — existing
- ✓ Tabbed leaderboard UI with winner banner and detailed score breakdown — existing
- ✓ Landing page with hero, event cards, photo gallery, scoring explanation — existing
- ✓ TypeScript types for rider data, scoring config, and scored results — existing

### Active

- [ ] Strava OAuth flow — rider authenticates once on this site to authorize activity access
- [ ] Activity submission — rider pastes a Strava activity URL into a textbox, system fetches moving time and segment data
- [ ] Day 1 + Day 2 association — Strava athlete ID ties both day submissions to the same rider
- [ ] Segment extraction — pull timed sector results and KOM points from Strava activity data for day 2
- [ ] Real data pipeline — replace sample data with persisted rider submissions that drive the leaderboard at build or runtime
- [ ] Rider self-identification — capture name, hometown, and category (men/women/non-binary) during submission
- [ ] Design polish — refine landing page, leaderboard, and submission UI to event-ready quality
- [ ] Companion site links — mkUltraGravel and hiawathasRevenge link here for submissions and results (removing their own Strava integration)

### Out of Scope

- Admin approval flow — trust-based submission, no moderation layer
- Real-time live timing — results update after submission, not live during rides
- Registration system — no pre-registration or entry fees handled here
- Mobile app — web only
- Multi-event season tracking — single weekend event only

## Context

- The Strava OAuth and activity fetching logic already exists in the mkUltraGravel repo and can be adapted
- Day 2 timed sectors and KOM segments are pre-defined Strava segments on the Hiawatha's Revenge route
- This site becomes the single Strava integration point — companion sites will remove their API keys and link here
- Currently a fully static Astro site; adding Strava OAuth will require some dynamic capability (API routes or serverless functions)
- Sample data with 12 riders across 3 categories is in place for validating scoring and UI

## Constraints

- **Deadline**: Event is June 6-7, 2026 — site must be submission-ready by then
- **Tech stack**: Astro 6, TypeScript, Tailwind CSS 4, pnpm — established and should not change
- **Hosting**: Currently static; Strava OAuth will need server-side capability (Astro SSR or serverless)
- **Strava API**: Rate limits and OAuth token management; one API key for the whole event
- **Existing design**: Two Google Fonts (Cormorant Garamond, Sora) and an established visual language to maintain

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single submission site | Avoids cross-site data sharing and duplicate OAuth flows | — Pending |
| Trust-based submissions | Small community event, no need for admin overhead | — Pending |
| Strava athlete ID as rider identity | Natural link between day 1 and day 2 activities | — Pending |

---
*Last updated: 2026-04-02 after initialization*
