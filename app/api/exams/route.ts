import { NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado no servidor.", exams: [] }, { status: 503 });
    }

    const exams = await supabaseSelect<Array<Record<string, unknown>>>(
      "exams",
      new URLSearchParams({
        select: "id,contest,year,board,exam_document_id,answer_key_document_id,status,created_at,updated_at",
        status: "eq.VALIDATED",
        order: "year.desc",
      })
    );
    return NextResponse.json({ exams });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao listar provas.";
    return NextResponse.json({ error: message, exams: [] }, { status: 500 });
  }
}
