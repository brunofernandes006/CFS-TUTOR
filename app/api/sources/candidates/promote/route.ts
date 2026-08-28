import { NextRequest, NextResponse } from "next/server";
import {
  isSupabaseConfigured,
  supabaseInsert,
  supabasePatch,
  supabaseSelect,
} from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

type ExamRow = {
  id: string;
  status: string;
  exam_document_id: string | null;
  answer_key_document_id: string | null;
};

type QuestionCandidateRow = {
  id: string;
  source_document_id: string;
  question_number: number;
  source_page: number | null;
  statement: string;
  options: unknown;
  context_text: string | null;
  requires_source_visual: boolean;
  status: string;
};

type AnswerCandidateRow = {
  id: string;
  source_document_id: string;
  question_number: number;
  correct_option_index: number;
  source_page: number | null;
  status: string;
};

type DisciplineRow = { id: number; code: string; name: string };

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
    }

    const body = (await req.json()) as {
      examId?: string;
      questionCandidateId?: string;
      answerCandidateId?: string;
      disciplineCode?: string;
      syllabusItemId?: string | null;
    };
    const examId = body.examId ?? "";
    const questionCandidateId = body.questionCandidateId ?? "";
    const answerCandidateId = body.answerCandidateId ?? "";
    const disciplineCode = (body.disciplineCode ?? "").trim().toUpperCase();

    if (![examId, questionCandidateId, answerCandidateId].every((value) => /^[0-9a-f-]{36}$/i.test(value))) {
      return NextResponse.json({ error: "Identificadores inválidos." }, { status: 400 });
    }
    if (!["PROF", "PORT", "MAT"].includes(disciplineCode)) {
      return NextResponse.json({ error: "Disciplina inválida." }, { status: 400 });
    }
    if (body.syllabusItemId && !/^[0-9a-f-]{36}$/i.test(body.syllabusItemId)) {
      return NextResponse.json({ error: "Item do edital inválido." }, { status: 400 });
    }

    const [exams, questionCandidates, answerCandidates, disciplines] = await Promise.all([
      supabaseSelect<ExamRow[]>("exams", new URLSearchParams({ id: `eq.${examId}`, select: "id,status,exam_document_id,answer_key_document_id", limit: "1" })),
      supabaseSelect<QuestionCandidateRow[]>("question_candidates", new URLSearchParams({ id: `eq.${questionCandidateId}`, select: "id,source_document_id,question_number,source_page,statement,options,context_text,requires_source_visual,status", limit: "1" })),
      supabaseSelect<AnswerCandidateRow[]>("answer_key_candidates", new URLSearchParams({ id: `eq.${answerCandidateId}`, select: "id,source_document_id,question_number,correct_option_index,source_page,status", limit: "1" })),
      supabaseSelect<DisciplineRow[]>("disciplines", new URLSearchParams({ code: `eq.${disciplineCode}`, select: "id,code,name", active: "eq.true", limit: "1" })),
    ]);

    const exam = exams[0];
    const questionCandidate = questionCandidates[0];
    const answerCandidate = answerCandidates[0];
    const discipline = disciplines[0];
    if (!exam || !questionCandidate || !answerCandidate || !discipline) {
      return NextResponse.json({ error: "Dados de validação incompletos." }, { status: 404 });
    }
    if (exam.status !== "VALIDATED" || !exam.exam_document_id || !exam.answer_key_document_id) {
      return NextResponse.json({ error: "A prova precisa estar validada e vinculada ao gabarito oficial." }, { status: 409 });
    }
    if (questionCandidate.source_document_id !== exam.exam_document_id || answerCandidate.source_document_id !== exam.answer_key_document_id) {
      return NextResponse.json({ error: "Os candidatos não pertencem ao par prova/gabarito desta prova." }, { status: 409 });
    }
    if (questionCandidate.question_number !== answerCandidate.question_number) {
      return NextResponse.json({ error: "Número da questão diverge do número no gabarito." }, { status: 409 });
    }
    if (questionCandidate.status === "REJECTED" || answerCandidate.status === "REJECTED") {
      return NextResponse.json({ error: "Candidato rejeitado não pode ser promovido." }, { status: 409 });
    }
    if (!Array.isArray(questionCandidate.options) || questionCandidate.options.length < 4 || questionCandidate.options.length > 5) {
      return NextResponse.json({ error: "Alternativas inválidas no candidato." }, { status: 409 });
    }
    if (answerCandidate.correct_option_index < 0 || answerCandidate.correct_option_index >= questionCandidate.options.length) {
      return NextResponse.json({ error: "Gabarito incompatível com as alternativas extraídas." }, { status: 409 });
    }

    const syllabusItemId: string | null = body.syllabusItemId ?? null;
    if (syllabusItemId) {
      const syllabusRows = await supabaseSelect<Array<{ id: string; discipline_id: number }>>(
        "syllabus_items",
        new URLSearchParams({ id: `eq.${syllabusItemId}`, select: "id,discipline_id", active: "eq.true", limit: "1" })
      );
      if (!syllabusRows[0] || syllabusRows[0].discipline_id !== discipline.id) {
        return NextResponse.json({ error: "Item do edital não pertence à disciplina selecionada." }, { status: 409 });
      }
    }

    const existing = await supabaseSelect<Array<Record<string, unknown>>>(
      "questions",
      new URLSearchParams({ exam_id: `eq.${exam.id}`, question_number: `eq.${questionCandidate.question_number}`, origin: "eq.REAL", select: "id", limit: "1" })
    );

    const questionPayload = {
      exam_id: exam.id,
      discipline_id: discipline.id,
      syllabus_item_id: syllabusItemId,
      origin: "REAL",
      question_number: questionCandidate.question_number,
      statement: questionCandidate.statement,
      options: questionCandidate.options,
      context_text: questionCandidate.context_text,
      requires_source_visual: questionCandidate.requires_source_visual,
      correct_option_index: answerCandidate.correct_option_index,
      explanation: null,
      source_document_id: exam.exam_document_id,
      answer_source_document_id: exam.answer_key_document_id,
      source_page: questionCandidate.source_page,
      validation_status: "VALIDATED_REAL",
      updated_at: new Date().toISOString(),
    };

    let question: Record<string, unknown> | null = null;
    if (existing[0]?.id && typeof existing[0].id === "string") {
      const rows = await supabasePatch<Array<Record<string, unknown>>>(
        "questions",
        new URLSearchParams({ id: `eq.${existing[0].id}` }),
        questionPayload
      );
      question = rows[0] ?? null;
    } else {
      const rows = await supabaseInsert<Array<Record<string, unknown>>>("questions", questionPayload);
      question = rows[0] ?? null;
    }

    const sourceLinks = await supabaseSelect<Array<{ id: string }>>(
      "question_sources",
      new URLSearchParams({
        source_document_id: `eq.${exam.exam_document_id}`,
        answer_source_document_id: `eq.${exam.answer_key_document_id}`,
        question_number: `eq.${questionCandidate.question_number}`,
        select: "id",
        limit: "1",
      })
    );
    if (sourceLinks.length === 0) {
      await supabaseInsert("question_sources", {
        source_document_id: exam.exam_document_id,
        answer_source_document_id: exam.answer_key_document_id,
        question_number: questionCandidate.question_number,
        source_page: questionCandidate.source_page,
        status: "VALIDATED_REAL",
      });
    }

    await Promise.all([
      supabasePatch("question_candidates", new URLSearchParams({ id: `eq.${questionCandidate.id}` }), { status: "APPROVED", updated_at: new Date().toISOString() }),
      supabasePatch("answer_key_candidates", new URLSearchParams({ id: `eq.${answerCandidate.id}` }), { status: "APPROVED", updated_at: new Date().toISOString() }),
    ]);

    return NextResponse.json({
      success: true,
      label: "[QUESTÃO REAL]",
      question,
      message: "Questão promovida somente após confirmação do par prova/gabarito e da disciplina.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao validar questão real.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
