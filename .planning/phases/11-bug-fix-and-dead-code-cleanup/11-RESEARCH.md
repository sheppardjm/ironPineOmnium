# Phase 11: Bug Fix and Dead Code Cleanup - Research

**Researched:** 2026-04-08
**Domain:** Astro static site — targeted bug fix + dead code removal
**Confidence:** HIGH

## Summary

Phase 11 is entirely mechanical: one two-line bug fix (swap two string values), two file deletions, and a handful of targeted line removals. No library knowledge is required. All findings are derived from direct inspection of the current codebase, which is the authoritative source for this type of work.

The route map swap is confirmed at `src/pages/index.astro` lines 19 and 30: Day 1 has `route-mkultra.png` and Day 2 has `route-hiawatha.png` — exactly backwards. The fix is to swap those two string literals.

The dead-code items are fully confirmed: `src/lib/sample-data.ts` has zero imports outside itself, `src/components/LogoMark.astro` has zero imports anywhere in `src/`, and the `h-athleteFirstname` / `h-athleteLastname` hidden fields are set by `populateHiddenFields()` in `submit-confirm.astro` but are never included in the JSON payload sent to `/api/submit-result`.

**Primary recommendation:** Execute all five success criteria as a single atomic change — route swap + two file deletions + dead markup removal — then verify `pnpm build` succeeds.

## Standard Stack

No new dependencies. This phase uses only what is already installed.

### Core
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| pnpm | 10.14.0 | Build runner | Project package manager |
| astro build | ^6.1.1 | Build verification | Catches broken imports, type errors |
| astro check | ^0.9.8 | TypeScript lint | Catches dead type references after removal |

### Alternatives Considered
None applicable — no libraries to choose between.

## Architecture Patterns

### Relevant Project Structure
```
src/
├── pages/
│   ├── index.astro          # Bug: routeMap values swapped (lines 19, 30)
│   └── submit-confirm.astro # Dead markup: h-athleteFirstname, h-athleteLastname
├── lib/
│   └── sample-data.ts       # DELETE: zero imports, superseded by athlete-loader.ts
└── components/
    └── LogoMark.astro        # DELETE: zero imports anywhere
```

### Pattern 1: Swap Without Intermediate Variable
**What:** The two `routeMap` values are string literals inside an array literal; swap them in place.
**When to use:** Always — no state risk with string literals.
**Example:**
```ts
// BEFORE (buggy):
{ day: "Day 1", name: "Hiawatha's Revenge", ..., routeMap: "/images/route-mkultra.png" },
{ day: "Day 2", name: "MK Ultra Gravel",    ..., routeMap: "/images/route-hiawatha.png" },

// AFTER (correct — per day-to-event mapping: Day 1 = Hiawatha, Day 2 = MK Ultra):
{ day: "Day 1", name: "Hiawatha's Revenge", ..., routeMap: "/images/route-hiawatha.png" },
{ day: "Day 2", name: "MK Ultra Gravel",    ..., routeMap: "/images/route-mkultra.png" },
```

### Pattern 2: Dead HTML Field Removal
**What:** Remove the two `<input type="hidden">` elements and their corresponding `set()` calls in `populateHiddenFields()`.
**Constraint:** `athleteFirstname` and `athleteLastname` ARE still used in `renderPreview()` (the "Connected as" display). Only the hidden form fields and their population calls are dead — the payload decode and display logic must be left intact.

Lines to remove from the HTML form (lines 74–75):
```html
<input type="hidden" name="athleteFirstname" id="h-athleteFirstname" />
<input type="hidden" name="athleteLastname" id="h-athleteLastname" />
```

Lines to remove from `populateHiddenFields()` (lines 251–252):
```ts
set("h-athleteFirstname", payload.athleteFirstname);
set("h-athleteLastname", payload.athleteLastname);
```

The `Payload` type declaration at lines 108–109 (`athleteFirstname?: string; athleteLastname?: string;`) and the `renderPreview()` logic at lines 121–128 are LIVE and must NOT be removed.

### Pattern 3: File Deletion Safety Check
**What:** Before deleting a file, confirm zero imports with a project-wide grep.
**Verification commands:**
```bash
grep -r "sample-data" src/ --include="*.ts" --include="*.astro" --include="*.js"
grep -r "LogoMark" src/ --include="*.ts" --include="*.astro" --include="*.js"
```
Both already confirmed to return no results from outside the files themselves.

### Anti-Patterns to Avoid
- **Removing `athleteFirstname`/`athleteLastname` from the `Payload` type or `renderPreview()`:** This would break the "Connected as [name]" display. Only the hidden form fields and the two `set()` calls in `populateHiddenFields()` are dead.
- **Grepping only `src/` for LogoMark:** The component is also not imported from `netlify/` or project root. Confirmed safe to delete.
- **Running `astro check` but not `astro build`:** `astro check` validates TypeScript but `astro build` is the definitive test that no removed file is referenced by the build graph.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Import scanning | Custom script | `grep -r` + `pnpm build` | Build will fail loudly if a deleted file is still imported |
| Unused file detection | Custom analyzer | Direct inspection already done | All imports confirmed manually — no tooling needed |

