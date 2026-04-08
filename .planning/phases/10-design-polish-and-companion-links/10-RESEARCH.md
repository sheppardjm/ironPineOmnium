# Phase 10: Design Polish and Companion Links - Research

**Researched:** 2026-04-08
**Domain:** Full-site CSS redesign — Tailwind v4 theme system, Astro 6 static output, typography hierarchy, form split-layout, navigation bar, leaderboard podium preview, error state pages
**Confidence:** HIGH (all findings based on direct codebase reading and verified documentation)

---

## Summary

Phase 10 is a full-site visual redesign. The scope covers every page: landing (`index.astro`), submit (`submit.astro`), confirm (`submit-confirm.astro`), error (`error.astro`), and a new `/leaderboard` page. A sticky navigation bar is added. The landing page gets a leaderboard podium preview and a "Submit Results" CTA. The existing design is dark (deep forest greens, dark backgrounds) — Phase 10 inverts to light base with bold typography and high-contrast accents.

The technical stack is unchanged: Astro 6.1.3 static output, Tailwind CSS v4 via Vite plugin, `@theme static` CSS custom properties in `global.css`, vanilla TypeScript `<script>` blocks, three Google Fonts (Spectral + Karla + JetBrains Mono). No new JavaScript frameworks or CSS libraries are needed. All work is CSS and Astro component changes.

**Critical pre-condition:** The `astro.config.mjs` defines a font configuration (Cormorant Garamond + Sora) that is currently inert — no `<Font />` component is used anywhere. `global.css` `@theme static` declares `--font-display: "Spectral"` and `--font-sans: "Karla"`. CONTEXT.md locks the decision as Spectral + Karla + JetBrains Mono. The `astro.config.mjs` font block either needs to be updated to match the locked font decision or left as-is (since it is inert). Either way, the active fonts come from the Google Fonts `<link>` in `BaseLayout.astro` and the `@theme static` CSS variables. JetBrains Mono is not currently loaded — the `global.css` uses it as `--font-mono` but no `<link>` imports it. It must be added to the Google Fonts URL in `BaseLayout.astro`.

**Primary recommendation:** Rewrite `global.css` for the light-base theme in-place, update `BaseLayout.astro` to add JetBrains Mono to the Google Fonts URL, add a `<Nav />` component, add a `/leaderboard` page, and add a `<PodiumPreview />` component. All other pages get structural rewrites with new Tailwind utility classes referencing the updated design tokens.

---

## Standard Stack

### Core — no new libraries needed

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Astro | 6.1.3 (static) | Page rendering | Already in use; static output constraint unchanged |
| Tailwind CSS v4 | 4.2.x | Utility CSS via Vite plugin | Already in use; `@theme static` in global.css |
| Vanilla TypeScript | — | Client interactivity (`<script>` blocks) | Already in use; no framework components |

### Supporting — already present

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Google Fonts CDN | — | Spectral + Karla + JetBrains Mono | Loaded via `<link>` in `BaseLayout.astro`; add JetBrains Mono to existing URL |

### Alternatives NOT to pursue

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| CSS in `global.css` | Tailwind utility classes in markup | The site already uses a CSS component layer (`@layer components`) — keep using it for complex, stateful styles. Pure utility classes for layout is fine. |
| Google Fonts CDN | Astro font API (`fontProviders`) | The Astro font API is configured but inert; activating it would require adding `<Font />` component everywhere. Too risky mid-redesign. Keep the manual `<link>` approach. |
| Plain SVG `<img>` for logo | Inline SVG | The new logo (`public/logo.svg`) has hardcoded grayscale fill colors — it cannot be colored with `currentColor`. Use it as an `<img>` tag, not inline SVG. The existing `LogoMark.astro` (pine trees, path-based, uses `currentColor`) is a different file and can remain for backward compatibility. |

