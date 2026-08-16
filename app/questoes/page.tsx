"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";
import { ContentRow } from "@/components/streaming/ContentRow";
import { StudyContentCard } from "@/components/streaming/StudyContentCard";
import { ContentPreviewModal } from "@/components/streaming/ContentPreviewModal";
import { SkeletonRow, SkeletonHero } from "@/components/streaming/Skeletons";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { QuestionWithOptions } from "@/lib/types";

type AnswerState = "unanswered" | "correct" | "wrong";

interface DisciplineRow {
  discipline: string;
  icon: string;
  variant: "syllabus" | "document" | "review";
}

const DISCIPLINE_ROWS: DisciplineRow[] = [
  { discipline: "Língua Portuguesa", icon: "📖", variant: "syllabus" },
  { discipline: "Matemática e Raciocínio Lógico", icon: "🔢", variant: "syllabus" },
  { discipline: "Conhecimentos Profissionais", icon: "⚙️", variant: "syllabus" },
];

export default function QuestoesPage() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [question, setQuestion] = useState<QuestionWithOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [empty, setEmpty] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [state, setState] = useState<AnswerState>("unanswered");
  const [xpToast, setXpToast] = useState<number | null>(null);
  const [discipline, setDiscipline] = useState<string>("");
  const [preview, setPreview] = useState<{ title: string; discipline?: string; description?: string } | null>(null);
  const [mode, setMode] = useState<"landing" | "active">("landing");

  const loadQuestion = useCallback(async (disc?: string) => {
    setLoading(true);
    setSelected(null);
    setState("unanswered");
    const d = disc ?? discipline;
    const qs = d ? `?discipline=${encodeURIComponent(d)}` : "";
    try {
      const res = await fetch(`/api/questions${qs}`);
      if (!res.ok) throw new Error("Erro");
      const data = await res.json();
      if (!data.question) { setEmpty(true); setQuestion(null); }
      else { setEmpty(false); setQuestion(data.question); setMode("active"); }
    } catch { setEmpty(true); setQuestion(null); }
    setLoading(false);
  }, [discipline]);

  useEffect(() => { loadQuestion(); }, []);

  async function handleAnswer(optionIndex: number) {
    if (state !== "unanswered" || !question) return;
    setSelected(optionIndex);
    const correct = question.options.find((o) => o.is_correct === 1);
    const isCorrect = optionIndex === correct?.option_index;
    setState(isCorrect ? "correct" : "wrong");
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusItemId: question.syllabus_item_id,
          questionId: question.id,
          isCorrect,
          difficulty: question.difficulty,
          chosenOptionIndex: optionIndex,
          correctOptionIndex: correct?.option_index,
          theme: question.theme,
          subtheme: question.subtheme,
        }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.xp_awarded > 0) { setXpToast(data.xp_awarded); setTimeout(() => setXpToast(null), 2500); }
    } catch {}
  }

  function startTraining(disc?: string) {
    setDiscipline(disc ?? "");
    loadQuestion(disc);
  }

  if (mode === "active" && question) {
    return <ActiveQuestion question={question} selected={selected} state={state} xpToast={xpToast} handleAnswer={handleAnswer} loadQuestion={() => { setMode("landing"); loadQuestion(); }} />;
  }

  return (
    <div className="min-h-screen">
      <TopNav onSearch={() => {}} />

      {/* Hero */}
      <section className="relative pt-20 pb-16 px-4 md:px-6 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/60 to-navy-900/20" />
        <div className="relative z-10 max-w-7xl mx-auto animate-fade-in-up">
          <p className="text-xs font-bold uppercase tracking-widest text-electric-blue mb-2">
            Questões
          </p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-text-primary mb-2">
            ✏️ TREINAMENTO TÁTICO
          </h1>
          <p className="text-sm text-text-secondary max-w-xl">
            Pratique com questões reais do banco. Filtre por disciplina ou comece diretamente.
          </p>
        </div>
      </section>

      <ContentPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ""}
        discipline={preview?.discipline}
        description={preview?.description}
      />

      <div className="px-4 md:px-6 max-w-7xl mx-auto pb-10 space-y-10 -mt-8 relative z-10">
        {/* Quick start cards */}
        <ContentRow title="⚡ INICIAR TREINAMENTO" animate={!reducedMotion}>
          <StudyContentCard
            variant="question"
            title="Todas as Disciplinas"
            subtitle="Questão aleatória de qualquer disciplina"
            icon="🎯"
            onClick={() => startTraining("")}
            onAction={() => startTraining("")}
            actionLabel="Iniciar"
            animate={!reducedMotion}
          />
          {DISCIPLINE_ROWS.map((row) => (
            <StudyContentCard
              key={row.discipline}
              variant={row.variant}
              title={row.discipline}
              subtitle={`${row.icon} Treino focado`}
              icon={row.icon}
              onClick={() => startTraining(row.discipline)}
              onAction={() => startTraining(row.discipline)}
              actionLabel="Iniciar"
              animate={!reducedMotion}
            />
          ))}
        </ContentRow>

        {/* Empty state */}
        {empty && (
          <div className="text-center py-12 animate-fade-in">
            <div className="text-4xl mb-4">✏️</div>
            <p className="text-sm text-text-secondary mb-2">
              Banco de questões ainda não possui itens suficientes.
            </p>
            <p className="text-xs text-text-muted">
              Adicione questões ao banco para começar o treinamento.
            </p>
          </div>
        )}

        {/* Info */}
        {!empty && !loading && (
          <div className="rounded-xl border border-graphite/30 bg-navy-900 p-4">
            <p className="text-xs font-bold uppercase tracking-widest text-text-muted mb-2">Como funciona</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="px-3 py-2 rounded-lg bg-navy-800 border border-graphite/30">
                <p className="text-xs font-bold text-electric-blue mb-1">1. Escolha</p>
                <p className="text-[10px] text-text-muted">Selecione uma disciplina ou comece aleatório</p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-navy-800 border border-graphite/30">
                <p className="text-xs font-bold text-electric-blue mb-1">2. Responda</p>
                <p className="text-[10px] text-text-muted">Leia, analise e marque a alternativa</p>
              </div>
              <div className="px-3 py-2 rounded-lg bg-navy-800 border border-graphite/30">
                <p className="text-xs font-bold text-electric-blue mb-1">3. Aprenda</p>
                <p className="text-[10px] text-text-muted">Veja a explicação e ganhe XP</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ActiveQuestion({
  question, selected, state, xpToast, handleAnswer, loadQuestion,
}: {
  question: QuestionWithOptions;
  selected: number | null;
  state: AnswerState;
  xpToast: number | null;
  handleAnswer: (i: number) => void;
  loadQuestion: () => void;
}) {
  const correctOption = question.options.find((o) => o.is_correct === 1);

  return (
    <div className="min-h-screen">
      <TopNav onSearch={() => {}} />
      <div className="pt-20 pb-10 px-4 md:px-6 max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <button
          type="button"
          onClick={loadQuestion}
          className="text-xs font-bold text-text-muted hover:text-electric-blue transition-colors"
        >
          ← Voltar ao treinamento
        </button>

        {/* XP Toast */}
        {xpToast && (
          <div className="fixed top-4 right-4 px-4 py-3 rounded-lg text-sm font-bold z-50 animate-bounce bg-gold-institution text-navy-950 shadow-lg">
            +{xpToast} 🏅 Pontos de Mérito!
          </div>
        )}

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-navy-800 text-gold-institution border border-gold-institution">
            {question.origin}
          </span>
          <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-navy-800 text-electric-blue border border-graphite">
            {question.discipline}
          </span>
          <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-navy-800 text-text-secondary border border-graphite">
            Nível {question.difficulty}/5
          </span>
          {question.theme && (
            <span className="px-3 py-1 rounded text-xs font-bold uppercase bg-navy-800 text-cyan-glow border border-graphite">
              {question.theme}
            </span>
          )}
        </div>

        {/* Source (OFICIAL only) */}
        {question.origin === "OFICIAL" && question.source && (
          <div className="px-3 py-2 rounded bg-navy-800 border-l-2 border-gold-institution">
            <p className="text-xs text-text-secondary">
              <span className="font-bold text-gold-institution">Fonte:</span> {question.source.exam_name} {question.source.exam_year}
              {question.source.exam_number && ` · Q.${question.source.exam_number}`}
            </p>
          </div>
        )}

        {/* Statement */}
        <div className="rounded-xl border border-graphite/40 bg-navy-900 p-6">
          <p className="text-base leading-relaxed text-text-primary">{question.statement}</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {question.options.map((opt) => {
            const isSelected = selected === opt.option_index;
            const isCorrect = opt.is_correct === 1;
            const answered = state !== "unanswered";
            let classes = "border-graphite bg-navy-800 text-text-primary hover:border-electric-blue hover:bg-navy-700 cursor-pointer";
            if (answered && isCorrect) classes = "border-success-green bg-navy-900 text-success-green";
            else if (answered && isSelected && !isCorrect) classes = "border-alert-red bg-navy-900 text-alert-red";
            else if (!answered && isSelected) classes = "border-gold-institution bg-navy-900 text-gold-institution";

            return (
              <button
                key={opt.id}
                onClick={() => handleAnswer(opt.option_index)}
                disabled={answered}
                className={`w-full text-left px-4 py-3 rounded border transition-all ${classes} disabled:cursor-not-allowed font-semibold`}
              >
                <span className="mr-3 inline-block w-6 text-center font-bold text-text-muted">
                  {String.fromCharCode(65 + opt.option_index)})
                </span>
                {opt.option_text}
                {answered && isCorrect && <span className="ml-2 text-sm">✓</span>}
                {answered && isSelected && !isCorrect && <span className="ml-2 text-sm">✕</span>}
              </button>
            );
          })}
        </div>

        {/* Feedback */}
        {state !== "unanswered" && (
          <div className={`rounded-xl border p-6 ${state === "correct" ? "border-success-green/30 bg-success-green/5" : "border-alert-red/30 bg-alert-red/5"}`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{state === "correct" ? "✅" : "❌"}</span>
              <div>
                <p className={`font-bold text-lg ${state === "correct" ? "text-success-green" : "text-alert-red"}`}>
                  {state === "correct" ? "Resposta Correta!" : "Resposta Incorreta"}
                </p>
                {state === "wrong" && correctOption && (
                  <p className="text-xs text-text-secondary mt-1">
                    Gabarito: <span className="font-bold text-gold-institution">{String.fromCharCode(65 + correctOption.option_index)}</span>
                  </p>
                )}
              </div>
            </div>
            {question.explanation && (
              <div className="bg-navy-800 rounded px-3 py-2 mb-6 border-l-2 border-electric-blue">
                <p className="text-sm leading-relaxed text-text-secondary">
                  <span className="font-bold text-electric-blue">Explicação:</span> {question.explanation}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={loadQuestion}
              className="w-full px-6 py-3 rounded-xl bg-electric-blue text-white font-bold text-sm hover:bg-electric-blue/80 transition-colors"
            >
              Próxima Questão →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
