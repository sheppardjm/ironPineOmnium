// src/lib/event-config.ts
//
// Event-level constants for the Iron & Pine Omnium.
// All validation thresholds live here — no magic numbers elsewhere in the codebase.

/** Day 1 date string (Hiawatha's Revenge fondo) */
export const DAY1_DATE = "2026-06-06" as const;

/** Day 2 date string (MK Ultra grinduro) */
export const DAY2_DATE = "2026-06-07" as const;

/** Event dates — used for date-range validation in the fetch function */
export const EVENT_DATES = [DAY1_DATE, DAY2_DATE] as const;

/**
 * Unix epoch seconds for Day 1 gun start.
 * June 6, 2026 08:00:00 EDT = 12:00:00 UTC = 1780747200
 * (EDT is UTC-4; June is daylight saving time, NOT EST/UTC-5)
 */
export const GUN_EPOCH_SECONDS = 1780747200 as const;

/** Maximum seconds after gun that a valid start_date may fall (30 minutes) */
export const START_WINDOW_SECONDS = 1800 as const;

/** Minimum distance in meters for a valid Day 1 submission (95% of ~164 km route) */
export const DAY1_MIN_DISTANCE_METERS = 156000 as const;

/** Minimum distance in meters for a valid Day 2 submission (95% of ~161 km route) */
export const DAY2_MIN_DISTANCE_METERS = 153000 as const;
