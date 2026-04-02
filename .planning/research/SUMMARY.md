# Project Research Summary

**Project:** Iron & Pine Omnium — Strava-integrated gravel cycling event leaderboard
**Domain:** Gravel cycling event results platform with OAuth-gated submission pipeline
**Researched:** 2026-04-02
**Confidence:** HIGH

## Executive Summary

Iron & Pine Omnium is an existing Astro 6.1.1 static site that needs three new capabilities added to replace its sample-data leaderboard with real rider submissions: Strava OAuth authentication, activity data fetching, and persistent storage of per-rider results. The core scoring engine is already built and tested. A complete, production-deployed reference implementation of all three required capabilities exists in the sibling repo `mkUltraGravel` — this is not a greenfield integration; it is a targeted port and adaptation of proven code. The architecture keeps Astro as a pure static builder, routing `/api/*` to Netlify Functions v1 via `netlify.toml`, and persists rider data as JSON files committed to GitHub (the GitHub-as-database pattern already proven in the sibling repo).

The recommended approach is a direct, disciplined port from `mkUltraGravel`: four Netlify Functions (`strava-auth`, `strava-callback`, `submit-result`, `strava-webhook`), GitHub Contents API for persistence, and a Netlify build hook to trigger rebuilds after each submission. Astro stays in static output mode — no SSR adapter needed. This approach is the lowest-risk path because the implementation is already validated in production at the same event-scale (50-100 riders). The only architectural decision to make is whether to use GitHub-as-database (default, proven) or Netlify Blobs (simpler, real-time, requires making the leaderboard page server-rendered) — the recommendation is to use GitHub-as-database unless event organizers specifically require a sub-2-minute leaderboard refresh.

The two critical risks that can block the entire project are (1) Strava's November 2024 API Terms, which restrict displaying athlete data to third parties and require the leaderboard to show computed scores rather than raw Strava fields, and (2) Strava's athlete limit, which caps new apps at one connected athlete until Strava manually approves an increase — a process that can take weeks. Both risks must be addressed before any code is written, not as afterthoughts. The Strava app must be submitted for athlete limit review immediately, targeting no later than April 30 to leave buffer before the June 6 event date.

---

## Key Findings

### Recommended Stack

The existing stack (Astro 6.1.1, pnpm, Netlify) requires only one dependency addition: Netlify Functions v1 JavaScript files dropped into `netlify/functions/`. No SSR adapter, no framework change, no new database service. Astro stays `output: 'static'`. The one version-critical constraint is that Netlify Functions must use v1 syntax (`exports.handler`) — a confirmed Netlify bug as of 2026-03-28 causes user-defined environment variables to return `undefined` intermittently in v2 (`export default`) functions, which would silently break OAuth and all GitHub API calls. This bug is documented in the sibling repo comments and independently confirmed in three Netlify Support Forum threads.

If Netlify Blobs is chosen over GitHub-as-database, add `@netlify/blobs` (no version pin needed) and convert the leaderboard page to `prerender = false` with `@astrojs/netlify` adapter. This trades the simplicity of the proven pattern for real-time leaderboard updates. For an event where riders submit after finishing a multi-hour gravel ride and a 1-3 minute rebuild latency is acceptable, GitHub-as-database is the correct choice.

**Core technologies:**
- **Astro 6.1.1 (static output):** Framework — already in use; no change needed
- **Netlify Functions v1 (`exports.handler`):** Server-side logic — stable env var access; v2 has an active confirmed bug
- **GitHub Contents API (native `fetch`):** Data persistence — zero new dependencies, proven in mkUltraGravel
- **Strava API v3:** Activity data source — OAuth 2.0, scope `activity:read_all` required
- **Netlify build hook:** Leaderboard update trigger — fire-and-forget after each submission write

### Expected Features

The leaderboard already exists with sample data and tabbed category display. The entire scope of this milestone is building the submission pipeline that feeds real data into it, plus enhancements to the display that real data enables.

