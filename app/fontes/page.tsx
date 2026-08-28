"use client";

import { useEffect, useMemo, useState } from "react";

const CATEGORIES = [
  "EDITAL", "PROVA", "GABARITO", "LEGISLACAO", "DIREITOS_HUMANOS", "NORMA_PMESP",
  "DIRETRIZ", "NOTA_DE_INSTRUCAO", "ORDEM_DE_SERVICO", "DESPACHO", "PORTARIA", "ICC",
  "PROCESSO_OPERACIONAL", "APOSTILA", "OUTRO",
] as const;

interface SourceDocument {
  sha256: string;
  original_name: string;
  category: string;
  confidence: number;
  validation_status: string;
  destination: string;
  detected_year?: number | null;
  detected_board?: string | null;
  detected_number?: string | null;
  is_official?: boolean;
}

interface UploadResult {
  fileName: string;
  success?: boolean;
  duplicate?: boolean;
  storage?: string;
  classification?: { category: string; confidence: number; destination: string; needsReview: boolean };
  warning?: string;
  error?: string;
}

export default function FontesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [pending, setPending] = useState<SourceDocument[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { category: string; official: boolean; authority: string; cutoff: boolean }>>({});

  async function loadPending() {
    setLoadingPending(true);
    try {
      const response = await fetch("/api/sources?status=NEEDS_REVIEW", { cache: "no-store" });
      const payload = await response.json();
      setPending(Array.isArray(payload.documents) ? payload.documents : []);
    } catch {
      setPending([]);
    } finally {
      setLoadingPending(false);
    }
  }

  useEffect(() => { void loadPending(); }, []);

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  async function uploadAll() {
    if (files.length === 0 || sending) return;
    setSending(true);
    setResults([]);
    const nextResults: UploadResult[] = [];

    for (const file of files) {
      try {
        const form = new FormData();
        form.append("file", file);
        const response = await fetch("/api/sources/upload", { method: "POST", body: form });
        const payload = await response.json();
        nextResults.push({ fileName: file.name, ...payload });
      } catch {
        nextResults.push({ fileName: file.name, error: "Falha de rede durante o envio." });
      }
      setResults([...nextResults]);
    }

    setSending(false);
    setFiles([]);
    await loadPending();
  }

  function draftFor(doc: SourceDocument) {
    return drafts[doc.sha256] ?? {
      category: doc.category,
      official: Boolean(doc.is_official),
      authority: "",
      cutoff: true,
    };
  }

  async function validate(doc: SourceDocument) {
    const draft = draftFor(doc);
    setValidating(doc.sha256);
    try {
      const response = await fetch(`/api/sources/${doc.sha256}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: draft.category,
          is_official: draft.official,
          source_authority: draft.authority || null,
          edital_cutoff_applicable: draft.cutoff,
        }),
      });
      if (!response.ok) throw new Error("Falha na validação");
      setPending((current) => current.filter((item) => item.sha256 !== doc.sha256));
    } finally {
      setValidating(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="utility-header">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Central de fontes</p>
        <h1 className="mt-1 text-2xl font-black text-text-primary">Ingerir, classificar e validar documentos</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Provas, gabaritos, editais, normas e legislação entram primeiro como fonte rastreável. Documento duvidoso não alimenta questões nem conteúdo até ser validado.
        </p>
      </header>

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <label className="block text-sm font-bold text-text-primary" htmlFor="source-file">Arquivos</label>
        <p className="mt-1 text-xs text-text-muted">PDF, DOCX, TXT, JSON ou CSV. Até 50 MB por arquivo.</p>
        <input
          id="source-file"
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.json,.csv,application/pdf,text/plain,application/json,text/csv"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          className="mt-4 block w-full rounded-xl border border-graphite/40 bg-navy-950 p-3 text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-electric-blue/15 file:px-3 file:py-2 file:font-bold file:text-electric-blue"
        />

        {files.length > 0 && (
          <div className="mt-4 rounded-xl border border-graphite/30 bg-navy-950 p-3 text-xs text-text-secondary">
            <p className="font-bold text-text-primary">{files.length} arquivo(s) selecionado(s)</p>
            <p className="mt-1">Total: {(totalSize / 1024 / 1024).toFixed(2)} MB</p>
            <ul className="mt-2 max-h-32 space-y-1 overflow-auto">
              {files.map((file) => <li key={`${file.name}-${file.size}`} className="truncate">{file.name}</li>)}
            </ul>
          </div>
        )}

        <button
          onClick={uploadAll}
          disabled={files.length === 0 || sending}
          className="mt-4 w-full rounded-xl bg-electric-blue px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {sending ? "Processando fila..." : `Enviar ${files.length || ""} arquivo(s)`}
        </button>
      </section>

      {results.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-black text-text-primary">Resultado da ingestão</h2>
          {results.map((result, index) => (
            <div key={`${result.fileName}-${index}`} className={`rounded-xl border p-3 ${result.error ? "border-alert-red/30 bg-alert-red/5" : "border-graphite/40 bg-navy-900"}`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="min-w-0 truncate text-sm font-bold text-text-primary">{result.fileName}</p>
                <div className="flex gap-2 text-[10px] font-bold">
                  {result.duplicate && <span className="rounded-full bg-warning-gold/15 px-2 py-1 text-warning-gold">DUPLICADO</span>}
                  {result.classification?.needsReview && <span className="rounded-full bg-alert-red/15 px-2 py-1 text-alert-red">REVISAR</span>}
                </div>
              </div>
              {result.error ? <p className="mt-1 text-xs text-alert-red">{result.error}</p> : (
                <p className="mt-1 text-xs text-text-secondary">{result.classification?.category} · {result.classification?.confidence}% · {result.storage}</p>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Controle de qualidade</p>
            <h2 className="mt-1 text-lg font-black text-text-primary">Pendentes de validação</h2>
          </div>
          <button onClick={loadPending} className="rounded-lg border border-graphite/40 px-3 py-2 text-xs font-bold text-text-secondary">Atualizar</button>
        </div>

        {loadingPending ? <p className="mt-4 text-sm text-text-muted">Carregando...</p> : pending.length === 0 ? (
          <p className="mt-4 rounded-xl border border-success-green/20 bg-success-green/5 p-3 text-sm text-success-green">Nenhuma fonte pendente.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {pending.map((doc) => {
              const draft = draftFor(doc);
              return (
                <article key={doc.sha256} className="rounded-xl border border-graphite/40 bg-navy-950 p-4">
                  <p className="break-words text-sm font-black text-text-primary">{doc.original_name}</p>
                  <p className="mt-1 text-xs text-text-muted">Sugestão: {doc.category} · confiança {doc.confidence}%</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-xs font-bold text-text-secondary">Categoria
                      <select value={draft.category} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, category: e.target.value } }))} className="mt-1 w-full rounded-lg border border-graphite/40 bg-navy-900 p-2 text-sm text-text-primary">
                        {CATEGORIES.map((category) => <option key={category}>{category}</option>)}
                      </select>
                    </label>
                    <label className="text-xs font-bold text-text-secondary">Órgão/fonte oficial
                      <input value={draft.authority} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, authority: e.target.value } }))} placeholder="Ex.: PMESP, VUNESP, Senado" className="mt-1 w-full rounded-lg border border-graphite/40 bg-navy-900 p-2 text-sm text-text-primary" />
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-text-secondary">
                    <label className="flex items-center gap-2"><input type="checkbox" checked={draft.official} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, official: e.target.checked } }))} /> Fonte oficial</label>
                    <label className="flex items-center gap-2"><input type="checkbox" checked={draft.cutoff} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, cutoff: e.target.checked } }))} /> Aplicável ao corte do edital</label>
                  </div>
                  <button onClick={() => validate(doc)} disabled={validating === doc.sha256} className="mt-4 rounded-lg bg-success-green px-4 py-2 text-xs font-black text-navy-950 disabled:opacity-50">
                    {validating === doc.sha256 ? "Validando..." : "Confirmar fonte"}
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["Provas + gabaritos", "Vínculo por concurso, ano, banca e fonte. Gabarito nunca é inferido como oficial."],
          ["Normas + legislação", "Versão, vigência e corte temporal do edital precisam ser controlados."],
          ["Rastreabilidade", "Questão real deve manter documento, página e gabarito oficial de origem."],
        ].map(([title, text]) => <div key={title} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4"><h3 className="text-sm font-black text-text-primary">{title}</h3><p className="mt-1 text-xs leading-relaxed text-text-secondary">{text}</p></div>)}
      </section>
    </div>
  );
}
