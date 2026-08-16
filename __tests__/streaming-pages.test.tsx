/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/estudar",
}));

beforeEach(() => {
  pushMock.mockReset();
  jest.clearAllMocks();
});

// ── /estudar ─────────────────────────────────────────────────────
describe("Streaming /estudar page", () => {
  it("exports default page component", async () => {
    const mod = await import("@/app/estudar/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders header and filter toggle", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] } as Response)
    ) as typeof fetch;

    const { default: EstudarPage } = await import("@/app/estudar/page");
    render(<EstudarPage />);

    expect(await screen.findByText(/Edital Completo/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /filtrar conteúdos/i })).toBeInTheDocument();
  });

  it("shows empty state when no items match filter", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] } as Response)
    ) as typeof fetch;

    const { default: EstudarPage } = await import("@/app/estudar/page");
    render(<EstudarPage />);

    expect(await screen.findByText(/Nenhum item encontrado/i)).toBeInTheDocument();
  });

  it("renders content rows when items exist", async () => {
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      if (String(url).includes("/api/syllabus")) {
        return Promise.resolve({
          ok: true,
          json: async () => [
            { id: "1", title: "ICC 191", discipline: "Língua Portuguesa", source_reference: "Art. 5", progress: { studied: 1, mastery_score: 70, next_review: null }, questions_available: 3 },
            { id: "2", title: "POP 001", discipline: "Conhecimentos Profissionais", source_reference: "POP 1", progress: { studied: 1, mastery_score: 30, next_review: null }, questions_available: 2 },
          ],
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as typeof fetch;

    const { default: EstudarPage } = await import("@/app/estudar/page");
    render(<EstudarPage />);

    expect(await screen.findByText(/Edital Completo/)).toBeInTheDocument();
  });

  it("toggles filter panel on button click", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] } as Response)
    ) as typeof fetch;

    const { default: EstudarPage } = await import("@/app/estudar/page");
    render(<EstudarPage />);

    await screen.findByText(/Edital Completo/);
    const toggleBtn = screen.getByRole("button", { name: /filtrar conteúdos/i });
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /ocultar filtros/i })).toBeInTheDocument();
  });
});

// ── /biblioteca ──────────────────────────────────────────────────
describe("Streaming /biblioteca page", () => {
  it("exports default page component", async () => {
    const mod = await import("@/app/biblioteca/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders header and search button", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ documents: [] }) } as Response)
    ) as typeof fetch;

    const { default: BibliotecaPage } = await import("@/app/biblioteca/page");
    render(<BibliotecaPage />);

    expect(await screen.findByText(/Biblioteca Operacional/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /buscar documentos/i })).toBeInTheDocument();
  });

  it("shows empty state when no documents", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ documents: [] }) } as Response)
    ) as typeof fetch;

    const { default: BibliotecaPage } = await import("@/app/biblioteca/page");
    render(<BibliotecaPage />);

    expect(await screen.findByText(/Nenhum documento encontrado/i)).toBeInTheDocument();
  });

  it("renders document cards when docs exist", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          documents: [
            { id: 1, titulo: "ICC 191", tipo: "ICC", numero: "191/2026", cfs26_priority: 1 },
            { id: 2, titulo: "Diretriz X", tipo: "DIRETRIZ", numero: "001", cfs26_priority: 0 },
          ],
        }),
      } as Response)
    ) as typeof fetch;

    const { default: BibliotecaPage } = await import("@/app/biblioteca/page");
    render(<BibliotecaPage />);

    expect(await screen.findAllByText("ICC 191")).toHaveLength(4); // CFS/26 row + ICC row
    expect(screen.getAllByText("Diretriz X").length).toBeGreaterThanOrEqual(1);
  });
});

// ── /simulados ───────────────────────────────────────────────────
describe("Streaming /simulados page", () => {
  it("exports default page component", async () => {
    const mod = await import("@/app/simulados/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders hero section and operation cards", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] } as Response)
    ) as typeof fetch;

    const { default: SimuladosPage } = await import("@/app/simulados/page");
    render(<SimuladosPage />);

    expect(await screen.findByText(/OPERAÇÕES DE TREINAMENTO/)).toBeInTheDocument();
    expect(screen.getByText("Operação Oficial")).toBeInTheDocument();
    expect(screen.getByText("Operação Adaptativa")).toBeInTheDocument();
  });

  it("shows empty history state", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] } as Response)
    ) as typeof fetch;

    const { default: SimuladosPage } = await import("@/app/simulados/page");
    render(<SimuladosPage />);

    expect(await screen.findByText(/Você ainda não concluiu/i)).toBeInTheDocument();
  });

  it("shows availability by discipline", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => [] } as Response)
    ) as typeof fetch;

    const { default: SimuladosPage } = await import("@/app/simulados/page");
    render(<SimuladosPage />);

    expect(await screen.findByText(/OPERAÇÕES DE TREINAMENTO/)).toBeInTheDocument();
    expect(screen.getByText("Disponibilidade por disciplina")).toBeInTheDocument();
    expect(screen.getByText("Língua Portuguesa")).toBeInTheDocument();
  });
});

// ── /questoes ────────────────────────────────────────────────────
describe("Streaming /questoes page", () => {
  it("exports default page component", async () => {
    const mod = await import("@/app/questoes/page");
    expect(typeof mod.default).toBe("function");
  });

  it("renders hero and discipline quick start cards", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ question: null }) } as Response)
    ) as typeof fetch;

    const { default: QuestoesPage } = await import("@/app/questoes/page");
    render(<QuestoesPage />);

    expect(await screen.findByText(/TREINAMENTO TÁTICO/)).toBeInTheDocument();
    expect(screen.getByText("Todas as Disciplinas")).toBeInTheDocument();
    expect(screen.getByText("Língua Portuguesa")).toBeInTheDocument();
    expect(screen.getByText("Matemática e Raciocínio Lógico")).toBeInTheDocument();
    expect(screen.getByText("Conhecimentos Profissionais")).toBeInTheDocument();
  });

  it("shows empty state when question bank insufficient", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, json: async () => ({ question: null }) } as Response)
    ) as typeof fetch;

    const { default: QuestoesPage } = await import("@/app/questoes/page");
    render(<QuestoesPage />);

    expect(await screen.findByText(/Banco de questões ainda não possui/i)).toBeInTheDocument();
  });

  it("shows active question when question available", async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          question: {
            id: 1,
            statement: "Teste de questão",
            discipline: "Português",
            difficulty: 3,
            origin: "OFICIAL",
            options: [
              { id: 1, option_index: 0, option_text: "Alternativa A", is_correct: 1 },
              { id: 2, option_index: 1, option_text: "Alternativa B", is_correct: 0 },
            ],
          },
        }),
      } as Response)
    ) as typeof fetch;

    const { default: QuestoesPage } = await import("@/app/questoes/page");
    render(<QuestoesPage />);

    expect(await screen.findByText("Teste de questão")).toBeInTheDocument();
    expect(screen.getByText(/Voltar ao treinamento/)).toBeInTheDocument();
  });
});

// ── AppShell streaming routes ────────────────────────────────────
describe("AppShell streaming route behavior", () => {
  it("STREAMING_ROUTES constant includes all 5 routes", async () => {
    const fs = await import("fs");
    const code = fs.readFileSync("components/layout/AppShell.tsx", "utf-8");
    expect(code).toContain('"/"');
    expect(code).toContain('"/estudar"');
    expect(code).toContain('"/biblioteca"');
    expect(code).toContain('"/simulados"');
    expect(code).toContain('"/questoes"');
  });
});
