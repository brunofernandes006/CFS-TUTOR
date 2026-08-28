import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

type Discipline = { id: number; name: string };
type QuestionRow = {
  id: string;
  discipline_id: number;
  syllabus_item_id: string | null;
  exam_id: string | null;
  origin: "REAL" | "INEDITA" | "DIDATICA";
  question_number: number | null;
  statement: string;
  options: string[];
  context_text: string | null;
  requires_source_visual: boolean;
  difficulty: number | null;
  source_page: number | null;
  validation_status: string;
};

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ question: null, total: 0, message: "Supabase não configurado." });
    }

    const disciplineFilter = req.nextUrl.searchParams.get("discipline") ?? "";
    const originFilter = req.nextUrl.searchParams.get("origin") ?? "";
    const syllabusItemId = req.nextUrl.searchParams.get("syllabusItemId") ?? "";

    const [disciplines, questions] = await Promise.all([
      supabaseSelect<Discipline[]>("disciplines", new URLSearchParams({ select: "id,name", active: "eq.true" })),
      supabaseSelect<QuestionRow[]>("questions", new URLSearchParams({
        select: "id,discipline_id,syllabus_item_id,exam_id,origin,question_number,statement,options,context_text,requires_source_visual,difficulty,source_page,validation_status",
        order: "created_at.desc",
        limit: "1000",
      })),
    ]);

    const disciplineMap = new Map(disciplines.map((d) => [d.id, d.name]));
    const valid = questions.filter((q) => {
      if (q.origin === "REAL" && q.validation_status !== "VALIDATED_REAL") return false;
      if (q.origin !== "REAL" && !["VALIDATED_INTERNAL", "VALIDATED_REAL"].includes(q.validation_status)) return false;
      // Nunca entrega uma questão que dependa de figura/tirinha/diagrama enquanto
      // o recurso visual oficial ainda não estiver disponível na aplicação.
      if (q.requires_source_visual) return false;
      const discipline = disciplineMap.get(q.discipline_id) ?? "";
      if (disciplineFilter && discipline !== disciplineFilter) return false;
      if (originFilter && q.origin !== originFilter) return false;
      if (syllabusItemId && q.syllabus_item_id !== syllabusItemId) return false;
      return true;
    });

    if (valid.length === 0) {
      return NextResponse.json({
        question: null,
        total: 0,
        message: "Ainda não há questão validada para este filtro.",
      });
    }

    const selected = valid[Math.floor(Math.random() * valid.length)];
    return NextResponse.json({
      total: valid.length,
      question: {
        id: selected.id,
        discipline: disciplineMap.get(selected.discipline_id) ?? "",
        syllabusItemId: selected.syllabus_item_id,
        examId: selected.exam_id,
        origin: selected.origin,
        label: selected.origin === "REAL" ? "[QUESTÃO REAL]" : selected.origin === "INEDITA" ? "[QUESTÃO INÉDITA]" : "[EXEMPLO DIDÁTICO]",
        questionNumber: selected.question_number,
        contextText: selected.context_text,
        requiresSourceVisual: selected.requires_source_visual,
        statement: selected.statement,
        options: selected.options,
        difficulty: selected.difficulty,
        sourcePage: selected.source_page,
      },
    });
  } catch (err) {
    console.error("[API /questions V2]", err);
    return NextResponse.json({ error: "Erro ao carregar questão." }, { status: 500 });
  }
}
