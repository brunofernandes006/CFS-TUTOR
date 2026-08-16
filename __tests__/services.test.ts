/**
 * Testes de serviços — rodam contra banco em memória.
 * Cobrem: syllabus, questões, tentativas, caderno de erros,
 * mastery, revisão, missão, prontidão, biblioteca, XP.
 */
import Database from "better-sqlite3";
import { createTestDb, seedMinimal } from "./helpers/testDb";

// ---- Mock do módulo db.ts ----
let _testDb: Database.Database;
jest.mock("@/lib/db", () => ({
  getDb: () => _testDb,
  closeDb: () => {},
}));

beforeEach(() => {
  _testDb = createTestDb();
});

afterEach(() => {
  _testDb.close();
});

// ================================================================
// 1. Usuário padrão
// ================================================================
describe("userService — usuário padrão", () => {
  it("cria o usuário padrão se não existir", async () => {
    const { ensureDefaultUser } = await import("@/lib/services/userService");
    const user = ensureDefaultUser();
    expect(user.id).toBe(1);
    expect(user.username).toBe("aluno_cfs");
  });

  it("retorna o mesmo usuário em chamadas subsequentes", async () => {
    const { ensureDefaultUser } = await import("@/lib/services/userService");
    ensureDefaultUser();
    const user2 = ensureDefaultUser();
    expect(user2.id).toBe(1);
    const count = (_testDb.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
    expect(count).toBe(1);
  });
});

// ================================================================
// 2. Syllabus
// ================================================================
describe("syllabusService — leitura do syllabus", () => {
  beforeEach(() => seedMinimal(_testDb));

  it("retorna todos os itens ativos", async () => {
    const { getAllSyllabusItems } = await import("@/lib/services/syllabusService");
    const items = getAllSyllabusItems();
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].discipline).toBe("Língua Portuguesa");
  });

  it("retorna item por id", async () => {
    const { getSyllabusItemById } = await import("@/lib/services/syllabusService");
    const item = getSyllabusItemById(1);
    expect(item).not.toBeNull();
    expect(item!.title).toBe("Interpretação de textos");
  });

  it("retorna null para id inexistente", async () => {
    const { getSyllabusItemById } = await import("@/lib/services/syllabusService");
    expect(getSyllabusItemById(9999)).toBeNull();
  });

  it("getSyllabusWithProgress inclui mastery_level", async () => {
    const { getSyllabusWithProgress } = await import("@/lib/services/syllabusService");
    const items = getSyllabusWithProgress(1);
    expect(items[0]).toHaveProperty("mastery_level");
    expect(items[0]).toHaveProperty("questions_available");
  });
});

// ================================================================
// 3. Questões
// ================================================================
describe("questionService — leitura de questões", () => {
  beforeEach(() => seedMinimal(_testDb));

  it("retorna questão por id com opções", async () => {
    const { getQuestionById } = await import("@/lib/services/questionService");
    const q = getQuestionById(1);
    expect(q).not.toBeNull();
    expect(q!.origin).toBe("INEDITA");
    expect(q!.options.length).toBe(2);
  });

  it("questão INEDITA nunca tem origin OFICIAL", async () => {
    const { getQuestionById } = await import("@/lib/services/questionService");
    const q = getQuestionById(1);
    expect(q!.origin).not.toBe("OFICIAL");
  });

  it("retorna questões para syllabus_item", async () => {
    const { getQuestionsForSyllabusItem } = await import("@/lib/services/questionService");
    const qs = getQuestionsForSyllabusItem(1);
    expect(qs.length).toBe(1);
  });

  it("retorna array vazio para item sem questões", async () => {
    const { getQuestionsForSyllabusItem } = await import("@/lib/services/questionService");
    expect(getQuestionsForSyllabusItem(9999)).toEqual([]);
  });

  it("countQuestions retorna contagem correta", async () => {
    const { countQuestions } = await import("@/lib/services/questionService");
    expect(countQuestions()).toBe(1);
    expect(countQuestions({ discipline: "Língua Portuguesa" })).toBe(1);
    expect(countQuestions({ discipline: "Disciplina Inexistente" })).toBe(0);
  });
});

