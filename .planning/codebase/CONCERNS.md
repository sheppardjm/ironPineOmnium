# Codebase Concerns

**Analysis Date:** 2026-04-02

## Security Considerations

**Hardcoded file:// URLs in companion site links:**
- Risk: Local file:// URLs in production code expose absolute system paths and will break when deployed to web hosting
- Files: `src/pages/index.astro` (lines 10, 17)
- Current state: Event links use hardcoded file:// URLs pointing to other local repositories:
  - `file:///Users/Sheppardjm/Repos/mkUltraGravel/dist/index.html`
  - `file:///Users/Sheppardjm/Repos/hiawathasRevenge/dist/index.html`
- Mitigation: These are placeholder URLs for development, but must be replaced with actual web URLs before deployment
- Recommendations: 
  - Extract companion site URLs to environment variables (`VITE_MKULTRA_URL`, `VITE_HIAWATHA_URL`)
  - Add validation to prevent hardcoded file:// paths in production builds
  - Document required environment configuration for deployment

## Test Coverage Gaps

**No test coverage for core logic:**
- What's not tested: All business logic in scoring engine and data handling
- Files: `src/lib/scoring.ts`, `src/lib/sample-data.ts`, `src/lib/types.ts`
- Risk: Scoring algorithm could produce incorrect results undetected; changes to tie-breaking logic have no regression protection
- Priority: High - Scoring is the core feature of the omnium

**No tests for interactive leaderboard component:**
- What's not tested: Tab switching, category selection, data filtering
- Files: `src/components/Leaderboard.astro` (lines 113-140 contain inline script for tab management)
- Risk: JavaScript interactions could break silently if component logic is modified
- Priority: High - Leaderboard is user-facing critical functionality

**No tests for data transformation edge cases:**
- What's not tested: Empty rider arrays, single category with no riders, tie-breaking scenarios, zero KOM points handling
- Files: `src/lib/scoring.ts` (lines 26, 36 handle special cases for KOM)
- Risk: Empty categories or edge case data could cause runtime errors or incorrect rankings
- Priority: Medium - Edge cases may not be common but would significantly impact experience

## Fragile Areas

**Scoring calculation has brittle tie-breaking logic:**
- Files: `src/lib/scoring.ts` (lines 47-65)
- Why fragile: Five levels of sequential tie-breaking rules with specific ordering requirements. Any modification to comparison logic could change rankings silently
- Tie-breaking order:
  1. Total score (highest)
  2. Sector score (highest)
  3. KOM score (highest)
  4. Sector total time (fastest)
  5. Day 1 moving time (fastest)
- Safe modification: Any changes to tie-breaking must include updated tests and rankings must be manually verified against expected results
- Test coverage: Zero - no test cases document expected tie-breaking behavior

**Sample data hardcoded in codebase:**
- Files: `src/lib/sample-data.ts`
- Why fragile: 12 sample riders with specific values used in production rendering. If sample data needs to change, no validation confirms data schema matches runtime expectations
- Risk: Adding/removing riders or changing data structure could break leaderboard rendering
- Safe modification: Create type-safe data factory/builder pattern before scaling to real data import

**Leaderboard tab switching uses untyped DOM manipulation:**
- Files: `src/components/Leaderboard.astro` (lines 113-140)
- Why fragile: Plain JavaScript selectors and manual DOM state management. No validation that data attributes match expected format
- Risk: CSS class name or data attribute changes would silently break tab functionality without TypeScript catching it
- Safe modification: Use Astro script scoping or migrate to proper component framework with type safety

**Image paths mixed between src and public directories:**
- Files: `src/pages/index.astro` (lines 59-86)
- Why fragile: Images referenced with `/images/` path in production code, but actual location varies during build. Broken image links would only be noticed in deployed site or production build
- Risk: Image optimization or path changes during Astro build could silently break image loading
- Safe modification: Document Astro's image handling expectations and use Astro's Image component for optimized loading

## Performance Bottlenecks

**Scoring algorithm runs synchronously for all riders on every render:**
- Problem: `scoreOmnium()` function is called for every page render, recalculating 12 riders × 3 categories each time
- Files: `src/components/Leaderboard.astro` (line 5)
- Cause: No caching or memoization; calculations run even though data is static (sample data)
- Current impact: Negligible at current scale (12 riders) but would become significant with real race data (100+ riders per category)
- Improvement path: 
  - Cache scored results when data is unchanged
  - For larger datasets, consider pre-computing scores at build time
  - Profile rendering performance once real data volume is known

