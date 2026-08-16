/**
 * Fixtures de simulado para testes em memória.
 * NUNCA inserir no cfs_catalogo.db real.
 * Cria 60 questões artificiais: 20 por disciplina.
 */
import Database from "better-sqlite3";
import { SIMULATION_SCHEMA_SQL } from "@/lib/services/simulationSchema";

const DISCIPLINES = [
  "Língua Portuguesa",
  "Matemática e Raciocínio Lógico",
  "Conhecimentos Profissionais",
] as const;

/** Adiciona tabelas de simulado ao banco de teste em memória */
export function addSimulationTables(db: Database.Database): void {
  for (const stmt of SIMULATION_SCHEMA_SQL.split(";")) {
    const s = stmt.trim();
    if (s) db.exec(s + ";");
  }
}

/**
 * Insere 60 questões artificiais no banco em memória (20 por disciplina).
 * Cada questão tem 4 opções; a correta é sempre option_index=0.
 * Também cria syllabus_items correspondentes e 1 usuário padrão.
 * Retorna mapa disciplina → lista de question_ids.
 */
export function seedSimulationFixtures(db: Database.Database): {
  questionIds: Record<string, number[]>;
  syllabusItemIds: Record<string, number[]>;
  userId: number;
} {
  // Usuário padrão
  db.prepare(
    "INSERT OR IGNORE INTO users (id, username, full_name) VALUES (1,'aluno_cfs','Aluno CFS')"
  ).run();

  const questionIds: Record<string, number[]> = {};
  const syllabusItemIds: Record<string, number[]> = {};

  let siId = 100; // evitar colisão com seedMinimal
  let qId = 100;

  for (const disc of DISCIPLINES) {
    questionIds[disc] = [];
    syllabusItemIds[disc] = [];

    for (let i = 0; i < 20; i++) {
      // syllabus_item
      db.prepare(
        `INSERT INTO syllabus_items (id, discipline, title, active)
         VALUES (?, ?, ?, 1)`
      ).run(siId, disc, `${disc} — Item ${i + 1}`);
      syllabusItemIds[disc].push(siId);

      // question
      db.prepare(
        `INSERT INTO questions
           (id, question_uid, origin, syllabus_item_id, discipline, statement, difficulty, active)
         VALUES (?, ?, 'INEDITA', ?, ?, ?, 2, 1)`
      ).run(
        qId,
        `fixture-${disc.slice(0, 3).toLowerCase()}-${i}`,
        siId,
        disc,
        `Enunciado fixture ${disc} Q${i + 1}`
      );

      // opções (correta = índice 0)
      for (let opt = 0; opt < 4; opt++) {
        db.prepare(
          `INSERT INTO question_options (question_id, option_index, option_text, is_correct)
           VALUES (?, ?, ?, ?)`
        ).run(qId, opt, `Opção ${opt + 1}`, opt === 0 ? 1 : 0);
      }

      questionIds[disc].push(qId);
      qId++;
      siId++;
    }
  }

  return { questionIds, syllabusItemIds, userId: 1 };
}

/**
 * Responde todas as questões de um simulado.
 * correctAll=true → responde tudo certo (option_index=0).
 * correctAll=false → responde tudo errado (option_index=1).
 */
export function answerAllQuestions(
  db: Database.Database,
  simulationId: number,
  correctAll: boolean
): void {
  const questions = db
    .prepare(
      "SELECT question_id FROM simulation_questions WHERE simulation_id=? ORDER BY order_number"
    )
    .all(simulationId) as { question_id: number }[];

  for (const q of questions) {
    const correct = db
      .prepare(
        "SELECT option_index FROM question_options WHERE question_id=? AND is_correct=1 LIMIT 1"
      )
      .get(q.question_id) as { option_index: number };

    const selected = correctAll
      ? correct.option_index
      : (correct.option_index + 1) % 4; // errado

    const existing = db
      .prepare(
        "SELECT id FROM simulation_answers WHERE simulation_id=? AND question_id=?"
      )
      .get(simulationId, q.question_id);
    if (existing) continue;

    const isCorrect = selected === correct.option_index ? 1 : 0;
    db.prepare(
      `INSERT INTO simulation_answers
         (simulation_id, question_id, selected_option_index, correct_option_index, is_correct)
       VALUES (?, ?, ?, ?, ?)`
    ).run(simulationId, q.question_id, selected, correct.option_index, isCorrect);
    db.prepare(
      "UPDATE simulation_questions SET answered=1 WHERE simulation_id=? AND question_id=?"
    ).run(simulationId, q.question_id);
  }
}

/** Responde N questões de uma disciplina específica corretamente, resto errado */
export function answerByDiscipline(
  db: Database.Database,
  simulationId: number,
  correctPerDiscipline: Record<string, number>
): void {
  for (const [disc, correctCount] of Object.entries(correctPerDiscipline)) {
    const questions = db
      .prepare(
        `SELECT sq.question_id FROM simulation_questions sq
         WHERE sq.simulation_id=? AND sq.discipline=? ORDER BY sq.order_number`
      )
      .all(simulationId, disc) as { question_id: number }[];

    questions.forEach((q, idx) => {
      const correct = db
        .prepare(
          "SELECT option_index FROM question_options WHERE question_id=? AND is_correct=1 LIMIT 1"
        )
        .get(q.question_id) as { option_index: number };

      const isAnsweringCorrectly = idx < correctCount;
      const selected = isAnsweringCorrectly
        ? correct.option_index
        : (correct.option_index + 1) % 4;
      const isCorrect = selected === correct.option_index ? 1 : 0;

      const existing = db
        .prepare(
          "SELECT id FROM simulation_answers WHERE simulation_id=? AND question_id=?"
        )
        .get(simulationId, q.question_id);
      if (existing) return;

      db.prepare(
        `INSERT INTO simulation_answers
           (simulation_id, question_id, selected_option_index, correct_option_index, is_correct)
         VALUES (?, ?, ?, ?, ?)`
      ).run(simulationId, q.question_id, selected, correct.option_index, isCorrect);
      db.prepare(
        "UPDATE simulation_questions SET answered=1 WHERE simulation_id=? AND question_id=?"
      ).run(simulationId, q.question_id);
    });
  }
}
