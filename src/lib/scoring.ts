import { categoryIds, categoryLabels } from "./types";
import type { CategoryId, CategoryLeaderboard, RiderResult, ScoredRider, ScoringConfig } from "./types";

export const defaultScoringConfig: ScoringConfig = {
  day1Weight: 0.35,
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
  const fastestDay1MovingTimeSeconds = Math.min(...riders.map((rider) => rider.day1MovingTimeSeconds));
  const fastestDay2SectorTotalSeconds = Math.min(...riders.map((rider) => sum(rider.day2SectorTimesSeconds)));
  const highestKomPoints = Math.max(...riders.map((rider) => rider.day2KomPoints), 0);

  const scoredEntries = riders
    .map((rider) => {
      const sectorTotalTimeSeconds = sum(rider.day2SectorTimesSeconds);
      const day1Score =
        (fastestDay1MovingTimeSeconds / rider.day1MovingTimeSeconds) * config.scoreScale * config.day1Weight;
      const sectorScore =
        (fastestDay2SectorTotalSeconds / sectorTotalTimeSeconds) * config.scoreScale * config.sectorWeight;
      const komScore =
        (highestKomPoints === 0 ? 0 : rider.day2KomPoints / highestKomPoints) * config.scoreScale * config.komWeight;

      return {
        rider,
        day1Score: roundScore(day1Score),
        sectorScore: roundScore(sectorScore),
        komScore: roundScore(komScore),
        totalScore: roundScore(day1Score + sectorScore + komScore),
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

      return left.rider.day1MovingTimeSeconds - right.rider.day1MovingTimeSeconds;
    })
    .map((entry, index): ScoredRider => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    categoryId,
    categoryLabel: categoryLabels[categoryId],
    benchmarks: {
      fastestDay1MovingTimeSeconds,
      fastestDay2SectorTotalSeconds,
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