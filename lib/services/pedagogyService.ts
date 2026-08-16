// ============================================================
// CFS Tutor — Serviço Pedagógico
// Espelha a lógica de fase6_motor_pedagogico.py em TypeScript
// ============================================================

import { getDb } from "@/lib/db";
import type {
  DailyMission,
  MissionSlot,
  MissionSlotType,
  ReviewItem,
  SyllabusProgress,
} from "@/lib/types";
import { getMasteryLevel, DISCIPLINE_WEIGHTS } from "./syllabusService";
import { DEFAULT_USER_ID } from "./userService";

// ------------------------------------------------------------
// Revisão espaçada — idêntica ao motor Python
// erro → 1d, 1º acerto → 3d, 2º → 7d, 3º → 15d, 4º+ → 30d
// ------------------------------------------------------------
const REVIEW_INTERVALS = [1, 3, 7, 15, 30];

export function calculateNextReview(
  isCorrect: boolean,
  currentStage: number
): { next_date: string; new_stage: number } {
  const newStage = isCorrect
    ? Math.min(currentStage + 1, REVIEW_INTERVALS.length - 1)
    : 0;
  const days = REVIEW_INTERVALS[isCorrect ? newStage : 0];
  const next = new Date();
  next.setDate(next.getDate() + days);
  return {
    next_date: next.toISOString().slice(0, 10),
    new_stage: newStage,
  };
}

