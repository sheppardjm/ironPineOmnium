import { KOM_SEGMENT_IDS, SECTOR_SEGMENT_IDS } from "./segments";
import type { CategoryId, RiderResult } from "./types";
import { categoryIds } from "./types";

export interface AthleteJson {
  athleteId: string;
  displayName: string;
  category: string; // "men" | "women" | "non-binary"
  day1: {
    movingTimeSeconds: number;
    activityId: string;
    submittedAt: string;
  } | null;
  day2: {
    sectorEfforts: Record<string, number>;
    komSegmentIds: string[];
    komEfforts?: Record<string, number>; // optional — present in Strava submissions, absent in CSV fallback
    activityId: string;
    submittedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Compute KOM points for one athlete relative to their same-category peers.
 *
 * Two code paths:
 *  - Approach A (Strava submissions): komEfforts is present and non-empty.
 *    Rank the athlete on each KOM segment by elapsed time. Points per segment
 *    = ridersWithTime.length - fasterCount (rank-1 = max points, last = 1).
 *    Sum across all KOM segments where the athlete has a time.
 *  - Approach B (CSV fallback): komEfforts is absent or empty.
 *    Fall back to komSegmentIds.length — credit for KOM presence without times.
 *    scoreOmnium() normalises the scalar, so this remains proportional.
 */
function computeKomPoints(
  athlete: AthleteJson,
  peersInCategory: AthleteJson[],
): number {
  if (!athlete.day2) return 0;

  const komEfforts = athlete.day2.komEfforts;

  if (komEfforts && Object.keys(komEfforts).length > 0) {
    // Approach A: time-based ranking within category
    let totalPoints = 0;

    for (const segId of KOM_SEGMENT_IDS) {
      const myTime = komEfforts[segId];
      if (myTime === undefined) continue; // athlete did not ride this KOM segment

      const ridersWithTime = peersInCategory.filter(
        (peer) => peer.day2?.komEfforts?.[segId] !== undefined,
      );

      if (ridersWithTime.length === 0) continue;

      const fasterCount = ridersWithTime.filter(
        (peer) => (peer.day2!.komEfforts![segId] ?? Infinity) < myTime,
      ).length;

      // Rank 1 (fastest) = ridersWithTime.length points; last = 1 point
      const pointsForSegment = ridersWithTime.length - fasterCount;
      totalPoints += Math.max(0, pointsForSegment);
    }

    return totalPoints;
  } else {
    // Approach B: presence-count fallback for CSV submissions
    return athlete.day2.komSegmentIds?.length ?? 0;
  }
}

/**
 * Load all persisted athlete JSON files at build time and transform them into
 * RiderResult[] for the existing scoreOmnium() scoring engine.
 *
 * Only athletes with BOTH day1 and day2 submitted are included. Athletes with
 * only one day cannot be scored (missing scoring components).
 *
 * KOM points are computed by comparing komEfforts elapsed times against
 * same-category peers (time-based ranking). CSV fallback athletes without
 * komEfforts receive points equal to the number of KOM segments they completed.
 *
 * Scoring weights are NOT applied here — raw komPoints scalar is passed to
 * scoreOmnium() which applies the defaultScoringConfig weights.
 */
export function loadAthleteResults(): { riders: RiderResult[]; hasLiveData: boolean } {
  const athleteFiles = import.meta.glob(
    "../../public/data/results/athletes/*.json",
    { eager: true },
  );

  const rawAthletes: AthleteJson[] = Object.values(athleteFiles).map(
    (mod) => (mod as { default: AthleteJson }).default,
  );

  // Filter to athletes with both days submitted
  const completeAthletes = rawAthletes.filter(
    (athlete) => athlete.day1 !== null && athlete.day2 !== null,
  );

  // Filter to athletes with a valid category
  const validAthletes = completeAthletes.filter((athlete) =>
    (categoryIds as readonly string[]).includes(athlete.category),
  );

  const riders: RiderResult[] = validAthletes.map((athlete) => {
    const category = athlete.category as CategoryId;

    // Only compare against same-category peers with both days
    const peersInCategory = validAthletes.filter(
      (peer) => peer.category === category,
    );

    return {
      id: athlete.athleteId,
      name: athlete.displayName,
      category,
      movingTimeSeconds: athlete.day1!.movingTimeSeconds,
      sectorTimesSeconds: SECTOR_SEGMENT_IDS.map(
        (segId) => athlete.day2!.sectorEfforts[segId] ?? 0,
      ),
      komPoints: computeKomPoints(athlete, peersInCategory),
    };
  });

  return { riders, hasLiveData: riders.length > 0 };
}
