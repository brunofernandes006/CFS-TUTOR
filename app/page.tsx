"use client";

import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";
import { useHomeData } from "@/hooks/useHomeData";

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-graphite/40 bg-navy-900 p-4 min-w-0">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-text-primary">{value}</p>
      {detail && <p className="mt-1 text-xs text-text-secondary line-clamp-2">{detail}</p>}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { data, loading, error } = useHomeData();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy pt-24 px-4">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="skeleton h-52" />
          <div className="grid grid-cols-2 gap-3">
            <div className="skeleton h-28" />
            <div className="skeleton h-28" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-navy pt-24 px-4">
        <TopNav />
        <div className="mx-auto max-w-lg rounded-2xl border border-alert-red/30 bg-alert-red/5 p-5 text-center">
          <h1 className="text-lg font-bold text-text-primary">Não foi possível carregar o plano.</h1>
          <p className="mt-2 text-sm text-text-secondary">Verifique o banco de dados e tente novamente.</p>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-electric-blue px-5 py-3 text-sm font-bold text-white">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const mission = data.mission?.slots?.[0];
  const overdue = data.reviews?.overdue?.length ?? 0;
  const today = data.reviews?.today?.length ?? 0;
  const pendingReviews = overdue + today;
  const weak = data.weakPoints?.[0];
  const readiness = data.stats?.readiness?.readiness_display ?? 0;

  return (
    <div className="min-h-screen bg-navy pb-12">
      <TopNav
        level={data.stats?.level}
        xp={data.stats?.xp}
        streak={data.stats?.streak}
      />

      <main className="mx-auto max-w-5xl px-4 pt-24 md:px-6">
        <section className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Plano de hoje</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary sm:text-3xl">Estude o que mais aumenta sua nota.</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            A prioridade considera peso da matéria, domínio, erros recorrentes, revisões vencidas e conteúdo ainda não estudado.
          </p>
        </section>

        <section className="rounded-3xl border border-electric-blue/25 bg-gradient-to-br from-navy-900 to-navy-800 p-5 sm:p-7">
          {mission ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-alert-red/25 bg-alert-red/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-alert-red">
                  Prioridade {mission.priority_score >= 8 ? "Alta" : "Média"}
                </span>
                <span className="rounded-full border border-gold-institution/25 bg-gold-institution/10 px-3 py-1 text-[11px] font-bold text-gold-institution">
                  {mission.discipline}
                </span>
              </div>
              <h2 className="mt-4 text-xl font-black leading-tight text-text-primary sm:text-2xl">{mission.title}</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
                <span>{data.mission.target_duration_minutes} min</span>
                <span>Domínio: {Math.round(mission.mastery_score ?? 0)}%</span>
              </div>
              <button
                onClick={() => router.push("/missoes")}
                className="mt-6 w-full rounded-2xl bg-electric-blue px-5 py-3.5 text-sm font-black text-white shadow-[0_8px_24px_rgba(0,180,255,0.18)] sm:w-auto"
              >
                Começar estudo
              </button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-black text-text-primary">Nenhuma missão calculada ainda.</h2>
              <p className="mt-2 text-sm text-text-secondary">Abra Missões para gerar o primeiro plano com base no edital e no seu desempenho.</p>
              <button onClick={() => router.push("/missoes")} className="mt-5 w-full rounded-2xl bg-electric-blue px-5 py-3.5 text-sm font-black text-white sm:w-auto">
                Gerar plano
              </button>
            </>
          )}
        </section>

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Prontidão" value={`${readiness}%`} detail="Indicador interno; depende de dados suficientes." />
          <StatCard label="Revisões" value={String(pendingReviews)} detail={overdue > 0 ? `${overdue} vencida(s)` : "Em dia"} />
          <StatCard label="Ponto crítico" value={weak ? `${Math.round(weak.progress?.mastery_score ?? 0)}%` : "—"} detail={weak?.title ?? "Dados insuficientes"} />
          <StatCard label="Peso máximo" value="50%" detail="Conhecimentos Profissionais" />
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <button onClick={() => router.push("/revisao")} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4 text-left transition hover:border-electric-blue/40">
            <p className="text-sm font-black text-text-primary">Revisão ativa</p>
            <p className="mt-1 text-xs text-text-secondary">Recupere antes de reler. Intervalos base: 24h, 7d e 30d.</p>
          </button>
          <button onClick={() => router.push("/questoes")} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4 text-left transition hover:border-electric-blue/40">
            <p className="text-sm font-black text-text-primary">Questões</p>
            <p className="mt-1 text-xs text-text-secondary">Priorize questões reais com fonte e gabarito oficial validado.</p>
          </button>
          <button onClick={() => router.push("/fontes")} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4 text-left transition hover:border-gold-institution/40">
            <p className="text-sm font-black text-text-primary">Adicionar fontes</p>
            <p className="mt-1 text-xs text-text-secondary">Envie provas, gabaritos, normas e legislação para classificação.</p>
          </button>
        </section>

        <section className="mt-6 rounded-2xl border border-graphite/40 bg-navy-900 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Estratégia do edital</p>
              <h2 className="mt-1 text-lg font-black text-text-primary">Distribuição de impacto na nota</h2>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {[{n:"Conhecimentos Profissionais",p:50},{n:"Língua Portuguesa",p:30},{n:"Matemática",p:20}].map((item) => (
              <div key={item.n}>
                <div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-semibold text-text-secondary">{item.n}</span><span className="font-black text-text-primary">{item.p}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-graphite/30"><div className="h-full rounded-full bg-electric-blue" style={{ width: `${item.p}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
