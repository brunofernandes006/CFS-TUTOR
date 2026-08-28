"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EditalSource = {
  id: string;
  original_name: string;
  extraction_status: string;
  validation_status: string;
  is_official: boolean;
};

type Candidate = {
  id: string;
  discipline_code: "PROF" | "PORT" | "MAT";
  edital_code: string;
  parent_edital_code: string | null;
  title: string;
  source_page: number | null;
  parser_confidence: number;
  status: string;
};

const DISCIPLINE_LABEL: Record<Candidate["discipline_code"], string> = {
  PROF: "Conhecimentos Profissionais",
  PORT: "Língua Portuguesa",
  MAT: "Matemática",
};

export default function EditalWorkspacePage() {
  const [sources, setSources] = useState<EditalSource[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadSources() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/sources?status=VALIDATED&category=EDITAL", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao carregar editais.");
      const rows = Array.isArray(payload.documents) ? payload.documents : [];
      const official = rows.filter((row: EditalSource) => row.is_official);
      setSources(official);
      if (!sourceId && official[0]?.id) setSourceId(official[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar editais.");
    } finally {
      setLoading(false);
    }
  }

  async function loadCandidates(id: string) {
    if (!id) {
      setCandidates([]);
      setSelected(new Set());
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const response = await fetch(`/api/sources/edital?sourceDocumentId=${encodeURIComponent(id)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao carregar candidatos.");
      const rows: Candidate[] = Array.isArray(payload.candidates) ? payload.candidates : [];
      setCandidates(rows);
      setSelected(new Set(rows.filter((row) => row.status !== "REJECTED").map((row) => row.id)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao carregar candidatos.");
    } finally {
      setProcessing(false);
    }
  }

  useEffect(() => { void loadSources(); }, []);
  useEffect(() => { if (sourceId) void loadCandidates(sourceId); }, [sourceId]);

  const grouped = useMemo(() => {
    return candidates.reduce<Record<string, Candidate[]>>((acc, candidate) => {
      (acc[candidate.discipline_code] ??= []).push(candidate);
      return acc;
    }, {});
  }, [candidates]);

  async function extract() {
    if (!sourceId) return;
    setProcessing(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/sources/edital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDocumentId: sourceId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao extrair edital.");
      setMessage(`${payload.extractedCandidates ?? 0} item(ns) extraído(s) para revisão.`);
      await loadCandidates(sourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao extrair edital.");
    } finally {
      setProcessing(false);
    }
  }

  async function promoteSelected() {
    if (!sourceId || selected.size === 0) return;
    setProcessing(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/sources/edital", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDocumentId: sourceId, candidateIds: [...selected] }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao confirmar edital.");
      setMessage(`${payload.promoted ?? 0} item(ns) confirmado(s) na árvore oficial do edital.`);
      await loadCandidates(sourceId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao confirmar edital.");
    } finally {
      setProcessing(false);
    }
  }

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-12">
      <header className="utility-header">
        <Link href="/fontes" className="text-xs font-bold text-electric-blue">← Central de Fontes</Link>
        <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Edital vigente</p>
        <h1 className="mt-1 text-2xl font-black text-text-primary">Validar árvore de conteúdos</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          O sistema só usa itens confirmados de um edital oficial validado. A extração automática gera candidatos; você controla o que entra na árvore de estudo.
        </p>
      </header>

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        {loading ? <p className="text-sm text-text-muted">Carregando editais...</p> : sources.length === 0 ? (
          <div className="rounded-xl border border-warning-gold/25 bg-warning-gold/5 p-4 text-sm text-warning-gold">
            Nenhum edital oficial validado está disponível. Volte à Central de Fontes, envie o edital vigente, marque-o como oficial e confirme a fonte.
          </div>
        ) : (
          <>
            <label className="text-xs font-bold text-text-secondary">Edital oficial
              <select value={sourceId} onChange={(event) => setSourceId(event.target.value)} className="mt-1 w-full rounded-xl border border-graphite/40 bg-navy-950 p-3 text-sm text-text-primary">
                {sources.map((source) => <option key={source.id} value={source.id}>{source.original_name} · {source.extraction_status}</option>)}
              </select>
            </label>
            <button onClick={extract} disabled={!sourceId || processing} className="mt-4 w-full rounded-xl bg-electric-blue px-4 py-3 text-sm font-black text-white disabled:opacity-40 sm:w-auto">
              {processing ? "Processando..." : "Extrair itens para revisão"}
            </button>
          </>
        )}
      </section>

      {error && <div className="rounded-xl border border-alert-red/30 bg-alert-red/5 p-4 text-sm text-alert-red">{error}</div>}
      {message && <div className="rounded-xl border border-success-green/25 bg-success-green/5 p-4 text-sm text-success-green">{message}</div>}

      {candidates.length > 0 && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Revisão humana</p>
              <h2 className="text-lg font-black text-text-primary">{candidates.length} candidato(s)</h2>
            </div>
            <button onClick={() => setSelected(new Set(candidates.map((candidate) => candidate.id)))} className="rounded-lg border border-graphite/40 px-3 py-2 text-xs font-bold text-text-secondary">Selecionar todos</button>
          </div>

          {(["PROF", "PORT", "MAT"] as const).map((code) => grouped[code]?.length ? (
            <div key={code} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4">
              <h3 className="text-sm font-black text-text-primary">{DISCIPLINE_LABEL[code]}</h3>
              <div className="mt-3 space-y-2">
                {grouped[code].map((candidate) => (
                  <label key={candidate.id} className="flex items-start gap-3 rounded-xl border border-graphite/30 bg-navy-950 p-3">
                    <input type="checkbox" checked={selected.has(candidate.id)} onChange={() => toggle(candidate.id)} className="mt-1" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black text-electric-blue">{candidate.edital_code}</span>
                      <span className="mt-1 block text-sm text-text-primary">{candidate.title}</span>
                      <span className="mt-1 block text-[11px] text-text-muted">Página {candidate.source_page ?? "?"} · confiança {candidate.parser_confidence}% · {candidate.status}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : null)}

          <div className="sticky bottom-20 rounded-2xl border border-electric-blue/30 bg-navy-950/95 p-4 shadow-2xl backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-bold text-text-primary">{selected.size} item(ns) selecionado(s)</p>
              <button onClick={promoteSelected} disabled={selected.size === 0 || processing} className="rounded-xl bg-success-green px-4 py-3 text-sm font-black text-navy-950 disabled:opacity-40">
                Confirmar na árvore oficial
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