**Installation:** None required.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── components/
│   ├── Leaderboard.astro       — unchanged (Phase 9 delivered)
│   ├── LogoMark.astro          — unchanged (old abstract mark; kept for backward compat)
│   ├── Nav.astro               — NEW: fixed/sticky nav bar with logo + links
│   └── PodiumPreview.astro     — NEW: top-3-per-category podium for landing page
├── layouts/
│   └── BaseLayout.astro        — MODIFY: add JetBrains Mono to Google Fonts URL; remove page-noise div; add <Nav /> slot or direct import
├── pages/
│   ├── index.astro             — MODIFY: redesign all sections, add podium preview + Submit Results CTA
│   ├── leaderboard.astro       — NEW: dedicated /leaderboard page using <Leaderboard />
│   ├── submit.astro            — MODIFY: split-layout redesign
│   ├── submit-confirm.astro    — MODIFY: split-layout redesign
│   └── error.astro             — MODIFY: contextual auth error page redesign
└── styles/
    └── global.css              — MODIFY: full light-base theme rewrite
public/
└── logo.svg                    — EXISTING: new logo (pine cone grenade + crossed axes), grayscale
```

---

### Pattern 1: Light-Base Theme Rewrite in global.css

**What:** Replace the dark background `:root` with a light-base `:root`. Adapt all color tokens to work on white/light-gray backgrounds. The palette tokens in `@theme static` stay, but semantic usage in `:root` and `body` changes.

**Current state:** `--color-mist-50: #f2eee6` is the light cream used as primary text. Dark backgrounds use `--color-night-*` and `--color-fir-*` families. All card backgrounds are semi-transparent dark values.

**Target state:** `:root` background becomes white or `--color-mist-50` (`#f2eee6`). Body text becomes `--color-night-900` or darker. Accent colors (ember orange, gold, forest green) remain but become foreground/accent rather than background-level values. Drop the `page-noise` div and its CSS. Drop the `body::before` / `body::after` gradient overlays.

**Tailwind v4 pattern — redefining theme for light mode:**

```css
/* Source: https://tailwindcss.com/docs/theme */
/* @theme static is already in use — just update values */
@theme static {
  /* Existing tokens remain — just add new semantic ones if needed */
  --color-surface: #f5f2ec;       /* warm off-white base */
  --color-surface-raised: #ffffff; /* card/panel surface */
  --color-ink: #131c1a;           /* primary text = --color-night-900 */
  --color-ink-muted: #2f463d;     /* secondary text = --color-fir-700 */
}

@layer base {
  :root {
    color: var(--color-night-900);
    background: var(--color-surface, #f5f2ec);
    font-family: var(--font-sans);
    scroll-behavior: smooth;
    --page-gutter: clamp(1rem, 4vw, 3rem);
    --content-max: 82rem;
  }
}
```

**Key constraint — `@theme static`:** The current CSS uses `@theme static` (not `@theme`). This means all variables are emitted even when unused. New tokens can be added alongside existing ones without disrupting the current build. Do not switch to plain `@theme` — it would require verifying every token is referenced somewhere.

---

### Pattern 2: Navigation Bar

**What:** A `<Nav />` Astro component, imported directly into `BaseLayout.astro`. Fixed/sticky position, full width, contains: logo image, page links (event info, Leaderboard), "Submit Results" CTA button.

**How to implement sticky nav in Astro:**

```astro
---
// src/components/Nav.astro
// No server-side props needed — all links are static
---
<nav class="site-nav" aria-label="Site navigation">
  <div class="nav-inner">
    <a href="/" class="nav-logo" aria-label="Iron & Pine Omnium home">
      <img src="/logo.svg" alt="Iron & Pine Omnium logo" width="48" height="36" />
    </a>
    <ul class="nav-links" role="list">
      <li><a href="/#format">Rides</a></li>
      <li><a href="/leaderboard">Leaderboard</a></li>
    </ul>
    <a href="/submit" class="nav-cta primary-button">Submit Results</a>
  </div>
</nav>
```

**CSS pattern for sticky nav:**

```css
.site-nav {
  position: sticky;
  top: 0;
  z-index: 100;
  width: 100%;
  background: rgba(245, 242, 236, 0.92); /* --color-surface with alpha */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(19, 28, 26, 0.1);
}
```

