"use client";

import { useEffect, useState } from "react";
import {
  SectionHeader,
  TacticalCard,
  TacticalPanel,
  TacticalButton,
  DisciplineBadge,
  StatusBadge,
  LoadingState,
  AlertPanel,
} from "@/components/ui";
import type { ReviewItem } from "@/lib/types";

interface ReviewData {
  overdue: ReviewItem[];
  today: ReviewItem[];
  upcoming: ReviewItem[];
}

const STAGE_LABELS = ["1d", "3d", "7d", "15d", "30d"];

export default function RevisaoPage() {
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/reviews")
      .then((r) => {
        if (!r.ok) throw new Error("Erro ao carregar revisões.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState message="Carregando reciclagens..." />;
  if (error) return (
    <div className="space-y-6">
      <SectionHeader title="🔄 Reciclagem" />
      <AlertPanel type="error" title="Erro ao carregar" message={error} />
    </div>
  );
  if (!data) return null;

  const total = data.overdue.length + data.today.length + data.upcoming.length;

  return (
    <div className="space-y-6">
      <SectionHeader 
        title="🔄 Reciclagem"
        subtitle={`Revisão espaçada · ${total} item${total !== 1 ? "s" : ""} no ciclo`}
      />

      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Modelo de revisão */}
        <TacticalPanel title="📖 Modelo Espaçado">
          <div className="flex flex-wrap gap-2">
            {["❌ Erro → 1d", "✓ 1º → 3d", "✓✓ 2º → 7d", "✓✓✓ 3º → 15d", "✓✓✓✓ 4º+ → 30d"].map((s, i) => (
              <span key={i} className="px-3 py-1.5 rounded text-xs font-bold uppercase bg-navy-800 text-text-secondary border border-graphite">
                {s}
              </span>
            ))}
          </div>
        </TacticalPanel>

        {total === 0 ? (
          <AlertPanel
            type="success"
            title="Revisões em dia"
            message="Excelente! Nenhuma revisão pendente. Continue respondendo questões para aprimorar seu domínio."
          />
        ) : (
          <>
            <ReviewSection title="⚠️ Vencidas" items={data.overdue} accentColor="alert-red" />
            <ReviewSection title="📅 Para Hoje" items={data.today} accentColor="warning-gold" />
            <ReviewSection title="🗓️ Próximas" items={data.upcoming} accentColor="electric-blue" />
          </>
        )}
      </div>
    </div>
  );
}

function ReviewSection({ title, items, accentColor }: {
  title: string; items: ReviewItem[]; accentColor: "alert-red" | "warning-gold" | "electric-blue";
}) {
  if (items.length === 0) return null;
  
  const colorMap = {
    "alert-red": "text-alert-red border-alert-red",
    "warning-gold": "text-warning-gold border-warning-gold",
    "electric-blue": "text-electric-blue border-electric-blue",
  };
  
  return (
    <div className="space-y-3">
      <h2 className={`text-sm font-bold uppercase tracking-widest border-l-4 pl-3 py-2 ${colorMap[accentColor]}`}>
        {title} ({items.length})
      </h2>
      <div className="space-y-3">
        {items.map((item) => (
          <TacticalCard key={item.syllabus_item_id} bordered>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-bold text-text-primary mb-2">{item.title}</p>
                <div className="flex items-center gap-2 flex-wrap text-xs">
                  <DisciplineBadge discipline={item.discipline as "Português" | "Matemática" | "Profissionais"} size="small" />
                  <span className="px-2 py-1 rounded bg-navy-900 text-electric-blue border border-electric-blue font-bold uppercase">
                    Domínio: {Math.round(item.mastery_score * 100)}%
                  </span>
                  <span className="px-2 py-1 rounded bg-navy-900 text-gold-institution border border-gold-institution font-bold uppercase">
                    Est. {item.review_stage} (1d-30d)
                  </span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-xs text-text-muted mb-1">
                  {item.next_review
                    ? new Date(item.next_review + "T12:00:00").toLocaleDateString("pt-BR")
                    : "—"}
                </p>
                <TacticalButton variant="primary" size="small">
                  Revisar
                </TacticalButton>
              </div>
            </div>
          </TacticalCard>
        ))}
      </div>
    </div>
  );
}
