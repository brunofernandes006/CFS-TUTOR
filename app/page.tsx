"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { TopNav } from "@/components/streaming/TopNav";
import { Hero } from "@/components/streaming/Hero";
import { ContentRow } from "@/components/streaming/ContentRow";
import { StudyContentCard } from "@/components/streaming/StudyContentCard";
import { SearchOverlay } from "@/components/streaming/SearchOverlay";
import { ContentPreviewModal } from "@/components/streaming/ContentPreviewModal";
import { SkeletonHero, SkeletonRow } from "@/components/streaming/Skeletons";
import { useHomeData } from "@/hooks/useHomeData";
import { useMyList } from "@/hooks/useMyList";
import { useReducedMotion } from "@/hooks/useReducedMotion";

interface PreviewData {
  title: string;
  subtitle?: string;
  discipline?: string;
  badge?: string;
  mastery?: number;
  description?: string;
  onClick?: () => void;
  actionLabel?: string;
  listId?: string;
}

export default function HomePage() {
  const { data, loading, error } = useHomeData();
  const { list, add, remove, has, flashId } = useMyList();
  const [searchOpen, setSearchOpen] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const router = useRouter();
  const reducedMotion = useReducedMotion();

  const openPreview = useCallback(
    (p: PreviewData) => {
      if (reducedMotion) {
        p.onClick?.();
        return;
      }
      setPreview(p);
    },
    [reducedMotion]
  );

  if (loading)
    return (
      <div className="min-h-screen">
        <SkeletonHero />
        <div className="space-y-10 pb-16 -mt-20 relative z-10">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </div>
      </div>
    );
  if (error) return <ErrorScreen />;
  if (!data) return (
    <div className="min-h-screen">
      <TopNav onSearch={() => setSearchOpen(true)} />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <p className="text-sm" style={{ color: "var(--muted)" }}>Nenhum dado disponível.</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-lg text-sm font-bold" style={{ background: "var(--navy-3)", color: "var(--text)" }}>
            Recarregar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <TopNav
        level={data.stats?.level}
        xp={data.stats?.xp}
        streak={data.stats?.streak}
        onSearch={() => setSearchOpen(true)}
      />
      <SearchOverlay
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
      <ContentPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ""}
        subtitle={preview?.subtitle}
        discipline={preview?.discipline}
        badge={preview?.badge}
        mastery={preview?.mastery}
        description={preview?.description}
        onAction={preview?.onClick ? () => { preview.onClick!(); setPreview(null); } : undefined}
        actionLabel={preview?.actionLabel}
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

      {/* Hero */}
      <Hero
        mission={
          data.mission?.slots?.[0]
            ? {
                title: data.mission.slots[0].title,
                discipline: data.mission.slots[0].discipline,
                priority:
                  data.mission.slots[0].priority_score >= 8 ? "Alta" : "Média",
                duration: `${data.mission.target_duration_minutes} minutos`,
                mastery: data.mission.slots[0].mastery_score,
              }
            : null
        }
        stats={{
          level: data.stats?.level ?? "Recruta",
          xp: data.stats?.xp ?? 0,
          streak: data.stats?.streak ?? 0,
          readiness: data.stats?.readiness?.readiness_display ?? 0,
        }}
        onContinue={() => router.push("/missoes")}
      />

      <div className="space-y-10 pb-16 -mt-20 relative z-10">
        {/* Continue Studying */}
        {data.continueStudying.length > 0 && (
          <ContentRow title="CONTINUAR ESTUDANDO" animate={!reducedMotion}>
            {data.continueStudying.map((item, i) => (
              <StudyContentCard
                key={item.id}
                variant="syllabus"
                title={item.title}
                subtitle={item.source_reference ?? undefined}
                discipline={item.discipline}
                progress={item.progress?.mastery_score ?? 0}
                mastery={item.progress?.mastery_score ?? 0}
                onClick={() => router.push("/estudar")}
                onAction={() => router.push("/questoes")}
                actionLabel="Treinar"
                onPreview={() =>
                  openPreview({
                    title: item.title,
                    subtitle: item.source_reference ?? undefined,
                    discipline: item.discipline,
                    mastery: item.progress?.mastery_score ?? 0,
                    description: `Item do edital com domínio de ${item.progress?.mastery_score ?? 0}%. Estude e resolva questões para aumentar seu desempenho.`,
                    onClick: () => router.push("/estudar"),
                    actionLabel: "Estudar",
                    listId: `syllabus-${item.id}`,
                  })
                }
                onListToggle={() => {
                  const id = `syllabus-${item.id}`;
                  has(id)
                    ? remove(id)
                    : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                }}
                inList={has(`syllabus-${item.id}`)}
                animate={!reducedMotion}
              />
            ))}
          </ContentRow>
        )}

        {/* Recommended */}
        {data.recommended.length > 0 && (
          <ContentRow title="RECOMENDADO PARA VOCÊ" animate={!reducedMotion}>
            {data.recommended.map((item) => (
              <StudyContentCard
                key={item.id}
                variant="syllabus"
                title={item.title}
                subtitle={item.source_reference ?? undefined}
                discipline={item.discipline}
                mastery={item.progress?.mastery_score ?? 0}
                onClick={() => router.push("/estudar")}
                onAction={() => {
                  const id = `syllabus-${item.id}`;
                  has(id)
                    ? remove(id)
                    : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                }}
                actionLabel={has(`syllabus-${item.id}`) ? "Remover" : "+ Minha Lista"}
                onPreview={() =>
                  openPreview({
                    title: item.title,
                    subtitle: item.source_reference ?? undefined,
                    discipline: item.discipline,
                    mastery: item.progress?.mastery_score ?? 0,
                    description: `Recomendado para estudo. Domínio atual: ${item.progress?.mastery_score ?? 0}%.`,
                    onClick: () => router.push("/estudar"),
                    actionLabel: "Estudar",
                    listId: `syllabus-${item.id}`,
                  })
                }
                onListToggle={() => {
                  const id = `syllabus-${item.id}`;
                  has(id)
                    ? remove(id)
                    : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                }}
                inList={has(`syllabus-${item.id}`)}
                animate={!reducedMotion}
              />
            ))}
          </ContentRow>
        )}

        {/* Strategic Review */}
        {(data.reviews?.overdue?.length > 0 ||
          data.reviews?.today?.length > 0) && (
          <ContentRow title="REVISÃO ESTRATÉGICA" viewAllHref="/revisao" animate={!reducedMotion}>
            {[...data.reviews.overdue, ...data.reviews.today]
              .slice(0, 10)
              .map((item: any) => (
                <StudyContentCard
                  key={item.syllabus_item_id}
                  variant="review"
                  title={item.title}
                  discipline={item.discipline}
                  mastery={Math.round(item.mastery_score * 100)}
                  badge={item.overdue ? "VENCIDA" : "HOJE"}
                  badgeColor={item.overdue ? "red" : "gold"}
                  onClick={() => router.push("/revisao")}
                  onAction={() => router.push("/revisao")}
                  actionLabel="Revisar Agora"
                  animate={!reducedMotion}
                />
              ))}
          </ContentRow>
        )}

        {/* Weak Points */}
        {data.weakPoints.length > 0 && (
          <ContentRow title="REFORCE ESTES PONTOS" animate={!reducedMotion}>
            {data.weakPoints.map((item) => (
              <StudyContentCard
                key={item.id}
                variant="weakness"
                title={item.title}
                discipline={item.discipline}
                mastery={item.progress?.mastery_score ?? 0}
                badge="FRACO"
                badgeColor="red"
                onClick={() => router.push("/estudar")}
                onAction={() => router.push("/questoes")}
                actionLabel="Treinar"
                onPreview={() =>
                  openPreview({
                    title: item.title,
                    discipline: item.discipline,
                    mastery: item.progress?.mastery_score ?? 0,
                    badge: "FRACO",
                    description: `Ponto fraco com domínio de ${item.progress?.mastery_score ?? 0}%. Recomendamos foco neste tópico.`,
                    onClick: () => router.push("/estudar"),
                    actionLabel: "Treinar",
                    listId: `syllabus-${item.id}`,
                  })
                }
                onListToggle={() => {
                  const id = `syllabus-${item.id}`;
                  has(id)
                    ? remove(id)
                    : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                }}
                inList={has(`syllabus-${item.id}`)}
                animate={!reducedMotion}
              />
            ))}
          </ContentRow>
        )}

        {/* Discipline Rows */}
        {Object.entries(data.byDiscipline).map(([discipline, items]) => {
          if (!items || items.length === 0) return null;
          const icon = discipline.includes("Portuguesa")
            ? "📖"
            : discipline.includes("Matemática")
              ? "🔢"
              : "⚙️";
          return (
            <ContentRow
              key={discipline}
              title={`${icon} ${discipline.toUpperCase()}`}
              viewAllHref="/estudar"
              animate={!reducedMotion}
            >
              {items.slice(0, 12).map((item: any) => (
                <StudyContentCard
                  key={item.id}
                  variant="syllabus"
                  title={item.title}
                  discipline={item.discipline}
                  mastery={item.progress?.mastery_score ?? 0}
                  progress={item.progress?.mastery_score ?? 0}
                  onClick={() => router.push("/estudar")}
                  onAction={() => {
                    const id = `syllabus-${item.id}`;
                    has(id)
                      ? remove(id)
                      : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                  }}
                  actionLabel={has(`syllabus-${item.id}`) ? "Remover" : "+ Lista"}
                  onListToggle={() => {
                    const id = `syllabus-${item.id}`;
                    has(id)
                      ? remove(id)
                      : add({ id, type: "syllabus", title: item.title, discipline: item.discipline });
                  }}
                  inList={has(`syllabus-${item.id}`)}
                  animate={!reducedMotion}
                />
              ))}
            </ContentRow>
          );
        })}

        {/* CFS/26 ICC */}
        {data.cfs26Icc.length > 0 && (
          <ContentRow
            title="⭐ ICC — PRIORIDADE CFS/26"
            viewAllHref="/biblioteca"
            animate={!reducedMotion}
          >
            {data.cfs26Icc.map((item: any) => (
              <StudyContentCard
                key={item.id}
                variant="syllabus"
                title={item.title}
                subtitle={item.source_reference ?? undefined}
                discipline={item.discipline}
                mastery={item.progress?.mastery_score ?? 0}
                badge="CFS/26"
                badgeColor="gold"
                onClick={() => router.push("/estudar")}
                onAction={() => router.push("/biblioteca")}
                actionLabel="Estudar"
                animate={!reducedMotion}
              />
            ))}
          </ContentRow>
        )}

        {/* Operations */}
        <ContentRow title="🏁 OPERAÇÕES" animate={!reducedMotion}>
          <StudyContentCard
            variant="simulation"
            title="Operação Oficial"
            subtitle="60 questões · 3h30 · Pesos oficiais"
            icon="🏅"
            onClick={() => router.push("/simulados")}
            animate={!reducedMotion}
          />
          <StudyContentCard
            variant="simulation"
            title="Operação Adaptativa"
            subtitle="Personalizada · Sem limite de tempo"
            icon="🎯"
            onClick={() => router.push("/simulados")}
            animate={!reducedMotion}
          />
          {data.simulations?.[0] && (
            <StudyContentCard
              variant="simulation"
              title="Última Operação"
              subtitle={`Nota: ${data.simulations[0].weighted_final_score ?? 0}`}
              icon="📊"
              onClick={() => router.push("/simulados")}
              animate={!reducedMotion}
            />
          )}
        </ContentRow>

        {/* Library */}
        {data.documents.length > 0 && (
          <ContentRow
            title="📚 BIBLIOTECA OPERACIONAL"
            viewAllHref="/biblioteca"
            animate={!reducedMotion}
          >
            {data.documents.slice(0, 12).map((doc: any) => (
              <StudyContentCard
                key={doc.id}
                variant="document"
                title={doc.titulo ?? doc.nome_original ?? "Sem título"}
                subtitle={doc.numero ? `${doc.numero}` : undefined}
                badge={
                  doc.cfs26_priority === 1 ? "CFS/26" : doc.tipo
                }
                badgeColor={
                  doc.cfs26_priority === 1 ? "gold" : "blue"
                }
                onClick={() => router.push("/biblioteca")}
                onAction={() => {
                  if (doc.caminho_original)
                    window.open(doc.caminho_original, "_blank");
                }}
                actionLabel="Abrir"
                animate={!reducedMotion}
              />
            ))}
          </ContentRow>
        )}

        {/* My List */}
        {list.length > 0 && (
          <ContentRow title="📋 MINHA LISTA" animate={!reducedMotion}>
            {list.map((item) => (
              <StudyContentCard
                key={item.id}
                variant={item.type}
                title={item.title}
                subtitle={item.discipline}
                onClick={() =>
                  router.push(
                    item.type === "syllabus" ? "/estudar" : "/biblioteca",
                  )
                }
                onAction={() => remove(item.id)}
                actionLabel="Remover"
                animate={!reducedMotion}
              />
            ))}
          </ContentRow>
        )}
      </div>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <div className="text-4xl">⚠️</div>
        <p className="text-sm text-text-secondary">
          Erro ao carregar dados
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded bg-electric-blue text-white text-sm font-bold"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
