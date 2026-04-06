# Phase 04: Activity Fetching and Validation - Research

**Researched:** 2026-04-06
**Domain:** Strava API v3 activity fetch, URL parsing, date validation, Netlify Functions v1 error handling
**Confidence:** HIGH (Strava API verified via official docs; patterns extend established Phase 03 foundations)

---

## Summary

This phase builds the first actual Strava data call, implemented as a new Netlify Function that reads the `strava_session` cookie (established in Phase 03), accepts a Strava activity URL pasted by the rider, parses the numeric activity ID, fetches the full DetailedActivity with `include_all_efforts=true`, and validates ownership and date range before allowing the rider to proceed.

The technical foundation is already in place: `getValidAccessToken()` in `netlify/functions/lib/strava-tokens.js` handles token refresh, and `cookie-es` handles session parsing. The new function (`strava-fetch-activity.js`) is a thin orchestrator: parse URL, call Strava, validate the response, and return structured data or a machine-readable error code. No new libraries are required.

The most critical API detail for planning: the Strava activity endpoint returns the athlete as `activity.athlete.id` (a Long/number), not a string. Since the session stores `athleteId` as `String(tokenData.athlete.id)` (per Phase 03 decision), the ownership check must convert the API response to string before comparing. Additionally, date validation must use `start_date_local` (which the Strava API returns as an ISO 8601 string with a `Z` suffix that is actually the **local** wall-clock time, not UTC) rather than `start_date` (which is true UTC). For the Iron & Pine event in the US Midwest (CDT = UTC-5), a June 6–7 activity would have `start_date` that could be on June 5 in UTC, so validating against `start_date_local` is correct for local-calendar date matching.

**Primary recommendation:** Implement as a single new Netlify Function `strava-fetch-activity.js` that accepts a POST with the activity URL in the body, uses the existing session cookie pattern and `getValidAccessToken()`, makes one Strava API call, and returns JSON with either the validated activity data or a structured error object. The frontend submits the URL to this function and branches on the response.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `fetch` (Node built-in) | Node 22 built-in | GET to Strava API v3 | Already used in strava-callback.js and strava-tokens.js; no dep needed |
| `cookie-es` | 3.1.1 | Parse `strava_session` from request cookies | Already installed; ESM-native; same pattern as Phase 03 |
| `netlify/functions/lib/strava-tokens.js` | Local | Token refresh before API call | Already implemented in Phase 03; import `getValidAccessToken` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Native `URL` (Node built-in) | Node 22 built-in | Alternative to regex for URL parsing | Could use `new URL(input).pathname` to extract path segments, but regex is simpler for this specific case |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native `fetch` | `axios`, `node-strava-v3` | No external dep needed; single GET with Authorization header is trivial with fetch |
| Hand-rolled regex | `URL` constructor | Both work; regex `/strava\.com\/activities\/(\d+)/` is three lines and covers the specific format; `URL` is more robust for general URL parsing but overkill here |
| `start_date_local` for date check | `start_date` (UTC) | `start_date` is true UTC — for US Midwest riders, a June 6 activity may have `start_date` on June 5 UTC. Use `start_date_local` which reflects the date as the rider experienced it. |

**Installation:**
```bash
# No new packages required. All dependencies are already installed.
```

---

## Architecture Patterns

### Recommended Project Structure

```
netlify/functions/
├── health.js                   # Existing smoke-test (Phase 02)
├── strava-auth.js              # OAuth initiation (Phase 03)
├── strava-callback.js          # OAuth callback (Phase 03)
├── strava-fetch-activity.js    # NEW: Activity fetch + validation (Phase 04)
└── lib/
    └── strava-tokens.js        # Shared token refresh utility (Phase 03)
```

### Pattern 1: Session Read → Token Refresh → API Call → Validate → Return JSON

**What:** The standard pattern for all Strava-authenticated Netlify Functions in this project. Read session cookie, call `getValidAccessToken()`, make the API call, handle errors structurally, return JSON.

**When to use:** Any function that needs a Strava API call after OAuth is complete.

