// ============================================================
// CFS Tutor — Serviço de Simulados (Fase 8A)
// Motor completo: geração, execução, resposta, finalização, score
// SEM interface visual — apenas lógica e persistência
// ============================================================

import { getDb } from "@/lib/db";
import type {
  Simulation,
  SimulationResult,
  SimulationHistoryItem,
  DisciplineScore,
  SimulationInsufficientError,
} from "@/lib/types";
import { OFFICIAL_SIMULATION } from "@/lib/types";
import { SIMULATION_SCHEMA_SQL } from "./simulationSchema";
import { recordAttempt } from "./pedagogyService";
import { awardXp } from "./xpService";
import { DEFAULT_USER_ID } from "./userService";

// Garante que as tabelas de simulado existem (idempotente)
export function ensureSimulationTables(): void {
  const db = getDb();
  for (const stmt of SIMULATION_SCHEMA_SQL.split(";")) {
    const s = stmt.trim();
    if (s) db.exec(s + ";");
  }
}

// ============================================================
// GERAÇÃO — MODO OFICIAL
// ============================================================

export type GenerateOfficialResult =
  | { ok: true; simulation_id: number }
  | { ok: false; error: SimulationInsufficientError };

export function generateOfficialSimulation(
  userId = DEFAULT_USER_ID
): GenerateOfficialResult {
  ensureSimulationTables();
  const db = getDb();
  const required = OFFICIAL_SIMULATION.QUESTIONS_PER_DISCIPLINE;
  const disciplines = Object.keys(OFFICIAL_SIMULATION.DISCIPLINE_WEIGHTS);

  // Verificar disponibilidade por disciplina
  const available: Record<string, number> = {};
  const missing: Record<string, number> = {};
  let insufficient = false;

  for (const disc of disciplines) {
    const row = db
      .prepare(
        "SELECT COUNT(*) as cnt FROM questions WHERE discipline = ? AND active = 1"
      )
      .get(disc) as { cnt: number };
    available[disc] = row.cnt;
    const gap = required - row.cnt;
    if (gap > 0) {
      missing[disc] = gap;
      insufficient = true;
    }
  }

  if (insufficient) {
    return {
      ok: false,
      error: {
        error: "SIMULATION_INSUFFICIENT_QUESTIONS",
        required: Object.fromEntries(disciplines.map((d) => [d, required])),
        available,
        missing,
      },
    };
  }

  // Selecionar questões aleatórias por disciplina
  const tx = db.transaction(() => {
    const simId = db
      .prepare(
        `INSERT INTO simulations
           (user_id, simulation_type, status, target_questions, time_limit_seconds)
         VALUES (?, 'OFICIAL', 'PENDING', ?, ?)`
      )
      .run(userId, OFFICIAL_SIMULATION.TOTAL_QUESTIONS, OFFICIAL_SIMULATION.TIME_LIMIT_SECONDS)
      .lastInsertRowid as number;

    let order = 1;
    for (const disc of disciplines) {
      const weight = OFFICIAL_SIMULATION.DISCIPLINE_WEIGHTS[disc];
      const questions = db
        .prepare(
          "SELECT id FROM questions WHERE discipline = ? AND active = 1 ORDER BY RANDOM() LIMIT ?"
        )
        .all(disc, required) as { id: number }[];

      for (const q of questions) {
        db.prepare(
          `INSERT INTO simulation_questions
             (simulation_id, question_id, discipline, order_number, weight)
           VALUES (?, ?, ?, ?, ?)`
        ).run(simId, q.id, disc, order++, weight);
      }
    }
    return simId;
  });

  const simId = tx() as number;
  return { ok: true, simulation_id: simId };
}

// ============================================================
// GERAÇÃO — MODO ADAPTATIVO
// ============================================================

