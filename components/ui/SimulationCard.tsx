import React from "react";
import { TacticalCard } from "./TacticalCard";
import { TacticalButton } from "./TacticalButton";

interface SimulationCardProps {
  type: "OFICIAL" | "ADAPTATIVO";
  available: boolean;
  duration?: string;
  questions?: number;
  nextAvailableAt?: string | null;
  lastScore?: number | null;
  lastDate?: string | null;
  onClick: () => void;
  className?: string;
}

export function SimulationCard({
  type,
  available,
  duration,
  questions,
  nextAvailableAt,
  lastScore,
  lastDate,
  onClick,
  className = "",
}: SimulationCardProps) {
  const typeLabel = type === "OFICIAL" ? "OPERAÇÃO OFICIAL" : "OPERAÇÃO ADAPTATIVA";
  const color = type === "OFICIAL" ? "text-gold-institution" : "text-electric-blue";

  return (
    <TacticalCard bordered className={className}>
      <div className="mb-4">
        <h3 className={`text-base font-bold uppercase tracking-widest ${color}`}>
          {typeLabel}
        </h3>
      </div>

      {available ? (
        <>
          <div className="mb-4 space-y-2 text-sm">
            {duration && (
              <div className="flex justify-between">
                <span className="text-text-muted">Duração</span>
                <span className="font-semibold text-text-primary">{duration}</span>
              </div>
            )}
            {questions && (
              <div className="flex justify-between">
                <span className="text-text-muted">Questões</span>
                <span className="font-semibold text-text-primary">{questions}</span>
              </div>
            )}
            {lastScore !== undefined && lastScore !== null && (
              <div className="flex justify-between">
                <span className="text-text-muted">Última nota</span>
                <span className="font-semibold text-success-green">{lastScore.toFixed(1)}</span>
              </div>
            )}
            {lastDate && (
              <div className="flex justify-between">
                <span className="text-text-muted">Última operação</span>
                <span className="text-xs text-text-secondary">{lastDate}</span>
              </div>
            )}
          </div>
          <TacticalButton
            variant="primary"
            size="medium"
            onClick={onClick}
            className="w-full"
          >
            Iniciar {type === "OFICIAL" ? "Operação" : "Treino"}
          </TacticalButton>
        </>
      ) : (
        <div className="rounded border border-warning-gold/50 bg-warning-gold/10 px-3 py-3">
          <p className="text-sm font-semibold text-warning-gold">
            Próxima disponível em:
          </p>
          <p className="mt-1 text-xs text-text-secondary">{nextAvailableAt}</p>
        </div>
      )}
    </TacticalCard>
  );
}
