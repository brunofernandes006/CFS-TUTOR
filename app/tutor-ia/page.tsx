"use client";

import { useState, useEffect } from "react";
import {
  SectionHeader,
  TacticalCard,
  TacticalPanel,
  TacticalButton,
  LoadingState,
  AlertPanel,
} from "@/components/ui";
import type { SyllabusItem, Document } from "@/lib/types";
import type {
  TutorObjective,
  DepthLevel,
} from "@/lib/tutorIAConstants";
import { OBJECTIVE_LABELS, DEPTH_LABELS } from "@/lib/tutorIAConstants";
import type { TutorResult } from "@/lib/services/tutorIAPromptService";

const OBJECTIVES: { key: TutorObjective; icon: string; desc: string }[] = [
  { key: "explicar_tema", icon: "📖", desc: "Explicar um tema" },
  { key: "resumir_conteudo", icon: "📝", desc: "Resumir conteúdo" },
  { key: "plano_revisao", icon: "📅", desc: "Montar plano de revisão" },
  { key: "explicar_erro", icon: "❌", desc: "Explicar um erro" },
  { key: "flashcards", icon: "🃏", desc: "Criar flashcards" },
  { key: "questoes_ineditas", icon: "✏️", desc: "Gerar questões inéditas" },
  { key: "comparar_temas", icon: "⚖️", desc: "Comparar temas" },
  { key: "preparar_sessao", icon: "🎯", desc: "Preparar sessão de estudo" },
];

const DISCIPLINES = [
  "Língua Portuguesa",
  "Matemática e Raciocínio Lógico",
  "Conhecimentos Profissionais",
];

const DEPTH_OPTIONS: DepthLevel[] = ["basico", "intermediario", "avancado"];

