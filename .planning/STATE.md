# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-02)

**Core value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.
**Current focus:** Phase 3 — Strava OAuth

## Current Position

Phase: 3 of 10 (Strava OAuth)
Plan: 2 of 3 in current phase (03-01 and 03-02 complete)
Status: In progress
Last activity: 2026-04-06 — Completed 03-02-PLAN.md (OAuth callback + token refresh utility)

Progress: [███░░░░░░░] 27%

## Performance Metrics

**Velocity:**
- Total plans completed: 5
- Average duration: ~9 min
- Total execution time: ~49 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-compliance | 3/4 | ~26 min | ~9 min |
| 02-netlify-infrastructure | 2/2 | ~23 min | ~12 min |

**Recent Trend:**
- Last 5 plans: 02-02 (~15 min), 02-01 (~8 min), 01-04 (~15 min), 01-03 (~1 min), 01-01 (~10 min)
- Trend: Consistent 8-10 min/plan

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

### Pending Todos

- Submit Strava athlete limit review after UI is built (around Phase 5+) — draft content in 01-02-PLAN.md

### Blockers/Concerns

- **[Deferred]**: Strava athlete limit review not yet submitted — 7-10 business day lead time. Submit as soon as UI shows all Strava data touchpoints.
- **[Note]**: pnpm approve-builds is interactive-only. Native binaries (esbuild, @parcel/watcher) are already in pnpm store from prior installs — this does not block netlify dev execution.
- **[Note]**: netlify dev command: `volta run --node 22.22.2 npx netlify dev --no-open` (plain npx uses Node 20, Astro requires >=22.12.0)

## Session Continuity

Last session: 2026-04-06T16:46:23Z
Stopped at: Completed 03-02-PLAN.md (strava-callback.js + strava-tokens.js)
Resume file: None
