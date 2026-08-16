// ============================================================
// CFS Tutor — Serviço de Dashboard (Fase 7C)
// ============================================================

import { getDb } from "@/lib/db";
import type { DashboardStats, DisciplineSummary, RecentActivity } from "@/lib/types";
import { ensureDefaultUser, DEFAULT_USER_ID } from "./userService";
import { getTotalXp, getStreak, getLevelInfo } from "./xpService";
import { getMasteryLevel, DISCIPLINE_WEIGHTS } from "./syllabusService";
import {
  calculateReadinessWithConfidence,
  calculateConsolidatedMastery,
} from "./pedagogyService";

export function getDashboardStats(userId = DEFAULT_USER_ID): DashboardStats {
  const db = getDb();
  const user = ensureDefaultUser();

  const xp = getTotalXp(userId);
  const { level, xp_to_next } = getLevelInfo(xp);
  const streak = getStreak(userId);
  const readiness = calculateReadinessWithConfidence(userId);

  // Totais de tentativas
  const attRow = db
    .prepare(
      `SELECT COUNT(*) as total, SUM(is_correct) as correct
       FROM question_attempts WHERE user_id = ?`
    )
    .get(userId) as { total: number; correct: number };
  const questionsAnswered = attRow.total ?? 0;
  const correctAnswers = attRow.correct ?? 0;
  const accuracy =
    questionsAnswered > 0
      ? Math.round((correctAnswers / questionsAnswered) * 100)
      : 0;

  // Revisões pendentes
  const reviewRow = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM syllabus_progress
       WHERE user_id = ? AND next_review < date('now')`
    )
    .get(userId) as { cnt: number };
  const pendingReviews = reviewRow.cnt;

  // Itens fracos (mastery < 60, já estudados)
  const weakRow = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM syllabus_progress
       WHERE user_id = ? AND mastery_score < 60 AND studied = 1`
    )
    .get(userId) as { cnt: number };
  const weakItems = weakRow.cnt;

  // Cobertura do edital
  const totalItems = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM syllabus_items WHERE active = 1 OR active IS NULL")
      .get() as { cnt: number }
  ).cnt;
  const studiedItems = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM syllabus_progress WHERE user_id = ? AND studied = 1")
      .get(userId) as { cnt: number }
  ).cnt;
  const editalCoverage =
    totalItems > 0 ? Math.round((studiedItems / totalItems) * 100) : 0;

  // Resumo por disciplina — com domínio consolidado
  const disciplines = Object.keys(DISCIPLINE_WEIGHTS);
  const disciplineSummary: DisciplineSummary[] = disciplines.map((disc) => {
    const totalDisc = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM syllabus_items WHERE discipline = ? AND (active = 1 OR active IS NULL)"
        )
        .get(disc) as { cnt: number }
    ).cnt;

    const studiedDisc = (
      db
        .prepare(
          `SELECT COUNT(*) as cnt FROM syllabus_progress sp
           JOIN syllabus_items si ON si.id = sp.syllabus_item_id
           WHERE sp.user_id = ? AND si.discipline = ? AND sp.studied = 1`
        )
        .get(userId, disc) as { cnt: number }
    ).cnt;

    // Domínio apenas dos itens que foram estudados
    const masteryRow = db
      .prepare(
        `SELECT AVG(sp.mastery_score) as avg
         FROM syllabus_progress sp
         JOIN syllabus_items si ON si.id = sp.syllabus_item_id
         WHERE sp.user_id = ? AND si.discipline = ? AND sp.studied = 1`
      )
      .get(userId, disc) as { avg: number | null };
    const masteryOfStudied = Math.round(masteryRow.avg ?? 0);

    // Cobertura da disciplina
    const coveragePct =
      totalDisc > 0 ? Math.round((studiedDisc / totalDisc) * 100) : 0;

    // Domínio consolidado = mastery_of_studied × (coverage / 100)
    const consolidatedMastery = calculateConsolidatedMastery(
      masteryOfStudied,
      coveragePct
    );

    return {
      discipline: disc,
      weight: DISCIPLINE_WEIGHTS[disc],
      mastery_of_studied: masteryOfStudied,
      coverage_pct: coveragePct,
      consolidated_mastery: consolidatedMastery,
      mastery_level: getMasteryLevel(consolidatedMastery),
      items_total: totalDisc,
      items_studied: studiedDisc,
    };
  });

  // Atividade recente (7 dias)
  const recentRows = db
    .prepare(
      `SELECT date(timestamp) as day,
              COUNT(*) as questions_answered,
              SUM(is_correct) as correct
       FROM question_attempts
       WHERE user_id = ? AND timestamp >= datetime('now', '-7 days')
       GROUP BY day
       ORDER BY day ASC`
    )
    .all(userId) as RecentActivity[];

  return {
    user,
    level,
    xp,
    xp_to_next,
    streak,
    readiness,
    questions_answered: questionsAnswered,
    correct_answers: correctAnswers,
    accuracy,
    pending_reviews: pendingReviews,
    weak_items: weakItems,
    edital_coverage: editalCoverage,
    discipline_summary: disciplineSummary,
    recent_activity: recentRows,
  };
}
