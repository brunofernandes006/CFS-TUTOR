export interface ReviewPolicyInput {
  isCorrect: boolean;
  reviewStage: number;
  masteryScore: number;
  questionCount: number;
  consecutiveCorrect: number;
  consecutiveWrong: number;
}

export interface ReviewPolicyResult {
  intervalDays: number;
  stage: number;
  reason: string;
}

export function calculateReviewPolicyV2(input: ReviewPolicyInput): ReviewPolicyResult {
  if (!input.isCorrect || input.consecutiveWrong >= 1) {
    return {
      intervalDays: 1,
      stage: 0,
      reason: input.consecutiveWrong >= 2
        ? "Erro recorrente: revisão encurtada para 24h."
        : "Erro recente: revisar em 24h.",
    };
  }

  if (input.questionCount < 5 || input.reviewStage <= 1) {
    return {
      intervalDays: 1,
      stage: 1,
      reason: "Evidência ainda limitada: confirmar retenção em 24h.",
    };
  }

  if (input.reviewStage === 2) {
    return {
      intervalDays: 7,
      stage: 2,
      reason: "Retenção confirmada: próxima recuperação em 7 dias.",
    };
  }

  if (
    input.masteryScore >= 90 &&
    input.questionCount >= 10 &&
    input.consecutiveCorrect >= 3
  ) {
    return {
      intervalDays: 60,
      stage: 4,
      reason: "Domínio consistente: intervalo ampliado para 60 dias.",
    };
  }

  return {
    intervalDays: 30,
    stage: 3,
    reason: "Retenção consistente: próxima recuperação em 30 dias.",
  };
}
