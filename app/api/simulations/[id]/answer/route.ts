import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseRpc } from "@/lib/server/supabaseRest";

type AnswerResult = { ok: boolean; position: number };

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
    }

    const { id } = await params;
    if (!/^[0-9a-f-]{36}$/i.test(id)) {
      return NextResponse.json({ error: "ID inválido." }, { status: 400 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const position = Number(body.position);
    const selectedOptionIndex = Number(body.selected_option_index);

    if (!Number.isInteger(position) || position < 1 || !Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0 || selectedOptionIndex > 9) {
      return NextResponse.json({ error: "position e selected_option_index válidos são obrigatórios." }, { status: 400 });
    }

    const result = await supabaseRpc<AnswerResult>("answer_simulation_question_v2", {
      p_user_id: DEFAULT_USER_ID,
      p_simulation_id: id,
      p_position: position,
      p_chosen_option_index: selectedOptionIndex,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao registrar resposta.";
    console.error("[POST /api/simulations/:id/answer V2]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
