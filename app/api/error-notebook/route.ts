import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

type ErrorRow = {
  question_id: string;
  syllabus_item_id: string | null;
  error_type: string | null;
  error_count: number;
  concept_gap: string | null;
  first_error_at: string;
  last_error_at: string;
  resolved_at: string | null;
};
type Question = { id: string; statement: string; discipline_id: number; origin: string; question_number: number | null; source_page: number | null };
type Discipline = { id: number; name: string };
type Item = { id: string; title: string };

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ errors: [], setupRequired: true });
    const disciplineFilter = req.nextUrl.searchParams.get("discipline") ?? "";

    const [errors, questions, disciplines, items] = await Promise.all([
      supabaseSelect<ErrorRow[]>("error_notebook", new URLSearchParams({
        select: "question_id,syllabus_item_id,error_type,error_count,concept_gap,first_error_at,last_error_at,resolved_at",
        user_id: `eq.${DEFAULT_USER_ID}`,
        order: "last_error_at.desc",
      })),
      supabaseSelect<Question[]>("questions", new URLSearchParams({ select: "id,statement,discipline_id,origin,question_number,source_page" })),
      supabaseSelect<Discipline[]>("disciplines", new URLSearchParams({ select: "id,name", active: "eq.true" })),
      supabaseSelect<Item[]>("syllabus_items", new URLSearchParams({ select: "id,title", active: "eq.true" })),
    ]);

    const questionMap = new Map(questions.map((q) => [q.id, q]));
    const disciplineMap = new Map(disciplines.map((d) => [d.id, d.name]));
    const itemMap = new Map(items.map((i) => [i.id, i.title]));

    const result = errors.flatMap((entry) => {
      const question = questionMap.get(entry.question_id);
      if (!question) return [];
      const discipline = disciplineMap.get(question.discipline_id) ?? "";
      if (disciplineFilter && discipline !== disciplineFilter) return [];
      return [{
        questionId: entry.question_id,
        syllabusItemId: entry.syllabus_item_id,
        topic: entry.syllabus_item_id ? itemMap.get(entry.syllabus_item_id) ?? null : null,
        statement: question.statement,
        discipline,
        origin: question.origin,
        questionNumber: question.question_number,
        sourcePage: question.source_page,
        errorType: entry.error_type,
        errorCount: entry.error_count,
        conceptGap: entry.concept_gap,
        firstErrorAt: entry.first_error_at,
        lastErrorAt: entry.last_error_at,
        resolvedAt: entry.resolved_at,
      }];
    });

    return NextResponse.json({ errors: result, setupRequired: false });
  } catch (err) {
    console.error("[API /error-notebook V2]", err);
    return NextResponse.json({ error: "Erro ao carregar caderno de erros." }, { status: 500 });
  }
}
