"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/Card";

type ResultPayload = {
  simulation_id: number;
  simulation_type: string;
  total_questions: number;
  answered: number;
  correct: number;
  wrong: number;
  accuracy_pct: number;
  discipline_scores: Array<{ discipline: string; correct: number; total: number; score: number; minimum_met: boolean }>;
  weighted_final_score: number;
  minimums_met: boolean;
  elapsed_seconds: number;
  errors: Array<{ question_id: number; discipline: string; selected_option_index: number; correct_option_index: number }>;
  by_syllabus_item: Array<{ syllabus_item_id: number; title: string; correct: number; total: number }>;
};

export default function SimulationResultPage() {
  const params = useParams<{ id: string }>();
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    const run = async () => {
      try {
        const res = await fetch(`/api/simulations/${params.id}/finish`, { method: "POST" });
        if (!res.ok) {
          setLoading(false);
          return;
        }
        const data = await res.json();
        if (data) setResult(data);
      } catch {
        // network error — show unavailable state
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [params?.id]);

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--muted)" }}>Carregando resultado...</div>;
  if (!result) return <div className="p-6 text-sm" style={{ color: "var(--danger)" }}>Resultado indisponível.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Operação</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--gold)" }}>RESULTADO DA OPERAÇÃO</h1>
        </div>
        <div className="rounded-lg border px-4 py-2" style={{ background: "var(--navy-2)", borderColor: "var(--border)" }}>
          <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>XP recebido</div>
          <div className="text-lg font-bold" style={{ color: "var(--gold)" }}>+100 XP</div>
        </div>
      </div>

      <Card className="p-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Metric label="Total" value={`${result.total_questions}`} />
          <Metric label="Acertos" value={`${result.correct}`} />
          <Metric label="Erros" value={`${result.wrong}`} />
          <Metric label="Percentual" value={`${result.accuracy_pct}%`} />
          <Metric label="Duração" value={formatDuration(result.elapsed_seconds)} />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--gold)" }}>Desempenho por disciplina</h2>
        <div className="space-y-4">
          {result.discipline_scores.map((score) => (
            <div key={score.discipline} className="rounded border p-3" style={{ background: "var(--navy)", borderColor: "var(--border)" }}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold">{score.discipline}</span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>{score.minimum_met ? "Mínimo atingido" : "Mínimo não atingido"}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm" style={{ color: "var(--text)" }}>
                <div><span style={{ color: "var(--muted)" }}>Acertos</span><div>{score.correct} / {score.total}</div></div>
                <div><span style={{ color: "var(--muted)" }}>Nota</span><div>{score.score.toFixed(1)}</div></div>
                <div><span style={{ color: "var(--muted)" }}>Mínimo</span><div>{score.minimum_met ? "Sim" : "Não"}</div></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Critério objetivo do simulado</div>
            <h3 className="text-2xl font-bold" style={{ color: "var(--gold)" }}>
              {result.minimums_met ? "Mínimos atingidos" : "Mínimos não atingidos"}
            </h3>
          </div>
          <div className="text-3xl font-black" style={{ color: "var(--gold)" }}>{result.weighted_final_score.toFixed(1)}</div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-bold mb-3" style={{ color: "var(--gold)" }}>Revisar erros</h2>
        {result.errors.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>Sem erros para revisar.</div>
        ) : (
          <div className="space-y-3">
            {result.errors.map((err) => (
              <div key={`${err.question_id}-${err.selected_option_index}`} className="rounded border p-3" style={{ borderColor: "var(--border)", background: "var(--navy)" }}>
                <div className="font-semibold mb-1">Questão {err.question_id}</div>
                <div className="text-sm" style={{ color: "var(--muted)" }}>Resposta escolhida: {String.fromCharCode(65 + err.selected_option_index)} · correta: {String.fromCharCode(65 + err.correct_option_index)}</div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border p-3" style={{ background: "var(--navy)", borderColor: "var(--border)" }}>
      <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>{label}</div>
      <div className="text-xl font-bold mt-1" style={{ color: "var(--gold)" }}>{value}</div>
    </div>
  );
}
