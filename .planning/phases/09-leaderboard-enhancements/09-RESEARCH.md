# Phase 9: Leaderboard Enhancements - Research

**Researched:** 2026-04-07
**Domain:** CSS table layout, client-side DOM filtering, mobile UX / touch targets
**Confidence:** HIGH (codebase fully read; patterns verified against official docs and authoritative sources)

---

## Summary

Phase 9 has four sub-tasks: add per-component score columns, implement name search, fix mobile layout at 375px, and validate touch targets. All four operate entirely within the existing `Leaderboard.astro` component and `global.css`. No new libraries or build steps are needed. The stack is Astro 6 (static output), Tailwind CSS v4 via Vite plugin, and plain TypeScript `<script>` blocks.

The current table already has the right columns: `Rank | Rider | Time | Sectors | KOM | Total`. The column headers use short labels without explanatory context, so the primary work for LEAD-01 is relabelling (e.g. "Day 1 score", "Day 2 sectors", "KOM score", "Total") rather than adding columns. All score values (`movingTimeScore`, `sectorScore`, `komScore`, `totalScore`) are already present on each `ScoredRider` entry and rendered in the table body.

The mobile problem is caused by `min-width: 44rem` on `.leaderboard-table` (reduced to `40rem` at `max-width: 639px`). At 375px neither fits without horizontal scroll. The correct fix is a sticky first column (rider name) plus strategic column hiding for the secondary sub-labels (`score-note` rows) — keeping rank, rider name, and total always visible.

Search is a pure DOM operation: one `<input>` above the tab list, an `input` event listener in the existing `<script>` block, and `hidden` toggling on `<tr>` elements. Crucially the listener must traverse **all panels** (not just the active one) so switching tabs post-search shows correct filtered state.

**Primary recommendation:** No new dependencies. All four sub-tasks are CSS and vanilla JS changes confined to `Leaderboard.astro` and `global.css`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 6.1.1 | Component / static output | Already in use |
| Tailwind CSS v4 | 4.2.x (Vite plugin) | Utility CSS | Already in use; CSS written in `global.css` `@layer components` |
| Vanilla TS `<script>` | — | Client-side interactivity | Already in use for tab switching |

### Supporting
None required. The project explicitly avoids framework components (no React/Vue/Svelte). The existing patterns are `<script>` blocks inside `.astro` files.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla JS search | Fuse.js / MiniSearch | Overkill — athlete names are exact strings, not fuzzy content |
| Column hiding CSS | DataTables / tabulator | External library, contradicts static-only constraint |
| Sticky column CSS | JS-computed column widths | More fragile; pure CSS `position: sticky` works in all modern browsers |

**Installation:** None needed.

---

## Architecture Patterns

### Recommended Project Structure

No new files required. All changes land in:

```
src/
├── components/
│   └── Leaderboard.astro   ← HTML markup + <script> block changes
└── styles/
    └── global.css          ← CSS changes for mobile layout + search input
```

---

### Pattern 1: Per-Component Score Column Labels (LEAD-01)

**What:** The table columns already expose `movingTimeScore`, `sectorScore`, `komScore`, `totalScore`. The header labels are the only change needed — rename them to be self-explanatory.

**Current headers:** `Rank | Rider | Time | Sectors | KOM | Total`

**Target headers:** `# | Rider | Day 1 | Day 2 Sectors | KOM | Total`

The `score-note` sub-row (currently showing raw duration/points) provides context beneath each score. These sub-rows are already rendered. No schema changes needed.

**Note:** The `ScoredRider` type already carries all four score components. No changes to `scoring.ts` or `types.ts` are needed.

---

### Pattern 2: Client-Side Name Search (LEAD-02)

**What:** A text input that filters `<tr>` rows across all three category panels in real time.

**Key constraint:** The search must filter rows in *all* panels — not just the active (visible) one — so that when a user switches tabs after typing a name, the filtered state is correct. Rows in hidden panels should have `hidden` removed by the search logic independent of the tab visibility.

**How Astro handles this:** The `<script>` block in `Leaderboard.astro` is processed as a module and deduplicated if the component renders multiple times (it renders once). TypeScript is supported natively. No `is:inline` needed.

**Pattern (verified from official Astro docs):**

```typescript
// Inside the existing <script> block in Leaderboard.astro
const searchInput = leaderboard.querySelector<HTMLInputElement>('[data-search]');
const allRows = leaderboard.querySelectorAll<HTMLTableRowElement>('tbody tr');

searchInput?.addEventListener('input', () => {
  const query = searchInput.value.trim().toLowerCase();
  for (const row of allRows) {
    const name = row.querySelector('.rider-name')?.textContent?.toLowerCase() ?? '';
    // row data-hidden tracks search state; actual visibility is managed by
    // combining search-hidden + panel hidden
    const matches = query === '' || name.includes(query);
    row.setAttribute('data-search-hidden', matches ? 'false' : 'true');
  }
  syncRowVisibility(panels); // re-apply panel hidden + search-hidden
});
```

