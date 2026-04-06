# Requirements: Iron & Pine Omnium

**Defined:** 2026-04-02
**Core Value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.

## v1 Requirements

### Strava Integration

- [x] **STRA-01**: Rider can sign in with Strava OAuth and grant `activity:read_all` scope
- [ ] **STRA-02**: Rider can paste a Strava activity URL and system extracts the activity ID and fetches data via API
- [ ] **STRA-03**: System validates activity date falls within event weekend (June 6-7, 2026) and shows clear error if not
- [x] **STRA-04**: System silently refreshes expired OAuth tokens during submission flow

### Submission Flow

- [ ] **SUBM-01**: Rider sees computed score preview before finalizing submission (Day 1 moving time score, Day 2 sector + KOM scores)
- [ ] **SUBM-02**: System associates Day 1 and Day 2 submissions via Strava athlete ID
- [ ] **SUBM-03**: Rider provides display name, hometown, and category (men/women/non-binary) during first submission
- [ ] **SUBM-04**: Submission flow shows inline scoring explanation ("your 4:12 moving time = X points")
- [ ] **SUBM-05**: System extracts moving time from Day 1 activity for scoring
- [ ] **SUBM-06**: System extracts timed sector efforts and computes KOM points from Day 2 activity

### Leaderboard

- [ ] **LEAD-01**: Leaderboard displays per-component score columns (Day 1 / Day 2 sectors / KOM) alongside total
- [ ] **LEAD-02**: Rider can search/filter leaderboard by athlete name
- [ ] **LEAD-03**: Leaderboard is mobile-readable and validated for phone-sized screens
- [ ] **LEAD-04**: Leaderboard displays real rider data from submissions (replacing sample data)

### Data Pipeline

- [ ] **DATA-01**: Rider submissions persist via GitHub Contents API (one JSON file per rider)
- [ ] **DATA-02**: Leaderboard rebuilds with current submission data (via build hook or SSR)
- [ ] **DATA-03**: KOM points computed internally by comparing submitted effort times (not Strava's `kom_rank`)

### Design & Polish

- [ ] **DSGN-01**: Submission form UI matches site's visual language (Cormorant Garamond / Sora, existing color palette)
- [ ] **DSGN-02**: Companion sites (mkUltraGravel, hiawathasRevenge) link to this site for submissions and results
- [ ] **DSGN-03**: Clear visual indicator distinguishes sample data from live results on leaderboard

### Compliance

- [x] **COMP-01**: Public leaderboard displays only computed scores and rider-chosen display names (no raw Strava data per Nov 2024 API terms)
- [ ] **COMP-02**: Strava app athlete limit approval submitted with adequate lead time before June 6

## v2 Requirements

### Post-Event Differentiators

- **POST-01**: Day 2 submission nudge for riders who only submitted Day 1
- **POST-02**: Shareable result card / per-rider URL with OG meta tags for social sharing
- **POST-03**: Sector-by-segment expanded row showing individual segment times in leaderboard

### Administration

- **ADMN-01**: Admin result editing UI for organizer corrections
- **ADMN-02**: Multi-year results archive for repeat events

## Out of Scope

| Feature | Reason |
|---------|--------|
| Real-time / live leaderboard during event | Riders are off-grid 4-6 hours; "live" adds WebSocket complexity for zero benefit |
| Automatic Strava segment matching | Requires knowing athlete IDs in advance; fails for privacy-restricted athletes |
| Email / push notifications | Disproportionate infrastructure for 50-100 riders |
| Timing split overlays on map | Mapping tile infrastructure for a feature that doesn't help riders understand scores |
| Open registration / self-sign-up | Conflates submission with registration; keep registration in existing channels |
| Strava Club / Event integration | Separate access requirements and review process; not needed for v1 |
| Admin approval flow | Trust-based event; manual DB corrections sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| COMP-01 | Phase 1 | Complete |
| COMP-02 | Phase 1 | Deferred (requires finished UI) |
| STRA-01 | Phase 3 | Complete |
| STRA-04 | Phase 3 | Complete |
| STRA-02 | Phase 4 | Pending |
| STRA-03 | Phase 4 | Pending |
| SUBM-01 | Phase 5 | Pending |
| SUBM-03 | Phase 5 | Pending |
| SUBM-04 | Phase 5 | Pending |
| SUBM-05 | Phase 6 | Pending |
| SUBM-06 | Phase 6 | Pending |
| DATA-03 | Phase 6 | Pending |
| DATA-01 | Phase 7 | Pending |
| DATA-02 | Phase 7 | Pending |
| SUBM-02 | Phase 7 | Pending |
| LEAD-04 | Phase 8 | Pending |
| DSGN-03 | Phase 8 | Pending |
| LEAD-01 | Phase 9 | Pending |
| LEAD-02 | Phase 9 | Pending |
| LEAD-03 | Phase 9 | Pending |
| DSGN-01 | Phase 10 | Pending |
| DSGN-02 | Phase 10 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-06 after Phase 3 execution*
