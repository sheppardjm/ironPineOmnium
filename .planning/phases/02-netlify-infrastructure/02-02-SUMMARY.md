---
phase: 02-netlify-infrastructure
plan: 02
subsystem: infra
tags: [netlify, netlify-functions, netlify-cli, esbuild, astro, env-vars, health-endpoint]

# Dependency graph
requires:
  - phase: 02-01
    provides: netlify.toml, health.js function with v1 ESM handler syntax, netlify-cli dependency
provides:
  - Verified netlify dev local workflow (Astro on 4321, proxy on 8888)
  - /api/health returning 200 with all 8 env vars confirmed true locally
  - Deployed Netlify draft preview with /api/health returning 200 with all 8 env vars confirmed true (ROADMAP SC-3)
  - All 8 env vars wired from .env (local) and Netlify dashboard (deployed)
affects:
  - 02-03 (Strava OAuth functions can rely on env var pattern)
  - 02-04 (GitHub write function can rely on GITHUB_TOKEN env var)
  - All subsequent phases using netlify functions

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "volta run --node 22.22.2 npx netlify dev is required to get Node 22 (Volta-managed) instead of system Node 20"
    - "esbuild override to 0.27.7 resolves darwin-arm64 binary version mismatch with netlify-cli internals"
    - "NETLIFY_BUILD_HOOK set via netlify env:set CLI (not just .env) for deployed functions to access it"

key-files:
  created: []
  modified:
    - package.json

key-decisions:
  - "esbuild overridden to 0.27.7 in package.json to resolve ARM64 binary mismatch with netlify-cli internals (was 0.27.3 JS + 0.27.7 native = crash)"
  - "NETLIFY_BUILD_HOOK must be set in Netlify dashboard (not just .env) since deployed functions have no .env file access"
  - "netlify dev must be started via volta run --node 22.22.2 npx netlify dev to use Node 22 (system npm/npx defaults to Node 20 which Astro rejects)"

patterns-established:
  - "Health function pattern: boolean-maps all required env vars so deployed runtime correctness is instantly verifiable by curl"
  - "Two-layer env var source: .env for local dev (netlify dev injects), Netlify dashboard for deployed"

# Metrics
duration: 15min
completed: 2026-04-06
---

# Phase 2 Plan 2: Netlify Dev and Deployed Env Verification Summary

**netlify dev + deployed preview both confirmed serving /api/health 200 with all 8 env vars via boolean health function; esbuild ARM64 mismatch fixed**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-04-06T12:00Z
- **Completed:** 2026-04-06T12:15Z
- **Tasks:** 3 (Task 1 human-completed, Tasks 2-3 automated)
- **Files modified:** 1 (package.json)

## Accomplishments
- Fixed esbuild 0.27.3/0.27.7 ARM64 version mismatch that prevented netlify-cli from bundling functions
- Verified `netlify dev` starts cleanly with both Astro (port 4321) and Netlify proxy (port 8888) under Volta Node 22
- Confirmed all 8 env vars present at runtime via /api/health response body — locally and on deployed Netlify draft preview
- Satisfied ROADMAP SC-3: health endpoint returns 200 with full env on deployed preview

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure Netlify dashboard and link site** - Human completed (no commit — dashboard config + netlify link)
2. **Task 2: Verify netlify dev and smoke-test function** - `046f7f5` (fix: esbuild override + local verification)
3. **Task 3: Verify health endpoint on deployed Netlify preview** - No separate code commit (env var set via netlify CLI, redeploy verified)

**Plan metadata:** (to be committed)

## Files Created/Modified
- `package.json` - Added `"esbuild": "0.27.7"` to pnpm overrides to resolve darwin-arm64 binary version mismatch

## Decisions Made
- **esbuild forced to 0.27.7 via pnpm overrides:** netlify-cli@24.10.0 internally pins esbuild to 0.27.3, but the darwin-arm64 native binary was 0.27.7, causing `Cannot start service: Host version "0.27.3" does not match binary version "0.27.7"`. Overriding to 0.27.7 resolves both the JS package and native binary to the same version.
- **netlify dev must use volta run:** `npx netlify dev` without volta uses system Node 20, which Astro 6 rejects. Command is `volta run --node 22.22.2 npx netlify dev --no-open`.
- **NETLIFY_BUILD_HOOK requires Netlify dashboard entry:** The initial 7-var dashboard config was missing `NETLIFY_BUILD_HOOK`. Set via `netlify env:set` CLI after first deploy showed the var as false.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] esbuild version mismatch prevented function bundling**
- **Found during:** Task 2 (netlify dev startup)
- **Issue:** `Cannot start service: Host version "0.27.3" does not match binary version "0.27.7"` — netlify-cli internals use esbuild@0.27.3 JS but pnpm installed @esbuild/darwin-arm64@0.27.7 native binary. Caused functions to load in Lambda compat mode (CJS-only), which then failed on ESM `export const handler`.
- **Fix:** Added `"esbuild": "0.27.7"` to pnpm `overrides` in package.json; ran `pnpm install` to reconcile all esbuild instances to 0.27.7.
- **Files modified:** `package.json`
- **Verification:** netlify dev started without esbuild error, /api/health returned 200 with all 8 env vars
- **Committed in:** `046f7f5`

**2. [Rule 3 - Blocking] NETLIFY_BUILD_HOOK missing from Netlify dashboard**
- **Found during:** Task 3 (deployed preview verification)
- **Issue:** First deploy showed `"NETLIFY_BUILD_HOOK":false` — the variable was in `.env` (injected by netlify dev locally) but not in Netlify dashboard (deployed functions have no .env access)
- **Fix:** Ran `netlify env:set NETLIFY_BUILD_HOOK <url> --force` to add it to dashboard; redeployed
- **Files modified:** None (Netlify dashboard state via API)
- **Verification:** Second deploy confirmed `"NETLIFY_BUILD_HOOK":true` in health response
- **Committed in:** N/A (external service config)

---

**Total deviations:** 2 auto-fixed (both Rule 3 - blocking)
**Impact on plan:** Both fixes necessary for task completion. No scope creep.

## Issues Encountered
- `pnpm approve-builds` is interactive-only and could not be bypassed non-interactively. However, the native binaries (esbuild, @parcel/watcher, etc.) were already present in the pnpm virtual store from prior installs, so this did not block execution.
- `volta run --node 22.22.2 npx netlify dev` is the correct invocation. Plain `npx netlify dev` uses system Node 20, which Astro 6 rejects with "Node.js v20.19.5 is not supported".

## Next Phase Readiness
- netlify dev workflow is proven: `volta run --node 22.22.2 npx netlify dev --no-open`
- All 8 env vars confirmed at runtime in both local and deployed contexts
- Function routing via netlify.toml `/api/*` redirect is working
- Ready for 02-03 (Strava OAuth functions) and 02-04 (GitHub write function)
- No blockers

---
*Phase: 02-netlify-infrastructure*
*Completed: 2026-04-06*
