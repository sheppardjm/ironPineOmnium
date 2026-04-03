# Architecture

**Analysis Date:** 2026-04-02

## Pattern Overview

**Overall:** Static site generator with component-driven templating

**Key Characteristics:**
- Astro-based static site generation with zero runtime JavaScript by default
- File-based routing (pages become routes automatically)
- Component-based layout system (Astro components, not client-side frameworks)
- Data/logic separation: core business logic in TypeScript utilities, rendering in Astro templates
- Scoring engine decoupled from UI layer
- Static HTML output with minimal interactivity using vanilla JavaScript

## Layers

**Presentation Layer (Pages & Layouts):**
- Purpose: Render HTML pages and define page structure
- Location: `src/pages/`, `src/layouts/`
- Contains: Astro page templates, layout wrappers, component composition
- Depends on: Components, utility functions from `src/lib/`
- Used by: Browser (static HTML output)

**Component Layer:**
- Purpose: Reusable UI components (Astro components, not hydrated)
- Location: `src/components/`
- Contains: Leaderboard table, LogoMark SVG, form elements
- Depends on: `src/lib/` for data processing and types
- Used by: Pages and layouts

**Business Logic Layer:**
- Purpose: Core scoring calculations, data types, and sample data
- Location: `src/lib/`
- Contains: Scoring engine (`scoring.ts`), type definitions (`types.ts`), sample data (`sample-data.ts`)
- Depends on: TypeScript, native JavaScript only
- Used by: Components and pages

**Styling Layer:**
- Purpose: Global styles, design tokens, and Tailwind configuration
- Location: `src/styles/`, `astro.config.mjs`
- Contains: CSS custom properties, animations, Tailwind directives
- Depends on: Tailwind CSS via Vite plugin
- Used by: All pages and components

## Data Flow

**Page Render Flow:**

1. User requests `/` or builds static site
2. Astro processes `src/pages/index.astro`
3. Page component imports `Leaderboard.astro` and `LogoMark.astro`
4. Leaderboard calls `scoreOmnium(sampleRiders, defaultScoringConfig)` from `src/lib/scoring.ts`
5. Sample rider data loaded from `src/lib/sample-data.ts`
6. Scoring engine computes category leaderboards with benchmarks
7. Components render HTML with scored data
8. Page is wrapped in `BaseLayout` which includes global styles and meta tags
9. Static HTML is generated to `dist/` during build

**State Management:**
- No client-side state management (static site)
- Scoring state computed at build time, baked into HTML
- Leaderboard tab switching uses vanilla JavaScript with data attributes (client-side DOM manipulation only)
- Sample data is hardcoded and used for pre-computed results

## Key Abstractions

**Scoring Engine:**
- Purpose: Calculate omnium scores across three categories (men, women, non-binary)
- Examples: `src/lib/scoring.ts`, exported functions `scoreOmnium()`, `scoreCategory()`
- Pattern: Pure functions that transform rider data into leaderboards with benchmarks

**Rider Result Type:**
- Purpose: Represent immutable rider performance data
- Examples: `src/lib/types.ts` - `RiderResult` interface
- Pattern: Strict TypeScript interfaces for type safety

**Category Leaderboard:**
- Purpose: Group scored riders, store benchmarks, and categorize by gender
- Examples: `src/lib/types.ts` - `CategoryLeaderboard` interface
- Pattern: Aggregated scored riders with category metadata and computed benchmarks

**Astro Component Pattern:**
- Purpose: Server-rendered, static components with no hydration overhead
- Examples: `src/components/Leaderboard.astro`, `src/layouts/BaseLayout.astro`
- Pattern: Astro files with TypeScript frontmatter for logic, JSX-like syntax for templates, minimal inline JavaScript for interactivity

## Entry Points

**Main Page:**
- Location: `src/pages/index.astro`
- Triggers: Browser request to `/` or root path
- Responsibilities: Render full omnium landing page with hero section, event details, scoring explanation, leaderboard, route cards, and footer CTAs

**Build Entry:**
- Location: `astro.config.mjs`
- Triggers: `npm run build` or `npm run dev`
- Responsibilities: Configure Astro build, Tailwind integration, Google Font providers, static output mode

## Error Handling

**Strategy:** None explicit (static site generation). All errors surface during build time.

**Patterns:**
- TypeScript strict mode catches type errors at build time
- Astro check command (`npm run check`) validates component files
- Sample data provided with known good values to prevent runtime scoring errors
- No try/catch blocks needed; scoring functions assume valid input

## Cross-Cutting Concerns

**Logging:** None - static site with no server-side logging. Console output available in browser devtools for client-side script debugging.

**Validation:** TypeScript strict mode and explicit type definitions enforce data shape. Sample data validated during build process.

**Authentication:** Not applicable - static public site with no user accounts or login.

---

*Architecture analysis: 2026-04-02*
