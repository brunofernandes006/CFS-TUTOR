"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";
import { ContentRow } from "@/components/streaming/ContentRow";
import { StudyContentCard } from "@/components/streaming/StudyContentCard";
import { ContentPreviewModal } from "@/components/streaming/ContentPreviewModal";
import { SkeletonRow } from "@/components/streaming/Skeletons";
import { useMyList } from "@/hooks/useMyList";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { SyllabusItemWithProgress } from "@/lib/types";

type FilterKey = "todos" | "nao_estudados" | "criticos" | "fracos" | "dominados" | "revisao_pendente";

interface PreviewData {
  title: string;
  subtitle?: string;
  discipline?: string;
  mastery?: number;
  description?: string;
  listId?: string;
}

export default function EstudarPage() {
  const router = useRouter();
  const { list, add, remove, has } = useMyList();
  const reducedMotion = useReducedMotion();
  const [items, setItems] = useState<SyllabusItemWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/syllabus?filter=${filter}`)
      .then((r) => { if (!r.ok) throw new Error("Erro"); return r.json(); })
      .then((data) => { setItems(data); setLoading(false); })
      .catch(() => { setItems([]); setLoading(false); });
  }, [filter]);

  const byDiscipline = useMemo(() => {
    const groups: Record<string, SyllabusItemWithProgress[]> = {
      "Língua Portuguesa": [],
      "Matemática e Raciocínio Lógico": [],
      "Conhecimentos Profissionais": [],
    };
    items.forEach((i) => {
      if (i.discipline in groups) groups[i.discipline].push(i);
    });
    return groups;
  }, [items]);

  const continueStudying = useMemo(
    () => items.filter((i) => i.progress?.studied === 1 && (i.progress?.mastery_score ?? 0) < 90).slice(0, 12),
    [items]
  );
  const weakPoints = useMemo(
    () => items.filter((i) => (i.progress?.mastery_score ?? 0) < 40 && i.progress?.studied === 1).slice(0, 12),
    [items]
  );
  const reviewPending = useMemo(
    () => items.filter((i) => i.progress?.next_review).slice(0, 12),
    [items]
  );

  const openPreview = useCallback(
    (item: SyllabusItemWithProgress) => {
      if (reducedMotion) { router.push("/estudar"); return; }
      setPreview({
        title: item.title,
        subtitle: item.source_reference ?? undefined,
        discipline: item.discipline,
        mastery: item.progress?.mastery_score ?? 0,
        description: `Domínio: ${item.progress?.mastery_score ?? 0}%. ${item.questions_available} questão(ões) disponível(is).`,
        listId: `syllabus-${item.id}`,
      });
    },
    [reducedMotion, router]
  );

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "todos", label: "Todos" },
    { key: "nao_estudados", label: "Não estudados" },
    { key: "criticos", label: "Críticos" },
    { key: "fracos", label: "Fracos" },
    { key: "dominados", label: "Dominados" },
    { key: "revisao_pendente", label: "Revisão pendente" },
  ];

  return (
    <div className="min-h-screen">
      <TopNav onSearch={() => {}} />

      <div className="pt-20 pb-10 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <p className="text-xs font-bold uppercase tracking-widest text-electric-blue mb-2">
            Base de Conteúdo
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary mb-2">
            📖 Edital Completo
          </h1>
          <p className="text-sm text-text-secondary">
            {items.length} tópicos para dominar
          </p>
        </div>

        {/* Filter toggle */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-xl text-sm font-bold uppercase tracking-wider bg-navy-800 text-text-secondary border border-graphite/50 hover:border-electric-blue/30 hover:text-electric-blue transition-colors"
          >
            {showFilters ? "Ocultar filtros" : "Filtrar conteúdos"} ({FILTERS.find(f => f.key === filter)?.label})
          </button>
          {showFilters && (
            <div className="mt-3 flex flex-wrap gap-2 animate-fade-in-up">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => { setFilter(f.key); setShowFilters(false); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-colors ${
                    filter === f.key
                      ? "bg-electric-blue/15 text-electric-blue border-electric-blue/30"
                      : "bg-navy-800 text-text-muted border-graphite/50 hover:border-graphite"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <ContentPreviewModal
          open={!!preview}
          onClose={() => setPreview(null)}
          title={preview?.title ?? ""}
          subtitle={preview?.subtitle}
          discipline={preview?.discipline}
          mastery={preview?.mastery}
          description={preview?.description}
          onListToggle={
            preview?.listId
              ? () => {
                  has(preview.listId!)
                    ? remove(preview.listId!)
                    : add({ id: preview.listId!, type: "syllabus", title: preview.title, discipline: preview.discipline });
                }
              : undefined
          }
          inList={preview?.listId ? has(preview.listId) : false}
        />

        {loading ? (
          <div className="space-y-10">
            {Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState message="Nenhum item encontrado para este filtro." />
        ) : (
          <div className="space-y-10">
            {/* Continue Studying */}
            {continueStudying.length > 0 && (
              <ContentRow title="CONTINUAR ESTUDANDO" animate={!reducedMotion}>
                {continueStudying.map((item) => (
                  <StudyContentCard
                    key={item.id}
                    variant="syllabus"
                    title={item.title}
                    subtitle={item.source_reference ?? undefined}
                    discipline={item.discipline}
                    mastery={item.progress?.mastery_score ?? 0}
                    progress={item.progress?.mastery_score ?? 0}
                    onClick={() => openPreview(item)}
                    onAction={() => router.push("/estudar")}
                    actionLabel="Estudar"
                    onListToggle={() => {
                      const id = `syllabus-${item.id}`;
                      has(id) ? remove(id) : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                    }}
                    inList={has(`syllabus-${item.id}`)}
                    animate={!reducedMotion}
                  />
                ))}
              </ContentRow>
            )}

            {/* Weak Points */}
            {weakPoints.length > 0 && (
              <ContentRow title="PONTOS FRACOS" animate={!reducedMotion}>
                {weakPoints.map((item) => (
                  <StudyContentCard
                    key={item.id}
                    variant="weakness"
                    title={item.title}
                    discipline={item.discipline}
                    mastery={item.progress?.mastery_score ?? 0}
                    badge="FRACO"
                    badgeColor="red"
                    onClick={() => openPreview(item)}
                    onAction={() => router.push("/questoes")}
                    actionLabel="Treinar"
                    animate={!reducedMotion}
                  />
                ))}
              </ContentRow>
            )}

            {/* Review Pending */}
            {reviewPending.length > 0 && (
              <ContentRow title="REVISÃO RECOMENDADA" viewAllHref="/revisao" animate={!reducedMotion}>
                {reviewPending.map((item) => (
                  <StudyContentCard
                    key={item.id}
                    variant="review"
                    title={item.title}
                    discipline={item.discipline}
                    mastery={item.progress?.mastery_score ?? 0}
                    badge={item.progress?.next_review ? new Date(item.progress.next_review + "T12:00:00").toLocaleDateString("pt-BR") : undefined}
                    badgeColor="gold"
                    onClick={() => openPreview(item)}
                    onAction={() => router.push("/revisao")}
                    actionLabel="Revisar"
                    animate={!reducedMotion}
                  />
                ))}
              </ContentRow>
            )}

            {/* By Discipline */}
            {Object.entries(byDiscipline).map(([discipline, items]) => {
              if (items.length === 0) return null;
              const icon = discipline.includes("Portuguesa") ? "📖" : discipline.includes("Matemática") ? "🔢" : "⚙️";
              return (
                <ContentRow
                  key={discipline}
                  title={`${icon} ${discipline.toUpperCase()}`}
                  animate={!reducedMotion}
                >
                  {items.slice(0, 16).map((item) => (
                    <StudyContentCard
                      key={item.id}
                      variant="syllabus"
                      title={item.title}
                      subtitle={item.source_reference ?? undefined}
                      discipline={item.discipline}
                      mastery={item.progress?.mastery_score ?? 0}
                      progress={item.progress?.mastery_score ?? 0}
                      onClick={() => openPreview(item)}
                      onListToggle={() => {
                        const id = `syllabus-${item.id}`;
                        has(id) ? remove(id) : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                      }}
                      inList={has(`syllabus-${item.id}`)}
                      animate={!reducedMotion}
                    />
                  ))}
                </ContentRow>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">📋</div>
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
