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
- [ ] **Phase 6: Scoring Extraction** - Extend KOM extraction to capture elapsed times, wire through payload, add Day 2 zero-match warning
- [ ] **Phase 7: Data Persistence** - GitHub Contents API write, Netlify rebuild hook, deauth webhook
- [ ] **Phase 8: Real Data Leaderboard** - Replace sample data, day association, live/sample indicator
- [ ] **Phase 9: Leaderboard Enhancements** - Per-component columns, name search, mobile validation
- [ ] **Phase 10: Design Polish and Companion Links** - Event-ready UI, submission form visual language, companion site links

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
**Goal**: The system correctly extracts Day 1 moving time from Hiawatha's Revenge activity data, and Day 2 segment efforts and KOM points from MK Ultra Gravel activity data
**Depends on**: Phase 4
**Requirements**: SUBM-05, SUBM-06, DATA-03
**Success Criteria** (what must be TRUE):
  1. Day 1 submission: the system extracts `moving_time` from the Strava activity and converts it to a score using the configured 35% weight
  2. Day 2 submission: the system filters `segment_efforts` by the hardcoded segment IDs from Phase 1 and returns matched effort times — unrecognized segments are ignored
  3. KOM points are computed by comparing the submitted rider's effort times against all previously submitted Day 2 times for each segment — not from Strava's `kom_rank` field (which is null for non-subscribers)
  4. A Day 2 activity with no matching segment efforts (rider missed all timed sectors) returns a zero sector score with a rider-visible warning rather than an error
  5. Scoring weights (35% / 45% / 20%) are read from the existing configurable scoring engine, not hardcoded in the extraction functions
**Plans**: 2 plans

Plans:
- [ ] 06-01-PLAN.md — Extend KOM extraction to capture elapsed times, wire komEfforts through confirm page payload and display
- [ ] 06-02-PLAN.md — Add Day 2 zero-match warning with amber styling for activities with no recognized sector/KOM efforts

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
**Plans**: TBD

Plans:
- [ ] 07-01: Implement `netlify/functions/submit-result.js` — decode payload, validate consent, write athlete JSON via GitHub Contents API (GET-then-PUT)
- [ ] 07-02: Implement Day 1 / Day 2 association logic — update existing athlete file if `athleteId` already exists
- [ ] 07-03: Implement Netlify build hook trigger after successful GitHub write
- [ ] 07-04: Implement `netlify/functions/strava-webhook.js` — handle deauth events, delete athlete file, trigger rebuild
- [ ] 07-05: Register Strava webhook endpoint in Strava API dashboard and verify subscription handshake

---

### Phase 8: Real Data Leaderboard
**Goal**: The public leaderboard displays actual submitted rider results instead of sample data, and a clear indicator distinguishes live results from placeholder data when no submissions exist yet
**Depends on**: Phase 7
**Requirements**: LEAD-04, DSGN-03
**Success Criteria** (what must be TRUE):
  1. After a rider submits, their name, category, and computed score appear on the leaderboard following the next Netlify rebuild — no manual steps required
  2. The sample data is entirely removed from the leaderboard rendering path; a fresh build with no athlete JSON files shows an empty leaderboard or an "awaiting submissions" state — not placeholder riders
  3. When the leaderboard is showing live results, a clear visual indicator confirms "Live results" — distinguishable from any future test or sample state
  4. The existing scoring engine reads athlete JSON files from `public/data/results/athletes/` at build time and ranks them correctly across all three categories
**Plans**: TBD

Plans:
- [ ] 08-01: Update `src/lib/scoring.ts` data-loading layer to read athlete JSON files from `public/data/results/athletes/`
- [ ] 08-02: Remove sample data import from `Leaderboard.astro` and replace with real data pipeline
- [ ] 08-03: Add empty-state UI for leaderboard with zero submissions
- [ ] 08-04: Add "Live results" / "Sample data" visual indicator to leaderboard header
- [ ] 08-05: Smoke test: submit a test result end-to-end and verify it appears on the deployed leaderboard after rebuild

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
**Plans**: TBD

Plans:
- [ ] 09-01: Add per-component score columns (Day 1 / Day 2 sectors / KOM / Total) to `Leaderboard.astro`
- [ ] 09-02: Implement client-side athlete name search with real-time row filtering
- [ ] 09-03: Validate and fix leaderboard layout at 375px viewport — ensure no horizontal overflow
- [ ] 09-04: Test tap targets and touch interaction on mobile leaderboard

---

### Phase 10: Design Polish and Companion Links
**Goal**: The submission form and all new pages match the site's established visual language, and companion sites link to this site as the single submission and results destination
**Depends on**: Phase 9
**Requirements**: DSGN-01, DSGN-02
**Success Criteria** (what must be TRUE):
  1. The submission form, confirm page, and all error states use Cormorant Garamond and Sora, match the existing color palette, and look consistent with the landing page — no default browser form styling is visible
  2. The mkUltraGravel companion site links to this site for submission and results — its own Strava integration is removed or redirected
  3. The hiawathasRevenge companion site links to this site for submission and results — its own Strava integration is removed or redirected
  4. The submission entry point is clearly reachable from the Iron & Pine Omnium landing page without requiring a rider to know the URL
**Plans**: TBD

Plans:
- [ ] 10-01: Apply Tailwind classes and existing design tokens to `submit.astro` and `submit-confirm.astro`
- [ ] 10-02: Polish error state pages (auth error, validation error, submission error) to match site visual language
- [ ] 10-03: Update mkUltraGravel companion site to remove Strava integration and link to Iron & Pine Omnium submission page
- [ ] 10-04: Update hiawathasRevenge companion site to remove Strava integration and link to Iron & Pine Omnium submission page
- [ ] 10-05: Add prominent submission CTA to Iron & Pine Omnium landing page with correct link

---

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8 -> 9 -> 10

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Compliance and Prerequisites | 3/4 | Complete (01-02 deferred) | 2026-04-06 |
| 2. Netlify Infrastructure | 2/2 | Complete | 2026-04-06 |
| 3. Strava OAuth | 3/3 | Complete | 2026-04-06 |
| 4. Activity Fetching and Validation | 2/2 | Complete | 2026-04-06 |
| 5. Submission Form UX | 4/4 | Complete | 2026-04-07 |
| 6. Scoring Extraction | 0/2 | Not started | - |
| 7. Data Persistence | 0/5 | Not started | - |
| 8. Real Data Leaderboard | 0/5 | Not started | - |
| 9. Leaderboard Enhancements | 0/4 | Not started | - |
| 10. Design Polish and Companion Links | 0/5 | Not started | - |

---
*Roadmap created: 2026-04-02*
*Last updated: 2026-04-07 after Phase 5 execution*
