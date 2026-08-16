import { NextRequest, NextResponse } from "next/server";
import { recordAttempt } from "@/lib/services/pedagogyService";
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

    if (!syllabusItemId || isCorrect === undefined) {
      return NextResponse.json(
        { error: "syllabusItemId e isCorrect são obrigatórios" },
        { status: 400 }
      );
    }

    // Registrar tentativa + atualizar mastery + caderno de erros
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

    // XP com idempotência por tentativa
    let xpAwarded = 0;
    if (isCorrect && questionId) {
      const idempotencyKey = `attempt_q${questionId}_user${DEFAULT_USER_ID}`;
      const xpAmount =
        difficulty >= 4 ? XP_REWARDS.CORRECT_HARD : XP_REWARDS.CORRECT_ANSWER;
      const { awarded, total } = awardXp(
        xpAmount,
        isCorrect ? "Resposta correta" : "Resposta incorreta",
        idempotencyKey,
        DEFAULT_USER_ID
      );
      if (awarded) xpAwarded = xpAmount;
      return NextResponse.json({ success: true, xp_awarded: xpAwarded, total_xp: total });
    }

    return NextResponse.json({ success: true, xp_awarded: 0 });
  } catch (err) {
    console.error("[API /attempts]", err);
    return NextResponse.json({ error: "Erro ao registrar tentativa" }, { status: 500 });
  }
}
