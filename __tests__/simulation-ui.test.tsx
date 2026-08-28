/** @jest-environment jsdom */

import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

describe("Simulados V2 — contrato de interface", () => {
  it("mostra o modo oficial com distribuição e pesos do edital", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: async () => [] } as Response)) as typeof fetch;
    render(<SimuladosPage />);
    expect(screen.getByText("Simulado oficial")).toBeInTheDocument();
    expect(screen.getByText(/60 questões · distribuição do edital/i)).toBeInTheDocument();
    expect(screen.getByText(/20 Português \(peso 3\).*20 Matemática \(peso 2\).*20 Conhecimentos Profissionais \(peso 5\)/i)).toBeInTheDocument();
    expect(screen.getByText("Treino adaptativo")).toBeInTheDocument();
    expect(await screen.findByText(/Nenhum simulado registrado ainda/i)).toBeInTheDocument();
  });

  it("exibe falta de questões reais validadas no modo oficial", async () => {
    global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url) === "/api/simulations" && init?.method === "POST") {
        return Promise.resolve({
          ok: false,
          status: 422,
          json: async () => ({ ok: false, error: "SIMULATION_INSUFFICIENT_QUESTIONS", discipline: "Conhecimentos Profissionais", required: 20, available: 7 }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as typeof fetch;
    render(<SimuladosPage />);
    fireEvent.click(screen.getByRole("button", { name: /iniciar simulado oficial/i }));
    expect(await screen.findByText(/Banco ainda insuficiente.*Conhecimentos Profissionais: 7\/20 questões reais validadas/i)).toBeInTheDocument();
  });

  it("cria treino adaptativo com quantidade selecionada e redireciona", async () => {
    const simulationId = "11111111-1111-4111-8111-111111111111";
    global.fetch = jest.fn((url: RequestInfo | URL, init?: RequestInit) => {
      if (String(url) === "/api/simulations" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        expect(body.type).toBe("ADAPTATIVO");
        expect(body.target_questions).toBe(20);
        return Promise.resolve({ ok: true, status: 201, json: async () => ({ ok: true, simulation_id: simulationId, questions: 20 }) } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => [] } as Response);
    }) as typeof fetch;
    render(<SimuladosPage />);
    fireEvent.change(screen.getByRole("combobox", { name: /quantidade/i }), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: /iniciar adaptativo/i }));
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith(`/simulados/${simulationId}`));
  });

  it("histórico concluído exibe nota ponderada", async () => {
    global.fetch = jest.fn(() => Promise.resolve({
      ok: true,
      json: async () => [{
        id: "22222222-2222-4222-8222-222222222222",
        mode: "OFICIAL",
        status: "COMPLETED",
        started_at: "2026-08-28T00:00:00Z",
        completed_at: "2026-08-28T01:30:00Z",
        duration_seconds: 5400,
        weighted_score: 8.25,
      }],
    } as Response)) as typeof fetch;
    render(<SimuladosPage />);
    expect(await screen.findByText("8.25")).toBeInTheDocument();
    expect(screen.getByText(/Concluído/)).toBeInTheDocument();
  });
});
