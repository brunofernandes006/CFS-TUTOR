"use client";

import { useEffect, useState } from "react";
import { SectionHeader, TacticalPanel, MetricCard, ProgressBar, LoadingState, AlertPanel, DisciplineBadge } from "@/components/ui";

interface PerfData {
  readiness: number;
  accuracy: number;
  questions_answered: number;
  edital_coverage: number;
  discipline_stats: Array<{ discipline: string; weight: number; mastery: number; mastery_level: string; items_studied: number }>;
  critical_items: Array<{ title: string; discipline: string; mastery_score: number }>;
  dominated_items: Array<{ title: string; discipline: string; mastery_score: number }>;
  evolution: Array<{ day: string; answered: number; correct: number }>;
}

export default function DesempenhoPage() {
  const [data, setData] = useState<PerfData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/performance")
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar desempenho.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Calculando Prontidão..." />;
  if (error) return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader title="📊 Desempenho" />
      <AlertPanel type="error" title="Erro ao carregar" message={error} />
    </div>
  );
  if (!data) return null;

  return (
    <div className="space-y-6 max-w-4xl">
      <SectionHeader
        title="Desempenho"
        subtitle="Indicadores internos de preparação para o CFS"
      />

      {/* Prontidão */}
      <TacticalPanel title="Prontidão CFS — Indicador interno de preparação">
        <div className="flex items-end gap-4 mb-2">
          <div className={`text-5xl font-bold ${readinessColor(data.readiness)}`}>
            {data.readiness}%
          </div>
          <p className="text-xs mb-1 max-w-xs leading-relaxed text-text-muted">
            Este indicador reflete o progresso interno de estudo. Não representa probabilidade real de aprovação.
          </p>
        </div>
        <ProgressBar value={data.readiness} color={readinessColorVar(data.readiness)} height={10} />
      </TacticalPanel>

      {/* Totais */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Questões respondidas", value: data.questions_answered },
          { label: "Taxa de acerto", value: `${data.accuracy}%` },
          { label: "Cobertura do edital", value: `${data.edital_coverage}%` },
        ].map((s) => (
          <MetricCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      {/* Por disciplina */}
      <TacticalPanel title="Domínio por Disciplina">
        <div className="space-y-5">
          {data.discipline_stats.map((d) => (
            <div key={d.discipline}>
              <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <DisciplineBadge discipline={d.discipline} />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Peso {d.weight}</span>
                  <MasteryBadge level={d.mastery_level} mastery={d.mastery} />
                </div>
              </div>
              <ProgressBar value={d.mastery} color={masteryColorVar(d.mastery)} showLabel label={`${d.mastery}% domínio`} />
            </div>
          ))}
        </div>
      </TacticalPanel>

      {/* Itens críticos */}
      {data.critical_items.length > 0 && (
        <TacticalPanel title="Itens Críticos (domínio < 40%)">
          <div className="space-y-2">
            {data.critical_items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1 border-b border-graphite last:border-0">
                <div>
                  <div className="text-sm">{item.title}</div>
                  <DisciplineBadge discipline={item.discipline} />
                </div>
                <span className="font-bold text-sm text-alert-red">{item.mastery_score}%</span>
              </div>
            ))}
          </div>
        </TacticalPanel>
      )}

      {/* Itens dominados */}
      {data.dominated_items.length > 0 && (
        <TacticalPanel title="Itens Dominados (domínio ≥ 90%)">
          <div className="space-y-2">
            {data.dominated_items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-1 border-b border-graphite last:border-0">
                <div>
                  <div className="text-sm">{item.title}</div>
                  <DisciplineBadge discipline={item.discipline} />
                </div>
                <span className="font-bold text-sm text-gold-institution">{item.mastery_score}%</span>
              </div>
            ))}
          </div>
        </TacticalPanel>
      )}

      {/* Evolução recente */}
      {data.evolution.length > 0 && (
        <TacticalPanel title="Atividade Recente (30 dias)">
          <div className="space-y-1">
            {data.evolution.map((day) => {
              const acc = day.answered > 0 ? Math.round((day.correct / day.answered) * 100) : 0;
              return (
                <div key={day.day} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-xs text-text-muted">
                    {new Date(day.day + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                  </span>
                  <ProgressBar value={acc} height={6} />
                  <span className="text-xs w-16 shrink-0 text-right text-text-muted">
                    {day.answered}q · {acc}%
                  </span>
                </div>
              );
            })}
          </div>
        </TacticalPanel>
      )}
    </div>
  );
}

function readinessColor(r: number) {
  if (r >= 75) return "text-success-green";
  if (r >= 50) return "text-gold-institution";
  return "text-alert-red";
}

function readinessColorVar(r: number) {
  if (r >= 75) return "var(--success)";
  if (r >= 50) return "var(--gold)";
  return "var(--danger)";
}

function masteryColorVar(m: number) {
  if (m >= 90) return "var(--gold)";
  if (m >= 75) return "var(--success)";
  if (m >= 60) return "#fbbf24";
  if (m >= 40) return "#fb923c";
  return "var(--danger)";
}

const MASTERY_LEVELS: Record<string, { label: string; className: string }> = {
  dominated: { label: "Dominado", className: "bg-gold-institution/20 border border-gold-institution text-gold-institution" },
  proficient: { label: "Proficiente", className: "bg-success-green/20 border border-success-green text-success-green" },
  developing: { label: "Em desenvolvimento", className: "bg-warning-gold/20 border border-warning-gold text-warning-gold" },
  novice: { label: "Iniciante", className: "bg-alert-red/20 border border-alert-red text-alert-red" },
};

function MasteryBadge({ level, mastery }: { level: string; mastery: number }) {
  const config = MASTERY_LEVELS[level] ?? { label: level, className: "bg-navy-800 border border-graphite text-text-muted" };
  return (
    <span className={`inline-block rounded-md px-2 py-1 text-xs font-bold ${config.className}`}>
      {config.label}
    </span>
  );
}
