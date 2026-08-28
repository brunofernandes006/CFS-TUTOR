import { CFS_DISCIPLINE_WEIGHTS } from "@/lib/config/studyWeights";

describe("V2 source/import safety contract", () => {
  it("keeps the official CFS/26 weighted distribution exact", () => {
    expect(CFS_DISCIPLINE_WEIGHTS.professional.weightedShare).toBe(0.5);
    expect(CFS_DISCIPLINE_WEIGHTS.portuguese.weightedShare).toBe(0.3);
    expect(CFS_DISCIPLINE_WEIGHTS.math.weightedShare).toBe(0.2);
  });

  it("keeps the official distribution normalized to 100%", () => {
    const total = Object.values(CFS_DISCIPLINE_WEIGHTS).reduce(
      (sum, discipline) => sum + discipline.weightedShare,
      0
    );
    expect(total).toBeCloseTo(1, 10);
  });
});