export function generateAdaptiveSimulation(
  userId = DEFAULT_USER_ID,
  targetQuestions = 30
): { simulation_id: number; actual_questions: number } {
  ensureSimulationTables();
  const db = getDb();

  // Pegar questões priorizando: mastery baixo, revisão vencida, erros, nunca estudado
  // Ordena por: revisão vencida DESC, mastery ASC, error_count DESC, RANDOM
  const candidates = db
    .prepare(
      `SELECT q.id, q.discipline, q.syllabus_item_id,
              COALESCE(sp.mastery_score, 0) as mastery,
              COALESCE(sp.next_review, '9999-12-31') as next_review,
              COALESCE(en.error_count, 0) as error_count,
              COALESCE(sp.studied, 0) as studied
       FROM questions q
       LEFT JOIN syllabus_progress sp
         ON sp.syllabus_item_id = q.syllabus_item_id AND sp.user_id = ?
       LEFT JOIN error_notebook en
         ON en.question_id = q.id AND en.user_id = ?
       WHERE q.active = 1
       ORDER BY
         CASE WHEN sp.next_review < date('now') THEN 0 ELSE 1 END ASC,
         COALESCE(sp.mastery_score, 0) ASC,
         COALESCE(en.error_count, 0) DESC,
         RANDOM()
       LIMIT ?`
    )
    .all(userId, userId, targetQuestions) as Array<{
    id: number;
    discipline: string;
    syllabus_item_id: number;
    mastery: number;
    next_review: string;
    error_count: number;
    studied: number;
  }>;

  const actual = candidates.length;

  const tx = db.transaction(() => {
    const simId = db
      .prepare(
        `INSERT INTO simulations
           (user_id, simulation_type, status, target_questions, time_limit_seconds)
         VALUES (?, 'ADAPTATIVO', 'PENDING', ?, 0)`
      )
      .run(userId, targetQuestions).lastInsertRowid as number;

    candidates.forEach((q, idx) => {
      db.prepare(
        `INSERT INTO simulation_questions
           (simulation_id, question_id, discipline, order_number, weight)
         VALUES (?, ?, ?, ?, 1)`
      ).run(simId, q.id, q.discipline, idx + 1);
    });

    return simId;
  });

  const simId = tx() as number;
  return { simulation_id: simId, actual_questions: actual };
}

// ============================================================
// INICIAR SIMULADO
// ============================================================

export function startSimulation(
  simulationId: number,
  userId = DEFAULT_USER_ID
): { ok: boolean; message: string } {
  ensureSimulationTables();
  const db = getDb();

  const sim = db
    .prepare("SELECT * FROM simulations WHERE id = ? AND user_id = ?")
    .get(simulationId, userId) as Simulation | undefined;

  if (!sim) return { ok: false, message: "Simulado não encontrado." };
  if (sim.status !== "PENDING")
    return { ok: false, message: `Simulado já está com status '${sim.status}'.` };

  const tx = db.transaction(() => {
    db.prepare(
      `UPDATE simulations SET status='ACTIVE', started_at=CURRENT_TIMESTAMP,
       updated_at=CURRENT_TIMESTAMP WHERE id=?`
    ).run(simulationId);
    db.prepare(
      `INSERT OR IGNORE INTO simulation_attempts
         (simulation_id, user_id, started_at)
       VALUES (?, ?, CURRENT_TIMESTAMP)`
    ).run(simulationId, userId);
  });
  tx();
  return { ok: true, message: "Simulado iniciado." };
}

// ============================================================
// REGISTRAR RESPOSTA
// (não revela correção; não atualiza mastery durante o simulado)
// ============================================================

export interface RecordAnswerInput {
  simulationId: number;
  questionId: number;
  selectedOptionIndex: number;
  responseTimeSecs?: number;
  userId?: number;
}

export type RecordAnswerResult =
  | { ok: true; answered_count: number; total_questions: number }
  | { ok: false; message: string };

