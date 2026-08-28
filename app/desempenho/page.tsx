"use client";

import { useEffect, useState } from "react";
import { TopNav } from "@/components/streaming/TopNav";

type DisciplineStat = {
  discipline: string;
  examWeight: number;
  weightedShare: number;
  mastery: number | null;
  masteryBand: string | null;
  coverage: number;
  itemsStudied: number;
  itemsTotal: number;
  evidenceTopics: number;
  questionsAnswered: number;
  accuracy: number | null;
};
type Topic = { syllabusItemId: string; title: string; discipline: string; mastery: number; recurrentErrors: number; evidenceCount: number };
type Evolution = { day: string; answered: number; correct: number; accuracy: number };
type Performance = {
  setupRequired: boolean;
  evidenceSufficient: boolean;
  readiness: number | null;
  accuracy: number | null;
  questionsAnswered: number;
  editalCoverage: number;
  disciplines: DisciplineStat[];
  criticalItems: Topic[];
  strongItems: Topic[];
  evolution: Evolution[];
};

function masteryText(value: number | null): string {
  if (value == null) return "Dados insuficientes";
  if (value >= 90) return `Forte · ${Math.round(value)}%`;
  if (value >= 80) return `Bom · ${Math.round(value)}%`;
  if (value >= 70) return `Atenção · ${Math.round(value)}%`;
  if (value >= 60) return `Fraco · ${Math.round(value)}%`;
  return `Crítico · ${Math.round(value)}%`;
}

export default function DesempenhoPage() {
  const [data, setData] = useState<Performance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/performance", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Erro ao carregar desempenho.");
        return (await response.json()) as Performance;
      })
      .then((payload) => { if (active) setData(payload); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar desempenho."); });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-navy pb-20">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 pt-24 md:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Evidência, não impressão</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">Desempenho</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">O sistema só declara domínio quando existe quantidade mínima de evidências. Poucas questões resultam em “dados insuficientes”.</p>
        </header>

        {error && <p className="mt-6 rounded-2xl border border-alert-red/30 bg-alert-red/5 p-4 text-sm text-alert-red">{error}</p>}
        {!data && !error && <div className="mt-6 space-y-3"><div className="skeleton h-36" /><div className="skeleton h-48" /></div>}

        {data && (
          <>
            {data.setupRequired && <p className="mt-5 rounded-2xl border border-warning-gold/30 bg-warning-gold/5 p-4 text-sm text-text-secondary">A base do edital ainda está vazia. Não há métricas suficientes para avaliação.</p>}

            <section className="mt-5 rounded-3xl border border-electric-blue/20 bg-gradient-to-br from-navy-900 to-navy-800 p-5 sm:p-7">
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Prontidão interna</p>
              <div className="mt-2 flex flex-wrap items-end gap-4">
                <p className="text-5xl font-black text-text-primary">{data.readiness == null ? "—" : `${data.readiness}%`}</p>
                <p className="max-w-md pb-1 text-xs leading-relaxed text-text-secondary">{data.evidenceSufficient ? "Indicador ponderado baseado em tópicos com evidência suficiente. Não representa probabilidade de aprovação." : "Dados insuficientes. Continue respondendo questões antes de interpretar prontidão."}</p>
              </div>
            </section>

            <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Metric label="Questões" value={String(data.questionsAnswered)} />
              <Metric label="Acertos" value={data.accuracy == null ? "—" : `${data.accuracy}%`} />
              <Metric label="Cobertura edital" value={`${data.editalCoverage}%`} />
              <Metric label="Tópicos críticos" value={String(data.criticalItems.length)} />
            </section>

            <section className="mt-7">
              <h2 className="text-lg font-black text-text-primary">Por matéria</h2>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {data.disciplines.map((item) => (
                  <article key={item.discipline} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-sm font-black text-text-primary">{item.discipline}</h3>
                      <span className="shrink-0 rounded-full bg-gold-institution/10 px-2 py-1 text-[10px] font-black text-gold-institution">{item.weightedShare}%</span>
                    </div>
                    <p className="mt-3 text-xl font-black text-text-primary">{masteryText(item.mastery)}</p>
                    <div className="mt-3 space-y-1 text-xs text-text-secondary">
                      <p>Cobertura: {item.coverage}% ({item.itemsStudied}/{item.itemsTotal})</p>
                      <p>Questões: {item.questionsAnswered}</p>
                      <p>Acerto: {item.accuracy == null ? "dados insuficientes" : `${item.accuracy}%`}</p>
                      <p>Tópicos com evidência: {item.evidenceTopics}</p>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {data.criticalItems.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-black text-text-primary">Prioridade de correção</h2>
                <div className="mt-3 space-y-3">
                  {data.criticalItems.map((item) => (
                    <article key={item.syllabusItemId} className="rounded-2xl border border-alert-red/25 bg-navy-900 p-4">
                      <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-gold-institution">{item.discipline}</p><h3 className="mt-1 text-sm font-black text-text-primary">{item.title}</h3></div><span className="shrink-0 text-sm font-black text-alert-red">{Math.round(item.mastery)}%</span></div>
                      <p className="mt-2 text-xs text-text-muted">Evidências: {item.evidenceCount} · erros recorrentes: {item.recurrentErrors}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {data.strongItems.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-black text-text-primary">Conteúdos fortes</h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {data.strongItems.map((item) => <article key={item.syllabusItemId} className="rounded-2xl border border-success-green/20 bg-navy-900 p-4"><p className="text-xs text-text-muted">{item.discipline}</p><p className="mt-1 text-sm font-black text-text-primary">{item.title}</p><p className="mt-2 text-sm font-black text-success-green">{Math.round(item.mastery)}%</p></article>)}
                </div>
              </section>
            )}

            {data.evolution.length > 0 && (
              <section className="mt-7">
                <h2 className="text-lg font-black text-text-primary">Últimos 30 dias</h2>
                <div className="mt-3 overflow-hidden rounded-2xl border border-graphite/40 bg-navy-900">
                  {data.evolution.map((day) => <div key={day.day} className="flex items-center justify-between gap-4 border-b border-graphite/30 p-3 last:border-0"><time className="text-xs text-text-secondary">{new Intl.DateTimeFormat("pt-BR").format(new Date(`${day.day}T12:00:00`))}</time><p className="text-xs font-bold text-text-primary">{day.answered} questões · {day.accuracy}%</p></div>)}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-graphite/40 bg-navy-900 p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p><p className="mt-1 text-2xl font-black text-text-primary">{value}</p></div>;
}
