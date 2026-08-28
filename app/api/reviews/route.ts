import { NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

type Review = { syllabus_item_id: string; stage: number; next_review_at: string; review_count: number; last_result: string | null };
type Item = { id: string; title: string; discipline_id: number };
type Discipline = { id: number; name: string };
type Progress = { syllabus_item_id: string; mastery_score: number; evidence_count: number };

export async function GET() {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ overdue: [], upcoming: [], all: [], setupRequired: true });

    const [reviews, items, disciplines, progress] = await Promise.all([
      supabaseSelect<Review[]>("review_schedule", new URLSearchParams({ select: "syllabus_item_id,stage,next_review_at,review_count,last_result", user_id: `eq.${DEFAULT_USER_ID}`, order: "next_review_at.asc" })),
      supabaseSelect<Item[]>("syllabus_items", new URLSearchParams({ select: "id,title,discipline_id", active: "eq.true" })),
      supabaseSelect<Discipline[]>("disciplines", new URLSearchParams({ select: "id,name", active: "eq.true" })),
      supabaseSelect<Progress[]>("topic_progress", new URLSearchParams({ select: "syllabus_item_id,mastery_score,evidence_count", user_id: `eq.${DEFAULT_USER_ID}` })),
    ]);

    const itemMap = new Map(items.map((i) => [i.id, i]));
    const disciplineMap = new Map(disciplines.map((d) => [d.id, d.name]));
    const progressMap = new Map(progress.map((p) => [p.syllabus_item_id, p]));
    const now = Date.now();
    const all = reviews.flatMap((review) => {
      const item = itemMap.get(review.syllabus_item_id);
      if (!item) return [];
      const p = progressMap.get(review.syllabus_item_id);
      return [{
        syllabusItemId: review.syllabus_item_id,
        title: item.title,
        discipline: disciplineMap.get(item.discipline_id) ?? "",
        stage: review.stage,
        nextReviewAt: review.next_review_at,
        reviewCount: review.review_count,
        lastResult: review.last_result,
        overdue: new Date(review.next_review_at).getTime() <= now,
        mastery: p && p.evidence_count >= 5 ? Number(p.mastery_score) : null,
        evidenceCount: p?.evidence_count ?? 0,
      }];
    });

    return NextResponse.json({
      overdue: all.filter((r) => r.overdue),
      upcoming: all.filter((r) => !r.overdue),
      all,
      setupRequired: items.length === 0,
    });
  } catch (err) {
    console.error("[API /reviews V2]", err);
    return NextResponse.json({ error: "Erro ao carregar revisões." }, { status: 500 });
  }
}
