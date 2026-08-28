import { calculateStudyPriority } from "@/lib/services/priorityServiceV2";
import type { DailyMissionV2, TopicCandidateV2 } from "@/lib/typesV2";

function isOverdue(date: string | null): boolean {
  if (!date) return false;
  return new Date(date).getTime() <= Date.now();
}

export function generateDailyMissionV2(items: TopicCandidateV2[], targetMinutes = 45): DailyMissionV2 {
  const ranked = items
    .map((item) => {
      const priority = calculateStudyPriority({
        discipline: item.discipline,
        mastery: item.mastery,
        questionCount: item.evidenceCount,
        recurrentErrors: item.recurrentErrors,
        overdueReview: isOverdue(item.nextReviewAt) && item.studied,
        studied: item.studied,
        incidence: item.incidence,
      });
      return { item, priority };
    })
    .sort((a, b) => b.priority.score - a.priority.score || a.item.title.localeCompare(b.item.title, "pt-BR"));

  const maxSlots = Math.max(1, Math.min(5, Math.floor(targetMinutes / 10) || 1));
  const selected = ranked.slice(0, maxSlots);
  const baseMinutes = selected.length > 0 ? Math.floor(targetMinutes / selected.length) : 0;

  return {
    date: new Date().toISOString().slice(0, 10),
    targetMinutes,
    slots: selected.map(({ item, priority }, index) => ({
      syllabusItemId: item.id,
      title: item.title,
      discipline: item.discipline,
      priorityScore: priority.score,
      priorityLevel:
        priority.level === "CRÍTICA"
          ? "CRITICA"
          : priority.level === "MÉDIA"
            ? "MEDIA"
            : priority.level,
      minutes: index === selected.length - 1
        ? targetMinutes - baseMinutes * Math.max(0, selected.length - 1)
        : baseMinutes,
      mastery: item.mastery,
      reason: priority.reasons,
    })),
  };
}