**Must have (table stakes):**
- Strava OAuth login — the only acceptable auth pattern for a cycling-community product
- Activity URL input with auto-parsed ID extraction — manual numeric ID entry is a friction blocker
- Activity date validation with clear error messaging — rejects wrong-event submissions
- Moving time extraction for Day 1 scoring — the `moving_time` Strava API field
- Segment effort extraction for Day 2 scoring — requires `include_all_efforts=true`
- Submission preview/confirmation step — rider reviews matched segments before committing
- Submission success/error state feedback — silent POST is a UX failure
- Real data replacing sample data in the leaderboard
- Athlete name search (client-side filter) — 50-100 riders, trivial implementation
- Per-component score columns (Day 1 / Day 2 sectors / KOM) — makes the unusual scoring model legible
- Mobile-readable leaderboard validation — 97% of race-day traffic is mobile

**Should have (competitive differentiators):**
- Submission preview with score calculation before confirm — builds trust in the scoring model
- "Did you ride Day 2?" nudge for single-day submitters — increases data completeness
- Inline scoring explanation anchored to the submission step
- Shareable per-rider result card/URL — requires stable persistent rider records
- Activity date validation error messaging refinement

**Defer (v2+):**
- Sector-by-segment breakdown in expanded leaderboard row — high complexity, needs Strava segment ID mapping, and only valuable after validating rider demand
- Admin result editing UI — handle manually in v1
- Multi-year results archive — only relevant after a second event

### Architecture Approach

The architecture is a static Astro site augmented by four Netlify Functions that handle all server-side concerns. Astro builds the public pages statically; functions handle OAuth, data persistence, and compliance. Rider data is stored as individual JSON files committed to the GitHub repo via the Contents API, which Astro reads at build time to render the leaderboard. This eliminates any database infrastructure at the cost of 1-3 minute leaderboard refresh latency — appropriate for the event scale. The sibling repo `mkUltraGravel` is the definitive reference for all four function implementations.

**Major components:**
1. **`netlify/functions/strava-auth.js`** — validates activity URL, generates CSRF nonce, sets HttpOnly cookie, redirects to Strava OAuth consent
2. **`netlify/functions/strava-callback.js`** — verifies CSRF nonce, exchanges code for token, fetches activity with segment efforts, filters to event segment IDs, redirects to confirm page with base64url payload
3. **`netlify/functions/submit-result.js`** — validates consent and category, decodes payload, writes `{athleteId}.json` to GitHub, triggers Netlify rebuild
4. **`netlify/functions/strava-webhook.js`** — handles Strava deauth events by deleting athlete data from GitHub and triggering rebuild (Strava ToS 5.4 compliance)
5. **`public/data/results/athletes/{athleteId}.json`** — one JSON file per rider, the live data store
6. **`src/lib/scoring.ts`** — pure scoring engine, already built, consumes real athlete files at build time replacing sample data
7. **`src/pages/submit-confirm.astro`** — static page that decodes the base64url `?data=` payload client-side, presents confirmation UI

### Critical Pitfalls

1. **Strava November 2024 API Terms restrict public display of athlete data** — The API Agreement now prohibits showing one user's Strava data to other users. The leaderboard must display computed scores and rider-chosen names, not raw Strava API fields (activity titles, segment names from the API, start dates). Address this during architecture design before any UI work. The safe model: compute a score from Strava data, store and display only the score.

2. **Strava athlete limit will block all riders on event day if not addressed immediately** — New apps are capped at 1 connected athlete. Manual review by Strava is required and can take weeks. Submit the app for review no later than April 30, 2026. Build a manual CSV fallback in case approval is delayed.

3. **Netlify Functions v2 env var bug silently breaks OAuth and GitHub API calls** — Confirmed active bug as of 2026-03-28 causes `process.env` user-defined vars to return `undefined` in v2 functions. Use v1 syntax (`exports.handler`) for all functions. Do not use v2 (`export default`) regardless of what the current Netlify docs show as the default.

