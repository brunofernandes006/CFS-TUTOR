import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseRpc } from "@/lib/server/supabaseRest";

type SimulationDetail = {
  id: string;
  mode: "OFICIAL" | "ADAPTATIVO";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  weighted_score: number | null;
  questions: unknown[];
  disciplines: unknown[];
};

export async function GET(
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

    const data = await supabaseRpc<SimulationDetail>("get_simulation_v2", {
      p_user_id: DEFAULT_USER_ID,
      p_simulation_id: id,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao carregar simulado.";
    if (message.includes("SIMULATION_NOT_FOUND")) {
      return NextResponse.json({ error: "Simulado não encontrado." }, { status: 404 });
    }
    console.error("[GET /api/simulations/:id V2]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
