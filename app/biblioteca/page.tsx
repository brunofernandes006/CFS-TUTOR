"use client";

import { useEffect, useState, useCallback } from "react";
import { TopNav } from "@/components/streaming/TopNav";
import { ContentRow } from "@/components/streaming/ContentRow";
import { StudyContentCard } from "@/components/streaming/StudyContentCard";
import { SearchOverlay } from "@/components/streaming/SearchOverlay";
import { ContentPreviewModal } from "@/components/streaming/ContentPreviewModal";
import { SkeletonRow } from "@/components/streaming/Skeletons";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import type { Document } from "@/lib/types";

const DOC_TYPE_ROWS: { tipo: string; title: string; icon: string }[] = [
  { tipo: "ICC", title: "ICC — PRIORIDADE CFS/26", icon: "⭐" },
  { tipo: "ICC", title: "ICC", icon: "📋" },
  { tipo: "DIRETRIZ", title: "DIRETRIZES", icon: "📘" },
  { tipo: "NI", title: "NOTAS DE INSTRUÇÃO", icon: "📝" },
  { tipo: "POP", title: "POP", icon: "📄" },
  { tipo: "EDITAL", title: "EDITAIS E PROVAS", icon: "📚" },
  { tipo: "LEGISLACAO", title: "LEGISLAÇÃO", icon: "⚖️" },
];

const TYPE_GRADIENTS: Record<string, string> = {
  ICC: "from-electric-blue/20 to-navy-900",
  DIRETRIZ: "from-cyan-glow/15 to-navy-900",
  NI: "from-warning-gold/15 to-navy-900",
  POP: "from-success-green/10 to-navy-900",
  EDITAL: "from-gold-institution/15 to-navy-900",
  LEGISLACAO: "from-alert-red/10 to-navy-900",
  DESPACHO: "from-steel/20 to-navy-900",
  OS: "from-steel/20 to-navy-900",
};

const TYPE_ICONS: Record<string, string> = {
  ICC: "📋",
  DIRETRIZ: "📘",
  NI: "📝",
  POP: "📄",
  EDITAL: "📚",
  LEGISLACAO: "⚖️",
  DESPACHO: "📨",
  OS: "🔧",
};

interface PreviewDoc {
  title: string;
  subtitle?: string;
  badge?: string;
  description?: string;
  doc?: Document;
}