// ------------------------------------------------------------
// Mastery Score — mesma fórmula do modelo pedagógico
// ------------------------------------------------------------
export function calculateMasteryScore(p: SyllabusProgress): number {
  const total = (p.correct_answers ?? 0) + (p.wrong_answers ?? 0);
  if (total === 0) return 0;

  const accuracy = ((p.correct_answers ?? 0) / total) * 100;

  // Bônus/penalidade de sequência
  const seqBonus = Math.min((p.consecutive_correct ?? 0) * 3, 20);
  const seqPenalty = Math.min((p.consecutive_wrong ?? 0) * 2, 15);
  const seqComponent = seqBonus - seqPenalty;

  // Crédito de revisão (estágio 0→2→4→6→10)
  const stageCredits = [0, 2, 4, 6, 10];
  const stage = Math.min(p.review_stage ?? 0, stageCredits.length - 1);
  const reviewCredit = stageCredits[stage];

  // Quantidade (max 5 pts)
  const qtyBonus = Math.min(Math.floor(total / 5), 5);

  // Penalidade temporal
  let timePenalty = 0;
  if (p.last_study) {
    const daysSince = Math.floor(
      (Date.now() - new Date(p.last_study).getTime()) / 86400000
    );
    timePenalty = Math.min(Math.max(0, daysSince - 30), 20);
  }

  const score =
    accuracy * 0.65 +
    seqComponent * 0.2 +
    reviewCredit * 0.1 +
    qtyBonus -
    timePenalty;

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ------------------------------------------------------------
// Priority Score
// ------------------------------------------------------------
export function calculatePriorityScore(
  p: SyllabusProgress | null,
  discipline: string
): number {
  let score = 0;
  const weight = DISCIPLINE_WEIGHTS[discipline] ?? 1;

  if (!p || !p.studied) {
    score += 30;
  } else {
    const mastery = p.mastery_score ?? 0;
    if (mastery < 40) score += 25;
    else if (mastery < 60) score += 15;

    if (p.next_review) {
      const overdue =
        (Date.now() - new Date(p.next_review).getTime()) / 86400000;
      if (overdue > 0) score += 40;
    }
  }

  return Math.min(100, Math.round(score * weight));
}

// ------------------------------------------------------------
// Missão Diária
// ------------------------------------------------------------
export function generateDailyMission(userId = DEFAULT_USER_ID): DailyMission {
  const db = getDb();
  const today = new Date().toISOString().slice(0, 10);

  const items = db
    .prepare(
      `SELECT si.id, si.title, si.discipline,
              sp.studied, sp.mastery_score, sp.consecutive_correct,
              sp.consecutive_wrong, sp.review_stage, sp.next_review,
              sp.correct_answers, sp.wrong_answers, sp.last_study
       FROM syllabus_items si
       LEFT JOIN syllabus_progress sp ON sp.syllabus_item_id = si.id AND sp.user_id = ?
       WHERE si.active = 1 OR si.active IS NULL
       ORDER BY si.edital_order ASC, si.id ASC`
    )
    .all(userId) as Array<{
    id: number;
    title: string;
    discipline: string;
    studied: number | null;
    mastery_score: number | null;
    consecutive_correct: number | null;
    consecutive_wrong: number | null;
    review_stage: number | null;
    next_review: string | null;
    correct_answers: number | null;
    wrong_answers: number | null;
    last_study: string | null;
  }>;

  const slots: MissionSlot[] = [];

  // Aquecimento: revisões vencidas (max 2, 10 min)
  const overdue = items
    .filter(
      (i) =>
        i.next_review &&
        new Date(i.next_review) <= new Date() &&
        i.studied
    )
    .slice(0, 2);

  for (const item of overdue) {
    const fakeProgress: SyllabusProgress = buildFakeProgress(item);
    slots.push({
      syllabus_item_id: item.id,
      title: item.title,
      discipline: item.discipline,
      mission_type: "RECICLAGEM",
      priority_score: calculatePriorityScore(fakeProgress, item.discipline),
      time_allocated_minutes: 5,
      mastery_score: item.mastery_score ?? 0,
      mastery_level: getMasteryLevel(item.mastery_score ?? 0),
      reason: "Revisão vencida",
    });
  }

  // Aprendizado: pontos fracos mastery < 60 (max 2, 15 min)
  const weak = items
    .filter(
      (i) =>
        i.studied &&
        (i.mastery_score ?? 0) < 60 &&
        !overdue.some((o) => o.id === i.id)
    )
    .sort((a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0))
    .slice(0, 2);

  for (const item of weak) {
    const fakeProgress: SyllabusProgress = buildFakeProgress(item);
    slots.push({
      syllabus_item_id: item.id,
      title: item.title,
      discipline: item.discipline,
      mission_type: "FRACO",
      priority_score: calculatePriorityScore(fakeProgress, item.discipline),
      time_allocated_minutes: 8,
      mastery_score: item.mastery_score ?? 0,
      mastery_level: getMasteryLevel(item.mastery_score ?? 0),
      reason: "Ponto fraco",
    });
  }

  // Prática: conteúdo novo não estudado (max 2, 15 min)
  const usedIds = new Set([
    ...overdue.map((i) => i.id),
    ...weak.map((i) => i.id),
  ]);
  const newContent = items
    .filter((i) => !i.studied && !usedIds.has(i.id))
    .slice(0, 2);

  for (const item of newContent) {
    slots.push({
      syllabus_item_id: item.id,
      title: item.title,
      discipline: item.discipline,
      mission_type: "NOVO",
      priority_score: calculatePriorityScore(null, item.discipline),
      time_allocated_minutes: 8,
      mastery_score: 0,
      mastery_level: "CRÍTICO",
      reason: "Conteúdo novo",
    });
    usedIds.add(item.id);
  }

  // Fechamento: consolidação (1 item, 5 min)
  const consolidation = items
    .filter(
      (i) =>
        i.studied &&
        (i.mastery_score ?? 0) >= 60 &&
        (i.mastery_score ?? 0) < 90 &&
        !usedIds.has(i.id)
    )
    .sort((a, b) => (a.mastery_score ?? 0) - (b.mastery_score ?? 0))
    .slice(0, 1);

  for (const item of consolidation) {
    const fakeProgress: SyllabusProgress = buildFakeProgress(item);
    slots.push({
      syllabus_item_id: item.id,
      title: item.title,
      discipline: item.discipline,
      mission_type: "CONSOLIDACAO",
      priority_score: calculatePriorityScore(fakeProgress, item.discipline),
      time_allocated_minutes: 5,
      mastery_score: item.mastery_score ?? 0,
      mastery_level: getMasteryLevel(item.mastery_score ?? 0),
      reason: "Treinamento",
    });
  }

  return {
    mission_date: today,
    target_duration_minutes: 45,
    slots,
    total_items: slots.length,
    completed_items: 0,
    completed: false,
  };
}

function buildFakeProgress(item: {
  id: number;
  studied: number | null;
  mastery_score: number | null;
  consecutive_correct: number | null;
  consecutive_wrong: number | null;
  review_stage: number | null;
  next_review: string | null;
  correct_answers: number | null;
  wrong_answers: number | null;
  last_study: string | null;
}): SyllabusProgress {
  return {
    id: 0,
    user_id: DEFAULT_USER_ID,
    syllabus_item_id: item.id,
    studied: item.studied ?? 0,
    mastery_score: item.mastery_score ?? 0,
    questions_answered: (item.correct_answers ?? 0) + (item.wrong_answers ?? 0),
    correct_answers: item.correct_answers ?? 0,
    wrong_answers: item.wrong_answers ?? 0,
    accuracy: 0,
    consecutive_correct: item.consecutive_correct ?? 0,
    consecutive_wrong: item.consecutive_wrong ?? 0,
    last_study: item.last_study,
    next_review: item.next_review,
    review_stage: item.review_stage ?? 0,
    review_count: 0,
  };
}

// ------------------------------------------------------------
// Registrar tentativa
// ------------------------------------------------------------
export interface RecordAttemptInput {
  userId?: number;
  syllabusItemId: number;
  questionId?: number;
  isCorrect: boolean;
  responseTimeSecs?: number;
  difficulty?: number;
  chosenOptionIndex?: number;
  correctOptionIndex?: number;
  theme?: string;
  subtheme?: string;
}

export function recordAttempt(input: RecordAttemptInput): void {
  const db = getDb();
  const userId = input.userId ?? DEFAULT_USER_ID;

  const tx = db.transaction(() => {
    // 1. Registrar tentativa
    db.prepare(
      `INSERT INTO question_attempts
         (user_id, syllabus_item_id, question_id, is_correct, response_time_seconds,
          difficulty_perceived, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`
    ).run(
      userId,
      input.syllabusItemId,
      input.questionId ?? null,
      input.isCorrect ? 1 : 0,
      input.responseTimeSecs ?? null,
      input.difficulty ?? null
    );

    // 2. Ler ou criar progresso
    let progress = db
      .prepare(
        "SELECT * FROM syllabus_progress WHERE user_id = ? AND syllabus_item_id = ?"
      )
      .get(userId, input.syllabusItemId) as SyllabusProgress | undefined;

    if (!progress) {
      db.prepare(
        `INSERT INTO syllabus_progress
           (user_id, syllabus_item_id, studied, mastery_score, questions_answered,
            correct_answers, wrong_answers, accuracy, consecutive_correct,
            consecutive_wrong, max_consecutive_correct, review_stage, review_count,
            last_study, last_attempt, next_review)
         VALUES (?, ?, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, date('now', '+1 day'))`
      ).run(userId, input.syllabusItemId);
      progress = db
        .prepare(
          "SELECT * FROM syllabus_progress WHERE user_id = ? AND syllabus_item_id = ?"
        )
        .get(userId, input.syllabusItemId) as SyllabusProgress;
    }

    const correct = input.isCorrect;
    const newCorrect = (progress.correct_answers ?? 0) + (correct ? 1 : 0);
    const newWrong = (progress.wrong_answers ?? 0) + (correct ? 0 : 1);
    const newTotal = newCorrect + newWrong;
    const newConsecCorrect = correct
      ? (progress.consecutive_correct ?? 0) + 1
      : 0;
    const newConsecWrong = correct
      ? 0
      : (progress.consecutive_wrong ?? 0) + 1;
    const accuracy = newTotal > 0 ? newCorrect / newTotal : 0;

    // Revisão espaçada
    const { next_date, new_stage } = calculateNextReview(
      correct,
      progress.review_stage ?? 0
    );

    const updatedProgress: SyllabusProgress = {
      ...progress,
      studied: 1,
      correct_answers: newCorrect,
      wrong_answers: newWrong,
      questions_answered: newTotal,
      accuracy,
      consecutive_correct: newConsecCorrect,
      consecutive_wrong: newConsecWrong,
      review_stage: new_stage,
      next_review: next_date,
      last_study: new Date().toISOString(),
    };

    updatedProgress.mastery_score = calculateMasteryScore(updatedProgress);

    db.prepare(
      `UPDATE syllabus_progress SET
         studied = 1,
         correct_answers = ?,
         wrong_answers = ?,
         questions_answered = ?,
         accuracy = ?,
         consecutive_correct = ?,
         consecutive_wrong = ?,
         review_stage = ?,
         next_review = ?,
         last_study = CURRENT_TIMESTAMP,
         last_attempt = CURRENT_TIMESTAMP,
         mastery_score = ?,
         updated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND syllabus_item_id = ?`
    ).run(
      newCorrect,
      newWrong,
      newTotal,
      accuracy,
      newConsecCorrect,
      newConsecWrong,
      new_stage,
      next_date,
      updatedProgress.mastery_score,
      userId,
      input.syllabusItemId
    );

    // 3. Caderno de erros
    if (!correct && input.questionId) {
      const existing = db
        .prepare(
          "SELECT * FROM error_notebook WHERE user_id = ? AND question_id = ?"
        )
        .get(userId, input.questionId) as { error_count: number } | undefined;

      if (existing) {
        db.prepare(
          `UPDATE error_notebook SET
             error_count = error_count + 1,
             chosen_option_index = ?,
             last_error_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
           WHERE user_id = ? AND question_id = ?`
        ).run(
          input.chosenOptionIndex ?? null,
          userId,
          input.questionId
        );
      } else {
        db.prepare(
          `INSERT INTO error_notebook
             (user_id, question_id, chosen_option_index, correct_option_index,
              theme, subtheme, error_count)
           VALUES (?, ?, ?, ?, ?, ?, 1)`
        ).run(
          userId,
          input.questionId,
          input.chosenOptionIndex ?? null,
          input.correctOptionIndex ?? null,
          input.theme ?? null,
          input.subtheme ?? null
        );
      }
    }
  });

  tx();
}

// ------------------------------------------------------------
// Prontidão CFS com fator de confiança
//
// Fórmula de confiança:
//   q_factor  = min(questions_answered / 20, 1.0)   — peso 0.40
//   cov_factor= min(items_studied / 30, 1.0)          — peso 0.35
//   disc_factor= disciplines_with_data / 3            — peso 0.25
//   confidence_factor = q_factor×0.40 + cov_factor×0.35 + disc_factor×0.25
//
// Fórmula de exibição:
//   readiness_display = readiness_raw × confidence_factor
//
// Rótulos:
//   confidence_factor = 0              → SEM_DADOS
//   confidence_factor < 0.25           → INICIAL
//   confidence_factor < 0.60           → PARCIAL
//   confidence_factor >= 0.60          → SUFICIENTE
// ------------------------------------------------------------
import type { ReadinessResult, ReadinessConfidence } from "@/lib/types";

export function calculateReadinessWithConfidence(
  userId = DEFAULT_USER_ID
): ReadinessResult {
  const db = getDb();

  // --- Componente 1: domínio médio ponderado ---
  const masteryRows = db
    .prepare(
      `SELECT si.discipline, sp.mastery_score
       FROM syllabus_progress sp
       JOIN syllabus_items si ON si.id = sp.syllabus_item_id
       WHERE sp.user_id = ? AND sp.studied = 1`
    )
    .all(userId) as { discipline: string; mastery_score: number }[];

  let weightedSum = 0;
  let weightTotal = 0;
  const disciplinesWithData = new Set<string>();
  for (const r of masteryRows) {
    const w = DISCIPLINE_WEIGHTS[r.discipline] ?? 1;
    weightedSum += (r.mastery_score ?? 0) * w;
    weightTotal += w;
    if ((r.mastery_score ?? 0) > 0) disciplinesWithData.add(r.discipline);
  }
  const avgMastery = weightTotal > 0 ? weightedSum / weightTotal : 0;

  // --- Componente 2: cobertura do edital ---
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
  const coverage = totalItems > 0 ? (studiedItems / totalItems) * 100 : 0;

  // --- Componente 3: revisões em dia ---
  const totalDue = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM syllabus_progress WHERE user_id = ? AND next_review IS NOT NULL")
      .get(userId) as { cnt: number }
  ).cnt;
  const onTime = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM syllabus_progress WHERE user_id = ? AND next_review >= date('now')")
      .get(userId) as { cnt: number }
  ).cnt;
  // Se não há nenhuma revisão agendada ainda, não infla o score (usa 0 em vez de 100)
  const reviewsOnTime = totalDue > 0 ? (onTime / totalDue) * 100 : 0;

  // --- Componente 4: desempenho recente (30 dias) ---
  const recentRow = db
    .prepare(
      `SELECT COUNT(*) as total, SUM(is_correct) as correct
       FROM question_attempts
       WHERE user_id = ? AND timestamp >= datetime('now', '-30 days')`
    )
    .get(userId) as { total: number; correct: number };
  const questionsAnswered = recentRow.total ?? 0;
  const recentPerf =
    questionsAnswered > 0
      ? ((recentRow.correct ?? 0) / questionsAnswered) * 100
      : 0;

  // --- Score bruto ---
  const readinessRaw = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        avgMastery * 0.50 +
        coverage * 0.20 +
        reviewsOnTime * 0.15 +
        recentPerf * 0.15
      )
    )
  );

  // --- Fator de confiança ---
  // Total de tentativas (não só 30 dias) para o fator de confiança
  const totalAttempts = (
    db
      .prepare("SELECT COUNT(*) as cnt FROM question_attempts WHERE user_id = ?")
      .get(userId) as { cnt: number }
  ).cnt;

  const qFactor = Math.min(totalAttempts / 20, 1.0);
  const covFactor = Math.min(studiedItems / 30, 1.0);
  const discFactor = disciplinesWithData.size / 3;
  const confidenceFactor = Math.round(
    (qFactor * 0.40 + covFactor * 0.35 + discFactor * 0.25) * 100
  ) / 100;

  let confidenceLabel: ReadinessConfidence;
  if (confidenceFactor === 0) confidenceLabel = "SEM_DADOS";
  else if (confidenceFactor < 0.25) confidenceLabel = "INICIAL";
  else if (confidenceFactor < 0.60) confidenceLabel = "PARCIAL";
  else confidenceLabel = "SUFICIENTE";

  const readinessDisplay = Math.round(readinessRaw * confidenceFactor);

  return {
    readiness_raw: readinessRaw,
    readiness_display: readinessDisplay,
    confidence_factor: confidenceFactor,
    confidence_label: confidenceLabel,
    components: {
      avg_mastery: Math.round(avgMastery),
      coverage: Math.round(coverage),
      reviews_on_time: Math.round(reviewsOnTime),
      recent_performance: Math.round(recentPerf),
      questions_answered: totalAttempts,
      items_studied: studiedItems,
      disciplines_with_data: disciplinesWithData.size,
    },
  };
}