## Common Pitfalls

### Pitfall 1: Partial Hidden-Field Removal
**What goes wrong:** Removing the `<input>` elements but leaving the `set()` calls in `populateHiddenFields()` (or vice versa). The `set()` calls silently no-op when the element doesn't exist, so the build won't fail — but the code is still inconsistent and misleading.
**How to avoid:** Remove both the HTML elements (lines 74–75) AND the corresponding `set()` calls (lines 251–252) in the same edit.
**Warning signs:** `set("h-athleteFirstname", ...)` or `set("h-athleteLastname", ...)` still present after removing the `<input>` tags.

### Pitfall 2: Removing Live Display Logic
**What goes wrong:** Conflating "athleteFirstname is dead" with removing ALL uses of it. The names are used for display in `renderPreview()` at lines 121–128 — this is live, user-visible behavior ("Connected as Firstname Lastname").
**How to avoid:** Only target lines 74–75 (HTML) and 251–252 (JS `set()` calls). The `Payload` type fields and `renderPreview()` logic are intentional and must stay.
**Warning signs:** The "Connected as" identity line disappearing on the confirm page.

### Pitfall 3: Build Cache Masking Broken Imports
**What goes wrong:** `pnpm build` passes because the previous successful build is cached, masking a broken import.
**How to avoid:** After file deletions, run `pnpm build` in a clean state. Astro's build is deterministic and does not rely on incremental output for correctness checks — a fresh `pnpm build` will catch any missing imports.

## Code Examples

### Route Swap — Exact Edit (index.astro lines 19 and 30)
```diff
-    routeMap: "/images/route-mkultra.png",   // line 19 — Day 1 Hiawatha (WRONG)
+    routeMap: "/images/route-hiawatha.png",   // line 19 — Day 1 Hiawatha (CORRECT)

-    routeMap: "/images/route-hiawatha.png",   // line 30 — Day 2 MK Ultra (WRONG)
+    routeMap: "/images/route-mkultra.png",    // line 30 — Day 2 MK Ultra (CORRECT)
```

### Hidden Fields — Exact Lines to Remove

**HTML (submit-confirm.astro lines 74–75):**
```html
<input type="hidden" name="athleteFirstname" id="h-athleteFirstname" />
<input type="hidden" name="athleteLastname" id="h-athleteLastname" />
```

**JS (submit-confirm.astro lines 251–252):**
```ts
set("h-athleteFirstname", payload.athleteFirstname);
set("h-athleteLastname", payload.athleteLastname);
```

### File Deletions
```bash
rm src/lib/sample-data.ts
rm src/components/LogoMark.astro
```

### Build Verification
```bash
pnpm build
```
A passing build is the definitive success gate. No additional test tooling is configured in this project.

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| sample-data.ts (fake rider data) | athlete-loader.ts (real athlete JSON files) | sample-data.ts was superseded when Phase 7/8 wired real persistence |
| LogoMark.astro (programmatic SVG icon) | logo.svg in /public (direct img reference) | Component became orphaned when Phase 10 redesign moved to the static SVG |

## Open Questions

No open questions. All items are fully confirmed through codebase inspection:

1. Route swap location and values: confirmed at index.astro lines 19 and 30.
2. sample-data.ts imports: confirmed zero imports outside the file itself.
3. LogoMark.astro imports: confirmed zero imports anywhere in src/.
4. Hidden field liveness: confirmed that `athleteFirstname`/`athleteLastname` appear in the submit-result.js payload destructure at line 61 — they are NOT there. The `submit-result.js` handler destructures only `{ name, category, activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds, komEfforts }` — no firstname/lastname.
5. Display logic safety: confirmed `renderPreview()` reads `payload.athleteFirstname` / `payload.athleteLastname` directly from the decoded base64 payload (NOT from form fields). This is live and must not be touched.

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — `src/pages/index.astro` (route swap bug confirmed)
- Direct codebase inspection — `src/lib/sample-data.ts` (file contents confirmed, zero imports confirmed)
- Direct codebase inspection — `src/components/LogoMark.astro` (file contents confirmed, zero imports confirmed)
- Direct codebase inspection — `src/pages/submit-confirm.astro` (dead hidden fields confirmed, live display logic identified)
- Direct codebase inspection — `netlify/functions/submit-result.js` (confirmed athleteFirstname/athleteLastname NOT in payload destructure)
- `.planning/v1.0-MILESTONE-AUDIT.md` — bug and tech debt items that drive this phase

## Metadata

**Confidence breakdown:**
- Bug fix (route swap): HIGH — exact file, exact lines, exact values confirmed by direct read
- File deletions: HIGH — import scan confirmed zero references from outside the files
- Hidden field removal: HIGH — confirmed dead at the API boundary; live display logic identified and marked safe
- Build verification: HIGH — pnpm build is the standard gate; project has no additional test suite

**Research date:** 2026-04-08
**Valid until:** Stable indefinitely (no external library dependencies, all findings from codebase inspection)