**Large image files served without optimization:**
- Problem: Images in `/public/images/` are 0.4-2MB each, no size constraints or responsive variants
- Files: `src/pages/index.astro` (lines 59-86, image src references)
- Cause: No image optimization pipeline; Astro's Image component not used
- Improvement path:
  - Use Astro's Image component with automatic optimization
  - Define responsive sizes for different breakpoints
  - Implement lazy loading (already present via `loading="lazy"` but without other optimizations)

**No lazy loading configuration for Leaderboard component:**
- Problem: Tab panels are rendered upfront even though only first category is visible initially
- Files: `src/components/Leaderboard.astro` (lines 35-110)
- Cause: All three category leaderboards are in DOM but hidden; could be deferred until user selects category
- Current impact: Minimal; page loads three small tables regardless
- Improvement path: Render hidden panels on demand via JavaScript rather than server-side

## Scaling Limits

**Data import strategy undefined:**
- Current capacity: Hardcoded 12 sample riders
- Limit: No mechanism exists to import real race results from MK Ultra Gravel or Hiawatha's Revenge companion sites
- Impact: Cannot scale from sample data to actual event results
- Scaling path:
  1. Define API or data format for companion site results (CSV, JSON endpoint)
  2. Create data import pipeline in build process
  3. Add data validation to catch malformed results
  4. Document format requirements for race organizers

**No data versioning or audit trail:**
- Problem: Sample data has no version, source, or update tracking
- Impact: Cannot distinguish between different event runs or identify when results changed
- Scaling path: Add metadata fields (event ID, date, import timestamp) to rider data structure

**Missing real-time update capability:**
- Problem: Leaderboard is static HTML with no mechanism for live updates during races
- Impact: Page must be rebuilt and redeployed to show updated results
- Scaling path: Consider client-side data fetching from API endpoint if live updates needed

## Known Bugs

**Font configuration mismatch in CSS and config:**
- Problem: `astro.config.mjs` specifies "Cormorant Garamond" and "Sora" as Google fonts but CSS references "Spectral" and "Karla"
- Files: 
  - `astro.config.mjs` (lines 11-26)
  - `src/styles/global.css` (line 21)
- Symptoms: Fonts may not load correctly; fallback fonts will be used instead of requested fonts
- Impact: Visual design does not match intent; performance impact if Google Fonts doesn't serve requested families
- Status: Active - fonts are currently mismatched between build config and CSS

**Event links in two places reference same data redundantly:**
- Problem: `eventLinks` array is defined and then mapped in two different locations with slightly different styling context
- Files: `src/pages/index.astro` (lines 7-22, referenced at lines 167-174 and 238-246)
- Impact: Maintenance burden; updating links requires changes in single place but is duplicated across templates
- Workaround: Currently low impact due to small dataset, but would be error-prone with more events

## Dependencies at Risk

**Astro version pinned to 6.1.1:**
- Risk: Version is very recent (6.x major release); may have undiscovered issues
- Impact: Future bug fixes or security updates require explicit upgrade
- Status: Known risk; actively maintained project so updates will be available
- Monitoring: Watch Astro changelog for critical bug fixes before production launch

**No automated dependency updates configured:**
- Risk: Dependencies may have security vulnerabilities that go unnoticed
- Impact: Could expose site to security issues if dependencies are compromised
- Recommendation: Set up dependabot or renovate bot to alert on updates

**Tailwind CSS v4 uses new configuration system:**
- Risk: Relatively new Tailwind version; custom theme variables might have edge cases
- Files: `src/styles/global.css` (uses @theme static block which is new syntax)
- Impact: Custom color theme relies on newer Tailwind features that may change
- Mitigation: Keep Tailwind and @tailwindcss/vite in sync; test build output on updates

## Missing Critical Features

**No real data import mechanism:**
- Problem: Cannot transition from sample to production data; no documented process for race organizers to submit results
- Files: `src/lib/sample-data.ts` (hardcoded sample)
- Blocks: Live event results, real leaderboard generation, ability to run actual races
- Priority: Blocking - must be solved before first real event

**No data validation:**
- Problem: No schema validation for rider data; invalid times or scores could be silently accepted
- Files: `src/lib/types.ts` (types are defined but not validated at runtime)
- Blocks: Catching data entry errors; ensuring scoring calculation correctness
- Priority: High - prevent invalid results from affecting final standings

**No error handling for edge cases:**
- Problem: No handling for empty categories, riders with missing data, or malformed input
- Files: `src/lib/scoring.ts` (assumes all riders have valid numeric data)
- Blocks: Graceful degradation if data is incomplete
- Priority: Medium - unlikely with careful data entry but would crash if encountered

**No logging or debugging support:**
- Problem: Cannot see which riders are in which category or trace scoring calculations
- Impact: Difficult to debug scoring issues or verify results are correct
- Priority: Low for MVP but should be added before real events

---

*Concerns audit: 2026-04-02*
