import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseRpc, supabaseSelect } from "@/lib/server/supabaseRest";

type SimulationRow = {
  id: string;
  mode: "OFICIAL" | "ADAPTATIVO";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  weighted_score: number | null;
};

type CreateSimulationResult = {
  ok: boolean;
  simulation_id?: string;
  mode?: string;
  questions?: number;
  error?: string;
  discipline?: string;
  required?: number;
  available?: number;
};

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
    }

    const query = new URLSearchParams({
      select: "id,mode,status,started_at,completed_at,duration_seconds,weighted_score",
      user_id: `eq.${DEFAULT_USER_ID}`,
      order: "started_at.desc",
      limit: "50",
    });
    const history = await supabaseSelect<SimulationRow[]>("simulations", query);
    return NextResponse.json(history);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao buscar histórico.";
    console.error("[GET /api/simulations V2]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const mode = body.type === "ADAPTATIVO" ? "ADAPTATIVO" : body.type === "OFICIAL" ? "OFICIAL" : null;
    const targetQuestions = Number(body.target_questions ?? 30);

    if (!mode) {
      return NextResponse.json({ error: "Tipo inválido. Use OFICIAL ou ADAPTATIVO." }, { status: 400 });
    }
    if (mode === "ADAPTATIVO" && (!Number.isInteger(targetQuestions) || targetQuestions < 10 || targetQuestions > 60)) {
      return NextResponse.json({ error: "Quantidade adaptativa deve estar entre 10 e 60 questões." }, { status: 400 });
    }

    const result = await supabaseRpc<CreateSimulationResult>("create_simulation_v2", {
      p_user_id: DEFAULT_USER_ID,
      p_mode: mode,
      p_target_questions: mode === "ADAPTATIVO" ? targetQuestions : 60,
    });

    if (!result.ok) {
      return NextResponse.json(result, { status: 422 });
    }

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao criar simulado.";
    console.error("[POST /api/simulations V2]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
