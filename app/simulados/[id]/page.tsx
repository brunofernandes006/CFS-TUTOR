"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

type SimQuestion = {
  order_number: number;
  question_id: number;
  discipline: string;
  answered: number;
};

type SimMeta = {
  id: number;
  simulation_type: "OFICIAL" | "ADAPTATIVO";
  status: string;
  target_questions: number;
  time_limit_seconds: number;
  started_at: string | null;
  finished_at: string | null;
  duration_seconds: number | null;
  created_at: string;
};

type QuestionDetail = {
  id: number;
  question_uid: string;
  origin: string;
  syllabus_item_id: number;
  discipline: string;
  theme: string | null;
  subtheme: string | null;
  difficulty: number;
  statement: string;
  explanation: string | null;
  active: number;
  verified: number;
  options: Array<{ id: number; option_index: number; option_text: string; is_correct: number }>;
  source: any;
};

export default function SimulationRunPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [simId, setSimId] = useState<number | null>(null);
  const [meta, setMeta] = useState<SimMeta | null>(null);
  const [questions, setQuestions] = useState<SimQuestion[]>([]);
  const [questionData, setQuestionData] = useState<Record<number, QuestionDetail>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answerLocked, setAnswerLocked] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    void (async () => {
      const { id } = await params;
      const parsed = Number(id);
      if (!Number.isFinite(parsed)) {
        setError("Simulado inválido.");
        setLoading(false);
        return;
      }
      setSimId(parsed);

      try {
        const detailRes = await fetch(`/api/simulations/${parsed}`);
        const detailData = await detailRes.json();
        if (!detailRes.ok) {
          setError(detailData.error || "Simulado não encontrado.");
          setLoading(false);
          return;
        }

        setMeta(detailData.simulation ?? detailData);
        setQuestions(detailData.questions ?? []);

        if ((detailData.simulation ?? detailData)?.status === "PENDING") {
          const startRes = await fetch(`/api/simulations/${parsed}/start`, { method: "POST" });
          const startData = await startRes.json();
          if (!startRes.ok) {
            setError(startData.error || "Não foi possível iniciar o simulado.");
            setLoading(false);
            return;
          }
          const refreshed = await fetch(`/api/simulations/${parsed}`);
          const refreshedData = await refreshed.json();
          setMeta(refreshedData.simulation ?? refreshedData);
          setQuestions(refreshedData.questions ?? []);
        }

        const questionIds = (detailData.questions ?? []).map((q: SimQuestion) => q.question_id);
        const loaded = await Promise.all(
          questionIds.map(async (qid: number) => {
            const res = await fetch(`/api/questions/${qid}`);
            return [qid, await res.json()] as const;
          })
        );

        const map: Record<number, QuestionDetail> = {};
        for (const [qid, item] of loaded) {
          map[qid] = item;
        }
        setQuestionData(map);
      } catch {
        setError("Erro ao carregar simulado.");
      } finally {
        setLoading(false);
      }
    })();
  }, [params]);

  useEffect(() => {
    if (!meta || meta.simulation_type !== "OFICIAL" || !meta.started_at) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [meta]);

  const currentQuestionId = questions[currentIndex]?.question_id;
  const currentQuestion = currentQuestionId ? questionData[currentQuestionId] : null;

  const timeRemaining = useMemo(() => {
    if (!meta || meta.simulation_type !== "OFICIAL" || !meta.started_at) return null;
    const started = new Date(meta.started_at).getTime();
    const elapsed = Math.max(0, Math.floor((now - started) / 1000));
    const remaining = Math.max(0, meta.time_limit_seconds - elapsed);
    return remaining;
  }, [meta, now]);

  useEffect(() => {
    if (!meta || meta.simulation_type !== "OFICIAL" || timeRemaining === null) return;
    if (timeRemaining <= 0 && simId) {
      void finalizeNow();
    }
  }, [meta, simId, timeRemaining]);

  useEffect(() => {
    const item = currentQuestionId ? questions.find((q) => q.question_id === currentQuestionId) : null;
    if (!item) {
      setSelectedOption(null);
      setAnswerLocked(false);
      return;
    }
    setAnswerLocked(Boolean(item.answered));
    setSelectedOption(null);
  }, [currentQuestionId, questions]);

  if (loading) return <div className="p-6 text-sm" style={{ color: "var(--muted)" }}>Carregando simulado...</div>;
  if (error) return <div className="p-6 text-sm" style={{ color: "var(--danger)" }}>{error}</div>;
  if (!meta || !currentQuestion) return <div className="p-6 text-sm" style={{ color: "var(--muted)" }}>Nenhuma questão disponível.</div>;

  const answeredCount = questions.filter((q) => q.answered === 1).length;
  const totalQuestions = questions.length;

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  async function finalizeNow() {
    if (!simId) return;
    const res = await fetch(`/api/simulations/${simId}/finish`, { method: "POST" });
    const result = await res.json();
    if (res.ok && result) {
      router.push(`/simulados/${simId}/resultado`);
      return;
    }
    setError(result.error || "Não foi possível finalizar o simulado.");
  }

  async function confirmAnswer() {
    if (!simId || selectedOption === null || !currentQuestion) return;
    const res = await fetch(`/api/simulations/${simId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question_id: currentQuestion.id,
        selected_option_index: selectedOption,
        response_time_seconds: 10,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Não foi possível confirmar a resposta.");
      return;
    }

    const refreshed = await fetch(`/api/simulations/${simId}`);
    const refreshedData = await refreshed.json();
    setQuestions(refreshedData.questions ?? []);
    setAnswerLocked(true);
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--muted)" }}>Operação</div>
          <h1 className="text-3xl font-black" style={{ color: "var(--gold)" }}>{meta.simulation_type}</h1>
        </div>

        <div className="rounded-lg border px-4 py-2" style={{ background: "var(--navy-2)", borderColor: "var(--border)" }}>
          <div className="text-xs uppercase" style={{ color: "var(--muted)" }}>Cronômetro</div>
          <div className="text-xl font-bold" style={{ color: "var(--gold)" }}>
            {timeRemaining !== null ? formatTime(timeRemaining) : "—"}
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card className="p-3">
          <div className="mb-3 text-sm font-bold" style={{ color: "var(--gold)" }}>Painel de questões</div>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, idx) => {
              const active = idx === currentIndex;
              const answered = q.answered === 1;
              return (
                <button
                  key={q.question_id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className="w-10 h-10 rounded-md border text-sm font-bold"
                  style={{
                    background: active ? "rgba(201,168,76,0.15)" : answered ? "rgba(34,197,94,0.12)" : "var(--navy)",
                    borderColor: active ? "var(--gold)" : answered ? "var(--success)" : "var(--border)",
                    color: active ? "var(--gold)" : answered ? "#4ade80" : "var(--text)",
                  }}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex flex-wrap items-center gap-2 text-xs mb-4" style={{ color: "var(--muted)" }}>
            <span className="rounded px-2 py-1" style={{ background: "var(--navy)", border: "1px solid var(--border)" }}>{currentQuestion.discipline}</span>
            <span className="rounded px-2 py-1" style={{ background: "var(--navy)", border: "1px solid var(--border)" }}>{currentQuestion.origin}</span>
            <span className="rounded px-2 py-1" style={{ background: "var(--navy)", border: "1px solid var(--border)" }}>Dificuldade {currentQuestion.difficulty}</span>
          </div>

          <div className="mb-4 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--muted)" }}>
            Questão {currentIndex + 1} / {totalQuestions}
          </div>

          <p className="text-base leading-relaxed mb-6" style={{ color: "var(--text)" }}>{currentQuestion.statement}</p>

          <div className="space-y-2 mb-6">
            {currentQuestion.options.map((opt) => {
              const isSelected = selectedOption === opt.option_index;
              const disabled = answerLocked;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => !disabled && setSelectedOption(opt.option_index)}
                  disabled={disabled}
                  className="w-full text-left rounded-lg border px-4 py-3 text-sm transition"
                  style={{
                    background: isSelected ? "rgba(201,168,76,0.1)" : "var(--navy)",
                    borderColor: isSelected ? "var(--gold)" : "var(--border)",
                    color: "var(--text)",
                    cursor: disabled ? "default" : "pointer",
                    opacity: disabled ? 0.8 : 1,
                  }}
                >
                  <span className="mr-2 font-bold" style={{ color: "var(--muted)" }}>{String.fromCharCode(65 + opt.option_index)}</span>
                  {opt.option_text}
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              className="flex-1 rounded-lg border px-4 py-3 font-bold"
              style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--navy)" }}
            >
              Anterior
            </button>

            <button
              type="button"
              onClick={confirmAnswer}
              disabled={answerLocked || selectedOption === null}
              className="flex-1 rounded-lg px-4 py-3 font-bold disabled:opacity-60"
              style={{ background: "var(--gold)", color: "var(--navy)" }}
            >
              {answerLocked ? "Resposta confirmada" : "Confirmar resposta"}
            </button>

            <button
              type="button"
              onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
              className="flex-1 rounded-lg border px-4 py-3 font-bold"
              style={{ borderColor: "var(--border)", color: "var(--text)", background: "var(--navy)" }}
            >
              Próxima
            </button>
          </div>

          <div className="mt-5 flex items-center justify-between text-sm" style={{ color: "var(--muted)" }}>
            <span>Respondidas: {answeredCount}/{totalQuestions}</span>
            <button type="button" onClick={() => setConfirmOpen(true)} className="font-bold" style={{ color: "var(--gold)" }}>
              Finalizar Operação
            </button>
          </div>

          {confirmOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
              <div className="w-full max-w-md rounded-lg border p-5" style={{ background: "var(--navy-2)", borderColor: "var(--border)" }}>
                <h3 className="text-xl font-bold mb-3" style={{ color: "var(--gold)" }}>Finalizar Operação</h3>
                <div className="space-y-2 text-sm" style={{ color: "var(--text)" }}>
                  <div className="flex justify-between"><span>Respondidas</span><strong>{answeredCount}</strong></div>
                  <div className="flex justify-between"><span>Não respondidas</span><strong>{totalQuestions - answeredCount}</strong></div>
                  <div className="flex justify-between"><span>Tempo restante</span><strong>{timeRemaining !== null ? formatTime(timeRemaining) : "—"}</strong></div>
                </div>
                {totalQuestions - answeredCount > 0 && (
                  <div className="mt-4 rounded border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm" style={{ color: "#facc15" }}>
                    Há questões não respondidas. Confirme se deseja encerrar mesmo assim.
                  </div>
                )}
                <div className="mt-5 flex gap-3">
                  <button type="button" onClick={() => setConfirmOpen(false)} className="flex-1 rounded-lg border px-4 py-3 font-bold" style={{ borderColor: "var(--border)", color: "var(--text)" }}>Cancelar</button>
                  <button type="button" onClick={() => { setConfirmOpen(false); void finalizeNow(); }} className="flex-1 rounded-lg px-4 py-3 font-bold" style={{ background: "var(--gold)", color: "var(--navy)" }}>Confirmar</button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
