---
phase: 05-submission-form-ux
verified: 2026-04-07T16:55:45Z
status: passed
score: 5/5 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "Rider can see who they are (Strava identity) on the confirm page"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Visit /submit-confirm with a valid Day 1 payload URL and confirm the score preview renders correct values"
    expected: "Page shows formatted moving time (HH:MM:SS), '35% of your overall score' explanation, 'Connected as [Firstname Lastname]' identity line, and a Cancel button that returns to /submit"
    why_human: "Client-side rendering — DOMContentLoaded script populates preview divs and identity element at runtime, cannot verify via static HTML inspection alone"
  - test: "Visit /submit-confirm with a valid Day 2 payload URL and confirm Day 2 preview renders"
    expected: "Sectors preview shows 'N of 7 sectors · HH:MM:SS' and KOM shows 'N of 3 KOM segments'; identity line shows 'Connected as [name]'"
    why_human: "Client-side rendering, requires actual payload with populated sectorEfforts"
  - test: "Submit the identity form with name filled but category empty"
    expected: "Form blocked — browser-native custom validity message appears on the category select"
    why_human: "setCustomValidity + reportValidity behavior requires browser interaction"
  - test: "Submit the identity form with name empty"
    expected: "Browser reports 'Please enter your display name' on the name input"
    why_human: "setCustomValidity requires browser interaction"
  - test: "Visit /submit-confirm with no ?payload= parameter"
    expected: "Immediate redirect to /submit with no error page rendered"
    why_human: "window.location.href redirect happens in browser, not testable via static analysis"
---

# Phase 5: Submission Form UX Verification Report

**Phase Goal:** A rider can see who they are, preview their computed score, read an explanation of how their numbers map to points, and choose to submit or cancel — all before any data is persisted
**Verified:** 2026-04-07T16:55:45Z
**Status:** passed
**Re-verification:** Yes — after gap closure (05-04 closed the Strava identity display gap)

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Identity form requires display name and category (no hometown) | VERIFIED | `input[name="name" required]` + `select[name="category" required]` in submit-confirm.astro lines 37–53; no hometown field present anywhere |
| 2 | Score preview shows formatted activity values with weight labels | VERIFIED | renderPreview populates day1-preview (HH:MM:SS + 35%), sectors-preview (N of 7 + 45%), kom-preview (N of 3 + 20%) — lines 132–192 |
| 3 | Inline explanation: actual value + weight context per component | VERIFIED | Each preview card renders the rider's value and "counts for X% of your overall score, benchmarked against the fastest…" copy — lines 138–141, 163–165, 181–183 |
| 4 | Cancel returns rider to /submit | VERIFIED | `<a href="/submit" class="secondary-button">Cancel</a>` line 70; missing/malformed payload also redirects to /submit (lines 268, 276) |
| 5 | Rider can see who they are (Strava identity) | VERIFIED | `#athlete-identity` element at line 19; renderPreview populates "Connected as [Firstname Lastname]" or fallback "Connected as Athlete #[id]" — lines 106–117; name sourced from OAuth exchange in strava-callback.js lines 82–83, 91; threaded through strava-fetch-activity.js response lines 204–205 and token-refresh updatedPayload lines 60–61 |

**Score:** 5/5 truths verified

### Gap Closure Verification (05-04)

The single gap from the previous verification — Strava identity never displayed on the confirm page — is now fully closed. The complete data flow was verified against actual file contents:

