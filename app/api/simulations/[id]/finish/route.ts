import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseRpc } from "@/lib/server/supabaseRest";

type FinishResult = {
  ok: boolean;
  simulation_id: string;
  answered: number;
  total: number;
  weighted_score: number;
  disciplines: Array<{
    code: string;
    discipline: string;
    weight: number;
    total: number;
    correct: number;
    score_0_10: number;
  }>;
};

export async function POST(
  _req: NextRequest,
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

    const result = await supabaseRpc<FinishResult>("finalize_simulation_v2", {
      p_user_id: DEFAULT_USER_ID,
      p_simulation_id: id,
    });

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao finalizar simulado.";
    console.error("[POST /api/simulations/:id/finish V2]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
