import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_USER_ID } from "@/lib/services/userService";
import { getMasteryLevel, DISCIPLINE_WEIGHTS } from "@/lib/services/syllabusService";
import {
  calculateReadinessWithConfidence,
  calculateConsolidatedMastery,
} from "@/lib/services/pedagogyService";

export async function GET() {
  try {
    const db = getDb();
    const userId = DEFAULT_USER_ID;
    const readiness = calculateReadinessWithConfidence(userId);

    // Domínio por disciplina com consolidado
    const disciplineStats = Object.keys(DISCIPLINE_WEIGHTS).map((disc) => {
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
      const masteryRow = db
        .prepare(
          `SELECT AVG(sp.mastery_score) as avg
           FROM syllabus_progress sp
           JOIN syllabus_items si ON si.id = sp.syllabus_item_id
           WHERE sp.user_id = ? AND si.discipline = ? AND sp.studied = 1`
        )
        .get(userId, disc) as { avg: number | null };
      const masteryOfStudied = Math.round(masteryRow.avg ?? 0);
      const coveragePct = totalDisc > 0 ? Math.round((studiedDisc / totalDisc) * 100) : 0;
      const consolidated = calculateConsolidatedMastery(masteryOfStudied, coveragePct);
      return {
        discipline: disc,
        weight: DISCIPLINE_WEIGHTS[disc],
        mastery_of_studied: masteryOfStudied,
        coverage_pct: coveragePct,
        consolidated_mastery: consolidated,
        mastery_level: getMasteryLevel(consolidated),
        items_studied: studiedDisc,
      };
    });

    // Itens críticos (mastery < 40, estudados)
    const criticalItems = db
      .prepare(
        `SELECT si.title, si.discipline, sp.mastery_score
         FROM syllabus_progress sp
         JOIN syllabus_items si ON si.id = sp.syllabus_item_id
         WHERE sp.user_id = ? AND sp.mastery_score < 40 AND sp.studied = 1
         ORDER BY sp.mastery_score ASC LIMIT 10`
      )
      .all(userId) as { title: string; discipline: string; mastery_score: number }[];

    // Itens dominados
    const dominatedItems = db
      .prepare(
        `SELECT si.title, si.discipline, sp.mastery_score
         FROM syllabus_progress sp
         JOIN syllabus_items si ON si.id = sp.syllabus_item_id
         WHERE sp.user_id = ? AND sp.mastery_score >= 90
         ORDER BY sp.mastery_score DESC LIMIT 10`
      )
      .all(userId) as { title: string; discipline: string; mastery_score: number }[];

    // Evolução (30 dias)
    const evolution = db
      .prepare(
        `SELECT date(timestamp) as day,
                COUNT(*) as answered,
                SUM(is_correct) as correct
         FROM question_attempts
         WHERE user_id = ? AND timestamp >= datetime('now', '-30 days')
         GROUP BY day ORDER BY day ASC`
      )
      .all(userId) as { day: string; answered: number; correct: number }[];

    // Totais gerais
    const totals = db
      .prepare(
        `SELECT COUNT(*) as answered, SUM(is_correct) as correct
         FROM question_attempts WHERE user_id = ?`
      )
      .get(userId) as { answered: number; correct: number };

    const accuracy =
      totals.answered > 0
        ? Math.round(((totals.correct ?? 0) / totals.answered) * 100)
        : 0;

    const totalItems = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM syllabus_items WHERE active = 1 OR active IS NULL"
        )
        .get() as { cnt: number }
    ).cnt;
    const studiedItems = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM syllabus_progress WHERE user_id = ? AND studied = 1"
        )
        .get(userId) as { cnt: number }
    ).cnt;

    return NextResponse.json({
      readiness,
      accuracy,
      questions_answered: totals.answered,
      edital_coverage: totalItems > 0 ? Math.round((studiedItems / totalItems) * 100) : 0,
      discipline_stats: disciplineStats,
      critical_items: criticalItems,
      dominated_items: dominatedItems,
      evolution,
    });
  } catch (err) {
    console.error("[API /performance]", err);
    return NextResponse.json({ error: "Erro ao carregar desempenho" }, { status: 500 });
  }
}
