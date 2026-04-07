# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** Phase 8 — Real Data Leaderboard

## Current Position

Phase: 8 of 10 (Real Data Leaderboard) — In Progress
Plan: 3 of 3 in phase 8 (checkpoint pending human verification)
Status: In progress — awaiting human verification at checkpoint
Last activity: 2026-04-07 — Completed 08-03-PLAN.md (E2E pipeline verification, at checkpoint)

Progress: [████████░░] 78%

## Performance Metrics

**Velocity:**
- Total plans completed: 19
- Average duration: ~6.5 min
- Total execution time: ~124 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-compliance | 3/4 | ~26 min | ~9 min |
| 02-netlify-infrastructure | 2/2 | ~23 min | ~12 min |
| 03-strava-oauth | 3/3 | ~26 min | ~9 min |
| 04-activity-fetching | 2/2 | ~16 min | ~8 min |
| 05-submission-form-ux | 4/4 | ~10 min | ~3 min |
| 06-scoring-extraction | 2/2 | ~2 min | ~1 min |
| 07-data-persistence | 3/3 | ~13 min | ~4 min |

**Recent Trend:**
- Last 5 plans: 07-03 (~10 min), 07-02 (~1 min), 07-01 (~2 min), 06-02 (~1 min), 06-01 (~1 min)
- Trend: 07-03 slower due to human checkpoint (PAT fix + webhook registration)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Init: GitHub-as-database chosen (proven in mkUltraGravel, 1-3 min rebuild latency acceptable for post-ride submission model)
- Init: Netlify Functions v1 syntax required (`export const handler`) — v2 has confirmed env var bug as of 2026-03-28
- Init: Astro stays in static output mode — no SSR adapter
- 01-01: Public leaderboard renders only computed point scores + rider-chosen display name — no raw Strava fields ever displayed publicly
- 01-01: athleteId stored as plain string (not hashed) — numeric identifier, not a profile field, never surfaced in UI
- 01-01: activityId stored for deduplication only — not displayed anywhere
- 01-01: Display name and category locked after first submission — cannot be changed by re-submission
- 01-01: Strava deauth deletes entire athlete JSON file — no partial retention
- 01-01: hometown not collected — removed from RiderResult in 02-01
- 01-03: Segment IDs stored as strings (not numbers) — avoids JS precision issues with large Strava IDs
- 01-04: Fallback athlete IDs use manual-NNN scheme — string prefix prevents collision with Strava numeric IDs
- 01-04: activityId set to literal "manual" for fallback entries — scoring/dedup must handle this sentinel
- Phase 1: Strava athlete limit review (01-02) deferred until UI is complete — Strava requires screenshots of finished product before approving
- 02-01: v1 ESM handler syntax confirmed: `export const handler` (not `export default`, not `exports.handler`)
- 02-01: health.js boolean-maps 8 required env vars for runtime verification in 02-02
- 02-02: esbuild overridden to 0.27.7 in pnpm overrides — fixes darwin-arm64 binary mismatch with netlify-cli internals
- 02-02: netlify dev requires `volta run --node 22.22.2 npx netlify dev` — plain npx uses Node 20 which Astro 6 rejects
- 02-02: NETLIFY_BUILD_HOOK must exist in Netlify dashboard (not just .env) — deployed functions have no .env access
- 03-01: CSRF nonce is 32 random bytes hex-encoded, strava_csrf cookie maxAge 600s
- 03-01: error.astro uses client-side script to read reason query param (static mode)
- 03-01: Secure flag relaxed when NETLIFY_DEV=true for local dev
- 03-02: multiValueHeaders required for multiple Set-Cookie in v1 Lambda — headers['Set-Cookie'] drops all but last
- 03-02: athlete.id from Strava token exchange converted to String() immediately — never in refresh responses
- 03-02: lib/ subdirectory in netlify/functions/ for shared utilities — no handler export, not exposed as endpoints
- 03-02: getValidAccessToken() returns { updated: boolean } — callers re-serialize session cookie when true
- 03-02: BUFFER_SECONDS=300 (5 min) before token expiry triggers refresh; Strava may rotate refresh_token on each grant
- 03-03: netlify dev switched to framework=#static — avoids Astro dev server port conflicts in multi-project environments
- 03-03: Local OAuth testing requires temporarily changing STRAVA_REDIRECT_URI to localhost and Strava callback domain to localhost
- 04-01: All validation errors (invalid_url, wrong_athlete, wrong_date, etc.) use HTTP 200 with { error } JSON — only session failures use HTTP 401
- 04-01: Date validation uses start_date_local.slice(0,10) without timezone math — local date portion is correct despite misleading Z suffix
- 04-01: Duplicate segment efforts keep fastest (lowest elapsed_time) — prevents double-counting for riders who repeat a sector
- 04-01: Strava 401 after token refresh treated as activity_not_found — valid token + 401 means private/inaccessible activity
- 05-01: btoa() used directly for base64url encoding — payload fields are all ASCII-safe (numeric IDs, ISO dates, number values)
- 05-01: Astro script tag (not is:inline) used for TypeScript type safety and Vite bundling on submit page
- 05-01: OAuth callback now redirects to /submit after success (was /)
- 05-02: fromBase64url decode is exact inverse of btoa encoding (05-01) — replace -→+ _→/ pad = then atob+JSON.parse
- 05-02: Missing/malformed payload on /submit-confirm silently redirects to /submit (no error page needed)
- 05-02: sectorEfforts and komSegmentIds JSON.stringify-d into hidden inputs for Phase 7 form POST
- 05-02: Score preview uses innerHTML assignment in DOMContentLoaded — Astro template is static skeleton only
- 05-04: athleteFirstname/athleteLastname only available from tokenData.athlete during authorization_code exchange — captured once at that point and persisted in session cookie
- 05-04: Token refresh explicitly carries athleteFirstname/athleteLastname from original session into updatedPayload — Strava refresh response never includes athlete object
- 05-04: UI fallback chain for identity display: name fields -> "Athlete #[id]" -> "unknown"
- 06-01: komEfforts uses same deduplication pattern as sectorEfforts (keep fastest elapsed_time per KOM segment)
- 06-01: komSegmentIds retained alongside komEfforts for backward compatibility (presence list + time map serve complementary purposes)
- 06-01: KOM time display conditioned on komTimeTotal > 0 to handle payloads missing komEfforts gracefully
- 06-02: 2026-06-07 used as client-side literal for Day 2 detection — EVENT_DATES server-side constant not accessible in browser script block
- 06-02: Day 1 neutral text updated to "Not applicable for Day 1 activities" (was "No timed sectors matched") for clarity
- 07-01: submit-result reads strava_session for athleteId only — no Strava API calls, no token refresh needed
- 07-01: All validation errors return HTTP 200 with { error } JSON; 401 for missing/bad session, 403 for athlete ID mismatch
- 07-01: 409 SHA conflict retried once (re-GET then re-PUT); persistent conflict returns write_conflict error
- 07-01: Build hook triggered fire-and-forget after successful GitHub PUT (no await, .catch(() => {}))
- 07-02: POST webhook always returns 200 to Strava — errors caught internally to prevent infinite retry loops
- 07-02: Both string "false" and boolean false checked for authorized field — Strava sends string but defensive check added
- 07-02: Build hook only triggered after successful DELETE, not after 404/already-gone — avoids spurious rebuilds
- 07-03: GitHub PAT required contents:write permission — original fine-grained token only had metadata:read
- 07-03: Strava webhook subscription ID 339507 registered at ironpineomnium.com/api/strava-webhook
- 07-03: Old mkUltraGravel subscription (338141) replaced — Strava allows only one per app
- 07-03: SECRETS_SCAN_OMIT_KEYS added to netlify.toml for GITHUB_OWNER and GITHUB_REPO
- 08-01: import.meta.glob path '../../public/data/results/athletes/*.json' resolves correctly from src/lib/ — two levels up reaches project root, then into public/
- 08-01: KOM scoring uses Approach A (time-based ranking) when komEfforts is non-empty; Approach B (komSegmentIds.length) for CSV fallback
- 08-01: computeKomPoints receives pre-filtered peersInCategory — KOM rank comparison is always within-category only
- 08-01: loadAthleteResults() returns { riders, hasLiveData } — hasLiveData = riders.length > 0, computed at build time; scoring weights NOT applied in this layer
- 08-02: Tab list rendered conditionally — only when hasLiveData is true (no empty tabs shown with zero riders)
- 08-02: Winner banner board.entries[0] access guarded by board.entries.length > 0 conditional — no crash on zero-rider category
- 08-02: Status badge uses Astro class:list pattern for green "Live results" / amber "Awaiting submissions" toggle

### Pending Todos

- Submit Strava athlete limit review after UI is built (around Phase 5+) — draft content in 01-02-PLAN.md

### Blockers/Concerns

- **[Deferred]**: Strava athlete limit review not yet submitted — 7-10 business day lead time. Submit as soon as UI shows all Strava data touchpoints.
- **[Note]**: pnpm approve-builds is interactive-only. Native binaries (esbuild, @parcel/watcher) are already in pnpm store from prior installs — this does not block netlify dev execution.
- **[Note]**: netlify dev command: `volta run --node 22.22.2 npx netlify dev --no-open` (plain npx uses Node 20, Astro requires >=22.12.0)
- **[Note]**: STRAVA_REDIRECT_URI in .env is production URL — must be temporarily changed for local OAuth testing
- **[Note]**: strava-webhook.js requires STRAVA_VERIFY_TOKEN env var to match value used during Strava webhook subscription registration (07-03)

## Session Continuity

Last session: 2026-04-07T19:01:20Z
Stopped at: 08-03 checkpoint — human verification needed (visual inspection of dist/index.html)
Resume file: None