export function recordSimulationAnswer(
  input: RecordAnswerInput
): RecordAnswerResult {
  ensureSimulationTables();
  const db = getDb();
  const userId = input.userId ?? DEFAULT_USER_ID;

  const sim = db
    .prepare("SELECT * FROM simulations WHERE id = ? AND user_id = ?")
    .get(input.simulationId, userId) as Simulation | undefined;

  if (!sim) return { ok: false, message: "Simulado não encontrado." };
  if (sim.status !== "ACTIVE")
    return { ok: false, message: "Simulado não está ativo." };

  // Verificar tempo esgotado (modo oficial)
  if (sim.simulation_type === "OFICIAL" && sim.started_at) {
    const elapsed = Math.floor(
      (Date.now() - new Date(sim.started_at).getTime()) / 1000
    );
    if (elapsed > sim.time_limit_seconds) {
      return { ok: false, message: "Tempo esgotado. Finalize o simulado." };
    }
  }

  // Verificar se a questão pertence ao simulado
  const sqRow = db
    .prepare(
      "SELECT * FROM simulation_questions WHERE simulation_id = ? AND question_id = ?"
    )
    .get(input.simulationId, input.questionId);
  if (!sqRow) return { ok: false, message: "Questão não pertence a este simulado." };

  // Impedir duplicata
  const existing = db
    .prepare(
      "SELECT id FROM simulation_answers WHERE simulation_id = ? AND question_id = ?"
    )
    .get(input.simulationId, input.questionId);
  if (existing) return { ok: false, message: "Questão já respondida neste simulado." };

  // Obter gabarito (SEM revelar ao caller — apenas armazenado internamente)
  const correct = db
    .prepare(
      "SELECT option_index FROM question_options WHERE question_id = ? AND is_correct = 1 LIMIT 1"
    )
    .get(input.questionId) as { option_index: number } | undefined;
  if (!correct) return { ok: false, message: "Gabarito não encontrado." };

  const isCorrect = input.selectedOptionIndex === correct.option_index ? 1 : 0;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO simulation_answers
         (simulation_id, question_id, selected_option_index, correct_option_index,
          is_correct, response_time_seconds)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      input.simulationId,
      input.questionId,
      input.selectedOptionIndex,
      correct.option_index,
      isCorrect,
      input.responseTimeSecs ?? null
    );
    db.prepare(
      "UPDATE simulation_questions SET answered=1 WHERE simulation_id=? AND question_id=?"
    ).run(input.simulationId, input.questionId);
  });
  tx();

  const answered = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM simulation_answers WHERE simulation_id=?"
      )
      .get(input.simulationId) as { cnt: number }
  ).cnt;
  const total = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM simulation_questions WHERE simulation_id=?"
      )
      .get(input.simulationId) as { cnt: number }
  ).cnt;

  return { ok: true, answered_count: answered, total_questions: total };
}

// ============================================================
// CALCULAR SCORE OFICIAL (determinístico)
// ============================================================

export function calculateOfficialSimulationScore(simulationId: number): {
  discipline_scores: DisciplineScore[];
  weighted_final_score: number;
  minimums_met: boolean;
} {
  const db = getDb();
  const disciplines = Object.keys(OFFICIAL_SIMULATION.DISCIPLINE_WEIGHTS);
  const disciplineScores: DisciplineScore[] = [];
  let weightedSum = 0;

  for (const disc of disciplines) {
    const row = db
      .prepare(
        `SELECT COUNT(*) as total,
                SUM(sa.is_correct) as correct
         FROM simulation_answers sa
         JOIN simulation_questions sq
           ON sq.simulation_id = sa.simulation_id AND sq.question_id = sa.question_id
         WHERE sa.simulation_id = ? AND sq.discipline = ?`
      )
      .get(simulationId, disc) as { total: number; correct: number };

    const correct = row.correct ?? 0;
    const total = row.total ?? 0;
    const score = correct * OFFICIAL_SIMULATION.POINTS_PER_CORRECT;
    const weight = OFFICIAL_SIMULATION.DISCIPLINE_WEIGHTS[disc];
    weightedSum += score * weight;

    disciplineScores.push({
      discipline: disc,
      correct,
      total,
      score,
      minimum_met: correct >= OFFICIAL_SIMULATION.MIN_CORRECT_PER_DISCIPLINE,
    });
  }

  const weightedFinal =
    Math.round((weightedSum / OFFICIAL_SIMULATION.WEIGHT_DIVISOR) * 100) / 100;
  const minimumsMet = disciplineScores.every((d) => d.minimum_met);

  return {
    discipline_scores: disciplineScores,
    weighted_final_score: weightedFinal,
    minimums_met: minimumsMet,
  };
}

