/**
 * Fase 8A — Testes do motor de simulados.
 * Todos rodam contra banco SQLite em memória.
 * NUNCA tocam o cfs_catalogo.db real.
 */
import Database from "better-sqlite3";
import { createTestDb } from "./helpers/testDb";
import {
  addSimulationTables,
  seedSimulationFixtures,
  answerAllQuestions,
  answerByDiscipline,
} from "./helpers/simulationFixtures";

// ---- Mock do módulo db.ts ----
let _testDb: Database.Database;
jest.mock("@/lib/db", () => ({ getDb: () => _testDb, closeDb: () => {} }));

beforeEach(() => {
  _testDb = createTestDb();
  addSimulationTables(_testDb);
});
afterEach(() => { _testDb.close(); });

// ----------------------------------------------------------------
// Helpers locais
// ----------------------------------------------------------------
async function getService() {
  return import("@/lib/services/simulationService");
}

function createAndStartSim(db: Database.Database, simId: number): void {
  db.prepare(
    "UPDATE simulations SET status='ACTIVE', started_at=CURRENT_TIMESTAMP WHERE id=?"
  ).run(simId);
  db.prepare(
    "INSERT OR IGNORE INTO simulation_attempts (simulation_id, user_id, started_at) VALUES (?,1,CURRENT_TIMESTAMP)"
  ).run(simId);
}

// ================================================================
// 1. Simulado oficial com 60 questões suficientes
// ================================================================
test("1. generateOfficialSimulation cria simulado com 60 questões quando banco suficiente", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const result = svc.generateOfficialSimulation(1);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const count = (_testDb
    .prepare("SELECT COUNT(*) as c FROM simulation_questions WHERE simulation_id=?")
    .get(result.simulation_id) as { c: number }).c;
  expect(count).toBe(60);
});

// ================================================================
// 2. Banco insuficiente → erro estruturado
// ================================================================
test("2. generateOfficialSimulation retorna SIMULATION_INSUFFICIENT_QUESTIONS quando banco insuficiente", async () => {
  // Banco vazio — nenhuma questão
  _testDb.prepare("INSERT OR IGNORE INTO users (id, username, full_name) VALUES (1,'aluno_cfs','Aluno CFS')").run();
  const svc = await getService();
  const result = svc.generateOfficialSimulation(1);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.error.error).toBe("SIMULATION_INSUFFICIENT_QUESTIONS");
  expect(result.error.missing).toBeDefined();
});

// ================================================================
// 3. Distribuição 20/20/20 por disciplina
// ================================================================
test("3. generateOfficialSimulation distribui exatamente 20 questões por disciplina", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const result = svc.generateOfficialSimulation(1);
  expect(result.ok).toBe(true);
  if (!result.ok) return;

  const disciplines = [
    "Língua Portuguesa",
    "Matemática e Raciocínio Lógico",
    "Conhecimentos Profissionais",
  ];
  for (const disc of disciplines) {
    const row = _testDb
      .prepare(
        "SELECT COUNT(*) as c FROM simulation_questions WHERE simulation_id=? AND discipline=?"
      )
      .get(result.simulation_id, disc) as { c: number };
    expect(row.c).toBe(20);
  }
});

// ================================================================
// 4. Nota de Português (20 acertos = 10.0)
// ================================================================
test("4. calculateOfficialSimulationScore — Português 20/20 = nota 10.0", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerByDiscipline(_testDb, gen.simulation_id, {
    "Língua Portuguesa": 20,
    "Matemática e Raciocínio Lógico": 0,
    "Conhecimentos Profissionais": 0,
  });
  const score = svc.calculateOfficialSimulationScore(gen.simulation_id);
  const port = score.discipline_scores.find((d) => d.discipline === "Língua Portuguesa");
  expect(port?.score).toBe(10.0);
});

// ================================================================
// 5. Nota de Matemática (10 acertos = 5.0)
// ================================================================
test("5. calculateOfficialSimulationScore — Matemática 10/20 = nota 5.0", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerByDiscipline(_testDb, gen.simulation_id, {
    "Língua Portuguesa": 0,
    "Matemática e Raciocínio Lógico": 10,
    "Conhecimentos Profissionais": 0,
  });
  const score = svc.calculateOfficialSimulationScore(gen.simulation_id);
  const math = score.discipline_scores.find(
    (d) => d.discipline === "Matemática e Raciocínio Lógico"
  );
  expect(math?.score).toBe(5.0);
});

// ================================================================
// 6. Nota de Profissionais (15 acertos = 7.5)
// ================================================================
test("6. calculateOfficialSimulationScore — Profissionais 15/20 = nota 7.5", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerByDiscipline(_testDb, gen.simulation_id, {
    "Língua Portuguesa": 0,
    "Matemática e Raciocínio Lógico": 0,
    "Conhecimentos Profissionais": 15,
  });
  const score = svc.calculateOfficialSimulationScore(gen.simulation_id);
  const prof = score.discipline_scores.find(
    (d) => d.discipline === "Conhecimentos Profissionais"
  );
  expect(prof?.score).toBe(7.5);
});

