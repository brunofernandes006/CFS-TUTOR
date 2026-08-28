import { calculateReviewPolicyV2 } from "@/lib/services/reviewPolicyV2";

describe("review policy V2", () => {
  it("returns to 24h after an error", () => {
    const result = calculateReviewPolicyV2({
      isCorrect: false, reviewStage: 3, masteryScore: 90, questionCount: 20,
      consecutiveCorrect: 0, consecutiveWrong: 1,
    });
    expect(result.intervalDays).toBe(1);
    expect(result.stage).toBe(0);
  });

  it("keeps 24h while evidence is insufficient", () => {
    const result = calculateReviewPolicyV2({
      isCorrect: true, reviewStage: 1, masteryScore: 100, questionCount: 2,
      consecutiveCorrect: 2, consecutiveWrong: 0,
    });
    expect(result.intervalDays).toBe(1);
  });

  it("uses 7 days after retention is confirmed", () => {
    const result = calculateReviewPolicyV2({
      isCorrect: true, reviewStage: 2, masteryScore: 80, questionCount: 6,
      consecutiveCorrect: 2, consecutiveWrong: 0,
    });
    expect(result.intervalDays).toBe(7);
  });

  it("uses 30 days for established retention", () => {
    const result = calculateReviewPolicyV2({
      isCorrect: true, reviewStage: 3, masteryScore: 84, questionCount: 8,
      consecutiveCorrect: 2, consecutiveWrong: 0,
    });
    expect(result.intervalDays).toBe(30);
  });

  it("extends only after strong consistent evidence", () => {
    const result = calculateReviewPolicyV2({
      isCorrect: true, reviewStage: 4, masteryScore: 94, questionCount: 14,
      consecutiveCorrect: 4, consecutiveWrong: 0,
    });
    expect(result.intervalDays).toBe(60);
  });
});
