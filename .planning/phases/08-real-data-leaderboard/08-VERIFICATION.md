---
phase: 08-real-data-leaderboard
verified: 2026-04-07T19:30:00Z
status: passed
score: 7/7 must-haves verified
---

# Phase 8: Real Data Leaderboard Verification Report

**Phase Goal:** The public leaderboard displays actual submitted rider results instead of sample data, computes relative scores and KOM rankings from all athlete JSON files at build time, and a clear indicator distinguishes live results from placeholder data
**Verified:** 2026-04-07T19:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After submission, rider appears on leaderboard after next Netlify rebuild | ✓ VERIFIED | submit-result.js writes `public/data/results/athletes/{athleteId}.json` at line 105, fires `NETLIFY_BUILD_HOOK` at line 256–258; athlete-loader.ts reads all files at build time via `import.meta.glob` |
| 2 | Sample data entirely removed from leaderboard rendering path | ✓ VERIFIED | Grep of all `.ts/.astro/.js` files: `sampleRiders`/`sample-data` appear only in `src/lib/sample-data.ts` (the file itself) — zero imports in Leaderboard.astro or index.astro |
| 3 | Clear visual indicator distinguishes live results | ✓ VERIFIED | `index.astro` lines 297–300 render a `status-badge` with class `status-live`/`status-pending` and text "Live results"/"Awaiting submissions"; Leaderboard.astro line 17 renders eyebrow "Live Results"/"Awaiting Submissions" |
| 4 | Scoring engine reads athlete JSONs from `public/data/results/athletes/` at build time and ranks correctly across all three categories | ✓ VERIFIED | `athlete-loader.ts` glob path `../../public/data/results/athletes/*.json`; `scoreOmnium()` filters `categoryIds.map(…riders.filter(rider.category === categoryId))` |
| 5 | Day 1 moving time uses relative scoring (`fastestInCategory / myTime`) with 35% weight | ✓ VERIFIED | `scoring.ts` line 32: `(fastestMovingTimeSeconds / rider.movingTimeSeconds) * config.scoreScale * config.movingTimeWeight`; `defaultScoringConfig.movingTimeWeight = 0.35` |
| 6 | KOM points computed by comparing riders' `komEfforts` elapsed times against same-category peers — not from Strava `kom_rank` | ✓ VERIFIED | `athlete-loader.ts` lines 45–72: Approach A iterates `KOM_SEGMENT_IDS`, counts peers with faster times; `kom_rank` field never referenced anywhere in codebase |
| 7 | Scoring weights (35/45/20) read from `defaultScoringConfig` — not hardcoded in build pipeline | ✓ VERIFIED | `athlete-loader.ts` does not import `defaultScoringConfig`; `Leaderboard.astro` calls `scoreOmnium(riders, defaultScoringConfig)` — weights flow from `scoring.ts` exclusively |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/lib/athlete-loader.ts` | Build-time JSON loader with KOM scoring | ✓ VERIFIED | 130 lines, exports `loadAthleteResults()` and `AthleteJson`; no stubs |
| `src/lib/scoring.ts` | Scoring engine with `defaultScoringConfig` | ✓ VERIFIED | 100 lines, `defaultScoringConfig` exports 0.35/0.45/0.2 weights; `scoreOmnium()` exported |
| `src/components/Leaderboard.astro` | Leaderboard wired to real data with empty state | ✓ VERIFIED | 154 lines; imports `loadAthleteResults`, conditionally renders on `hasLiveData`, renders "Results will appear here after riders submit." when empty |
| `src/pages/index.astro` | Status badge and dynamic heading | ✓ VERIFIED | 329 lines; imports `loadAthleteResults`, renders `status-badge` with `status-live`/`status-pending`, h2 switches on `hasLiveData` |
| `src/lib/segments.ts` | `KOM_SEGMENT_IDS` and `SECTOR_SEGMENT_IDS` | ✓ VERIFIED | 3 KOM segments, 7 sector segments; imported in athlete-loader.ts |
| `public/data/results/athletes/` | Empty directory (no athlete files yet) | ✓ VERIFIED | Directory exists; zero JSON files — clean empty state confirmed |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `submit-result.js` | `public/data/results/athletes/` | GitHub API write + `NETLIFY_BUILD_HOOK` POST | ✓ WIRED | Lines 105, 256–258: file written then build hook fired |
| `athlete-loader.ts` | `public/data/results/athletes/*.json` | `import.meta.glob` eager | ✓ WIRED | Line 90–93: static glob string, `{ eager: true }` |
| `Leaderboard.astro` | `athlete-loader.ts` | `loadAthleteResults()` import | ✓ WIRED | Lines 3–5: imported and destructured `{ riders, hasLiveData }` |
| `Leaderboard.astro` | `scoring.ts` | `scoreOmnium(riders, defaultScoringConfig)` | ✓ WIRED | Line 6: called with riders from athlete-loader |
| `index.astro` | `athlete-loader.ts` | `loadAthleteResults()` import | ✓ WIRED | Lines 6–8: `hasLiveData` drives status badge and heading |
| `athlete-loader.ts` | `scoring.ts` | Does NOT use; delegates | ✓ CORRECT | athlete-loader passes raw `komPoints` scalar; weights applied by `scoreOmnium()` |
| `computeKomPoints()` | `KOM_SEGMENT_IDS` | Time-rank loop over segments | ✓ WIRED | Lines 49–65: iterates `KOM_SEGMENT_IDS`, counts faster peers per segment |

### Requirements Coverage

| Requirement | Status | Notes |
|-------------|--------|-------|
| LEAD-04 (leaderboard shows real results) | ✓ SATISFIED | `loadAthleteResults()` replaces sample data; empty state shown with zero files |
| DSGN-03 (clear live/pending indicator) | ✓ SATISFIED | Status badge in index.astro + eyebrow in Leaderboard.astro both conditional on `hasLiveData` |
| DATA-03 (KOM ranking from athlete data) | ✓ SATISFIED | Time-based within-category ranking; `kom_rank` field unused |
| SUBM-05 (score computation at build time) | ✓ SATISFIED | Full pipeline: JSON files → `loadAthleteResults()` → `scoreOmnium(defaultScoringConfig)` → rendered HTML |

### Anti-Patterns Found

None. Scanned `athlete-loader.ts`, `scoring.ts`, `Leaderboard.astro`, and `index.astro` for TODO/FIXME/placeholder/stub patterns — zero results.

### Human Verification Required

#### 1. Empty-State Visual Appearance

**Test:** Run `npm run build` with zero athlete JSON files; open `dist/index.html`; scroll to leaderboard section.
**Expected:** "Awaiting submissions" badge visible, "Awaiting submissions." h2 heading, "Results will appear here after riders submit." message inside the leaderboard shell. No sample rider names visible anywhere on the page.
**Why human:** Visual layout and CSS rendering cannot be confirmed by static analysis.

#### 2. Live-Data Visual Appearance After Submission

**Test:** Place a complete athlete JSON file in `public/data/results/athletes/`, run `npm run build`, open `dist/index.html`.
**Expected:** "Live results" green badge appears, "Current standings." h2, rider name appears in category table with non-zero scores in all three columns (time, sectors, KOM), category tabs render.
**Why human:** End-to-end visual rendering with real data requires a build + browser check.

#### 3. `import.meta.glob` Resolves Correctly at Vite Build Time

**Test:** Place a JSON file matching `AthleteJson` schema in `public/data/results/athletes/test.json`, run `npm run build` or `npm run dev`, observe that the rider appears.
**Expected:** No Vite resolution error; rider rendered in leaderboard.
**Why human:** `import.meta.glob` path correctness depends on the actual Vite resolver — static analysis confirms the path string is correct but cannot execute the resolver.

### Gaps Summary

No gaps. All 7 must-haves are verified at the code level. The pipeline is:

1. `submit-result.js` writes `public/data/results/athletes/{athleteId}.json` and fires build hook
2. `athlete-loader.ts` reads those files at build time via `import.meta.glob`, computes within-category KOM rankings, returns `RiderResult[]`
3. `Leaderboard.astro` calls `scoreOmnium(riders, defaultScoringConfig)` and renders results or empty state
4. `index.astro` renders `status-badge` and heading based on `hasLiveData`
5. `sample-data.ts` is orphaned — zero imports in the rendering path

---
_Verified: 2026-04-07T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
