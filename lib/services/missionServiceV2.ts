import { getDb } from "@/lib/db";
import type { DailyMission, MissionSlot } from "@/lib/types";
import { getMasteryLevel } from "@/lib/services/syllabusService";
import { DEFAULT_USER_ID } from "@/lib/services/userService";
import { calculateStudyPriority } from "@/lib/services/priorityServiceV2";

interface Candidate {
  id: number;
  title: string;
  discipline: string;
  studied: number | null;
  mastery_score: number | null;
  consecutive_wrong: number | null;
  next_review: string | null;
  correct_answers: number | null;
  wrong_answers: number | null;
}

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date).getTime() <= Date.now();
}

function missionType(item: Candidate): MissionSlot["mission_type"] {
  if (isOverdue(item.next_review) && item.studied) return "RECICLAGEM";
  if (!item.studied) return "NOVO";
  if ((item.mastery_score ?? 0) < 60) return "FRACO";
  return "CONSOLIDACAO";
}

export function generateDailyMissionV2(userId = DEFAULT_USER_ID): DailyMission {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const items = db.prepare(`
    SELECT si.id, si.title, si.discipline,
           sp.studied, sp.mastery_score, sp.consecutive_wrong,
           sp.next_review, sp.correct_answers, sp.wrong_answers
      FROM syllabus_items si
      LEFT JOIN syllabus_progress sp
        ON sp.syllabus_item_id = si.id AND sp.user_id = ?
     WHERE si.active = 1 OR si.active IS NULL
     ORDER BY si.edital_order ASC, si.id ASC
  `).all(userId) as Candidate[];

  const ranked = items
    .map((item) => {
      const questionCount = (item.correct_answers ?? 0) + (item.wrong_answers ?? 0);
      const priority = calculateStudyPriority({
        discipline: item.discipline,
        mastery: item.mastery_score,
        questionCount,
        recurrentErrors: item.consecutive_wrong ?? 0,
        overdueReview: isOverdue(item.next_review) && Boolean(item.studied),
        studied: Boolean(item.studied),
        incidence: null,
      });
      return { item, priority };
    })
    .sort((a, b) => b.priority.score - a.priority.score || a.item.id - b.item.id);

  // Mantém a missão curta. O ranking já incorpora peso 50/30/20,
  // fraqueza, evidência, revisão vencida, recorrência e conteúdo novo.
  const selected = ranked.slice(0, 5);
  const slots: MissionSlot[] = selected.map(({ item, priority }, index) => ({
    syllabus_item_id: item.id,
    title: item.title,
    discipline: item.discipline,
    mission_type: missionType(item),
    priority_score: priority.score,
    time_allocated_minutes: index < 4 ? 10 : 5,
    mastery_score: item.mastery_score ?? 0,
    mastery_level: getMasteryLevel(item.mastery_score ?? 0),
    reason: `${priority.level}: ${priority.reasons.slice(0, 2).join(" ")}`,
  }));

  return {
    mission_date: today,
    target_duration_minutes: slots.reduce((sum, slot) => sum + slot.time_allocated_minutes, 0),
    slots,
    total_items: slots.length,
    completed_items: 0,
    completed: false,
  };
}
