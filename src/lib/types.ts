export const categoryIds = ["men", "women", "non-binary"] as const;

export type CategoryId = (typeof categoryIds)[number];

export const categoryLabels: Record<CategoryId, string> = {
  men: "Men",
  women: "Women",
  "non-binary": "Non-Binary",
};

export interface RiderResult {
  id: string;
  name: string;
  hometown: string;
  category: CategoryId;
  day1MovingTimeSeconds: number;
  day2SectorTimesSeconds: number[];
  day2KomPoints: number;
}

export interface ScoringConfig {
  day1Weight: number;
  sectorWeight: number;
  komWeight: number;
  scoreScale: number;
}

export interface ScoredRider {
  rank: number;
  rider: RiderResult;
  day1Score: number;
  sectorScore: number;
  komScore: number;
  totalScore: number;
  sectorTotalTimeSeconds: number;
}

export interface CategoryLeaderboard {
  categoryId: CategoryId;
  categoryLabel: string;
  benchmarks: {
    fastestDay1MovingTimeSeconds: number;
    fastestDay2SectorTotalSeconds: number;
    highestKomPoints: number;
  };
  entries: ScoredRider[];
}