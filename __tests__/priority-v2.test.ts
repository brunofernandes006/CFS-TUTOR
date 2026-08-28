import { CFS_DISCIPLINE_WEIGHTS } from "@/lib/config/studyWeights";
import { calculateStudyPriority } from "@/lib/services/priorityServiceV2";

describe("CFS V2 strategic priority", () => {
  it("keeps official weighted shares", () => {
    expect(CFS_DISCIPLINE_WEIGHTS.professional.weightedShare).toBe(0.5);
    expect(CFS_DISCIPLINE_WEIGHTS.portuguese.weightedShare).toBe(0.3);
    expect(CFS_DISCIPLINE_WEIGHTS.math.weightedShare).toBe(0.2);
  });

  it("does not claim mastery with insufficient evidence", () => {
    const result = calculateStudyPriority({
      discipline: "Conhecimentos Profissionais",
      mastery: 95,
      questionCount: 2,
      studied: true,
    });
    expect(result.reasons.some((r) => r.includes("poucos dados"))).toBe(true);
  });

  it("raises priority for overdue recurrent weakness", () => {
    const result = calculateStudyPriority({
      discipline: "Conhecimentos Profissionais",
      mastery: 45,
      questionCount: 20,
      recurrentErrors: 4,
      overdueReview: true,
      studied: true,
      incidence: 0.8,
    });
    expect(["CRÍTICA", "ALTA"]).toContain(result.level);
    expect(result.reasons.some((r) => r.includes("erro recorrente"))).toBe(true);
  });
});