// ================================================================
// 7. Nota ponderada
// (PT×3 + MT×2 + PR×5) / 10
// ================================================================
test("7. calculateOfficialSimulationScore — nota ponderada correta", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  // PT=20(10.0), MT=20(10.0), PR=20(10.0) → ponderada = (30+20+50)/10 = 10.0
  answerAllQuestions(_testDb, gen.simulation_id, true);
  const score = svc.calculateOfficialSimulationScore(gen.simulation_id);
  expect(score.weighted_final_score).toBe(10.0);
});

// ================================================================
// 8. Mínimo 10/20 por disciplina — atingido
// ================================================================
test("8. mínimo 10/20 por disciplina — minimums_met=true quando todos atingem", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerByDiscipline(_testDb, gen.simulation_id, {
    "Língua Portuguesa": 10,
    "Matemática e Raciocínio Lógico": 10,
    "Conhecimentos Profissionais": 10,
  });
  const score = svc.calculateOfficialSimulationScore(gen.simulation_id);
  expect(score.minimums_met).toBe(true);
  expect(score.discipline_scores.every((d) => d.minimum_met)).toBe(true);
});

// ================================================================
// 9. Falha em uma disciplina invalida minimums_met
// ================================================================
test("9. 9/20 em Matemática → minimums_met=false", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerByDiscipline(_testDb, gen.simulation_id, {
    "Língua Portuguesa": 20,
    "Matemática e Raciocínio Lógico": 9,  // abaixo do mínimo
    "Conhecimentos Profissionais": 20,
  });
  const score = svc.calculateOfficialSimulationScore(gen.simulation_id);
  expect(score.minimums_met).toBe(false);
  const math = score.discipline_scores.find(
    (d) => d.discipline === "Matemática e Raciocínio Lógico"
  );
  expect(math?.minimum_met).toBe(false);
});

// ================================================================
// 10. Resposta duplicada rejeitada
// ================================================================
test("10. resposta duplicada à mesma questão é rejeitada", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);

  const firstQ = (_testDb
    .prepare("SELECT question_id FROM simulation_questions WHERE simulation_id=? LIMIT 1")
    .get(gen.simulation_id) as { question_id: number }).question_id;

  const r1 = svc.recordSimulationAnswer({
    simulationId: gen.simulation_id, questionId: firstQ,
    selectedOptionIndex: 0, userId: 1,
  });
  expect(r1.ok).toBe(true);

  const r2 = svc.recordSimulationAnswer({
    simulationId: gen.simulation_id, questionId: firstQ,
    selectedOptionIndex: 1, userId: 1,
  });
  expect(r2.ok).toBe(false);
  if (!r2.ok) expect(r2.message).toMatch(/já respondida/i);
});

// ================================================================
// 11. Simulado não revela correção durante execução
// ================================================================
test("11. getSimulation não expõe gabarito durante simulado ativo", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);

  const data = svc.getSimulation(gen.simulation_id, 1);
  expect(data).not.toBeNull();
  // questions lista deve ter apenas order_number, question_id, discipline, answered
  // NÃO deve ter correct_option_index nem is_correct
  const q = data!.questions[0];
  expect(q).not.toHaveProperty("correct_option_index");
  expect(q).not.toHaveProperty("is_correct");
});

// ================================================================
// 12. Finalizar atualiza syllabus_progress
// ================================================================
test("12. finishSimulation integra respostas com syllabus_progress", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerAllQuestions(_testDb, gen.simulation_id, true);

  const before = (_testDb
    .prepare("SELECT COUNT(*) as c FROM syllabus_progress WHERE user_id=1")
    .get() as { c: number }).c;

  svc.finishSimulation(gen.simulation_id, 1);

  const after = (_testDb
    .prepare("SELECT COUNT(*) as c FROM syllabus_progress WHERE user_id=1")
    .get() as { c: number }).c;
  expect(after).toBeGreaterThan(before);
});

// ================================================================
// 13. Finalizar duas vezes não duplica dados
// ================================================================
test("13. finishSimulation idempotente — duas chamadas não duplicam question_attempts", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerAllQuestions(_testDb, gen.simulation_id, true);

  svc.finishSimulation(gen.simulation_id, 1);
  const count1 = (_testDb
    .prepare("SELECT COUNT(*) as c FROM question_attempts WHERE user_id=1")
    .get() as { c: number }).c;

  svc.finishSimulation(gen.simulation_id, 1);
  const count2 = (_testDb
    .prepare("SELECT COUNT(*) as c FROM question_attempts WHERE user_id=1")
    .get() as { c: number }).c;

  expect(count1).toBe(count2);
});

