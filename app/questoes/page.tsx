"use client";

import { useCallback, useRef, useState } from "react";
import { TopNav } from "@/components/streaming/TopNav";

type Question = {
  id: string;
  discipline: string;
  syllabusItemId: string | null;
  origin: "REAL" | "INEDITA" | "DIDATICA";
  label: "[QUESTÃO REAL]" | "[QUESTÃO INÉDITA]" | "[EXEMPLO DIDÁTICO]";
  questionNumber: number | null;
  statement: string;
  options: string[];
  difficulty: number | null;
  sourcePage: number | null;
};

type Feedback = {
  is_correct: boolean;
  correct_option_index: number;
  needs_error_classification: boolean;
  explanation: string | null;
  next_review_at: string | null;
  source: { year: number | null; board: string | null; page: number | null; questionNumber: number | null } | null;
};

const DISCIPLINES = ["", "Conhecimentos Profissionais", "Língua Portuguesa", "Matemática"];
const ERROR_TYPES = [
  ["conhecimento", "Conhecimento"], ["esquecimento", "Esquecimento"], ["interpretacao", "Interpretação"],
  ["distracao", "Distração"], ["calculo", "Cálculo"], ["procedimento", "Procedimento"],
  ["confusao_de_conceitos", "Confusão de conceitos"], ["pegadinha", "Pegadinha"],
  ["estrategia_de_prova", "Estratégia de prova"], ["falta_de_tempo", "Falta de tempo"],
] as const;