4. **Wrong Strava scope causes segment efforts to silently return empty for private activities** — `activity:read` returns an empty `segment_efforts` array (not an error) for "Only Me" activities. Request `activity:read_all`. Test with a Strava account that has private activities before launch.

5. **KOM scoring from `kom_rank` API field fails for free-tier riders** — `kom_rank` is null for non-subscribers. Determine KOM points by comparing submitted segment effort times across all riders internally — not by reading from the Strava API field.

6. **Segment effort misidentification from name or proximity matching** — Pin every scoring segment to its exact Strava segment ID before writing any fetch logic. Filter `segment_efforts` by `effort.segment.id` only. This is a data prerequisite, not a code detail.

7. **Strava athlete ID ownership not verified on submission** — Always verify `activity.athlete.id === authenticated_athlete_id` after fetching. A rider can paste any public activity URL; the system must reject URLs from other athletes.

---

## Implications for Roadmap

Based on research, the natural build order is driven by three hard constraints: (1) OAuth is the gate for everything — nothing else works without it; (2) the Strava athlete limit approval must be initiated immediately and in parallel with development; (3) the Strava segment IDs for the course must be mapped before any data fetching logic is written.

### Phase 1: Legal, Compliance, and Prerequisites
**Rationale:** Two blockers exist that are not code problems: Strava ToS compliance shapes the data model, and Strava athlete limit approval has a multi-week lead time. These must be resolved before building, not after. This phase has zero code output and is often skipped by developers — it is not optional here.
**Delivers:** Approved data model (computed scores, not raw Strava fields on public leaderboard), Strava API app registered and submitted for athlete limit review, event Strava segment IDs identified and hardcoded, moving time policy documented in event rules.
**Addresses:** Strava ToS pitfall, athlete limit pitfall, segment misidentification pitfall, moving time inconsistency pitfall.
**Avoids:** Building the wrong data model for the leaderboard display, launching with a 1-athlete cap, and scoring the wrong segments.

### Phase 2: Netlify Infrastructure and Environment Setup
**Rationale:** All function work depends on `netlify.toml` routing `/api/*` to `/.netlify/functions/*` and all environment variables being in place. Setting these up first means function development and testing can proceed without configuration debugging.
**Delivers:** `netlify.toml` with redirect rules, all 9 environment variables set in Netlify Dashboard (`STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET`, `STRAVA_REDIRECT_URI`, `STRAVA_VERIFY_TOKEN`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `NETLIFY_BUILD_HOOK`, plus Strava app registration verified), `netlify dev` working locally.
**Uses:** Netlify Functions v1 (environment variable stability), `netlify-cli` for local development.
**Implements:** Infrastructure prerequisite for all four functions.

### Phase 3: Strava OAuth Flow
**Rationale:** OAuth is the gating dependency for every submission feature. Build and test it end-to-end before touching activity fetching or data persistence. This phase maps 1:1 to the `strava-auth.js` and `strava-callback.js` functions in the sibling repo.
**Delivers:** Working OAuth round-trip — rider clicks "Connect with Strava," approves on Strava's consent screen, is redirected to `/submit-confirm` with a valid base64url payload. CSRF protection via nonce cookie is in place. Activity fetch from Strava API (with `include_all_efforts=true`) is working.
**Uses:** Netlify Functions v1, Strava OAuth 2.0 (`activity:read_all` scope), CSRF nonce cookie pattern, base64url state parameter.
**Implements:** `strava-auth.js`, `strava-callback.js`, segment effort filtering by hardcoded segment IDs.
**Avoids:** Wrong scope pitfall, CSRF vulnerability, activity ownership verification gap.

