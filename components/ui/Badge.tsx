import React from "react";
import type { QuestionOrigin, MasteryLevel } from "@/lib/types";

export function OriginBadge({ origin }: { origin: QuestionOrigin }) {
  const styles: Record<QuestionOrigin, { bg: string; color: string }> = {
    OFICIAL:  { bg: "rgba(201,168,76,0.15)", color: "var(--gold)" },
    INEDITA:  { bg: "rgba(34,197,94,0.12)",  color: "#4ade80" },
    DIDATICA: { bg: "rgba(96,165,250,0.12)",  color: "#60a5fa" },
  };
  const labels: Record<QuestionOrigin, string> = {
    OFICIAL:  "OFICIAL",
    INEDITA:  "INÉDITA",
    DIDATICA: "DIDÁTICA",
  };
  const s = styles[origin];
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.color, letterSpacing: "0.05em" }}
    >
      {labels[origin]}
    </span>
  );
}

export function MasteryBadge({ level }: { level: MasteryLevel }) {
  const styles: Record<MasteryLevel, { bg: string; color: string }> = {
    "CRÍTICO":          { bg: "rgba(239,68,68,0.15)",   color: "#f87171" },
    "FRACO":            { bg: "rgba(251,146,60,0.15)",  color: "#fb923c" },
    "EM_DESENVOLVIMENTO":{ bg: "rgba(250,204,21,0.12)", color: "#fbbf24" },
    "BOM":              { bg: "rgba(34,197,94,0.12)",   color: "#4ade80" },
    "DOMINADO":         { bg: "rgba(201,168,76,0.15)",  color: "var(--gold)" },
  };
  const labels: Record<MasteryLevel, string> = {
    "CRÍTICO": "CRÍTICO",
    "FRACO": "FRACO",
    "EM_DESENVOLVIMENTO": "EM DESENVOLVIMENTO",
    "BOM": "BOM",
    "DOMINADO": "DOMINADO",
  };
  const s = styles[level];
  return (
    <span
      className="text-xs font-semibold px-2 py-0.5 rounded"
      style={{ background: s.bg, color: s.color }}
    >
      {labels[level]}
    </span>
  );
}

export function DisciplineBadge({ discipline }: { discipline: string }) {
  const colors: Record<string, string> = {
    "Língua Portuguesa": "#60a5fa",
    "Matemática e Raciocínio Lógico": "#f472b6",
    "Conhecimentos Profissionais": "var(--gold)",
  };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded"
      style={{
        background: "var(--navy-3)",
        color: colors[discipline] ?? "var(--text)",
        fontWeight: 500,
      }}
    >
      {discipline}
    </span>
  );
}

export function CFS26Badge() {
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded"
      style={{ background: "rgba(201,168,76,0.15)", color: "var(--gold)", letterSpacing: "0.05em" }}
    >
      CFS/26
    </span>
  );
}
