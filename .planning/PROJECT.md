# Iron & Pine Omnium

## What This Is

A two-day gravel cycling omnium site for the Hiawatha National Forest in Michigan's Upper Peninsula. Riders submit Strava activities after each day — Saturday's Hiawatha's Revenge fondo and Sunday's MK Ultra Gravel grinduro — and the site computes combined leaderboards for men's, women's, and non-binary categories using weighted moving time, sector times, and KOM points. Built with Strava OAuth, GitHub-based data persistence, fetch-time anti-sandbagging validation gates, and a Netlify-hosted static site that rebuilds on each submission.

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
- ✓ Open Graph meta tags with branded shared image across all pages — v1.1
- ✓ Twitter/X card meta tags — v1.1
- ✓ Per-page meta descriptions and titles — v1.1
- ✓ Favicon and web app manifest — v1.1
- ✓ Structured data (JSON-LD) for event discovery — v1.1
- ✓ Shared event-config module for validation constants — v1.2 (7 named constants in src/lib/event-config.ts)
- ✓ Distance and start_date extracted from Strava API at fetch time — v1.2
- ✓ Minimum distance validation for Day 1 (156 km, 95% of route) — v1.2
- ✓ Minimum distance validation for Day 2 (153 km, 95% of route) — v1.2
- ✓ Start time window validation for Day 1 (within 30 min of 8:00 AM ET gun) — v1.2 (Day 2 explicitly exempt)
- ✓ Hidden Start Time privacy detection and rejection (T00:00:01Z) — v1.2

### Active

(None — v1.2 complete. Next milestone requirements will be defined by `/gsd-new-milestone`.)

### Out of Scope

- Admin approval flow — trust-based submission, no moderation layer
- Real-time live timing — results update after submission, not live during rides
- Registration system — no pre-registration or entry fees handled here
- Mobile app — web only
- Multi-event season tracking — single weekend event only
- Email / push notifications — disproportionate infrastructure for 50-100 riders
- Replacing moving time as Day 1 scoring metric — v1.2 confirmed moving time stays; validation is binary-gate only
- Admin override UI for validation failures — v1.2 deferred; correct data files directly if needed
- Persisting distanceMeters / startDate in athlete JSON — v1.2 chose fetch-time validation only; no audit-trail consumer yet

## Current State

**Shipped v1.2 Scoring Integrity** on 2026-04-14. Three anti-sandbagging fetch-time validation gates (hidden start time, distance minimum, Day 1 start window) plus a shared `event-config.ts` module. Scoring formula, leaderboard display, and athlete JSON schema unchanged. 7/7 requirements validated, 2/2 phases passed audit, 0 blockers.

**Total LOC:** ~6,640 across TypeScript, Astro, JS, and CSS (v1.0 baseline 6,526 + ~115 v1.2 insertions, v1.1 added negligible runtime LOC outside of metadata).

**Active follow-ups:**
- Strava athlete limit review submitted 2026-04-08 — follow up with `developers@strava.com` by 2026-04-22 if no response (now overdue as of 2026-05-29)
- Companion sites (mkUltraGravel, hiawathasRevenge) need to link to ironpineomnium.com for submissions/results
- If Strava approval not granted by 2026-06-01, activate CSV manual entry fallback (`scripts/csv-fallback.ts`)

## Next Milestone Goals

To be defined via `/gsd-new-milestone`. Candidate themes carried forward:

- Companion site cross-linking and "Powered by Neucadia" footer rollout (per project memory)
- Submission nudge / reminder UX after Day 1
- Shareable result cards
- Segment detail rows on the leaderboard
- Strava review follow-up resolution (approval or CSV fallback activation)

## Context

- **Shipped v1.0** on 2026-04-08 with 6,526 LOC across TypeScript, Astro, JS, and CSS
- **Shipped v1.1** on 2026-04-10 — SEO, social sharing, structured data, full external-tool QA
- **Shipped v1.2** on 2026-04-14 — anti-sandbagging validation gates in fetch pipeline
- **Tech stack:** Astro 6, TypeScript, Tailwind CSS 4, pnpm, Netlify Functions v1 (ESM)
- **Hosting:** Netlify with SSR-capable functions for OAuth and data writes; static build for pages
- **Data:** Athlete JSON files in GitHub repo, read at build time via `import.meta.glob`
- **Design:** Editorial race-poster aesthetic with Spectral, Karla, and JetBrains Mono fonts on light backgrounds
- **Strava review:** Submitted 2026-04-08, follow up overdue (was 2026-04-22)
- **Event date:** June 6-7, 2026 — site is submission-ready

## Constraints

- **Deadline**: Event is June 6-7, 2026 — site must be submission-ready by then
- **Tech stack**: Astro 6, TypeScript, Tailwind CSS 4, pnpm — established and should not change
- **Hosting**: Netlify with SSR-capable functions (Strava OAuth, GitHub API writes)
- **Strava API**: Rate limits and OAuth token management; one API key for the whole event; athlete limit approval pending
- **Design**: Spectral / Karla / JetBrains Mono font stack with editorial race-poster visual language
- **Scoring formula locked**: v1.2 reaffirmed — moving time is the Day 1 scoring metric; validation is binary-gate only, never a scoring input

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single submission site | Avoids cross-site data sharing and duplicate OAuth flows | ✓ Good — clean architecture |
| Trust-based submissions | Small community event, no need for admin overhead | ✓ Good — v1.2 gates added validation without breaking trust model |
| Strava athlete ID as rider identity | Natural link between day 1 and day 2 activities | ✓ Good — clean association |
| GitHub Contents API for persistence | Static site reads JSON at build time, no database needed | ✓ Good — simple and effective |
| Netlify Functions v1 ESM | Compatibility with Netlify platform | ✓ Good — all functions work |
| Deferred Strava review to Phase 12 | Needed finished UI for screenshots | ✓ Good — submitted with real screenshots |
| Editorial race-poster redesign | Previous dark theme felt generic | ✓ Good — distinctive visual identity |
| CSV manual fallback procedure | Contingency if Strava approval delayed | ⚠️ Revisit — Strava follow-up overdue; may need to activate by 2026-06-01 |
| v1.1: Render JSON-LD via `set:html` | Prevents HTML-entity escaping of JSON | ✓ Good — Google Rich Results Test passes |
| v1.1: `/submit-confirm` set to noindex | Internal flow page, not a landing target | ✓ Good — kept out of sitemap |
| v1.2: Validate at fetch time, not submit time | Stops invalid data before it reaches the data store; one gate, no double-validation | ✓ Good — clean integration, no submit-result.js changes needed |
| v1.2: Moving time stays as scoring metric | Scope revision — gates only, no scoring formula change | ✓ Good — v1.2 shipped with scoring untouched, no regressions |
| v1.2: Distance gates at 95% of route length | Allows for GPS drift / minor reroutes while catching real sandbagging | ✓ Good — 156 km Day 1, 153 km Day 2 |
| v1.2: Hidden start time gate ordered first | `T00:00:01Z` parses as midnight UTC; would falsely trigger start_too_late if checked first | ✓ Good — pattern documented for future gates |
| v1.2: Shared `event-config.ts` module | Single source of truth; mirrors existing `segments.ts` pattern | ✓ Good — pattern reusable, no magic numbers |

---
*Last updated: 2026-05-29 after v1.2 Scoring Integrity milestone completion*
