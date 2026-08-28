"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";

type SimulationQuestion = {
  position: number;
  question_id: string;
  discipline: string;
  origin: "REAL" | "INEDITA" | "DIDATICA";
  question_number: number | null;
  context_text: string | null;
  requires_source_visual: boolean;
  statement: string;
  options: string[];
  chosen_option_index: number | null;
  answered: boolean;
  is_correct: boolean | null;
  correct_option_index: number | null;
  explanation: string | null;
};

type SimulationDetail = {
  id: string;
  mode: "OFICIAL" | "ADAPTATIVO";
  status: "IN_PROGRESS" | "COMPLETED" | "ABANDONED";
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  weighted_score: number | null;
  questions: SimulationQuestion[];
};

export default function SimulationRunPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params?.id ?? "";
  const [simulation, setSimulation] = useState<SimulationDetail | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [pendingSelection, setPendingSelection] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/simulations/${id}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Simulado não encontrado.");
        return data as SimulationDetail;
      })
      .then((data) => {
        setSimulation(data);
        if (data.status === "COMPLETED") router.replace(`/simulados/${id}/resultado`);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Falha ao carregar simulado."))
      .finally(() => setLoading(false));
  }, [id, router]);

  async function saveAnswer(question: SimulationQuestion) {
    const option = pendingSelection[question.position];
    if (option == null || saving || question.answered) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/simulations/${id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ position: question.position, selected_option_index: option }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível salvar a resposta.");
      setSimulation((current) => current ? {
        ...current,
        questions: current.questions.map((item) => item.position === question.position
          ? { ...item, chosen_option_index: option, answered: true }
          : item),
      } : current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao salvar resposta.");
    } finally {
      setSaving(false);
    }
  }

  async function finish() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/simulations/${id}/finish`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Não foi possível finalizar o simulado.");
      router.push(`/simulados/${id}/resultado`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao finalizar simulado.");
      setConfirmFinish(false);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-navy p-6 pt-24 text-sm text-text-muted">Carregando simulado...</div>;
  if (error && !simulation) return <div className="min-h-screen bg-navy p-6 pt-24 text-sm text-alert-red">{error}</div>;
  if (!simulation || simulation.questions.length === 0) return <div className="min-h-screen bg-navy p-6 pt-24 text-sm text-text-muted">Nenhuma questão disponível.</div>;

  const question = simulation.questions[currentIndex];
  const selected = question.chosen_option_index ?? pendingSelection[question.position] ?? null;
  const answeredCount = simulation.questions.filter((item) => item.answered).length;
  const unanswered = simulation.questions.length - answeredCount;

  return (
    <div className="min-h-screen bg-navy pb-24">
      <TopNav />
      <main className="mx-auto max-w-4xl px-4 pt-24 md:px-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-gold-institution">MODO PROVA</p>
            <h1 className="mt-1 text-xl font-black text-text-primary">{simulation.mode === "OFICIAL" ? "Simulado oficial" : "Treino adaptativo"}</h1>
            <p className="mt-1 text-xs text-text-muted">Sem correção durante a aplicação.</p>
          </div>
          <div className="rounded-xl border border-graphite/40 bg-navy-900 px-4 py-2 text-right">
            <p className="text-xs text-text-muted">Respondidas</p>
            <p className="text-lg font-black text-electric-blue">{answeredCount}/{simulation.questions.length}</p>
          </div>
        </header>

        {error && <div className="mt-4 rounded-xl border border-alert-red/30 bg-alert-red/5 p-3 text-sm text-alert-red">{error}</div>}

        <div className="mt-5 flex gap-2 overflow-x-auto pb-2">
          {simulation.questions.map((item, index) => (
            <button key={item.position} type="button" onClick={() => setCurrentIndex(index)} className={`h-10 w-10 shrink-0 rounded-xl border text-xs font-black ${index === currentIndex ? "border-gold-institution bg-gold-institution/10 text-gold-institution" : item.answered ? "border-success-green/40 bg-success-green/5 text-success-green" : "border-graphite/40 bg-navy-900 text-text-muted"}`}>
              {index + 1}
            </button>
          ))}
        </div>

        <section className="mt-4 rounded-3xl border border-graphite/40 bg-navy-900 p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-text-muted">
            <span className="rounded-full bg-navy-800 px-3 py-1">Questão {currentIndex + 1}/{simulation.questions.length}</span>
            <span className="rounded-full bg-navy-800 px-3 py-1">{question.discipline}</span>
            <span className="rounded-full bg-navy-800 px-3 py-1">{question.origin === "REAL" ? "[QUESTÃO REAL]" : question.origin === "INEDITA" ? "[QUESTÃO INÉDITA]" : "[EXEMPLO DIDÁTICO]"}</span>
          </div>

          {question.context_text && (
            <div className="mt-5 rounded-2xl border border-graphite/40 bg-navy-950/70 p-4 sm:p-5">
              <p className="mb-2 text-[11px] font-black uppercase tracking-[0.14em] text-text-muted">Texto-base da prova</p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-secondary">{question.context_text}</p>
            </div>
          )}

          <p className="mt-5 whitespace-pre-wrap text-base font-semibold leading-relaxed text-text-primary">{question.statement}</p>

          <div className="mt-5 space-y-2">
            {question.options.map((option, index) => (
              <button key={`${question.question_id}-${index}`} type="button" disabled={question.answered || saving} onClick={() => setPendingSelection((current) => ({ ...current, [question.position]: index }))} className={`flex w-full items-start gap-3 rounded-2xl border p-4 text-left text-sm ${selected === index ? "border-electric-blue bg-electric-blue/5 text-text-primary" : "border-graphite/40 bg-navy-800/40 text-text-secondary"} disabled:opacity-80`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-navy-950 font-black">{String.fromCharCode(65 + index)}</span>
                <span className="pt-1 leading-relaxed">{option}</span>
              </button>
            ))}
          </div>

          <div className="mt-6 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => setCurrentIndex((current) => Math.max(0, current - 1))} disabled={currentIndex === 0} className="rounded-xl border border-graphite/40 bg-navy-800 px-3 py-3 text-sm font-bold text-text-secondary disabled:opacity-40">Anterior</button>
            <button type="button" onClick={() => void saveAnswer(question)} disabled={question.answered || selected == null || saving} className="rounded-xl bg-electric-blue px-3 py-3 text-sm font-black text-white disabled:opacity-40">{question.answered ? "Salva" : saving ? "Salvando" : "Confirmar"}</button>
            <button type="button" onClick={() => setCurrentIndex((current) => Math.min(simulation.questions.length - 1, current + 1))} disabled={currentIndex === simulation.questions.length - 1} className="rounded-xl border border-graphite/40 bg-navy-800 px-3 py-3 text-sm font-bold text-text-secondary disabled:opacity-40">Próxima</button>
          </div>
        </section>

        <button type="button" onClick={() => setConfirmFinish(true)} className="mt-5 w-full rounded-2xl border border-gold-institution/40 bg-gold-institution/5 px-5 py-3.5 text-sm font-black text-gold-institution">Finalizar simulado</button>

        {confirmFinish && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <div className="w-full max-w-sm rounded-3xl border border-graphite/50 bg-navy-900 p-5">
              <h2 className="text-lg font-black text-text-primary">Finalizar agora?</h2>
              <p className="mt-2 text-sm text-text-secondary">Respondidas: {answeredCount}. Não respondidas: {unanswered}.</p>
              {unanswered > 0 && <p className="mt-3 rounded-xl border border-warning-gold/30 bg-warning-gold/5 p-3 text-xs text-warning-gold">Questões em branco serão contabilizadas sem acerto.</p>}
              <div className="mt-5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmFinish(false)} className="rounded-xl border border-graphite/40 px-4 py-3 text-sm font-bold text-text-secondary">Continuar prova</button>
                <button type="button" onClick={() => void finish()} disabled={saving} className="rounded-xl bg-gold-institution px-4 py-3 text-sm font-black text-navy-950 disabled:opacity-50">{saving ? "Finalizando..." : "Finalizar"}</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
