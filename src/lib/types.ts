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
  category: CategoryId;
  movingTimeSeconds: number;
  sectorTimesSeconds: number[];
  komPoints: number;
}

export interface ScoringConfig {
  movingTimeWeight: number;
  sectorWeight: number;
  komWeight: number;
  scoreScale: number;
}

export interface ScoredRider {
  rank: number;
  rider: RiderResult;
  movingTimeScore: number;
  sectorScore: number;
  komScore: number;
  totalScore: number;
  sectorTotalTimeSeconds: number;
}

export interface CategoryLeaderboard {
  categoryId: CategoryId;
  categoryLabel: string;
  benchmarks: {
    fastestMovingTimeSeconds: number;
    fastestSectorTotalSeconds: number;
    highestKomPoints: number;
  };
  entries: ScoredRider[];
}