| Step | What was added | File | Lines | Status |
|------|---------------|------|-------|--------|
| 1 — OAuth extraction | `athleteFirstname` / `athleteLastname` extracted from `tokenData.athlete` | strava-callback.js | 82–83 | VERIFIED |
| 2 — Session cookie | Both fields included in `sessionPayload` JSON.stringify | strava-callback.js | 91 | VERIFIED |
| 3 — Token refresh carry-forward | `updatedPayload` explicitly includes name fields from original session | strava-fetch-activity.js | 59–62 | VERIFIED |
| 4 — Response body | Step 8 response body includes `athleteFirstname` / `athleteLastname` from session | strava-fetch-activity.js | 204–205 | VERIFIED |
| 5 — Payload type | `Payload` type extended with optional name fields | submit-confirm.astro | 97–98 | VERIFIED |
| 6 — DOM element | `<p class="athlete-identity" id="athlete-identity"></p>` between h1 and date | submit-confirm.astro | 19 | VERIFIED |
| 7 — renderPreview | Populates identity element with "Connected as [name]" or athlete ID fallback | submit-confirm.astro | 106–117 | VERIFIED |
| 8 — Hidden fields | `h-athleteFirstname` and `h-athleteLastname` hidden inputs added | submit-confirm.astro | 63–64 | VERIFIED |
| 9 — populateHiddenFields | Sets both new hidden fields from payload | submit-confirm.astro | 209–210 | VERIFIED |
| 10 — CSS | `.athlete-identity` rule matches fern-500 color scheme | submit-confirm.astro | 327–332 | VERIFIED |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/pages/submit.astro` | URL input form, fetch to /api/strava-fetch-activity, base64url redirect | VERIFIED | 257 lines; real fetch call at line 85, toBase64url at line 48, redirect on success at line 123 |
| `src/pages/submit-confirm.astro` | Payload decode, score preview, identity display, identity form, cancel flow | VERIFIED | 526 lines; all five concerns implemented and wired |
| `netlify/functions/strava-fetch-activity.js` | Strava API fetch, returns activityId, athleteId, athleteFirstname, athleteLastname, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds | VERIFIED | All 8 fields present in Step 8 response body (lines 202–210) |
| `netlify/functions/strava-callback.js` | OAuth exchange; extracts athlete name; stores athleteId, athleteFirstname, athleteLastname, tokens in session cookie | VERIFIED | 117 lines; name extraction at lines 82–83; sessionPayload at line 91 includes all fields |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| strava-callback.js | strava_session cookie | JSON.stringify with athleteFirstname + athleteLastname | WIRED | Line 91: `{ athleteId, athleteFirstname, athleteLastname, accessToken, refreshToken, expiresAt }` |
| strava-fetch-activity.js | response JSON | session.athleteFirstname / session.athleteLastname | WIRED | Lines 204–205 in Step 8 response body |
| strava-fetch-activity.js | token-refresh cookie | updatedPayload explicit carry-forward | WIRED | Lines 59–62: `athleteFirstname: session.athleteFirstname || ""` |
| submit.astro | /api/strava-fetch-activity | fetch() POST | WIRED | Line 85: `fetch("/api/strava-fetch-activity", { method: "POST" })` with response parsed and used |
| submit.astro | /submit-confirm | window.location.href + toBase64url | WIRED | Line 123: `window.location.href = "/submit-confirm?payload=" + toBase64url(data)` |
| submit-confirm.astro | payload query param | URLSearchParams + fromBase64url | WIRED | Lines 264–278: reads `params.get("payload")`, decodes, redirects to /submit on failure |
| submit-confirm.astro | #athlete-identity element | renderPreview reads payload.athleteFirstname/Last | WIRED | Lines 106–117: populates "Connected as [name]" or fallback |
| submit-confirm.astro | renderPreview | DOMContentLoaded script | WIRED | renderPreview(payload) called at line 280 |
| submit-confirm.astro | identity form validation | setCustomValidity | WIRED | Lines 226–238: custom validity set for name and category before blocking submit |
| submit-confirm.astro | /submit (cancel) | href="/submit" + redirect on missing payload | WIRED | Line 70 (cancel link), lines 268+276 (missing/malformed payload redirect) |
| submit-confirm.astro | Phase 7 POST | PLACEHOLDER | NOT WIRED | Lines 241–246: form submit handler changes button text to "Submission ready" — no actual POST to /api/submit-result. Documented Phase 7 deferral, not a gap for this phase. |

### Requirements Coverage

| Requirement | Status | Note |
|-------------|--------|------|
| SUBM-01 (score preview) | SATISFIED | Score preview renders for all three components with actual values and weight labels |
| SUBM-03 (identity fields) | SATISFIED | name + category required; form blocked without both; no hometown field (removed in 02-01) |
| SUBM-04 (inline explanation) | SATISFIED | Each preview card shows actual value + "counts for X%" explanation |
| Phase goal: "see who they are" | SATISFIED | "Connected as [Firstname Lastname]" displayed between heading and activity date; fallback to athlete ID for pre-existing sessions |

### Success Criteria Checklist

| Criterion | Status | Notes |
|-----------|--------|-------|
| 1. Identity form: display name + category required; no hometown | SATISFIED | `required` on both fields; no hometown input; setCustomValidity blocks submit without both |
| 2. Score preview shows computed values (not raw Strava numbers) | SATISFIED | Values are formatted (HH:MM:SS, sector count+time, KOM count) — rider-readable, not raw API fields |
| 3. Inline explanation: actual value + point conversion context | SATISFIED | Each card shows value + "counts for X% of your overall score, benchmarked against fastest in category" |
| 4. Rider can cancel from confirm page and returns to /submit | SATISFIED | Cancel `<a href="/submit">` at line 70; missing payload also redirects to /submit |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| src/pages/submit-confirm.astro | 241–246 | Form submit handler is a placeholder: changes button text, no POST | WARNING | Documented intentional deferral to Phase 7 — not a blocker for this phase's goals |

No TODO/FIXME comments. No stub return values beyond the Phase 7 deferral. Input `placeholder` attributes and CSS `::placeholder` rules are expected HTML — not stub indicators.

### Human Verification Required

All automated structural checks pass. The following require browser interaction to fully confirm:

#### 1. Score Preview + Identity Display (Day 1)

**Test:** Visit `/submit-confirm?payload=<valid-day1-base64url>` with a real or synthetic payload
**Expected:** Page shows "Connected as [Firstname Lastname]" below the heading, formatted HH:MM:SS moving time, "counts for 35% of your overall score" explanation, Cancel button visible
**Why human:** DOMContentLoaded script populates identity and preview divs at runtime — static HTML is empty

#### 2. Score Preview (Day 2)

**Test:** Visit `/submit-confirm?payload=<valid-day2-base64url>` with sectorEfforts and komSegmentIds
**Expected:** Sectors shows "N of 7 sectors · HH:MM:SS", KOM shows "N of 3 KOM segments"; identity line present
**Why human:** Client-side rendering with payload-dependent content

#### 3. Form Validation — Empty Category

**Test:** Fill display name, leave category at "Select your category", click Confirm Submission
**Expected:** Browser reports "Please select your category" on the category select — submit does not proceed
**Why human:** setCustomValidity + reportValidity requires browser interaction

#### 4. Form Validation — Empty Name

**Test:** Leave name blank, select a category, click Confirm Submission
**Expected:** Browser reports "Please enter your display name" on the name input
**Why human:** setCustomValidity requires browser interaction

#### 5. Missing Payload Redirect

**Test:** Visit `/submit-confirm` with no `?payload=` parameter
**Expected:** Immediate redirect to `/submit` — no error page rendered
**Why human:** window.location.href redirect happens in browser, not testable via static analysis

---

### Summary

Phase 5 goal is fully achieved. All five observable truths pass. The single gap from the initial verification — Strava identity never shown on the confirm page — is now closed by the 05-04 gap closure plan. The complete data flow from OAuth exchange (`strava-callback.js`) through session cookie preservation on token refresh (`strava-fetch-activity.js`) to client-side DOM rendering (`submit-confirm.astro`) was verified against actual file contents — not SUMMARY claims.

The only non-wired item (Phase 7 POST from the form submit handler) is a documented intentional deferral, not a gap against this phase's goals.

Five human verification items remain — all require browser rendering of client-side JavaScript and cannot be confirmed by static code analysis.

---

_Verified: 2026-04-07T16:55:45Z_
_Verifier: Claude (gsd-verifier)_
