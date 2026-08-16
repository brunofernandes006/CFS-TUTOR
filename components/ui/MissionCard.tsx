import React from "react";
import { TacticalCard } from "./TacticalCard";
import { TacticalButton } from "./TacticalButton";

interface MissionCardProps {
  step: number;
  totalSteps: number;
  title: string;
  discipline: string;
  duration: string;
  theme: string;
  mastery: number;
  priority: "alta" | "média" | "baixa";
  onContinue: () => void;
  onSkip?: () => void;
  className?: string;
}

const priorityColor = {
  alta: "text-alert-red",
  média: "text-warning-gold",
  baixa: "text-success-green",
};

export function MissionCard({
  step,
  totalSteps,
  title,
  discipline,
  duration,
  theme,
  mastery,
  priority,
  onContinue,
  onSkip,
  className = "",
}: MissionCardProps) {
  return (
    <TacticalCard
      title={title}
      bordered
      className={className}
    >
      {/* Step indicator */}
      <div className="mb-4 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-electric-blue" />
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Etapa {step} de {totalSteps}
        </span>
      </div>

      {/* Details grid */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Disciplina
          </span>
          <div className="mt-1 text-sm font-semibold text-electric-blue">
            {discipline}
          </div>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Duração
          </span>
          <div className="mt-1 text-sm font-semibold text-text-primary">
            {duration}
          </div>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Tema
          </span>
          <div className="mt-1 text-sm text-text-primary">{theme}</div>
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
            Domínio
          </span>
          <div className="mt-1 text-sm font-semibold">{mastery}%</div>
        </div>
      </div>

      {/* Priority badge */}
      <div className="mb-6 flex items-center gap-2">
        <span className="text-xs font-bold uppercase tracking-widest text-text-muted">
          Prioridade:
        </span>
        <span className={`font-bold uppercase ${priorityColor[priority]}`}>
          {priority}
        </span>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <TacticalButton
          variant="primary"
          size="medium"
          onClick={onContinue}
          className="flex-1"
        >
          Continuar Missão
        </TacticalButton>
        {onSkip && (
          <TacticalButton
            variant="secondary"
            size="medium"
            onClick={onSkip}
            className="flex-1"
          >
            Pular
          </TacticalButton>
        )}
      </div>
    </TacticalCard>
  );
}