/** Compat: retorna apenas o display para código legado */
export function calculateReadiness(userId = DEFAULT_USER_ID): number {
  return calculateReadinessWithConfidence(userId).readiness_display;
}

// ------------------------------------------------------------
// Domínio consolidado por disciplina
//
// Fórmula:
//   mastery_of_studied = média ponderada do mastery_score
//                        apenas dos itens estudados
//   coverage_pct       = itens_estudados / itens_totais × 100
//   consolidated       = mastery_of_studied × (coverage_pct / 100)
//
// Rationale: saber bem 2 itens em 50 não é dominar a disciplina.
// O consolidated penaliza naturalmente a cobertura baixa.
// ------------------------------------------------------------
export function calculateConsolidatedMastery(
  masteryOfStudied: number,
  coveragePct: number
): number {
  return Math.round(masteryOfStudied * (coveragePct / 100));
}

// ------------------------------------------------------------
// Itens de revisão pendente
// ------------------------------------------------------------
export function getPendingReviews(userId = DEFAULT_USER_ID): ReviewItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT sp.syllabus_item_id, sp.mastery_score, sp.review_stage, sp.next_review,
              si.title, si.discipline
       FROM syllabus_progress sp
       JOIN syllabus_items si ON si.id = sp.syllabus_item_id
       WHERE sp.user_id = ? AND sp.next_review IS NOT NULL
       ORDER BY sp.next_review ASC`
    )
    .all(userId) as Array<{
    syllabus_item_id: number;
    mastery_score: number;
    review_stage: number;
    next_review: string;
    title: string;
    discipline: string;
  }>;

  return rows.map((r) => ({
    syllabus_item_id: r.syllabus_item_id,
    title: r.title,
    discipline: r.discipline,
    mastery_score: r.mastery_score ?? 0,
    mastery_level: getMasteryLevel(r.mastery_score ?? 0),
    review_stage: r.review_stage ?? 0,
    next_review: r.next_review,
    overdue: new Date(r.next_review) < new Date(),
  }));
}
