import fs from "fs";

describe("CFS Tutor V2 UI invariants", () => {
  it("home is oriented to today's plan without layout overlap", () => {
    const src = fs.readFileSync("app/page.tsx", "utf-8");
    expect(src).toContain("Plano de hoje");
    expect(src).toContain("disciplineWeights");
    expect(src).not.toContain("-mt-20");
  });

  it("official subject weights have a single source of truth", () => {
    const src = fs.readFileSync("lib/config/studyWeights.ts", "utf-8");
    expect(src).toContain("Conhecimentos Profissionais");
    expect(src).toContain("0.5");
    expect(src).toContain("Língua Portuguesa");
    expect(src).toContain("0.3");
    expect(src).toContain("Matemática");
    expect(src).toContain("0.2");
  });

  it("primary mobile navigation is intentionally small", () => {
    const src = fs.readFileSync("components/streaming/TopNav.tsx", "utf-8");
    expect(src).toContain('label: "Hoje"');
    expect(src).toContain('label: "Estudar"');
    expect(src).toContain('label: "Questões"');
    expect(src).toContain('label: "Desempenho"');
    expect(src).toContain('href: "/fontes"');
    expect(src).toContain("grid-cols-5");
  });

  it("source center supports multiple files and human validation", () => {
    const src = fs.readFileSync("app/fontes/page.tsx", "utf-8");
    expect(src).toContain("multiple");
    expect(src).toContain("Pendentes de validação");
    expect(src).toContain("Confirmar fonte");
  });

  it("viewport keeps user zoom available for accessibility", () => {
    const src = fs.readFileSync("app/layout.tsx", "utf-8");
    expect(src).toContain('lang="pt-BR"');
    expect(src).not.toContain("userScalable: false");
    expect(src).not.toContain("maximumScale: 1");
  });
});