export default function BibliotecaPage() {
  const reducedMotion = useReducedMotion();
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [tipo, setTipo] = useState("");
  const [preview, setPreview] = useState<PreviewDoc | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (tipo) params.set("tipo", tipo);
    params.set("page", String(page));
    params.set("per_page", "100");
    try {
      const res = await fetch(`/api/library?${params}`);
      if (!res.ok) throw new Error("Erro");
      const data = await res.json();
      setAllDocs(data.documents ?? []);
    } catch {
      setAllDocs([]);
    } finally {
      setLoading(false);
    }
  }, [search, tipo, page]);

  useEffect(() => { load(); }, [load]);

  const byType = (t: string) => allDocs.filter((d) => d.tipo === t);
  const cfs26Docs = allDocs.filter((d) => d.cfs26_priority === 1);
  const recentDocs = [...allDocs].slice(0, 12);

  const handleCopy = async (path: string) => {
    try { await navigator.clipboard.writeText(path); } catch {}
  };

  return (
    <div className="min-h-screen">
      <TopNav onSearch={() => setSearchOpen(true)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

      <ContentPreviewModal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.title ?? ""}
        subtitle={preview?.subtitle}
        badge={preview?.badge}
        description={preview?.description}
        onAction={preview?.doc?.caminho_original ? () => window.open(preview.doc!.caminho_original!, "_blank") : undefined}
        actionLabel="Abrir documento"
      />

      <div className="pt-20 pb-10 px-4 md:px-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in-up">
          <p className="text-xs font-bold uppercase tracking-widest text-electric-blue mb-2">
            Acervo Operacional
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-text-primary mb-2">
            🗂️ Biblioteca Operacional
          </h1>
          <p className="text-sm text-text-secondary">
            {allDocs.length} documento{allDocs.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search + filters bar */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-navy-800 text-text-secondary border border-graphite/50 hover:border-electric-blue/30 hover:text-electric-blue transition-colors"
          >
            🔍 Buscar documentos...
          </button>
          <div className="flex flex-wrap gap-2">
            {DOC_TYPE_ROWS.map((row) => (
              <button
                key={row.tipo}
                type="button"
                onClick={() => setTipo(tipo === row.tipo ? "" : row.tipo)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                  tipo === row.tipo
                    ? "bg-electric-blue/15 text-electric-blue border-electric-blue/30"
                    : "bg-navy-800 text-text-muted border-graphite/50 hover:border-graphite"
                }`}
              >
                {row.icon} {row.title}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="space-y-10">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : allDocs.length === 0 ? (
          <EmptyState message="Nenhum documento encontrado." />
        ) : (
          <div className="space-y-10">
            {/* CFS/26 row */}
            {cfs26Docs.length > 0 && (
              <ContentRow title="⭐ ICC — PRIORIDADE CFS/26" animate={!reducedMotion}>
                {cfs26Docs.slice(0, 12).map((doc) => (
                  <DocCoverCard
                    key={doc.id}
                    doc={doc}
                    onClick={() => setPreview({
                      title: doc.titulo ?? doc.nome_original ?? "Sem título",
                      subtitle: doc.numero ?? undefined,
                      badge: "CFS/26",
                      description: `${doc.tipo} · ${doc.numero ?? "—"} · ${doc.ano ?? "—"}`,
                      doc,
                    })}
                    onOpen={() => doc.caminho_original && window.open(doc.caminho_original, "_blank")}
                    onCopy={() => doc.caminho_original && handleCopy(doc.caminho_original)}
                    animate={!reducedMotion}
                  />
                ))}
              </ContentRow>
            )}

            {/* By type rows */}
            {DOC_TYPE_ROWS.map((row) => {
              const docs = byType(row.tipo);
              if (docs.length === 0) return null;
              return (
                <ContentRow key={`${row.tipo}-${row.title}`} title={`${row.icon} ${row.title}`} animate={!reducedMotion}>
                  {docs.slice(0, 12).map((doc) => (
                    <DocCoverCard
                      key={doc.id}
                      doc={doc}
                      onClick={() => setPreview({
                        title: doc.titulo ?? doc.nome_original ?? "Sem título",
                        subtitle: doc.numero ?? undefined,
                        badge: doc.cfs26_priority === 1 ? "CFS/26" : doc.tipo ?? undefined,
                        description: `${doc.tipo} · ${doc.numero ?? "—"} · ${doc.ano ?? "—"}`,
                        doc,
                      })}
                      onOpen={() => doc.caminho_original && window.open(doc.caminho_original, "_blank")}
                      onCopy={() => doc.caminho_original && handleCopy(doc.caminho_original)}
                      animate={!reducedMotion}
                    />
                  ))}
                </ContentRow>
              );
            })}

            {/* Recent */}
            <ContentRow title="📅 ÚLTIMOS CARREGADOS" animate={!reducedMotion}>
              {recentDocs.map((doc) => (
                <DocCoverCard
                  key={doc.id}
                  doc={doc}
                  onClick={() => setPreview({
                    title: doc.titulo ?? doc.nome_original ?? "Sem título",
                    subtitle: doc.numero ?? undefined,
                        badge: doc.tipo ?? undefined,
                    description: `${doc.tipo} · ${doc.numero ?? "—"}`,
                    doc,
                  })}
                  onOpen={() => doc.caminho_original && window.open(doc.caminho_original, "_blank")}
                  onCopy={() => doc.caminho_original && handleCopy(doc.caminho_original)}
                  animate={!reducedMotion}
                />
              ))}
            </ContentRow>
          </div>
        )}
      </div>
    </div>
  );
}

function DocCoverCard({
  doc, onClick, onOpen, onCopy, animate = false,
}: {
  doc: Document;
  onClick: () => void;
  onOpen: () => void;
  onCopy: () => void;
  animate?: boolean;
}) {
  const gradient = (doc.tipo && TYPE_GRADIENTS[doc.tipo]) || "from-steel/20 to-navy-900";
  const icon = (doc.tipo && TYPE_ICONS[doc.tipo]) || "📄";

  return (
    <div
      className={`
        group relative w-[220px] shrink-0 rounded-xl overflow-hidden border border-graphite/40
        bg-navy-900 cursor-pointer
        transition-all duration-[200ms] ease-out
        hover:scale-[1.05] hover:z-30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.5)]
        ${animate ? "animate-fade-in-up" : ""}
      `}
      onClick={onClick}
    >
      {/* Cover gradient */}
      <div className={`h-28 bg-gradient-to-br ${gradient} flex items-center justify-center`}>
        <span className="text-4xl opacity-60">{icon}</span>
        {doc.cfs26_priority === 1 && (
          <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-gold-institution/20 text-gold-institution border border-gold-institution/40">
            CFS/26
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-electric-blue mb-1">
          {doc.tipo}
        </p>
        <h3 className="text-xs font-semibold text-text-primary leading-snug line-clamp-2 mb-1">
          {doc.titulo ?? doc.nome_original ?? "Sem título"}
        </h3>
        {doc.numero && (
          <p className="text-[10px] text-text-muted">{doc.numero}</p>
        )}
      </div>

      {/* Hover actions */}
      <div className="card-details absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-navy-900 to-transparent">
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpen(); }}
            className="flex-1 px-2 py-1 rounded text-[9px] font-bold uppercase bg-electric-blue/15 text-electric-blue border border-electric-blue/30"
          >
            Abrir
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCopy(); }}
            className="flex-1 px-2 py-1 rounded text-[9px] font-bold uppercase bg-navy-800 text-text-muted border border-graphite/50"
          >
            Copiar
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-20">
      <div className="text-4xl mb-4">🗂️</div>
      <p className="text-sm text-text-secondary">{message}</p>
    </div>
  );
}
