# Project Milestones: Iron & Pine Omnium

## v1.0 MVP (Shipped: 2026-04-08)

**Delivered:** Full Strava-integrated submission and scoring system for a two-day gravel cycling omnium, with OAuth authentication, real-time leaderboard, and editorial race-poster design.

**Phases completed:** 1-12 (33 plans total)

**Key accomplishments:**

- Strava OAuth with CSRF protection, silent token refresh, and HttpOnly session management
- Activity fetching with ownership verification, date validation, and segment extraction (7 sectors + 3 KOM)
- Score preview with inline explanation and KOM elapsed time capture before submission
- Data persistence via GitHub Contents API with Netlify rebuild hooks and Strava deauth webhook
- Real data leaderboard with relative scoring, within-category KOM ranking, and live/awaiting indicator
- Full editorial race-poster redesign with mobile-first layout, sticky nav, and dedicated /leaderboard route

**Stats:**

- 179 files created/modified
- 6,526 lines of TypeScript/Astro/JS/CSS
- 12 phases, 33 plans
- 7 days from project initialization to ship

**Git range:** `Initial commit` → `docs(12): complete strava-athlete-limit-review phase`

**What's next:** Event preparation (June 6-7, 2026) — Strava athlete limit approval pending, companion site linking, potential v2 features (submission nudge, shareable result cards, segment detail rows).

---

## v1.1 SEO & Social Sharing (Shipped: 2026-04-10)

**Delivered:** Production-ready SEO and social sharing across the site — branded social previews, complete meta tags, structured data for rich event results, sitemap, and full external-tool QA.

**Phases completed:** 13-17 (7 plans total)

**Key accomplishments:**

- Production domain wired through `astro.config.mjs` so every canonical URL and sitemap entry resolves to an absolute URL
- Branded 1200×630 Open Graph image plus full favicon set and web app manifest
- BaseLayout extended with Open Graph, Twitter Card, canonical, and favicon link tags driven by per-page props
- Per-page unique titles and descriptions; `/submit-confirm` set to noindex
- SportsEvent JSON-LD on the homepage rendered via `set:html` to keep JSON unescaped
- Full external QA: Facebook Sharing Debugger, X Card Validator, Google Rich Results Test, and sitemap accessibility verified live

**Stats:**

- 5 phases, 7 plans
- Shipped same week as v1.0, two days after MVP

**What's next:** Scoring integrity — anti-sandbagging validation gates without changing the scoring formula.

---

## v1.2 Scoring Integrity (Shipped: 2026-04-14)

**Delivered:** Anti-sandbagging fetch-time validation gates that reject partial rides, late starts, and hidden-start-time obfuscation — without touching the moving-time scoring formula, leaderboard display, score preview, or athlete JSON schema.

**Phases completed:** 18-19 (2 plans, 4 tasks total)

**Key accomplishments:**

- Shared `src/lib/event-config.ts` module with 7 named validation constants — single source of truth for gun epoch, start window, per-day distance thresholds, and event dates
- Strava fetch function extended to extract `distanceMeters` and `startDate` from the API response for downstream validation
- Three ordered fetch-time validation gates in `strava-fetch-activity.js`: hidden start time (T00:00:01Z) → distance minimum (156/153 km) → Day 1 start window (8:30 AM ET cutoff)
- Human-readable error handlers on `submit.astro` for each rejection code, surfacing the rider's actual value and the required threshold
- Scoring formula, leaderboard, score preview, and athlete JSON schema all left untouched — pure validation layer

**Stats:**

- 2 phases, 2 plans, 4 tasks
- 5 source files modified (event-config.ts, strava-fetch-activity.js, submit-result.js, submit-confirm.astro, submit.astro)
- 115 insertions, 4 deletions
- Single-day execution across both phases (2026-04-14)

**Audit:** 7/7 requirements satisfied, 2/2 phases passed, 7/7 critical exports wired, 5/5 E2E flows complete. Status: `tech_debt` — 0 blockers, 4 advisory items captured in `v1.2-ROADMAP.md`.

**Tech debt deferred:**
- `submit-confirm.astro` renderPreview still uses hardcoded display dates (UI labels, not validation gates)
- `distanceMeters` / `startDate` transported through hidden fields but not persisted in athlete JSON (no audit-trail consumer yet)
- `strava_api_error` falls through to generic submit.astro handler (acceptable degradation)

**Git range:** `5d9a951 docs: start milestone v1.2 Scoring Integrity` → `4c21c1f docs(19): complete fetch pipeline validation gates phase`

**What's next:** Event prep continues toward June 6-7, 2026 — Strava athlete limit approval follow-up, companion site linking, potential v2 features (submission nudge, shareable result cards, segment detail rows).

---
