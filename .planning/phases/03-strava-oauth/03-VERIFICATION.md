---
phase: 03-strava-oauth
verified: 2026-04-06T17:21:15Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "A rider clicking 'Connect with Strava' is redirected to Strava's OAuth consent screen with activity:read_all scope"
    status: partial
    reason: "The OAuth initiation endpoint (/api/strava-auth) is fully implemented with correct scope and CSRF nonce, but no 'Connect with Strava' button exists in any page. index.astro has no link or button pointing to /api/strava-auth. The only UI entry point to the OAuth flow is the 'Try Again' button on the error page. The phase ROADMAP goal is phrased in terms of a rider clicking a button, but Phase 3 plans never included creating the submission form's entry point — that is explicitly scoped to Phase 5 (05-01: Create src/pages/submit.astro with Strava auth entry point)."
    artifacts:
      - path: "netlify/functions/strava-auth.js"
        issue: "Fully implemented — not the problem"
      - path: "src/pages/index.astro"
        issue: "No link or button to /api/strava-auth exists on the homepage or any page other than error.astro"
    missing:
      - "A 'Connect with Strava' button or link pointing to /api/strava-auth in the submission entry page (deferred to Phase 5 by design)"
human_verification:
  - test: "Full OAuth happy path"
    expected: "Navigating to /api/strava-auth redirects to Strava consent, approving returns to / with a strava_session HttpOnly cookie containing athleteId, accessToken, refreshToken, and expiresAt"
    why_human: "End-to-end OAuth round-trip requires a real Strava account and live browser session; cookie inspection requires DevTools"
  - test: "Token refresh behavior"
    expected: "getValidAccessToken() silently refreshes when expiresAt is within 5 minutes and returns updated: true with new tokens"
    why_human: "Requires a token near expiry to trigger the refresh branch; cannot be verified structurally"
---

# Phase 3: Strava OAuth Verification Report

**Phase Goal:** A rider can click "Connect with Strava," authorize on Strava's consent screen, and return to the site with a verified, CSRF-protected session that identifies their Strava athlete ID
**Verified:** 2026-04-06T17:21:15Z
**Status:** gaps_found (1 partial gap — by design, deferred to Phase 5)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A rider clicking "Connect with Strava" is redirected to Strava's OAuth consent screen with `activity:read_all` scope | PARTIAL | `/api/strava-auth` endpoint is fully correct (302 → strava.com/oauth/authorize?scope=activity:read_all&state=nonce), but no UI button points to it from any page. Phase 5 creates this entry point. |
| 2 | After approving, the rider is redirected back to the site — a CSRF nonce is verified and the exchange succeeds | VERIFIED | `strava-callback.js`: parses strava_csrf cookie, compares to state param (line 28), exchanges code at strava.com/oauth/token (line 51), sets strava_session via multiValueHeaders (line 112), clears CSRF cookie (line 99) |
| 3 | An expired OAuth token is silently refreshed using the stored refresh token before any activity fetch | VERIFIED | `strava-tokens.js`: BUFFER_SECONDS=300 (line 6), expiry check at line 24, refresh_token grant to strava.com/oauth/token (lines 29-38), returns updated:true (line 51), always captures rotated refresh_token (line 49) |
| 4 | The authenticated Strava athlete ID is accessible to subsequent functions in the same submission session | VERIFIED | `strava-callback.js` line 81: `String(tokenData.athlete.id)` stored in session payload at line 89 as JSON in strava_session HttpOnly cookie; `strava-tokens.js` carries athleteId through in its session param signature (line 14) |
| 5 | A rider who denies Strava consent is redirected to an error page with a clear explanation | VERIFIED | `strava-callback.js` line 15: `params.error === 'access_denied'` → redirect to `/error?reason=strava_denied`; `error.astro` maps this code to "You declined the Strava authorization..." (line 34-35), rendered client-side via window.location.search |

