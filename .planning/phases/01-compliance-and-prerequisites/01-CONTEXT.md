# Phase 1: Compliance and Prerequisites - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve all external blockers before any code is written: document the approved data model for Strava ToS compliance, submit the athlete limit review, identify and verify all Day 2 Strava segment IDs, and create a manual CSV fallback procedure for event day.

</domain>

<decisions>
## Implementation Decisions

### Display compliance boundary
- Public leaderboard shows **rider-chosen display name only** — no Strava profile name, avatar, or link
- Component scores (Day 1, Day 2 sectors, KOM) shown as separate columns alongside total on the public leaderboard
- Raw underlying values (e.g., "4:12 moving time -> 82 pts") are **only visible to the rider who submitted** — not on the public leaderboard
- Display name is **locked after first submission** — cannot be changed on Day 2 submission
- Category (men/women/non-binary) is **self-reported at first submission**, locked like display name
- Re-submission for the same day is **allowed** — new submission replaces the old one
- Hometown is **not collected or displayed** — only display name and category

### Event-day fallback workflow
- Fallback is Plan B specifically for **Strava approval not received by event day** — not a real-time API outage fallback
- Operated by **the event organizer (you) only** — not designed for volunteer operation
- Raw data sourced from **riders sharing Strava links manually** or **you pulling from Strava directly**
- CSV ingestion method: Claude's discretion on pipeline (direct commit vs. local script)

### Day 2 segment identification
- Segment IDs are **already known** — user will provide the exact list of sector IDs and KOM segment IDs
- Segments are a **mix of user-created and community-created** — some retirement risk exists
- If a community segment is retired before the event, the plan is to **create a replacement segment** covering the same stretch
- Segment constants file will be written to `src/lib/segments.ts`

### Athlete limit review framing
- Expected rider count: **under 50** athletes
- Event is **annual recurring** — not one-time, which strengthens the review case
- Strava API app **already exists** — no need to register a new one
- **Single shared Strava app** across Iron & Pine, mkUltraGravel, and hiawathasRevenge — the companion sites will become static (no Strava integration of their own)

### Claude's Discretion
- Whether to store the Strava athlete ID as plain numeric or hashed in public JSON files (balance simplicity with ToS compliance)
- What additional Strava data (if any) to store privately for operational/debugging purposes beyond computed scores and identity
- CSV fallback ingestion method (direct GitHub commit vs. local script that generates athlete JSON)

</decisions>

<specifics>
## Specific Ideas

- Companion sites (mkUltraGravel, hiawathasRevenge) will become static — all Strava integration consolidated into Iron & Pine Omnium
- The athlete limit review should emphasize: small community event (<50 riders), annual recurring, activity:read_all scope only, computed scores displayed (not raw Strava data publicly)
- Rider's own submission view can show the raw value -> score breakdown, but the public leaderboard shows only computed point values

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-compliance-and-prerequisites*
*Context gathered: 2026-04-06*