**Critical nav pitfall:** `position: fixed` removes the nav from document flow, which pushes hero content under the nav. Using `position: sticky` on `<nav>` means it scrolls with the page until it reaches the top, then sticks. For a site-wide nav that is always visible on load, `sticky` with `top: 0` achieves the same as `fixed` but without layout flow problems. CONTEXT.md says "fixed/sticky" — both work; sticky is simpler in Astro static output.

---

### Pattern 3: Split Layout for Submit and Confirm Pages

**What:** Both `submit.astro` and `submit-confirm.astro` change from a centered card to a full-viewport split: left panel has bold branding/graphic, right panel has the form.

**Current state:** Both pages use a centered flex shell (`.submit-shell`, `.confirm-shell`) with a single card. The card's dark green background, dark border, and `fir-900` styling all go away.

**Split layout CSS pattern:**

```css
.split-shell {
  display: grid;
  min-height: 100svh;
}

@media (min-width: 760px) {
  .split-shell {
    grid-template-columns: 1fr 1fr;
  }
}

.split-brand {
  /* Left panel: photography + bold type overlay */
  position: relative;
  overflow: hidden;
  background: var(--color-night-900);
  padding: clamp(2rem, 6vw, 4rem);
}

.split-form {
  /* Right panel: light background, form */
  background: var(--color-surface-raised, #ffffff);
  padding: clamp(2rem, 6vw, 4rem);
  display: flex;
  flex-direction: column;
  justify-content: center;
}
```

**Mobile (375px) behavior:** Single column, brand panel condensed (shorter height, not full viewport tall) above the form. Use `min-height: 40vw` on `.split-brand` at mobile, not `min-height: 100svh`.

