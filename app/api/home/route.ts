import { NextResponse } from "next/server";
import {
  generateDailyMission,
  getPendingReviews,
  calculateReadinessWithConfidence,
} from "@/lib/services/pedagogyService";
import { getDashboardStats } from "@/lib/services/dashboardService";
import { getSyllabusWithProgress } from "@/lib/services/syllabusService";
import { getSimulationHistory } from "@/lib/services/simulationService";
import { getDb } from "@/lib/db";
import { ensureDefaultUser, DEFAULT_USER_ID } from "@/lib/services/userService";
import type { SyllabusItemWithProgress } from "@/lib/types";

export async function GET() {
  try {
    ensureDefaultUser();

    const mission = generateDailyMission(DEFAULT_USER_ID);
    const stats = getDashboardStats(DEFAULT_USER_ID);
    const readiness = calculateReadinessWithConfidence(DEFAULT_USER_ID);
    const reviews = getPendingReviews(DEFAULT_USER_ID);
    const allItems = getSyllabusWithProgress(DEFAULT_USER_ID);

    const overdue = reviews.filter((r) => r.overdue);
    const today = reviews.filter((r) => {
      if (!r.next_review) return false;
      const d = new Date(r.next_review);
      const now = new Date();
      return !r.overdue && d.toDateString() === now.toDateString();
    });
    const upcoming = reviews.filter(
      (r) => !r.overdue && r.next_review && new Date(r.next_review) > new Date()
    );

    const continueStudying = allItems
      .filter(
        (i) =>
          i.progress?.studied === 1 &&
          (i.progress?.mastery_score ?? 0) < 90
      )
      .sort((a, b) => (b.progress?.mastery_score ?? 0) - (a.progress?.mastery_score ?? 0))
      .slice(0, 12);

    const recommended = allItems
      .filter(
        (i) =>
          !i.progress ||
          i.progress.studied === 0 ||
          (i.progress?.mastery_score ?? 0) < 50
      )
      .sort((a, b) => (a.progress?.mastery_score ?? 0) - (b.progress?.mastery_score ?? 0))
      .slice(0, 12);

    const weakPoints = allItems
      .filter((i) => (i.progress?.mastery_score ?? 0) < 40 && i.progress?.studied === 1)
      .sort((a, b) => (a.progress?.mastery_score ?? 0) - (b.progress?.mastery_score ?? 0))
      .slice(0, 8);

    const byDiscipline: Record<string, SyllabusItemWithProgress[]> = {
      "Língua Portuguesa": [],
      "Matemática e Raciocínio Lógico": [],
      "Conhecimentos Profissionais": [],
    };
    for (const item of allItems) {
      if (item.discipline in byDiscipline) {
        byDiscipline[item.discipline].push(item);
      }
    }

    const cfs26Icc = allItems
      .filter(
        (i) =>
          i.source_reference?.includes("ICC") ||
          (i as any).cfs26_priority === 1
      )
      .slice(0, 20);

    const db = getDb();
    const documents = db
      .prepare(
        `SELECT * FROM documents ORDER BY cfs26_priority DESC, titulo ASC LIMIT 20`
      )
      .all();

    const simulations = getSimulationHistory(DEFAULT_USER_ID).slice(0, 3);

    return NextResponse.json({
      mission,
      stats: {
        level: stats.level,
        xp: stats.xp,
        xp_to_next: stats.xp_to_next,
        streak: stats.streak,
        accuracy: stats.accuracy,
        readiness_display: readiness.readiness_display,
        confidence_label: readiness.confidence_label,
      },
      reviews: { overdue, today, upcoming },
      continueStudying,
      recommended,
      weakPoints,
      byDiscipline,
      cfs26Icc,
      documents,
      simulations,
    });
  } catch (err) {
    console.error("[API /home]", err);
    return NextResponse.json({ error: "Erro ao carregar dados da home" }, { status: 500 });
  }
}
