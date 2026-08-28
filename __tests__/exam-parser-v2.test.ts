import { parseAnswerKeyCandidates, parseQuestionCandidates } from "@/lib/services/examParserV2";

describe("exam parser V2", () => {
  it("extracts a question candidate without creating an official question", () => {
    const result = parseQuestionCandidates([{ page_number: 3, page_text: [
      "QUESTÃO 12",
      "Considere o enunciado completo apresentado nesta questão de concurso.",
      "A) Alternativa alfa",
      "B) Alternativa beta",
      "C) Alternativa gama",
      "D) Alternativa delta",
      "E) Alternativa épsilon",
    ].join("\n") }]);

    expect(result).toHaveLength(1);
    expect(result[0].questionNumber).toBe(12);
    expect(result[0].sourcePage).toBe(3);
    expect(result[0].options).toEqual([
      "Alternativa alfa", "Alternativa beta", "Alternativa gama", "Alternativa delta", "Alternativa épsilon",
    ]);
  });

  it("rejects malformed question blocks with fewer than four alternatives", () => {
    const result = parseQuestionCandidates([{ page_number: 1, page_text: [
      "QUESTÃO 1",
      "Enunciado suficientemente longo para passar pelo filtro textual.",
      "A) Uma", "B) Duas", "C) Três",
    ].join("\n") }]);
    expect(result).toHaveLength(0);
  });

  it("extracts answer-key candidates and converts A-E to zero-based indexes", () => {
    const result = parseAnswerKeyCandidates([{ page_number: 1, page_text: "1 A 2 C 3 E 4 B" }]);
    expect(result.map((item) => [item.questionNumber, item.correctOptionIndex])).toEqual([
      [1, 0], [2, 2], [3, 4], [4, 1],
    ]);
    expect(result.every((item) => item.isAnnulled === false)).toBe(true);
  });

  it("preserves an annulled answer-key entry without inventing a correct option", () => {
    const result = parseAnswerKeyCandidates([{ page_number: 1, page_text: "17 A 18 * 19 D" }]);
    const annulled = result.find((item) => item.questionNumber === 18);
    expect(annulled).toBeDefined();
    expect(annulled?.isAnnulled).toBe(true);
    expect(annulled?.correctOptionIndex).toBeNull();
  });

  it("drops conflicting answer-key entries instead of guessing", () => {
    const result = parseAnswerKeyCandidates([{ page_number: 1, page_text: "1 A\n1 C\n2 B" }]);
    expect(result.find((item) => item.questionNumber === 1)).toBeUndefined();
    expect(result.find((item) => item.questionNumber === 2)?.correctOptionIndex).toBe(1);
  });
});
