"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";

type ReviewItem = {
  syllabusItemId: string;
  title: string;
  discipline: string;
  stage: number;
  nextReviewAt: string;
  reviewCount: number;
  lastResult: string | null;
  overdue: boolean;
  mastery: number | null;
  evidenceCount: number;
};

type ReviewPayload = { overdue: ReviewItem[]; upcoming: ReviewItem[]; all: ReviewItem[]; setupRequired: boolean };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default function RevisaoPage() {
  const router = useRouter();
  const [data, setData] = useState<ReviewPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/reviews", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Erro ao carregar revisões.");
        return (await response.json()) as ReviewPayload;
      })
      .then((payload) => { if (active) setData(payload); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : "Erro ao carregar revisões."); });
    return () => { active = false; };
  }, []);

  return (
    <div className="min-h-screen bg-navy pb-20">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 pt-24 md:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Recuperação ativa</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">Revisão</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">Primeiro tente recuperar o conteúdo. A explicação vem depois da tentativa, não antes.</p>
        </header>

        {error && <p className="mt-6 rounded-2xl border border-alert-red/30 bg-alert-red/5 p-4 text-sm text-alert-red">{error}</p>}
        {!data && !error && <div className="mt-6 space-y-3"><div className="skeleton h-28" /><div className="skeleton h-28" /></div>}

        {data && (
          <>
            <section className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-alert-red/25 bg-alert-red/5 p-4"><p className="text-2xl font-black text-text-primary">{data.overdue.length}</p><p className="text-xs text-text-secondary">Vencidas</p></div>
              <div className="rounded-2xl border border-graphite/40 bg-navy-900 p-4"><p className="text-2xl font-black text-text-primary">{data.upcoming.length}</p><p className="text-xs text-text-secondary">Agendadas</p></div>
              <div className="rounded-2xl border border-graphite/40 bg-navy-900 p-4"><p className="text-2xl font-black text-text-primary">{data.all.length}</p><p className="text-xs text-text-secondary">No ciclo</p></div>
            </section>

            {data.setupRequired && <p className="mt-5 rounded-2xl border border-warning-gold/30 bg-warning-gold/5 p-4 text-sm text-text-secondary">O edital ainda não foi carregado. Não há revisões para programar.</p>}

            <section className="mt-7">
              <h2 className="text-lg font-black text-text-primary">Revisar agora</h2>
              <div className="mt-3 space-y-3">
                {data.overdue.map((item) => (
                  <article key={item.syllabusItemId} className="rounded-2xl border border-alert-red/25 bg-navy-900 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div><p className="text-[11px] font-bold uppercase tracking-wider text-gold-institution">{item.discipline}</p><h3 className="mt-1 font-black text-text-primary">{item.title}</h3></div>
                      <span className="shrink-0 rounded-full bg-alert-red/10 px-2 py-1 text-[10px] font-bold text-alert-red">Vencida</span>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">Domínio: {item.mastery == null ? "dados insuficientes" : `${Math.round(item.mastery)}%`} · evidências: {item.evidenceCount}</p>
                    <button onClick={() => router.push(`/questoes?syllabusItemId=${encodeURIComponent(item.syllabusItemId)}`)} className="mt-4 rounded-xl bg-electric-blue px-4 py-3 text-sm font-black text-white">Iniciar recuperação</button>
                  </article>
                ))}
                {data.overdue.length === 0 && <p className="rounded-2xl border border-graphite/40 bg-navy-900 p-5 text-sm text-text-secondary">Nenhuma revisão vencida.</p>}
              </div>
            </section>

            <section className="mt-7">
              <h2 className="text-lg font-black text-text-primary">Próximas</h2>
              <div className="mt-3 divide-y divide-graphite/30 rounded-2xl border border-graphite/40 bg-navy-900">
                {data.upcoming.slice(0, 12).map((item) => (
                  <div key={item.syllabusItemId} className="flex items-center justify-between gap-4 p-4">
                    <div className="min-w-0"><p className="truncate text-sm font-bold text-text-primary">{item.title}</p><p className="mt-1 text-xs text-text-muted">{item.discipline}</p></div>
                    <time className="shrink-0 text-xs font-bold text-text-secondary">{formatDate(item.nextReviewAt)}</time>
                  </div>
                ))}
                {data.upcoming.length === 0 && <p className="p-5 text-sm text-text-secondary">Nenhuma revisão futura agendada.</p>}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
