# Phase 6: Scoring Extraction - Research

**Researched:** 2026-04-07
**Domain:** Scoring logic, KOM point computation, Netlify Functions v1, GitHub Contents API read
**Confidence:** HIGH

---

## Summary

Phase 6's primary technical challenge is deceptively subtle: most of what the phase description calls "extraction" is **already implemented** in `strava-fetch-activity.js` (Phase 4). The function already extracts `moving_time`, filters `segment_efforts` by `SECTOR_SEGMENT_IDS` and `KOM_SEGMENT_IDS`, deduplicates by fastest effort, and returns `sectorEfforts` (object) and `komSegmentIds` (array) in the response payload. That payload already flows through `submit.astro` → base64url → `submit-confirm.astro` hidden fields.

What Phase 6 **actually needs to implement** is the scoring computation layer that runs in the `submit-result.js` function (being created in Phase 7 but whose scoring logic is Phase 6's scope):
1. Convert `movingTimeSeconds` to a Day 1 score using `defaultScoringConfig.movingTimeWeight` (0.35) — but this is relative scoring that requires the full category field, so the actual formula can only run once all riders are known (at build/leaderboard time, not submission time).
2. Compute KOM points by reading all existing athlete JSON files from GitHub to find per-segment effort times across all Day 2 submissions, then ranking the new rider's KOM segment times against those.
3. Handle the zero-match case (Day 2 activity with no recognized segments).

The phase plan list (06-01 through 06-05) overcomplicates what's needed. Items 06-01 and 06-02 describe things Phase 4 already handles. The real work is items 06-03 (KOM ranking against existing files), 06-04 (payload schema confirmation), and 06-05 (zero-match warning).

**Primary recommendation:** Phase 6 plans should focus on: (a) clarifying that extraction is done, (b) implementing the KOM comparison logic that reads existing athlete JSON files from GitHub, and (c) adding the zero-match warning path. The plans labeled 06-01/06-02 are essentially documentation/verification plans, not new code.

---

## Standard Stack

No new libraries required. Phase 6 uses:

### Core (already in project)
| Component | Location | Purpose |
|-----------|----------|---------|
| `src/lib/scoring.ts` | Existing | `defaultScoringConfig` (35%/45%/20%), `scoreOmnium()` |
| `src/lib/segments.ts` | Existing | `SECTOR_SEGMENT_IDS`, `KOM_SEGMENT_IDS`, `SEGMENT_LABELS` |
| `src/lib/types.ts` | Existing | `RiderResult`, `ScoringConfig`, `ScoredRider` |
| `netlify/functions/strava-fetch-activity.js` | Existing | Already extracts `sectorEfforts`, `komSegmentIds`, `movingTimeSeconds` |
| GitHub Contents API | External | Read existing athlete JSON files via `GET /repos/{owner}/{repo}/contents/{path}` |

### No New Dependencies
The GitHub Contents API is already used by `scripts/csv-fallback.ts` via raw `https` module. The same pattern applies for reading files in Netlify Functions using `fetch()`.

---

## Architecture Patterns

### Recommended File Structure
```
netlify/functions/
└── submit-result.js          ← Phase 7 creates; Phase 6 defines scoring logic within it
src/lib/
├── scoring.ts                ← Already exists — use defaultScoringConfig, no changes needed
├── segments.ts               ← Already exists — SECTOR_SEGMENT_IDS, KOM_SEGMENT_IDS
└── types.ts                  ← Already exists — RiderResult shape
public/data/results/athletes/ ← Phase 7 creates this structure; Phase 6 reads it for KOM
```

### Pattern 1: What Phase 4 Already Provides

`strava-fetch-activity.js` already returns this response on success:
```json
{
  "activityId": "12345678",
  "athleteId": "2262684",
  "athleteFirstname": "John",
  "athleteLastname": "D.",
  "movingTimeSeconds": 16953,
  "startDateLocal": "2026-06-06",
  "sectorEfforts": {
    "41159670": 714,
    "24479292": 853
  },
  "komSegmentIds": ["24479270", "41126651"]
}
```

This means:
- `sectorEfforts` = `Record<segmentId: string, elapsedSeconds: number>` — already fastest-deduped per segment
- `komSegmentIds` = `string[]` — IDs of KOM segments the rider completed (presence, not time)
- `movingTimeSeconds` = raw integer, ready for scoring

**The extraction is complete.** Phase 6 plans 06-01 and 06-02 should document this fact and verify the existing extraction, not implement new code.

### Pattern 2: KOM Point Computation (The Real New Work)

KOM points are computed by comparing effort times, **not** from Strava's `kom_rank` field (which is null for non-subscribers — confirmed prior decision DATA-03).

**The algorithm:**
1. Fetch all existing athlete JSON files from `public/data/results/athletes/` in GitHub.
2. For each KOM segment ID in `KOM_SEGMENT_IDS`:
   - Collect all existing riders' elapsed times for that segment from their `day2.sectorEfforts` records.
   - Count how many existing riders have a faster (lower) elapsed time than the new submission.
   - The new rider's KOM points for this segment = `(rank position / total riders)` style, or a simpler model: count of segments where the new rider beats others.
3. Sum across all KOM segments to get total `komPoints`.

**Important nuance — KOM segments vs sector segments:**
- `SECTOR_SEGMENT_IDS` (7 segments) are the timed sectors scored for the 45% weight.
- `KOM_SEGMENT_IDS` (3 segments) are climb-specific segments scored for the 20% weight.
- The existing `sectorEfforts` map in `strava-fetch-activity.js` captures `SECTOR_SEGMENT_IDS` only — it does NOT capture KOM segment times.
- The `komSegmentIds` array only records presence (which KOM segments the rider completed), not the elapsed times.

**This is a gap:** To compute KOM ranking by comparing effort times, the Phase 6 implementation needs KOM elapsed times from the activity. But the current extraction only stores KOM presence (boolean), not KOM elapsed times.

**Resolution options:**
1. **Extend `sectorEfforts` to also capture KOM segment times** — store them in the same map, keyed by KOM segment ID. This is the cleanest: `sectorEfforts` becomes all scored segment times (sectors + KOM climbs).
2. **Add a separate `komEfforts` map** analogous to `sectorEfforts` but for KOM segments — keeps sector and KOM data separated explicitly.
3. **Use the existing `komSegmentIds` presence model and compute points as count-based** — N KOM segments completed / max segments completed in category. This sidesteps time comparison entirely. This is actually what the current scoring model in `scoring.ts` implements: `komPoints` is a scalar count, and `komScore = (rider.komPoints / highestKomPoints) * scale * weight`.

**Reading the existing scoring engine carefully:**
```typescript
// From src/lib/scoring.ts
const komScore =
  (highestKomPoints === 0 ? 0 : rider.komPoints / highestKomPoints) * config.scoreScale * config.komWeight;
```

`komPoints` on `RiderResult` is a plain number. In the sample data it ranges 18–31. The scoring engine normalizes against the highest in the category. It does NOT do per-segment time comparison.

**So the current model is: `komPoints` = a pre-computed scalar (stored in the athlete JSON), and the leaderboard engine normalizes it.** The question is: what is `komPoints` computed from?

Per the DATA-MODEL: `day2.komSegmentIds` stores which KOM segments the rider completed. The `RiderResult.komPoints` consumed by the scoring engine must be derived from this. The derivation (how many segments × some weight, or ranking against others) is what Phase 6 must define and implement.

**Most defensible interpretation of DATA-03 ("KOM points computed internally by comparing submitted effort times"):** The system needs KOM segment elapsed times (not just presence) to rank riders per segment. This requires extending the extraction to capture KOM elapsed times.

### Pattern 3: Reading GitHub Files from a Netlify Function

```javascript
// Source: scripts/csv-fallback.ts pattern + GitHub Contents API docs
// GET all files in a directory
const res = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/public/data/results/athletes`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'iron-pine-submit-result',
    },
  }
);
const files = await res.json(); // Array of { name, sha, download_url, ... }

