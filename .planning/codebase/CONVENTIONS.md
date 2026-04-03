# Coding Conventions

**Analysis Date:** 2026-04-02

## Naming Patterns

**Files:**
- TypeScript/JavaScript modules: `camelCase.ts` (e.g., `sample-data.ts`, `scoring.ts`)
- Astro components: `PascalCase.astro` (e.g., `Leaderboard.astro`, `LogoMark.astro`, `BaseLayout.astro`)
- Directory names: `kebab-case` (e.g., `sample-data` folder structure implied in paths like `src/lib/sample-data.ts`)

**Functions:**
- Exported functions: `camelCase` (e.g., `scoreOmnium`, `formatDuration`, `scoreCategory`)
- Helper/utility functions: `camelCase` (e.g., `roundScore`, `sum`)
- Single-word functions preferred when possible for clarity

**Variables:**
- Constants (non-function exports): `camelCase` (e.g., `defaultScoringConfig`, `sampleRiders`, `categoryIds`)
- Configuration objects: `camelCase` with `Config` suffix (e.g., `defaultScoringConfig`)
- Data arrays: plural `camelCase` (e.g., `sampleRiders`, `categoryIds`)
- Local scope: `camelCase` (e.g., `fastestDay1MovingTimeSeconds`, `scoredEntries`)
- Ternary branches and computed values: descriptive `camelCase` (e.g., `isActive`, `className`)

**Types:**
- Interfaces: `PascalCase` with no prefix (e.g., `RiderResult`, `ScoringConfig`, `ScoredRider`, `CategoryLeaderboard`)
- Type aliases: `PascalCase` (e.g., `CategoryId`)
- Const assertion for discriminated unions: use `as const` pattern (e.g., `categoryIds` with `(typeof categoryIds)[number]`)

**CSS Classes:**
- Block-element modifier (BEM-like pattern): `kebab-case` with `__` for nesting (e.g., `.rider-name`, `.rider-hometown`, `.rank-pill`, `.ride-frame__body`, `.ride-frame__label`)
- Utility variants: `kebab-case` with state prefix (e.g., `.is-active`, `.w-full`, `.justify-center`)
- Layout components: single-word blocks (e.g., `.page-shell`, `.hero-section`, `.content-section`, `.leaderboard-table`)
- Modifier variants: `--` prefix (e.g., `.ride-frame--feature`, `.ride-frame--conditions`, `.ride-frame--ride`, `.ride-frame--rough`)

## Code Style

**Formatting:**
- No explicit formatter configured (Prettier/ESLint not found in project)
- Follows TypeScript strict mode and Astro conventions
- Indentation appears to be 2 spaces (based on visible formatting)
- Semicolons used consistently throughout
- Quotes: double quotes in most contexts

**Linting:**
- `astro check` available for type checking Astro components
- TypeScript strict mode enabled: `"strict": true` in `tsconfig.json`
- `forceConsistentCasingInFileNames` enforced
- `verbatimModuleSyntax` enforced for explicit imports

**Import Organization:**
- Type imports separated with `import type` keyword (e.g., `import type { RiderResult } from "./types"`)
- Regular imports first, then type imports
- Path relative imports used (e.g., `../lib/scoring`, `../components/Leaderboard.astro`)
- No path aliases configured in `tsconfig.json`

## Error Handling

**Patterns:**
- Defensive math operations: check division by zero (e.g., `highestKomPoints === 0 ? 0 : rider.day2KomPoints / highestKomPoints` in `src/lib/scoring.ts`)
- Array operations use safe methods: `.map()`, `.filter()`, `.reduce()` with explicit accumulator
- No try-catch patterns found; focus on pure functions with default parameters
- Astro components use optional destructuring with defaults (e.g., `title = "Iron & Pine Omnium"` in `src/layouts/BaseLayout.astro`)

## Logging

**Framework:** No explicit logging framework
- Console methods not used in provided source files
- Application is static site generation focused

## Comments

**When to Comment:**
- Minimal comments in business logic; code is self-documenting via clear naming
- Type assertions with JSDoc comments (e.g., `/** @type {NodeListOf<HTMLButtonElement>} */` in `src/components/Leaderboard.astro`)
- Complex calculations may have inline clarifications (not demonstrated, but acceptable)

**JSDoc/TSDoc:**
- Used sparingly for DOM type hints in vanilla JavaScript
- No formal JSDoc blocks on functions (none observed in codebase)

## Function Design

**Size:** 
- Small, focused functions preferred (e.g., `roundScore`, `sum`, `formatDuration` all under 10 lines)
- Larger functions decomposed into smaller helpers (e.g., `scoreCategory` called from `scoreOmnium`)

**Parameters:**
- Use destructuring in component props (Astro: `const { class: className = "" } = Astro.props`)
- Required parameters passed positionally; optional parameters have defaults
- Record/object parameters named with semantic intent (e.g., `config: ScoringConfig`)

**Return Values:**
- Pure functions return new objects rather than mutate (e.g., `.map()` returns new array)
- Void functions used in event handlers (e.g., button click listener in `src/components/Leaderboard.astro` lines 123-137)
- Consistent return types with interfaces (e.g., `scoreOmnium` returns `CategoryLeaderboard[]`)

## Module Design

**Exports:**
- Named exports preferred (e.g., `export const defaultScoringConfig`, `export function scoreOmnium`)
- Mix of const and function exports in utility modules
- No default exports in library files

**Barrel Files:**
- Not used; imports are direct from source files (e.g., `import { scoreOmnium } from "../lib/scoring"`)
- Each module has single responsibility (types, scoring logic, data)

## Astro Component Conventions

**Structure:**
- Frontmatter `---` block contains logic and imports
- HTML/template follows frontmatter
- Inline `<script>` tags for client-side interactivity (vanilla JavaScript)
- Props interface defined in component: `interface Props { title?: string }`

**Data Binding:**
- Astro expressions in templates: `{variable}` for interpolation
- `class:list` directive for conditional classes (e.g., `class:list={["tab-button": true, "is-active": index === 0]}`)
- Array iteration with `.map()` for rendering lists

**Client Interactivity:**
- Vanilla JavaScript event listeners preferred (no framework)
- Data attributes for targeting: `data-target`, `data-panel` as query selectors
- Direct DOM manipulation with `classList.toggle()`, `setAttribute()`

## TypeScript Patterns

**Type Safety:**
- All function parameters and returns should have explicit types
- Use `interface` for object shapes (not `type`)
- Discriminated unions with `as const` for fixed strings
- `Record<K, V>` for maps (e.g., `Record<CategoryId, string>` for `categoryLabels`)

**Configuration:**
- Config objects as interfaces: `interface ScoringConfig`
- Export default configs with semantic naming: `export const defaultScoringConfig`
- Config objects are immutable patterns with readonly properties (implied via usage)

---

*Convention analysis: 2026-04-02*