**Example (strava-fetch-activity.js skeleton):**
```javascript
// Source: extends pattern from strava-callback.js + strava-tokens.js (Phase 03)
import { parse, serialize } from "cookie-es";
import { getValidAccessToken } from "./lib/strava-tokens.js";

export const handler = async (event, context) => {
  // 1. Parse session cookie
  const cookies = parse(event.headers.cookie || "");
  const sessionRaw = cookies.strava_session;
  if (!sessionRaw) {
    return { statusCode: 401, body: JSON.stringify({ error: "no_session" }) };
  }

  let session;
  try {
    session = JSON.parse(sessionRaw);
  } catch (_) {
    return { statusCode: 401, body: JSON.stringify({ error: "bad_session" }) };
  }

  // 2. Refresh token if needed (getValidAccessToken handles the check)
  let tokenResult;
  try {
    tokenResult = await getValidAccessToken(session);
  } catch (_) {
    return { statusCode: 401, body: JSON.stringify({ error: "token_refresh_failed" }) };
  }

  const { accessToken, refreshToken, expiresAt, updated } = tokenResult;

  // 3. If token was refreshed, update session cookie in response
  //    (set multiValueHeaders with updated session cookie)
  const responseHeaders = {};
  const multiValueHeaders = {};
  if (updated) {
    const isLocal = process.env.NETLIFY_DEV === "true";
    const newPayload = JSON.stringify({
      athleteId: session.athleteId,
      accessToken,
      refreshToken,
      expiresAt,
    });
    const updatedCookie = serialize("strava_session", newPayload, {
      httpOnly: true,
      secure: !isLocal,
      sameSite: "lax",
      path: "/",
      maxAge: 3600,
    });
    multiValueHeaders["Set-Cookie"] = [updatedCookie];
  }

  // 4. Parse activity URL from request body
  const body = JSON.parse(event.body || "{}");
  const activityUrl = body.activityUrl || "";
  const match = activityUrl.match(/strava\.com\/activities\/(\d+)/);
  if (!match) {
    return { statusCode: 400, body: JSON.stringify({ error: "invalid_url" }) };
  }
  const activityId = match[1];

  // 5. Fetch activity from Strava
  let activity;
  try {
    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) {
      const status = res.status;
      if (status === 404) return { statusCode: 200, body: JSON.stringify({ error: "activity_not_found" }) };
      if (status === 401) return { statusCode: 200, body: JSON.stringify({ error: "activity_unauthorized" }) };
      if (status === 429) return { statusCode: 200, body: JSON.stringify({ error: "rate_limited" }) };
      return { statusCode: 200, body: JSON.stringify({ error: "strava_api_error", statusCode: status }) };
    }
    activity = await res.json();
  } catch (_) {
    return {
      statusCode: 200,
      body: JSON.stringify({ error: "network_error" }),
    };
  }

  // 6. Ownership check: activity.athlete.id is a number; session.athleteId is a string
  if (String(activity.athlete.id) !== session.athleteId) {
    return { statusCode: 200, body: JSON.stringify({ error: "wrong_athlete" }) };
  }

  // 7. Date range validation using start_date_local
  //    start_date_local is ISO 8601 with Z suffix but represents LOCAL time (not UTC)
  //    For Iron & Pine (June 6-7, 2026 US Midwest), extract the date portion directly
  const localDateStr = activity.start_date_local.slice(0, 10); // "2026-06-06"
  const validDates = ["2026-06-06", "2026-06-07"];
  if (!validDates.includes(localDateStr)) {
    return {
      statusCode: 200,
      body: JSON.stringify({
        error: "wrong_date",
        actualDate: localDateStr,
        expectedDates: validDates,
      }),
    };
  }

  // 8. Return validated activity data
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json", ...responseHeaders },
    multiValueHeaders: Object.keys(multiValueHeaders).length ? multiValueHeaders : undefined,
    body: JSON.stringify({ activity }),
  };
};
```

### Pattern 2: Structured Error Returns (Not HTTP Error Codes)

**What:** For user-facing validation errors (wrong athlete, wrong date, invalid URL), return `200` with a JSON body containing an `error` field. Reserve HTTP error codes (`401`, `429`) only for infrastructure-level failures.

**When to use:** Any error the user can recover from by re-submitting, trying again, or re-authorizing. A `200` response with `{ error: "wrong_date" }` lets the frontend display a friendly message and retry input without triggering generic error handling.

**Why:** The rider should not get a browser-level error for a wrong activity URL. The Astro/frontend can branch on `result.error` to show contextual messages.