### Phase 4: Submission Persistence and Data Pipeline
**Rationale:** Once OAuth produces a validated payload, the submission and persistence layer can be built. This phase also includes the `submit-confirm.astro` page that bridges OAuth and submission, and the data-loading layer in `results.astro` that replaces sample data with real athlete JSON files.
**Delivers:** Complete submission flow — rider reviews matched segments, selects category, consents, submits; athlete JSON is written to GitHub; Netlify rebuild is triggered; rider appears on leaderboard after rebuild. `strava-webhook.js` handles deauth compliance. Sample data is removed from the leaderboard.
**Uses:** GitHub Contents API (GET-then-PUT pattern), Netlify build hook (fire-and-forget), `fs.readdirSync` in `results.astro` to read athlete files at build time.
**Implements:** `submit-result.js`, `strava-webhook.js`, `submit-confirm.astro`, data-loading layer in `results.astro` / `Leaderboard.astro`, category normalization (`M/F/NB` → `men/women/non-binary`).
**Avoids:** Activity ownership verification gap, token storage beyond request, Strava ToS display violation.

### Phase 5: Leaderboard Enhancements and UX Polish
**Rationale:** Once real data is flowing, the display can be enhanced. These features depend on having real submissions to validate against. Per-component score columns require the full `RiderResult` schema to be populated; athlete name search requires real names in the leaderboard.
**Delivers:** Per-component score columns (Day 1 / Day 2 sectors / KOM) visible in leaderboard, athlete name search (client-side filter), mobile-readable leaderboard validated, submission confirmation state (score preview + success/error messages), "real data live" signal replacing sample data notice.
**Addresses:** Table-stakes features: mobile UX, search, score transparency.
**Avoids:** Anti-feature scope creep (real-time WebSocket updates, admin editing UI, Strava Club integration).

### Phase 6: Post-Submission Differentiators (v1.x)
**Rationale:** Build after the core submission flow has processed real submissions and edge cases are known. These features are lower priority but increase product quality and community engagement.
**Delivers:** "Did you ride Day 2?" nudge for single-day submitters, inline scoring explanation within submission flow, shareable per-rider result card with OG meta tags.
**Addresses:** Differentiator features from FEATURES.md.

### Phase Ordering Rationale

- **Phase 1 before all code:** Strava ToS compliance shapes the data model; building the wrong model first means reworking the entire data pipeline. Athlete limit review starts here with maximum lead time.
- **Phase 2 before functions:** `netlify.toml` routing and environment variable setup are infrastructure prerequisites. Debugging missing redirects mid-function development is a common time sink.
- **Phase 3 (OAuth) before Phase 4 (persistence):** The OAuth callback payload defines the data schema that `submit-result.js` consumes. Finalizing the callback first means persistence can be built against a stable contract.
- **Phase 4 gates Phases 5-6:** Enhancements to the leaderboard require real data. Per-component columns require the `RiderResult` schema to be fully populated from real submissions.
- **Segment ID mapping is a prerequisite to Phase 3** — not a step within it. If segment IDs are not known, the callback function cannot filter segment efforts. This must be complete before Phase 3 begins.

### Research Flags

Phases likely needing deeper research or validation during planning:
- **Phase 1 (Legal/ToS):** Strava's November 2024 API Agreement interpretation for community events is not definitively settled. Email to developers@strava.com recommended before proceeding. The "computed score vs. raw field" distinction needs product owner sign-off.
- **Phase 3 (OAuth / Strava App):** Strava athlete limit review timeline is unpredictable. Need confirmation of current review SLA and a tested fallback path (manual CSV import) documented before this phase closes.
- **Course segment IDs:** The exact Strava segment IDs for the Day 2 gravel sectors and KOM segments are a prerequisite to Phase 3. This requires the course to be finalized and the segments to be located and verified in Strava's segment database.

