/**
 * Testes do Tutor IA Offline — geração de prompts, documentos relacionados.
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
// Tutor IA — Prompt Generation
// ================================================================
describe("tutorIAPromptService — geração de prompts", () => {
  beforeEach(() => {
    seedMinimal(_testDb);
  });

  it("gera prompt para explicar tema", async () => {
    const { generateTutorPrompt } = await import("@/lib/services/tutorIAPromptService");
    const result = generateTutorPrompt({
      objective: "explicar_tema",
      discipline: "Língua Portuguesa",
      depth: "intermediario",
    });

    expect(result.prompt).toContain("tutor especialista");
    expect(result.prompt).toContain("Língua Portuguesa");
    expect(result.prompt).toContain("Explique o tema");
    expect(result.objective_label).toBe("Explicar um Tema");
    expect(result.is_question_request).toBe(false);
    expect(result.origin_alert).toBe("");
  });

  it("gera prompt para questões com alerta de origem", async () => {
    const { generateTutorPrompt } = await import("@/lib/services/tutorIAPromptService");
    const result = generateTutorPrompt({
      objective: "questoes_ineditas",
      discipline: "Conhecimentos Profissionais",
      depth: "avancado",
    });

    expect(result.is_question_request).toBe(true);
    expect(result.origin_alert).toContain("INÉDITAS");
    expect(result.origin_alert).toContain("Nunca são oficiais");
    expect(result.prompt).toContain("ORIGEM");
    expect(result.prompt).toContain("GABARITO");
  });

  it("gera prompt com syllabus item específico", async () => {
    const { generateTutorPrompt } = await import("@/lib/services/tutorIAPromptService");
    const result = generateTutorPrompt({
      objective: "flashcards",
      discipline: "Língua Portuguesa",
      syllabus_item_id: 1,
      depth: "basico",
    });

    expect(result.prompt).toContain("Interpretação de textos");
    expect(result.prompt).toContain("flashcards");
    expect(result.prompt).toContain("FRENTE");
    expect(result.prompt).toContain("VERSOR");
  });

  it("inclui observação do aluno quando fornecida", async () => {
    const { generateTutorPrompt } = await import("@/lib/services/tutorIAPromptService");
    const result = generateTutorPrompt({
      objective: "resumir_conteudo",
      discipline: "Matemática e Raciocínio Lógico",
      depth: "basico",
      notes: "Focar em probabilidade",
    });

    expect(result.prompt).toContain("Focar em probabilidade");
    expect(result.prompt).toContain("Observação do aluno");
  });

  it("retorna label correto para cada objetivo", async () => {
    const { generateTutorPrompt, OBJECTIVE_LABELS } = await import("@/lib/services/tutorIAPromptService");

    const objectives = [
      "explicar_tema", "resumir_conteudo", "plano_revisao", "explicar_erro",
      "flashcards", "questoes_ineditas", "comparar_temas", "preparar_sessao",
    ] as const;

    for (const obj of objectives) {
      const result = generateTutorPrompt({
        objective: obj,
        discipline: "Língua Portuguesa",
        depth: "intermediario",
      });
      expect(result.objective_label).toBe(OBJECTIVE_LABELS[obj]);
    }
  });

  it("busca documentos relacionados à disciplina", async () => {
    _testDb.prepare(
      `INSERT INTO documents (id, document_uid, sha256, tipo, titulo, ano, cfs26_priority)
       VALUES (1, 'doc-1', 'abc123', 'ICC', 'ICC Língua Portuguesa', 2024, 1)`
    ).run();
    _testDb.prepare(
      `INSERT INTO documents (id, document_uid, sha256, tipo, titulo, ano, cfs26_priority)
       VALUES (2, 'doc-2', 'def456', 'NI', 'NI Geral', 2023, 0)`
    ).run();

    const { generateTutorPrompt } = await import("@/lib/services/tutorIAPromptService");
    const result = generateTutorPrompt({
      objective: "explicar_tema",
      discipline: "Língua Portuguesa",
      depth: "basico",
    });

    expect(result.related_docs.length).toBeGreaterThanOrEqual(1);
    expect(result.related_docs.some((d) => d.titulo?.includes("Portuguesa"))).toBe(true);
  });

  it("retorna temas relacionados para syllabus item", async () => {
    _testDb.prepare(
      `INSERT INTO syllabus_items (id, discipline, title, active)
       VALUES (2, 'Língua Portuguesa', 'Gramática', 1)`
    ).run();

    const { generateTutorPrompt } = await import("@/lib/services/tutorIAPromptService");
    const result = generateTutorPrompt({
      objective: "explicar_tema",
      discipline: "Língua Portuguesa",
      syllabus_item_id: 1,
      depth: "intermediario",
    });

    expect(result.related_topics).toContain("Gramática");
  });
});