### Pattern 3: Session Cookie Re-Serialization When Token Is Updated

**What:** When `getValidAccessToken()` returns `{ updated: true }`, the caller must re-serialize the session cookie with the new token values and include it in the response via `multiValueHeaders['Set-Cookie']`.

**When to use:** Every Strava-authenticated function must handle this. Failure to propagate updated refresh tokens causes `invalid_grant` failures on the next token refresh.

**Prior art:** Established in Phase 03 research; `getValidAccessToken()` was designed with this contract (`updated: boolean`).

### Anti-Patterns to Avoid

- **Returning HTTP 4xx for validation errors:** If the activity belongs to another athlete, return `{ error: "wrong_athlete" }` with status 200, not 403. HTTP status codes here would confuse the frontend and lose the user's session context.
- **Using `start_date` (UTC) for date validation:** For a US Midwest event, `start_date` could be June 5 UTC for an activity that started at 7am June 6 CDT. Always use `start_date_local`.
- **Comparing `activity.athlete.id` as a number to `session.athleteId`:** The API returns `athlete.id` as a Long (number). The session stores it as `String()`. Convert before comparing: `String(activity.athlete.id) !== session.athleteId`.
- **Not re-serializing the session cookie when `updated === true`:** If the access token was refreshed but the cookie isn't updated, the next request sends a stale (potentially invalid) session.
- **Storing activity data in the function's response beyond what's needed:** Only return the fields the frontend needs for the next step (confirmation), not the full activity blob. The full activity is only needed to extract `moving_time`, `segment_efforts`, and validation fields.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token refresh | Custom expiry check | `getValidAccessToken()` from `lib/strava-tokens.js` | Already implemented in Phase 03 with correct BUFFER_SECONDS, refresh token rotation, `updated` flag |
| Cookie parsing | Manual string split | `cookie-es` `parse()` | Already in project; handles edge cases in cookie header format |
| Session cookie re-serialization | Custom builder | `cookie-es` `serialize()` with same flags as Phase 03 | Consistent flag set (httpOnly, secure, sameSite, path, maxAge) already established |

**Key insight:** This phase adds one Strava API call (GET activity) on top of the already-built authentication machinery. Resist the urge to add a library wrapper for the Strava API — it's a single authenticated GET, not a complex integration requiring a client.

---

## Common Pitfalls

### Pitfall 1: `activity.athlete.id` Is a Number, Not a String

**What goes wrong:** Comparing `activity.athlete.id === session.athleteId` returns false because one is a number and one is a string.

**Why it happens:** The Strava API returns numeric IDs as JSON numbers (Longs). The session cookie stores `athleteId` as `String(tokenData.athlete.id)` per the Phase 03 decision.

**How to avoid:** Always convert: `String(activity.athlete.id) !== session.athleteId`.

**Warning signs:** Ownership check always fails even when the rider pastes their own activity.

### Pitfall 2: Using `start_date` (UTC) Instead of `start_date_local` for Date Validation

**What goes wrong:** An activity starting at 6:00am CDT (UTC-5) on June 6, 2026 has `start_date` of `"2026-06-06T11:00:00Z"`, which is also June 6 UTC — fine. But an activity starting at 11:30pm CDT on June 7, 2026 has `start_date` of `"2026-06-08T04:30:00Z"` (June 8 UTC), which would be incorrectly rejected.

**Why it happens:** Developers assume `start_date` is the "true" date. But for local date comparisons, the local time is what matters to the rider.

**How to avoid:** Use `start_date_local` and slice the date portion: `activity.start_date_local.slice(0, 10)`. The Strava API returns `start_date_local` as an ISO 8601 string whose date portion accurately reflects the rider's local date even though the timestamp has a `Z` suffix.

