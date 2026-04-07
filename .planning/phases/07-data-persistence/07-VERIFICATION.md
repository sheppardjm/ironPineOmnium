---
phase: 07-data-persistence
verified: 2026-04-07T19:00:00Z
status: passed
score: 5/5 must-haves verified
---

# Phase 7: Data Persistence Verification Report

**Phase Goal:** A confirmed submission is written to GitHub as an athlete JSON file, triggers a Netlify rebuild, and is protected by a Strava deauth webhook that can delete athlete data on request
**Verified:** 2026-04-07T19:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After confirming, rider's result is written to `public/data/results/athletes/{athleteId}.json` in GitHub via Contents API | VERIFIED | `submit-result.js` line 105 builds path; lines 116–136 GET existing file; lines 200–253 PUT with SHA concurrency; 07-03-SUMMARY documents smoke test confirmed write |
| 2 | A Netlify build is triggered automatically after each successful write | VERIFIED | `submit-result.js` lines 256–259: fire-and-forget `fetch(hookUrl, { method: 'POST', body: '{}' }).catch(() => {})` keyed on `NETLIFY_BUILD_HOOK` env var |
| 3 | A rider submitting both days has results under a single athleteId (file updated, not duplicated) | VERIFIED | `submit-result.js` lines 113–174: GET-then-PUT with SHA; `existingData` spread on re-submit (line 171); `day1`/`day2` slots written independently; identity lock prevents name/category overwrite |
| 4 | A Strava deauth event causes athlete JSON deletion from GitHub and a rebuild | VERIFIED | `strava-webhook.js` lines 46–114: detects `authorized=false/\"false\"`, extracts `owner_id`, constructs identical path `public/data/results/athletes/${athleteId}.json`, GET-then-DELETE pattern, fires build hook on successful delete only; always-200 pattern prevents Strava retries |
| 5 | Submission function rejects payloads where activity athleteId does not match authenticated session athleteId | VERIFIED | `submit-result.js` lines 17–38: reads `strava_session` cookie via `cookie-es`; lines 79–86: `body.athleteId !== session.athleteId` returns HTTP 403 `athlete_mismatch`; session set by `strava-callback.js` line 81–91 with `String(tokenData.athlete.id)` stored as `athleteId` |

**Score:** 5/5 truths verified

---

## Required Artifacts

| Artifact | Purpose | Exists | Lines | Stubs | Exported | Status |
|----------|---------|--------|-------|-------|----------|--------|
| `netlify/functions/submit-result.js` | GitHub write path, identity enforcement | Yes | 267 | None | `export const handler` | VERIFIED |
| `netlify/functions/strava-webhook.js` | Deauth handler, GET handshake | Yes | 119 | None | `export const handler` | VERIFIED |
| `src/pages/submit-confirm.astro` | Form wired to POST `/api/submit-result` | Yes | 626 | None | n/a (Astro page) | VERIFIED |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `submit-confirm.astro` | `/api/submit-result` | `fetch("/api/submit-result", { method: "POST", credentials: "include" })` at line 295 | WIRED | Full payload assembled from hidden form fields; response checked for `result.ok`; redirects to `/?submitted=true` on success |
| `submit-result.js` | GitHub Contents API | `fetch(GITHUB_API/repos/.../contents/${filePath}, { method: "PUT" })` lines 200–253 | WIRED | GET-then-PUT with SHA; 409 single-retry; non-200 returns `github_write_error` |
| `submit-result.js` | Netlify build hook | `fetch(hookUrl, { method: "POST" }).catch(() => {})` line 258 | WIRED | Fire-and-forget after successful PUT; guarded by `if (hookUrl)` |
| `strava-webhook.js` | GitHub Contents API (DELETE) | GET for SHA then DELETE at lines 67–90 | WIRED | 404 on GET treated as already-deleted; rebuild only fires on successful DELETE |
| `strava-webhook.js` | Netlify build hook | `fetch(hookUrl, { method: "POST", body: '{}' }).catch(() => {})` line 99 | WIRED | Only triggered after confirmed delete, not on 404 |
| `strava-callback.js` | `strava_session` cookie | `JSON.stringify({ athleteId, ... })` at line 91 | WIRED | `athleteId = String(tokenData.athlete.id)` feeds the cookie that `submit-result.js` reads for identity verification |
| Netlify routing | `submit-result.js` function | `netlify.toml` redirect `/api/*` → `/.netlify/functions/:splat` | WIRED | `functions.directory = "netlify/functions"` + splat redirect routes `/api/submit-result` and `/api/strava-webhook` correctly |

---

## Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|---------|
| DATA-01 | Rider submissions persist via GitHub Contents API (one JSON file per rider) | SATISFIED | `submit-result.js` writes `public/data/results/athletes/${athleteId}.json` via PUT |
| DATA-02 | Leaderboard rebuilds with current submission data (via build hook) | SATISFIED | Build hook triggered fire-and-forget after every successful write and after every deauth delete |
| SUBM-02 | System associates Day 1 and Day 2 submissions via Strava athlete ID | SATISFIED | Single JSON file keyed on `athleteId`; GET-then-PUT preserves existing day; `day1`/`day2` slots written independently |

---

## Anti-Patterns Found

None. No TODO, FIXME, placeholder, or stub patterns found in any of the three key files. All handlers have complete implementations.

---

## Notable Design Observations (Not Blockers)

1. **`public/data/results/athletes/` directory absent locally.** This is expected — the GitHub Contents API creates files directly in the remote repo. The Astro build will pick up the committed JSON files when Netlify rebuilds. No local scaffolding is needed.

2. **Leaderboard still reads sample data.** At verification time `src/pages/index.astro` uses `sample-data.ts`. This is Phase 8 scope (Real Data Leaderboard) and is not a Phase 7 gap.

3. **Strava webhook subscription registered externally.** The subscription ID 339507 cannot be verified programmatically from the codebase, but the SUMMARY documents it was confirmed during the Phase 07-03 smoke test (human checkpoint completed). The handler code is structurally correct for receiving events at that endpoint.

4. **Identity lock is complete.** On re-submission, `submit-result.js` spreads `existingData` (line 171) before setting the new day slot, so `displayName` and `category` from the request body are silently discarded — correct behavior per the design.

---

## Human Verification Required

None blocking. The Strava deauth live-path cannot be verified programmatically (requires a real Strava user to revoke access), but the code path is fully implemented and the subscription is documented as registered. The smoke test in 07-03 confirmed the write path works against the real GitHub API.

---

## Summary

All five phase goal criteria are structurally satisfied in the codebase:

- `submit-result.js` (267 lines, no stubs) implements the full GitHub write path with SHA concurrency, identity lock, deduplication, and fire-and-forget build hook.
- `strava-webhook.js` (119 lines, no stubs) implements the full deauth path with GET-then-DELETE, always-200 Strava response, and conditional rebuild trigger.
- `submit-confirm.astro` is wired to POST JSON to `/api/submit-result` with full response handling and redirect.
- Netlify routing correctly maps `/api/*` to the functions directory.
- Session identity enforcement (`athleteId` cookie vs payload) is implemented and returns HTTP 403 on mismatch.

Phase 7 goal is achieved.

---

*Verified: 2026-04-07T19:00:00Z*
*Verifier: Claude (gsd-verifier)*