// Then fetch each file's content
// Option A: use download_url (raw content, no base64 decoding needed)
// Option B: GET /repos/{owner}/{repo}/contents/{path} returns base64-encoded content
```

The `csv-fallback.ts` script already uses `https.request` for this; a Netlify Function would use `fetch()` instead. The pattern is the same.

**Performance concern:** If there are 100 athletes, reading all 100 files one-by-one is 100 API calls. Alternatives:
- Use `git trees` API to get all files in one call, then fetch individual content — still multiple calls.
- The event has ~50–100 riders, so sequential fetching is acceptable (100 × ~50ms = ~5 seconds max, within Netlify Function timeout).
- Batch with `Promise.all()` to parallelize — but GitHub rate limit is 5000 requests/hour for authenticated, so 100 parallel is fine.

### Pattern 4: Zero-Match Warning Path

Day 2 activity with no recognized sector segments:
- `sectorEfforts` = `{}` (empty object)
- `komSegmentIds` = `[]` (empty array)
- This is valid (rider missed all timed sectors) — must NOT be an error
- Return the full payload with `sectorEfforts: {}`, `komSegmentIds: []`
- The confirm page (`submit-confirm.astro`) already handles this: shows "No timed sectors matched" and "No KOM segments matched" in the preview cards
- The submit-result function must also handle zero `sectorEfforts` gracefully — compute `sectorScore = 0`, `komScore = 0`
- A rider-visible warning should appear on the confirm page when `sectorCount === 0` for a Day 2 activity

The confirm page currently shows a neutral "No timed sectors matched for this activity" message. The Phase 6 requirement says this should be a "rider-visible warning" — meaning more prominent styling (amber/warning color) is appropriate.

### Anti-Patterns to Avoid

- **Don't re-extract from the Strava API in `submit-result.js`** — the payload already contains all extracted data. Re-fetching the activity in the submission function would require storing the session token longer and adds a round-trip. Trust the Phase 4 extraction.
- **Don't use Strava's `kom_rank` field** — it returns null for non-subscribers. Prior decision: DATA-03. Only use `elapsed_time` from the activity's segment efforts.
- **Don't hardcode scoring weights in Phase 6 code** — always import `defaultScoringConfig` from `src/lib/scoring.ts`. The weights (35%/45%/20%) are in that config object.
- **Don't try to compute relative scores in submit-result.js** — the final relative score (`fastestInCategory / myTime`) can only be computed at leaderboard-render time when all riders are known. What `submit-result.js` stores is raw extracted data (`movingTimeSeconds`, `sectorEfforts`, `komSegmentIds`) plus `komPoints` (the one pre-computed aggregate that needs cross-rider comparison).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Scoring weights | Hardcoded constants | `defaultScoringConfig` from `src/lib/scoring.ts` | Config already exists, single source of truth |
| Segment ID lists | Hardcoded arrays | `SECTOR_SEGMENT_IDS`, `KOM_SEGMENT_IDS` from `src/lib/segments.ts` | Already verified against Strava, as-const typed |
| Activity data extraction | New Strava API call | Existing `sectorEfforts`, `komSegmentIds`, `movingTimeSeconds` from payload | Phase 4 already does this correctly |
| Base64url decode | Custom parser | `fromBase64url` pattern established in `submit-confirm.astro` | Exact inverse of `btoa` encoding in `submit.astro` |

---

## Common Pitfalls

### Pitfall 1: Confusing KOM Segments with Sector Segments
**What goes wrong:** Developer assumes `sectorEfforts` contains KOM segment times. It does not — `sectorEfforts` only captures `SECTOR_SEGMENT_IDS` (7 segments), while `KOM_SEGMENT_IDS` (3 segments) are tracked only by presence in `komSegmentIds`.
**Why it happens:** Both are "segments" and the naming is similar.
**How to avoid:** When implementing KOM time comparison, explicitly check whether KOM elapsed times are being captured. If the implementation needs time-based comparison (not presence-based), the extraction must be extended to also capture KOM segment elapsed times in `sectorEfforts` or a new `komEfforts` map.
**Warning signs:** KOM score is always equal for all riders (if treating all as "completed 3 of 3").

### Pitfall 2: Relative Scoring in the Wrong Place
**What goes wrong:** Attempting to compute `fastestInCategory / myTime * 100 * weight` in `submit-result.js`. This score requires knowing ALL riders in the category at computation time — it's undefined at submission time.
**Why it happens:** The scoring formula looks simple; you want to show the rider their score immediately.
**How to avoid:** The confirm page shows a score *preview* that uses approximate benchmarks or just shows raw values. The actual relative score is computed in `scoreOmnium()` at leaderboard build time. Only store raw values in the athlete JSON.
**Warning signs:** Score changes when new riders submit — this is expected for relative scoring; it happens at rebuild, not at submission.

### Pitfall 3: Missing the KOM Data Gap
**What goes wrong:** Implementing KOM point computation based on `komSegmentIds` (presence only), then realizing the time comparison required by DATA-03 is impossible without actual elapsed times.
**Why it happens:** The current data model stores KOM presence (`komSegmentIds: string[]`) not times.
**How to avoid:** Decide explicitly: is KOM scoring time-based (rank by elapsed time on each KOM climb) or count-based (N KOM segments completed)? The existing `RiderResult.komPoints` is a scalar, which fits the count model. DATA-03 says "comparing submitted effort times" which implies the time model. **This tension must be resolved in planning before implementing.**
**Warning signs:** DATA-03 and the existing scoring model contradict each other.

### Pitfall 4: Strava `kom_rank` Field Temptation
**What goes wrong:** Developer reads `kom_rank` from segment effort objects and uses it directly.
**Why it happens:** The field exists and looks useful.
**How to avoid:** Per prior decision (DATA-03), `kom_rank` is null for non-subscribers. Confirmed in prior decisions. Never use it.

### Pitfall 5: GitHub API Read Latency in Netlify Function
**What goes wrong:** Reading 100 athlete files sequentially takes 5+ seconds, approaching Netlify's 10-second function timeout.
**Why it happens:** Each file read is a separate HTTP call.
**How to avoid:** Use `Promise.all()` to parallelize file reads. GitHub's authenticated rate limit (5000 req/hr) easily accommodates 100 parallel reads. Also consider: at the early event stage (pre-event test period), there will be 0–5 files, so this is only a concern later.

---

## Code Examples

### Reading Scoring Weights (Don't Hardcode)
```typescript
// Source: src/lib/scoring.ts (existing)
import { defaultScoringConfig } from "../../src/lib/scoring.ts";

