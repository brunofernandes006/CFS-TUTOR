import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabasePatch } from "@/lib/server/supabaseRest";

const ERROR_TYPES = new Set([
  "conhecimento",
  "esquecimento",
  "interpretacao",
  "distracao",
  "calculo",
  "procedimento",
  "confusao_de_conceitos",
  "pegadinha",
  "estrategia_de_prova",
  "falta_de_tempo",
]);

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
    const body = (await req.json()) as Record<string, unknown>;
    const questionId = typeof body.questionId === "string" ? body.questionId : "";
    const errorType = typeof body.errorType === "string" ? body.errorType : "";
    const conceptGap = typeof body.conceptGap === "string" ? body.conceptGap.trim().slice(0, 1000) : null;

    if (!/^[0-9a-f-]{36}$/i.test(questionId) || !ERROR_TYPES.has(errorType)) {
      return NextResponse.json({ error: "Questão ou tipo de erro inválido." }, { status: 400 });
    }

    const filter = new URLSearchParams({
      user_id: `eq.${DEFAULT_USER_ID}`,
      question_id: `eq.${questionId}`,
    });
    const rows = await supabasePatch<Array<Record<string, unknown>>>("error_notebook", filter, {
      error_type: errorType,
      concept_gap: conceptGap,
    });
    if (rows.length === 0) return NextResponse.json({ error: "Erro não encontrado no caderno." }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao classificar erro.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
