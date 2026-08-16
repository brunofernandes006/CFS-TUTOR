/**
 * Testes de Importação e Validação — separação de question_uid vs syllabus_uid.
 * Banco temporário em memória para todos os testes.
 */
import Database from "better-sqlite3";
import { createTestDb, seedMinimal } from "./helpers/testDb";

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
// validateImportBatch — separação de question_uid vs syllabus_uid
// ================================================================
describe("validateImportBatch — separação de UIDs", () => {
  const SYLLABUS_UIDS = new Set(["SP-PT-001", "SP-PT-002", "SP-MA-001"]);
  const QUESTION_UIDS = new Set(["EXISTING-Q-001"]);

  const VALID_Q = {
    origin: "INEDITA" as const,
    discipline: "Língua Portuguesa",
    syllabus_uid: "SP-PT-001",
    statement: "Enunciado com mais de dez caracteres para validação",
    options: [
      { option_text: "Alternativa A" },
      { option_text: "Alternativa B" },
      { option_text: "Alternativa C" },
      { option_text: "Alternativa D" },
    ],
    correct_option: 0,
  };

  it("question_uid existente => duplicada", async () => {
    const { validateImportBatch } = await import("@/lib/services/importValidation");
    const { valid, report } = validateImportBatch(
      [{ ...VALID_Q, question_uid: "EXISTING-Q-001" }],
      QUESTION_UIDS,
      SYLLABUS_UIDS
    );

    expect(valid.length).toBe(0);
    expect(report.duplicated).toBe(1);
    expect(report.reasons[0]).toContain("EXISTING-Q-001");
    expect(report.reasons[0]).toContain("DUPLICADA");
  });

  it("syllabus_uid válido => aceito", async () => {
    const { validateImportBatch } = await import("@/lib/services/importValidation");
    const { valid, report } = validateImportBatch(
      [{ ...VALID_Q, question_uid: "NEW-Q-001", syllabus_uid: "SP-PT-001" }],
      QUESTION_UIDS,
      SYLLABUS_UIDS
    );

    expect(valid.length).toBe(1);
    expect(report.invalid).toBe(0);
    expect(report.duplicated).toBe(0);
  });

  it("syllabus_uid inexistente => rejeitado", async () => {
    const { validateImportBatch } = await import("@/lib/services/importValidation");
    const { valid, report } = validateImportBatch(
      [{ ...VALID_Q, question_uid: "NEW-Q-002", syllabus_uid: "INEXISTENTE" }],
      QUESTION_UIDS,
      SYLLABUS_UIDS
    );

    expect(valid.length).toBe(0);
    expect(report.invalid).toBe(1);
    expect(report.reasons[0]).toContain("syllabus_uid");
  });

  it("question_uid diferente de syllabus_uid não interfere", async () => {
    const { validateImportBatch } = await import("@/lib/services/importValidation");
    const { valid, report } = validateImportBatch(
      [{ ...VALID_Q, question_uid: "Q-NOVO-999", syllabus_uid: "SP-MA-001" }],
      QUESTION_UIDS,
      SYLLABUS_UIDS
    );

    // Q-NOVO-999 não existe em QUESTION_UIDS, SP-MA-001 existe em SYLLABUS_UIDS
    expect(valid.length).toBe(1);
    expect(report.duplicated).toBe(0);
    expect(report.invalid).toBe(0);
  });

  it("question_uid no batch duplicado internamente => duplicada", async () => {
    const { validateImportBatch } = await import("@/lib/services/importValidation");
    const { valid, report } = validateImportBatch(
      [
        { ...VALID_Q, question_uid: "Q-DUP-001" },
        { ...VALID_Q, question_uid: "Q-DUP-001" },
      ],
      QUESTION_UIDS,
      SYLLABUS_UIDS
    );

    expect(valid.length).toBe(1);
    expect(report.duplicated).toBe(1);
  });

  it("syllabus_uid vazio => inválida", async () => {
    const { validateImportBatch } = await import("@/lib/services/importValidation");
    const { valid, report } = validateImportBatch(
      [{ ...VALID_Q, question_uid: "Q-001", syllabus_uid: "" }],
      QUESTION_UIDS,
      SYLLABUS_UIDS
    );

    expect(valid.length).toBe(0);
    expect(report.invalid).toBe(1);
  });

  it("vazio => sem erros", async () => {
    const { validateImportBatch } = await import("@/lib/services/importValidation");
    const { valid, report } = validateImportBatch([], QUESTION_UIDS, SYLLABUS_UIDS);

    expect(valid.length).toBe(0);
    expect(report.imported).toBe(0);
    expect(report.duplicated).toBe(0);
    expect(report.invalid).toBe(0);
  });
});

// ================================================================
// validateImportQuestion — validações unitárias
// ================================================================
describe("validateImportQuestion — validações unitárias", () => {
  const SYLLABUS_UIDS = new Set(["SP-PT-001"]);

  const makeQ = (overrides: Record<string, unknown> = {}) => ({
    question_uid: "T-001",
    origin: "INEDITA",
    discipline: "Língua Portuguesa",
    syllabus_uid: "SP-PT-001",
    statement: "Enunciado com mais de dez caracteres para validação correta",
    options: [
      { option_text: "A" }, { option_text: "B" },
      { option_text: "C" }, { option_text: "D" },
    ],
    correct_option: 0,
    ...overrides,
  });

  it("rejeita OFICIAL sem campos obrigatórios", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({ origin: "OFICIAL" }), SYLLABUS_UIDS);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("OFICIAL"))).toBe(true);
  });

  it("aceita OFICIAL com todos os campos", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({
      origin: "OFICIAL",
      year: 2024, exam: "CFS PMESP", number: 42,
      source: "Prova oficial", verified: true,
    }), SYLLABUS_UIDS);
    expect(r.valid).toBe(true);
  });

  it("rejeita disciplina inválida", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({ discipline: "História" }), SYLLABUS_UIDS);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("disciplina"))).toBe(true);
  });

  it("rejeita gabarito fora do range", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({ correct_option: 5 }), SYLLABUS_UIDS);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("gabarito"))).toBe(true);
  });

  it("rejeita syllabus_uid inexistente", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({ syllabus_uid: "INEXISTENTE" }), SYLLABUS_UIDS);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("syllabus_uid"))).toBe(true);
  });

  it("aceita INEDITA sem campos de proveniência", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({ question_uid: "T-002" }), SYLLABUS_UIDS);
    expect(r.valid).toBe(true);
  });

  it("rejeita menos de 4 alternativas", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({
      question_uid: "T-003",
      options: [{ option_text: "A" }, { option_text: "B" }],
    }), SYLLABUS_UIDS);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("alternativas"))).toBe(true);
  });

  it("aceita 5 alternativas", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({
      question_uid: "T-004",
      options: [
        { option_text: "A" }, { option_text: "B" },
        { option_text: "C" }, { option_text: "D" },
        { option_text: "E" },
      ],
      correct_option: 3,
    }), SYLLABUS_UIDS);
    expect(r.valid).toBe(true);
  });

  it("rejeita enunciado curto", async () => {
    const { validateImportQuestion } = await import("@/lib/services/importValidation");
    const r = validateImportQuestion(makeQ({ question_uid: "T-005", statement: "Curto" }), SYLLABUS_UIDS);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("enunciado"))).toBe(true);
  });
});
