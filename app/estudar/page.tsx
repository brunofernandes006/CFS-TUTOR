"use client";

import { useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/streaming/TopNav";

type FilterKey = "todos" | "nao_estudados" | "criticos" | "atencao" | "fortes" | "revisao_pendente";
type StudyItem = {
  id: string;
  title: string;
  editalCode: string | null;
  discipline: string;
  weightedShare: number;
  studied: boolean;
  mastery: number | null;
  evidenceCount: number;
  recurrentErrors: number;
  nextReviewAt: string | null;
  reviewOverdue: boolean;
  incidence: number | null;
};

type ApiPayload = { items: StudyItem[]; setupRequired: boolean };

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "todos", label: "Todos" },
  { key: "nao_estudados", label: "Não estudados" },
  { key: "criticos", label: "Críticos" },
  { key: "atencao", label: "Atenção" },
  { key: "fortes", label: "Fortes" },
  { key: "revisao_pendente", label: "Revisão vencida" },
];

function masteryLabel(value: number | null): string {
  if (value == null) return "Dados insuficientes";
  if (value >= 90) return `Forte · ${Math.round(value)}%`;
  if (value >= 80) return `Bom · ${Math.round(value)}%`;
  if (value >= 70) return `Atenção · ${Math.round(value)}%`;
  if (value >= 60) return `Fraco · ${Math.round(value)}%`;
  return `Crítico · ${Math.round(value)}%`;
}

export default function EstudarPage() {
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [payload, setPayload] = useState<ApiPayload>({ items: [], setupRequired: false });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch(`/api/syllabus?filter=${filter}`, { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Falha ao carregar edital");
        return (await response.json()) as ApiPayload;
      })
      .then((data) => { if (active) setPayload(data); })
      .catch(() => { if (active) setError("Não foi possível carregar os tópicos."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter]);

  const groups = useMemo(() => {
    const map = new Map<string, StudyItem[]>();
    for (const item of payload.items) {
      const current = map.get(item.discipline) ?? [];
      current.push(item);
      map.set(item.discipline, current);
    }
    return Array.from(map.entries()).sort((a, b) => (b[1][0]?.weightedShare ?? 0) - (a[1][0]?.weightedShare ?? 0));
  }, [payload.items]);

  function changeFilter(next: FilterKey) {
    if (next === filter) return;
    setError(null);
    setLoading(true);
    setFilter(next);
  }

  return (
    <div className="min-h-screen bg-navy pb-20">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 pt-24 md:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Edital CFS</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">Conteúdo para estudar</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">O edital define a árvore. O sistema usa desempenho e revisões para decidir a ordem, sem declarar domínio quando faltam questões.</p>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2" aria-label="Filtros de estudo">
          {FILTERS.map((item) => (
            <button key={item.key} type="button" onClick={() => changeFilter(item.key)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${filter === item.key ? "border-electric-blue/50 bg-electric-blue/10 text-electric-blue" : "border-graphite/40 bg-navy-900 text-text-secondary"}`}>
              {item.label}
            </button>
          ))}
        </div>

        {payload.setupRequired && !loading && (
          <section className="mt-5 rounded-2xl border border-warning-gold/30 bg-warning-gold/5 p-5">
            <h2 className="font-black text-text-primary">O edital ainda não foi importado.</h2>
            <p className="mt-2 text-sm text-text-secondary">Adicione e valide o edital vigente na Central de Fontes. A árvore de estudo não será inventada.</p>
            <a href="/fontes" className="mt-4 inline-flex rounded-xl bg-electric-blue px-4 py-3 text-sm font-black text-white">Abrir Central de Fontes</a>
          </section>
        )}

        {error && <p className="mt-5 rounded-xl border border-alert-red/30 bg-alert-red/5 p-4 text-sm text-alert-red">{error}</p>}

        {loading ? (
          <div className="mt-6 space-y-3"><div className="skeleton h-28" /><div className="skeleton h-28" /><div className="skeleton h-28" /></div>
        ) : (
          <div className="mt-6 space-y-7">
            {groups.map(([discipline, items]) => (
              <section key={discipline}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div><h2 className="text-lg font-black text-text-primary">{discipline}</h2><p className="text-xs text-text-muted">Impacto ponderado: {items[0]?.weightedShare ?? 0}%</p></div>
                  <span className="text-xs font-bold text-text-muted">{items.length} tópico(s)</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {items.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          {item.editalCode && <p className="text-[10px] font-bold uppercase tracking-wider text-gold-institution">{item.editalCode}</p>}
                          <h3 className="mt-1 text-sm font-black leading-snug text-text-primary">{item.title}</h3>
                        </div>
                        {item.reviewOverdue && <span className="shrink-0 rounded-full bg-alert-red/10 px-2 py-1 text-[10px] font-bold text-alert-red">Revisar</span>}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-text-secondary">
                        <span className="rounded-lg bg-navy-800 px-2 py-1">{masteryLabel(item.mastery)}</span>
                        <span className="rounded-lg bg-navy-800 px-2 py-1">Evidências: {item.evidenceCount}</span>
                        {item.recurrentErrors > 0 && <span className="rounded-lg bg-alert-red/5 px-2 py-1 text-alert-red">Erros recorrentes: {item.recurrentErrors}</span>}
                        {item.incidence != null && <span className="rounded-lg bg-navy-800 px-2 py-1">Incidência medida</span>}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            ))}
            {!payload.setupRequired && groups.length === 0 && <p className="rounded-2xl border border-graphite/40 bg-navy-900 p-5 text-sm text-text-secondary">Nenhum tópico corresponde ao filtro atual.</p>}
          </div>
        )}
      </main>
    </div>
  );
}