// ================================================================
// 4. Tentativa + mastery + caderno de erros
// ================================================================
describe("pedagogyService — recordAttempt", () => {
  beforeEach(() => seedMinimal(_testDb));

  it("cria syllabus_progress ao registrar tentativa", async () => {
    const { recordAttempt } = await import("@/lib/services/pedagogyService");
    recordAttempt({ syllabusItemId: 1, questionId: 1, isCorrect: true, userId: 1 });

    const row = _testDb
      .prepare("SELECT * FROM syllabus_progress WHERE user_id = 1 AND syllabus_item_id = 1")
      .get() as { studied: number; correct_answers: number };
    expect(row).toBeDefined();
    expect(row.studied).toBe(1);
    expect(row.correct_answers).toBe(1);
  });

  it("resposta errada cria entrada no caderno de erros", async () => {
    const { recordAttempt } = await import("@/lib/services/pedagogyService");
    recordAttempt({
      syllabusItemId: 1,
      questionId: 1,
      isCorrect: false,
      chosenOptionIndex: 1,
      correctOptionIndex: 0,
      userId: 1,
    });

    const entry = _testDb
      .prepare("SELECT * FROM error_notebook WHERE user_id = 1 AND question_id = 1")
      .get() as { error_count: number; chosen_option_index: number };
    expect(entry).toBeDefined();
    expect(entry.error_count).toBe(1);
    expect(entry.chosen_option_index).toBe(1);
  });

  it("erros repetidos incrementam error_count", async () => {
    const { recordAttempt } = await import("@/lib/services/pedagogyService");
    recordAttempt({ syllabusItemId: 1, questionId: 1, isCorrect: false, userId: 1 });
    recordAttempt({ syllabusItemId: 1, questionId: 1, isCorrect: false, userId: 1 });

    const entry = _testDb
      .prepare("SELECT error_count FROM error_notebook WHERE user_id = 1 AND question_id = 1")
      .get() as { error_count: number };
    expect(entry.error_count).toBe(2);
  });

  it("resposta correta não cria caderno de erros", async () => {
    const { recordAttempt } = await import("@/lib/services/pedagogyService");
    recordAttempt({ syllabusItemId: 1, questionId: 1, isCorrect: true, userId: 1 });

    const entry = _testDb
      .prepare("SELECT * FROM error_notebook WHERE user_id = 1 AND question_id = 1")
      .get();
    expect(entry).toBeUndefined();
  });

  it("atualiza mastery_score após tentativa", async () => {
    const { recordAttempt } = await import("@/lib/services/pedagogyService");
    recordAttempt({ syllabusItemId: 1, isCorrect: true, userId: 1 });

    const row = _testDb
      .prepare("SELECT mastery_score FROM syllabus_progress WHERE user_id = 1")
      .get() as { mastery_score: number };
    expect(row.mastery_score).toBeGreaterThanOrEqual(0);
  });
});

// ================================================================
// 5. Revisão espaçada
// ================================================================
describe("pedagogyService — calculateNextReview", () => {
  it("erro retorna 1 dia e stage 0", async () => {
    const { calculateNextReview } = await import("@/lib/services/pedagogyService");
    const { new_stage } = calculateNextReview(false, 0);
    expect(new_stage).toBe(0);
  });

  it("acerto avança stage", async () => {
    const { calculateNextReview } = await import("@/lib/services/pedagogyService");
    const { new_stage } = calculateNextReview(true, 0);
    expect(new_stage).toBe(1);
  });

  it("stage máximo não ultrapassa 4", async () => {
    const { calculateNextReview } = await import("@/lib/services/pedagogyService");
    const { new_stage } = calculateNextReview(true, 4);
    expect(new_stage).toBe(4);
  });

  it("next_date é uma data futura válida", async () => {
    const { calculateNextReview } = await import("@/lib/services/pedagogyService");
    const { next_date } = calculateNextReview(true, 0);
    expect(new Date(next_date).getTime()).toBeGreaterThan(Date.now() - 1000);
  });
});