export default function TutorIAPage() {
  const [objective, setObjective] = useState<TutorObjective | null>(null);
  const [discipline, setDiscipline] = useState("");
  const [syllabusItems, setSyllabusItems] = useState<SyllabusItem[]>([]);
  const [syllabusItemId, setSyllabusItemId] = useState<number | "">("");
  const [depth, setDepth] = useState<DepthLevel>("intermediario");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<TutorResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    if (!discipline) {
      setSyllabusItems([]);
      setSyllabusItemId("");
      return;
    }
    setItemsLoading(true);
    fetch(`/api/syllabus?discipline=${encodeURIComponent(discipline)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar tópicos.");
        return r.json();
      })
      .then((data) => {
        setSyllabusItems(Array.isArray(data) ? data : data.items ?? []);
        setSyllabusItemId("");
      })
      .catch(() => setSyllabusItems([]))
      .finally(() => setItemsLoading(false));
  }, [discipline]);

  const handleGenerate = async () => {
    if (!objective || !discipline) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/tutor-ia/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objective,
          discipline,
          syllabus_item_id: syllabusItemId || undefined,
          depth,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({
        prompt: "Erro ao gerar prompt. Tente novamente.",
        objective_label: "",
        related_docs: [],
        related_topics: [],
        origin_alert: "",
        is_question_request: false,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result?.prompt) return;
    try {
      await navigator.clipboard.writeText(result.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = result.prompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canGenerate = objective && discipline;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="🤖 Tutor IA — Modo Offline"
        subtitle="Gere prompts estruturados para estudo assistido"
      />

      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Origem alert */}
        <AlertPanel
          type="info"
          title="Modo Offline"
          message="Este assistente gera prompts estruturados para você usar com qualquer ferramenta de IA. Não requer conexão com serviços externos."
        />

        {/* Objetivo */}
        <TacticalPanel title="🎯 Objetivo">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {OBJECTIVES.map((o) => (
              <button
                key={o.key}
                onClick={() => setObjective(o.key)}
                className={`p-3 rounded border text-left transition-all ${
                  objective === o.key
                    ? "bg-gold-institution/15 border-gold-institution text-gold-institution"
                    : "bg-navy-900 border-graphite text-text-secondary hover:border-text-muted"
                }`}
              >
                <span className="text-xl block mb-1">{o.icon}</span>
                <span className="text-xs font-bold uppercase">{o.desc}</span>
              </button>
            ))}
          </div>
        </TacticalPanel>

        {/* Entradas */}
        <TacticalPanel title="📋 Entradas">
          <div className="space-y-4">
            {/* Disciplina */}
            <div>
              <label className="text-sm font-bold uppercase text-gold-institution block mb-2">
                Disciplina *
              </label>
              <select
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full px-3 py-2 rounded border border-graphite bg-navy-800 text-text-primary text-sm font-semibold uppercase tracking-wider focus:border-gold-institution focus:outline-none"
              >
                <option value="">Selecione...</option>
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Syllabus Item */}
            {discipline && (
              <div>
                <label className="text-sm font-bold uppercase text-electric-blue block mb-2">
                  Tópico do Edital (opcional)
                </label>
                {itemsLoading ? (
                  <p className="text-xs text-text-muted">Carregando tópicos...</p>
                ) : (
                  <select
                    value={syllabusItemId}
                    onChange={(e) => setSyllabusItemId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 rounded border border-graphite bg-navy-800 text-text-primary text-sm focus:border-electric-blue focus:outline-none"
                  >
                    <option value="">Todos os tópicos da disciplina</option>
                    {syllabusItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Profundidade */}
            <div>
              <label className="text-sm font-bold uppercase text-cyan-glow block mb-2">
                Nível de Profundidade
              </label>
              <div className="flex gap-2">
                {DEPTH_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDepth(d)}
                    className={`flex-1 px-3 py-2 rounded border text-xs font-bold uppercase transition-colors ${
                      depth === d
                        ? "bg-cyan-glow/15 border-cyan-glow text-cyan-glow"
                        : "bg-navy-900 border-graphite text-text-secondary hover:border-text-muted"
                    }`}
                  >
                    {DEPTH_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>

            {/* Observação */}
            <div>
              <label className="text-sm font-bold uppercase text-text-muted block mb-2">
                Observação (opcional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Focar na parte prática, explicar como se tivesse 15 anos..."
                rows={3}
                className="w-full px-3 py-2 rounded border border-graphite bg-navy-800 text-text-primary text-sm focus:border-electric-blue focus:outline-none resize-none"
              />
            </div>

            <TacticalButton
              variant="primary"
              size="medium"
              onClick={handleGenerate}
              disabled={!canGenerate || loading}
              className="w-full"
            >
              {loading ? "Gerando..." : "🤖 Gerar Prompt"}
            </TacticalButton>
          </div>
        </TacticalPanel>

        {/* Resultado */}
        {result && (
          <>
            {/* Origin alert */}
            {result.origin_alert && (
              <AlertPanel type="warning" title="Atenção" message={result.origin_alert} />
            )}

            {/* Prompt */}
            <TacticalPanel title={`📝 Prompt — ${result.objective_label}`}>
              <div className="space-y-3">
                <div className="bg-navy-950 rounded p-4 border border-graphite max-h-96 overflow-y-auto">
                  <pre className="text-sm text-text-primary whitespace-pre-wrap font-mono leading-relaxed">
                    {result.prompt}
                  </pre>
                </div>
                <TacticalButton
                  variant={copied ? "primary" : "secondary"}
                  size="medium"
                  onClick={handleCopy}
                  className="w-full"
                >
                  {copied ? "✅ Copiado!" : "📋 Copiar Prompt"}
                </TacticalButton>
              </div>
            </TacticalPanel>

            {/* Documentos relacionados */}
            {result.related_docs.length > 0 && (
              <TacticalPanel title="🗂️ Documentos Relacionados">
                <div className="space-y-2">
                  {result.related_docs.map((doc: Document) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between px-3 py-2 rounded bg-navy-900 border border-graphite"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-text-primary truncate">
                          {doc.titulo ?? doc.nome_original ?? "Sem título"}
                        </p>
                        <div className="flex gap-2 text-xs text-text-muted mt-1">
                          {doc.tipo && <span>{doc.tipo}</span>}
                          {doc.numero && <span>· {doc.numero}</span>}
                          {doc.ano && <span>· {doc.ano}</span>}
                        </div>
                      </div>
                      {doc.cfs26_priority === 1 && (
                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-bold bg-gold-institution/20 text-gold-institution border border-gold-institution shrink-0">
                          CFS/26
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </TacticalPanel>
            )}

            {/* Temas relacionados */}
            {result.related_topics.length > 0 && (
              <TacticalPanel title="🔗 Temas Relacionados">
                <div className="flex flex-wrap gap-2">
                  {result.related_topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 rounded text-xs font-bold bg-navy-900 text-electric-blue border border-electric-blue"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </TacticalPanel>
            )}
          </>
        )}
      </div>
    </div>
  );
}