// In submit-result.js:
const movingTimeWeight = defaultScoringConfig.movingTimeWeight; // 0.35
const sectorWeight = defaultScoringConfig.sectorWeight; // 0.45
const komWeight = defaultScoringConfig.komWeight; // 0.20
```

### Reading All Athlete Files from GitHub
```javascript
// Source: pattern from scripts/csv-fallback.ts, adapted for fetch() in Netlify Function
const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const token = process.env.GITHUB_TOKEN;

// Step 1: List directory
const listRes = await fetch(
  `https://api.github.com/repos/${owner}/${repo}/contents/public/data/results/athletes`,
  {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'iron-pine-submit-result',
    },
  }
);
// Returns array of file metadata, or 404 if directory doesn't exist yet
if (listRes.status === 404) {
  return []; // No athletes yet — first submission
}
const fileList = await listRes.json();

// Step 2: Fetch all files in parallel
const athleteFiles = await Promise.all(
  fileList.map(async (file) => {
    const contentRes = await fetch(file.download_url); // raw JSON, no base64
    return contentRes.json(); // AthleteJson shape
  })
);
```

### Zero-Match Warning Path
```javascript
// In submit-result.js after extracting payload:
const sectorEfforts = JSON.parse(body.sectorEfforts || '{}');
const sectorCount = Object.keys(sectorEfforts).length;
const isDay2 = body.startDateLocal === '2026-06-07';

