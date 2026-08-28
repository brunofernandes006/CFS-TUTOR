"use client";

import { useState } from "react";

interface UploadResult {
  success?: boolean;
  duplicate?: boolean;
  storage?: string;
  classification?: {
    category: string;
    confidence: number;
    destination: string;
    needsReview: boolean;
    detected?: { year?: number; board?: string; number?: string };
  };
  warning?: string;
  error?: string;
}

export default function FontesPage() {
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function upload() {
    if (!file || sending) return;
    setSending(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/sources/upload", { method: "POST", body: form });
      const payload = await response.json();
      setResult(payload);
    } catch {
      setResult({ error: "Falha de rede durante o envio." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="utility-header">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Central de fontes</p>
        <h1 className="mt-1 text-2xl font-black text-text-primary">Adicionar documentos ao CFS Tutor</h1>
        <p className="mt-2 max-w-2xl text-sm text-text-secondary">
          Envie provas, gabaritos, editais, normas, legislação, ICC, processos operacionais e materiais complementares. O arquivo recebe hash, classificação e destino antes de poder alimentar o estudo.
        </p>
      </header>

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <label className="block text-sm font-bold text-text-primary" htmlFor="source-file">Arquivo</label>
        <p className="mt-1 text-xs text-text-muted">PDF, DOCX, TXT, JSON ou CSV. Limite: 50 MB.</p>
        <input
          id="source-file"
          type="file"
          accept=".pdf,.docx,.txt,.json,.csv,application/pdf,text/plain,application/json,text/csv"
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
          className="mt-4 block w-full rounded-xl border border-graphite/40 bg-navy-950 p-3 text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-electric-blue/15 file:px-3 file:py-2 file:font-bold file:text-electric-blue"
        />

        {file && (
          <div className="mt-4 rounded-xl border border-graphite/30 bg-navy-950 p-3 text-xs text-text-secondary">
            <p className="font-bold text-text-primary">{file.name}</p>
            <p className="mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB · {file.type || "tipo não informado"}</p>
          </div>
        )}

        <button
          onClick={upload}
          disabled={!file || sending}
          className="mt-4 w-full rounded-xl bg-electric-blue px-5 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
        >
          {sending ? "Analisando e enviando..." : "Enviar e classificar"}
        </button>
      </section>

      {result && (
        <section className={`rounded-2xl border p-5 ${result.error ? "border-alert-red/30 bg-alert-red/5" : "border-success-green/30 bg-success-green/5"}`}>
          {result.error ? (
            <><h2 className="font-black text-alert-red">Falha no upload</h2><p className="mt-2 text-sm text-text-secondary">{result.error}</p></>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-black text-text-primary">Documento processado</h2>
                {result.duplicate && <span className="rounded-full bg-warning-gold/15 px-2.5 py-1 text-[10px] font-bold text-warning-gold">DUPLICADO</span>}
                {result.classification?.needsReview && <span className="rounded-full bg-alert-red/15 px-2.5 py-1 text-[10px] font-bold text-alert-red">REVISAR</span>}
              </div>
              <dl className="mt-4 grid gap-3 sm:grid-cols-2">
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Categoria</dt><dd className="text-sm font-bold text-text-primary">{result.classification?.category}</dd></div>
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Confiança</dt><dd className="text-sm font-bold text-text-primary">{result.classification?.confidence}%</dd></div>
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Destino</dt><dd className="text-sm text-text-secondary">{result.classification?.destination}</dd></div>
                <div><dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Armazenamento</dt><dd className="text-sm text-text-secondary">{result.storage}</dd></div>
                {result.classification?.detected?.year && <div><dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Ano</dt><dd className="text-sm text-text-secondary">{result.classification.detected.year}</dd></div>}
                {result.classification?.detected?.board && <div><dt className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Banca</dt><dd className="text-sm text-text-secondary">{result.classification.detected.board}</dd></div>}
              </dl>
              {result.warning && <p className="mt-4 rounded-xl border border-warning-gold/20 bg-warning-gold/5 p-3 text-xs text-warning-gold">{result.warning}</p>}
            </>
          )}
        </section>
      )}

      <section className="grid gap-3 md:grid-cols-3">
        {[
          ["Provas + gabaritos", "O vínculo deve usar concurso, ano, banca e fonte oficial. Nenhum gabarito é inferido."],
          ["Normas + legislação", "Versão, vigência e corte temporal do edital precisam ser controlados antes de usar no estudo."],
          ["Documentos duvidosos", "Classificações com baixa confiança ficam pendentes e não contaminam o banco."],
        ].map(([title, text]) => <div key={title} className="rounded-2xl border border-graphite/40 bg-navy-900 p-4"><h3 className="text-sm font-black text-text-primary">{title}</h3><p className="mt-1 text-xs leading-relaxed text-text-secondary">{text}</p></div>)}
      </section>
    </div>
  );
}
