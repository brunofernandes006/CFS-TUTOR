import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseRpc } from "@/lib/server/supabaseRest";

type AttemptResult = {
  question_id: string;
  is_correct: boolean;
  correct_option_index: number;
  needs_error_classification: boolean;
  next_review_at: string | null;
  review_stage: number | null;
};

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });

    const body = (await req.json()) as Record<string, unknown>;
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const chosenOptionIndex = Number(body.chosenOptionIndex);
    const responseTimeSecs = body.responseTimeSecs == null ? null : Number(body.responseTimeSecs);

    if (!/^[0-9a-f-]{36}$/i.test(questionId) || !Number.isInteger(chosenOptionIndex) || chosenOptionIndex < 0 || chosenOptionIndex > 9) {
      return NextResponse.json({ error: "questionId e chosenOptionIndex válidos são obrigatórios." }, { status: 400 });
    }
    if (responseTimeSecs != null && (!Number.isFinite(responseTimeSecs) || responseTimeSecs < 0)) {
      return NextResponse.json({ error: "Tempo de resposta inválido." }, { status: 400 });
    }

    const result = await supabaseRpc<AttemptResult>("record_question_attempt_v2", {
      p_user_id: DEFAULT_USER_ID,
      p_question_id: questionId,
      p_chosen_option_index: chosenOptionIndex,
      p_response_time_seconds: responseTimeSecs,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao registrar tentativa.";
    console.error("[API /attempts V2]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