**Score preview placement (Claude's discretion):** The score preview (3 score cards) lives in the form panel (right side / below on mobile). This keeps the flow: arrive → see branding → scroll to form → see score preview → fill in name → submit. Putting it on the brand panel would require the user to look at two places simultaneously.

---

### Pattern 4: Form Input Styling

**What:** Replace the dark `fir-900` background inputs with light-base form styling. CONTEXT.md says Claude's discretion on exact style. Recommendation: borderless-bottom style (single bottom border, no full box) for bold/graphic direction — consistent with print-magazine aesthetic from reference brands.

```css
.form-field input,
.form-field select {
  width: 100%;
  box-sizing: border-box;
  padding: 0.75rem 0;
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--color-night-900);
  color: var(--color-night-900);
  font-family: var(--font-sans);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.15s ease;
  border-radius: 0;
}

.form-field input:focus,
.form-field select:focus {
  border-bottom-color: var(--color-ember-500);
}
```

**Why borderless-bottom:** Matches the "poster-like, editorial" aesthetic (Filson/Danner reference brands use open field forms). Visually lighter than boxed inputs on a light background.

---

### Pattern 5: Leaderboard Page (new route)

**What:** A new `src/pages/leaderboard.astro` page that uses the existing `<Leaderboard />` component. This page is the "full leaderboard" target. The landing page gets a `<PodiumPreview />` component for top-3.

**Implementation:** The full leaderboard page is simple — a `<BaseLayout>` wrapper + `<Nav />` + `<Leaderboard />`. The `<Leaderboard />` component already has all Phase 9 enhancements (search, mobile layout, sticky Rider column, per-component columns). No changes to `Leaderboard.astro` needed for Phase 10.

```astro
---
// src/pages/leaderboard.astro
import BaseLayout from "../layouts/BaseLayout.astro";
import Leaderboard from "../components/Leaderboard.astro";
---
<BaseLayout title="Leaderboard | Iron & Pine Omnium">
  <main class="page-shell">
    <!-- section heading + Leaderboard component -->
    <Leaderboard />
  </main>
</BaseLayout>
```

---

### Pattern 6: Podium Preview Component

**What:** A new `<PodiumPreview />` component on the landing page showing top 3 per category in a podium-style layout. Links to `/leaderboard` for full results.

**Data source:** Same as `Leaderboard.astro` — `loadAthleteResults()` and `scoreOmnium()` from `src/lib/`. Both are build-time only (static site), so the component runs at build time.

```astro
---
// src/components/PodiumPreview.astro
import { defaultScoringConfig, scoreOmnium } from "../lib/scoring";
import { loadAthleteResults } from "../lib/athlete-loader";

const { riders, hasLiveData } = loadAthleteResults();
const leaderboards = scoreOmnium(riders, defaultScoringConfig);

// Get top 3 per category
const podiumData = leaderboards.map(board => ({
  categoryLabel: board.categoryLabel,
  categoryId: board.categoryId,
  top3: board.entries.slice(0, 3),
}));
---
```

---

### Pattern 7: Inline Validation Error Display

**What:** Submit page shows validation errors (wrong date, wrong athlete, wrong URL) as a banner at the top of the form panel, not as a subtle paragraph. The current `#submit-error` paragraph element becomes a styled banner.

**Decision from CONTEXT.md:** Bold and clear — strong color block or banner at top of form, impossible to miss.

```css
.submit-error-banner {
  display: none; /* shown via JS: el.style.display = 'block' */
  padding: 1rem 1.25rem;
  background: var(--color-ember-400);
  color: var(--color-night-975);
  font-weight: 600;
  font-size: 0.95rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
}
```

The `submit.astro` JavaScript already has `errorEl.hidden = false` — this pattern just needs the CSS class to be visually prominent.

---

### Anti-Patterns to Avoid

- **Keeping `page-noise` div:** CONTEXT.md explicitly says drop noise texture. Remove the `.page-noise` div from `BaseLayout.astro` and its CSS from `global.css`.
- **Keeping `body::before` / `body::after` gradient overlays:** These are dark-mode ambient effects. Remove with the dark theme.
- **Keeping `@keyframes drift` and floating elements:** CONTEXT.md says reduce motion to essentials. The `drift` animation was for a floating card effect — remove it.
- **Importing the new `logo.svg` as inline SVG:** The new logo has internal hardcoded fill colors (#444, #2b2b2b, etc.) — it is not a `currentColor` SVG. Use `<img src="/logo.svg">` in `Nav.astro`. Do not try to color it with CSS.
- **Adding the `<Font />` Astro component:** The Astro font API (configured in `astro.config.mjs`) is inert. Activating it would require adding `<Font />` in `BaseLayout.astro` head. Given the CONTEXT.md says keep Spectral + Karla + JetBrains Mono (not Cormorant Garamond + Sora), the correct resolution is to update `astro.config.mjs` to reference Spectral/Karla/JetBrains Mono OR simply update the Google Fonts `<link>` in `BaseLayout.astro` to add JetBrains Mono and leave the `astro.config.mjs` font block alone (since it's inert).
- **Creating a new leaderboard in the landing page preview with its own tab system:** The podium preview is just top-3 per category in a simple layout. The tab system lives on `/leaderboard`. Keep them separate.
- **Dark background for the hero section:** The current `.hero-section::before` has a dark overlay on a photo. Phase 10 wants photography-forward with bold type overlays — keep the photo, but the overall background is now light. The hero section can still use a photo with a light-to-transparent gradient treatment (not dark-to-transparent).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Font loading optimization | Custom font preload logic | Keep Google Fonts `<link>` + add JetBrains Mono to it | Already working; Astro font API would need `<Font />` component added |
| Dark/light mode toggle | JS class switcher + `prefers-color-scheme` | Not needed — Phase 10 is light mode only. No toggle. | Overscope; CONTEXT.md doesn't mention a mode toggle |
| Custom responsive nav JS | Framework router | Static `<a>` tags with `position: sticky` CSS | Site is static; no client-side routing needed |
| Podium trophy icons | SVG icon library | Unicode characters (1st/2nd/3rd) or CSS counter-styled divs | No icon library in the stack; keep zero-dependency |
| Scroll-to-section JS | IntersectionObserver | HTML anchor links (`href="#leaderboard"`) | Already used in current `index.astro`; keep the pattern |

**Key insight:** This phase is entirely CSS and HTML restructuring. The one genuinely new thing is a `<Nav />` Astro component and a `leaderboard.astro` page. Everything else is rewriting existing page styles.

---

## Common Pitfalls

### Pitfall 1: Font Discrepancy — astro.config.mjs vs global.css

**What goes wrong:** `astro.config.mjs` configures Cormorant Garamond + Sora as `--font-display` and `--font-sans`. `global.css` `@theme static` sets `--font-display: "Spectral"` and `--font-sans: "Karla"`. If the `<Font />` component were added, the CSS variable would be overwritten by the Astro font system, making Spectral/Karla inaccessible.

**Why it happens:** The astro.config.mjs appears to be a leftover from earlier planning that predates the CONTEXT.md decision to keep Spectral/Karla.

**How to avoid:** The safe resolution for Phase 10 is to update `astro.config.mjs` to either (a) remove the fonts block entirely (Google Fonts link in BaseLayout handles it), or (b) update it to reference Spectral/Karla/JetBrains Mono so it matches the locked decision — but without adding a `<Font />` component yet. Do not add `<Font />` to `BaseLayout.astro` unless explicitly planned, as it would inject CSS variables that override the `@theme static` declarations.

**Warning signs:** If you see Cormorant Garamond or Sora rendering in the browser instead of Spectral/Karla, the Astro font API has been activated accidentally.

---

### Pitfall 2: Sticky Nav Obscuring Anchor Links

**What goes wrong:** The nav is `position: sticky` and occupies ~64px of vertical space. Existing anchor links (`href="#leaderboard"`, `href="#format"`) will scroll to the section but the heading will appear behind the nav.

**Why it happens:** Browser anchor scroll does not account for sticky headers by default.

**How to avoid:** Add `scroll-margin-top` to anchor target sections:

```css
/* In global.css */
#leaderboard,
#format {
  scroll-margin-top: 72px; /* nav height + 8px buffer */
}
```

**Warning signs:** Clicking "How the weekend works" scrolls to the right position but the heading is cut off behind the nav bar.

---

### Pitfall 3: Light Background Breaking Leaderboard Table Styles

**What goes wrong:** The leaderboard table has many hardcoded dark values — `--color-night-950` for sticky column backgrounds, `rgba(242, 238, 230, 0.05)` for borders (invisible on light backgrounds), `rgba(11, 16, 15, 0.54)` for card backgrounds. These all assume a dark base.

**Why it happens:** The `Leaderboard.astro` component and its styles in `global.css` were built for dark mode.

**How to avoid:** The leaderboard on `/leaderboard` page can live inside a dark-background section shell even on an otherwise light site. This is a valid design pattern (Filson uses light pages with dark "feature" sections). Alternatively, update all leaderboard CSS for light backgrounds. The first approach (dark section shell around leaderboard) is far less risky since it requires only a wrapper class change, not touching the leaderboard component itself.

**Recommended approach:** Wrap `<Leaderboard />` in a `<div class="dark-section">` that reapplies dark background — leaderboard styles remain untouched. Same wrapper on the landing page podium preview section.

```css
.dark-section {
  background: var(--color-night-900);
  color: var(--color-mist-50);
  padding: clamp(2rem, 6vw, 4rem) var(--page-gutter);
}
```

---

### Pitfall 4: Logo.svg Viewport Ratio

**What goes wrong:** `public/logo.svg` has `viewBox="0 0 1294 966"` — a 4:3 landscape ratio. If used in nav with `width: 48px` and no explicit `height`, the browser may render it oddly.

**Why it happens:** The SVG was exported at the illustrator canvas size, not cropped to content.

**How to avoid:** Always set both `width` and `height` when using the logo in `<img>` tags. Or use CSS `width`/`height` with `object-fit: contain`. Example: `<img src="/logo.svg" width="64" height="48" style="object-fit: contain;" />`. Inspect the actual visual bounds of the logo content within the 1294×966 canvas to determine the correct display aspect ratio.

---

### Pitfall 5: Scoped Button Styles Overriding Global Styles

**What goes wrong:** `submit.astro` and `submit-confirm.astro` have `<style>` blocks that define `.primary-button` and `.secondary-button` locally. In Astro, component `<style>` blocks are scoped. But these pages also use `.primary-button` from `global.css`. If the scoped style's specificity conflicts with the global style during the redesign, button appearance breaks inconsistently.

**Why it happens:** The scoped `<style>` in each page was created as a fallback for global styles that weren't accessible at page level. Both styles define `.primary-button`.

**How to avoid:** During Phase 10, remove the scoped `.primary-button` and `.secondary-button` definitions from `submit.astro`, `submit-confirm.astro`, and `error.astro`. Rely solely on `global.css` for button styles. This is safe because `global.css` is imported in `BaseLayout.astro` which all pages use.

---

### Pitfall 6: `@keyframes rise` Animation on All Page-Shell Children

**What goes wrong:** The current CSS has `.page-shell > * { animation: var(--animate-rise); }`. With a nav bar added to `BaseLayout.astro`, if the nav is inside `.page-shell`, it will also animate on page load (fade in from below), which looks wrong for a fixed navigation element.

**Why it happens:** The selector `.page-shell > *` is too broad — it targets all direct children.

**How to avoid:** Either remove the blanket rise animation from `.page-shell > *` and apply it selectively to hero sections and content sections only, or place `<Nav />` outside of `.page-shell` (in `BaseLayout.astro` `<body>` directly, before `<slot />`).

---

## Code Examples

### Google Fonts URL with JetBrains Mono added

```html
<!-- Source: Google Fonts documentation — fonts.google.com -->
<!-- In src/layouts/BaseLayout.astro <head> -->
<link
  href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Karla:wght@400;500;600;700&family=Spectral:wght@400;500;600;700&display=swap"
  rel="stylesheet"
/>
```

Remove the existing manual `<link>` and replace with the above (adds JetBrains Mono). Also remove the `<link rel="preconnect">` pairs — they are already correct.

---

### Light-base :root (replaces current dark-mode :root)

```css
/* Source: Tailwind v4 docs + codebase read */
/* In global.css @layer base */
@layer base {
  :root {
    color: var(--color-night-900);
    background: #f5f2ec; /* warm off-white base */
    font-family: var(--font-sans);
    scroll-behavior: smooth;
    --page-gutter: clamp(1rem, 4vw, 3rem);
    --content-max: 82rem;
  }

  body {
    margin: 0;
    min-height: 100vh;
    overflow-x: hidden;
    color: var(--color-night-900);
    font-family: var(--font-sans);
    line-height: 1.65;
    -webkit-font-smoothing: antialiased;
  }

  /* Remove: body::before, body::after gradient overlays */
  /* Remove: .page-noise component */
  /* Remove: @keyframes drift */
}
```

---

### Scroll margin for sticky nav anchor links

```css
/* Source: MDN Web Docs — scroll-margin-top */
/* In global.css @layer base */
[id] {
  scroll-margin-top: 72px;
}
```

This covers all anchor targets site-wide without listing each individually.

---

### Dark section wrapper for leaderboard

```css
/* In global.css @layer components */
.section-dark {
  background: var(--color-night-900);
  color: var(--color-mist-50);
}

.section-dark .eyebrow,
.section-dark h2,
.section-dark p {
  /* Override any inherited light-mode text colors */
  color: inherit;
}
```

Use as: `<section class="section-dark"><Leaderboard /></section>`.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Dark background page shell | Light base with dark section accents | Phase 10 | All card/panel backgrounds need audit |
| Floating `.page-noise` div | Clean backgrounds | Phase 10 | Remove div and CSS |
| No navigation bar | Fixed/sticky nav with logo + links | Phase 10 | Add `<Nav />` component, `BaseLayout.astro` update |
| Leaderboard only on landing page | Landing page podium preview + `/leaderboard` full page | Phase 10 | New page + new component |
| Inline error messages (subtle paragraph) | Bold error banner at form top | Phase 10 | CSS class change in `submit.astro` |

**Deprecated/outdated (from prior phases):**
- `@keyframes drift` + floating card: Remove per CONTEXT.md "reduce motion to essentials"
- `page-noise` background-image SVG filter: Remove per CONTEXT.md "drop noise texture"
- Dark card backgrounds (`.signal-card`, `.manifesto-card`, etc.) with `backdrop-filter: blur(10px)`: Replace with light surfaces and shadows

---

## Open Questions

1. **Logo SVG visual bounds**
   - What we know: `public/logo.svg` viewBox is `0 0 1294 966` (landscape). The SVG is large but the content (pine cone grenade + crossed axes) may occupy a subset of that canvas.
   - What's unclear: The exact aspect ratio of the logo content within the canvas — needed to set correct `width`/`height` on `<img>` tags without cropping.
   - Recommendation: Planner should instruct the implementer to visually inspect the logo at `<img src="/logo.svg" style="max-width:200px">` first and determine correct display dimensions before wiring into Nav.

2. **Hero section treatment on light background**
   - What we know: CONTEXT.md says "photography-forward — big hero images with bold type overlays and strong graphic treatment." The current hero uses dark overlay on photo. Phase 10 wants light backgrounds.
   - What's unclear: Does the hero section remain photo-with-dark-overlay (a common pattern on light-background sites with dark hero), or does it use a light-filtered photo treatment?
   - Recommendation: Keep the hero as a dark-overlay photo section (dark panel inside an otherwise light page). Reference brands (Danner, Filson) all use this pattern — dark atmospheric hero, then light content sections below. Document this clearly in plans.

3. **`astro.config.mjs` font block resolution**
   - What we know: The font block configures Cormorant Garamond + Sora as `--font-display` and `--font-sans` but is inert (no `<Font />` component used). CONTEXT.md locks Spectral + Karla + JetBrains Mono.
   - What's unclear: Whether to (a) update the astro.config.mjs to remove/replace the font block, or (b) leave it inert and only update the `<link>` in BaseLayout.
   - Recommendation: Update `astro.config.mjs` to remove the fonts block entirely to avoid confusion. Keep the Google Fonts `<link>` approach. This is a one-line change with zero risk.

4. **Podium preview: empty state**
   - What we know: When `hasLiveData` is false, the leaderboard shows an empty state message.
   - What's unclear: Should the landing page podium preview section be hidden entirely when there is no data, or should it show a placeholder?
   - Recommendation: Show a placeholder ("Leaderboard opens after submissions begin") rather than hiding the section. Hiding it would make the landing page layout shift at launch time.

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `global.css`, `BaseLayout.astro`, `index.astro`, `submit.astro`, `submit-confirm.astro`, `error.astro`, `Leaderboard.astro`, `LogoMark.astro`, `astro.config.mjs`, `package.json`, `public/logo.svg` (header), `public/images/` listing
- Tailwind CSS v4 docs — https://tailwindcss.com/docs/theme — `@theme` directive, `@theme static`, CSS variable namespace, light/dark switching
- Phase 9 RESEARCH.md — confirmed stack, leaderboard component structure, sticky column implementation

### Secondary (MEDIUM confidence)
- Astro 6 fonts API — https://docs.astro.build/en/reference/experimental-flags/fonts/ — confirms `cssVariable` pattern, confirms `<Font />` component required to activate
- WebSearch: Astro 6 font providers (multiple sources confirm API is now stable; activation requires `<Font />` component)

### Tertiary (LOW confidence)
- WebSearch: Tailwind v4 light/dark theme patterns — general CSS variable switching guidance (verified against official docs above)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json and codebase
- Architecture / file structure: HIGH — based on direct codebase read
- Font discrepancy finding: HIGH — read from both astro.config.mjs and global.css directly
- Tailwind @theme static patterns: HIGH — verified against official docs
- Logo aspect ratio: LOW — file is too large to fully parse; visual inspection needed
- Hero treatment: MEDIUM — inferred from reference brand analysis in CONTEXT.md, not confirmed against a spec

**Research date:** 2026-04-08
**Valid until:** 2026-05-08 (30 days — stable domain)