if (isDay2 && sectorCount === 0) {
  // Valid submission — store with zero sector score
  // Return warning flag in response so confirm page can display it
  warningCode = 'no_sector_matches';
}
```

### KOM Points Computation (Count-Based, Aligned with Existing scoring.ts)
```javascript
// komSegmentIds = string[] of KOM segment IDs rider completed
// existingAthletes = AthleteJson[] from GitHub
// Returns komPoints scalar (integer 0-3 for 3 KOM segments)
function computeKomPoints(komSegmentIds) {
  // Simplest model aligned with existing scoring.ts:
  // komPoints = count of KOM segments completed
  return komSegmentIds.length; // 0, 1, 2, or 3
}

// Scoring engine then normalizes: komScore = (rider.komPoints / max) * 100 * 0.20
```

### KOM Points Computation (Time-Based, Satisfies DATA-03 Literally)
```javascript
// Requires komEfforts: Record<segmentId, elapsedSeconds> — NEW field not in current payload
// existingAthletes = AthleteJson[] from GitHub
function computeKomPoints(komEfforts, existingAthletes) {
  let points = 0;
  for (const segId of KOM_SEGMENT_IDS) {
    const myTime = komEfforts[segId];
    if (!myTime) continue; // Rider didn't complete this segment
    // Count riders with a faster time on this segment
    const faster = existingAthletes.filter(a => {
      const theirTime = a.day2?.sectorEfforts?.[segId]; // only if stored there
      return theirTime !== undefined && theirTime < myTime;
    }).length;
    const total = existingAthletes.filter(a => a.day2?.sectorEfforts?.[segId] !== undefined).length + 1;
    // Points awarded if rider is in top 50% for this segment, or some other formula
    // This requires a definition of what "KOM points" means numerically
    points += 1; // placeholder: needs product decision
  }
  return points;
}
```

---

## State of the Art

| Old Assumption | Current Reality | Impact on Planning |
|---|---|---|
| "Phase 6 implements extraction" | Extraction already done in Phase 4 (`strava-fetch-activity.js`) | Plans 06-01/06-02 are documentation, not new code |
| "KOM segment times are captured" | Only KOM presence is captured — elapsed times not stored | If time-based KOM ranking is needed, extraction must be extended |
| "KOM scoring model is defined" | Scoring engine uses scalar `komPoints`; DATA-03 says "comparing effort times" — these are in tension | Needs explicit product decision before implementing |
| "public/data/results/athletes/ exists" | Directory does not exist yet (created by Phase 7) | Phase 6 KOM logic must handle 404 (empty directory) gracefully |

---

## Open Questions

1. **KOM Scoring Model: Count-Based vs. Time-Based?**
   - What we know: `scoring.ts` uses `rider.komPoints` as a scalar; `komSegmentIds` stores presence only; DATA-03 says "comparing submitted effort times"
   - What's unclear: Does "comparing effort times" mean ranking by time on each KOM climb, or does it mean "confirming the rider completed it using elapsed_time > 0 rather than Strava's null kom_rank"?
   - Recommendation: **Resolve in planning before writing any code.** If count-based (N segments completed), no schema change needed. If time-based, `strava-fetch-activity.js` must be updated to capture KOM elapsed times, and `DATA-MODEL.md` must be updated to store them.

2. **When Is the Score Preview "Correct"?**
   - What we know: The confirm page shows a score preview using `sectorEfforts` count and `komSegmentIds` count — not final computed scores
   - What's unclear: Phase 6 plan 06-04 says "wire extraction output into the base64url callback payload schema" — the payload schema is already defined and working
   - Recommendation: Phase 06-04 is likely already done. Verify the payload schema matches what Phase 7 needs rather than creating new code.

3. **Does submit-result.js (Phase 7) run KOM computation, or does the leaderboard build (Phase 8) run it?**
   - What we know: `komPoints` is stored in `RiderResult` (leaderboard-side type) but not in `AthleteJson` (storage-side type)
   - What's unclear: Which function computes `komPoints` from `komSegmentIds`?
   - Recommendation: KOM points should be computed at **leaderboard build time** (Phase 8), reading all athlete files and normalizing. The submission stores raw `komSegmentIds` (and optionally `komEfforts`). This is the cleanest separation — scoring is all in one place at build time.

---

## Sources

### Primary (HIGH confidence)
- `/Users/Sheppardjm/Repos/ironPineOmnium/netlify/functions/strava-fetch-activity.js` — source of truth for what extraction already does
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/lib/scoring.ts` — source of truth for scoring model and weights
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/lib/segments.ts` — source of truth for segment IDs
- `/Users/Sheppardjm/Repos/ironPineOmnium/src/lib/types.ts` — source of truth for type contracts
- `/Users/Sheppardjm/Repos/ironPineOmnium/.planning/phases/01-compliance-and-prerequisites/DATA-MODEL.md` — approved data model and storage schema
- `/Users/Sheppardjm/Repos/ironPineOmnium/scripts/csv-fallback.ts` — GitHub Contents API read/write pattern
- Prior phase summaries (04-01, 05-02) — established payload shape and hidden field contract

### Secondary (MEDIUM confidence)
- GitHub REST API documentation (https://docs.github.com/en/rest/repos/contents) — verified pattern for listing directory and fetching file content

---

## Metadata

**Confidence breakdown:**
- What's already implemented (Phase 4 extraction): HIGH — read directly from source code
- KOM scoring model decision: LOW — tension between DATA-03 and existing scoring.ts not yet resolved
- GitHub read pattern in Netlify Function: HIGH — same pattern as csv-fallback.ts, only using fetch() instead of https
- Zero-match path: HIGH — confirm page already handles it; submit-result.js must be consistent

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (stable codebase, no external API changes expected)
