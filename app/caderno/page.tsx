"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/streaming/TopNav";

type ErrorEntry = {
  questionId: string;
  syllabusItemId: string | null;
  topic: string | null;
  statement: string;
  discipline: string;
  origin: "REAL" | "INEDITA" | "DIDATICA";
  questionNumber: number | null;
  sourcePage: number | null;
  errorType: string | null;
  errorCount: number;
  conceptGap: string | null;
  firstErrorAt: string;
  lastErrorAt: string;
  resolvedAt: string | null;
};

type Payload = { errors: ErrorEntry[]; setupRequired: boolean };

const ERROR_LABELS: Record<string, string> = {
  conhecimento: "Conhecimento",
  esquecimento: "Esquecimento",
  interpretacao: "Interpretação",
  distracao: "Distração",
  calculo: "Cálculo",
  procedimento: "Procedimento",
  confusao_de_conceitos: "Confusão de conceitos",
  pegadinha: "Pegadinha",
  estrategia_de_prova: "Estratégia de prova",
  falta_de_tempo: "Falta de tempo",
};

const DISCIPLINES = ["", "Conhecimentos Profissionais", "Língua Portuguesa", "Matemática"];

export default function CadernoPage() {
  const [payload, setPayload] = useState<Payload>({ errors: [], setupRequired: false });
  const [discipline, setDiscipline] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const query = discipline ? `?discipline=${encodeURIComponent(discipline)}` : "";
    fetch(`/api/error-notebook${query}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Erro ao carregar caderno de erros.");
        return (await response.json()) as Payload;
      })
      .then((data) => { if (active) setPayload(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar caderno de erros."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [discipline]);

  const recurrent = useMemo(
    () => payload.errors.filter((item) => item.errorCount > 1).sort((a, b) => b.errorCount - a.errorCount),
    [payload.errors]
  );

  return (
    <div className="min-h-screen bg-navy pb-20">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 pt-24 md:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Correção estratégica</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">Caderno de Erros</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">Erros recentes e reincidentes recebem prioridade. A classificação é baseada na causa informada durante a resolução.</p>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {DISCIPLINES.map((item) => (
            <button key={item || "todas"} type="button" onClick={() => { setLoading(true); setError(null); setDiscipline(item); }} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${discipline === item ? "border-electric-blue/50 bg-electric-blue/10 text-electric-blue" : "border-graphite/40 bg-navy-900 text-text-secondary"}`}>
              {item || "Todas"}
            </button>
          ))}
        </div>

        {error && <p className="mt-5 rounded-2xl border border-alert-red/30 bg-alert-red/5 p-4 text-sm text-alert-red">{error}</p>}
        {loading && <div className="mt-6 space-y-3"><div className="skeleton h-28" /><div className="skeleton h-28" /></div>}

        {!loading && !error && (
          <>
            <section className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-graphite/40 bg-navy-900 p-4"><p className="text-2xl font-black text-text-primary">{payload.errors.length}</p><p className="text-xs text-text-secondary">Questões com erro</p></div>
              <div className="rounded-2xl border border-alert-red/25 bg-alert-red/5 p-4"><p className="text-2xl font-black text-text-primary">{recurrent.length}</p><p className="text-xs text-text-secondary">Reincidentes</p></div>
              <div className="hidden rounded-2xl border border-graphite/40 bg-navy-900 p-4 sm:block"><p className="text-2xl font-black text-text-primary">{payload.errors.reduce((sum, item) => sum + item.errorCount, 0)}</p><p className="text-xs text-text-secondary">Erros registrados</p></div>
            </section>

            {payload.setupRequired && <p className="mt-5 rounded-2xl border border-warning-gold/30 bg-warning-gold/5 p-4 text-sm text-text-secondary">O edital ainda não foi carregado. O sistema não fabricará um caderno de erros.</p>}

            {recurrent.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-black text-text-primary">Prioridade alta: erros recorrentes</h2>
                <div className="mt-3 space-y-3">
                  {recurrent.slice(0, 6).map((item) => <ErrorCard key={`r-${item.questionId}`} item={item} />)}
                </div>
              </section>
            )}

            <section className="mt-7">
              <h2 className="text-lg font-black text-text-primary">Histórico</h2>
              <div className="mt-3 space-y-3">
                {payload.errors.map((item) => <ErrorCard key={item.questionId} item={item} />)}
                {payload.errors.length === 0 && <p className="rounded-2xl border border-graphite/40 bg-navy-900 p-5 text-sm text-text-secondary">Nenhum erro registrado para este filtro.</p>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

function ErrorCard({ item }: { item: ErrorEntry }) {
  const label = item.origin === "REAL" ? "[QUESTÃO REAL]" : item.origin === "INEDITA" ? "[QUESTÃO INÉDITA]" : "[EXEMPLO DIDÁTICO]";
  return (
    <article className="rounded-2xl border border-graphite/40 bg-navy-900 p-4">
      <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold">
        <span className="rounded-full bg-gold-institution/10 px-2 py-1 text-gold-institution">{label}</span>
        <span className="rounded-full bg-navy-800 px-2 py-1 text-text-secondary">{item.discipline}</span>
        {item.errorCount > 1 && <span className="rounded-full bg-alert-red/10 px-2 py-1 text-alert-red">{item.errorCount} erros</span>}
      </div>
      {item.topic && <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-text-muted">{item.topic}</p>}
      <p className="mt-2 line-clamp-4 whitespace-pre-wrap text-sm font-semibold leading-relaxed text-text-primary">{item.statement}</p>
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className="rounded-lg bg-navy-800 px-2 py-1 text-text-secondary">Causa: {item.errorType ? ERROR_LABELS[item.errorType] ?? item.errorType : "não classificada"}</span>
        {item.conceptGap && <span className="rounded-lg bg-warning-gold/5 px-2 py-1 text-warning-gold">Lacuna: {item.conceptGap}</span>}
      </div>
      <p className="mt-3 text-[11px] text-text-muted">Último erro: {new Intl.DateTimeFormat("pt-BR").format(new Date(item.lastErrorAt))}</p>
    </article>
  );
}