// ============================================================
// FINALIZAR SIMULADO
// (idempotente: chamar duas vezes não duplica dados)
// ============================================================

export function finishSimulation(
  simulationId: number,
  userId = DEFAULT_USER_ID
): { ok: boolean; result?: SimulationResult; message?: string } {
  ensureSimulationTables();
  const db = getDb();

  const sim = db
    .prepare("SELECT * FROM simulations WHERE id = ? AND user_id = ?")
    .get(simulationId, userId) as Simulation | undefined;

  if (!sim) return { ok: false, message: "Simulado não encontrado." };

  // Idempotência: já finalizado → retorna resultado existente
  if (sim.status === "FINISHED") {
    return { ok: true, result: buildResult(simulationId, sim), message: "already_finished" };
  }

  if (sim.status !== "ACTIVE" && sim.status !== "PENDING") {
    return { ok: false, message: `Status inválido para finalização: ${sim.status}` };
  }

  const startedAt = sim.started_at ? new Date(sim.started_at).getTime() : Date.now();
  const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);

  // 1. Calcular scores
  const scoreData =
    sim.simulation_type === "OFICIAL"
      ? calculateOfficialSimulationScore(simulationId)
      : calculateAdaptiveScore(simulationId);

  // 2. Persistir resultados e atualizar pedagógico atomicamente
  const tx = db.transaction(() => {
    const portScore =
      scoreData.discipline_scores.find(
        (d) => d.discipline === "Língua Portuguesa"
      )?.score ?? null;
    const mathScore =
      scoreData.discipline_scores.find(
        (d) => d.discipline === "Matemática e Raciocínio Lógico"
      )?.score ?? null;
    const profScore =
      scoreData.discipline_scores.find(
        (d) => d.discipline === "Conhecimentos Profissionais"
      )?.score ?? null;

    db.prepare(
      `UPDATE simulations SET
         status='FINISHED',
         finished_at=CURRENT_TIMESTAMP,
         duration_seconds=?,
         score_portuguese=?,
         score_math=?,
         score_professional=?,
         weighted_final_score=?,
         minimums_met=?,
         updated_at=CURRENT_TIMESTAMP
       WHERE id=?`
    ).run(
      elapsedSeconds,
      portScore,
      mathScore,
      profScore,
      scoreData.weighted_final_score,
      scoreData.minimums_met ? 1 : 0,
      simulationId
    );

    db.prepare(
      `UPDATE simulation_attempts
       SET finished_at=CURRENT_TIMESTAMP, elapsed_seconds=?, completed=1
       WHERE simulation_id=?`
    ).run(elapsedSeconds, simulationId);

    // 3. Integrar com motor pedagógico (só uma vez — UNIQUE em question_attempts não existe,
    //    mas usamos idempotency_key no XP e verificamos finished antes de processar)
    const answers = db
      .prepare(
        `SELECT sa.question_id, sa.is_correct, sa.selected_option_index,
                sa.correct_option_index, sa.response_time_seconds,
                sq.discipline, q.syllabus_item_id, q.theme, q.subtheme, q.difficulty
         FROM simulation_answers sa
         JOIN simulation_questions sq
           ON sq.simulation_id=sa.simulation_id AND sq.question_id=sa.question_id
         JOIN questions q ON q.id=sa.question_id
         WHERE sa.simulation_id=?`
      )
      .all(simulationId) as Array<{
      question_id: number;
      is_correct: number;
      selected_option_index: number;
      correct_option_index: number;
      response_time_seconds: number | null;
      discipline: string;
      syllabus_item_id: number;
      theme: string | null;
      subtheme: string | null;
      difficulty: number;
    }>;

    for (const ans of answers) {
      recordAttempt({
        userId,
        syllabusItemId: ans.syllabus_item_id,
        questionId: ans.question_id,
        isCorrect: ans.is_correct === 1,
        responseTimeSecs: ans.response_time_seconds ?? undefined,
        difficulty: ans.difficulty,
        chosenOptionIndex: ans.selected_option_index,
        correctOptionIndex: ans.correct_option_index,
        theme: ans.theme ?? undefined,
        subtheme: ans.subtheme ?? undefined,
      });
    }
  });

  tx();

  // 4. XP — idempotente por simulation_id
  awardXp(100, "Simulado concluído", `sim_done_${simulationId}`, userId);

  const updatedSim = db
    .prepare("SELECT * FROM simulations WHERE id=?")
    .get(simulationId) as Simulation;

  return { ok: true, result: buildResult(simulationId, updatedSim) };
}

