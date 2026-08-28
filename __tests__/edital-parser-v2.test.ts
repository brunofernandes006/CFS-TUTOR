import { parseSyllabusCandidates } from "@/lib/services/editalParserV2";

describe("edital parser V2", () => {
  it("extracts numbered items only after a recognized discipline heading", () => {
    const result = parseSyllabusCandidates([{ page_number: 8, page_text: [
      "LÍNGUA PORTUGUESA",
      "3.1 Interpretação de textos de diferentes gêneros.",
      "3.2 Concordância verbal e nominal.",
      "MATEMÁTICA",
      "4.1 Porcentagem, razão e proporção.",
    ].join("\n") }]);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual(expect.objectContaining({ disciplineCode: "MAT", editalCode: "4.1", sourcePage: 8 }));
    expect(result.find((item) => item.editalCode === "3.1")?.disciplineCode).toBe("PORT");
  });

  it("keeps continuation lines attached to the same edital item", () => {
    const result = parseSyllabusCandidates([{ page_number: 12, page_text: [
      "CONHECIMENTOS PROFISSIONAIS",
      "5.10 Código Penal Militar:",
      "disposições expressamente indicadas no edital vigente.",
    ].join("\n") }]);

    expect(result).toHaveLength(1);
    expect(result[0].title).toContain("Código Penal Militar");
    expect(result[0].title).toContain("disposições expressamente indicadas");
  });

  it("does not create syllabus content before finding an official discipline section", () => {
    const result = parseSyllabusCandidates([{ page_number: 1, page_text: "1.1 Disposição administrativa\n2.1 Outra linha" }]);
    expect(result).toHaveLength(0);
  });
});
