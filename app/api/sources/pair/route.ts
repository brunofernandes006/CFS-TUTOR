import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseSelect, supabaseUpsert } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

type SourceRow = {
  id: string;
  category: string;
  validation_status: string;
  is_official: boolean;
  detected_year: number | null;
  detected_board: string | null;
};

function canonicalBoard(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().replace(/\s+/g, " ").toUpperCase();
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
    }

    const body = (await req.json()) as { examSourceId?: string; answerSourceId?: string };
    const examSourceId = body.examSourceId ?? "";
    const answerSourceId = body.answerSourceId ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(examSourceId) || !/^[0-9a-f-]{36}$/i.test(answerSourceId)) {
      return NextResponse.json({ error: "Identificadores de fonte inválidos." }, { status: 400 });
    }
    if (examSourceId === answerSourceId) {
      return NextResponse.json({ error: "Prova e gabarito devem ser documentos distintos." }, { status: 400 });
    }

    const docs = await supabaseSelect<SourceRow[]>(
      "source_documents",
      new URLSearchParams({
        id: `in.(${examSourceId},${answerSourceId})`,
        select: "id,category,validation_status,is_official,detected_year,detected_board",
      })
    );
    const exam = docs.find((doc) => doc.id === examSourceId);
    const answer = docs.find((doc) => doc.id === answerSourceId);
    if (!exam || !answer) return NextResponse.json({ error: "Fonte não encontrada." }, { status: 404 });
    if (exam.category !== "PROVA" || answer.category !== "GABARITO") {
      return NextResponse.json({ error: "O vínculo exige uma PROVA e um GABARITO." }, { status: 409 });
    }
    if (exam.validation_status !== "VALIDATED" || answer.validation_status !== "VALIDATED") {
      return NextResponse.json({ error: "As duas fontes precisam estar validadas." }, { status: 409 });
    }
    if (!exam.is_official || !answer.is_official) {
      return NextResponse.json({ error: "Questões reais exigem prova e gabarito marcados como fontes oficiais." }, { status: 409 });
    }
    if (!exam.detected_year || !answer.detected_year || !exam.detected_board || !answer.detected_board) {
      return NextResponse.json({ error: "Ano e banca devem estar confirmados nas duas fontes." }, { status: 409 });
    }
    if (exam.detected_year !== answer.detected_year || canonicalBoard(exam.detected_board) !== canonicalBoard(answer.detected_board)) {
      return NextResponse.json({ error: "Prova e gabarito não possuem o mesmo ano/banca confirmados." }, { status: 409 });
    }

    await supabaseUpsert(
      "source_relationships",
      {
        source_document_id: exam.id,
        related_document_id: answer.id,
        relationship_type: "PROVA_GABARITO",
        confidence: 100,
        validated: true,
      },
      "source_document_id,related_document_id,relationship_type"
    );

    const examRows = await supabaseUpsert<Array<Record<string, unknown>>>(
      "exams",
      {
        contest: "CFS",
        year: exam.detected_year,
        board: exam.detected_board,
        exam_document_id: exam.id,
        answer_key_document_id: answer.id,
        status: "VALIDATED",
        updated_at: new Date().toISOString(),
      },
      "contest,year,board"
    );

    return NextResponse.json({ success: true, exam: examRows[0] ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao vincular prova e gabarito.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
