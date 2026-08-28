import { NextRequest, NextResponse } from "next/server";
import { recordAttempt } from "@/lib/services/pedagogyService";
import { applyReviewPolicyV2 } from "@/lib/services/reviewPolicyV2";
import { awardXp, XP_REWARDS } from "@/lib/services/xpService";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      syllabusItemId,
      questionId,
      isCorrect,
      responseTimeSecs,
      difficulty,
      chosenOptionIndex,
      correctOptionIndex,
      theme,
      subtheme,
    } = body;

    if (!syllabusItemId || typeof isCorrect !== "boolean") {
      return NextResponse.json(
        { error: "syllabusItemId e isCorrect são obrigatórios" },
        { status: 400 }
      );
    }

    recordAttempt({
      userId: DEFAULT_USER_ID,
      syllabusItemId,
      questionId,
      isCorrect,
      responseTimeSecs,
      difficulty,
      chosenOptionIndex,
      correctOptionIndex,
      theme,
      subtheme,
    });

    // A V1 ainda registra a tentativa e mastery. Em seguida, a política V2
    // substitui o calendário legado por 24h → 7d → 30d, encurtando em erros
    // e ampliando apenas quando há domínio consistente.
    const review = applyReviewPolicyV2(DEFAULT_USER_ID, Number(syllabusItemId), isCorrect);

    let xpAwarded = 0;
    let totalXp: number | undefined;
    if (isCorrect && questionId) {
      const idempotencyKey = `attempt_q${questionId}_user${DEFAULT_USER_ID}`;
      const numericDifficulty = Number(difficulty ?? 0);
      const xpAmount = numericDifficulty >= 4 ? XP_REWARDS.CORRECT_HARD : XP_REWARDS.CORRECT_ANSWER;
      const { awarded, total } = awardXp(
        xpAmount,
        "Resposta correta",
        idempotencyKey,
        DEFAULT_USER_ID
      );
      if (awarded) xpAwarded = xpAmount;
      totalXp = total;
    }

    return NextResponse.json({
      success: true,
      xp_awarded: xpAwarded,
      total_xp: totalXp,
      review: review
        ? { interval_days: review.intervalDays, stage: review.stage, reason: review.reason }
        : null,
    });
  } catch (err) {
    console.error("[API /attempts]", err);
    return NextResponse.json({ error: "Erro ao registrar tentativa" }, { status: 500 });
  }
}
