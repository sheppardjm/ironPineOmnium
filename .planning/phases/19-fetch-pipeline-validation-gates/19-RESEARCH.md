# Phase 19: Fetch Pipeline Validation Gates - Research

**Researched:** 2026-04-14
**Domain:** Netlify Functions ESM validation logic, Astro client-side error surfacing
**Confidence:** HIGH

## Summary

Phase 19 is pure validation logic — no new infrastructure, no new npm packages, no new files except possibly a helper. The domain is well-understood from direct codebase inspection. All the inputs this phase needs (constants, fields, transport chain) were delivered by Phase 18 and are fully verified in the codebase.

The work divides into two discrete surfaces: (1) `strava-fetch-activity.js` gains validation gates after the existing date check (Step 6), returning new `{ error: "code", ...details }` shapes for four rejection conditions; (2) `submit.astro` gains four new `errorMessages` entries that render human-readable strings including the rider's actual value and the threshold.

The insertion point for validation is surgical: after the existing "Step 6: Date validation" block and before "Step 7: Segment effort extraction." Validation order matters — hidden start time must be checked before epoch comparison, because a T00:00:01Z timestamp cannot be meaningfully compared to the gun epoch.

**Primary recommendation:** Add a single "Step 7: Validation gates" block to `strava-fetch-activity.js` immediately after the date check. Import the four constants from `event-config.ts`. Return new error codes with `actualDistanceKm`, `minDistanceKm`, `actualStartTime`, and `cutoffTime` fields as appropriate. Add corresponding `errorMessages` entries to `submit.astro`.

## Standard Stack

No new libraries. This phase uses only what is already installed and in use.

### Core (already present)

| Component | Version | Purpose | Status |
|-----------|---------|---------|--------|
| Node.js ESM (Netlify Functions v1) | runtime | Validation logic in `strava-fetch-activity.js` | Already in use |
| TypeScript (`as const` imports) | ^5.9.3 | `event-config.ts` constants already typed and exported | Phase 18 complete |
| Astro static pages | current | `submit.astro` client-side error message display | Already in use |

### No Alternatives Needed

Zero new npm packages. All validation is arithmetic on existing data fields.

**Installation:** None required.

## Architecture Patterns

### Recommended File Changes (no new files needed)

```
netlify/
└── functions/
    └── strava-fetch-activity.js   # MODIFIED — add validation gates after Step 6

src/
└── pages/
    └── submit.astro               # MODIFIED — add 3 new errorMessages entries

(No new files required)
```

Note: `submit-result.js` also needs a one-line fix for the Phase 18 verification gap (it still hardcodes date strings instead of importing from event-config.ts). This is a clean-up that logically belongs in this phase since it was flagged in Phase 18's VERIFICATION.md.

### Pattern 1: Validation Gate Order (critical)

The four validation gates must execute in this order:

1. **Hidden start time** (`T00:00:01Z`) — checked first, before any epoch arithmetic
2. **Distance** — check `distanceMeters` against per-day threshold from `event-config.ts`
3. **Start time window** — compare UTC epoch of `startDate` to `GUN_EPOCH_SECONDS + START_WINDOW_SECONDS`

Rationale for order: If start_date ends in T00:00:01Z, parsing it as an epoch produces a nonsensical time (midnight UTC). Checking the privacy sentinel first prevents misleading error messages and avoids falsely triggering the start-time-window check.

The distance check has no ordering dependency — it can precede or follow the hidden-start check. Checking hidden start first is cleaner because it's a format-level rejection before any computation.

**Gate 1: Hidden start time detection**
```javascript
// VAL-04: Reject if start_date ends in T00:00:01Z (Strava "Hide Start Time")
if (startDate.endsWith("T00:00:01Z")) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
    body: JSON.stringify({ error: "hidden_start_time" }),
  };
}
```

**Gate 2: Distance check (day-aware)**
```javascript
// VAL-01/VAL-02: Reject activities shorter than the per-day minimum distance
const isDay1 = localDateStr === DAY1_DATE;
const minDistanceMeters = isDay1 ? DAY1_MIN_DISTANCE_METERS : DAY2_MIN_DISTANCE_METERS;
const minDistanceKm = isDay1 ? 156 : 153;

if (distanceMeters < minDistanceMeters) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
    body: JSON.stringify({
      error: "distance_too_short",
      actualDistanceKm: Math.round(distanceMeters / 10) / 100,  // 2 decimal places
      minDistanceKm,
    }),
  };
}
```