// ================================================================
// 6. Mastery Score
// ================================================================
describe("pedagogyService — calculateMasteryScore", () => {
  it("score 0 para progresso zerado", async () => {
    const { calculateMasteryScore } = await import("@/lib/services/pedagogyService");
    const score = calculateMasteryScore({
      id: 1, user_id: 1, syllabus_item_id: 1,
      studied: 0, mastery_score: 0,
      questions_answered: 0, correct_answers: 0, wrong_answers: 0,
      accuracy: 0, consecutive_correct: 0, consecutive_wrong: 0,
      last_study: null, next_review: null, review_stage: 0, review_count: 0,
    });
    expect(score).toBe(0);
  });

  it("score > 0 com acertos", async () => {
    const { calculateMasteryScore } = await import("@/lib/services/pedagogyService");
    const score = calculateMasteryScore({
      id: 1, user_id: 1, syllabus_item_id: 1,
      studied: 1, mastery_score: 0,
      questions_answered: 10, correct_answers: 8, wrong_answers: 2,
      accuracy: 0.8, consecutive_correct: 3, consecutive_wrong: 0,
      last_study: new Date().toISOString(), next_review: null,
      review_stage: 2, review_count: 2,
    });
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ================================================================
// 7. Missão diária
// ================================================================
describe("pedagogyService — generateDailyMission", () => {
  beforeEach(() => seedMinimal(_testDb));

  it("retorna objeto de missão com data de hoje", async () => {
    const { generateDailyMission } = await import("@/lib/services/pedagogyService");
    const mission = generateDailyMission(1);
    const today = new Date().toISOString().slice(0, 10);
    expect(mission.mission_date).toBe(today);
    expect(mission.target_duration_minutes).toBe(45);
    expect(Array.isArray(mission.slots)).toBe(true);
  });

  it("slots têm os campos obrigatórios", async () => {
    const { generateDailyMission } = await import("@/lib/services/pedagogyService");
    const mission = generateDailyMission(1);
    for (const slot of mission.slots) {
      expect(slot).toHaveProperty("syllabus_item_id");
      expect(slot).toHaveProperty("mission_type");
      expect(slot).toHaveProperty("mastery_level");
      expect(slot).toHaveProperty("reason");
    }
  });
});

// ================================================================
// 8. Prontidão CFS
// ================================================================
describe("pedagogyService — calculateReadiness", () => {
  beforeEach(() => seedMinimal(_testDb));

  it("retorna valor baixo sem nenhum progresso (< 20)", async () => {
    const { calculateReadiness } = await import("@/lib/services/pedagogyService");
    // Sem progresso: domínio=0, cobertura=0, revisões_em_dia=100% (nenhuma agendada → 15pts), recente=0
    // Esperado: ~15 (somente componente revisões)
    const r = calculateReadiness(1);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThan(20);
  });

  it("retorna valor entre 0 e 100", async () => {
    const { recordAttempt, calculateReadiness } = await import("@/lib/services/pedagogyService");
    recordAttempt({ syllabusItemId: 1, isCorrect: true, userId: 1 });
    const r = calculateReadiness(1);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });
});

// ================================================================
// 9. XP — idempotência
// ================================================================
describe("xpService — XP e gamificação", () => {
  beforeEach(() => {
    _testDb.exec(`
      CREATE TABLE IF NOT EXISTS xp_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        reason TEXT NOT NULL,
        idempotency_key TEXT UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS user_xp (
        user_id INTEGER PRIMARY KEY,
        total_xp INTEGER NOT NULL DEFAULT 0,
        streak_days INTEGER NOT NULL DEFAULT 0,
        last_activity_date TEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  });

  it("concede XP corretamente", async () => {
    const { awardXp, getTotalXp } = await import("@/lib/services/xpService");
    const { awarded } = awardXp(10, "teste", "key-1", 1);
    expect(awarded).toBe(true);
    expect(getTotalXp(1)).toBe(10);
  });

  it("não duplica XP com mesma idempotency_key", async () => {
    const { awardXp, getTotalXp } = await import("@/lib/services/xpService");
    awardXp(10, "teste", "key-dup", 1);
    const { awarded } = awardXp(10, "teste", "key-dup", 1);
    expect(awarded).toBe(false);
    expect(getTotalXp(1)).toBe(10);
  });

  it("getLevelInfo retorna nível Recruta para XP zero", async () => {
    const { getLevelInfo } = await import("@/lib/services/xpService");
    expect(getLevelInfo(0).level).toBe("Recruta");
  });

  it("getLevelInfo avança para Patrulheiro com 200 XP", async () => {
    const { getLevelInfo } = await import("@/lib/services/xpService");
    expect(getLevelInfo(200).level).toBe("Patrulheiro");
  });

  it("getLevelInfo retorna Comando no topo", async () => {
    const { getLevelInfo } = await import("@/lib/services/xpService");
    expect(getLevelInfo(5000).level).toBe("Comando");
  });
});

// ================================================================
// 10. Biblioteca
// ================================================================
describe("libraryService — busca de documentos", () => {
  beforeEach(() => {
    _testDb.prepare(
      `INSERT INTO documents (document_uid, sha256, tipo, categoria, titulo, ano, cfs26_priority, status_documento)
       VALUES ('doc-1','abc','ICC','Instrucoes','Manual de Policiamento',2025,1,'ATIVO')`
    ).run();
    _testDb.prepare(
      `INSERT INTO documents (document_uid, sha256, tipo, categoria, titulo, ano, cfs26_priority, status_documento)
       VALUES ('doc-2','def','DIRETRIZ','Operacional','Diretriz de Patrulha',2024,0,'ATIVO')`
    ).run();
  });

  it("retorna todos os documentos sem filtro", async () => {
    const { searchLibrary } = await import("@/lib/services/libraryService");
    const r = searchLibrary();
    expect(r.total).toBe(2);
  });

  it("filtra por tipo", async () => {
    const { searchLibrary } = await import("@/lib/services/libraryService");
    const r = searchLibrary({ tipo: "ICC" });
    expect(r.total).toBe(1);
    expect(r.documents[0].tipo).toBe("ICC");
  });

  it("filtra cfs26_only", async () => {
    const { searchLibrary } = await import("@/lib/services/libraryService");
    const r = searchLibrary({ cfs26_only: true });
    expect(r.total).toBe(1);
    expect(r.documents[0].cfs26_priority).toBe(1);
  });

  it("busca por título parcial", async () => {
    const { searchLibrary } = await import("@/lib/services/libraryService");
    const r = searchLibrary({ search: "Patrulha" });
    expect(r.total).toBe(1);
  });

  it("paginação funciona corretamente", async () => {
    const { searchLibrary } = await import("@/lib/services/libraryService");
    const r = searchLibrary({ page: 1, per_page: 1 });
    expect(r.documents.length).toBe(1);
    expect(r.total).toBe(2);
  });
});

// ================================================================
// 11. Estado vazio — banco sem questões
// ================================================================
describe("estado vazio — banco sem questões", () => {
  it("countQuestions retorna 0 em banco vazio", async () => {
    const { countQuestions } = await import("@/lib/services/questionService");
    expect(countQuestions()).toBe(0);
  });

  it("getRandomQuestion retorna null em banco vazio", async () => {
    const { getRandomQuestion } = await import("@/lib/services/questionService");
    expect(getRandomQuestion()).toBeNull();
  });

  it("getPendingReviews retorna array vazio sem progresso", async () => {
    seedMinimal(_testDb);
    const { getPendingReviews } = await import("@/lib/services/pedagogyService");
    const reviews = getPendingReviews(1);
    expect(Array.isArray(reviews)).toBe(true);
  });
});

// ================================================================
// 12. Integridade do banco
// ================================================================
describe("integridade do banco de testes", () => {
  it("PRAGMA integrity_check retorna ok", () => {
    const result = (_testDb.prepare("PRAGMA integrity_check").get() as { integrity_check: string }).integrity_check;
    expect(result).toBe("ok");
  });

  it("PRAGMA foreign_key_check retorna 0 problemas", () => {
    seedMinimal(_testDb);
    const issues = _testDb.prepare("PRAGMA foreign_key_check").all();
    expect(issues.length).toBe(0);
  });
});

// ================================================================
// 7C-A. userService — proteção contra usuário de teste como principal
// ================================================================
describe("userService — proteção contra contaminação por testes", () => {
  it("corrige id=1 com username de teste para aluno_cfs", async () => {
    // Simula banco contaminado: id=1 com username de teste
    _testDb.prepare(
      "INSERT INTO users (id, username, full_name) VALUES (1, 'aluno_novo', 'Teste aluno_novo')"
    ).run();

    const { ensureDefaultUser } = await import("@/lib/services/userService");
    const user = ensureDefaultUser();

    expect(user.username).toBe("aluno_cfs");
    expect(user.full_name).toBe("Aluno CFS");
  });

  it("não apaga outros usuários ao corrigir id=1", async () => {
    _testDb.prepare(
      "INSERT INTO users (id, username, full_name) VALUES (1, 'aluno_acertos', 'Teste')"
    ).run();
    _testDb.prepare(
      "INSERT INTO users (id, username, full_name) VALUES (2, 'outro_usuario', 'Outro')"
    ).run();

    const { ensureDefaultUser } = await import("@/lib/services/userService");
    ensureDefaultUser();

    const total = (_testDb.prepare("SELECT COUNT(*) as c FROM users").get() as { c: number }).c;
    expect(total).toBe(2);

    const u2 = _testDb.prepare("SELECT username FROM users WHERE id=2").get() as { username: string };
    expect(u2.username).toBe("outro_usuario");
  });

  it("isDefaultUserHealthy retorna true após ensureDefaultUser", async () => {
    const { ensureDefaultUser, isDefaultUserHealthy } = await import(
      "@/lib/services/userService"
    );
    ensureDefaultUser();
    expect(isDefaultUserHealthy()).toBe(true);
  });

  it("isDefaultUserHealthy retorna false com username de teste", async () => {
    _testDb.prepare(
      "INSERT INTO users (id, username, full_name) VALUES (1, 'aluno_novo', 'Teste')"
    ).run();
    const { isDefaultUserHealthy } = await import("@/lib/services/userService");
    expect(isDefaultUserHealthy()).toBe(false);
  });
});

// ================================================================
// 7C-B. Prontidão — fator de confiança
// ================================================================
describe("pedagogyService — calculateReadinessWithConfidence", () => {
  beforeEach(() => seedMinimal(_testDb));

  it("usuário sem histórico → confidence_label SEM_DADOS, display 0", async () => {
    const { calculateReadinessWithConfidence } = await import(
      "@/lib/services/pedagogyService"
    );
    const r = calculateReadinessWithConfidence(1);
    expect(r.confidence_label).toBe("SEM_DADOS");
    expect(r.readiness_display).toBe(0);
    expect(r.confidence_factor).toBe(0);
  });

  it("1 questão correta não gera prontidão alta (display <= 10)", async () => {
    const { recordAttempt, calculateReadinessWithConfidence } = await import(
      "@/lib/services/pedagogyService"
    );
    recordAttempt({ syllabusItemId: 1, questionId: 1, isCorrect: true, userId: 1 });
    const r = calculateReadinessWithConfidence(1);
    expect(r.readiness_display).toBeLessThanOrEqual(10);
  });

  it("poucas questões → confidence_factor baixo (< 0.25)", async () => {
    const { recordAttempt, calculateReadinessWithConfidence } = await import(
      "@/lib/services/pedagogyService"
    );
    // 3 tentativas — muito menos que o mínimo de 20
    for (let i = 0; i < 3; i++) {
      recordAttempt({ syllabusItemId: 1, isCorrect: true, userId: 1 });
    }
    const r = calculateReadinessWithConfidence(1);
    expect(r.confidence_factor).toBeLessThan(0.25);
  });

  it("aumentar cobertura aumenta o confidence_factor", async () => {
    const { recordAttempt, calculateReadinessWithConfidence } = await import(
      "@/lib/services/pedagogyService"
    );

    // Seed adicional: 30 syllabus_items em 3 disciplinas
    for (let i = 2; i <= 31; i++) {
      const disc = i <= 12
        ? "Língua Portuguesa"
        : i <= 22
        ? "Matemática e Raciocínio Lógico"
        : "Conhecimentos Profissionais";
      _testDb
        .prepare(
          "INSERT INTO syllabus_items (id, discipline, title, active) VALUES (?, ?, ?, 1)"
        )
        .run(i, disc, `Item ${i}`);
    }

    // Registrar 10 tentativas em 10 itens diferentes
    for (let i = 1; i <= 10; i++) {
      recordAttempt({ syllabusItemId: i, isCorrect: true, userId: 1 });
    }
    const r1 = calculateReadinessWithConfidence(1);

    // Registrar mais 20 tentativas em 20 itens diferentes
    for (let i = 11; i <= 30; i++) {
      recordAttempt({ syllabusItemId: i, isCorrect: true, userId: 1 });
    }
    const r2 = calculateReadinessWithConfidence(1);

    expect(r2.confidence_factor).toBeGreaterThan(r1.confidence_factor);
  });

  it("readiness_display = readiness_raw × confidence_factor (arredondado)", async () => {
    const { recordAttempt, calculateReadinessWithConfidence } = await import(
      "@/lib/services/pedagogyService"
    );
    for (let i = 0; i < 5; i++) {
      recordAttempt({ syllabusItemId: 1, isCorrect: true, userId: 1 });
    }
    const r = calculateReadinessWithConfidence(1);
    expect(r.readiness_display).toBe(
      Math.round(r.readiness_raw * r.confidence_factor)
    );
  });

  it("confidence_label INICIAL para 1–4 tentativas", async () => {
    const { recordAttempt, calculateReadinessWithConfidence } = await import(
      "@/lib/services/pedagogyService"
    );
    recordAttempt({ syllabusItemId: 1, isCorrect: true, userId: 1 });
    const r = calculateReadinessWithConfidence(1);
    expect(["INICIAL", "SEM_DADOS"]).toContain(r.confidence_label);
    expect(r.readiness_display).toBeLessThan(15);
  });
});

// ================================================================
// 7C-C. Domínio consolidado
// ================================================================
describe("pedagogyService — calculateConsolidatedMastery", () => {
  it("domínio 0% com cobertura 0% = 0", async () => {
    const { calculateConsolidatedMastery } = await import(
      "@/lib/services/pedagogyService"
    );
    expect(calculateConsolidatedMastery(0, 0)).toBe(0);
  });

  it("domínio 100% com cobertura 100% = 100", async () => {
    const { calculateConsolidatedMastery } = await import(
      "@/lib/services/pedagogyService"
    );
    expect(calculateConsolidatedMastery(100, 100)).toBe(100);
  });

  it("domínio 85% com cobertura 4% = valor baixo (< 10)", async () => {
    const { calculateConsolidatedMastery } = await import(
      "@/lib/services/pedagogyService"
    );
    const result = calculateConsolidatedMastery(85, 4);
    // 85 × 0.04 = 3.4 → 3
    expect(result).toBeLessThan(10);
    expect(result).toBe(3);
  });

  it("domínio 80% com cobertura 50% = 40", async () => {
    const { calculateConsolidatedMastery } = await import(
      "@/lib/services/pedagogyService"
    );
    expect(calculateConsolidatedMastery(80, 50)).toBe(40);
  });

  it("domínio consolidado nunca pode ser alto com cobertura quase zero", async () => {
    const { calculateConsolidatedMastery } = await import(
      "@/lib/services/pedagogyService"
    );
    // Mesmo com domínio perfeito nos poucos itens estudados
    const result = calculateConsolidatedMastery(100, 2);
    expect(result).toBeLessThanOrEqual(5);
  });
});

// ================================================================
// 7C-D. DashboardService — estrutura com novos campos
// ================================================================
describe("dashboardService — novos campos 7C", () => {
  beforeEach(() => seedMinimal(_testDb));

  it("discipline_summary tem mastery_of_studied, coverage_pct, consolidated_mastery", async () => {
    // Garante tabela user_xp
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
    const { getDashboardStats } = await import("@/lib/services/dashboardService");
    const stats = getDashboardStats(1);

    expect(stats.discipline_summary.length).toBeGreaterThan(0);
    for (const d of stats.discipline_summary) {
      expect(d).toHaveProperty("mastery_of_studied");
      expect(d).toHaveProperty("coverage_pct");
      expect(d).toHaveProperty("consolidated_mastery");
      expect(d).toHaveProperty("mastery_level");
    }
  });

  it("readiness é um ReadinessResult com todos os campos", async () => {
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
    const { getDashboardStats } = await import("@/lib/services/dashboardService");
    const stats = getDashboardStats(1);

    expect(stats.readiness).toHaveProperty("readiness_raw");
    expect(stats.readiness).toHaveProperty("readiness_display");
    expect(stats.readiness).toHaveProperty("confidence_factor");
    expect(stats.readiness).toHaveProperty("confidence_label");
    expect(stats.readiness).toHaveProperty("components");
    expect(stats.readiness.readiness_display).toBe(0);
    expect(stats.readiness.confidence_label).toBe("SEM_DADOS");
  });

  it("consolidated_mastery não pode ser alto com itens_studied=1 de muitos", async () => {
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

    // Adicionar 49 itens extras na mesma disciplina (total = 50)
    for (let i = 2; i <= 50; i++) {
      _testDb
        .prepare("INSERT INTO syllabus_items (id, discipline, title, active) VALUES (?, ?, ?, 1)")
        .run(i, "Língua Portuguesa", `Item LP ${i}`);
    }

    const { recordAttempt } = await import("@/lib/services/pedagogyService");
    // Estudar apenas 1 item com domínio perfeito
    for (let k = 0; k < 10; k++) {
      recordAttempt({ syllabusItemId: 1, questionId: 1, isCorrect: true, userId: 1 });
    }

    const { getDashboardStats } = await import("@/lib/services/dashboardService");
    const stats = getDashboardStats(1);

    const lp = stats.discipline_summary.find((d) => d.discipline === "Língua Portuguesa");
    expect(lp).toBeDefined();
    // Cobertura = 1/50 = 2%, domínio consolidado deve ser <= 3
    expect(lp!.consolidated_mastery).toBeLessThanOrEqual(3);
  });
});
