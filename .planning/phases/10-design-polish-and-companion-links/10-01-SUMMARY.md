---
phase: 10-design-polish-and-companion-links
plan: 01
subsystem: ui
tags: [css, tailwind, astro, light-theme, navigation, jetbrains-mono, google-fonts]

requires:
  - phase: 09-leaderboard-enhancements
    provides: leaderboard component with sticky columns and mobile polish

provides:
  - Light-base CSS foundation with warm off-white (#f5f2ec) background and dark ink text
  - Semantic design tokens: --color-surface, --color-surface-raised, --color-ink, --color-ink-muted
  - .site-nav sticky navigation bar with logo, page links, Submit Results CTA
  - JetBrains Mono loaded via Google Fonts link in BaseLayout
  - .section-dark wrapper for leaderboard and dark-island sections
  - .split-shell / .split-brand / .split-form layout for submit/confirm pages
  - .form-field styles for light-mode form inputs
  - .submit-error-banner style for inline validation errors
  - Removed: page-noise, body::before/after gradients, @keyframes drift, inert fonts config block

affects:
  - 10-02 through 10-06 (all subsequent phase-10 plans depend on this light-base foundation)
  - submit.astro and submit-confirm.astro (form fields, split-shell layout)
  - index.astro and leaderboard.astro (section-dark wrapper for leaderboard)

tech-stack:
  added: [JetBrains Mono via Google Fonts]
  patterns:
    - "Light-base with dark islands: hero-section and ride-reel-section stay dark; content-section goes light"
    - "section-dark wrapper: pages wrap leaderboard in .section-dark to preserve dark leaderboard styles"
    - "Nav rendered outside .page-shell in body to skip rise animation"

key-files:
  created:
    - src/components/Nav.astro
  modified:
    - src/styles/global.css
    - src/layouts/BaseLayout.astro
    - astro.config.mjs

key-decisions:
  - "section-dark CSS class added so leaderboard styles remain untouched; pages apply the wrapper"
  - "primary-button inverted to dark bg on light page (was light on dark)"
  - "Hero section and ride-reel-section kept as dark islands (photography sections)"
  - "Nav uses position: sticky (not fixed) to avoid layout flow disruption"
  - "Logo img tag with empty alt + aria-label on anchor (SVG has hardcoded fills)"
  - "astro.config.mjs fonts block removed (was inert — no <Font /> component used)"

patterns-established:
  - "Dark buttons on light page: .primary-button uses --color-night-900 bg"
  - "Section dividers: border-top: 1px solid rgba(19,28,26,0.06) on .content-section"
  - "Sticky nav height ~72px; [id] scroll-margin-top: 72px prevents anchor overlap"

duration: 4min
completed: 2026-04-08
---

# Phase 10 Plan 01: Foundation Light Theme Summary

**Converted site from dark-green/black to warm off-white light base with sticky nav, JetBrains Mono, and cleaned CSS — removing page-noise, body gradients, and drift animation**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-08T14:53:21Z
- **Completed:** 2026-04-08T14:57:50Z
- **Tasks:** 2
- **Files modified:** 4 (global.css, BaseLayout.astro, Nav.astro created, astro.config.mjs)

## Accomplishments
- Rewrote global.css: light :root background, dark ink text, new semantic tokens, all dark-mode artifacts removed
- Created Nav.astro sticky navigation bar with logo, Rides + Leaderboard links, Submit Results CTA
- Added JetBrains Mono to Google Fonts URL in BaseLayout.astro; removed page-noise div
- Cleaned astro.config.mjs: removed inert fonts block (Cormorant Garamond + Sora) and fontProviders import
- Added .section-dark wrapper, .split-shell layout, .form-field styles, .submit-error-banner — all needed by later plans

## Task Commits

1. **Task 1: Rewrite global.css for light-base theme** - `112edef` (feat)
2. **Task 2: Nav component, JetBrains Mono, clean astro.config** - `e307e56` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/styles/global.css` - Light-base theme: --color-surface tokens, .site-nav, .section-dark, .split-shell, .form-field styles; drift/noise/gradients removed
- `src/components/Nav.astro` - Sticky nav with logo, Rides/Leaderboard links, Submit Results CTA
- `src/layouts/BaseLayout.astro` - JetBrains Mono added to fonts URL, Nav imported and rendered, page-noise div removed
- `astro.config.mjs` - Removed fonts block and fontProviders import; vite/tailwind config unchanged

## Decisions Made
- `section-dark` CSS wrapper added so leaderboard dark styles remain untouched; index.astro and leaderboard.astro will apply `.section-dark` to their leaderboard containers in later plans
- `primary-button` inverted to `background: var(--color-night-900)` + `color: var(--color-mist-50)` since site is now light
- Hero and ride-reel sections kept dark (photography sections — Danner/Filson pattern)
- Nav uses `position: sticky` (not fixed) to preserve normal layout flow
- Logo `<img>` with empty alt text; accessible name on wrapping `<a>` via `aria-label`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added dark-context overrides for hero buttons**
- **Found during:** Task 1 (global.css rewrite)
- **Issue:** Plan updated `.secondary-button` and `.inline-link` to light bg, but these classes appear inside `.hero-section` (dark) where light-on-dark styling is still needed
- **Fix:** Added `.hero-section .secondary-button`, `.hero-section .inline-link`, `.section-dark .secondary-button` etc. overrides to restore dark-context styles in dark island sections
- **Files modified:** src/styles/global.css
- **Verification:** Build succeeds; hero button styles correct in dark context
- **Committed in:** 112edef (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correctness — without the override, hero CTA buttons would be invisible (dark text on dark background). No scope creep.

## Issues Encountered
None — both builds succeeded on first attempt.

## Next Phase Readiness
- Light-base theme complete; all subsequent plans can build on this foundation
- .section-dark, .split-shell, .form-field, .submit-error-banner pre-built for plans 10-02 through 10-06
- Nav component rendering on all pages; links point to /#format, /leaderboard, /submit
- index.astro and leaderboard.astro still need .section-dark applied to leaderboard containers (planned in later tasks)

---
*Phase: 10-design-polish-and-companion-links*
*Completed: 2026-04-08*
