import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

type ExamRow = {
  id: string;
  year: number;
  board: string;
  status: string;
  exam_document_id: string | null;
  answer_key_document_id: string | null;
};

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
    }

    const examId = req.nextUrl.searchParams.get("examId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(examId)) {
      return NextResponse.json({ error: "Prova inválida." }, { status: 400 });
    }

    const exams = await supabaseSelect<ExamRow[]>(
      "exams",
      new URLSearchParams({ id: `eq.${examId}`, select: "id,year,board,status,exam_document_id,answer_key_document_id", limit: "1" })
    );
    const exam = exams[0];
    if (!exam) return NextResponse.json({ error: "Prova não encontrada." }, { status: 404 });
    if (!exam.exam_document_id || !exam.answer_key_document_id) {
      return NextResponse.json({ error: "Prova ainda não possui par prova/gabarito completo." }, { status: 409 });
    }

    const [questions, answers, disciplines] = await Promise.all([
      supabaseSelect<Array<Record<string, unknown>>>(
        "question_candidates",
        new URLSearchParams({
          source_document_id: `eq.${exam.exam_document_id}`,
          select: "id,question_number,source_page,statement,options,parser_confidence,status",
          order: "question_number.asc",
        })
      ),
      supabaseSelect<Array<Record<string, unknown>>>(
        "answer_key_candidates",
        new URLSearchParams({
          source_document_id: `eq.${exam.answer_key_document_id}`,
          select: "id,question_number,correct_option_index,source_page,parser_confidence,status",
          order: "question_number.asc",
        })
      ),
      supabaseSelect<Array<Record<string, unknown>>>(
        "disciplines",
        new URLSearchParams({ select: "id,code,name,exam_questions,exam_weight,weighted_share", active: "eq.true", order: "display_order.asc" })
      ),
    ]);

    const answersByNumber = new Map(answers.map((item) => [Number(item.question_number), item]));
    const rows = questions.map((question) => ({
      question,
      answer: answersByNumber.get(Number(question.question_number)) ?? null,
      readyForReview: Boolean(answersByNumber.get(Number(question.question_number))),
    }));

    return NextResponse.json({ exam, candidates: rows, disciplines });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar candidatos.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