Phases with standard, well-documented patterns (research-phase likely not needed):
- **Phase 2 (Infrastructure):** `netlify.toml` setup and env var configuration are fully documented and identical to the sibling repo.
- **Phase 4 (Persistence):** GitHub Contents API GET-then-PUT is proven in `mkUltraGravel`. Direct port.
- **Phase 5 (Leaderboard UX):** Client-side name search, responsive table layout, and static page enhancements are standard patterns with no novel integration complexity.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Astro and Netlify adapter confirmed by official changelogs March 2026. Functions v1 bug confirmed by three independent forum threads. All choices have working reference in sibling repo. |
| Features | HIGH (table stakes) / MEDIUM (differentiators) | Table stakes derived from direct domain research and Race Roster analytics. Differentiator value is MEDIUM — needs validation with actual riders. Anti-features are well-reasoned from gravel event ecosystem analysis. |
| Architecture | HIGH | Based on direct inspection of two live codebases (ironPineOmnium existing site + mkUltraGravel production functions). No speculation required. |
| Pitfalls | HIGH (API mechanics and ToS text) / MEDIUM (ToS enforcement for small events) | Strava API ToS restrictions are confirmed from the official legal page and multiple third-party analyses. Enforcement behavior for small community events is not publicly documented — email clarification is the right path. |

**Overall confidence:** HIGH

### Gaps to Address

- **Strava ToS clarification for community events:** The API Agreement's display restriction applies as written, but whether Strava enforces this for small, consent-based event apps is not documented. Email developers@strava.com before Phase 3 to clarify, or design conservatively (compute + display scores only, no raw Strava fields).
- **Exact Strava segment IDs for the course:** These must be identified before any data fetching code is written. The segment IDs are a data prerequisite, not researchable from code. Event organizers must provide or confirm these.
- **`hometown` field in `RiderResult` type:** The existing TypeScript type includes `hometown` but there is no obvious source for it in the OAuth flow. Decision needed: capture it during submission (add a form field), derive it from Strava athlete profile, or remove it from the type entirely.
- **Strava athlete limit approval status:** The app must be registered and the review submitted immediately. Approval timeline is the biggest schedule risk in the project and is entirely outside the development team's control.
- **Manual CSV fallback design:** If Strava approval is delayed or Strava has an outage on June 6, the organizer needs a way to enter results manually. Scope and format of this fallback needs definition before Phase 4.

---

## Sources

### Primary (HIGH confidence)
- `mkUltraGravel` sibling repo (`/netlify/functions/`) — production reference implementation for all four Netlify Functions and data persistence patterns
- Astro official docs (on-demand rendering, endpoints, actions): `https://docs.astro.build/` — stack and anti-pattern validation
- Netlify changelog (Astro 6 support, March 10 2026): `https://www.netlify.com/changelog/2026-03-10-astro-6/` — adapter compatibility
- Netlify Support Forum (Functions v2 env var bug, 2026-03-27/28): three independent threads at `answers.netlify.com` — critical stack constraint
- Netlify Blobs docs: `https://docs.netlify.com/build/data-and-storage/netlify-blobs/` — Option B persistence
- Strava API official docs (authentication, rate limits, activity reference, webhooks): `https://developers.strava.com/docs/` — all API mechanics
- Strava API Agreement (effective October 9, 2025): `https://www.strava.com/legal/api` — ToS display restriction
- GitHub fine-grained PATs GA announcement (March 2025): `https://github.blog/changelog/` — GitHub Contents API credentials
- Astro issue #15076 (AstroCookies + Set-Cookie header conflict): `https://github.com/withastro/astro/issues/15076` — cookie anti-pattern

### Secondary (MEDIUM confidence)
- Grinduro race results page and Pennsylvania 2024 results — direct observation of reference event patterns
- Race Roster Results V3 announcement — mobile traffic data (97% mobile on race day)
- Gravel community non-binary category adoption — corroborated across 3+ event sites
- DC Rainmaker analysis of November 2024 Strava API changes: `https://www.dcrainmaker.com/2024/11/stravas-changes-to-kill-off-apps.html` — ToS impact analysis
- CityStrides community discussion — practical ToS enforcement observations

### Tertiary (LOW confidence)
- GravelRank leaderboard (`https://gravelrank.org/`) — observed features only; no technical details
- Strava Activity Event Match feature — known to exist but docs were inaccessible during research

---

*Research completed: 2026-04-02*
*Ready for roadmap: yes*
