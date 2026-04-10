---
phase: 17-qa-and-validation
plan: 01
subsystem: infra
tags: [seo, og-tags, json-ld, sitemap, netlify, qa]

# Dependency graph
requires:
  - phase: 13-sitemap-and-robots
    provides: sitemap-index.xml, robots.txt, submit-confirm noindex
  - phase: 14-og-image-and-favicons
    provides: og-image.png, favicon set, apple-touch-icon
  - phase: 15-baselayout-extension
    provides: OG meta tags, twitter card, canonical URL in BaseLayout.astro
  - phase: 16-structured-data
    provides: Event JSON-LD structured data on homepage
provides:
  - Task 1 complete: pre-flight curl verification of live site status
  - Deployment blocker identified: local repo 10+ commits ahead of origin/main, SEO work not deployed
  - Local dist verified: all meta tags, sitemap, robots.txt, og-image correct locally
  - Plan paused at checkpoint: awaiting user to push to origin/main and trigger Netlify deploy
affects: [17-02, 17-03]

# Tech tracking
tech-stack:
  added: []
  patterns: [curl-based pre-flight verification before external QA tool testing]

key-files:
  created: [.planning/phases/17-qa-and-validation/17-01-SUMMARY.md]
  modified: []

key-decisions:
  - "Deployment must happen before external QA tools (Facebook Debugger, Google Rich Results, X Card Validator) can be run — external tools scrape the live URL"
  - "Local dist/ verification passed all 9 checks; the issue is not in the code but in the deployment pipeline"

patterns-established:
  - "Pre-flight local verification before external tool QA: verify locally first, then deploy, then run external validators"

# Metrics
duration: 12min
completed: 2026-04-10
---

# Phase 17 Plan 01: QA and Validation — Pre-flight Checks Summary

**Automated curl pre-flight found the live site is running pre-SEO code: all 10+ commits from phases 13-16 exist locally but have never been pushed to origin/main, so Netlify never deployed them.**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-10T02:14:18Z
- **Completed:** 2026-04-10T02:26:00Z
- **Tasks:** 1 of 4 complete (plan paused at checkpoint)
- **Files modified:** 0 (verification-only task)

## Accomplishments

- Ran all 9 automated curl checks against the live site https://ironpineomnium.com
- Identified root cause of all failures: site not deployed — local repo is 10+ commits ahead of origin/main
- Verified local dist/ contains all correct SEO artifacts (confirmed passing)

## Task Commits

1. **Task 1: Automated pre-flight checks** — verification-only, no code changes

**Plan metadata:** (see final commit)

## Pre-flight Check Results

### Live Site (https://ironpineomnium.com) — STALE DEPLOYMENT

| Check | Result | Detail |
|-------|--------|--------|
| Step 1: HTTP 200 / Netlify headers | PASS | HTTP/2 200, server: Netlify confirmed |
| Step 2: Homepage OG tags | FAIL | No og:, twitter:, canonical, or JSON-LD present |
| Step 3: Twitter card (Twitterbot UA) | FAIL | No twitter:card, twitter:image, twitter:title |
| Step 4: sitemap-index.xml | FAIL | 404 — file not deployed |
| Step 5: sitemap-0.xml | FAIL | 404 — file not deployed |
| Step 6: robots.txt | FAIL | 404 — file not deployed |
| Step 7: submit-confirm noindex | FAIL | submit-confirm/ not served (stale build) |
| Step 8: OG tags on /leaderboard/, /submit/, /support/ | FAIL | 0 matches on all pages |
| Step 9: og-image.png accessible | FAIL | 404 — og-image.png not deployed |

**Root cause:** The live Netlify deployment is running the build from before phases 13-16. All SEO work exists in local commits that have never been pushed to `origin/main`.

### Local dist/ Verification — ALL PASS

| Check | Result |
|-------|--------|
| og:image content=ironpineomnium.com/og-image.png | PASS |
| og:image:width 1200 / height 630 | PASS |
| twitter:card summary_large_image | PASS |
| JSON-LD @type Event + @context schema.org | PASS |
| canonical link present | PASS |
| Homepage: noindex NOT present | PASS |
| submit-confirm: noindex present | PASS |
| sitemap-index.xml → sitemap-0.xml reference | PASS |
| sitemap-0.xml: 4 URLs, /submit-confirm/ absent | PASS |
| robots.txt: Allow: /, Sitemap: reference | PASS |
| og-image.png: 53KB file exists locally | PASS |
| leaderboard/, submit/, support/: og:image present | PASS (4 each) |

## Deployment State

**Commits ahead of origin/main:** 10+

Key commits not yet pushed:
- `21594bd feat(16-01)`: Event JSON-LD structured data
- `c3b289b feat(15-02)`: Per-page titles, descriptions, noindex
- `...` (phases 13–16 SEO work)

**Untracked dist/ files (not committed):**
- `dist/og-image.png` (53KB)
- `dist/robots.txt`
- `dist/sitemap-0.xml`
- `dist/sitemap-index.xml`
- `dist/leaderboard/` (entire directory)
- `dist/support/` (entire directory)
- `dist/favicon.ico`, `dist/apple-touch-icon.png`, `dist/site.webmanifest`
- `dist/images/` (photography assets)
- `dist/data/`

## Files Created/Modified

None — this is a verification-only plan.

## Decisions Made

- Pre-flight checks must precede external QA tools; found deployment blocker before wasting time on external tools against stale site
- Local dist/ correctness confirmed; no code fixes needed — the work is correct, just not deployed

## Deviations from Plan

None — pre-flight check ran as planned. The deployment issue was an expected discovery category for QA.

## Issues Encountered

**Deployment blocker:** The live Netlify site is running pre-SEO code because all commits from phases 13-16 have never been pushed to `origin/main`. Netlify's CI/CD builds from GitHub — without the push, the SEO work is invisible to external tools.

**Resolution needed:** User must commit remaining untracked dist/ files, then push all local commits to `origin/main`, wait for Netlify build to complete, then verify deployment before running external QA tools.

## User Setup Required

Before continuing to Tasks 2-4 (external QA tools), the site must be deployed:

1. Commit untracked dist/ files to git
2. Push `main` branch to `origin/main`
3. Wait for Netlify build to complete (~2 min)
4. Verify live site shows new OG tags: `curl -s https://ironpineomnium.com | grep og:image`

## Next Phase Readiness

- All SEO code is correct locally (phases 13-16 verified)
- **Blocked:** External QA tools (Tasks 2-4) require live deployment
- Once deployed, tasks 2-4 can proceed: Google Rich Results Test, Facebook Sharing Debugger, X Card Validator

---
*Phase: 17-qa-and-validation*
*Completed: 2026-04-10 (partial — stopped at checkpoint)*
