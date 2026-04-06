# Phase 05: Submission Form UX - Research

**Researched:** 2026-04-06
**Domain:** Astro static pages, client-side JavaScript, base64url encoding, form validation, page-to-page payload passing
**Confidence:** HIGH (core patterns verified via official Astro docs and codebase analysis; base64url encoding verified via MDN)

---

## Summary

Phase 5 builds the two-page submission flow: `submit.astro` (activity URL input + Strava auth entry point) and `submit-confirm.astro` (score preview + identity form + cancel/submit). Both pages are fully static Astro pages — no SSR adapter, no Astro Actions, no server-side form handling. All interactivity is vanilla client-side JavaScript in `<script>` tags within the `.astro` files.

The critical architectural question is **how data travels from the fetch function to the confirm page**. The answer is: the client calls `strava-fetch-activity` via `fetch()`, receives the JSON payload, encodes it as base64url, and appends it as a query parameter in a `window.location.href` redirect to `/submit-confirm?payload=...`. The confirm page decodes the query param client-side using `new URLSearchParams(window.location.search)`. This is the only approach that works for a purely static Astro site where the Netlify Function cannot redirect to a static page with query data in the 302 response body.

Score preview computation on the confirm page must happen entirely client-side. The scoring formula is already defined in `src/lib/scoring.ts`, but that module uses TypeScript and is designed for build-time use. For client-side use in a static page's `<script>` tag, the scoring logic must be inlined or duplicated directly in the script — Astro's `is:inline` and `define:vars` directives make it possible to pass pre-computed values from frontmatter to scripts, but the confirm page has no frontmatter values (it doesn't know the payload at build time). All computation must happen after the page loads, in the browser.

The identity fields required (display name, category — hometown was removed per decision 01-01) use the HTML Constraint Validation API with `required` attributes and `setCustomValidity()` for custom error messages. No form library is needed.

**Primary recommendation:** Use query string payload passing (base64url-encoded JSON) between pages. Use vanilla `<script>` tags with `URLSearchParams` + `atob/btoa` + `TextEncoder/TextDecoder` for client-side decode. Inline all scoring logic needed for preview. Use native HTML constraint validation for form fields.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro static pages | 6.1.1 (project) | `src/pages/submit.astro`, `src/pages/submit-confirm.astro` | Already the project's page format; no SSR adapter needed |
| Vanilla `<script>` tags | Browser native | All client-side interactivity | Astro bundles `.astro` script tags by default; no framework needed for this flow |
| `fetch()` | Browser native | POST to `/api/strava-fetch-activity` from submit page | Already used by prior phases in functions; same pattern in browser |
| `URLSearchParams` | Browser native | Read `?payload=` query param on confirm page | Correct client-side pattern for static Astro pages — `Astro.url.searchParams` is NOT available at runtime in static mode |
| `btoa` / `atob` + `TextEncoder` | Browser native | base64url encode/decode the payload | No dep needed; all modern browsers support it |
| HTML Constraint Validation API | Browser native | `required`, `setCustomValidity()` on form fields | Full browser support; no library needed for 3 fields |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `Uint8Array.toBase64()` / `fromBase64()` | Baseline 2025 (Sept 2025) | Native base64url with `{ alphabet: "base64url" }` option | Avoid — baseline Sept 2025 means older browsers (pre-Chrome 131, pre-Firefox 133, pre-Safari 18.2) won't support it. Use btoa/atob pattern instead for broader compatibility. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Query string payload | `sessionStorage` | sessionStorage works across same-tab navigation; query string is more debuggable, shareable (for testing), and survives page refresh. Query string is preferred for this flow. |
| Query string payload | URL hash fragment | Hash is never sent to server (good for sensitive data) but is also not preserved by Netlify 302 redirects — confirmed limitation. Not applicable here since the function isn't redirecting; the client-side JS is navigating. Either works, but query string is clearer. |
| Inline scoring logic | Import `src/lib/scoring.ts` in `<script>` | Astro bundles scripts at build time — imports from `src/lib/` work in normal `<script>` tags (not `is:inline`). However, the scoring module uses `categoryIds` context for full leaderboard scoring. For preview, only the per-component formulas are needed and can be computed without a full leaderboard context. Inlining the preview formulas is cleaner. |
| Vanilla `<script>` | React/Vue island | Complete overkill for a two-field form with score display. Islands add hydration overhead and framework weight. Vanilla JS is the correct choice for this specific flow. |
| HTML constraint validation | Custom validation library | No library needed for 3 fields (name, category, plus hidden payload). Native `required` + `setCustomValidity()` is sufficient. |

**Installation:**
```bash
# No new packages required. All existing tooling handles this phase.
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/pages/
├── index.astro           # Existing landing page
├── error.astro           # Existing OAuth error page
├── submit.astro          # NEW: Activity URL input form + Strava auth CTA
└── submit-confirm.astro  # NEW: Score preview + identity form + confirm/cancel

netlify/functions/
├── strava-fetch-activity.js  # Existing (Phase 04) — called by submit.astro's script
└── ...                        # No new functions in Phase 05
```

### Pattern 1: Static Page to Static Page with Query Payload

**What:** The submit page POSTs to a Netlify Function via `fetch()`. On success, the client base64url-encodes the JSON response and navigates to the confirm page with it as a query param.

**When to use:** Any time a static Astro site needs to pass structured data between pages without SSR.

**Why query string over other options:**
- `sessionStorage`: Works but ties state to a single tab; payload is invisible for debugging
- URL hash (`#`): Not sent to server, fine for client-only; but query string is more conventional
- Netlify Function 302 redirect with payload: Cannot embed a large JSON payload in a redirect Location header
- POST to confirm page: Confirm page is a static `.html` file — it cannot receive POST data

**Flow:**
```
submit.astro (browser)
  → POST /api/strava-fetch-activity  { activityUrl }
  ← 200 { activityId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds }
  → encode payload as base64url
  → window.location.href = "/submit-confirm?payload=<base64url>"

submit-confirm.astro (browser)
  → URLSearchParams.get("payload")
  → decode base64url → parse JSON
  → render score preview + identity form
  → on cancel: window.location.href = "/submit"
  → on confirm: POST /api/submit-result (Phase 07)
```

### Pattern 2: base64url Encode/Decode Without Dependencies

**What:** Encode a JSON object to a URL-safe base64 string for use in a query parameter, and decode it back on the confirm page.

**Why:** `btoa()` produces standard base64 (`+`, `/`, `=`) which breaks URL query strings. URL-safe base64 replaces `+` with `-`, `/` with `_`, and strips padding `=`.

**Unicode gotcha:** `btoa()` only works with ASCII/latin1 strings. Rider-facing data passed in this payload (activityId, dates, numbers) is all ASCII-safe. However, display names and hometowns may contain Unicode. Since the payload for this flow only contains the activity data (not the identity fields), Unicode is not a risk for the Phase 5 payload. The identity fields are entered on the confirm page itself.

**Encoding (submit.astro's script):**
```javascript
// Source: MDN btoa documentation pattern
function encodePayload(obj) {
  const json = JSON.stringify(obj);
  const bytes = new TextEncoder().encode(json); // UTF-8 bytes
  // Convert Uint8Array to latin1 string for btoa
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
```

**Decoding (submit-confirm.astro's script):**
```javascript
// Source: MDN atob documentation pattern
function decodePayload(encoded) {
  // Restore standard base64
  let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  // Restore padding
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
```

**Alternative (simpler, safe for ASCII payload):**
```javascript
// If payload is guaranteed ASCII (numbers, IDs, dates only):
function encodePayload(obj) {
  return btoa(JSON.stringify(obj))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}
function decodePayload(encoded) {
  let b = encoded.replace(/-/g, "+").replace(/_/g, "/");
  while (b.length % 4) b += "=";
  return JSON.parse(atob(b));
}
```

The Phase 4 function response (`activityId`, `athleteId`, `movingTimeSeconds`, `startDateLocal`, `sectorEfforts`, `komSegmentIds`) contains only numbers and ASCII strings, so the simpler pattern is safe.

### Pattern 3: Client-Side Score Preview Computation

**What:** On the confirm page, compute a simplified score preview from the payload data. This is NOT a full leaderboard score (which requires comparing against other riders) — it's a per-component breakdown showing the rider's raw values and what they contribute to the final score.

**Critical constraint:** The full scoring formula (`scoreCategory` in `scoring.ts`) requires knowing the fastest time in the category for benchmark ratios. At the time of confirm, there is no leaderboard context. The preview must either:
1. Show relative estimates ("your moving time contributes to 35% of your score")
2. Show only raw values with their labels ("5:32:15 moving time · 7 sector segments matched · 2 KOM segments")
3. Show a preliminary score computed against current leaderboard data (requires fetching leaderboard — complex, Phase 8 territory)

**Per requirements SUBM-01, SUBM-04:** The preview shows "computed values" and "inline explanation" with the rider's actual value (e.g., "4:12 moving time") and its "point conversion." This implies pre-computed scores — but that's only possible if the scoring formula can run without a benchmark. The formula IS deterministic once you have other riders' data, but without that, no true score is computable.

**Practical resolution:** Phase 5 must show the rider's raw input values with context about how they'll be scored — not a final computed score (which depends on all other submissions). The "point conversion" language in SUBM-04 means showing the rider what each component is worth in the scoring system (e.g., "35% weight" for moving time), not an actual point value. This is confirmed by the requirement note: "Day 1 moving time score and Day 2 sector + KOM scores as computed values" — computed from the raw fetched data, not from relative benchmarks.

**Recommendation:** The score preview shows:
- Day 1: Formatted moving time (from `movingTimeSeconds`) + label "35% of your score"
- Day 2 sectors: Count of matched sector segments + total sector time (sum of `sectorEfforts` values) + label "45% of your score"
- Day 2 KOM: Count of `komSegmentIds` matched + label "20% of your score"
- A note: "Final score is computed relative to other riders in your category after submission"

This satisfies SUBM-01 and SUBM-04 without requiring benchmark data that doesn't exist yet.

### Pattern 4: Client-Side Script in Static Astro Pages

**What:** Astro processes `<script>` tags in `.astro` files by default (bundled, TypeScript support). Use the default (non-`is:inline`) script for the confirm page logic since it will be complex enough to benefit from bundling.

**Key Astro script rules (HIGH confidence, verified via official docs):**
- Default `<script>`: Bundled, TypeScript supported, import resolution works, deduped across components
- `is:inline`: Rendered exactly as written — no TypeScript, no import resolution, but gets `define:vars` passthrough. Use for tiny scripts where deduplication doesn't matter.
- `define:vars`: Passes frontmatter variables to scripts. **Implies `is:inline`** when used on `<script>`. Cannot use with the bundled script pattern.
- `data-*` attributes: The correct way to pass build-time values to bundled scripts — set them on a DOM element in frontmatter, read via `dataset` in the script.

**For the confirm page:** Since the payload comes from the URL (not frontmatter), no `define:vars` or `data-*` attribute bridging is needed. The script reads from `window.location.search` after the page loads.

**Pattern for reading query params in a static Astro page:**
```javascript
// Inside a <script> tag in submit-confirm.astro
// This runs client-side after the page loads
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("payload");
  if (!encoded) {
    // No payload — redirect back to submit
    window.location.href = "/submit";
    return;
  }
  const payload = decodePayload(encoded); // decode function defined above
  // ... render score preview, populate form
});
```

### Pattern 5: Form Validation Without a Library

**What:** The identity fields on the confirm page use native HTML validation (`required`) plus optional `setCustomValidity()` for custom error messages.

**Fields required (from requirements SUBM-03, and decision 01-01 removing hometown):**
- `name` (display name) — text input, required, no format constraint
- `category` — select with options `men`, `women`, `non-binary`, required

**Pattern:**
```html
<form id="confirm-form">
  <input type="text" name="name" id="name" required autocomplete="off" />
  <select name="category" id="category" required>
    <option value="">Select category</option>
    <option value="men">Men</option>
    <option value="women">Women</option>
    <option value="non-binary">Non-Binary</option>
  </select>
  <button type="submit">Confirm Submission</button>
</form>
```

**Script:**
```javascript
const form = document.getElementById("confirm-form");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = form.querySelector('[name="name"]').value.trim();
  const category = form.querySelector('[name="category"]').value;
  if (!name || !category) {
    // HTML required attribute handles browser-native errors
    // setCustomValidity() can customize the message if desired
    form.reportValidity();
    return;
  }
  // Proceed to submit...
});
```

### Pattern 6: Strava Auth Entry Point on Submit Page

**What:** The submit page must handle the case where the rider has no `strava_session` cookie (not yet authenticated). The page cannot read `httpOnly` cookies in client-side JS. Instead, the submit page can attempt the fetch and, if it gets a 401 back, redirect to `/api/strava-auth`.

**Alternative:** The submit page can show a "Connect with Strava" button that links to `/api/strava-auth` unconditionally, and on return (after OAuth), redirect back to `/submit`. This is simpler — no cookie-reading needed. After OAuth, `strava-callback.js` currently redirects to `/` (Phase 3 decision). For Phase 5, the callback redirect should go to `/submit` instead.

**Decision needed by planner:** Whether to change the OAuth callback redirect from `/` to `/submit`. This is a one-line change in `strava-callback.js` (`Location: "/submit"` instead of `"/"`).

### Anti-Patterns to Avoid

- **Reading `Astro.url.searchParams` in frontmatter for query params:** Only works in SSR mode. In static output, the frontmatter runs at build time — `Astro.url` has no search params. Always use `window.location.search` in client-side scripts.
- **Using `Uint8Array.toBase64()` for base64url:** Baseline 2025 (Sept 2025) — Chrome 131+, Firefox 133+, Safari 18.2+. Older devices/browsers won't support it. Use `btoa`/`atob` pattern which has universal browser support.
- **Putting the payload in the URL hash fragment:** Works fine for client-side, but the hash is NOT sent to the server. If Phase 7 ever needs the payload on a server-rendered confirm page, the hash won't be accessible. Query string is safer as a pattern.
- **Importing `src/lib/scoring.ts` in a `<script is:inline>` tag:** `is:inline` disables Astro's import resolution. TypeScript `.ts` imports only work in standard (bundled) `<script>` tags.
- **Computing final leaderboard scores in the preview:** The scoring formula requires benchmark ratios (fastest in category). Without other riders' data, a true numeric score cannot be computed. Show raw values + component weights, not final points.
- **Assuming `httpOnly` cookie is readable from client JS:** The `strava_session` cookie is `httpOnly` — it cannot be accessed via `document.cookie`. The submit page cannot know if the rider is logged in until it makes a fetch to the function and sees a 401 vs 200.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe base64 encoding | Custom encoding scheme | `btoa`/`atob` + string replacements | Three lines; universal browser support; well-documented MDN pattern |
| Form field validation | Custom validation framework | HTML `required` + `setCustomValidity()` | 3 fields; native constraint validation handles error display, keyboard accessibility, aria |
| Page-to-page state | Custom message passing | URL query string with base64url payload | Established web pattern; survives page refresh; no extra storage API |
| Score formula | Custom scoring implementation | Inline the math from `src/lib/scoring.ts` | The formulas are trivially simple (ratio × weight × 100); inline for client script clarity |

**Key insight:** Phase 5 is a pure frontend phase. The heaviest lifting (Strava data fetch, validation) is already done in Phase 4. Phase 5 assembles UI on top of that. Resist any temptation to add npm packages for form handling, validation, or state management — the total interactivity needed is < 100 lines of vanilla JavaScript.

---

## Common Pitfalls

### Pitfall 1: Assuming Query Params Are Available in Astro Frontmatter

**What goes wrong:** Developer tries `Astro.url.searchParams.get("payload")` in `submit-confirm.astro` frontmatter to decode the payload at build time.

**Why it happens:** In SSR mode this works. In static mode (`output: "static"`), the frontmatter runs at build time when there is no URL — `Astro.url` is a placeholder without search params.

**How to avoid:** All query param reading must happen in a `<script>` tag inside the `.astro` file, using `new URLSearchParams(window.location.search)` after the page loads.

**Warning signs:** Payload is always `null` or `undefined` in the frontmatter.

### Pitfall 2: URL Length Limits with Base64url Payload

**What goes wrong:** The base64url-encoded payload is too long for the URL, causing truncation or 414 errors.

**Why it happens:** The Phase 4 function returns `{ activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds }`. The `sectorEfforts` object has up to 7 segment IDs as keys with integer values. `komSegmentIds` has up to 3 entries. Total JSON is roughly 300–400 characters → ~400–550 bytes base64url.

**How to avoid:** This is well within the ~2000 character practical URL limit and the ~8192 byte browser limit. No truncation risk.

**Warning signs:** Not applicable for this payload size.

### Pitfall 3: `btoa()` Fails on Unicode Characters

**What goes wrong:** Calling `btoa(JSON.stringify(payload))` throws "InvalidCharacterError" if any string in the payload contains non-ASCII characters.

**Why it happens:** `btoa()` only handles characters in the range 0x00–0xFF (Latin-1). The Phase 4 payload contains only: numeric IDs (ASCII digits), date strings (ASCII), numeric values (numbers). This pitfall does NOT apply to the Phase 5 payload.

**How to avoid:** The fetch payload is safe. However, if the identity fields (display name) were ever included in the payload, the TextEncoder/TextDecoder pattern would be needed for Unicode safety. For Phase 5, the payload only contains activity data (all ASCII).

**Warning signs:** `btoa()` throws on encoding; any non-ASCII characters in the serialized payload.

### Pitfall 4: OAuth Callback Redirects to `/` Instead of `/submit`

**What goes wrong:** After Strava OAuth, the rider lands at the homepage (`/`) instead of continuing the submission flow.

**Why it happens:** `strava-callback.js` currently redirects to `Location: "/"` (Phase 3 implementation). The submit flow needs the rider to return to `/submit` after auth.

**How to avoid:** Update `strava-callback.js` to redirect to `/submit` instead of `/`. Alternatively, use a `?returnTo` query param in the strava-auth function so the callback destination is configurable. The simpler fix (hardcode `/submit`) is sufficient for this single-flow event site.

**Warning signs:** Riders complete OAuth but end up at the homepage instead of the submission form.

### Pitfall 5: Cancel Navigation Loses Submit Context

**What goes wrong:** Clicking "Cancel" on the confirm page navigates back to `/submit` (correct), but the submit page shows the same URL input form the rider already filled out — unless the URL is pre-populated.

**Why it happens:** The submit page doesn't retain the previously entered activity URL after navigation.

**How to avoid:** On the confirm page, include the original activity URL in the payload or in a separate query param. Use it to pre-fill the input on the submit page if the rider returns. Alternatively, accept that cancel simply returns to a blank form — this is valid UX for a simple event submission.

**Warning signs:** Rider must re-type the URL if they cancel.

### Pitfall 6: `define:vars` Implies `is:inline` — No TypeScript in That Script

**What goes wrong:** Developer uses `<script define:vars={{ someValue }}>` and tries to use TypeScript syntax or ES module imports in the same script.

**Why it happens:** `define:vars` forces `is:inline` mode, which disables Astro's TypeScript transpilation and import bundling.

**How to avoid:** Don't use `define:vars` on the confirm/submit page scripts. The scripts need to compute scores and manipulate DOM — keep them as regular Astro `<script>` tags without `define:vars`. Pass data via the URL (payload) or `data-*` attributes on DOM elements.

**Warning signs:** TypeScript errors in script tags that use `define:vars`; import statements not resolving.

---

## Code Examples

Verified patterns from official sources:

### Reading Query Params on a Static Astro Page (Client-Side Only)

```javascript
// Source: Astro official docs (static mode constraint) + MDN URLSearchParams
// Place in a <script> tag in submit-confirm.astro
document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const encoded = params.get("payload");

  if (!encoded) {
    // No payload — this page was accessed directly, not via submit flow
    window.location.href = "/submit";
    return;
  }

  // Decode and parse
  try {
    let base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4 !== 0) base64 += "=";
    const payload = JSON.parse(atob(base64));
    renderPreview(payload);
  } catch (_) {
    // Malformed payload — redirect to clean state
    window.location.href = "/submit";
  }
});
```

### Encoding Payload for URL (Submit Page Script)

```javascript
// Source: MDN btoa + base64url RFC 4648 convention
// Place in a <script> tag in submit.astro, called after successful fetch
function buildConfirmUrl(payload) {
  const json = JSON.stringify(payload);
  const b64 = btoa(json)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  return "/submit-confirm?payload=" + b64;
}
```

### Score Component Preview Computation (Confirm Page)

```javascript
// Source: inline from src/lib/scoring.ts formulas (scoring.ts is the authoritative source)
// Show raw values and their scoring weights — NOT final benchmarked scores
function formatTime(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [h, m, s].map(v => String(v).padStart(2, "0")).join(":");
}

function renderPreview(payload) {
  // Day 1: moving time
  const day1TimeStr = formatTime(payload.movingTimeSeconds);
  // e.g., "5:32:15"

  // Day 2 sectors: sum the matched sector times
  const sectorTimes = Object.values(payload.sectorEfforts || {});
  const sectorCount = sectorTimes.length; // out of 7 total
  const sectorTotal = sectorTimes.reduce((a, b) => a + b, 0);

  // Day 2 KOM: count matched KOM segments
  const komCount = (payload.komSegmentIds || []).length; // out of 3 total

  // Display:
  // "Day 1 moving time: 5:32:15 → counts for 35% of your score"
  // "Day 2 sectors: 4 of 7 matched, total sector time 1:22:34 → 45% of your score"
  // "Day 2 KOM points: 2 of 3 matched → 20% of your score"
}
```

### Form Validation with Required Fields

```javascript
// Source: MDN Constraint Validation API
const form = document.getElementById("confirm-form");
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById("name");
  const categorySelect = document.getElementById("category");

  const name = nameInput.value.trim();
  const category = categorySelect.value;

  if (!name) {
    nameInput.setCustomValidity("Please enter your display name.");
    nameInput.reportValidity();
    return;
  }
  nameInput.setCustomValidity(""); // Clear custom validity on valid input

  if (!category) {
    categorySelect.setCustomValidity("Please select your category.");
    categorySelect.reportValidity();
    return;
  }
  categorySelect.setCustomValidity("");

  // Proceed with submission (Phase 07)
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side form POST to confirm page | Client-side fetch + query string payload navigation | N/A (static Astro constraint) | Enables static output mode; no SSR adapter needed |
| `btoa`/`atob` only (ASCII-limited) | `btoa` with `TextEncoder` for Unicode safety, OR `Uint8Array.toBase64()` (Sept 2025) | Chrome 131 / Firefox 133 / Safari 18.2 | `Uint8Array.toBase64()` with `{ alphabet: "base64url" }` is cleaner but not universally supported yet. Use `btoa` pattern for now. |
| Framework form components | HTML Constraint Validation API | Always available | Native validation sufficient for 2-field form; no React/Vue needed |

**Deprecated/outdated for this phase:**
- Astro Actions: Requires server-side rendering. Not available in `output: "static"` mode.
- `nanostores/persistent`: Suitable for multi-page state persistence; overkill for a single-step confirm flow with a URL-passed payload.

---

## Open Questions

1. **Should `strava-callback.js` redirect to `/submit` instead of `/`?**
   - What we know: Currently redirects to `Location: "/"`. For Phase 5 to feel like a cohesive flow, the rider should land at `/submit` after OAuth, not the homepage.
   - What's unclear: Whether this change belongs in Phase 5 plan 05-01 or Phase 3 follow-up.
   - Recommendation: Include a one-line change to `strava-callback.js` in plan 05-01. It's a single string change and makes the flow correct without scope creep.

2. **What happens if the rider lands on `/submit-confirm` without a `payload` query param (direct access)?**
   - What we know: The page is a static HTML file — it cannot distinguish "came from submit flow" vs "typed URL directly."
   - What's unclear: Whether to show an error state or silently redirect.
   - Recommendation: Silent redirect to `/submit` is cleanest. Include a null-check in the client script: if `params.get("payload")` is null/empty, `window.location.href = "/submit"`.

3. **Score preview shows raw inputs, not final benchmarked score — is this acceptable per SUBM-01?**
   - What we know: SUBM-01 says "computed score" showing "Day 1 moving time score and Day 2 sector + KOM scores as computed values." The scoring formula requires category benchmark (fastest rider) that doesn't exist at submission time.
   - What's unclear: Whether "computed values" means "formatted raw values" or "actual point contributions."
   - Recommendation: Show formatted raw values with their weights ("Your 5:32:15 moving time represents 35% of your final score"). Final numeric scores cannot be computed without the full leaderboard. Document this scope boundary clearly in plan 05-03.

4. **Should the confirm page show the Strava athlete name (from the session)?**
   - What we know: The `strava_session` cookie contains `athleteId` only (not name). The athlete name from the initial OAuth is NOT stored anywhere — only the numeric ID.
   - What's unclear: Whether showing "Hello, [Name]" from Strava is expected UX.
   - Recommendation: Don't attempt to fetch the Strava athlete profile in Phase 5. Show "You're submitting as Strava Athlete #12345678" or skip athlete identification on the confirm page. The identity is captured via the display name field.

---

## Sources

### Primary (HIGH confidence)

- Astro docs — `https://docs.astro.build/en/guides/client-side-scripts/` — `<script>` tag behavior, `is:inline`, `define:vars`, bundling rules
- Astro docs — `https://docs.astro.build/en/reference/directives-reference/#definevars` — `define:vars` implies `is:inline`; JSON.stringify passthrough
- Astro docs — `https://docs.astro.build/en/guides/routing/` — file-based routing rules; `src/pages/submit.astro` → `/submit`
- Project file: `netlify/functions/strava-callback.js` — current OAuth redirect target (`Location: "/"`)
- Project file: `netlify/functions/strava-fetch-activity.js` — exact response shape: `{ activityId, athleteId, movingTimeSeconds, startDateLocal, sectorEfforts, komSegmentIds }`
- Project file: `src/lib/scoring.ts` — scoring formula (`fastestTime / riderTime × scale × weight`) and `formatDuration()` function
- Project file: `src/lib/types.ts` — `CategoryId`, `categoryLabels`, `RiderResult` shape
- Project file: `src/lib/segments.ts` — `SECTOR_SEGMENT_IDS` (7 segments), `KOM_SEGMENT_IDS` (3 segments), `SEGMENT_LABELS`
- Project file: `netlify.toml` — `/api/*` → `/.netlify/functions/:splat` routing; `output: "static"` confirmed in `astro.config.mjs`
- MDN — `https://developer.mozilla.org/en-US/docs/Web/API/Window/btoa` — `btoa()` latin-1 limitation; URL-safe encoding pattern
- MDN — `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array/toBase64` — Baseline 2025 (Sept 2025), Chrome 131+, Firefox 133+, Safari 18.2+

### Secondary (MEDIUM confidence)

- Astro docs — `https://docs.astro.build/en/recipes/build-forms-api/` — confirmed `fetch()` + `preventDefault()` + client-side navigation pattern for Astro forms
- Astro static mode + query params — `https://helpskillhub.com/how-to-get-query-string-parameters-with-astro/` — confirmed `window.location.search` is the only way to read query params in static mode
- MDN Constraint Validation API — confirmed `setCustomValidity()` + `reportValidity()` pattern; `required` attribute for all major browsers

### Tertiary (LOW confidence)

- WebSearch: base64url encoding convention (RFC 4648) — `+`→`-`, `/`→`_`, strip `=` — standard; confirmed via multiple sources but not fetched from single authoritative doc

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools are either built-in browser APIs or existing project dependencies. No new packages.
- Architecture (query string payload): HIGH — Astro static mode constraint is verified; URL query string is the correct and only viable pattern.
- Base64url encoding: HIGH — `btoa`/`atob` pattern is universal; `Uint8Array.toBase64()` baseline confirmed as Sept 2025 (avoid for now).
- Score preview approach (raw values + weights): MEDIUM — "computed values" requirement (SUBM-01) is ambiguous; this is the only feasible interpretation given static output mode and absence of leaderboard context at submission time.
- Form validation: HIGH — HTML Constraint Validation API is universally supported; `required` + `setCustomValidity()` is the standard approach.
- OAuth callback redirect change: HIGH — one-line change with no risk; blocking pitfall if not addressed.

**Research date:** 2026-04-06
**Valid until:** 2026-07-06 (Astro 6 static output mode is stable; browser APIs are stable)