**Score:** 4/5 truths verified (1 partial — UI entry point deferred to Phase 5 by design)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `netlify/functions/strava-auth.js` | OAuth initiation endpoint with CSRF nonce | VERIFIED | 48 lines, exports `handler`, generates 32-byte hex nonce, sets strava_csrf HttpOnly cookie (maxAge 600), redirects to strava.com/oauth/authorize with all required params |
| `netlify/functions/strava-callback.js` | OAuth callback with CSRF verify, code exchange, session cookie | VERIFIED | 115 lines, exports `handler`, handles all 5 error paths, uses multiValueHeaders for dual Set-Cookie |
| `netlify/functions/lib/strava-tokens.js` | Token refresh utility (no handler export) | VERIFIED | 53 lines, exports `getValidAccessToken` only (no handler), 5-min buffer, updated flag, rotated refresh_token captured |
| `src/pages/error.astro` | Error page with 4 reason code mappings | VERIFIED | 150 lines, maps strava_denied/csrf_mismatch/token_exchange_failed/insufficient_scope client-side, builds to dist/error/index.html |
| `package.json` | cookie-es dependency | VERIFIED | cookie-es@^3.1.1 present at line 15 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `strava-auth.js` | strava.com/oauth/authorize | 302 redirect with URLSearchParams | WIRED | Line 37: `https://www.strava.com/oauth/authorize?${params.toString()}`, nonce used as both cookie value and state param |
| `strava-auth.js` | strava_csrf cookie | serialize() Set-Cookie header | WIRED | Lines 19-25: serialize("strava_csrf", nonce, {httpOnly, secure, sameSite, maxAge:600}) |
| `strava-callback.js` | CSRF verification | cookie vs state param comparison | WIRED | Lines 25-28: parses cookie, extracts state param, strict equality check |
| `strava-callback.js` | strava.com/oauth/token | POST fetch for authorization_code | WIRED | Lines 51-70: full try/catch, checks res.ok, error redirects on failure |
| `strava-callback.js` | strava_session cookie | multiValueHeaders Set-Cookie | WIRED | Lines 91-113: JSON payload with all 4 fields, uses multiValueHeaders to send both session + CSRF-clear cookies atomically |
| `strava-tokens.js` | strava.com/oauth/token | POST fetch for refresh_token grant | WIRED | Lines 29-38: grant_type: "refresh_token", captures data.refresh_token (may be rotated) |
| `netlify.toml` | /api/* → /.netlify/functions/:splat | 200 redirect | WIRED | Lines 9-12: routes all /api/* to functions directory |
| `error.astro` | reason code → user message | client-side URLSearchParams | WIRED | Lines 44-50: window.location.search → messages map → textContent update |

---

## Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| STRA-01: Rider can sign in with Strava OAuth and grant `activity:read_all` scope | PARTIAL | Backend fully implemented. UI entry point (submission page with "Connect with Strava" button) deferred to Phase 5. |
| STRA-04: System silently refreshes expired OAuth tokens during submission flow | VERIFIED | `getValidAccessToken()` implemented with 5-minute buffer, refresh_token grant, and updated flag for callers to re-persist |

---

## Anti-Patterns Found

No stub patterns, TODO/FIXME comments, placeholder text, empty returns, or console.log-only handlers found in any of the 4 key files. All implementations are substantive and complete.

---

## Human Verification Required

### 1. Full OAuth Happy Path

**Test:** With `netlify dev` running, navigate to `http://localhost:8888/api/strava-auth` in a browser. Authorize on the Strava consent screen.
**Expected:** Browser returns to `/`, DevTools shows a `strava_session` HttpOnly cookie whose value is a JSON string containing `athleteId` (string), `accessToken`, `refreshToken`, and `expiresAt` (Unix timestamp). The `strava_csrf` cookie should be absent.
**Why human:** End-to-end OAuth requires a real Strava account and live browser session; cookie inspection requires DevTools. Per 03-03-SUMMARY.md this was completed and approved during Phase 3 execution.

### 2. Token Refresh Behavior

**Test:** Call `getValidAccessToken()` with a session whose `expiresAt` is within 300 seconds of the current time.
**Expected:** Function calls `strava.com/oauth/token` with `grant_type: "refresh_token"`, returns new tokens with `updated: true`.
**Why human:** Requires a token near expiry to trigger the refresh branch; the 5-minute buffer logic is structurally correct but cannot be exercised without a real near-expiry token.

---

## Gaps Summary

One gap was found, and it is a scoping issue rather than an implementation defect:

**Truth 1 is PARTIAL:** The ROADMAP phrases the phase goal as "a rider can click 'Connect with Strava'" — but no Phase 3 plan ever included creating a submission page or a UI button. The three Phase 3 plans covered: (1) strava-auth.js + error.astro, (2) strava-callback.js + strava-tokens.js, (3) end-to-end test via direct URL navigation. Phase 5, plan 05-01 explicitly creates `src/pages/submit.astro` as the "activity URL input form with Strava auth entry point."

The OAuth infrastructure is complete, correct, and tested end-to-end. The "Connect with Strava" button is a Phase 5 deliverable. The gap does not block Phase 4 (Activity Fetching), which depends only on the session cookie and `getValidAccessToken()` — both of which are fully implemented and verified.

**Decision needed:** Accept this partial as expected (Phase 5 dependency) and mark Phase 3 as infrastructure-complete, or require a minimal placeholder entry point now.

---

_Verified: 2026-04-06T17:21:15Z_
_Verifier: Claude (gsd-verifier)_
