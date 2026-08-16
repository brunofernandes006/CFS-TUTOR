/** @jest-environment jsdom */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

const pushMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => "/simulados",
}));

import SimuladosPage from "@/app/simulados/page";

beforeEach(() => {
  pushMock.mockReset();
  jest.clearAllMocks();
});

describe("Fase 8B — interface de simulados", () => {
  it("carrega a tela de simulados com cards e histórico", async () => {
    global.fetch = jest.fn((url: RequestInfo | URL) => {
      if (String(url) === "/api/simulations") {
        return Promise.resolve({
          ok: true,
          json: async () => [
            {
              id: 1,
              simulation_type: "OFICIAL",
              status: "FINISHED",
              target_questions: 60,
              correct: 30,
              weighted_final_score: 8.2,
              minimums_met: 1,
              elapsed_seconds: 5400,
              created_at: "2026-08-12T00:00:00Z",
              finished_at: "2026-08-12T01:30:00Z",
            },
          ],
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    }) as typeof fetch;

    render(<SimuladosPage />);

    expect(await screen.findByText("Operação Oficial")).toBeInTheDocument();
    expect(screen.getByText("Operação Adaptativa")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText(/HISTÓRICO DE OPERAÇÕES/)).toBeInTheDocument();
    });
  });

  it("exibe aviso de banco insuficiente para simulado oficial", async () => {
    global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url) === "/api/simulations" && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({
            error: "SIMULATION_INSUFFICIENT_QUESTIONS",
            available: { "Língua Portuguesa": 0, "Matemática e Raciocínio Lógico": 0, "Conhecimentos Profissionais": 0 },
            missing: { "Língua Portuguesa": 20, "Matemática e Raciocínio Lógico": 20, "Conhecimentos Profissionais": 20 },
          }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as typeof fetch;

    render(<SimuladosPage />);
    fireEvent.click(screen.getByRole("button", { name: /iniciar operação oficial/i }));

    await waitFor(() => {
      expect(screen.getByText(/Banco insuficiente para gerar um simulado oficial/i)).toBeInTheDocument();
    });
  });

  it("permite configurar o tamanho do adaptativo e cria redirecionamento", async () => {
    global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url) === "/api/simulations" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.type).toBe("ADAPTATIVO");
        expect(body.target_questions).toBe(30);
        return Promise.resolve({
          ok: true,
          status: 201,
          json: async () => ({ simulation_id: 99, actual_questions: 30 }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as typeof fetch;

    render(<SimuladosPage />);
    fireEvent.change(screen.getByDisplayValue(/30 questões/i), { target: { value: "30" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar operação adaptativa/i }));

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith("/simulados/99");
    });
  });

  it("exibe mensagem de histórico vazio quando não há operações", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => [] } as Response)) as typeof fetch;

    render(<SimuladosPage />);

    expect(await screen.findByText(/Você ainda não concluiu nenhuma Operação/i)).toBeInTheDocument();
  });
});
