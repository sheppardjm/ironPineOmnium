# Requirements: v1.2 Scoring Integrity

**Defined:** 2026-04-14
**Core Value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.

## Milestone Goal

Prevent sandbagging by validating that submitted activities cover the full route distance and were recorded from the start — keeping moving-time scoring intact while adding gates that catch riders who start their Strava late or submit partial rides.

## v1.2 Requirements

### Activity Validation

- [x] **VAL-01**: Day 1 activities below ~97 miles (156 km, 95% of route) are rejected at fetch time with a user-readable error
- [x] **VAL-02**: Day 2 activities below ~95 miles (153 km, 95% of route) are rejected at fetch time with a user-readable error
- [x] **VAL-03**: Day 1 activities that started more than 30 minutes after the 8:00 AM ET gun time are rejected with a user-readable error
- [x] **VAL-04**: Activities with Strava "Hide Start Time" privacy (`start_date` ending in `T00:00:01Z`) are rejected with a clear error message
- [x] **VAL-05**: All validation errors show the rider's actual value (distance or start time) and the required threshold

### Configuration

- [x] **CONFIG-01**: Gun epoch, start time window, and distance thresholds are defined in a shared `event-config.ts` module
- [x] **CONFIG-02**: `distance` and `start_date` are extracted from the Strava API response at fetch time

## Out of Scope

| Feature | Reason |
|---------|--------|
| Gun time as scoring input | Moving time remains the Day 1 scoring metric; gun time is for validation only |
| Replacing moving time display | Leaderboard and score preview continue to show moving time |
| Day 2 start time validation | Sector-based scoring already validates Day 2 ride completion |
| Distance as a scoring component | Binary gate, not a scoring differentiator |
| Admin override UI | Out of scope for v1.2; correct data files directly if needed |
| Retroactive recomputation | No existing ride data to migrate; event is June 2026 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONFIG-01 | Phase 18 | Complete |
| CONFIG-02 | Phase 18 | Complete |
| VAL-01 | Phase 19 | Complete |
| VAL-02 | Phase 19 | Complete |
| VAL-03 | Phase 19 | Complete |
| VAL-04 | Phase 19 | Complete |
| VAL-05 | Phase 19 | Complete |

**Coverage:**
- v1.2 requirements: 7 total
- Mapped to phases: 7
- Unmapped: 0

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after scope revision — traceability updated for 2-phase structure*