**Gate 3: Start time window (Day 1 only)**
```javascript
// VAL-03: Day 1 only — reject if start_date is more than 30 min after gun
if (isDay1) {
  const startEpoch = Math.floor(new Date(startDate).getTime() / 1000);
  const cutoffEpoch = GUN_EPOCH_SECONDS + START_WINDOW_SECONDS;

  if (startEpoch > cutoffEpoch) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({
        error: "start_too_late",
        actualStartTime: startDate,          // ISO UTC string — let client format
        cutoffTime: new Date(cutoffEpoch * 1000).toISOString(),  // "2026-06-06T12:30:00.000Z"
      }),
    };
  }
}
```

### Pattern 2: Import Constants in strava-fetch-activity.js

Phase 18 already imports from event-config.ts. Extend the existing import line:

```javascript
// Before (Phase 18):
import { EVENT_DATES } from "../../src/lib/event-config.ts";

// After (Phase 19):
import {
  EVENT_DATES,
  DAY1_DATE,
  DAY2_DATE,
  DAY1_MIN_DISTANCE_METERS,
  DAY2_MIN_DISTANCE_METERS,
  GUN_EPOCH_SECONDS,
  START_WINDOW_SECONDS,
} from "../../src/lib/event-config.ts";
```

Note: `DAY1_DATE` and `DAY2_DATE` are also needed in submit-result.js (Phase 18 gap fix).

### Pattern 3: Error Message Display in submit.astro

The existing `errorMessages` record already handles several codes. Phase 19 adds three more:

```javascript
const errorMessages: Record<string, string> = {
  // ... existing entries ...
  distance_too_short: "", // populated dynamically from data.actualDistanceKm and data.minDistanceKm
  start_too_late: "",     // populated dynamically from data.actualStartTime and data.cutoffTime
  hidden_start_time: "Your Strava activity has \"Hide Start Time\" enabled. Please disable this privacy setting and resubmit your activity.",
};
```

The `distance_too_short` and `start_too_late` messages include the rider's actual value and threshold (VAL-05), so they cannot be static strings — they must be dynamically composed. The existing error handling in `submit.astro` already has a special case for `wrong_date` that inspects `data.actualDate`. Follow the same pattern:

```javascript
if (data.error === "distance_too_short") {
  message = `Your activity was ${data.actualDistanceKm} km. The minimum for this day is ${data.minDistanceKm} km (95% of the route). Please submit your full ride.`;
} else if (data.error === "start_too_late") {
  // Format actualStartTime from UTC to a readable local time string
  const actual = new Date(data.actualStartTime as string).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", timeZone: "America/New_York"
  });
  message = `Your activity started at ${actual} ET. Submissions must start within 30 minutes of the 8:00 AM gun. If you started before Strava was recording, you may need to edit your activity start time.`;
} else if (data.error === "hidden_start_time") {
  message = `Your Strava activity has "Hide Start Time" enabled. Please disable this privacy setting in Strava and resubmit.`;
}
```

### Pattern 4: submit-result.js Gap Fix (Phase 18 verification debt)

The Phase 18 VERIFICATION.md flagged that `submit-result.js` hardcodes `"2026-06-06"` and `"2026-06-07"` on lines 90-92 instead of importing from event-config.ts. This is the last remaining magic-number gap. The fix is:

```javascript
// Add at top of submit-result.js (already imports cookie-es):
import { DAY1_DATE, DAY2_DATE } from "../../src/lib/event-config.ts";

// Replace lines 90-92:
// Before:
if (startDateLocal === "2026-06-06") {
  isDay1 = true;
} else if (startDateLocal === "2026-06-07") {

// After:
if (startDateLocal === DAY1_DATE) {
  isDay1 = true;
} else if (startDateLocal === DAY2_DATE) {
```

Including this fix in Phase 19 Plan 01 completes CONFIG-01 (which was PARTIAL after Phase 18 verification).

### Insertion Point in strava-fetch-activity.js

Current structure (after Phase 18):

