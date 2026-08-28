"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";

type SimulationHistory = {
  id: string;
  mode: "OFICIAL" | "ADAPTATIVO";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  weighted_score: number | null;
};

type CreateError = {
  error?: string;
  discipline?: string;
  required?: number;
  available?: number;
};

const ADAPTIVE_OPTIONS = [10, 20, 30, 40, 60];

export default function SimuladosPage() {
  const router = useRouter();
  const [history, setHistory] = useState<SimulationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"OFICIAL" | "ADAPTATIVO" | null>(null);
  const [adaptiveCount, setAdaptiveCount] = useState(30);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/simulations", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o histórico.");
        return (await response.json()) as SimulationHistory[];
      })
      .then(setHistory)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Falha ao carregar histórico."))
      .finally(() => setLoading(false));
  }, []);

  async function createSimulation(mode: "OFICIAL" | "ADAPTATIVO") {
    setBusy(mode);
    setError(null);
    try {
      const response = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: mode,
          target_questions: mode === "ADAPTATIVO" ? adaptiveCount : 60,
        }),
      });
      const data = (await response.json()) as { simulation_id?: string } & CreateError;
      if (!response.ok || !data.simulation_id) {
        if (data.error === "SIMULATION_INSUFFICIENT_QUESTIONS") {
          const detail = data.discipline
            ? `${data.discipline}: ${data.available ?? 0}/${data.required ?? 0} questões reais validadas.`
            : `${data.available ?? 0}/${data.required ?? adaptiveCount} questões validadas.`;
          throw new Error(`Banco ainda insuficiente. ${detail}`);
        }
        throw new Error(data.error ?? "Não foi possível criar o simulado.");
      }
      router.push(`/simulados/${data.simulation_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar simulado.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-navy pb-24">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 pt-24 md:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">MODO PROVA</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">Simulados</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary">
            Sem dicas e sem gabarito durante a aplicação. A análise aparece somente ao finalizar.
          </p>
        </header>

        <section className="mt-6 rounded-3xl border border-gold-institution/25 bg-navy-900 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-gold-institution">Simulado oficial</p>
              <h2 className="mt-1 text-xl font-black text-text-primary">60 questões · distribuição do edital</h2>
              <p className="mt-2 text-sm text-text-secondary">20 Português (peso 3) · 20 Matemática (peso 2) · 20 Conhecimentos Profissionais (peso 5).</p>
              <p className="mt-2 text-xs text-text-muted">Este modo exige questões reais validadas e vinculadas a fonte oficial.</p>
            </div>
            <button type="button" disabled={busy !== null} onClick={() => void createSimulation("OFICIAL")} className="rounded-2xl bg-gold-institution px-5 py-3 text-sm font-black text-navy-950 disabled:opacity-50">
              {busy === "OFICIAL" ? "Montando..." : "Iniciar simulado oficial"}
            </button>
          </div>
        </section>

        <section className="mt-4 rounded-3xl border border-electric-blue/25 bg-navy-900 p-5 sm:p-6">
          <p className="text-xs font-black uppercase tracking-wider text-electric-blue">Treino adaptativo</p>
          <h2 className="mt-1 text-xl font-black text-text-primary">Prioriza lacunas reais</h2>
          <p className="mt-2 text-sm text-text-secondary">Considera menor domínio, erros recorrentes e incidência histórica quando já houver dados suficientes.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="text-xs font-bold text-text-secondary" htmlFor="adaptive-count">Quantidade</label>
            <select id="adaptive-count" value={adaptiveCount} onChange={(event) => setAdaptiveCount(Number(event.target.value))} className="rounded-xl border border-graphite/50 bg-navy-800 px-3 py-2 text-sm text-text-primary">
              {ADAPTIVE_OPTIONS.map((value) => <option key={value} value={value}>{value} questões</option>)}
            </select>
            <button type="button" disabled={busy !== null} onClick={() => void createSimulation("ADAPTATIVO")} className="rounded-2xl bg-electric-blue px-5 py-3 text-sm font-black text-white disabled:opacity-50">
              {busy === "ADAPTATIVO" ? "Montando..." : "Iniciar adaptativo"}
            </button>
          </div>
        </section>

        {error && <div className="mt-4 rounded-2xl border border-alert-red/30 bg-alert-red/5 p-4 text-sm text-alert-red">{error}</div>}

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-text-primary">Histórico</h2>
            <span className="text-xs text-text-muted">{history.length} registro(s)</span>
          </div>

          {loading ? (
            <div className="mt-3 rounded-2xl border border-graphite/30 bg-navy-900 p-5 text-sm text-text-muted">Carregando...</div>
          ) : history.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-graphite/30 bg-navy-900 p-5 text-sm text-text-secondary">Nenhum simulado registrado ainda.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {history.map((item) => (
                <button key={item.id} type="button" onClick={() => router.push(`/simulados/${item.id}`)} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-graphite/30 bg-navy-900 p-4 text-left">
                  <div>
                    <p className="text-sm font-black text-text-primary">{item.mode === "OFICIAL" ? "Simulado oficial" : "Treino adaptativo"}</p>
                    <p className="mt-1 text-xs text-text-muted">{new Date(item.started_at).toLocaleString("pt-BR")} · {item.status === "COMPLETED" ? "Concluído" : "Em andamento"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-gold-institution">{item.weighted_score == null ? "—" : Number(item.weighted_score).toFixed(2)}</p>
                    <p className="text-[10px] uppercase tracking-wider text-text-muted">nota / 10</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
