/**
 * Day 2 (MK Ultra Gravel) Strava Segment IDs
 *
 * These segment IDs are used to extract timed sector efforts and KOM points
 * from submitted Day 2 activities. Each ID has been verified against the
 * Strava segment database as of 2026-04-06.
 *
 * Segment IDs are strings to avoid JavaScript number precision issues.
 */

/** Timed sector segments — used for the 45% sector scoring weight */
export const SECTOR_SEGMENT_IDS = [
  "41159670", // BAA (2.53 mi, 2★)
  "24479292", // Sandstrom (5.89 mi, 3★)
  "24479426", // Akkala Rd (1.42 mi, 3★)
  "24479467", // Haavisto (1.38 mi, 4★)
  "24479496", // Forest Service Rd (6.45 mi, 2★)
  "34573011", // C4 (5.65 mi, 5★)
  "6809754",  // Down Jeep (0.6 mi, 5★)
] as const;

/** KOM segments — used for the 20% KOM scoring weight */
export const KOM_SEGMENT_IDS = [
  "24479270", // Billie Helmer (0.69 mi, 6.4% grade, 236 ft)
  "41126651", // Leaving Chatham (0.38 mi, 4.1% grade, 72 ft)
  "16438243", // Silver Creek (1.6 mi, 4.4% grade, 373 ft)
] as const;

/** Human-readable labels for each scored segment */
export const SEGMENT_LABELS: Record<string, string> = {
  "41159670": "BAA",
  "24479292": "Sandstrom",
  "24479426": "Akkala Rd",
  "24479467": "Haavisto",
  "24479496": "Forest Service Rd",
  "34573011": "C4",
  "6809754": "Down Jeep",
  "24479270": "Billie Helmer",
  "41126651": "Leaving Chatham",
  "16438243": "Silver Creek",
};

/** Combined list of all segment IDs used in scoring */
export const ALL_SCORED_SEGMENT_IDS = [
  ...SECTOR_SEGMENT_IDS,
  ...KOM_SEGMENT_IDS,
] as const;

export type SectorSegmentId = (typeof SECTOR_SEGMENT_IDS)[number];
export type KomSegmentId = (typeof KOM_SEGMENT_IDS)[number];