**Important nuance:** The `Z` suffix on `start_date_local` is technically misleading (it's NOT UTC; the date/time is in local time). Do not parse it with `new Date()` and then try to localize it — just extract the date string portion directly with `slice(0, 10)`.

**Warning signs:** Riders submitting late-evening Day 2 activities get "wrong date" errors.

### Pitfall 3: Strava Returns 401 (Not 404) When Fetching Another Athlete's Activity

**What goes wrong:** Assuming that fetching another athlete's activity returns 404. The API returns 401 ("Not allowed to view unauthenticated activities") for activities that are private or owned by another athlete without the required scope.

**Why it happens:** Strava uses 401 to indicate both "expired/missing token" and "this activity is not yours." This conflation means the error handling must differentiate between a token problem and an ownership problem.

**How to avoid:** For this project, ownership is verified via `activity.athlete.id` AFTER a successful 200 fetch. If the API returns 401, it either means the token is expired (handle with token refresh) or the activity is private and belongs to another athlete. Map both 401 and 404 responses to a user-facing "activity not found or not accessible" error rather than assuming it means "wrong athlete" — because the ownership check via `athlete.id` only happens on a successful 200.

**Note:** If the activity is PUBLIC and belongs to another athlete, the API may still return it (200) since `activity:read_all` was granted by the authenticated user. In that case, the `activity.athlete.id` comparison is the correct ownership gate.

**Warning signs:** Riders get unhelpful errors when pasting public activities that belong to others.

### Pitfall 4: Forgetting `include_all_efforts=true` for Day 2 Segment Data

**What goes wrong:** The activity is fetched successfully but `segment_efforts` is either empty or only contains the athlete's PR/starred efforts.

**Why it happens:** Without `include_all_efforts=true`, the Strava API returns only a subset of segment efforts (typically KOM/starred segments). The full effort list required for Day 2 sector scoring requires the explicit parameter.

**How to avoid:** Always append `?include_all_efforts=true` to the activity fetch URL.

**Warning signs:** `activity.segment_efforts` is empty or shorter than expected for activities with known segment records.

### Pitfall 5: Network Error vs Strava API Error — Both Must Be Recoverable

**What goes wrong:** A transient network error during the Strava fetch causes an exception. If uncaught, it results in a 500 that destroys the rider's session context.

**Why it happens:** `fetch()` throws on network failure (connection reset, DNS failure, timeout). This is different from an HTTP error response.

**How to avoid:** Wrap the fetch in a try/catch. On network error, return `{ error: "network_error" }` with status 200. The frontend shows "Try again" — the rider's OAuth session remains intact.

**Warning signs:** Strava API downtime or flaky network causes riders to lose their session and have to re-authorize.

### Pitfall 6: Netlify Function Timeout Is 10 Seconds

**What goes wrong:** The Strava API is slow or unresponsive; the Netlify function times out at 10 seconds and returns a 502 error.

**Why it happens:** Netlify synchronous functions have a 10-second timeout by default (26 seconds on paid plans). The Strava activity fetch is typically fast (<1s) but can be slow under load.

**How to avoid:** Do not add retry loops within the function — they'll hit the timeout. Return a recoverable error quickly. The frontend handles retry by re-submitting the URL.

**Warning signs:** Function invocations timing out in Netlify function logs.

### Pitfall 7: `segment_efforts` Segment IDs Are Numbers in the API Response

**What goes wrong:** Comparing segment effort IDs to `SECTOR_SEGMENT_IDS` (which are strings) fails because the API returns `effort.segment.id` as a Long (number).

**Why it happens:** The Phase 01 decision to store segment IDs as strings (to avoid precision loss) does not change what the Strava API returns. The API returns numeric IDs.

**How to avoid:** When extracting segment efforts, convert: `String(effort.segment.id)`. Then compare to the string arrays in `segments.ts`.

**Warning signs:** `sectorEfforts` object is always empty even for riders who rode the sectors.

---

## Code Examples

Verified patterns from official sources:

### Fetch a Strava Activity by ID with Segment Efforts

```javascript
// Source: https://developers.strava.com/docs/reference/#api-Activities-getActivityById
const res = await fetch(
  `https://www.strava.com/api/v3/activities/${activityId}?include_all_efforts=true`,
  {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
);

if (!res.ok) {
  // res.status: 401 (unauthorized/private), 404 (not found), 429 (rate limited)
  throw new Error(`Strava API error: ${res.status}`);
}

const activity = await res.json();
// activity.id             — Long (number)
// activity.athlete.id     — Long (number) — compare via String() to session.athleteId
// activity.start_date     — "2026-06-06T11:00:00Z" (UTC)
// activity.start_date_local — "2026-06-06T06:00:00Z" (local time, Z suffix is misleading)
// activity.moving_time    — Integer (seconds)
// activity.segment_efforts — Array of effort objects
```

### Parse Activity ID from Full Strava URL

```javascript
// Source: Strava URL format confirmed via official site structure
// Matches: https://www.strava.com/activities/12345678901
//          http://www.strava.com/activities/12345678
//          www.strava.com/activities/987654321

const match = activityUrl.match(/strava\.com\/activities\/(\d+)/);
if (!match) {
  return { error: "invalid_url" };
}
const activityId = match[1]; // string — the numeric part
```

### Athlete Ownership Check (String Comparison)

```javascript
// Source: Pattern established in Phase 03 (athlete.id stored as String())
// activity.athlete.id is a number from the Strava API
// session.athleteId is a string (set via String(tokenData.athlete.id) in strava-callback.js)

if (String(activity.athlete.id) !== session.athleteId) {
  return { error: "wrong_athlete" };
}
```

### Date Range Validation Using start_date_local

```javascript
// Source: https://developers.strava.com/docs/reference/#api-models-DetailedActivity
// start_date_local is ISO 8601 with date portion reflecting local wall-clock date
// Do NOT use new Date() + timezone conversion — just extract the date string directly

const localDateStr = activity.start_date_local.slice(0, 10); // "2026-06-06" or "2026-06-07"
const EVENT_DATES = ["2026-06-06", "2026-06-07"];

if (!EVENT_DATES.includes(localDateStr)) {
  return {
    error: "wrong_date",
    actualDate: localDateStr,       // "2026-05-31" — shown to rider
    expectedDates: EVENT_DATES,     // ["2026-06-06", "2026-06-07"] — shown to rider
  };
}
```

### Segment Effort Extraction for Day 2 Scoring

```javascript
// Source: https://developers.strava.com/docs/reference/#api-models-DetailedSegmentEffort
// effort.segment.id is a Long (number) from the API
// SECTOR_SEGMENT_IDS and KOM_SEGMENT_IDS are string arrays in segments.ts

import { SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS } from "../../src/lib/segments.ts";

const efforts = activity.segment_efforts || [];

// Build sectorEfforts: Record<segmentId: string, elapsedSeconds: number>
const sectorEfforts = {};
for (const effort of efforts) {
  const segId = String(effort.segment.id);
  if (SECTOR_SEGMENT_IDS.includes(segId)) {
    sectorEfforts[segId] = effort.elapsed_time;
  }
}

// Build komSegmentIds: string[] — segments where this rider had any effort
const komSegmentIds = [];
for (const effort of efforts) {
  const segId = String(effort.segment.id);
  if (KOM_SEGMENT_IDS.includes(segId)) {
    komSegmentIds.push(segId);
  }
}
```

### Session Cookie Re-Serialization When Token Is Updated

```javascript
// Source: Pattern established in Phase 03 — getValidAccessToken() returns { updated: boolean }
// Caller must re-serialize the session cookie if updated === true

const { accessToken, refreshToken, expiresAt, updated } = await getValidAccessToken(session);

if (updated) {
  const isLocal = process.env.NETLIFY_DEV === "true";
  const newPayload = JSON.stringify({
    athleteId: session.athleteId,
    accessToken,
    refreshToken,
    expiresAt,
  });
  const updatedCookie = serialize("strava_session", newPayload, {
    httpOnly: true,
    secure: !isLocal,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
  });
  // Include in response via multiValueHeaders['Set-Cookie']
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Strava SDK / `node-strava-v3` | Native `fetch` with Authorization header | Node 18+ (native fetch) | No wrapper library needed for single authenticated GET |
| Parse `start_date` + `timezone` string math | Slice `start_date_local` date portion directly | N/A — both valid | `start_date_local` slice avoids timezone conversion bugs entirely |
| Check HTTP 403/404 for ownership | Check `activity.athlete.id` after 200 response | N/A — ownership check is a product logic choice | HTTP status conflation between "private" and "wrong owner" makes status-based ownership unreliable |

**Deprecated/outdated:**
- `node-strava-v3`: Wrapper library with maintenance concerns; native fetch is sufficient for 1–2 endpoints.
- Netlify Functions v2 `export default`: Confirmed env var bug as of 2026-03-28. Stay on v1 `export const handler`.

---

## Open Questions

1. **What to return from the function: full activity JSON or extracted fields only?**
   - What we know: The full activity JSON from Strava can be large (map data, photos, kudos, etc.). The frontend only needs a subset for the confirmation screen.
   - What's unclear: Whether the frontend needs raw `segment_efforts` or a pre-processed `{ sectorEfforts, komSegmentIds }` object.
   - Recommendation: Return a trimmed response: `{ activityId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds }`. Process segment extraction in the function (not the frontend) to keep Strava data handling server-side and avoid exposing full segment effort arrays to the browser.

2. **Should segment effort extraction happen in Plan 04-02 (activity fetch) or a separate plan?**
   - What we know: Phase description says 04-02 implements the Strava activity fetch, and 04-04 implements date validation. Segment extraction for Day 2 scoring is not explicitly listed as a 04-xx plan but is needed before Phase 5 (submission).
   - What's unclear: Whether segment extraction belongs in the fetch function or is deferred.
   - Recommendation: Include segment extraction (`sectorEfforts` and `komSegmentIds`) in the 04-02 fetch plan, since the data is already available from the `include_all_efforts=true` response and extracting it elsewhere would require a second pass.

3. **What error message does the UI show when `activity.athlete.id` check fails (Strava returned 200 for a public activity that isn't the rider's)?**
   - What we know: This is technically possible — if a rider pastes another rider's PUBLIC activity URL, Strava may return 200 with `include_all_efforts=true`, and the function will successfully fetch it. Only the `athlete.id` comparison catches this.
   - What's unclear: The exact UX copy for the error message.
   - Recommendation: The function returns `{ error: "wrong_athlete" }` and the frontend shows: "This activity belongs to a different athlete. Please paste your own Strava activity link." The planner should document the expected error string.

---

## Sources

### Primary (HIGH confidence)

- `https://developers.strava.com/docs/reference/#api-Activities-getActivityById` — Endpoint path, `include_all_efforts` parameter, DetailedActivity model fields (`athlete.id`, `start_date`, `start_date_local`, `timezone`, `segment_efforts`, `moving_time`, `elapsed_time`)
- `https://developers.strava.com/docs/rate-limits/` — Rate limits: 100 read requests/15 min, 1,000/day; 429 status on exceeded; `X-RateLimit-Limit` and `X-RateLimit-Usage` headers
- `netlify/functions/lib/strava-tokens.js` (project file) — `getValidAccessToken()` contract: `{ accessToken, refreshToken, expiresAt, updated: boolean }`
- `netlify/functions/strava-callback.js` (project file) — Session cookie format: `{ athleteId, accessToken, refreshToken, expiresAt }` with `athleteId` as `String()`
- `src/lib/segments.ts` (project file) — `SECTOR_SEGMENT_IDS` and `KOM_SEGMENT_IDS` are string arrays; segment IDs must be converted from API Longs

### Secondary (MEDIUM confidence)

- Strava API community forum: `https://communityhub.strava.com/developers-api-7/help-with-get-activities-id-1804` — API returns 401 for "Not allowed to view unauthenticated activities"; endpoint format confirmed as `/api/v3/activities/{id}` (not `/athlete/activities/{id}`)
- WebSearch results on `start_date_local` timezone behavior — Confirmed `start_date_local` has a `Z` suffix but represents local wall-clock time; `timezone` field accompanies it as `"(GMT-08:00) America/Los_Angeles"` format

### Tertiary (LOW confidence)

- WebSearch: Strava returns 401 (not 403) when fetching another athlete's private activity — community-reported, consistent with forum discussion but not explicitly documented in official Strava API reference

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries; all existing tools verified in Phase 03 execution
- Architecture: HIGH — single-function pattern matches existing functions; token refresh contract verified in Phase 03 implementation
- Strava API endpoint and parameters: HIGH — verified via official docs
- `start_date_local` behavior: MEDIUM — official docs confirm field exists and `timezone` accompanies it; community discussion confirms Z-suffix is misleading but date portion is reliable; HIGH confidence that slicing to `slice(0, 10)` is the correct pattern
- Ownership check via `athlete.id`: HIGH — field documented in official schema; string conversion requirement follows established project decision
- HTTP status codes for cross-athlete access: LOW — 401 behavior confirmed by community forum but not explicitly documented as the authoritative response code for "not your activity" vs "expired token"

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (Strava API v3 is stable; no planned changes to activity endpoint based on changelog)
