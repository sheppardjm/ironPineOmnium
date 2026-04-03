# Testing Patterns

**Analysis Date:** 2026-04-02

## Test Framework

**Runner:**
- Not configured - No test runner found in project
- No test dependencies in `package.json` (Vitest, Jest, Mocha not present)
- No test configuration files (`vitest.config.ts`, `jest.config.js`, etc.)

**Assertion Library:**
- Not applicable - testing infrastructure not set up

**Run Commands:**
```bash
npm run dev              # Development server (Astro)
npm run build            # Build static site
npm run preview          # Preview built output
npm run check            # TypeScript/Astro type checking
```

**Type Checking Only:**
- `astro check` validates Astro components and TypeScript compilation
- `typescript` dev dependency for language support
- `@astrojs/check` for Astro-specific type checking

## Test File Organization

**Current State:**
- No test files exist in `src/` directory
- No test fixtures or factory functions
- No test data separate from application data
- Sample data used for demonstration: `src/lib/sample-data.ts`

**Testing Approach:**
- Currently manual/exploratory testing only
- Sample riders in `src/lib/sample-data.ts` serve as test data
- UI verification through Astro preview and static site build output

## Testable Modules

**Pure Functions (Candidates for Testing):**

**`src/lib/scoring.ts`** - Core business logic
- `scoreOmnium()` - Main scoring orchestrator
- `scoreCategory()` - Category-specific scoring (private helper)
- `roundScore()` - Score rounding (private helper)
- `sum()` - Array summation (private helper)
- `formatDuration()` - Time formatting utility

**`src/lib/types.ts`** - Type definitions
- Enum-like structures: `categoryIds as const`
- Discriminated unions: `CategoryId` type
- Data model interfaces with clear contracts

**`src/lib/sample-data.ts`** - Could be factored into test fixtures

## Recommended Testing Strategy

**Priority Modules (if testing implemented):**

1. **Scoring Logic** (`src/lib/scoring.ts`)
   - Unit tests for `scoreOmnium()` with various rider datasets
   - Edge cases: single rider, tied scores, zero KOM points
   - Benchmark calculation correctness
   - Sorting algorithm validation
   - Score formatting (decimal places)

2. **Data Formatting** (`src/lib/scoring.ts::formatDuration`)
   - Time string generation: hours:minutes:seconds format
   - Padding behavior (leading zeros)
   - Edge cases: 0 seconds, 1 second, 3599 seconds, 36000+ seconds

3. **Type Contracts** (`src/lib/types.ts`)
   - Verify discriminated unions work correctly
   - Category label mapping completeness

## Current State Assessment

**What's Not Tested:**
- All business logic in `src/lib/scoring.ts`
- Component rendering and interactivity in `.astro` files
- Client-side JavaScript in `src/components/Leaderboard.astro` (lines 113-140)
- Data aggregation pipeline
- CSS styling and layout

**Structural Risk Areas Without Tests:**
- Scoring algorithm could regress silently (highest impact)
- Sorting tiebreaker logic fragile to changes
- Component prop drilling and data flow unclear
- Event listener logic in Leaderboard tabs

**Known Gaps:**
- No integration tests for full scoring pipeline
- No E2E tests for user interactions (tab switching, filtering)
- No visual regression testing
- No accessibility testing

## Testing Infrastructure Requirements

**If Adding Testing:**

1. **Test Runner Setup**
   ```bash
   npm install -D vitest @vitest/ui
   # or
   npm install -D jest ts-jest @types/jest
   ```

2. **Configuration File** (if using Vitest)
   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config'
   export default defineConfig({
     test: {
       globals: true,
       environment: 'node',
     },
   })
   ```

3. **Test File Location**
   - Recommended: Co-located pattern `src/lib/scoring.test.ts` alongside `src/lib/scoring.ts`
   - Alternative: Separate `tests/` directory with mirrored structure

4. **Package.json Scripts**
   ```json
   {
     "test": "vitest",
     "test:ui": "vitest --ui",
     "test:coverage": "vitest --coverage"
   }
   ```

## Example Test Structure (If Implemented)

**Pattern for Pure Functions:**
```typescript
import { describe, it, expect } from 'vitest'
import { scoreOmnium, formatDuration } from './scoring'
import type { RiderResult, ScoringConfig } from './types'

describe('scoreOmnium', () => {
  it('should calculate scores for multiple categories', () => {
    const riders: RiderResult[] = [
      // Test data
    ]
    const result = scoreOmnium(riders)
    expect(result).toHaveLength(3) // men, women, non-binary
  })

  it('should handle edge case: zero KOM points', () => {
    // Test when highestKomPoints === 0
  })
})

describe('formatDuration', () => {
  it('should format seconds as HH:MM:SS', () => {
    expect(formatDuration(3661)).toBe('01:01:01')
  })

  it('should pad single digits with zeros', () => {
    expect(formatDuration(61)).toBe('00:01:01')
  })
})
```

**Pattern for Astro Components (if needed):**
```typescript
// With @astrojs/testers or astro-test-utils
import { render } from 'astro-test-utils'
import Leaderboard from './Leaderboard.astro'

describe('Leaderboard', () => {
  it('should render with default props', async () => {
    const html = await render(Leaderboard)
    expect(html).toContain('Overall winners')
  })
})
```

## Accessibility Testing Opportunities

**Not Currently Tested:**
- Tab list keyboard navigation (Leaderboard component, lines 19-32)
- ARIA roles validation (`role="tab"`, `role="tabpanel"`)
- Focus management for tab switching
- Color contrast for accessibility
- Image alt text correctness

---

*Testing analysis: 2026-04-02*

**Note:** This codebase would benefit from establishing a testing foundation, particularly for the scoring logic in `src/lib/scoring.ts` which is the core business domain. Start with unit tests for pure functions, then expand to integration tests for the scoring pipeline.
