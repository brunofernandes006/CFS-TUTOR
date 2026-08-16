// ============================================================
// CFS Tutor — Serviço de Questões
// ============================================================

import { getDb } from "@/lib/db";
import type {
  Question,
  QuestionWithOptions,
  QuestionOption,
  QuestionSource,
} from "@/lib/types";

export function getQuestionById(id: number): QuestionWithOptions | null {
  const db = getDb();
  const q = db
    .prepare("SELECT * FROM questions WHERE id = ? AND active = 1")
    .get(id) as Question | undefined;
  if (!q) return null;
  return attachOptionsAndSource(q);
}

export function getQuestionsForSyllabusItem(
  syllabusItemId: number
): QuestionWithOptions[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT * FROM questions WHERE syllabus_item_id = ? AND active = 1 ORDER BY id ASC"
    )
    .all(syllabusItemId) as Question[];
  return rows.map(attachOptionsAndSource);
}

export function getNextQuestion(
  syllabusItemId: number,
  excludeIds: number[] = []
): QuestionWithOptions | null {
  const db = getDb();
  const placeholder =
    excludeIds.length > 0
      ? `AND id NOT IN (${excludeIds.map(() => "?").join(",")})`
      : "";
  const q = db
    .prepare(
      `SELECT * FROM questions
       WHERE syllabus_item_id = ? AND active = 1 ${placeholder}
       ORDER BY RANDOM() LIMIT 1`
    )
    .get(syllabusItemId, ...excludeIds) as Question | undefined;
  if (!q) return null;
  return attachOptionsAndSource(q);
}

export function getRandomQuestion(filters?: {
  discipline?: string;
  origin?: string;
}): QuestionWithOptions | null {
  const db = getDb();
  const conditions: string[] = ["active = 1"];
  const params: (string | number)[] = [];

  if (filters?.discipline) {
    conditions.push("discipline = ?");
    params.push(filters.discipline);
  }
  if (filters?.origin) {
    conditions.push("origin = ?");
    params.push(filters.origin);
  }

  const q = db
    .prepare(
      `SELECT * FROM questions WHERE ${conditions.join(" AND ")} ORDER BY RANDOM() LIMIT 1`
    )
    .get(...params) as Question | undefined;

  if (!q) return null;
  return attachOptionsAndSource(q);
}

export function countQuestions(filters?: {
  discipline?: string;
  origin?: string;
}): number {
  const db = getDb();
  const conditions: string[] = ["active = 1"];
  const params: (string | number)[] = [];

  if (filters?.discipline) {
    conditions.push("discipline = ?");
    params.push(filters.discipline);
  }
  if (filters?.origin) {
    conditions.push("origin = ?");
    params.push(filters.origin);
  }

  const row = db
    .prepare(
      `SELECT COUNT(*) as cnt FROM questions WHERE ${conditions.join(" AND ")}`
    )
    .get(...params) as { cnt: number };
  return row.cnt;
}

function attachOptionsAndSource(q: Question): QuestionWithOptions {
  const db = getDb();
  const options = db
    .prepare(
      "SELECT * FROM question_options WHERE question_id = ? ORDER BY option_index ASC"
    )
    .all(q.id) as QuestionOption[];
  const source = (db
    .prepare("SELECT * FROM question_sources WHERE question_id = ?")
    .get(q.id) as QuestionSource | undefined) ?? null;
  return { ...q, options, source };
}
