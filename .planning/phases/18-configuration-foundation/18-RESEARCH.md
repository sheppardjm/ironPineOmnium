# Phase 18: Configuration Foundation - Research

**Researched:** 2026-04-14
**Domain:** TypeScript module creation, Netlify Functions ESM, Strava API field extraction
**Confidence:** HIGH

## Summary

Phase 18 has two discrete deliverables: (1) create `src/lib/event-config.ts` exporting all event constants that Phase 19 validation gates will consume, and (2) extend `netlify/functions/strava-fetch-activity.js` to extract `distance` and `start_date` from the Strava API response and include them in the JSON returned to the client.

The codebase already demonstrates the exact patterns needed. `src/lib/segments.ts` shows the TypeScript module shape and export style to mirror. `strava-fetch-activity.js` already imports a `.ts` file via esbuild bundling (`import { ... } from "../../src/lib/segments.ts"`), meaning the same import pattern works for `event-config.ts` without any bundler changes. The Netlify function already reads `activity.moving_time` and `activity.start_date_local` from the Strava API response object — adding `activity.distance` and `activity.start_date` is a surgical, additive change to the same Step 7 extraction block and the Step 8 return payload.

**Primary recommendation:** Model `event-config.ts` after `segments.ts` (named `as const` exports, no default export). Add `distance` and `start_date` extractions directly below the existing `moving_time` and `start_date_local` reads, then add both to the return object. No new npm packages required.

## Standard Stack

No new libraries. This phase uses only what is already installed and in use.

### Core (already present)
| Component | Version | Purpose | Status |
|-----------|---------|---------|--------|
| TypeScript | ^5.9.3 | Type-safe constant definitions | Already in devDependencies |
| esbuild (via netlify.toml) | bundler | Transpiles `.ts` imports inside `.js` functions | Already configured |
| Astro check (`@astrojs/check`) | ^0.9.8 | TypeScript validation via `astro build` | Already in devDependencies |

### No Alternatives Needed

Zero new npm packages for this phase — confirmed by prior decision and validated by inspection of the work required.

**Installation:** None required.

## Architecture Patterns

### Recommended Project Structure (additions only)

```
src/
└── lib/
    ├── segments.ts       # existing — model for event-config.ts
    ├── scoring.ts        # existing — NOT touched
    ├── types.ts          # existing — NOT touched
    ├── athlete-loader.ts # existing — NOT touched
    └── event-config.ts   # NEW — Phase 18 deliverable
netlify/
└── functions/
    └── strava-fetch-activity.js  # MODIFIED — add distance + start_date extraction
```

### Pattern 1: Named `as const` Exports (mirror segments.ts)

**What:** Export constants with `as const` for TypeScript narrowing. No default export. Use descriptive names that Phase 19 can import directly.

**When to use:** All event constants. Avoids magic numbers scattered across files.

**Example (modeled on segments.ts):**
```typescript
// src/lib/event-config.ts

/** Unix epoch seconds for Day 1 gun start: June 6 2026 08:00:00 EDT = 12:00:00 UTC */
export const GUN_EPOCH_SECONDS = 1780747200 as const;

/** Maximum seconds after gun that a valid start_date may fall (30 minutes) */
export const START_WINDOW_SECONDS = 1800 as const;

/** Minimum distance in meters for a valid Day 1 submission (95% of ~164 km route) */
export const DAY1_MIN_DISTANCE_METERS = 156000 as const;

/** Minimum distance in meters for a valid Day 2 submission (95% of ~161 km route) */
export const DAY2_MIN_DISTANCE_METERS = 153000 as const;

/** Event dates — used by fetch function for date range check */
export const EVENT_DATES = ["2026-06-06", "2026-06-07"] as const;

/** Day 1 date string */
export const DAY1_DATE = "2026-06-06" as const;

/** Day 2 date string */
export const DAY2_DATE = "2026-06-07" as const;
```

