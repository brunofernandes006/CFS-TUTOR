"use client";

import { useEffect, useState } from "react";
import {
  SectionHeader,
  TacticalCard,
  TacticalPanel,
  TacticalButton,
  DisciplineBadge,
  StatusBadge,
  LoadingState,
  AlertPanel,
} from "@/components/ui";
import type { DailyMission, MissionSlotType } from "@/lib/types";

const SLOT_LABELS: Record<MissionSlotType, { label: string; icon: string; color: string }> = {
  RECICLAGEM:   { label: "Reciclagem",  icon: "🔄", color: "#60a5fa" },
  FRACO:        { label: "Conteúdo",    icon: "📖", color: "#fb923c" },
  NOVO:         { label: "Treinamento", icon: "✏️",  color: "var(--gold)" },
  CONSOLIDACAO: { label: "Fechamento",  icon: "🏁", color: "var(--success)" },
};

export default function MissoesPage() {
  const [mission, setMission] = useState<DailyMission | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/mission")
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar missão.");
        return r.json();
      })
      .then(setMission)
      .catch(() => setError("Erro ao carregar missão."));
  }, []);

  if (error) return (
    <div className="space-y-6">
      <SectionHeader title="🎯 Operações" />
      <AlertPanel
        type="error"
        title="Erro ao carregar"
        message="Não conseguimos gerar seu plano de operações. Tente novamente em alguns momentos."
      />
    </div>
  );
  if (!mission) return <LoadingState message="Gerando Plano de Operações..." />;

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="🎯 Operações do Dia"
        subtitle={`${formatDate(mission.mission_date)} · ${mission.target_duration_minutes}min · ${mission.total_items} etapa${mission.total_items !== 1 ? "s" : ""}`}
      />

      <div className="max-w-4xl mx-auto w-full space-y-4">
        {mission.slots.length === 0 ? (
          <AlertPanel
            type="info"
            title="Nenhuma operação"
            message="Não há itens de estudo disponíveis para hoje. Explore o edital na tela Estudar ou crie seus próprios pontos de prática."
          />
        ) : (
          mission.slots.map((slot, i) => {
            const meta = SLOT_LABELS[slot.mission_type];
            const priorityColor = slot.priority_score >= 8 ? "high" : slot.priority_score >= 5 ? "medium" : "low";
            const priorityLabel = priorityColor === "high" ? "Alta" : priorityColor === "medium" ? "Média" : "Baixa";
            
            return (
              <TacticalCard key={i} bordered>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1">
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-navy-800 border border-graphite shrink-0">
                      {meta.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-gold-institution">
                          {meta.label}
                        </span>
                        <span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-navy-900 text-text-muted border border-graphite">
                          ⏱️ {slot.time_allocated_minutes}min
                        </span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                          priorityColor === "high" 
                            ? "bg-alert-red/10 text-alert-red border-alert-red" 
                            : priorityColor === "medium"
                            ? "bg-warning-gold/10 text-warning-gold border-warning-gold"
                            : "bg-success-green/10 text-success-green border-success-green"
                        }`}>
                          {priorityLabel}
                        </span>
                      </div>
                      <p className="text-lg font-bold text-cyan-glow mb-3">{slot.title}</p>
                      <div className="flex items-center gap-3 flex-wrap text-xs text-text-secondary">
                        <span>
                          <DisciplineBadge discipline={slot.discipline as any} size="small" />
                        </span>
                        <span>Motivo: <span className="text-text-primary font-semibold">{slot.reason}</span></span>
                        <span>Domínio: <span className="text-electric-blue font-semibold">{Math.round((slot.mastery_score ?? 0) * 100)}%</span></span>
                      </div>
                    </div>
                  </div>
                  <TacticalButton
                    variant="primary"
                    size="medium"
                    className="shrink-0"
                  >
                    Iniciar
                  </TacticalButton>
                </div>
              </TacticalCard>
            );
          })
        )}
      </div>

      {/* Info panel */}
      <TacticalPanel title="📖 Tipos de Etapas">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(SLOT_LABELS).map(([key, meta]) => (
            <div key={key} className="flex gap-3 px-3 py-2 rounded bg-navy-800 border border-graphite">
              <span className="text-2xl">{meta.icon}</span>
              <div>
                <p className="text-sm font-bold text-gold-institution">{meta.label}</p>
                <p className="text-xs text-text-secondary mt-1">{slotDesc(key as MissionSlotType)}</p>
              </div>
            </div>
          ))}
        </div>
      </TacticalPanel>
    </div>
  );
}

function slotDesc(type: MissionSlotType): string {
  const map: Record<MissionSlotType, string> = {
    RECICLAGEM:   "Revisões vencidas · 10 min",
    FRACO:        "Pontos fracos · 15 min",
    NOVO:         "Conteúdo novo · 15 min",
    CONSOLIDACAO: "Consolidação · 5 min",
  };
  return map[type];
}

function formatDate(iso: string): string {
  return new Date(iso + "T12:00:00").toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "long",
  });
}