```
Step 1: Read cookie
Step 2: Refresh token
Step 3: Parse activity URL
Step 4: Fetch activity from Strava API
Step 5: Ownership check
Step 6: Date validation  ← existing, uses EVENT_DATES
[NEW] Step 7: Validation gates  ← insert here
Step 7 (was): Segment effort extraction  ← renumber to Step 8
Step 8 (was): Return trimmed response   ← renumber to Step 9
```

The renumbering in comments is optional but keeps the code readable.

### Anti-Patterns to Avoid

- **Running start-time check before hidden-start check:** If `start_date` ends in T00:00:01Z, `new Date(startDate).getTime()` will parse successfully but yield midnight UTC — which will then falsely trigger the start_too_late check (midnight is far before gun time). Always check the sentinel first.
- **Validating start time for Day 2:** VAL-03 is Day 1 only. Day 2 has no gun-time requirement (sector scoring covers Day 2 completeness). Gating behind `if (isDay1)` is mandatory.
- **Using `start_date_local` for epoch comparison:** `start_date_local` has a misleading Z suffix but represents the LOCAL time of the ride, not UTC. Only `start_date` (UTC, already extracted by Phase 18) should be used for epoch comparison.
- **Using floating-point km with many decimals in error messages:** Convert `distanceMeters` to km with at most 2 decimal places (`Math.round(distanceMeters / 10) / 100`) for readable messages.
- **Modifying scoring.ts, types.ts, athlete-loader.ts, leaderboard display, score preview:** These are explicitly out of scope for v1.2.
- **Touching submit-confirm.astro beyond what's already done:** Phase 18 wired the transport chain completely. Phase 19 does not need to modify submit-confirm.astro.
- **Adding `distanceMeters` or `startDate` to the submit-result.js POST body:** The Phase 19 validation happens at fetch time (in strava-fetch-activity.js), not at write time (in submit-result.js). submit-result.js does NOT need to read or validate these fields.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date parsing for epoch | Custom string parser | `new Date(startDate).getTime() / 1000` | ISO 8601 UTC strings parse correctly in all environments with the native Date constructor |
| Timezone conversion for error messages | Custom TZ math library | `Date.toLocaleTimeString` with `timeZone: "America/New_York"` | Handles DST automatically; already available in browser and Netlify's Node.js runtime |
| Distance unit conversion | Custom rounding function | `Math.round(distanceMeters / 10) / 100` | Single-expression, produces 2-decimal km |

**Key insight:** All the complexity was handled in Phase 18 (constants, extraction, transport). Phase 19 is pure conditional logic.

## Common Pitfalls

### Pitfall 1: Hidden Start Time Check Order
**What goes wrong:** `new Date("2026-06-06T00:00:01Z").getTime() / 1000` yields epoch 1780617601 — well before the gun epoch of 1780747200. The start_too_late check would never fire, but the data is meaningless. Worse: if validation order is reversed and start_too_late is checked first, a hidden-start activity would be rejected with the wrong error code.
**Why it happens:** T00:00:01Z parses as a valid ISO date (midnight + 1 second UTC), so no parsing error occurs.
**How to avoid:** Always `endsWith("T00:00:01Z")` check before any epoch arithmetic.
**Warning signs:** Test with a T00:00:01Z fixture — it should return `hidden_start_time`, not `start_too_late`.

### Pitfall 2: Day 2 Start Time Gate
**What goes wrong:** Start-time validation fires for Day 2 activities, incorrectly rejecting riders who started their Day 2 ride late (which is fine — no gun time for Day 2).
**Why it happens:** If the `if (isDay1)` guard is missing around the start-time check.
**How to avoid:** Gate the entire start-time block behind `if (isDay1)`. The `isDay1` variable is already determined by the date-check step.
**Warning signs:** Day 2 activities returning `start_too_late` errors.

### Pitfall 3: Wrong Field for Epoch Comparison
**What goes wrong:** Using `localDateStr` (which is just a date, no time) or `activity.start_date_local` (local time with misleading Z suffix) instead of `startDate` (which is `activity.start_date`, the true UTC ISO string).
**Why it happens:** Multiple date fields exist in the codebase; `start_date_local` looks like UTC but isn't.
**How to avoid:** Use `startDate` — the variable already extracted by Phase 18 from `activity.start_date`.
**Warning signs:** All rides appearing to start at midnight UTC, or all Day 1 rides being rejected regardless of actual start time.