**Note on EVENT_DATES:** `strava-fetch-activity.js` currently has `const EVENT_DATES = ["2026-06-06", "2026-06-07"]` hardcoded at the top (line 16). CONFIG-01 says "no magic numbers appear anywhere else in the codebase" — the planner should decide whether Phase 18 also migrates this to import from `event-config.ts`, or defers that to Phase 19. Both options are valid; migrating now is cleaner.

### Pattern 2: Extending the Strava Fetch Function (additive, surgical)

**What:** Extract `activity.distance` (meters, float) and `activity.start_date` (UTC ISO 8601 string) from the Strava API response alongside the existing `activity.moving_time` and `activity.start_date_local` reads.

**When to use:** Step 7 (segment extraction) and Step 8 (return object) of `strava-fetch-activity.js`.

**Strava API field facts (HIGH confidence — from Strava API v3):**
- `activity.distance` — float, in **meters**. Present on all activity types. A 164 km ride returns ~164000.0.
- `activity.start_date` — ISO 8601 UTC string (e.g., `"2026-06-06T12:05:00Z"`). Always UTC, always present.
- `activity.start_date_local` — already used for date validation; has a misleading `Z` suffix but represents local time.
- `activity.moving_time` — already extracted (line 217).

**Example extension of Step 8 return body:**
```javascript
body: JSON.stringify({
  activityId: String(activity.id),
  athleteId: session.athleteId,
  athleteFirstname: session.athleteFirstname || "",
  athleteLastname: session.athleteLastname || "",
  movingTimeSeconds: activity.moving_time,
  startDateLocal: localDateStr,
  // NEW — required by CONFIG-02 for Phase 19 validation gates:
  distanceMeters: activity.distance,
  startDate: activity.start_date,
  sectorEfforts,
  komSegmentIds,
  komEfforts,
}),
```

### Anti-Patterns to Avoid

- **Magic numbers in validation code:** All thresholds, epochs, and windows must come from `event-config.ts` — never written inline in the function or Astro pages.
- **Modifying `scoring.ts`, `types.ts`, `athlete-loader.ts`, `submit-result.js`, leaderboard display, or score preview:** These are explicitly out of scope for v1.2.
- **Default exports in `event-config.ts`:** The existing modules (`segments.ts`, `types.ts`, `scoring.ts`) all use named exports. Use the same style.
- **Importing with `.js` extension from the TypeScript module:** The existing pattern is `from "../../src/lib/segments.ts"` (explicit `.ts`) — use the same.

## Don't Hand-Roll

This phase has no complex algorithmic problems. All computation is trivial arithmetic already verified above.

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| UTC epoch for gun time | Custom date math in multiple places | Single `GUN_EPOCH_SECONDS` constant | Already computed: 1780747200 |
| Timezone handling | Runtime TZ library | Precomputed epoch constant | Gun time is fixed; no dynamic TZ needed |

**Key insight:** This phase is infrastructure, not computation. The value is centralization, not novelty.

## Common Pitfalls

### Pitfall 1: Gun Epoch Off-By-One (DST confusion)
**What goes wrong:** Forgetting EDT = UTC-4 (not UTC-5 which is EST winter time). June 6 is in daylight saving time in the US.
**Why it happens:** EST vs EDT confusion is common. "Eastern Time" in summer is UTC-4.
**How to avoid:** 8:00 AM EDT = 12:00:00 UTC = Unix epoch 1780747200. Verified independently in two ways: `new Date('2026-06-06T12:00:00Z').getTime() / 1000 === 1780747200`.
**Warning signs:** If your epoch resolves to 8:00 AM UTC (which would be 4:00 AM EDT), you used UTC-5 instead of UTC-4.

### Pitfall 2: Strava `distance` Units
**What goes wrong:** Treating `activity.distance` as kilometers when Strava returns meters.
**Why it happens:** Human intuition says "distance = km" but Strava's API v3 consistently uses meters.
**How to avoid:** Constant is named `DAY1_MIN_DISTANCE_METERS` and `DAY2_MIN_DISTANCE_METERS` to make units explicit in the name. Strava's `distance` field is ~156000 for a 156 km ride.
**Warning signs:** Threshold comparison passes for 0.156 km rides (threshold would be 156 instead of 156000).

