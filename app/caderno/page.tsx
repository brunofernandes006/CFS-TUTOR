"use client";

import { useEffect, useState } from "react";
import {
  SectionHeader,
  TacticalCard,
  TacticalButton,
  DisciplineBadge,
  SourceBadge,
  LoadingState,
  AlertPanel,
} from "@/components/ui";

interface ErrorEntry {
  id: number;
  question_id: number;
  chosen_option_index: number | null;
  correct_option_index: number | null;
  theme: string | null;
  subtheme: string | null;
  error_count: number;
  confusion_type: string | null;
  last_error_at: string;
  created_at: string;
  statement: string;
  discipline: string;
  origin: string;
  difficulty: number;
  options: Array<{ option_index: number; option_text: string; is_correct: number }>;
}

export default function CadernoPage() {
  const [entries, setEntries] = useState<ErrorEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [filterDisc, setFilterDisc] = useState("");

  useEffect(() => {
    setLoading(true);
    setError(null);
    const qs = filterDisc ? `?discipline=${encodeURIComponent(filterDisc)}` : "";
    fetch(`/api/error-notebook${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar caderno de erros.");
        return r.json();
      })
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [filterDisc]);

  const toggle = (id: number) =>
    setExpanded((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  if (loading) return <LoadingState message="Carregando caderno de erros..." />;
  if (error) return (
    <div className="space-y-6">
      <SectionHeader title="📝 Caderno de Erros" />
      <AlertPanel type="error" title="Erro ao carregar" message={error} />
    </div>
  );

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="📝 Caderno de Erros"
        subtitle={`${entries.length} erro${entries.length !== 1 ? "s" : ""} registrado${entries.length !== 1 ? "s" : ""}`}
      />

      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Filtro disciplina */}
        <div className="flex flex-wrap gap-2">
          {["", "Língua Portuguesa", "Matemática e Raciocínio Lógico", "Conhecimentos Profissionais"].map((d) => (
            <TacticalButton
              key={d}
              variant={filterDisc === d ? "primary" : "secondary"}
              size="small"
              onClick={() => setFilterDisc(d)}
            >
              {d || "Todas"}
            </TacticalButton>
          ))}
        </div>

        {entries.length === 0 ? (
          <AlertPanel
            type="success"
            title="Nenhum erro"
            message="Parabéns! Nenhum erro registrado ainda. Continue respondendo questões para aprender."
          />
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => {
              const isOpen = expanded.has(entry.id);
              const chosenOpt = entry.options.find((o) => o.option_index === entry.chosen_option_index);
              const correctOpt = entry.options.find((o) => o.is_correct === 1);
              
              return (
                <TacticalCard
                  key={entry.id}
                  bordered
                  alert={entry.error_count >= 3 ? "error" : entry.error_count >= 2 ? "warning" : undefined}
                >
                  <button
                    className="w-full text-left flex items-start justify-between gap-4"
                    onClick={() => toggle(entry.id)}
                  >
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2 mb-3">
                        <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-navy-900 text-electric-blue border border-electric-blue">
                          {entry.origin === "OFICIAL" ? "OFICIAL" : entry.origin === "INÉDITA" ? "INÉDITA" : "DIDÁTICA"}
                        </span>
                        <DisciplineBadge 
                          discipline={entry.discipline as any} 
                          size="small" 
                        />
                        {entry.theme && (
                          <span className="text-xs px-2 py-0.5 rounded bg-navy-900 text-electric-blue border border-electric-blue font-bold uppercase">
                            {entry.theme}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2 text-text-primary mb-2">{entry.statement}</p>
                      <div className="flex gap-4 text-xs text-text-muted">
                        <span>📅 {new Date(entry.last_error_at).toLocaleDateString("pt-BR")}</span>
                        <span>⚙️ Nível {entry.difficulty}/5</span>
                        {entry.confusion_type && <span>🎯 {entry.confusion_type}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className={`text-2xl font-bold ${entry.error_count >= 3 ? "text-alert-red" : entry.error_count >= 2 ? "text-warning-gold" : "text-electric-blue"}`}>
                        {entry.error_count}×
                      </div>
                      <p className="text-xs text-text-muted mt-1">erros</p>
                      <span className="text-xs mt-2 inline-block">{isOpen ? "▼" : "▶"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-graphite space-y-3">
                      <p className="text-sm text-text-primary leading-relaxed">{entry.statement}</p>
                      <div className="space-y-2">
                        {entry.options.map((opt) => {
                          const isChosen = opt.option_index === entry.chosen_option_index;
                          const isCorrect = opt.is_correct === 1;
                          
                          let borderColor = "border-graphite";
                          let bgColor = "bg-navy-800";
                          let textColor = "text-text-primary";
                          
                          if (isCorrect) {
                            borderColor = "border-l-4 border-success-green";
                            bgColor = "bg-navy-900";
                            textColor = "text-success-green";
                          } else if (isChosen) {
                            borderColor = "border-l-4 border-alert-red";
                            bgColor = "bg-navy-900";
                            textColor = "text-alert-red";
                          }
                          
                          return (
                            <div
                              key={opt.option_index}
                              className={`text-sm px-4 py-2 rounded border ${borderColor} ${bgColor} ${textColor} font-semibold`}
                            >
                              <span className="mr-2 font-bold text-text-muted">{String.fromCharCode(65 + opt.option_index)})</span>
                              {opt.option_text}
                              {isChosen && !isCorrect && <span className="ml-2 text-xs">(sua resposta) ✕</span>}
                              {isCorrect && <span className="ml-2 text-xs">(gabarito) ✓</span>}
                            </div>
                          );
                        })}
                      </div>
                      <TacticalButton variant="secondary" size="medium" className="w-full mt-3">
                        Revisar
                      </TacticalButton>
                    </div>
                  )}
                </TacticalCard>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