// ============================================================
// HELPER — Montar SimulationResult a partir do banco
// ============================================================

function buildResult(simulationId: number, sim: Simulation): SimulationResult {
  const db = getDb();

  const answers = db
    .prepare(
      `SELECT sa.*, sq.discipline, q.syllabus_item_id
       FROM simulation_answers sa
       JOIN simulation_questions sq
         ON sq.simulation_id=sa.simulation_id AND sq.question_id=sa.question_id
       JOIN questions q ON q.id=sa.question_id
       WHERE sa.simulation_id=?`
    )
    .all(simulationId) as Array<{
    question_id: number;
    selected_option_index: number;
    correct_option_index: number;
    is_correct: number;
    discipline: string;
    syllabus_item_id: number;
  }>;

  const total = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM simulation_questions WHERE simulation_id=?")
      .get(simulationId) as { cnt: number }
  ).cnt;

  const answered = answers.length;
  const correct = answers.filter((a) => a.is_correct === 1).length;
  const wrong = answered - correct;

  // Discipline scores
  const disciplines = Object.keys(OFFICIAL_SIMULATION.DISCIPLINE_WEIGHTS);
  const disciplineScores: DisciplineScore[] =
    sim.simulation_type === "OFICIAL"
      ? calculateOfficialSimulationScore(simulationId).discipline_scores
      : disciplines.map((disc) => {
          const discAnswers = answers.filter((a) => a.discipline === disc);
          const c = discAnswers.filter((a) => a.is_correct === 1).length;
          return {
            discipline: disc,
            correct: c,
            total: discAnswers.length,
            score: c * OFFICIAL_SIMULATION.POINTS_PER_CORRECT,
            minimum_met: c >= OFFICIAL_SIMULATION.MIN_CORRECT_PER_DISCIPLINE,
          };
        });

  // By syllabus_item
  const itemMap = new Map<
    number,
    { syllabus_item_id: number; title: string; correct: number; total: number }
  >();
  for (const ans of answers) {
    const key = ans.syllabus_item_id;
    if (!itemMap.has(key)) {
      const si = db
        .prepare("SELECT title FROM syllabus_items WHERE id=?")
        .get(key) as { title: string } | undefined;
      itemMap.set(key, {
        syllabus_item_id: key,
        title: si?.title ?? `Item ${key}`,
        correct: 0,
        total: 0,
      });
    }
    const entry = itemMap.get(key)!;
    entry.total++;
    if (ans.is_correct === 1) entry.correct++;
  }

  const errors = answers
    .filter((a) => a.is_correct === 0)
    .map((a) => ({
      question_id: a.question_id,
      discipline: a.discipline,
      selected_option_index: a.selected_option_index,
      correct_option_index: a.correct_option_index,
    }));

  return {
    simulation_id: simulationId,
    simulation_type: sim.simulation_type,
    total_questions: total,
    answered,
    correct,
    wrong,
    accuracy_pct: answered > 0 ? Math.round((correct / answered) * 100) : 0,
    discipline_scores: disciplineScores,
    weighted_final_score: sim.weighted_final_score ?? 0,
    minimums_met: sim.minimums_met === 1,
    elapsed_seconds: sim.duration_seconds ?? 0,
    by_syllabus_item: Array.from(itemMap.values()),
    errors,
  };
}

