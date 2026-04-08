# Roadmap: Iron & Pine Omnium

## Overview

The existing static Astro site has a complete scoring engine and sample-data leaderboard. This roadmap adds the three capabilities that make it real: Strava OAuth authentication, a submission pipeline that fetches and validates activity data, and persistent storage of rider results that drives the public leaderboard. Two blockers — Strava API compliance and the athlete limit review — must be resolved before any code is written. The build order is gated strictly: compliance first, then infrastructure, then OAuth, then submission, then persistence, then display enhancements.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Compliance and Prerequisites** - Resolve Strava ToS, initiate athlete limit review, map segment IDs *(01-02 deferred: Strava review requires finished UI)*
- [x] **Phase 2: Netlify Infrastructure** - netlify.toml routing, environment variables, local dev working
- [x] **Phase 3: Strava OAuth** - OAuth round-trip with CSRF protection, token management, athlete verification
- [x] **Phase 4: Activity Fetching and Validation** - URL parsing, activity fetch, date validation, scope handling
- [x] **Phase 5: Submission Form UX** - Rider identity capture, score preview, inline explanation, consent step
- [x] **Phase 6: Scoring Extraction** - Extend KOM extraction to capture elapsed times, wire through payload, add Day 2 zero-match warning
- [x] **Phase 7: Data Persistence** - GitHub Contents API write, Netlify rebuild hook, deauth webhook
- [x] **Phase 8: Real Data Leaderboard** - Replace sample data, day association, live/sample indicator
- [x] **Phase 9: Leaderboard Enhancements** - Per-component columns, name search, mobile validation
- [x] **Phase 10: Design Polish and Companion Links** - Event-ready UI, submission form visual language, companion site links
- [x] **Phase 11: Bug Fix and Dead Code Cleanup** - Swap route map images, remove orphaned files and dead markup
- [ ] **Phase 12: Strava Athlete Limit Review** - Submit athlete limit review to Strava (COMP-02 closure) — 1 plan

## Phase Details

---

### Phase 1: Compliance and Prerequisites
**Goal**: All external blockers are resolved and documented before any code is written
**Depends on**: Nothing (first phase)
**Requirements**: COMP-01, COMP-02
**Success Criteria** (what must be TRUE):
  1. The data model is documented and approved: leaderboard shows computed scores and rider-chosen names only — no raw Strava API fields are surfaced publicly
  2. Strava athlete limit review has been submitted with the app description, use case, and expected athlete count
  3. All Strava segment IDs for Day 2 scoring sectors and KOM segments are identified, verified in Strava's segment database, and written into a constants file in the codebase
  4. A manual CSV fallback procedure exists for entering results if Strava approval is delayed or API is unavailable on event day
**Plans**: TBD

Plans:
- [ ] 01-01: Document approved data model (what the leaderboard stores vs. displays) and get product owner sign-off
- [ ] 01-02: Register Strava API app and submit athlete limit review request
- [ ] 01-03: Identify and verify all Day 2 Strava segment IDs; write them into a `src/lib/segments.ts` constants file
- [ ] 01-04: Write manual CSV fallback procedure document and sample template

---

### Phase 2: Netlify Infrastructure
**Goal**: The development environment and deployment pipeline are fully configured so all subsequent function work can proceed without infrastructure debugging
**Depends on**: Phase 1
**Requirements**: *(no dedicated v1 requirement — foundational infrastructure)*
**Success Criteria** (what must be TRUE):
  1. `netlify dev` starts locally and routes `/api/*` requests to `/.netlify/functions/*` without errors
  2. All required environment variables (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `STRAVA_VERIFY_TOKEN`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `NETLIFY_BUILD_HOOK`) are set in the Netlify dashboard and accessible via `process.env` in Netlify Functions v1
  3. A smoke-test function (`netlify/functions/health.js`) returns HTTP 200 with `{"ok":true}` both locally and on the deployed Netlify preview
  4. Netlify Functions use v1 syntax (`exports.handler`) throughout — no v2 `export default` syntax exists in the project

> Note: Phase 2 has no dedicated v1 requirement because infrastructure is a prerequisite to every other phase, not a user-facing deliverable. All subsequent phases depend on it.

**Plans**: 2 plans

Plans:
- [x] 02-01: Create netlify.toml, health function, add netlify-cli, remove hometown field
- [x] 02-02: Configure env vars in Netlify dashboard, link site, verify netlify dev

---

### Phase 3: Strava OAuth
**Goal**: A rider can click "Connect with Strava," authorize on Strava's consent screen, and return to the site with a verified, CSRF-protected session that identifies their Strava athlete ID
**Depends on**: Phase 2
**Requirements**: STRA-01, STRA-04
**Success Criteria** (what must be TRUE):
  1. A rider clicking "Connect with Strava" is redirected to Strava's OAuth consent screen with `activity:read_all` scope
  2. After approving, the rider is redirected back to the site — a CSRF nonce is verified and the exchange succeeds
  3. An expired OAuth token is silently refreshed using the stored refresh token before any activity fetch, without prompting the rider to re-authorize
  4. The authenticated Strava athlete ID is accessible to subsequent functions in the same submission session
  5. A rider who denies Strava consent is redirected to an error page with a clear explanation