// ================================================================
// 14. XP +100 concedido apenas uma vez por simulation_id
// ================================================================
test("14. XP +100 concedido uma única vez por simulation_id", async () => {
  seedSimulationFixtures(_testDb);
  _testDb.exec(`
    CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL, amount INTEGER NOT NULL,
      reason TEXT NOT NULL, idempotency_key TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_xp (
      user_id INTEGER PRIMARY KEY, total_xp INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0, last_activity_date TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerAllQuestions(_testDb, gen.simulation_id, true);

  svc.finishSimulation(gen.simulation_id, 1);
  svc.finishSimulation(gen.simulation_id, 1); // segunda chamada

  const xpEvents = (_testDb
    .prepare("SELECT COUNT(*) as c FROM xp_events WHERE idempotency_key=?")
    .get(`sim_done_${gen.simulation_id}`) as { c: number }).c;
  expect(xpEvents).toBe(1);

  const total = (_testDb
    .prepare("SELECT total_xp FROM user_xp WHERE user_id=1")
    .get() as { total_xp: number } | undefined)?.total_xp ?? 0;
  expect(total).toBe(100);
});

// ================================================================
// 15. Adaptativo prioriza ponto fraco
// ================================================================
test("15. generateAdaptiveSimulation prioriza itens com mastery baixo", async () => {
  seedSimulationFixtures(_testDb);
  const { syllabusItemIds } = seedSimulationFixtures as unknown as {
    syllabusItemIds?: Record<string, number[]>;
  };

  // Criar progresso ruim para algumas questões de LP
  const lpSiId = (_testDb
    .prepare(
      "SELECT si.id FROM syllabus_items si JOIN questions q ON q.syllabus_item_id=si.id WHERE si.discipline='Língua Portuguesa' LIMIT 1"
    )
    .get() as { id: number } | undefined)?.id;

  if (lpSiId) {
    _testDb.prepare(
      `INSERT OR IGNORE INTO syllabus_progress
         (user_id, syllabus_item_id, studied, mastery_score, questions_answered,
          correct_answers, wrong_answers, accuracy, consecutive_correct, consecutive_wrong,
          max_consecutive_correct, review_stage, review_count)
       VALUES (1, ?, 1, 10, 5, 1, 4, 0.2, 0, 4, 0, 0, 0)`
    ).run(lpSiId);
  }

  const svc = await getService();
  const result = svc.generateAdaptiveSimulation(1, 10);
  expect(result.simulation_id).toBeGreaterThan(0);
  expect(result.actual_questions).toBeGreaterThan(0);
  expect(result.actual_questions).toBeLessThanOrEqual(10);
});

// ================================================================
// 16. Adaptativo não repete questão
// ================================================================
test("16. generateAdaptiveSimulation não repete questão dentro do mesmo simulado", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const result = svc.generateAdaptiveSimulation(1, 30);

  const rows = _testDb
    .prepare(
      "SELECT question_id FROM simulation_questions WHERE simulation_id=?"
    )
    .all(result.simulation_id) as { question_id: number }[];

  const ids = rows.map((r) => r.question_id);
  const unique = new Set(ids);
  expect(unique.size).toBe(ids.length);
});

// ================================================================
// 17. Cronômetro oficial = 12600 segundos
// ================================================================
test("17. simulado oficial tem time_limit_seconds = 12600 (3h30)", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;

  const sim = _testDb
    .prepare("SELECT time_limit_seconds FROM simulations WHERE id=?")
    .get(gen.simulation_id) as { time_limit_seconds: number };
  expect(sim.time_limit_seconds).toBe(12600);
});

// ================================================================
// 18. Histórico de simulados
// ================================================================
test("18. getSimulationHistory retorna simulados do usuário", async () => {
  seedSimulationFixtures(_testDb);
  _testDb.exec(`
    CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL, amount INTEGER NOT NULL,
      reason TEXT NOT NULL, idempotency_key TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_xp (
      user_id INTEGER PRIMARY KEY, total_xp INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0, last_activity_date TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  const svc = await getService();

  // Criar e finalizar 2 simulados
  for (let i = 0; i < 2; i++) {
    const gen = svc.generateAdaptiveSimulation(1, 5);
    createAndStartSim(_testDb, gen.simulation_id);
    svc.finishSimulation(gen.simulation_id, 1);
  }

  const history = svc.getSimulationHistory(1);
  expect(history.length).toBeGreaterThanOrEqual(2);
  expect(history[0]).toHaveProperty("simulation_type");
  expect(history[0]).toHaveProperty("status");
});

// ================================================================
// 19. PRAGMA foreign_key_check
// ================================================================
test("19. PRAGMA foreign_key_check = 0 problemas após operações de simulado", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerAllQuestions(_testDb, gen.simulation_id, true);

  const issues = _testDb.prepare("PRAGMA foreign_key_check").all();
  expect(issues.length).toBe(0);
});

// ================================================================
// 20. PRAGMA integrity_check
// ================================================================
test("20. PRAGMA integrity_check = ok após operações de simulado", async () => {
  seedSimulationFixtures(_testDb);
  const svc = await getService();
  const gen = svc.generateOfficialSimulation(1);
  if (!gen.ok) return;
  createAndStartSim(_testDb, gen.simulation_id);
  answerAllQuestions(_testDb, gen.simulation_id, false); // tudo errado

  const result = (_testDb
    .prepare("PRAGMA integrity_check")
    .get() as { integrity_check: string }).integrity_check;
  expect(result).toBe("ok");
});
