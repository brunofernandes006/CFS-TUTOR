"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";
import { ContentRow } from "@/components/streaming/ContentRow";
import { StudyContentCard } from "@/components/streaming/StudyContentCard";
import { SkeletonRow, SkeletonHero } from "@/components/streaming/Skeletons";
import { useReducedMotion } from "@/hooks/useReducedMotion";

const OFFICIAL_DETAILS = {
  total: 60,
  disciplines: [
    { name: "Português", count: 20, weight: 3 },
    { name: "Matemática e Raciocínio Lógico", count: 20, weight: 2 },
    { name: "Conhecimentos Profissionais", count: 20, weight: 5 },
  ],
  duration: "3h30",
};

const ADAPTIVE_OPTIONS = [10, 20, 30, 40, 60];

export default function SimuladosPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdaptive, setSelectedAdaptive] = useState(30);
  const [officialError, setOfficialError] = useState<string | null>(null);
  const [officialBusy, setOfficialBusy] = useState(false);
  const [adaptiveBusy, setAdaptiveBusy] = useState(false);
  const [availability, setAvailability] = useState<Record<string, number>>({
    "Língua Portuguesa": 0,
    "Matemática e Raciocínio Lógico": 0,
    "Conhecimentos Profissionais": 0,
  });

  useEffect(() => {
    fetch("/api/simulations")
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar histórico.");
        return r.json();
      })
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  const officialStatus = useMemo(() => {
    const total = Object.values(availability).reduce((s, v) => s + v, 0);
    return total === 0 ? "Banco insuficiente" : "Disponível";
  }, [availability]);

  async function handleCreateOfficial() {
    setOfficialBusy(true);
    setOfficialError(null);
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "OFICIAL" }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "SIMULATION_INSUFFICIENT_QUESTIONS") {
          setAvailability({
            "Língua Portuguesa": data.available?.["Língua Portuguesa"] ?? 0,
            "Matemática e Raciocínio Lógico": data.available?.["Matemática e Raciocínio Lógico"] ?? 0,
            "Conhecimentos Profissionais": data.available?.["Conhecimentos Profissionais"] ?? 0,
          });
          setOfficialError("Banco insuficiente para gerar um simulado oficial. O banco possui apenas 1 questão ativa.");
          return;
        }
        setOfficialError(data?.error || "Não foi possível criar o simulado oficial.");
        return;
      }
      router.push(`/simulados/${data.simulation_id}`);
    } finally {
      setOfficialBusy(false);
    }
  }

  async function handleCreateAdaptive() {
    setAdaptiveBusy(true);
    try {
      const res = await fetch("/api/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "ADAPTATIVO", target_questions: selectedAdaptive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setOfficialError(data?.error || "Não foi possível criar o simulado adaptativo.");
        return;
      }
      router.push(`/simulados/${data.simulation_id}`);
    } finally {
      setAdaptiveBusy(false);
    }
  }

  return (
    <div className="min-h-screen">
      <TopNav onSearch={() => {}} />

      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-900/20" />
        <div className="relative z-10 max-w-7xl mx-auto animate-fade-in-up">
          <p className="text-xs font-bold uppercase tracking-widest text-electric-blue mb-2">
            Simulados
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary mb-2">
            🏅 OPERAÇÕES DE TREINAMENTO
          </h1>
          <p className="text-sm text-text-secondary max-w-xl">
            Simulados oficiais e adaptativos para medir seu desempenho real.
          </p>
        </div>
      </section>

      <div className="px-4 md:px-6 max-w-7xl mx-auto pb-10 space-y-10 -mt-8 relative z-10">
        {/* Official operation */}
        <StudyContentCard
          variant="simulation"
          title="Operação Oficial"
          subtitle={`60 questões · ${OFFICIAL_DETAILS.duration} · Pesos oficiais (3/2/5)`}
          icon="🏅"
          badge={officialStatus}
          badgeColor={officialStatus === "Disponível" ? "green" : "red"}
          onClick={handleCreateOfficial}
          onAction={handleCreateOfficial}
          actionLabel={officialBusy ? "Gerando..." : "Iniciar Operação Oficial"}
          animate={!reducedMotion}
        />

        {/* Adaptive operation */}
        <div className="relative">
          <StudyContentCard
            variant="simulation"
            title="Operação Adaptativa"
            subtitle={`Personalizada · Prioriza pontos fracos e revisões`}
            icon="🎯"
            badge="Personalizado"
            badgeColor="blue"
            onClick={handleCreateAdaptive}
            onAction={handleCreateAdaptive}
            actionLabel={adaptiveBusy ? "Gerando..." : "Iniciar Operação Adaptativa"}
            animate={!reducedMotion}
          />
          {/* Quantity selector overlay */}
          <div className="absolute top-4 right-4 z-20">
            <select
              value={selectedAdaptive}
              onChange={(e) => setSelectedAdaptive(Number(e.target.value))}
              className="px-2 py-1 rounded-lg text-[10px] font-bold bg-navy-800 text-text-secondary border border-graphite/50 focus:outline-none focus:border-electric-blue"
              onClick={(e) => e.stopPropagation()}
            >
              {ADAPTIVE_OPTIONS.map((o) => (
                <option key={o} value={o}>{o} questões</option>
              ))}
            </select>
          </div>
        </div>

        {/* Insufficient bank warning */}
        {officialError && (
          <div className="rounded-xl border border-alert-red/30 bg-alert-red/5 p-4 animate-fade-in">
            <p className="text-sm font-bold text-alert-red mb-1">⚠️ {officialError}</p>
            <p className="text-xs text-text-muted">
              O banco atual possui apenas 1 questão ativa. Adicione mais questões para usar os simulados.
            </p>
          </div>
        )}

        {/* Availability */}
        <div className="rounded-xl border border-graphite/30 bg-navy-900 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-3">Disponibilidade por disciplina</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {Object.entries(availability).map(([disc, count]) => (
              <div key={disc} className="flex items-center justify-between px-3 py-2 rounded-lg bg-navy-800 border border-graphite/30">
                <span className="text-xs text-text-secondary">{disc}</span>
                <span className={`text-sm font-bold ${count > 0 ? "text-success-green" : "text-alert-red"}`}>{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* History */}
        {loading ? (
          <SkeletonRow />
        ) : history.length === 0 ? (
          <EmptyState message="Você ainda não concluiu nenhuma Operação." />
        ) : (
          <ContentRow title="📊 HISTÓRICO DE OPERAÇÕES" animate={!reducedMotion}>
            {history.map((item) => (
              <StudyContentCard
                key={item.id}
                variant="simulation"
                title={`${item.simulation_type} — ${new Date(item.created_at).toLocaleDateString("pt-BR")}`}
                subtitle={`${item.target_questions} questões · Nota: ${item.weighted_final_score ?? 0}`}
                badge={item.minimums_met ? "MÍNIMOS" : undefined}
                badgeColor={item.minimums_met ? "green" : "red"}
                onClick={() => router.push(`/simulados/${item.id}`)}
                animate={!reducedMotion}
              />
            ))}
          </ContentRow>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-16">
      <div className="text-4xl mb-4">🏅</div>
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
