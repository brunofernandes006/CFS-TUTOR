import { getDb } from "../db";

export interface BackupData {
  version: 1;
  exported_at: string;
  settings?: Record<string, unknown>;
  syllabus_progress: unknown[];
  user_xp: unknown[];
  xp_events: unknown[];
  question_attempts: unknown[];
  error_notebook: unknown[];
  question_favorites: unknown[];
  simulations: unknown[];
  simulation_questions: unknown[];
  simulation_answers: unknown[];
}

const EXPORT_TABLES: Array<{ key: keyof BackupData; table: string }> = [
  { key: "syllabus_progress", table: "syllabus_progress" },
  { key: "user_xp", table: "user_xp" },
  { key: "xp_events", table: "xp_events" },
  { key: "question_attempts", table: "question_attempts" },
  { key: "error_notebook", table: "error_notebook" },
  { key: "question_favorites", table: "question_favorites" },
  { key: "simulations", table: "simulations" },
  { key: "simulation_questions", table: "simulation_questions" },
  { key: "simulation_answers", table: "simulation_answers" },
];

const PROGRESS_TABLES = [
  "syllabus_progress",
  "user_xp",
  "xp_events",
  "question_attempts",
  "error_notebook",
  "question_favorites",
  "simulations",
  "simulation_questions",
  "simulation_answers",
];

export function exportBackup(userId: number): BackupData {
  const db = getDb();
  const data: BackupData = {
    version: 1,
    exported_at: new Date().toISOString(),
    syllabus_progress: [],
    user_xp: [],
    xp_events: [],
    question_attempts: [],
    error_notebook: [],
    question_favorites: [],
    simulations: [],
    simulation_questions: [],
    simulation_answers: [],
  };

  for (const { key, table } of EXPORT_TABLES) {
    try {
      (data[key] as unknown[]) = db.prepare(`SELECT * FROM [${table}] WHERE user_id = ?`).all(userId);
    } catch {
      (data[key] as unknown[]) = [];
    }
  }

  return data;
}

function validateBackupSchema(data: unknown): data is BackupData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (!Array.isArray(d.syllabus_progress)) return false;
  return true;
}

export function importBackup(userId: number, data: BackupData): { success: boolean; message: string } {
  if (!validateBackupSchema(data)) {
    return { success: false, message: "Schema de backup inválido." };
  }

  const db = getDb();
  const transaction = db.transaction(() => {
    for (const table of PROGRESS_TABLES) {
      db.prepare(`DELETE FROM [${table}] WHERE user_id = ?`).run(userId);
    }

    const tableMap: Array<{ table: string; rows: unknown[] }> = [
      { table: "syllabus_progress", rows: data.syllabus_progress },
      { table: "user_xp", rows: data.user_xp },
      { table: "xp_events", rows: data.xp_events },
      { table: "question_attempts", rows: data.question_attempts },
      { table: "error_notebook", rows: data.error_notebook },
      { table: "question_favorites", rows: data.question_favorites },
      { table: "simulations", rows: data.simulations },
      { table: "simulation_questions", rows: data.simulation_questions },
      { table: "simulation_answers", rows: data.simulation_answers },
    ];

    for (const { table, rows } of tableMap) {
      if (rows.length === 0) continue;
      const cols = Object.keys(rows[0] as object).filter((c) => c !== "id");
      const placeholders = cols.map(() => "?").join(", ");
      const sql = `INSERT INTO [${table}] (${cols.map((c) => `[${c}]`).join(", ")}) VALUES (${placeholders})`;
      const stmt = db.prepare(sql);
      for (const row of rows) {
        const values = cols.map((c) => (row as Record<string, unknown>)[c]);
        stmt.run(...values);
      }
    }
  });

  transaction();
  return { success: true, message: "Backup restaurado com sucesso." };
}

export function resetProgress(userId: number): { success: boolean; message: string } {
  const db = getDb();
  const transaction = db.transaction(() => {
    for (const table of PROGRESS_TABLES) {
      try {
        db.prepare(`DELETE FROM [${table}] WHERE user_id = ?`).run(userId);
      } catch {
        // table may not have user_id column (simulations etc may use different column)
      }
    }
    // Also reset simulations by their user_id
    try {
      db.prepare(`DELETE FROM simulation_answers WHERE simulation_id IN (SELECT id FROM simulations WHERE user_id = ?)`).run(userId);
      db.prepare(`DELETE FROM simulation_questions WHERE simulation_id IN (SELECT id FROM simulations WHERE user_id = ?)`).run(userId);
      db.prepare(`DELETE FROM simulations WHERE user_id = ?`).run(userId);
    } catch {
      // ignore
    }
  });

  transaction();
  return { success: true, message: "Progresso resetado. Biblioteca e questões preservadas." };
}