**Alternative simpler approach** (no data attribute): directly set `row.hidden` but that conflicts with tab panel switching which hides entire sections. The safer pattern stores search state in a `data-search-hidden` attribute and resolves final visibility when either tabs switch or search changes.

**Clearing on tab switch:** The tab click handler needs to call the same visibility sync. Or: since the search filters by name across categories, hidden panel rows are already excluded from view — the search input text persists across tab switches naturally.

**Simplest correct approach:** Filter all `tbody tr` across all panels. Use `row.style.display = 'none'` / `''` for search filtering (separate from the `hidden` attribute used on panels). This avoids conflict because `panel[hidden]` hides the entire section; row display toggling operates at a lower DOM level inside the panel.

---

### Pattern 3: Mobile Layout at 375px — Sticky Rider Column (LEAD-03)

**What:** At 375px the table currently has `min-width: 40rem` (~640px) — 265px wider than viewport. Fix: make the Rider column sticky so it is always visible, allow the table to scroll horizontally, and reduce column widths.

**Confirmed CSS approach (position: sticky on `th`/`td`, not `tr`):**

```css
/* Rider column — first real data column (2nd col, index 1) */
.leaderboard-table td:nth-child(2),
.leaderboard-table th:nth-child(2) {
  position: sticky;
  left: 0;
  background: /* must be opaque to mask scrolling columns */
    var(--color-night-950);
  z-index: 2;
}
```

Key gotchas (confirmed from CSS-Tricks and bram.us):
- Sticky cells **must** have a solid/opaque background — otherwise content from other columns bleeds through during scroll
- `position: sticky` works on `<th>` and `<td>` but NOT on `<tr>` or `<thead>` in all browsers (Chrome bug 702927 — still present as of 2026)
- A recent 2026 Chrome 148 change (`position: sticky` per-axis) is not yet broadly deployed — do not rely on it

**Column width strategy at 375px:**