### Pitfall 4: multiValueHeaders Spread Pattern
**What goes wrong:** Forgetting to include the `multiValueHeaders` spread (`...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {})`) in the new error return objects. This causes token-refresh cookies to be dropped on error paths.
**Why it happens:** Copy-pasting from the success return without noticing the conditional spread.
**How to avoid:** Every return statement in `strava-fetch-activity.js` must include the `multiValueHeaders` spread. Check the existing error returns (e.g., `wrong_date`) as a model.
**Warning signs:** Auth loop after receiving a validation error — the cookie refresh was dropped.

### Pitfall 5: Validation Before Fields Are Available
**What goes wrong:** Accessing `distanceMeters` or `startDate` before they are assigned (i.e., placing validation gates before Step 7 where they are extracted).
**Why it happens:** If the insertion point is placed before the `const distanceMeters = activity.distance` line.
**How to avoid:** Phase 18 placed the extraction at the end of what was previously Step 7. The new validation gates must be inserted after those two `const` declarations, not before.
**Warning signs:** `distanceMeters is not defined` runtime errors.

### Pitfall 6: submit-result.js Does Not Need Validation
**What goes wrong:** Adding redundant distance/start-time validation to `submit-result.js` "for safety."
**Why it happens:** Defense-in-depth instinct.
**How to avoid:** Resist. The submit-result.js endpoint already validates athlete ID match and activity date. Adding distance validation there would require passing `distanceMeters` and `startDate` through the form POST — complicating the payload and diverging from the architecture. Fetch-time validation is the design intent (VAL-01 through VAL-04 all say "at fetch time").
**Warning signs:** Scope creep into submit-result.js beyond the gap fix for DAY1_DATE/DAY2_DATE import.

## Code Examples

### Complete Validation Gate Block (strava-fetch-activity.js)

```javascript
// Step 7: Validation gates
// VAL-04: Reject hidden start time before any epoch arithmetic
if (startDate.endsWith("T00:00:01Z")) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
    body: JSON.stringify({ error: "hidden_start_time" }),
  };
}

// VAL-01/VAL-02: Day-aware distance gate
const isDay1 = localDateStr === DAY1_DATE;
const minDistanceMeters = isDay1 ? DAY1_MIN_DISTANCE_METERS : DAY2_MIN_DISTANCE_METERS;
const minDistanceKm = isDay1 ? 156 : 153;

if (distanceMeters < minDistanceMeters) {
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
    body: JSON.stringify({
      error: "distance_too_short",
      actualDistanceKm: Math.round(distanceMeters / 10) / 100,
      minDistanceKm,
    }),
  };
}

// VAL-03: Day 1 start time window gate
if (isDay1) {
  const startEpoch = Math.floor(new Date(startDate).getTime() / 1000);
  const cutoffEpoch = GUN_EPOCH_SECONDS + START_WINDOW_SECONDS;

  if (startEpoch > cutoffEpoch) {
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      ...(Object.keys(multiValueHeaders).length ? { multiValueHeaders } : {}),
      body: JSON.stringify({
        error: "start_too_late",
        actualStartTime: startDate,
        cutoffTime: new Date(cutoffEpoch * 1000).toISOString(),
      }),
    };
  }
}
```

### Error Handler Extension in submit.astro

Insert after the existing `wrong_date` special-case block (currently lines 125-128):

```javascript
if (data.error === "wrong_date" && typeof data.actualDate === "string") {
  message = `That activity is from ${data.actualDate}. The Iron & Pine Omnium is June 6-7, 2026.`;
} else if (data.error === "distance_too_short") {
  message = `Your activity was ${data.actualDistanceKm} km. The minimum for this day is ${data.minDistanceKm} km (95% of the full route). Make sure you submitted the complete ride.`;
} else if (data.error === "start_too_late") {
  const actual = new Date(data.actualStartTime as string).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/New_York",
  });
  message = `Your activity started at ${actual} ET. Submissions must begin within 30 minutes of the 8:00 AM gun (by 8:30 AM ET). If you started before Strava was recording, edit your activity start time and resubmit.`;
} else if (data.error === "hidden_start_time") {
  message = `Your Strava activity has "Hide Start Time" enabled. Disable this privacy setting in the Strava app or website and resubmit your activity.`;
} else {
  message =
    errorMessages[data.error as string] ?? "Something went wrong. Please try again.";
}
```

