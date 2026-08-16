// ============================================================
// CFS Tutor — Serviço de Syllabus
// ============================================================

import { getDb } from "@/lib/db";
import type {
  SyllabusItem,
  SyllabusItemWithProgress,
  SyllabusProgress,
  MasteryLevel,
} from "@/lib/types";
import { DEFAULT_USER_ID } from "./userService";

export const DISCIPLINE_WEIGHTS: Record<string, number> = {
  "Conhecimentos Profissionais": 5,
  "Língua Portuguesa": 3,
  "Matemática e Raciocínio Lógico": 2,
};

export function getMasteryLevel(score: number): MasteryLevel {
  if (score < 40) return "CRÍTICO";
  if (score < 60) return "FRACO";
  if (score < 75) return "EM_DESENVOLVIMENTO";
  if (score < 90) return "BOM";
  return "DOMINADO";
}

export function getAllSyllabusItems(): SyllabusItem[] {
  const db = getDb();
  return db
    .prepare(
      "SELECT * FROM syllabus_items WHERE active = 1 OR active IS NULL ORDER BY edital_order ASC, id ASC"
    )
    .all() as SyllabusItem[];
}

export function getSyllabusItemById(id: number): SyllabusItem | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM syllabus_items WHERE id = ?").get(id) as
      | SyllabusItem
      | undefined) ?? null
  );
}

export function getSyllabusWithProgress(
  userId = DEFAULT_USER_ID
): SyllabusItemWithProgress[] {
  const db = getDb();

  const items = getAllSyllabusItems();

  const progressMap = new Map<number, SyllabusProgress>();
  const progressRows = db
    .prepare("SELECT * FROM syllabus_progress WHERE user_id = ?")
    .all(userId) as SyllabusProgress[];
  for (const p of progressRows) {
    progressMap.set(p.syllabus_item_id, p);
  }

  const questionCountMap = new Map<number, number>();
  const qcRows = db
    .prepare(
      "SELECT syllabus_item_id, COUNT(*) as cnt FROM questions WHERE active = 1 GROUP BY syllabus_item_id"
    )
    .all() as { syllabus_item_id: number; cnt: number }[];
  for (const r of qcRows) {
    questionCountMap.set(r.syllabus_item_id, r.cnt);
  }

  return items.map((item) => {
    const progress = progressMap.get(item.id) ?? null;
    const mastery_score = progress?.mastery_score ?? 0;
    return {
      ...item,
      progress,
      mastery_level: getMasteryLevel(mastery_score),
      questions_available: questionCountMap.get(item.id) ?? 0,
    };
  });
}

export function getSyllabusTree(
  userId = DEFAULT_USER_ID
): SyllabusItemWithProgress[] {
  return getSyllabusWithProgress(userId).filter(
    (item) => item.parent_id === null
  );
}

export function getChildItems(
  parentId: number,
  userId = DEFAULT_USER_ID
): SyllabusItemWithProgress[] {
  return getSyllabusWithProgress(userId).filter(
    (item) => item.parent_id === parentId
  );
}

export function getSyllabusStats(userId = DEFAULT_USER_ID): {
  total: number;
  studied: number;
  critical: number;
  weak: number;
  dominated: number;
  coverage: number;
} {
  const items = getSyllabusWithProgress(userId);
  const total = items.length;
  const studied = items.filter((i) => i.progress?.studied).length;
  const critical = items.filter(
    (i) => i.progress && getMasteryLevel(i.progress.mastery_score) === "CRÍTICO"
  ).length;
  const weak = items.filter(
    (i) => i.progress && getMasteryLevel(i.progress.mastery_score) === "FRACO"
  ).length;
  const dominated = items.filter(
    (i) =>
      i.progress && getMasteryLevel(i.progress.mastery_score) === "DOMINADO"
  ).length;
  return {
    total,
    studied,
    critical,
    weak,
    dominated,
    coverage: total > 0 ? Math.round((studied / total) * 100) : 0,
  };
}
