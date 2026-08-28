import { STUDY_WEIGHTS } from "@/lib/config/studyWeights";

describe("V2 source/import safety contract", () => {
  it("keeps the official CFS/26 weighted distribution exact", () => {
    expect(STUDY_WEIGHTS.PROF.weightedShare).toBe(0.5);
    expect(STUDY_WEIGHTS.PORT.weightedShare).toBe(0.3);
    expect(STUDY_WEIGHTS.MAT.weightedShare).toBe(0.2);
  });

  it("keeps the official distribution normalized to 100%", () => {
    const total = Object.values(STUDY_WEIGHTS).reduce(
      (sum, discipline) => sum + discipline.weightedShare,
      0
    );
    expect(total).toBeCloseTo(1, 10);
  });
});