### Insertion Point in strava-fetch-activity.js (exact anchor)

After Phase 18, lines 206-207 look like this:
```javascript
  const distanceMeters = activity.distance;
  const startDate = activity.start_date;

  // Step 8: Return trimmed response
```

The validation gate block goes BETWEEN the `const startDate` line and the `// Step 8:` comment. This is the only valid insertion point — the fields must be defined before validation reads them.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| No distance validation | Fetch-time rejection with distance + threshold in error payload | Riders learn exactly what failed, not just "submission rejected" |
| No start-time validation | Epoch-based check with 30-minute window | Hidden start-time and late-start activities caught before data write |
| No hidden-start detection | `endsWith("T00:00:01Z")` sentinel check | Riders told explicitly to disable privacy setting |

**No deprecated approaches apply:** This is new functionality.

## Open Questions

1. **Should `actualDistanceKm` use fixed 2 decimal places or dynamic rounding?**
   - What we know: `Math.round(distanceMeters / 10) / 100` gives 2 decimal places (e.g., 152.48 km)
   - What's unclear: Whether 152.5 km or 152.48 km is more user-friendly in an error message
   - Recommendation: 2 decimal places — mirrors how GPS computers display distance and is more credible to riders

2. **Should `cutoffTime` be included in the error payload or computed client-side?**
   - What we know: `GUN_EPOCH_SECONDS + START_WINDOW_SECONDS` = 1780749000 = `"2026-06-06T12:30:00.000Z"`; this is a fixed value
   - What's unclear: Whether it's cleaner to hardcode "8:30 AM ET" in the error message vs. computing it from the server payload
   - Recommendation: Return `cutoffTime` as an ISO string from the server (it's derived from event-config constants), and format it client-side. This keeps the message accurate if START_WINDOW_SECONDS ever changes.

3. **Should submit-result.js gap fix (DAY1_DATE/DAY2_DATE import) be in Plan 01 or a separate plan?**
   - What we know: It's 3 lines of change and was flagged as the only gap in Phase 18 verification
   - What's unclear: Whether the planner prefers one plan for all changes or separates concerns
   - Recommendation: Include in Plan 01 as a preflight cleanup task — it's tiny and completes CONFIG-01 before VAL gates are added

## Sources

### Primary (HIGH confidence — direct code inspection)

- `/Users/Sheppardjm/Repos/ironPineOmnium/netlify/functions/strava-fetch-activity.js` — exact insertion point, `multiValueHeaders` spread pattern, `localDateStr` variable already defined, `distanceMeters`/`startDate` already extracted
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/lib/event-config.ts` — all 7 constants verified present; import names confirmed
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/pages/submit.astro` — existing `errorMessages` record, `wrong_date` special-case pattern to replicate
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/pages/submit-confirm.astro` — transport chain confirmed complete; no changes needed in Phase 19
- `/Users/Sheppardjm/Repos/ironPineOmnium/netlify/functions/submit-result.js` — gap confirmed: lines 90-92 hardcode date strings; Phase 18 VERIFICATION.md details the fix needed

### Primary (HIGH confidence — Phase 18 docs)

- `.planning/phases/18-configuration-foundation/18-VERIFICATION.md` — gap report: submit-result.js CONFIG-01 partial; confirms what this phase must clean up
- `.planning/phases/18-configuration-foundation/18-01-SUMMARY.md` — confirms Phase 18 complete with no blockers for Phase 19

### Primary (HIGH confidence — arithmetic)

- Hidden start detection: Strava documents T00:00:01Z as the sentinel for "Hide Start Time" — string sentinel, no parsing needed
- Gun cutoff: `1780747200 + 1800 = 1780749000` = `new Date(1780749000 * 1000).toISOString()` = `"2026-06-06T12:30:00.000Z"` = 8:30 AM EDT
- Distance formatting: `Math.round(distanceMeters / 10) / 100` — gives 2 decimal km precision (e.g., `152480 / 10 = 15248`, `15248 / 100 = 152.48`)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; pure code inspection
- Architecture: HIGH — insertion point, field names, and return shapes all confirmed from live code
- Pitfalls: HIGH — derived from the specific patterns already present in strava-fetch-activity.js
- Error message wording: MEDIUM — functional but planner may refine copy

**Research date:** 2026-04-14
**Valid until:** June 2026 (event-specific constants are stable)
