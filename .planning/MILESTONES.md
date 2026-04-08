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
