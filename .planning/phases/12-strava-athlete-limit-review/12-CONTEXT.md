# Phase 12: Strava Athlete Limit Review - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Submit the Strava athlete limit review request so the Iron & Pine Omnium app is approved for multiple athletes before the June 6-7 event. This is a manual submission process — no code changes. The app is currently in Single Player Mode (athlete limit = 1). Draft content exists in `01-02-PLAN.md` but needs corrections (day mapping was backwards) and updated framing.

</domain>

<decisions>
## Implementation Decisions

### Screenshot selection
- Screenshots come from the **deployed production site** (ironpineomnium.com)
- Include any pages that show Strava data pulled from the API — specifically the submit flow and confirm page (score preview showing moving time, sector times, KOM times)
- Seed a **test submission first** so the leaderboard shows actual scored results, not the empty "Awaiting submissions" state
- User will **walk through the live flow** — authenticate with Strava, paste a real activity, screenshot each step showing Strava-derived data

### App description content
- App name: **Iron & Pine Omnium** (confirmed in Strava dashboard)
- Describe **Iron & Pine only** — do not mention companion sites (MK Ultra Gravel, Hiawatha's Revenge) since they are removing their Strava integration
- **CRITICAL day mapping correction**: Day 1 (Saturday June 6) = Hiawatha's Revenge fondo, Day 2 (Sunday June 7) = MK Ultra Gravel grinduro. The 01-02-PLAN.md draft has these backwards.
- Expected athlete count: **under 50** (small community gravel event)
- **Lead with privacy compliance**: emphasize that no raw Strava data is displayed publicly (only computed point scores and rider-chosen display names), deauth webhook deletes athlete data, activity data used only for scoring

### Timeline and contingency
- Submit **today** (2026-04-08) — maximum buffer before June 6 event
- Record submission date in **STATE.md only** for tracking the 7-10 business day review window
- If denied: **resubmit** with Strava's feedback addressed
- If timeline runs out (past June 1 without approval): **fall back to CSV manual entry** (procedure exists from Phase 1, plan 01-04)

### Claude's Discretion
- Exact framing and word choice of the app description and use case text
- Order of information in the submission
- How to structure the screenshot annotations (if any needed)

</decisions>

<specifics>
## Specific Ideas

- HubSpot form URL: `https://share.hsforms.com/1VXSwPUYqSH6IxK0y51FjHwcnkd8`
- Draft content exists in `.planning/phases/01-compliance-and-prerequisites/01-02-PLAN.md` — use as starting point but fix day mapping and add privacy-first framing
- Strava review takes 7-10 business days per their documentation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-strava-athlete-limit-review*
*Context gathered: 2026-04-08*
