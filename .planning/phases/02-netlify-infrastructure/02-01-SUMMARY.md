---
phase: 02-netlify-infrastructure
plan: 01
subsystem: infra
tags: [netlify, netlify-cli, netlify-functions, toml, gitignore, typescript]

# Dependency graph
requires:
  - phase: 01-compliance-and-prerequisites
    provides: RiderResult type, sample-data, Leaderboard component, global.css, scoring logic
provides:
  - netlify.toml with build, functions, redirects, and dev server config
  - netlify/functions/health.js smoke-test endpoint using v1 ESM syntax
  - netlify-cli devDependency and netlify:dev script
  - .gitignore updated with .netlify and .env
  - RiderResult.hometown removed from all downstream files
affects:
  - 02-02 (netlify dev verification depends on these files)
  - 03-strava-oauth (functions directory established)
  - all phases using Netlify Functions

# Tech tracking
tech-stack:
  added: [netlify-cli@24.10.0]
  patterns:
    - Netlify Functions v1 ESM syntax (export const handler — NOT export default)
    - /api/* redirected to /.netlify/functions/:splat via netlify.toml
    - Health function reports boolean presence of all required env vars

key-files:
  created:
    - netlify.toml
    - netlify/functions/health.js
  modified:
    - package.json
    - pnpm-lock.yaml
    - .gitignore
    - src/lib/types.ts
    - src/lib/sample-data.ts
    - src/components/Leaderboard.astro
    - src/styles/global.css

key-decisions:
  - "v1 ESM handler syntax confirmed: export const handler (not export default, not exports.handler)"
  - "health.js maps all 8 required env vars to boolean presence — enables runtime verification in 02-02"

patterns-established:
  - "Netlify Functions v1 ESM: export const handler = async (event, context) => { ... }"
  - "Env var presence check: typeof process.env[key] === 'string' && process.env[key].length > 0"

# Metrics
duration: 8min
completed: 2026-04-06
---

# Phase 2 Plan 01: Netlify Infrastructure Foundation Summary

**netlify.toml with /api/* redirect, ESM v1 health function checking 8 env vars, netlify-cli installed, and RiderResult.hometown removed from all files**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-06T15:19:40Z
- **Completed:** 2026-04-06T15:28:02Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments

- Created netlify.toml routing /api/* to /.netlify/functions/:splat — the redirect all function phases depend on
- Created netlify/functions/health.js using correct v1 ESM `export const handler` syntax with env var presence reporting
- Installed netlify-cli 24.10.0 as devDependency and added `netlify:dev` script
- Removed RiderResult.hometown from types.ts, all 12 sample-data objects, Leaderboard.astro (2 usages), and global.css (2 selector rules)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create netlify.toml and smoke-test function** - `5e2729c` (feat)
2. **Task 2: Add netlify-cli, update scripts, update .gitignore, remove hometown** - `111077e` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `netlify.toml` - Netlify build config with /api/* redirect, functions dir, and dev server targeting port 4321/8888
- `netlify/functions/health.js` - Smoke-test endpoint; reports boolean presence of 8 required env vars
- `package.json` - Added netlify-cli devDependency and netlify:dev script
- `pnpm-lock.yaml` - Updated lockfile for netlify-cli 24.10.0
- `.gitignore` - Added .netlify and .env
- `src/lib/types.ts` - Removed RiderResult.hometown field
- `src/lib/sample-data.ts` - Removed hometown from all 12 sampleRiders objects
- `src/components/Leaderboard.astro` - Removed hometown from winner-meta p tag and table rider cell
- `src/styles/global.css` - Removed .rider-hometown from mist-200 color rule and deleted standalone rule block

## Decisions Made

- v1 ESM handler syntax confirmed as the correct pattern for this project: `export const handler = async (event, context) => { ... }`. The comment in health.js documents why `export default` (v2) is forbidden — v2 has a confirmed env var bug.
- Health function boolean-maps all 8 env vars so Plan 02-02 can verify runtime injection from the API response body without needing `netlify env:list`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- **pnpm approve-builds prompt:** After installing netlify-cli, pnpm showed an interactive `approve-builds` prompt for build scripts (esbuild, @parcel/watcher, etc.). This prompt cannot be answered non-interactively. The install completed successfully and netlify-cli is listed as a devDependency. The build scripts will be approved on first run via `pnpm approve-builds` if needed. This does not block netlify dev or function execution.
- **Node.js version:** The shell environment runs Node 20, but the project requires Node >=22.12.0. Build verification used `volta run --node 22.22.2 pnpm run build` and succeeded. Volta is configured in package.json and handles this automatically for normal development use.

## User Setup Required

None - no external service configuration required in this plan. Env var configuration is handled in Plan 02-02.

## Next Phase Readiness

- All Netlify file infrastructure in place for Plan 02-02 (netlify dev setup and env var wiring)
- health.js is ready to receive env vars and report presence — Plan 02-02 will verify this
- Functions directory established and correctly referenced in netlify.toml
- No blockers for 02-02

---
*Phase: 02-netlify-infrastructure*
*Completed: 2026-04-06*