// Score para modo adaptativo (sem pesos fixos por disciplina)
function calculateAdaptiveScore(simulationId: number): {
  discipline_scores: DisciplineScore[];
  weighted_final_score: number;
  minimums_met: boolean;
} {
  const db = getDb();
  const disciplines = Object.keys(OFFICIAL_SIMULATION.DISCIPLINE_WEIGHTS);
  const disciplineScores: DisciplineScore[] = disciplines.map((disc) => {
    const row = db
      .prepare(
        `SELECT COUNT(*) as total, SUM(sa.is_correct) as correct
         FROM simulation_answers sa
         JOIN simulation_questions sq
           ON sq.simulation_id=sa.simulation_id AND sq.question_id=sa.question_id
         WHERE sa.simulation_id=? AND sq.discipline=?`
      )
      .get(simulationId, disc) as { total: number; correct: number };
    const c = row.correct ?? 0;
    return {
      discipline: disc,
      correct: c,
      total: row.total ?? 0,
      score: c * OFFICIAL_SIMULATION.POINTS_PER_CORRECT,
      minimum_met: c >= OFFICIAL_SIMULATION.MIN_CORRECT_PER_DISCIPLINE,
    };
  });
  // Nota ponderada simples para adaptativo (mesma fórmula, mas sem exigir 20 por disciplina)
  const wSum = disciplineScores.reduce(
    (acc, d) => acc + d.score * (OFFICIAL_SIMULATION.DISCIPLINE_WEIGHTS[d.discipline] ?? 1),
    0
  );
  return {
    discipline_scores: disciplineScores,
    weighted_final_score:
      Math.round((wSum / OFFICIAL_SIMULATION.WEIGHT_DIVISOR) * 100) / 100,
    minimums_met: disciplineScores.every((d) => d.minimum_met),
  };
}

// ============================================================
// HISTÓRICO
// ============================================================

export function getSimulationHistory(
  userId = DEFAULT_USER_ID
): SimulationHistoryItem[] {
  ensureSimulationTables();
  const db = getDb();
  return db
    .prepare(
      `SELECT s.id, s.simulation_type, s.status, s.target_questions,
              s.weighted_final_score, s.minimums_met, s.duration_seconds as elapsed_seconds,
              s.created_at, s.finished_at,
              (SELECT COUNT(*) FROM simulation_answers sa WHERE sa.simulation_id=s.id AND sa.is_correct=1) as correct
       FROM simulations s
       WHERE s.user_id=?
       ORDER BY s.created_at DESC`
    )
    .all(userId) as SimulationHistoryItem[];
}

// ============================================================
// OBTER SIMULADO (sem gabarito durante execução)
// ============================================================

export function getSimulation(
  simulationId: number,
  userId = DEFAULT_USER_ID
): {
  simulation: Simulation;
  questions: Array<{
    order_number: number;
    question_id: number;
    discipline: string;
    answered: number;
    // gabarito omitido durante simulado ativo
  }>;
} | null {
  ensureSimulationTables();
  const db = getDb();
  const sim = db
    .prepare("SELECT * FROM simulations WHERE id=? AND user_id=?")
    .get(simulationId, userId) as Simulation | undefined;
  if (!sim) return null;

  const questions = db
    .prepare(
      `SELECT order_number, question_id, discipline, answered
       FROM simulation_questions WHERE simulation_id=? ORDER BY order_number ASC`
    )
    .all(simulationId) as Array<{
    order_number: number;
    question_id: number;
    discipline: string;
    answered: number;
  }>;

  return { simulation: sim, questions };
}

// ============================================================
// VERIFICAR TEMPO ESGOTADO
// ============================================================

export function isTimeExpired(simulation: Simulation): boolean {
  if (simulation.simulation_type !== "OFICIAL") return false;
  if (!simulation.started_at) return false;
  const elapsed = Math.floor(
    (Date.now() - new Date(simulation.started_at).getTime()) / 1000
  );
  return elapsed >= simulation.time_limit_seconds;
}
