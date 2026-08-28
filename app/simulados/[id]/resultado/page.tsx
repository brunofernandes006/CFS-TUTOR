"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";

type ResultQuestion = {
  position: number;
  question_id: string;
  discipline: string;
  statement: string;
  options: string[];
  chosen_option_index: number | null;
  is_correct: boolean | null;
  correct_option_index: number | null;
  explanation: string | null;
};

type DisciplineResult = {
  code: string;
  discipline: string;
  weight: number;
  total: number;
  correct: number;
  score_0_10: number;
};

type ResultDetail = {
  id: string;
  mode: "OFICIAL" | "ADAPTATIVO";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  duration_seconds: number | null;
  weighted_score: number | null;
  questions: ResultQuestion[];
  disciplines: DisciplineResult[];
};

export default function SimulationResultPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const [result, setResult] = useState<ResultDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/simulations/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Resultado indisponível.");
        return data as ResultDetail;
      })
      .then((data) => {
        if (data.status !== "COMPLETED") {
          router.replace(`/simulados/${id}`);
          return;
        }
        setResult(data);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Falha ao carregar resultado."))
      .finally(() => setLoading(false));
  }, [id, router]);

  const metrics = useMemo(() => {
    const questions = result?.questions ?? [];
    const total = questions.length;
    const answered = questions.filter((item) => item.chosen_option_index != null).length;
    const correct = questions.filter((item) => item.is_correct === true).length;
    const wrong = total - correct;
    const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
    return { total, answered, correct, wrong, accuracy };
  }, [result]);

  if (loading) return <div className="min-h-screen bg-navy p-6 pt-24 text-sm text-text-muted">Carregando resultado...</div>;
  if (error) return <div className="min-h-screen bg-navy p-6 pt-24 text-sm text-alert-red">{error}</div>;
  if (!result) return null;

  const minimumsMet = result.disciplines.length > 0 && result.disciplines.every((item) => Number(item.score_0_10) >= 5);
  const errors = result.questions.filter((item) => item.is_correct === false);

  return (
    <div className="min-h-screen bg-navy pb-24">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 pt-24 md:px-6">
        <header>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-gold-institution">RESULTADO</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">{result.mode === "OFICIAL" ? "Simulado oficial" : "Treino adaptativo"}</h1>
          <p className="mt-2 text-sm text-text-secondary">Análise liberada somente após o encerramento da aplicação.</p>
        </header>

        <section className="mt-6 rounded-3xl border border-gold-institution/30 bg-navy-900 p-5 sm:p-6">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-text-muted">Nota ponderada</p>
              <p className="mt-1 text-4xl font-black text-gold-institution">{Number(result.weighted_score ?? 0).toFixed(2)}</p>
              <p className="text-xs text-text-muted">escala 0–10</p>
            </div>
            {result.mode === "OFICIAL" && (
              <span className={`rounded-full border px-3 py-1.5 text-xs font-black ${minimumsMet ? "border-success-green/40 bg-success-green/10 text-success-green" : "border-alert-red/40 bg-alert-red/10 text-alert-red"}`}>
                {minimumsMet ? "Mínimos atingidos" : "Mínimos não atingidos"}
              </span>
            )}
          </div>
        </section>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Questões" value={metrics.total} />
          <Metric label="Respondidas" value={metrics.answered} />
          <Metric label="Acertos" value={metrics.correct} />
          <Metric label="Aproveitamento" value={`${metrics.accuracy}%`} />
        </div>

        <section className="mt-6 rounded-3xl border border-graphite/40 bg-navy-900 p-5 sm:p-6">
          <h2 className="text-base font-black text-text-primary">Por matéria</h2>
          <div className="mt-4 space-y-3">
            {result.disciplines.map((item) => {
              const score = Number(item.score_0_10);
              return (
                <div key={item.code} className="rounded-2xl border border-graphite/30 bg-navy-800/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-text-primary">{item.discipline}</p>
                      <p className="mt-1 text-xs text-text-muted">{item.correct}/{item.total} acertos · peso {item.weight}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black ${score >= 5 ? "text-success-green" : "text-alert-red"}`}>{score.toFixed(2)}</p>
                      <p className="text-[10px] text-text-muted">nota / 10</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-text-primary">Questões erradas</h2>
            <span className="text-xs text-text-muted">{errors.length}</span>
          </div>
          {errors.length === 0 ? (
            <div className="mt-3 rounded-2xl border border-success-green/25 bg-success-green/5 p-4 text-sm text-success-green">Nenhum erro neste simulado.</div>
          ) : (
            <div className="mt-3 space-y-3">
              {errors.map((item) => (
                <article key={item.question_id} className="rounded-2xl border border-graphite/35 bg-navy-900 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-text-muted">Questão {item.position} · {item.discipline}</p>
                  <p className="mt-2 text-sm leading-relaxed text-text-primary">{item.statement}</p>
                  <p className="mt-3 text-xs text-alert-red">Sua resposta: {item.chosen_option_index == null ? "em branco" : String.fromCharCode(65 + item.chosen_option_index)}</p>
                  <p className="mt-1 text-xs text-success-green">Gabarito: {item.correct_option_index == null ? "—" : String.fromCharCode(65 + item.correct_option_index)}</p>
                  {item.explanation && <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-text-secondary">{item.explanation}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <button type="button" onClick={() => router.push("/simulados")} className="mt-6 w-full rounded-2xl bg-electric-blue px-5 py-3.5 text-sm font-black text-white">Voltar aos simulados</button>
      </main>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-graphite/35 bg-navy-900 p-4">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-1 text-xl font-black text-text-primary">{value}</p>
    </div>
  );
}