export default function QuestoesPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [discipline, setDiscipline] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("Escolha uma matéria ou treine com todas.");
  const [errorClassified, setErrorClassified] = useState(false);
  const startedAt = useRef<number>(Date.now());

  const loadQuestion = useCallback(async (selectedDiscipline = discipline) => {
    setLoading(true);
    setSelected(null);
    setFeedback(null);
    setErrorClassified(false);
    const qs = selectedDiscipline ? `?discipline=${encodeURIComponent(selectedDiscipline)}` : "";
    try {
      const response = await fetch(`/api/questions${qs}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Falha ao carregar questão");
      const data = (await response.json()) as { question: Question | null; message?: string };
      setQuestion(data.question);
      setMessage(data.question ? "Responda antes de ver o gabarito." : (data.message ?? "Nenhuma questão disponível."));
      startedAt.current = Date.now();
    } catch {
      setQuestion(null);
      setMessage("Não foi possível carregar a questão.");
    } finally {
      setLoading(false);
    }
  }, [discipline]);

  async function answer(optionIndex: number) {
    if (!question || feedback || loading) return;
    setSelected(optionIndex);
    setLoading(true);
    try {
      const response = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: question.id,
          chosenOptionIndex: optionIndex,
          responseTimeSecs: Math.max(0, Math.round((Date.now() - startedAt.current) / 1000)),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Falha ao registrar resposta");
      setFeedback(data as Feedback);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Falha ao registrar resposta.");
      setSelected(null);
    } finally {
      setLoading(false);
    }
  }

  async function classifyError(errorType: string) {
    if (!question || !feedback?.needs_error_classification || errorClassified) return;
    const response = await fetch("/api/errors/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: question.id, errorType }),
    });
    if (response.ok) setErrorClassified(true);
  }

  return (
    <div className="min-h-screen bg-navy pb-20">
      <TopNav />
      <main className="mx-auto max-w-3xl px-4 pt-24 md:px-6">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Treinamento</p>
          <h1 className="mt-1 text-2xl font-black text-text-primary">Questões</h1>
          <p className="mt-2 text-sm text-text-secondary">Uma por vez. O gabarito só aparece depois da sua resposta.</p>
        </header>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {DISCIPLINES.map((item) => (
            <button key={item || "todas"} type="button" onClick={() => { setDiscipline(item); void loadQuestion(item); }} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${discipline === item ? "border-electric-blue/50 bg-electric-blue/10 text-electric-blue" : "border-graphite/40 bg-navy-900 text-text-secondary"}`}>
              {item || "Todas"}
            </button>
          ))}
        </div>

        {!question && (
          <section className="mt-6 rounded-2xl border border-graphite/40 bg-navy-900 p-5 text-center">
            <p className="text-sm text-text-secondary">{message}</p>
            <button onClick={() => void loadQuestion()} disabled={loading} className="mt-4 rounded-xl bg-electric-blue px-5 py-3 text-sm font-black text-white disabled:opacity-50">{loading ? "Carregando..." : "Buscar questão"}</button>
          </section>
        )}

        {question && (
          <section className="mt-6 rounded-3xl border border-graphite/40 bg-navy-900 p-5 sm:p-7">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
              <span className="rounded-full bg-gold-institution/10 px-3 py-1 text-gold-institution">{question.label}</span>
              <span className="rounded-full bg-navy-800 px-3 py-1 text-text-secondary">{question.discipline}</span>
              {question.questionNumber && <span className="rounded-full bg-navy-800 px-3 py-1 text-text-secondary">Questão {question.questionNumber}</span>}
            </div>

            <p className="mt-5 whitespace-pre-wrap text-base font-semibold leading-relaxed text-text-primary">{question.statement}</p>

            <div className="mt-5 space-y-2">
              {question.options.map((option, index) => {
                const answered = feedback != null;
                const correct = answered && index === feedback.correct_option_index;
                const wrongSelected = answered && selected === index && !feedback.is_correct;
                return (
                  <button key={`${question.id}-${index}`} type="button" disabled={answered || loading} onClick={() => void answer(index)} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm transition ${correct ? "border-success-green/60 bg-success-green/10 text-text-primary" : wrongSelected ? "border-alert-red/60 bg-alert-red/10 text-text-primary" : selected === index ? "border-electric-blue bg-electric-blue/5 text-text-primary" : "border-graphite/40 bg-navy-800/40 text-text-secondary"} disabled:cursor-default`}>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-950 font-black">{String.fromCharCode(65 + index)}</span>
                    <span className="pt-1 leading-relaxed">{option}</span>
                  </button>
                );
              })}
            </div>

            {feedback && (
              <div className={`mt-6 rounded-2xl border p-4 ${feedback.is_correct ? "border-success-green/30 bg-success-green/5" : "border-alert-red/30 bg-alert-red/5"}`}>
                <h2 className={`font-black ${feedback.is_correct ? "text-success-green" : "text-alert-red"}`}>{feedback.is_correct ? "Resposta correta" : "Resposta incorreta"}</h2>
                <p className="mt-2 text-sm text-text-primary">Gabarito: {String.fromCharCode(65 + feedback.correct_option_index)}</p>
                {feedback.explanation && <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{feedback.explanation}</p>}
                {feedback.source && <p className="mt-3 text-xs text-text-muted">Fonte: {feedback.source.board ?? "banca não informada"} {feedback.source.year ?? ""}{feedback.source.page ? ` · pág. ${feedback.source.page}` : ""}</p>}
              </div>
            )}

            {feedback?.needs_error_classification && !errorClassified && (
              <div className="mt-5">
                <p className="text-sm font-black text-text-primary">Qual foi a causa principal do erro?</p>
                <p className="mt-1 text-xs text-text-muted">Isso aumenta a precisão do plano de estudo.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {ERROR_TYPES.map(([value, label]) => <button key={value} onClick={() => void classifyError(value)} className="rounded-full border border-graphite/40 bg-navy-800 px-3 py-2 text-xs font-semibold text-text-secondary">{label}</button>)}
                </div>
              </div>
            )}
            {errorClassified && <p className="mt-4 text-xs font-bold text-success-green">Erro registrado no caderno.</p>}

            {feedback && (
              <button onClick={() => void loadQuestion()} className="mt-6 w-full rounded-2xl bg-electric-blue px-5 py-3.5 text-sm font-black text-white">Próxima questão</button>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