**Plans**: 3 plans

Plans:
- [x] 03-01-PLAN.md — Install cookie-es, create strava-auth.js (CSRF nonce + Strava redirect), create error.astro page
- [x] 03-02-PLAN.md — Create strava-callback.js (CSRF verify, scope check, code exchange, session cookie) + strava-tokens.js refresh utility
- [x] 03-03-PLAN.md — End-to-end OAuth round-trip test with real Strava account (checkpoint)

---

### Phase 4: Activity Fetching and Validation
**Goal**: The system can accept a Strava activity URL, extract the activity ID, fetch the full activity from the Strava API, and reject activities that fall outside the event window — before the rider reaches the confirmation step
**Depends on**: Phase 3
**Requirements**: STRA-02, STRA-03
**Success Criteria** (what must be TRUE):
  1. A rider pasting a full Strava activity URL (e.g., `https://www.strava.com/activities/12345678`) — the system extracts the numeric activity ID without requiring the rider to find it manually
  2. The fetched activity is verified to belong to the authenticated athlete — pasting another rider's public activity URL is rejected with a clear error
  3. An activity outside June 6-7, 2026 is rejected immediately with a message identifying the actual activity date and the expected event dates
  4. The activity is fetched with `include_all_efforts=true` so segment efforts are available for Day 2 scoring
  5. A network error or Strava API error during fetch shows a recoverable error state — the rider can retry without losing their OAuth session
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md — Create strava-fetch-activity.js with URL parsing, API fetch, ownership check, date validation, and segment extraction
- [ ] 04-02-PLAN.md — End-to-end test against real Strava API via netlify dev (checkpoint)

---

### Phase 5: Submission Form UX
**Goal**: A rider can see who they are, preview their computed score, read an explanation of how their numbers map to points, and choose to submit or cancel — all before any data is persisted
**Depends on**: Phase 4
**Requirements**: SUBM-01, SUBM-03, SUBM-04
**Success Criteria** (what must be TRUE):
  1. On first submission, the rider is asked to provide their display name, hometown, and category (men/women/non-binary) — the form does not accept submission without all three
  2. Before confirming, the rider sees a score preview showing their Day 1 moving time score and Day 2 sector + KOM scores as computed values (not raw Strava numbers)
  3. The score preview includes an inline explanation: each component shows the rider's actual value (e.g., "4:12 moving time") and its point conversion
  4. The rider can cancel the submission from the confirm page and is returned cleanly to the submission entry point
**Plans**: 4 plans

Plans:
- [x] 05-01-PLAN.md — Create submit.astro (URL input, fetch, base64url redirect) + fix OAuth callback redirect to /submit
- [x] 05-02-PLAN.md — Create submit-confirm.astro (payload decode, score preview with inline explanation, identity form, cancel flow, validation)
- [x] 05-03-PLAN.md — Visual verification checkpoint: build + test full submit flow with synthetic payloads
- [x] 05-04-PLAN.md — Gap closure: thread Strava athlete name from OAuth through session to confirm page display

---

### Phase 6: Scoring Extraction
**Goal**: Extend the submission pipeline to capture KOM elapsed times (not just presence), surface them in the confirm page UI, and add Day 2 zero-match warnings — completing the raw data capture needed for Phase 8 scoring
**Depends on**: Phase 4
**Requirements**: SUBM-06, DATA-03 (partial — raw capture only; ranking deferred to Phase 8)
**Success Criteria** (what must be TRUE):
  1. Day 1 extraction (`movingTimeSeconds`) and Day 2 sector extraction (`sectorEfforts`) are verified complete from Phase 4 — no new extraction work needed
  2. KOM segment elapsed times are captured in a `komEfforts` map (`segmentId -> elapsedSeconds`) alongside the existing `komSegmentIds` presence array, using fastest-effort deduplication
  3. The confirm page displays KOM climb times to the rider and carries `komEfforts` in a hidden field for Phase 7 to persist in the athlete JSON
  4. A Day 2 activity with no matching segment efforts (rider missed all timed sectors) shows a rider-visible amber warning on the confirm page rather than neutral text — without blocking submission
  5. A Day 1 activity shows neutral "Not applicable" text for sectors and KOM (no warning)

