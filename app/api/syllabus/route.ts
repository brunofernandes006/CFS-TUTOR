import { NextRequest, NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

type Discipline = { id: number; name: string; weighted_share: number };
type Item = { id: string; title: string; edital_code: string | null; edital_order: number; discipline_id: number; parent_id: string | null };
type Progress = { syllabus_item_id: string; studied: boolean; mastery_score: number; evidence_count: number; recurrent_errors: number };
type Review = { syllabus_item_id: string; next_review_at: string };
type Incidence = { syllabus_item_id: string; incidence_score: number | null };

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ items: [], setupRequired: true });

    const filter = req.nextUrl.searchParams.get("filter") ?? "todos";
    const disciplineFilter = req.nextUrl.searchParams.get("discipline") ?? "";

    const [disciplines, items, progress, reviews, incidence] = await Promise.all([
      supabaseSelect<Discipline[]>("disciplines", new URLSearchParams({ select: "id,name,weighted_share", active: "eq.true", order: "display_order.asc" })),
      supabaseSelect<Item[]>("syllabus_items", new URLSearchParams({ select: "id,title,edital_code,edital_order,discipline_id,parent_id", active: "eq.true", order: "edital_order.asc" })),
      supabaseSelect<Progress[]>("topic_progress", new URLSearchParams({ select: "syllabus_item_id,studied,mastery_score,evidence_count,recurrent_errors", user_id: `eq.${DEFAULT_USER_ID}` })),
      supabaseSelect<Review[]>("review_schedule", new URLSearchParams({ select: "syllabus_item_id,next_review_at", user_id: `eq.${DEFAULT_USER_ID}` })),
      supabaseSelect<Incidence[]>("exam_incidence", new URLSearchParams({ select: "syllabus_item_id,incidence_score" })),
    ]);

    const disciplineMap = new Map(disciplines.map((d) => [d.id, d]));
    const progressMap = new Map(progress.map((p) => [p.syllabus_item_id, p]));
    const reviewMap = new Map(reviews.map((r) => [r.syllabus_item_id, r]));
    const incidenceMap = new Map(incidence.map((i) => [i.syllabus_item_id, i]));
    const now = Date.now();

    let result = items.flatMap((item) => {
      const discipline = disciplineMap.get(item.discipline_id);
      if (!discipline) return [];
      const p = progressMap.get(item.id);
      const review = reviewMap.get(item.id);
      return [{
        id: item.id,
        title: item.title,
        editalCode: item.edital_code,
        parentId: item.parent_id,
        discipline: discipline.name,
        weightedShare: Number(discipline.weighted_share),
        studied: p?.studied ?? false,
        mastery: p?.evidence_count && p.evidence_count >= 5 ? Number(p.mastery_score) : null,
        evidenceCount: p?.evidence_count ?? 0,
        recurrentErrors: p?.recurrent_errors ?? 0,
        nextReviewAt: review?.next_review_at ?? null,
        reviewOverdue: Boolean(review?.next_review_at && new Date(review.next_review_at).getTime() <= now),
        incidence: incidenceMap.get(item.id)?.incidence_score == null ? null : Number(incidenceMap.get(item.id)?.incidence_score),
      }];
    });

    if (disciplineFilter) result = result.filter((item) => item.discipline === disciplineFilter);
    if (filter === "nao_estudados") result = result.filter((item) => !item.studied);
    if (filter === "criticos") result = result.filter((item) => item.mastery != null && item.mastery < 60);
    if (filter === "atencao") result = result.filter((item) => item.mastery != null && item.mastery >= 60 && item.mastery < 80);
    if (filter === "fortes") result = result.filter((item) => item.mastery != null && item.mastery >= 90);
    if (filter === "revisao_pendente") result = result.filter((item) => item.reviewOverdue);

    return NextResponse.json({ items: result, setupRequired: items.length === 0 });
  } catch (err) {
    console.error("[API /syllabus V2]", err);
    return NextResponse.json({ error: "Erro ao carregar o edital." }, { status: 500 });
  }
}
