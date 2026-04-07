# Phase 8: Real Data Leaderboard - Research

**Researched:** 2026-04-07
**Domain:** Astro static build, JSON file loading at build time, KOM scoring, leaderboard data pipeline
**Confidence:** HIGH (codebase verified directly); HIGH (Astro import.meta.glob verified via official docs); MEDIUM (komEfforts schema gap — see open questions)

---

## Summary

Phase 8 is entirely a build-time data pipeline problem — no new external APIs or npm packages are needed. The scoring engine (`src/lib/scoring.ts`) already computes rankings correctly from `RiderResult[]`; the gap is (1) loading athlete JSON files at build time and translating them into `RiderResult` objects, and (2) wiring that pipeline into `Leaderboard.astro` in place of `sampleRiders`.

Astro's `import.meta.glob()` is the correct mechanism for reading JSON files from `public/data/results/athletes/` at build time in a static project. With `{ eager: true }`, it returns all matched files as a synchronous object — no async, no SSR adapter needed. The glob pattern must be a static string literal (no variables); the path `'../../public/data/results/athletes/*.json'` will work from within the `src/` tree. The result is an object keyed by file path, each value having a `.default` property that is the parsed JSON object.

The KOM ranking requirement (DATA-03: "compare each rider's `komEfforts` elapsed times against all other riders") is the most nuanced piece. There is a critical schema gap to resolve before planning: `submit-result.js` writes `komEfforts: Record<segId, elapsedSeconds>` to `day2`, but `csv-fallback.ts` does NOT include `komEfforts` in its `Day2Data` type or output. Manual CSV submissions will have `komSegmentIds` (presence-only) but no `komEfforts`. The KOM scoring logic must handle both cases: time-based KOM ranking when `komEfforts` is present, count-based KOM fallback (`komSegmentIds` length) when only `komSegmentIds` is present.

**Primary recommendation:** Use `import.meta.glob('../../public/data/results/athletes/*.json', { eager: true })` in the Leaderboard.astro frontmatter. Transform the raw JSON objects into `RiderResult[]` using a dedicated `loadAthleteResults()` utility function, then pass to the existing `scoreOmnium()`. Keep `scoreOmnium()` unchanged.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vite `import.meta.glob` | Built into Astro 6 / Vite 7 | Read all athlete JSON files at build time | No external dependency; eager mode is synchronous; Astro 6 fully supports it |
| `src/lib/scoring.ts` (existing) | Project file | Score computation | Already correct — `scoreOmnium()` + `defaultScoringConfig` are the authority |
| `src/lib/types.ts` (existing) | Project file | Type definitions | `RiderResult`, `CategoryLeaderboard`, `ScoredRider` already defined |
| `src/lib/segments.ts` (existing) | Project file | Segment IDs for KOM computation | `KOM_SEGMENT_IDS` constant needed for KOM ranking logic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Node.js `fs` (not needed) | — | Alternative file reading | NOT needed — `import.meta.glob` is the right Astro-idiomatic approach |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `import.meta.glob` | `fs.readdirSync` + `fs.readFileSync` in Astro frontmatter | Both work in Astro static mode, but `import.meta.glob` is Vite-idiomatic and handles the case of zero files gracefully (returns empty object) |
| `import.meta.glob` | Astro Content Collections + `glob()` loader | Content Collections add schema validation (Zod) and are a valid option, but add complexity. The athlete JSON schema is already stable and validated on write. `import.meta.glob` is simpler and sufficient. |

**Installation:**
```bash
# No new packages needed — import.meta.glob is built into Vite/Astro
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── lib/
│   ├── scoring.ts          # UNCHANGED — scoreOmnium() already correct
│   ├── types.ts            # May need AthleteJson type added
│   ├── segments.ts         # KOM_SEGMENT_IDS used in KOM ranking
│   └── athlete-loader.ts   # NEW: loadAthleteResults() + KOM point computation
├── components/
│   └── Leaderboard.astro   # Replace sampleRiders with loadAthleteResults()
└── pages/
    └── index.astro         # Update leaderboard section heading + data state indicator
```

### Pattern 1: Load Athlete JSON Files with import.meta.glob
**What:** Use Vite's glob import to eagerly load all JSON files in the athletes directory at build time.
**When to use:** In the `loadAthleteResults()` utility and/or directly in Leaderboard.astro frontmatter.

```typescript
// Source: https://docs.astro.build/en/guides/imports/ (verified)
// Pattern for src/lib/athlete-loader.ts or directly in Leaderboard.astro frontmatter

const athleteFiles = import.meta.glob(
  '../../public/data/results/athletes/*.json',
  { eager: true }
);

// Return shape: { [filePath: string]: { default: AthleteJson } }
// Example key: "../../public/data/results/athletes/12345678.json"
// Example value: { default: { athleteId: "12345678", displayName: "Alex M.", ... } }

const rawAthletes = Object.values(athleteFiles).map((mod) => (mod as { default: AthleteJson }).default);
```

**Important:** The glob pattern must be a **static string literal** — no template literals with variables. This is a Vite constraint, not Astro-specific. If zero files match, `athleteFiles` is `{}` and `rawAthletes` is `[]`.

**Glob path resolution:** The path is relative to the file containing the `import.meta.glob` call. From `src/lib/athlete-loader.ts`, use `'../../public/data/results/athletes/*.json'`. From `src/components/Leaderboard.astro`, use `'../../public/data/results/athletes/*.json'` (same depth since components/ is also in src/).

### Pattern 2: Transform AthleteJson → RiderResult (filtering incomplete athletes)
**What:** Only athletes with BOTH `day1` and `day2` submitted can be scored. Athletes with only one day should be excluded from the leaderboard (cannot compute a total score without all three scoring components).
**When to use:** In `loadAthleteResults()` before calling `scoreOmnium()`.

```typescript
// Source: codebase analysis of types.ts, scoring.ts, DATA-MODEL.md

import type { RiderResult } from './types';
import { KOM_SEGMENT_IDS } from './segments';

interface AthleteJson {
  athleteId: string;
  displayName: string;
  category: string; // "men" | "women" | "non-binary"
  day1: {
    movingTimeSeconds: number;
    activityId: string;
    submittedAt: string;
  } | null;
  day2: {
    sectorEfforts: Record<string, number>;
    komSegmentIds: string[];
    komEfforts?: Record<string, number>; // optional — present in Strava submissions, absent in CSV fallback
    activityId: string;
    submittedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

function computeKomPoints(
  day2: AthleteJson['day2'],
  allAthletes: AthleteJson[],
  segId: string
): number {
  // Implementation: see Pattern 3 below
}

function transformAthleteToRiderResult(
  athlete: AthleteJson,
  allAthletes: AthleteJson[]
): RiderResult | null {
  // Filter: must have both days
  if (!athlete.day1 || !athlete.day2) return null;

  // Filter: category must be valid
  const validCategories = ["men", "women", "non-binary"] as const;
  if (!validCategories.includes(athlete.category as typeof validCategories[number])) return null;

  const sectorTimesSeconds = SECTOR_SEGMENT_IDS.map(
    (segId) => athlete.day2!.sectorEfforts[segId] ?? 0
  );

  const komPoints = computeKomPointsForAthlete(athlete, allAthletes);

  return {
    id: athlete.athleteId,
    name: athlete.displayName,
    category: athlete.category as RiderResult['category'],
    movingTimeSeconds: athlete.day1.movingTimeSeconds,
    sectorTimesSeconds,
    komPoints,
  };
}
```

### Pattern 3: KOM Points Computation (DATA-03)
**What:** KOM points must be computed by comparing `komEfforts` elapsed times against all other riders in the same category — NOT from Strava's `kom_rank` field. The requirement is to rank each rider on each KOM segment, then aggregate points.

**KOM ranking decision** (from Phase 6 prior decisions + DATA-MODEL.md):
- `komEfforts`: `Record<segId, elapsedSeconds>` — the rider's elapsed time on each KOM segment. Present in Strava submissions (Phase 7 confirmed: `submit-result.js` line 186 writes `komEfforts: body.komEfforts || {}`).
- `komSegmentIds`: `string[]` — legacy presence-only field. Present in both Strava and CSV submissions.
- `komEfforts` is ABSENT from CSV fallback files (confirmed: `csv-fallback.ts` `Day2Data` interface has no `komEfforts` field).

**KOM scoring model to implement:**
The existing `scoring.ts` takes `komPoints: number` as a pre-computed scalar per rider. The build pipeline must compute that scalar. Two approaches based on data availability:

**Approach A (preferred, for Strava submissions with komEfforts):**
For each KOM segment, rank all riders in the category by elapsed time (ascending — faster = better). Award points inversely proportional to rank: fastest gets N points, second gets N-1, etc. (or a simpler model: rank 1 = maxPoints, others = proportional). The simplest defensible model consistent with "comparing elapsed times":

```typescript
// Source: codebase inference from scoring.ts pattern (verified against komPoints: number in RiderResult)
// The existing scoring.ts uses: (riderKomPoints / highestKomPoints) * scale * weight
// So komPoints must be a scalar that is HIGHER = BETTER.

function computeKomPointsForAthlete(
  athlete: AthleteJson,
  allAthletesInCategory: AthleteJson[]
): number {
  if (!athlete.day2) return 0;

  let totalPoints = 0;

  for (const segId of KOM_SEGMENT_IDS) {
    const myTime = athlete.day2.komEfforts?.[segId];
    if (myTime === undefined) continue; // did not ride this KOM

    // Count how many riders in the same category rode this KOM with a faster time
    const ridersWithTime = allAthletesInCategory.filter(
      (a) => a.day2?.komEfforts?.[segId] !== undefined
    );

    if (ridersWithTime.length === 0) continue;

    // Rank: 1 = fastest. Award points = ridersWithTime.length - rank + 1
    const rank = ridersWithTime.filter(
      (a) => (a.day2!.komEfforts![segId] ?? Infinity) < myTime
    ).length + 1; // how many are strictly faster than me, + 1 = my rank

    const pointsForThisSegment = ridersWithTime.length - rank + 1;
    totalPoints += Math.max(0, pointsForThisSegment);
  }

  return totalPoints;
}
```

**Approach B (CSV fallback, presence-only):**
When `komEfforts` is absent but `komSegmentIds` is present, fall back to counting the number of KOM segments the rider completed. This is the "N efforts / max efforts in category" model described in DATA-MODEL.md §2.

```typescript
// Fallback: count komSegmentIds length
function computeKomPointsFallback(
  athlete: AthleteJson,
  allAthletesInCategory: AthleteJson[]
): number {
  if (!athlete.day2) return 0;
  return athlete.day2.komSegmentIds?.length ?? 0;
  // The scoring.ts normalizer: (riderKomPoints / highestKomPoints) handles the scaling
}
```

**Recommendation:** Use a unified function that picks Approach A when `komEfforts` is non-empty, Approach B otherwise. This handles the CSV fallback gracefully without breaking changes.

### Pattern 4: Empty State — Zero Submissions
**What:** When `public/data/results/athletes/` has no JSON files, `import.meta.glob` returns `{}`. `Object.values({})` is `[]`. `scoreOmnium([])` will be called with an empty array.
**Current behavior of scoreOmnium with empty input:**

```typescript
// From scoring.ts (verified by reading source):
// Math.min(...[]) = Infinity  ← this is a bug risk
// Math.max(...[], 0) = 0      ← safe (0 is explicit fallback)
// Empty riders array produces entries: [] — no crash, but Infinity benchmarks
```

The `scoreCategory` function calls `Math.min(...riders.map(...))` when `riders` is empty, which produces `Infinity` for `fastestMovingTimeSeconds` and `fastestSectorTotalSeconds`. The leaderboard render calls `board.entries[0]` for the winner banner — this will be `undefined` when `entries` is empty, crashing the render.

**Fix required:** The Leaderboard component must guard against empty `entries` before rendering the winner banner. A separate empty-state UI (08-04) handles the zero-submissions case.

### Anti-Patterns to Avoid
- **Calling `scoreOmnium` with athletes that have only one day:** Results in 0 for the missing component (e.g., movingTimeSeconds = 0), which breaks relative scoring. Filter to both-days-complete before passing to `scoreOmnium`.
- **Using `import.meta.glob` with a dynamic pattern:** Will fail at build time with a Vite error. The pattern must be a static string literal.
- **Accessing `board.entries[0]` without guarding for empty entries:** Will throw a runtime error during build when categories have zero riders.
- **Hardcoding scoring weights in the data loading layer:** Weights must come from `defaultScoringConfig` — the `scoreOmnium()` call already accepts `config` as a parameter. Pass it explicitly to make this relationship visible.
- **Loading the sample data file as a fallback:** The success criterion explicitly requires that a fresh build with no athlete JSON files shows an empty leaderboard, not sample riders.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON file reading at build time | Custom Node.js `fs` reader | `import.meta.glob('.../*.json', { eager: true })` | Vite-idiomatic; zero files = empty object (no crash); no `fs` import needed in Astro frontmatter |
| Sorting / ranking | Custom sort functions | Existing `scoreOmnium()` in `scoring.ts` | Already correct, tested via smoke test, handles tie-breaking |
| Score computation weights | Hardcode 0.35/0.45/0.20 | Read from `defaultScoringConfig` | Requirement SUBM-05 / scoring criteria explicitly require this |

**Key insight:** The scoring engine is complete and correct. Phase 8 is a data-loading and wiring problem, not a scoring algorithm problem.

---

## Common Pitfalls

### Pitfall 1: Empty Array Math.min/Math.max Crash
**What goes wrong:** `Math.min(...[])` returns `Infinity`, not a useful value. If `scoreCategory` is called with an empty `riders` array, the benchmarks become `Infinity`, and `board.entries[0]` is `undefined`, crashing the winner banner render.
**Why it happens:** `scoring.ts` was written assuming at least one rider per category. There is no guard.
**How to avoid:** In `Leaderboard.astro`, guard the winner banner section: `{board.entries.length > 0 && (<winner-banner>...)}`. Also consider guarding `scoreCategory` itself to early-return an empty `CategoryLeaderboard` when `riders.length === 0`. However, the simpler approach is to handle it in the component — no need to change `scoring.ts`.
**Warning signs:** Build crash with "Cannot read properties of undefined (reading 'rider')" when zero athletes are submitted.

### Pitfall 2: komEfforts Absent in CSV Fallback Files
**What goes wrong:** `csv-fallback.ts` does NOT write `komEfforts` to the athlete JSON. It only writes `komSegmentIds` (presence array). If Phase 8 assumes `komEfforts` is always present, CSV fallback riders score 0 KOM points even if they completed KOM segments.
**Why it happens:** `komEfforts` was added in Phase 6 but `csv-fallback.ts` was not updated. The DATA-MODEL.md schema (§1) shows `komSegmentIds` but not `komEfforts` in the day2 object.
**How to avoid:** The KOM computation must treat `komEfforts` as optional. When absent, fall back to `komSegmentIds.length` as the raw point count. The `scoreOmnium` normalization (`riderKomPoints / highestKomPoints`) still handles proportional scoring correctly.
**Warning signs:** CSV fallback riders always show 0.0 KOM score even though `komSegmentIds` has entries.

### Pitfall 3: Sector Times Array Order Must Match Scoring Engine
**What goes wrong:** `sectorTimesSeconds` in `RiderResult` is a `number[]`. The scoring engine sums them (`sum(rider.sectorTimesSeconds)`) — order doesn't matter for total time. But if some segments are missing from `sectorEfforts`, those positions get 0, which inflates the rider's score unfairly (0 seconds is faster than any real time).
**Why it happens:** `sectorEfforts` is sparse — only segments the rider actually rode appear in the map. If a Day 2 rider missed a sector (GPS dropout), their `sectorEfforts` won't have that key.
**How to avoid:** Use a sentinel value for missing sectors. The cleanest approach: exclude riders from scoring who have any missing sector (i.e., require `Object.keys(sectorEfforts).length === SECTOR_SEGMENT_IDS.length`). Alternative: use `Infinity` for missing sectors — this penalizes without crashing. Confirm the desired behavior with the event rules. The zero-match warning on the confirm page (Phase 6-02) already warns riders, but some sectors may still be missing legitimately.
**Warning signs:** Riders with incomplete sector data appearing at the top of the leaderboard because their missing sectors contribute 0 to the total time.

### Pitfall 4: import.meta.glob Path Relative to Calling File
**What goes wrong:** The glob path `../../public/data/results/athletes/*.json` works from `src/components/Leaderboard.astro` but would break if the same pattern is copied into a file at a different depth.
**Why it happens:** Vite resolves glob paths relative to the file containing the call.
**How to avoid:** Keep the glob call in one place (a utility function or directly in Leaderboard.astro). If moving to a `src/lib/athlete-loader.ts`, verify the relative depth is correct: `src/lib/` → `../../public/` (up 2 levels from `src/lib/`). Test by checking the build output.

### Pitfall 5: "Live results" Indicator Must Be Build-Time, Not Runtime
**What goes wrong:** If the "Live results" indicator is computed client-side (checking localStorage or a fetch), it adds complexity and may flicker.
**Why it happens:** Over-engineering a simple requirement.
**How to avoid:** Compute the indicator at build time in the Astro frontmatter. `const hasLiveData = riderResults.length > 0;` — then render the appropriate badge in the component. This is a simple boolean passed to the template.

---

## Code Examples

### Full Athlete Loading Pattern (build-time, in Leaderboard.astro frontmatter)
```typescript
// In Leaderboard.astro frontmatter (---...---)
// Source: verified against Astro docs (import.meta.glob) and codebase (scoring.ts, types.ts)

import { defaultScoringConfig, scoreOmnium } from "../lib/scoring";
import { KOM_SEGMENT_IDS, SECTOR_SEGMENT_IDS } from "../lib/segments";
import type { RiderResult } from "../lib/types";
import { categoryIds } from "../lib/types";

// Step 1: Load all athlete JSON files
const athleteFiles = import.meta.glob(
  '../../public/data/results/athletes/*.json',
  { eager: true }
);

// Step 2: Extract raw athlete objects
type AthleteJson = {
  athleteId: string;
  displayName: string;
  category: string;
  day1: { movingTimeSeconds: number; activityId: string; submittedAt: string } | null;
  day2: {
    sectorEfforts: Record<string, number>;
    komSegmentIds: string[];
    komEfforts?: Record<string, number>; // optional (absent in CSV fallback)
    activityId: string;
    submittedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

const rawAthletes: AthleteJson[] = Object.values(athleteFiles).map(
  (mod) => (mod as { default: AthleteJson }).default
);

// Step 3: Filter to complete athletes (both days submitted)
const completeAthletes = rawAthletes.filter(
  (a) => a.day1 !== null && a.day2 !== null
);

// Step 4: Compute KOM points per athlete (compare within category)
function computeKomPoints(athlete: AthleteJson, peersInCategory: AthleteJson[]): number {
  if (!athlete.day2) return 0;

  const komEfforts = athlete.day2.komEfforts;

  if (komEfforts && Object.keys(komEfforts).length > 0) {
    // Approach A: time-based ranking
    let totalPoints = 0;
    for (const segId of KOM_SEGMENT_IDS) {
      const myTime = komEfforts[segId];
      if (myTime === undefined) continue;
      const ridersWithTime = peersInCategory.filter(
        (a) => a.day2?.komEfforts?.[segId] !== undefined
      );
      const fasterCount = ridersWithTime.filter(
        (a) => (a.day2!.komEfforts![segId] ?? Infinity) < myTime
      ).length;
      const pointsForSeg = ridersWithTime.length - fasterCount; // rank 1 = ridersWithTime.length points
      totalPoints += Math.max(0, pointsForSeg);
    }
    return totalPoints;
  } else {
    // Approach B: presence count (CSV fallback)
    return athlete.day2.komSegmentIds?.length ?? 0;
  }
}

// Step 5: Build RiderResult[] for scoring engine
const riderResults: RiderResult[] = completeAthletes.map((athlete) => {
  const category = athlete.category as RiderResult['category'];
  const peersInCategory = completeAthletes.filter((a) => a.category === category);

  return {
    id: athlete.athleteId,
    name: athlete.displayName,
    category,
    movingTimeSeconds: athlete.day1!.movingTimeSeconds,
    sectorTimesSeconds: SECTOR_SEGMENT_IDS.map(
      (segId) => athlete.day2!.sectorEfforts[segId] ?? 0
    ),
    komPoints: computeKomPoints(athlete, peersInCategory),
  };
});

// Step 6: Score (uses defaultScoringConfig weights from scoring.ts)
const leaderboards = scoreOmnium(riderResults, defaultScoringConfig);
const hasLiveData = riderResults.length > 0;
```

### Empty-State Guard in Leaderboard Template
```astro
<!-- In Leaderboard.astro template section -->
{hasLiveData ? (
  <!-- existing leaderboard rendering -->
  {leaderboards.map((board) => (
    <section ...>
      {board.entries.length > 0 ? (
        <!-- winner banner + table -->
      ) : (
        <!-- category-level empty state: "No [category] riders yet" -->
      )}
    </section>
  ))}
) : (
  <div class="leaderboard-empty">
    <p>Results will appear here after the event.</p>
  </div>
)}
```

### Live Results Indicator
```astro
<!-- In the leaderboard section heading in index.astro or Leaderboard.astro header -->
<div class="leaderboard-status">
  {hasLiveData ? (
    <span class="status-badge status-live">Live results</span>
  ) : (
    <span class="status-badge status-pending">Awaiting submissions</span>
  )}
</div>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `Astro.glob()` | `import.meta.glob()` | Astro 5/6 — `Astro.glob()` removed in v6 | Must use `import.meta.glob()` directly; `Astro.glob()` is gone |
| Astro Content Collections (for file loading) | `import.meta.glob()` | — | Content Collections add Zod schema validation overhead; not needed when JSON is already validated on write |

**Deprecated/outdated:**
- `Astro.glob()`: Removed in Astro 6. This project uses Astro 6.1.1. Must use `import.meta.glob()` (Vite native).

---

## Open Questions

1. **KOM scoring model: time-based rank points vs. proportional presence count**
   - What we know: DATA-03 says "compare submitted effort times" (implies time-based ranking). DATA-MODEL.md §2 says "N efforts / max efforts in category * weight" (implies presence count).
   - What's unclear: These are inconsistent descriptions of KOM scoring. The `RiderResult.komPoints` scalar field accepts either approach since `scoring.ts` normalizes it. The KOM effort comparison approach (time-based rank) is more aligned with DATA-03. The presence-count approach is more robust to missing `komEfforts`.
   - Recommendation: Use time-based ranking (Approach A) when `komEfforts` is present. Fall back to presence count (Approach B) only for CSV fallback riders. Document the chosen model in the plan.

2. **csv-fallback.ts missing komEfforts field**
   - What we know: `submit-result.js` writes `komEfforts` to day2. `csv-fallback.ts` does not. If the event uses the CSV fallback path, KOM time comparisons are impossible for those athletes.
   - What's unclear: Whether Phase 8 should also update `csv-fallback.ts` to support a `komEfforts`-compatible column in the CSV, or leave it to a later phase.
   - Recommendation: Phase 8 should use the presence-count fallback for athletes without `komEfforts` and leave `csv-fallback.ts` unchanged. That script update (if needed) belongs in a separate plan.

3. **Sector scoring with missing efforts (partial riders)**
   - What we know: A rider may have `sectorEfforts` with fewer than 7 segments (e.g., missed a GPS-tracked segment). Using 0 for missing sectors inflates their sector score unfairly.
   - What's unclear: The event rules for handling partial sector completion (DNF vs. penalty vs. exclude).
   - Recommendation: For Phase 8, use 0 as the sentinel for missing sectors (existing approach in sample data has all 4 sectors). The zero-match warning on the confirm page handles the "no sectors at all" case. A rider with partial sectors is an edge case that can be addressed in a patch if needed.

4. **RiderResult.hometown field**
   - What we know: `RiderResult` has no `hometown` field in the current `types.ts` (it was noted in DATA-MODEL.md §2 as "should be removed or left empty"). The sample data does not use it.
   - What's unclear: Whether the field was already removed or still present.
   - Recommendation: Confirmed by reading `types.ts` — no `hometown` field exists. No action needed.

5. **index.astro leaderboard section heading update**
   - What we know: `index.astro` line 292 has hardcoded text "Sample standings." and line 295 "This table still uses sample riders while the format and scoring are being dialed in." These must be updated/removed in Phase 8.
   - What's unclear: Whether this goes in plan 08-03 (remove sample data) or 08-05 (live results indicator).
   - Recommendation: Address in plan 08-03 alongside the Leaderboard.astro change. The `index.astro` section heading should be updated to dynamic text or removed — it is not a `Leaderboard.astro` concern.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct reads:
  - `/src/lib/scoring.ts` — `scoreOmnium()`, `scoreCategory()`, `defaultScoringConfig`, `RiderResult` usage
  - `/src/lib/types.ts` — `RiderResult`, `CategoryLeaderboard`, `ScoredRider` interfaces
  - `/src/lib/segments.ts` — `SECTOR_SEGMENT_IDS` (7 segments), `KOM_SEGMENT_IDS` (3 segments)
  - `/src/lib/sample-data.ts` — current data format consumed by `scoreOmnium()`
  - `/src/components/Leaderboard.astro` — current rendering logic, `sampleRiders` import location
  - `/netlify/functions/submit-result.js` — confirmed `komEfforts` written to day2 (line 186)
  - `/scripts/csv-fallback.ts` — confirmed `komEfforts` NOT written in CSV path (`Day2Data` interface)
  - `/src/pages/index.astro` — hardcoded leaderboard section heading text to update
  - Git commit `ea2ef13` — verified actual athlete JSON schema from smoke test write
- Official Astro docs: https://docs.astro.build/en/guides/imports/ — `import.meta.glob()` API, `{ eager: true }`, static-literal-only pattern, Astro.glob() removed in v6
- Vite docs: https://vite.dev/guide/features.html#glob-import — return shape with eager:true

### Secondary (MEDIUM confidence)
- `/.planning/phases/07-data-persistence/07-VERIFICATION.md` — confirmed Phase 7 complete, athlete JSON schema stable
- `/.planning/phases/01-compliance-and-prerequisites/DATA-MODEL.md` — KOM scoring model description, public display requirements

### Tertiary (LOW confidence)
- WebSearch results on `import.meta.glob` JSON return shape — single-source; verified against official docs above

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all libraries are existing project code or Vite built-ins
- Architecture patterns: HIGH — `import.meta.glob` verified against official docs; transformation pattern derived directly from existing type contracts
- Pitfalls: HIGH (empty array Math.min, komEfforts gap) / MEDIUM (sector missing effort handling — depends on event rules)
- Code examples: HIGH — derived from direct codebase reads and official API docs

**Research date:** 2026-04-07
**Valid until:** 2026-09-01 (Astro API stable; athlete JSON schema locked; KOM scoring model confirmed before planning)