> **Scope note:** Relative scoring (e.g., `fastestInCategory / myTime * weight`) and KOM ranking across riders require all submissions and can only run at leaderboard build time. Phase 6 captures the raw data; Phase 8 computes final scores using `scoreOmnium()` from `defaultScoringConfig`. Scoring weights (35%/45%/20%) are already defined in `src/lib/scoring.ts` and consumed at build time — Phase 6 does not apply them.
**Plans**: 2 plans

Plans:
- [x] 06-01-PLAN.md — Extend KOM extraction to capture elapsed times, wire komEfforts through confirm page payload and display
- [x] 06-02-PLAN.md — Add Day 2 zero-match warning with amber styling for activities with no recognized sector/KOM efforts

---

### Phase 7: Data Persistence
**Goal**: A confirmed submission is written to GitHub as an athlete JSON file, triggers a Netlify rebuild, and is protected by a Strava deauth webhook that can delete athlete data on request
**Depends on**: Phases 5 and 6
**Requirements**: DATA-01, DATA-02, SUBM-02
**Success Criteria** (what must be TRUE):
  1. After confirming, the rider's result is written to `public/data/results/athletes/{athleteId}.json` in the GitHub repo via the Contents API — the file appears in the repository within 10 seconds
  2. A Netlify build is triggered automatically after each successful write, causing the leaderboard to reflect the new submission after rebuild
  3. A rider who submits both Day 1 and Day 2 has their results associated under a single `athleteId` — the JSON file is updated, not duplicated
  4. A Strava deauth event for an athlete causes that athlete's JSON file to be deleted from GitHub and a rebuild to be triggered — no manual action is required
  5. The submission function rejects payloads where the activity athlete ID does not match the authenticated session athlete ID
**Plans**: 3 plans

Plans:
- [ ] 07-01-PLAN.md — Create submit-result.js (session validation, athlete ID check, GitHub GET-then-PUT, identity lock, dedup, build hook) + wire confirm page fetch POST
- [ ] 07-02-PLAN.md — Create strava-webhook.js (GET subscription handshake + POST deauth handler with GitHub delete and rebuild trigger)
- [ ] 07-03-PLAN.md — End-to-end smoke test via netlify dev + register Strava webhook subscription (checkpoint)

---

### Phase 8: Real Data Leaderboard
**Goal**: The public leaderboard displays actual submitted rider results instead of sample data, computes relative scores and KOM rankings from all athlete JSON files at build time, and a clear indicator distinguishes live results from placeholder data
**Depends on**: Phase 7
**Requirements**: LEAD-04, DSGN-03, DATA-03 (KOM ranking), SUBM-05 (score computation)
**Success Criteria** (what must be TRUE):
  1. After a rider submits, their name, category, and computed score appear on the leaderboard following the next Netlify rebuild — no manual steps required
  2. The sample data is entirely removed from the leaderboard rendering path; a fresh build with no athlete JSON files shows an empty leaderboard or an "awaiting submissions" state — not placeholder riders
  3. When the leaderboard is showing live results, a clear visual indicator confirms "Live results" — distinguishable from any future test or sample state
  4. The existing scoring engine reads athlete JSON files from `public/data/results/athletes/` at build time and ranks them correctly across all three categories
  5. Day 1 moving time scores are computed at build time using relative scoring (`fastestInCategory / myTime`) with the 35% weight from `defaultScoringConfig`
  6. KOM points are computed at build time by comparing each rider's `komEfforts` elapsed times against all other riders in the same category — not from Strava's `kom_rank` field
  7. Scoring weights (35% / 45% / 20%) are read from `defaultScoringConfig` in `src/lib/scoring.ts`, not hardcoded in the build pipeline
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Create athlete-loader.ts with AthleteJson type, KOM ranking, and loadAthleteResults()
- [ ] 08-02-PLAN.md — Wire real data into Leaderboard.astro (replace sample data, add empty state) and update index.astro (dynamic heading, live/awaiting badge)
- [ ] 08-03-PLAN.md — Smoke test: verify empty-state and live-data builds, human verification checkpoint

---

### Phase 9: Leaderboard Enhancements
**Goal**: The leaderboard is fully legible on mobile, searchable by athlete name, and shows per-component score columns that make the unusual scoring model transparent to every rider
**Depends on**: Phase 8
**Requirements**: LEAD-01, LEAD-02, LEAD-03
**Success Criteria** (what must be TRUE):
  1. The leaderboard table includes columns for Day 1 score, Day 2 sector score, KOM score, and total — each column label is self-explanatory without hovering
  2. A rider can type a name into a search field and the leaderboard rows filter in real time to matching athletes — searching works across all three category tabs
  3. On a 375px-wide screen (iPhone SE viewport), the leaderboard is readable without horizontal scroll — rider name, category, and total score are always visible
  4. Tapping a leaderboard row on mobile does not accidentally trigger search or tab navigation
**Plans**: 3 plans

