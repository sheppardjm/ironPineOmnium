import { categoryIds, categoryLabels } from "./types";
import type { CategoryId, CategoryLeaderboard, RiderResult, ScoredRider, ScoringConfig } from "./types";

export const defaultScoringConfig: ScoringConfig = {
  movingTimeWeight: 0.35,
  sectorWeight: 0.45,
  komWeight: 0.2,
  scoreScale: 100,
};

function roundScore(value: number): number {
  return Math.round(value * 10) / 10;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function scoreCategory(
  categoryId: CategoryId,
  riders: RiderResult[],
  config: ScoringConfig,
): CategoryLeaderboard {
  const fastestMovingTimeSeconds = Math.min(...riders.map((rider) => rider.movingTimeSeconds));
  const fastestSectorTotalSeconds = Math.min(...riders.map((rider) => sum(rider.sectorTimesSeconds)));
  const highestKomPoints = Math.max(...riders.map((rider) => rider.komPoints), 0);

  const scoredEntries = riders
    .map((rider) => {
      const sectorTotalTimeSeconds = sum(rider.sectorTimesSeconds);
      const movingTimeScore =
        (fastestMovingTimeSeconds / rider.movingTimeSeconds) * config.scoreScale * config.movingTimeWeight;
      const sectorScore =
        (fastestSectorTotalSeconds / sectorTotalTimeSeconds) * config.scoreScale * config.sectorWeight;
      const komScore =
        (highestKomPoints === 0 ? 0 : rider.komPoints / highestKomPoints) * config.scoreScale * config.komWeight;

      return {
        rider,
        movingTimeScore: roundScore(movingTimeScore),
        sectorScore: roundScore(sectorScore),
        komScore: roundScore(komScore),
        totalScore: roundScore(movingTimeScore + sectorScore + komScore),
        sectorTotalTimeSeconds,
      };
    })
    .sort((left, right) => {
      if (right.totalScore !== left.totalScore) {
        return right.totalScore - left.totalScore;
      }

      if (right.sectorScore !== left.sectorScore) {
        return right.sectorScore - left.sectorScore;
      }

      if (right.komScore !== left.komScore) {
        return right.komScore - left.komScore;
      }

      if (left.sectorTotalTimeSeconds !== right.sectorTotalTimeSeconds) {
        return left.sectorTotalTimeSeconds - right.sectorTotalTimeSeconds;
      }

      return left.rider.movingTimeSeconds - right.rider.movingTimeSeconds;
    })
    .map((entry, index): ScoredRider => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    categoryId,
    categoryLabel: categoryLabels[categoryId],
    benchmarks: {
      fastestMovingTimeSeconds,
      fastestSectorTotalSeconds,
      highestKomPoints,
    },
    entries: scoredEntries,
  };
}

export function scoreOmnium(
  riders: RiderResult[],
  config: ScoringConfig = defaultScoringConfig,
): CategoryLeaderboard[] {
  return categoryIds.map((categoryId) => {
    const categoryRiders = riders.filter((rider) => rider.category === categoryId);
    return scoreCategory(categoryId, categoryRiders, config);
  });
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  return [hours, minutes, remainingSeconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}