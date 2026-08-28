import { getDb } from "@/lib/db";

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
      reason: input.consecutiveWrong >= 2 ? "Erro recorrente: revisão encurtada para 24h." : "Erro recente: revisar em 24h.",
    };
  }

  // Não alongar revisão sem evidência mínima de retenção.
  if (input.questionCount < 5 || input.reviewStage <= 1) {
    return { intervalDays: 1, stage: 1, reason: "Evidência ainda limitada: confirmar retenção em 24h." };
  }

  if (input.reviewStage === 2) {
    return { intervalDays: 7, stage: 2, reason: "Retenção confirmada: próxima recuperação em 7 dias." };
  }

  if (input.masteryScore >= 90 && input.questionCount >= 10 && input.consecutiveCorrect >= 3) {
    return { intervalDays: 60, stage: 4, reason: "Domínio consistente: intervalo ampliado para 60 dias." };
  }

  return { intervalDays: 30, stage: 3, reason: "Retenção consistente: próxima recuperação em 30 dias." };
}

function isoDateAfterDays(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export function applyReviewPolicyV2(
  userId: number,
  syllabusItemId: number,
  isCorrect: boolean
): ReviewPolicyResult | null {
  const db = getDb();
  const row = db.prepare(`
    SELECT mastery_score, questions_answered, review_stage,
           consecutive_correct, consecutive_wrong
      FROM syllabus_progress
     WHERE user_id = ? AND syllabus_item_id = ?
  `).get(userId, syllabusItemId) as {
    mastery_score: number | null;
    questions_answered: number | null;
    review_stage: number | null;
    consecutive_correct: number | null;
    consecutive_wrong: number | null;
  } | undefined;

  if (!row) return null;

  const policy = calculateReviewPolicyV2({
    isCorrect,
    reviewStage: row.review_stage ?? 0,
    masteryScore: row.mastery_score ?? 0,
    questionCount: row.questions_answered ?? 0,
    consecutiveCorrect: row.consecutive_correct ?? 0,
    consecutiveWrong: row.consecutive_wrong ?? 0,
  });

  db.prepare(`
    UPDATE syllabus_progress
       SET review_stage = ?, next_review = ?, updated_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND syllabus_item_id = ?
  `).run(policy.stage, isoDateAfterDays(policy.intervalDays), userId, syllabusItemId);

  return policy;
}
