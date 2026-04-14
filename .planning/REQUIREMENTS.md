# Requirements: v1.2 Scoring Integrity

**Defined:** 2026-04-14
**Core Value:** Riders paste a Strava activity URL, authenticate once, and see themselves on a combined leaderboard that scores both days fairly across three categories.

## Milestone Goal

Prevent sandbagging by replacing moving-time scoring with gun-time scoring on Day 1 and adding minimum distance validation on both days.

## v1.2 Requirements

### Gun Time Scoring

- [ ] **SCORE-01**: Day 1 race time is computed as `finish_epoch - gun_epoch` where gun start is 8:00 AM ET June 6 2026, using UTC epoch arithmetic
- [ ] **SCORE-02**: Activities with Strava "Hide Start Time" privacy (`start_date` ending in `T00:00:01Z`) are rejected with a clear error message
- [ ] **SCORE-03**: Race time (not moving time) is used for the 35% Day 1 scoring component
- [ ] **SCORE-04**: Score preview shows "Race Time" label and computed gun time before submission
- [ ] **SCORE-05**: Leaderboard displays "Race Time" column with HH:MM:SS format for the Day 1 component

### Distance Validation

- [ ] **DIST-01**: Day 1 activities below ~80 miles (129 km) are rejected at fetch time with a user-readable error
- [ ] **DIST-02**: Day 2 activities below ~80 miles (129 km) are rejected at fetch time with a user-readable error
- [ ] **DIST-03**: Distance rejection error shows the rider's recorded distance and the minimum required

### Configuration

- [ ] **CONFIG-01**: Gun epoch constant, distance thresholds, and event dates are defined in a shared `event-config.ts` module
- [ ] **CONFIG-02**: `elapsed_time`, `distance`, and `start_date` are extracted from Strava API response at fetch time

### Data Integrity

- [ ] **DATA-01**: Athlete JSON stores `raceTimeSeconds` and `distanceMeters` for Day 1 submissions
- [ ] **DATA-02**: Athlete loader handles legacy data (`movingTimeSeconds` fallback) without NaN propagation

## Out of Scope

| Feature | Reason |
|---------|--------|
| Moving time as a scoring input | Gameable — defeats the purpose of gun time scoring |
| Tight distance threshold (90%+) | GPS variance on forested gravel is 3-5%; would produce false rejections |
| Distance as a scoring component | Binary gate, not a differentiator |
| Day 2 gun time scoring | Sectors + KOM already validate the ride; gun time adds no value for grinduro format |
| Admin race time override UI | Out of scope for v1.2; correct data files directly if needed |
| Dynamic per-rider OG share cards | Deferred from v1.1; not related to scoring integrity |
| Retroactive recomputation | `start_date` not stored pre-v1.2; handle operationally if needed |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SCORE-01 | — | Pending |
| SCORE-02 | — | Pending |
| SCORE-03 | — | Pending |
| SCORE-04 | — | Pending |
| SCORE-05 | — | Pending |
| DIST-01 | — | Pending |
| DIST-02 | — | Pending |
| DIST-03 | — | Pending |
| CONFIG-01 | — | Pending |
| CONFIG-02 | — | Pending |
| DATA-01 | — | Pending |
| DATA-02 | — | Pending |

**Coverage:**
- v1.2 requirements: 12 total
- Mapped to phases: 0
- Unmapped: 12

---
*Requirements defined: 2026-04-14*
*Last updated: 2026-04-14 after initial definition*
