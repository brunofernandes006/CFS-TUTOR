import "server-only";

import { DEFAULT_USER_ID } from "@/lib/config/user";
import { generateDailyMissionV2 } from "@/lib/services/missionServiceV2";
import { supabaseSelect } from "@/lib/server/supabaseRest";
import type { HomeDataV2, TopicCandidateV2 } from "@/lib/typesV2";

type DisciplineRow = { id: number; name: string; weighted_share: number };
type SyllabusRow = { id: string; title: string; discipline_id: number; active: boolean };
type ProgressRow = {
  syllabus_item_id: string;
  studied: boolean;
  mastery_score: number;
  evidence_count: number;
  recurrent_errors: number;
};
type ReviewRow = { syllabus_item_id: string; next_review_at: string };
type IncidenceRow = { syllabus_item_id: string; incidence_score: number | null };
type AttemptRow = { is_correct: boolean };

export async function loadHomeDataV2(): Promise<HomeDataV2> {
  const [disciplines, syllabus, progress, reviews, incidence, attempts] = await Promise.all([
    supabaseSelect<DisciplineRow[]>(
      "disciplines",
      new URLSearchParams({ select: "id,name,weighted_share", active: "eq.true", order: "display_order.asc" })
    ),
    supabaseSelect<SyllabusRow[]>(
      "syllabus_items",
      new URLSearchParams({ select: "id,title,discipline_id,active", active: "eq.true", order: "edital_order.asc" })
    ),
    supabaseSelect<ProgressRow[]>(
      "topic_progress",
      new URLSearchParams({
        select: "syllabus_item_id,studied,mastery_score,evidence_count,recurrent_errors",
        user_id: `eq.${DEFAULT_USER_ID}`,
      })
    ),
    supabaseSelect<ReviewRow[]>(
      "review_schedule",
      new URLSearchParams({ select: "syllabus_item_id,next_review_at", user_id: `eq.${DEFAULT_USER_ID}` })
    ),
    supabaseSelect<IncidenceRow[]>(
      "exam_incidence",
      new URLSearchParams({ select: "syllabus_item_id,incidence_score" })
    ),
    supabaseSelect<AttemptRow[]>(
      "question_attempts",
      new URLSearchParams({ select: "is_correct", user_id: `eq.${DEFAULT_USER_ID}`, limit: "5000" })
    ),
  ]);

  const disciplineMap = new Map(disciplines.map((row) => [row.id, row]));
  const progressMap = new Map(progress.map((row) => [row.syllabus_item_id, row]));
  const reviewMap = new Map(reviews.map((row) => [row.syllabus_item_id, row]));
  const incidenceMap = new Map(incidence.map((row) => [row.syllabus_item_id, row]));

  const candidates: TopicCandidateV2[] = syllabus.flatMap((item) => {
    const discipline = disciplineMap.get(item.discipline_id);
    if (!discipline) return [];
    const p = progressMap.get(item.id);
    const review = reviewMap.get(item.id);
    const inc = incidenceMap.get(item.id);
    return [{
      id: item.id,
      title: item.title,
      discipline: discipline.name,
      weightedShare: Number(discipline.weighted_share) / 100,
      studied: p?.studied ?? false,
      mastery: p ? Number(p.mastery_score) : null,
      evidenceCount: p?.evidence_count ?? 0,
      recurrentErrors: p?.recurrent_errors ?? 0,
      nextReviewAt: review?.next_review_at ?? null,
      incidence: inc?.incidence_score == null ? null : Number(inc.incidence_score),
    }];
  });

  const mission = generateDailyMissionV2(candidates, 45);
  const correct = attempts.filter((a) => a.is_correct).length;
  const questionsAnswered = attempts.length;
  const accuracy = questionsAnswered > 0 ? Math.round((correct / questionsAnswered) * 1000) / 10 : null;
  const topicsStudied = progress.filter((p) => p.studied).length;
  const pendingReviews = reviews.filter((r) => new Date(r.next_review_at).getTime() <= Date.now()).length;
  const evidenceSufficient = questionsAnswered >= 30 && progress.filter((p) => p.evidence_count >= 5).length >= 3;

  const studiedWithEvidence = progress.filter((p) => p.studied && p.evidence_count >= 5);
  const readiness = evidenceSufficient && studiedWithEvidence.length > 0
    ? Math.round(studiedWithEvidence.reduce((sum, p) => sum + Number(p.mastery_score), 0) / studiedWithEvidence.length)
    : null;

  const weak = studiedWithEvidence
    .slice()
    .sort((a, b) => Number(a.mastery_score) - Number(b.mastery_score))[0];
  const weakSyllabus = weak ? syllabus.find((s) => s.id === weak.syllabus_item_id) : undefined;
  const weakDiscipline = weakSyllabus ? disciplineMap.get(weakSyllabus.discipline_id) : undefined;

  return {
    setupRequired: syllabus.length === 0,
    mission,
    stats: {
      questionsAnswered,
      accuracy,
      topicsStudied,
      pendingReviews,
      readiness,
      evidenceSufficient,
    },
    weakPoint: weak && weakSyllabus && weakDiscipline
      ? { title: weakSyllabus.title, mastery: Number(weak.mastery_score), discipline: weakDiscipline.name }
      : null,
    disciplineWeights: disciplines.map((d) => ({ name: d.name, share: Number(d.weighted_share) })),
  };
}