Plans:
- [ ] 09-01-PLAN.md — Rename column headers to self-explanatory labels + add client-side name search with real-time row filtering
- [ ] 09-02-PLAN.md — Sticky Rider column, mobile layout at 375px (drop min-width, hide .score-note, compact rank), touch-action: manipulation
- [ ] 09-03-PLAN.md — Visual verification checkpoint: confirm all four success criteria at 375px viewport (human-verify)

---

### Phase 10: Design Polish and Companion Links
**Goal**: Full site redesign with bold, graphic, poster-like visual language on light backgrounds — applied to all pages (landing, submit, confirm, error, leaderboard) with sticky navigation and Submit Results CTA
**Depends on**: Phase 9
**Requirements**: DSGN-01, DSGN-02 (companion sites DEFERRED — separate repos)
**Success Criteria** (what must be TRUE):
  1. The submission form, confirm page, and all error states use Spectral, Karla, and JetBrains Mono, match the existing color palette on light backgrounds, and look consistent with the landing page — no default browser form styling is visible
  2. The submission entry point is clearly reachable from the Iron & Pine Omnium landing page without requiring a rider to know the URL
  3. A sticky navigation bar with logo, page links, and Submit Results CTA appears on every page
  4. A dedicated /leaderboard route renders the full leaderboard with all Phase 9 enhancements
**Plans**: 6 plans

Plans:
- [ ] 10-01-PLAN.md — Foundation: rewrite global.css for light-base theme, create Nav.astro, update BaseLayout.astro, clean astro.config.mjs
- [ ] 10-02-PLAN.md — Landing page redesign: index.astro light theme + PodiumPreview component + /leaderboard page
- [ ] 10-03-PLAN.md — Submit page split-layout redesign with borderless-bottom form inputs
- [ ] 10-04-PLAN.md — Confirm page split-layout redesign with light-mode score preview
- [ ] 10-05-PLAN.md — Error page redesign with light-mode styling and contextual auth error CTAs
- [ ] 10-06-PLAN.md — Visual verification checkpoint: all pages at desktop and 375px mobile

---

### Phase 11: Bug Fix and Dead Code Cleanup
**Goal**: Fix the route map image swap bug and remove all orphaned code and dead markup identified in the v1.0 milestone audit
**Depends on**: Phase 10
**Requirements**: *(no dedicated requirement — tech debt / bug fix)*
**Gap Closure**: Closes route map bug + 3 tech debt items from v1.0-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. Day 1 (Hiawatha's Revenge) event card shows `route-hiawatha.png` and Day 2 (MK Ultra Gravel) shows `route-mkultra.png`
  2. `src/lib/sample-data.ts` is deleted — no file exists at that path
  3. `src/components/LogoMark.astro` is deleted — no file exists at that path
  4. `submit-confirm.astro` no longer contains `h-athleteFirstname` or `h-athleteLastname` hidden fields
  5. The site builds successfully with `pnpm build` after all removals
**Plans**: TBD

---

### Phase 12: Strava Athlete Limit Review
**Goal**: Submit the Strava athlete limit review request so the app is approved for multiple athletes before the June 6 event
**Depends on**: Phase 10 (needs finished UI for screenshots)
**Requirements**: COMP-02
**Gap Closure**: Closes COMP-02 from v1.0-MILESTONE-AUDIT.md
**Success Criteria** (what must be TRUE):
  1. Strava athlete limit review has been submitted via the HubSpot form with app description, use case, and expected athlete count
  2. Screenshots of the finished leaderboard and submission flow are included
  3. Submission date is recorded for tracking the 7-10 business day review window
**Plans**: 1 plan

Plans:
- [ ] 12-01-PLAN.md — Draft corrected submission content and submit athlete limit review via HubSpot form

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10 -> 11 -> 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Compliance and Prerequisites | 3/4 | Complete (01-02 deferred to Phase 12) | 2026-04-06 |
| 2. Netlify Infrastructure | 2/2 | Complete | 2026-04-06 |
| 3. Strava OAuth | 3/3 | Complete | 2026-04-06 |
| 4. Activity Fetching and Validation | 2/2 | Complete | 2026-04-06 |
| 5. Submission Form UX | 4/4 | Complete | 2026-04-07 |
| 6. Scoring Extraction | 2/2 | Complete | 2026-04-07 |
| 7. Data Persistence | 3/3 | Complete | 2026-04-07 |
| 8. Real Data Leaderboard | 3/3 | Complete | 2026-04-07 |
| 9. Leaderboard Enhancements | 3/3 | Complete | 2026-04-08 |
| 10. Design Polish and Companion Links | 6/6 | Complete | 2026-04-08 |
| 11. Bug Fix and Dead Code Cleanup | 1/1 | Complete | 2026-04-08 |
| 12. Strava Athlete Limit Review | 0/1 | Planned | — |

---
*Roadmap created: 2026-04-02*
*Last updated: 2026-04-08 after Phase 11 completion*