### Pitfall 3: TypeScript Build Break from New Module
**What goes wrong:** `astro build` fails with TS errors if `event-config.ts` has type issues or if it re-exports things that conflict.
**Why it happens:** `tsconfig.json` uses `strict: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`. The `as const` pattern is fully compatible with all of these, but any `type` import/export needs `import type` or `export type` syntax.
**How to avoid:** Pure constant exports with no type imports needed in `event-config.ts`. The module only exports primitive `as const` values.
**Warning signs:** TypeScript errors about "cannot use import with isolatedModules" — not applicable here since we're only exporting value constants.

### Pitfall 4: Forgetting to Add Fields to `submit-confirm.astro` Payload Type
**What goes wrong:** `distanceMeters` and `startDate` are added to the fetch response but the `Payload` type in `submit-confirm.astro` client script doesn't include them — TypeScript errors or runtime undefined values.
**Why it happens:** The `Payload` type definition (lines 104-114 of `submit-confirm.astro`) manually lists all expected fields. New fields from the fetch function must be added here.
**How to avoid:** Add optional fields `distanceMeters?: number` and `startDate?: string` to the `Payload` type even if Phase 18 doesn't use them for display — they need to pass through the URL payload for Phase 19 validation. The `populateHiddenFields` function and hidden form inputs also need extending.
**Warning signs:** Phase 19 cannot read `distanceMeters` from the confirmed payload because it was never included in the base64url-encoded query param.

### Pitfall 5: Hidden-Field Transport for Validation Fields
**What goes wrong:** `distanceMeters` and `startDate` are returned by the fetch function but get lost before Phase 19 can validate them in `submit-result.js`.
**Why it happens:** The data flow is: fetch → base64url encode → URL param → `submit-confirm.astro` decode → hidden `<input>` fields → `submit-result.js` POST. Every link in this chain must carry the new fields.
**How to avoid:** Phase 18's scope for `submit-confirm.astro` is limited — the context says "MODIFIED submit.astro" not submit-confirm — but the planner should clarify. The fetch function adding fields is CONFIG-02; whether `submit-confirm.astro` needs modification for transport is a Phase 19 concern, but it may be cleaner to add the hidden fields in Phase 18 alongside the fetch changes.

## Code Examples

### event-config.ts: Complete Module

```typescript
// src/lib/event-config.ts
// Shared constants for Iron & Pine Omnium v1.2 validation gates.
// No magic numbers should appear in validation code outside this module.

/**
 * Unix epoch seconds for the Day 1 gun start.
 * June 6, 2026 08:00:00 EDT = June 6, 2026 12:00:00 UTC
 * EDT = UTC-4 (Eastern Daylight Time, active during June in US)
 */
export const GUN_EPOCH_SECONDS = 1780747200 as const;

/**
 * Maximum seconds after gun time that a valid Day 1 start_date may fall.
 * 30 minutes = 1800 seconds.
 */
export const START_WINDOW_SECONDS = 1800 as const;

/**
 * Minimum distance in meters for a valid Day 1 (Hiawatha's Revenge fondo) submission.
 * 95% of ~164 km route = 155.8 km → 156 km = 156,000 meters.
 */
export const DAY1_MIN_DISTANCE_METERS = 156000 as const;

/**
 * Minimum distance in meters for a valid Day 2 (MK Ultra Gravel) submission.
 * 95% of ~161 km route = 152.95 km → 153 km = 153,000 meters.
 */
export const DAY2_MIN_DISTANCE_METERS = 153000 as const;

/** ISO date strings for the two event days (local date format from Strava) */
export const DAY1_DATE = "2026-06-06" as const;
export const DAY2_DATE = "2026-06-07" as const;

/** Both event dates — used for date-range validation */
export const EVENT_DATES = [DAY1_DATE, DAY2_DATE] as const;
```

### strava-fetch-activity.js: Fields to Add

In Step 7 (after the segment extraction loop), add two reads:
```javascript
// CONFIG-02: Extract fields required for Phase 19 validation gates
const distanceMeters = activity.distance;     // float, meters (Strava API v3)
const startDate = activity.start_date;        // ISO 8601 UTC, e.g. "2026-06-06T12:05:00Z"
```

