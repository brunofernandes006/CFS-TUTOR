import { classifySourceDocument } from "@/lib/services/documentClassifier";

describe("source document classifier", () => {
  it("classifies official answer key", () => {
    const result = classifySourceDocument("GABARITO - CFS2026 - VUNESP.pdf");
    expect(result.category).toBe("GABARITO");
    expect(result.destination).toBe("provas/gabaritos");
    expect(result.detected.year).toBe(2026);
    expect(result.detected.board).toBe("VUNESP");
  });

  it("classifies exam paper", () => {
    const result = classifySourceDocument("PROVA - CFS2025 - FGV.pdf");
    expect(result.category).toBe("PROVA");
    expect(result.detected.board).toBe("FGV");
  });

  it("does not silently guess an unknown file", () => {
    const result = classifySourceDocument("arquivo_sem_identificacao.pdf");
    expect(result.category).toBe("OUTRO");
    expect(result.needsReview).toBe(true);
  });
});
