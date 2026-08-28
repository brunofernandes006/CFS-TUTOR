"use client";

import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";
import { useHomeData } from "@/hooks/useHomeData";

function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-graphite/40 bg-navy-900 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-text-primary">{value}</p>
      {detail && <p className="mt-1 line-clamp-2 text-xs text-text-secondary">{detail}</p>}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { data, loading, error } = useHomeData();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy px-4 pt-24">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="skeleton h-52" />
          <div className="grid grid-cols-2 gap-3"><div className="skeleton h-28" /><div className="skeleton h-28" /></div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-navy px-4 pt-24">
        <TopNav />
        <div className="mx-auto max-w-lg rounded-2xl border border-alert-red/30 bg-alert-red/5 p-5 text-center">
          <h1 className="text-lg font-bold text-text-primary">Não foi possível carregar o plano.</h1>
          <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-electric-blue px-5 py-3 text-sm font-bold text-white">Tentar novamente</button>
        </div>
      </div>
    );
  }

  const mission = data.mission.slots[0];
  const weak = data.weakPoint;

  return (
    <div className="min-h-screen bg-navy pb-12">
      <TopNav />
      <main className="mx-auto max-w-5xl px-4 pt-24 md:px-6">
        <section className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Plano de hoje</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary sm:text-3xl">Estude o que mais aumenta sua nota.</h1>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">Peso da matéria, incidência real, evidência de domínio, erros recorrentes e revisões definem a prioridade.</p>
        </section>

        <section className="rounded-3xl border border-electric-blue/25 bg-gradient-to-br from-navy-900 to-navy-800 p-5 sm:p-7">
          {mission ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-alert-red/25 bg-alert-red/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-alert-red">Prioridade {mission.priorityLevel}</span>
                <span className="rounded-full border border-gold-institution/25 bg-gold-institution/10 px-3 py-1 text-[11px] font-bold text-gold-institution">{mission.discipline}</span>
              </div>
              <h2 className="mt-4 text-xl font-black leading-tight text-text-primary sm:text-2xl">{mission.title}</h2>
              <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-secondary">
                <span>{mission.minutes} min</span>
                <span>Domínio: {mission.mastery == null ? "dados insuficientes" : `${Math.round(mission.mastery)}%`}</span>
              </div>
              <p className="mt-3 text-xs text-text-muted">{mission.reason.slice(0, 2).join(" ")}</p>
              <button onClick={() => router.push("/estudar")} className="mt-6 w-full rounded-2xl bg-electric-blue px-5 py-3.5 text-sm font-black text-white sm:w-auto">Começar estudo</button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-black text-text-primary">Base de estudo ainda não carregada.</h2>
              <p className="mt-2 text-sm text-text-secondary">Envie e valide o edital para criar a árvore de conteúdos e liberar o plano adaptativo.</p>
              <button onClick={() => router.push("/fontes")} className="mt-5 w-full rounded-2xl bg-electric-blue px-5 py-3.5 text-sm font-black text-white sm:w-auto">Adicionar fontes</button>
            </>
          )}
        </section>

        {data.setupRequired && (
          <section className="mt-4 rounded-2xl border border-warning-gold/30 bg-warning-gold/5 p-4">
            <p className="text-sm font-black text-text-primary">Configuração inicial necessária</p>
            <p className="mt-1 text-xs text-text-secondary">O PostgreSQL está vazio ou o ambiente ainda não foi configurado. O sistema não inventará métricas enquanto não houver dados reais.</p>
          </section>
        )}

        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Prontidão" value={data.stats.readiness == null ? "—" : `${data.stats.readiness}%`} detail={data.stats.evidenceSufficient ? "Evidência suficiente" : "Dados insuficientes"} />
          <StatCard label="Revisões" value={String(data.stats.pendingReviews)} detail="Pendentes agora" />
          <StatCard label="Questões" value={String(data.stats.questionsAnswered)} detail={data.stats.accuracy == null ? "Sem histórico" : `${data.stats.accuracy}% de acertos`} />
          <StatCard label="Ponto crítico" value={weak ? `${Math.round(weak.mastery)}%` : "—"} detail={weak?.title ?? "Dados insuficientes"} />
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          <button onClick={() => router.push("/revisao")} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4 text-left"><p className="text-sm font-black text-text-primary">Revisão ativa</p><p className="mt-1 text-xs text-text-secondary">24h, 7d e 30d, ajustados pelos erros e retenção.</p></button>
          <button onClick={() => router.push("/questoes")} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4 text-left"><p className="text-sm font-black text-text-primary">Questões</p><p className="mt-1 text-xs text-text-secondary">Questões reais somente com fonte e gabarito oficial validados.</p></button>
          <button onClick={() => router.push("/fontes")} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4 text-left"><p className="text-sm font-black text-text-primary">Central de Fontes</p><p className="mt-1 text-xs text-text-secondary">Provas, gabaritos, normas, legislação e edital.</p></button>
        </section>

        <section className="mt-6 rounded-2xl border border-graphite/40 bg-navy-900 p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Estratégia do edital</p>
          <h2 className="mt-1 text-lg font-black text-text-primary">Impacto ponderado na nota</h2>
          <div className="mt-4 space-y-3">
            {data.disciplineWeights.map((item) => (
              <div key={item.name}>
                <div className="mb-1 flex justify-between gap-3 text-xs"><span className="font-semibold text-text-secondary">{item.name}</span><span className="font-black text-text-primary">{item.share}%</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-graphite/30"><div className="h-full rounded-full bg-electric-blue" style={{ width: `${item.share}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