In Step 8 (return body JSON), add both new fields:
```javascript
body: JSON.stringify({
  // ... existing fields ...
  distanceMeters,   // float meters — for VAL-01/VAL-02 distance gates
  startDate,        // UTC ISO string — for VAL-03/VAL-04 start-time gates
}),
```

### Import Pattern (follows existing precedent)

In `strava-fetch-activity.js`, importing from event-config.ts uses the same pattern already used for segments:
```javascript
import { GUN_EPOCH_SECONDS, START_WINDOW_SECONDS, DAY1_MIN_DISTANCE_METERS, DAY2_MIN_DISTANCE_METERS, EVENT_DATES } from "../../src/lib/event-config.ts";
```

Note: Phase 18 does not require importing event-config.ts into the fetch function — the constants are consumed in Phase 19 validation. If the planner also migrates `EVENT_DATES` from the inline constant to the shared module in Phase 18, then the import is needed.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Hardcoded date strings in each file | Shared `event-config.ts` module | Single source of truth; changes ripple automatically |
| `distance` not extracted by fetch | Extracted and passed through payload | Phase 19 can validate without re-fetching |

## Open Questions

1. **Should Phase 18 also migrate the hardcoded `EVENT_DATES` in `strava-fetch-activity.js` (line 16)?**
   - What we know: The constant exists inline; CONFIG-01 says "no magic numbers anywhere else"
   - What's unclear: Whether "anywhere else" means only in new validation code, or a full audit+migration
   - Recommendation: Migrate it in Phase 18 to avoid a later cleanup task; costs ~2 lines

2. **Should Phase 18 add `distanceMeters` and `startDate` hidden fields to `submit-confirm.astro`?**
   - What we know: The context says "submit.astro" is modified, not submit-confirm; but the data must flow through submit-confirm to reach submit-result
   - What's unclear: Whether Phase 19 is expected to add those hidden fields, or Phase 18 should do it for completeness
   - Recommendation: Add the hidden fields in Phase 18 as part of the transport chain; otherwise Phase 19 has a dependency on an incomplete transport layer

3. **Gun epoch independence verification:**
   - What we know: Calculated as 1780747200 from two methods
   - What's unclear: Whether the event organizer may adjust gun time
   - Recommendation: Add a clear comment in `event-config.ts` showing the derivation so any future change is obvious

## Sources

### Primary (HIGH confidence — code inspection)
- `/Users/Sheppardjm/Repos/ironPineOmnium/netlify/functions/strava-fetch-activity.js` — existing field extraction patterns, import conventions, return object shape
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/lib/segments.ts` — export style to replicate
- `/Users/Sheppardjm/Repos/ironPineOmnium/netlify.toml` — confirms `node_bundler = "esbuild"` which enables `.ts` imports from `.js` functions
- `/Users/Sheppardjm/Repos/ironPineOmnium/tsconfig.json` — confirms `strict: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/pages/submit-confirm.astro` — confirms `Payload` type and hidden field transport chain

### Primary (HIGH confidence — arithmetic)
- Gun epoch: `new Date('2026-06-06T12:00:00Z').getTime() / 1000 === 1780747200` — independently computed and verified
- Day 1 min distance: `164 km × 0.95 = 155.8 km → 156,000 m`
- Day 2 min distance: `161 km × 0.95 = 152.95 km → 153,000 m`
- Start window: `30 × 60 = 1800 seconds`

### Secondary (MEDIUM confidence — Strava API)
- `activity.distance` is in meters (float) — consistent with Strava API v3 documentation; field name and units are stable and well-established
- `activity.start_date` is UTC ISO 8601 — documented behavior; distinct from `start_date_local`

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — pure code inspection of existing working patterns
- Architecture: HIGH — mirroring established patterns in the same codebase
- Pitfalls: HIGH for units/epoch, MEDIUM for transport chain (depends on Phase 19 scope interpretation)

**Research date:** 2026-04-14
**Valid until:** Event date (June 2026) — constants are event-specific and stable until the event
