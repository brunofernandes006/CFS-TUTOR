import { NextResponse } from "next/server";
import { DEFAULT_USER_ID } from "@/lib/config/user";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

type Discipline = { id: number; name: string; exam_weight: number; weighted_share: number };
type Item = { id: string; title: string; discipline_id: number };
type Progress = {
  syllabus_item_id: string;
  studied: boolean;
  mastery_score: number;
  evidence_count: number;
  questions_answered: number;
  correct_answers: number;
  wrong_answers: number;
  recurrent_errors: number;
};
type Attempt = { is_correct: boolean; answered_at: string; syllabus_item_id: string | null };

function band(score: number): "forte" | "bom" | "atencao" | "fraco" | "critico" {
  if (score >= 90) return "forte";
  if (score >= 80) return "bom";
  if (score >= 70) return "atencao";
  if (score >= 60) return "fraco";
  return "critico";
}

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ setupRequired: true, evidenceSufficient: false, readiness: null, accuracy: null, questionsAnswered: 0, editalCoverage: 0, disciplines: [], criticalItems: [], strongItems: [], evolution: [] });
    }

    const [disciplines, items, progress, attempts] = await Promise.all([
      supabaseSelect<Discipline[]>("disciplines", new URLSearchParams({ select: "id,name,exam_weight,weighted_share", active: "eq.true", order: "display_order.asc" })),
      supabaseSelect<Item[]>("syllabus_items", new URLSearchParams({ select: "id,title,discipline_id", active: "eq.true" })),
      supabaseSelect<Progress[]>("topic_progress", new URLSearchParams({
        select: "syllabus_item_id,studied,mastery_score,evidence_count,questions_answered,correct_answers,wrong_answers,recurrent_errors",
        user_id: `eq.${DEFAULT_USER_ID}`,
      })),
      supabaseSelect<Attempt[]>("question_attempts", new URLSearchParams({ select: "is_correct,answered_at,syllabus_item_id", user_id: `eq.${DEFAULT_USER_ID}`, order: "answered_at.asc", limit: "5000" })),
    ]);

    const itemMap = new Map(items.map((item) => [item.id, item]));
    const progressMap = new Map(progress.map((row) => [row.syllabus_item_id, row]));
    const correct = attempts.filter((attempt) => attempt.is_correct).length;
    const accuracy = attempts.length > 0 ? Math.round((correct / attempts.length) * 1000) / 10 : null;
    const studiedCount = progress.filter((row) => row.studied).length;
    const editalCoverage = items.length > 0 ? Math.round((studiedCount / items.length) * 1000) / 10 : 0;

    const disciplineStats = disciplines.map((discipline) => {
      const disciplineItems = items.filter((item) => item.discipline_id === discipline.id);
      const rows = disciplineItems.map((item) => progressMap.get(item.id)).filter((row): row is Progress => Boolean(row));
      const trusted = rows.filter((row) => row.evidence_count >= 5);
      const mastery = trusted.length > 0 ? Math.round(trusted.reduce((sum, row) => sum + Number(row.mastery_score), 0) / trusted.length) : null;
      const covered = rows.filter((row) => row.studied).length;
      const coverage = disciplineItems.length > 0 ? Math.round((covered / disciplineItems.length) * 1000) / 10 : 0;
      const questions = rows.reduce((sum, row) => sum + row.questions_answered, 0);
      const correctAnswers = rows.reduce((sum, row) => sum + row.correct_answers, 0);
      return {
        discipline: discipline.name,
        examWeight: discipline.exam_weight,
        weightedShare: Number(discipline.weighted_share),
        mastery,
        masteryBand: mastery == null ? null : band(mastery),
        coverage,
        itemsStudied: covered,
        itemsTotal: disciplineItems.length,
        evidenceTopics: trusted.length,
        questionsAnswered: questions,
        accuracy: questions > 0 ? Math.round((correctAnswers / questions) * 1000) / 10 : null,
      };
    });

    const evidenceSufficient = attempts.length >= 30 && disciplineStats.some((discipline) => discipline.evidenceTopics >= 3);
    const readinessContributors = disciplineStats.filter((discipline) => discipline.mastery != null && discipline.evidenceTopics >= 3);
    const coveredWeight = readinessContributors.reduce((sum, discipline) => sum + discipline.weightedShare, 0);
    const readiness = evidenceSufficient && coveredWeight > 0
      ? Math.round((readinessContributors.reduce((sum, discipline) => sum + Number(discipline.mastery) * discipline.weightedShare, 0) / coveredWeight) * 10) / 10
      : null;

    const trustedTopics = progress.filter((row) => row.evidence_count >= 5).flatMap((row) => {
      const item = itemMap.get(row.syllabus_item_id);
      const discipline = item ? disciplines.find((d) => d.id === item.discipline_id) : undefined;
      if (!item || !discipline) return [];
      return [{
        syllabusItemId: row.syllabus_item_id,
        title: item.title,
        discipline: discipline.name,
        mastery: Number(row.mastery_score),
        recurrentErrors: row.recurrent_errors,
        evidenceCount: row.evidence_count,
      }];
    });

    const criticalItems = trustedTopics.filter((topic) => topic.mastery < 70).sort((a, b) => a.mastery - b.mastery || b.recurrentErrors - a.recurrentErrors).slice(0, 10);
    const strongItems = trustedTopics.filter((topic) => topic.mastery >= 90).sort((a, b) => b.mastery - a.mastery).slice(0, 10);

    const daily = new Map<string, { answered: number; correct: number }>();
    const cutoff = Date.now() - 30 * 86400000;
    for (const attempt of attempts) {
      const timestamp = new Date(attempt.answered_at).getTime();
      if (timestamp < cutoff) continue;
      const day = attempt.answered_at.slice(0, 10);
      const entry = daily.get(day) ?? { answered: 0, correct: 0 };
      entry.answered += 1;
      if (attempt.is_correct) entry.correct += 1;
      daily.set(day, entry);
    }
    const evolution = Array.from(daily.entries()).map(([day, value]) => ({
      day,
      answered: value.answered,
      correct: value.correct,
      accuracy: Math.round((value.correct / value.answered) * 1000) / 10,
    }));

    return NextResponse.json({
      setupRequired: items.length === 0,
      evidenceSufficient,
      readiness,
      accuracy,
      questionsAnswered: attempts.length,
      editalCoverage,
      disciplines: disciplineStats,
      criticalItems,
      strongItems,
      evolution,
    });
  } catch (err) {
    console.error("[API /performance V2]", err);
    return NextResponse.json({ error: "Erro ao carregar desempenho." }, { status: 500 });
  }
}