Instead of setting `min-width` to force all columns on screen, drop the `min-width` entirely at narrow breakpoints and let the table scroll. The sticky Rider column keeps the identity anchor always visible. The Rank (#) column is very narrow. The score columns (Day 1, Day 2 Sectors, KOM, Total) can use `white-space: nowrap` to stay compact.

```css
@media (max-width: 639px) {
  .leaderboard-table {
    min-width: 0; /* let it scroll naturally */
  }
  .leaderboard-table th,
  .leaderboard-table td {
    padding: 0.75rem 0.5rem;
    font-size: 0.82rem;
  }
  /* Hide .score-note sub-rows on mobile to save vertical space */
  .score-note {
    display: none;
  }
}
```

**Visibility priority at 375px:**
- Always visible: Rank (#), Rider (sticky), Total
- Scrollable: Day 1, Day 2 Sectors, KOM
- Hidden: `.score-note` sub-labels (raw duration/points) — recoverable by scrolling on tablet+

This satisfies SC-1 ("rider name, category, and total score are always visible") without eliminating any data.

---

### Pattern 4: Touch Target Validation (mobile tap safety)

**What:** Verify that tapping a leaderboard row does not trigger tab navigation or search input focus. Currently there are no `onclick` handlers on rows — rows are not interactive. The risk is accidental scroll interactions near the tab buttons or search input being placed too close to the table.

**Key findings:**

- `touch-action: manipulation` on buttons and inputs eliminates the 300ms tap delay and prevents double-tap zoom (confirmed via MDN and Can I Use — 97%+ browser support)
- WCAG 2.1 AAA: touch targets should be at least 44×44px. The tab buttons already have `min-height: 3rem` (48px) which meets this
- The primary risk in SC-4 ("tapping a row does not accidentally trigger search or tab navigation") is proximity: if the search input sits directly above the first table row with minimal gap, a scroll gesture on mobile can misfire as a tap on the input
- No existing `click` handler is on `<tr>` elements in `Leaderboard.astro` — so tapping a row cannot accidentally trigger navigation. The success criterion is already partially met by the absence of row click handlers
- Validation for SC-4 is primarily a manual browser test, not a code change

**Recommended proactive addition:**

```css
.tab-button,
.search-input {
  touch-action: manipulation;
}
```

This prevents accidental double-tap zoom on these controls, which would look like the search input was "activated" unexpectedly.

---

### Anti-Patterns to Avoid

- **Setting `row.hidden = true` for search filtering:** `hidden` is already used by the tab panel system (sets `section[hidden]`). If you also set `row.hidden`, removing it during tab switching will become tangled. Use `row.style.display` or a CSS class instead.
- **Filtering only the active panel:** Search must traverse all panels so tab switches after searching show correct state.
- **`is:inline` on the script:** Not needed and prevents Astro's TypeScript processing. Use the default `<script>` behavior.
- **`position: sticky` on `<tr>`:** Not supported in Chrome. Must be on `<td>` / `<th>`.
- **No background color on sticky cell:** The sticky column will show ghosted content scrolling behind it.
- **Removing `min-width` without sticky column:** This causes the Rider column to shrink unreadably on narrow screens. The sticky column fix and the min-width removal must be done together.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy name search | Custom Levenshtein | Not needed — substring match (`includes()`) is correct for short athlete name lists | Edge cases; names are controlled data |
| Scroll detection to highlight active row | Custom IntersectionObserver | Not needed for this phase — no row highlight feature in requirements | Overscope |
| Column show/hide toggle UI | Custom JS column toggler | Not needed — CSS media query column hiding is sufficient | Overengineering for a small dataset |

---

## Common Pitfalls

### Pitfall 1: Search Input Placed Inside Tab Panel
**What goes wrong:** If the `<input>` is placed inside each `<section>` (one per category), search only affects the visible panel. Switching tabs resets the visible rows.
**Why it happens:** Natural tendency to scope the input near the data it controls.
**How to avoid:** Place the search `<input>` in `.leaderboard-head` (already the right slot for it, above the tab list). The JS listener queries `allRows = leaderboard.querySelectorAll('tbody tr')` — all panels.
**Warning signs:** After typing a name, switching tabs shows unfiltered results.

### Pitfall 2: Sticky Column Background Mismatch
**What goes wrong:** The sticky Rider column has a transparent or semi-transparent background. When columns scroll behind it, text overlaps.
**Why it happens:** The leaderboard table rows use `background: linear-gradient(...)` for the first-place row and `background: rgba(...)` on hover. The sticky cell background must explicitly override these.
**How to avoid:** Set a solid opaque `background-color` on sticky cells using the closest base color (`--color-night-950` or `--color-fir-900`). For the first-row amber gradient, apply a matching override on `tr:first-child td:nth-child(2)`.

### Pitfall 3: `display: none` Row Breaking Table Layout
**What goes wrong:** Setting `display: none` on a `<tr>` works correctly but `display: ''` on un-hiding restores browser default which may not be `table-row` in all browsers.
**Why it happens:** `element.style.display = ''` removes the inline style, reverting to stylesheet default. Tables default to `display: table-row` which is correct.
**How to avoid:** Test both filtering (hiding) and clearing (unhiding). Alternatively use a CSS class `.search-hidden { display: none; }` which avoids the inline style entirely.

### Pitfall 4: Score Note Hiding Breaking Column Alignment
**What goes wrong:** Hiding `.score-note` on mobile via `display: none` leaves cells with only a `<strong>` value. If cells have `vertical-align: top` (they do in the current CSS), rows may appear misaligned.
**Why it happens:** Mixed cell heights across the row.
**How to avoid:** After hiding `.score-note`, set `vertical-align: middle` on `th, td` in the mobile breakpoint.

### Pitfall 5: Search State Not Cleared When Typing in a Different Tab Context
**What goes wrong:** User types a name in Men's tab, switches to Women's tab — Women rows that were already hidden by a *prior* search remain hidden.
**Why it happens:** The search listener filters all rows on every `input` event. If the input is not cleared when switching tabs, old search state persists.
**How to avoid:** This is actually the *correct* behavior per SC-2 ("searching works across all three category tabs"). The search input should persist across tab switches. The only issue would be if the input value becomes stale. No special handling needed — just ensure the listener runs on each keystroke, not once per tab.

---

## Code Examples

### Search Filter (verified pattern — vanilla JS, no library)

```typescript
// Source: confirmed with Astro docs + official MDN
// Place inside existing <script> block in Leaderboard.astro

const searchInput = leaderboard.querySelector<HTMLInputElement>('[data-search]');
if (searchInput) {
  searchInput.addEventListener('input', () => {
    const query = searchInput.value.trim().toLowerCase();
    const allRows = leaderboard.querySelectorAll<HTMLTableRowElement>('tbody tr');
    for (const row of allRows) {
      const name = row.querySelector('.rider-name')?.textContent?.toLowerCase() ?? '';
      const matches = query === '' || name.includes(query);
      row.classList.toggle('search-hidden', !matches);
    }
  });
}
```

```css
/* In global.css */
.search-hidden {
  display: none;
}
```

### Sticky Rider Column (verified: position sticky on td/th)

```css
/* In global.css — add inside @layer components */
.leaderboard-table td:nth-child(2),
.leaderboard-table th:nth-child(2) {
  position: sticky;
  left: 2.8rem; /* offset past the rank column */
  z-index: 2;
  background-color: var(--color-night-950);
}

/* First-place row has amber gradient — override sticky bg */
.leaderboard-table tbody tr:first-child td:nth-child(2) {
  background-color: #0d1a17; /* approx. night-950 darkened by ember overlay */
}
```

### Mobile Breakpoint Column Adjustments

```css
@media (max-width: 639px) {
  .leaderboard-table {
    min-width: 0;
  }
  .leaderboard-table th,
  .leaderboard-table td {
    padding: 0.75rem 0.45rem;
    vertical-align: middle;
    font-size: 0.82rem;
    white-space: nowrap;
  }
  .score-note {
    display: none;
  }
}
```

### Search Input HTML (inside `.leaderboard-head` in Leaderboard.astro)

```html
<input
  type="search"
  class="search-input"
  placeholder="Search riders…"
  aria-label="Search leaderboard by rider name"
  data-search
/>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `overflow-x: auto` wrapper only | Sticky first column + overflow-x scroll | CSS level 4 / ~2020 | Riders always identifiable while scrolling |
| 300ms tap delay | `touch-action: manipulation` | Pointer Events Level 2 / ~2018 | Instant tap response, no accidental zoom |
| Server-side search | Client-side DOM filter | N/A for this project | Matches static output constraint |

**Deprecated/outdated:**
- `position: sticky` polyfills: Not needed. Sticky on `<td>` / `<th>` is 97%+ browser support as of 2026 (source: Can I Use). No polyfill needed.
- jQuery `.toggle()` for row filtering: Not in the stack. Vanilla JS `classList.toggle` is idiomatic here.

---

## Open Questions

1. **Rider name column vs. rank column as the sticky anchor**
   - What we know: SC-3 says "rider name, category, and total score are always visible." The rank column is narrow (~2rem pill) and should also be visible.
   - What's unclear: Whether to make rank *and* rider both sticky (complicates z-index) or just rider (rank is so narrow it will typically be visible anyway).
   - Recommendation: Sticky on rider column only (`:nth-child(2)`). Rank column is narrow enough to stay visible unless the viewport is extremely small. If it clips, the sticky rider column still satisfies the requirement.

2. **Category column**
   - What we know: SC-3 mentions "rider name, category, and total score are always visible." The current table does not have a Category column — category is implied by which tab panel is active.
   - What's unclear: Whether "category" in SC-3 refers to the tab (which is already visible) or a per-row column.
   - Recommendation: The tab label already communicates category. No new category column is required. The planner should confirm this interpretation before plan tasks are written.

3. **Search input visibility on empty state (no live data)**
   - What we know: When `hasLiveData` is false, no panels or tables are rendered — just a `.leaderboard-empty` state.
   - What's unclear: Should search be shown when there are no riders yet?
   - Recommendation: Only render the search input when `hasLiveData` is true. Mirror the conditional guard already used on the tab list (`{hasLiveData && (<div class="tab-list"> ...`)}.

---

## Sources

### Primary (HIGH confidence)
- Astro 6 source code + docs (https://docs.astro.build/en/guides/client-side-scripts/) — script deduplication, TypeScript in `<script>`, module behavior
- CSS-Tricks: Sticky first column (https://css-tricks.com/a-table-with-both-a-sticky-header-and-a-sticky-first-column/) — z-index hierarchy, background requirement, Chrome `<tr>` limitation
- MDN Web Docs: `touch-action` — manipulation value, tap delay removal
- Smashing Magazine: Accessible Tap Target Sizes (https://www.smashingmagazine.com/2023/04/accessible-tap-target-sizes-rage-taps-clicks/) — 44×44px WCAG minimum
- Codebase read: `Leaderboard.astro`, `global.css`, `types.ts`, `scoring.ts`, `athlete-loader.ts` — complete first-hand knowledge of current implementation

### Secondary (MEDIUM confidence)
- CSS-Tricks: Under-Engineered Responsive Tables — scrollable wrapper as safe fallback
- bram.us 2026: `position: sticky` per-axis Chrome 148 change — new capability, not yet relied upon
- LogRocket: Responsive data table patterns — wrapper overflow, column widths

### Tertiary (LOW confidence)
- Baymard: Handling accidental taps — table row icon placement problems (design guidance, not verified with official spec)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json and current codebase
- Architecture: HIGH — all patterns derived from reading actual files
- CSS mobile fix: HIGH — sticky column and overflow patterns confirmed via official/authoritative sources
- Search pattern: HIGH — Astro docs confirm script behavior; DOM filter is well-established
- Touch targets: MEDIUM — WCAG spec confirmed; accidental tap risk is LOW given no row click handlers currently exist
- Open questions: Noted for planner to resolve before writing task actions

**Research date:** 2026-04-07
**Valid until:** 2026-05-07 (30 days — stable domain)
