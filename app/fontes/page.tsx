"use client";

import { useEffect, useMemo, useState } from "react";

const CATEGORIES = [
  "EDITAL", "PROVA", "GABARITO", "LEGISLACAO", "DIREITOS_HUMANOS", "NORMA_PMESP",
  "DIRETRIZ", "NOTA_DE_INSTRUCAO", "ORDEM_DE_SERVICO", "DESPACHO", "PORTARIA", "ICC",
  "PROCESSO_OPERACIONAL", "APOSTILA", "OUTRO",
] as const;

const DISCIPLINES = [
  ["PROF", "Conhecimentos Profissionais"],
  ["PORT", "Língua Portuguesa"],
  ["MAT", "Matemática"],
] as const;

interface SourceDocument {
  id: string;
  sha256: string;
  original_name: string;
  category: string;
  confidence: number;
  validation_status: string;
  extraction_status?: string | null;
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
  extractionStatus?: string;
  warning?: string;
  error?: string;
}

interface ExamRow {
  id: string;
  year: number;
  board: string;
  status: string;
  exam_document_id: string;
  answer_key_document_id: string;
}

interface CandidatePair {
  question: {
    id: string;
    question_number: number;
    source_page: number | null;
    statement: string;
    options: string[];
    parser_confidence: number;
    status: string;
  };
  answer: {
    id: string;
    question_number: number;
    correct_option_index: number;
    source_page: number | null;
    parser_confidence: number;
    status: string;
  } | null;
  readyForReview: boolean;
}

type SourceDraft = {
  category: string;
  official: boolean;
  authority: string;
  cutoff: boolean;
  year: string;
  board: string;
};

export default function FontesPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [pending, setPending] = useState<SourceDocument[]>([]);
  const [validated, setValidated] = useState<SourceDocument[]>([]);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, SourceDraft>>({});
  const [examSourceId, setExamSourceId] = useState("");
  const [answerSourceId, setAnswerSourceId] = useState("");
  const [selectedExamId, setSelectedExamId] = useState("");
  const [candidates, setCandidates] = useState<CandidatePair[]>([]);
  const [candidateDisciplines, setCandidateDisciplines] = useState<Record<string, string>>({});

  async function refreshAll() {
    setLoading(true);
    try {
      const [pendingResponse, validatedResponse, examsResponse] = await Promise.all([
        fetch("/api/sources?status=NEEDS_REVIEW", { cache: "no-store" }),
        fetch("/api/sources?status=VALIDATED", { cache: "no-store" }),
        fetch("/api/exams", { cache: "no-store" }),
      ]);
      const [pendingPayload, validatedPayload, examsPayload] = await Promise.all([
        pendingResponse.json(), validatedResponse.json(), examsResponse.json(),
      ]);
      setPending(Array.isArray(pendingPayload.documents) ? pendingPayload.documents : []);
      setValidated(Array.isArray(validatedPayload.documents) ? validatedPayload.documents : []);
      setExams(Array.isArray(examsPayload.exams) ? examsPayload.exams : []);
    } catch {
      setMessage("Não foi possível atualizar a Central de Fontes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshAll(); }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);
  const validatedExams = useMemo(() => validated.filter((doc) => doc.category === "PROVA"), [validated]);
  const validatedAnswers = useMemo(() => validated.filter((doc) => doc.category === "GABARITO"), [validated]);

  async function uploadAll() {
    if (files.length === 0 || sending) return;
    setSending(true);
    setResults([]);
    setMessage(null);
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
    await refreshAll();
  }

  function draftFor(doc: SourceDocument): SourceDraft {
    return drafts[doc.sha256] ?? {
      category: doc.category,
      official: Boolean(doc.is_official),
      authority: "",
      cutoff: true,
      year: doc.detected_year ? String(doc.detected_year) : "",
      board: doc.detected_board ?? "",
    };
  }

  async function validate(doc: SourceDocument) {
    const draft = draftFor(doc);
    setValidating(doc.sha256);
    setMessage(null);
    try {
      const response = await fetch(`/api/sources/${doc.sha256}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: draft.category,
          is_official: draft.official,
          source_authority: draft.authority || null,
          edital_cutoff_applicable: draft.cutoff,
          detected_year: draft.year ? Number(draft.year) : null,
          detected_board: draft.board || null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha na validação");
      setMessage(`${doc.original_name}: fonte validada.`);
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha na validação.");
    } finally {
      setValidating(null);
    }
  }

  async function parseSource(doc: SourceDocument) {
    if (doc.category !== "PROVA" && doc.category !== "GABARITO") return;
    setProcessing(doc.id);
    setMessage(null);
    try {
      const response = await fetch("/api/sources/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceDocumentId: doc.id, mode: doc.category }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha no parser.");
      setMessage(`${doc.original_name}: ${payload.extractedCandidates} candidato(s). ${payload.message ?? ""}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no parser.");
    } finally {
      setProcessing(null);
    }
  }

  async function pairExam() {
    if (!examSourceId || !answerSourceId) return;
    setProcessing("pair");
    setMessage(null);
    try {
      const response = await fetch("/api/sources/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examSourceId, answerSourceId }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha no pareamento.");
      setMessage("Prova e gabarito oficial vinculados com rastreabilidade.");
      setExamSourceId("");
      setAnswerSourceId("");
      await refreshAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha no pareamento.");
    } finally {
      setProcessing(null);
    }
  }

  async function loadCandidates(examId: string) {
    setSelectedExamId(examId);
    setCandidates([]);
    if (!examId) return;
    setProcessing("candidates");
    try {
      const response = await fetch(`/api/sources/candidates?examId=${encodeURIComponent(examId)}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao carregar candidatos.");
      setCandidates(Array.isArray(payload.candidates) ? payload.candidates : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao carregar candidatos.");
    } finally {
      setProcessing(null);
    }
  }

  async function promote(candidate: CandidatePair) {
    if (!candidate.answer) return;
    const disciplineCode = candidateDisciplines[candidate.question.id] ?? "";
    if (!disciplineCode) {
      setMessage("Selecione a matéria antes de validar a questão real.");
      return;
    }
    setProcessing(candidate.question.id);
    setMessage(null);
    try {
      const response = await fetch("/api/sources/candidates/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExamId,
          questionCandidateId: candidate.question.id,
          answerCandidateId: candidate.answer.id,
          disciplineCode,
          syllabusItemId: null,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Falha ao validar questão.");
      setMessage(`Questão ${candidate.question.question_number} promovida como [QUESTÃO REAL].`);
      await loadCandidates(selectedExamId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Falha ao validar questão.");
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-10">
      <header className="utility-header">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-institution">Central de fontes</p>
        <h1 className="mt-1 text-2xl font-black text-text-primary">Ingerir, classificar e validar documentos</h1>
        <p className="mt-2 max-w-3xl text-sm text-text-secondary">
          Documento entra como fonte rastreável. Prova e gabarito só geram questão real após extração, validação e pareamento explícitos.
        </p>
      </header>

      {message && <div className="rounded-xl border border-electric-blue/30 bg-electric-blue/5 p-3 text-sm text-text-primary">{message}</div>}

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <label className="block text-sm font-bold text-text-primary" htmlFor="source-file">Arquivos</label>
        <p className="mt-1 text-xs text-text-muted">PDF, DOCX, TXT, JSON ou CSV. Até 50 MB por arquivo.</p>
        <input
          id="source-file" type="file" multiple
          accept=".pdf,.docx,.txt,.json,.csv,application/pdf,text/plain,application/json,text/csv"
          onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
          className="mt-4 block w-full rounded-xl border border-graphite/40 bg-navy-950 p-3 text-sm text-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-electric-blue/15 file:px-3 file:py-2 file:font-bold file:text-electric-blue"
        />
        {files.length > 0 && <div className="mt-4 rounded-xl border border-graphite/30 bg-navy-950 p-3 text-xs text-text-secondary"><p className="font-bold text-text-primary">{files.length} arquivo(s) · {(totalSize / 1024 / 1024).toFixed(2)} MB</p></div>}
        <button onClick={uploadAll} disabled={files.length === 0 || sending} className="mt-4 w-full rounded-xl bg-electric-blue px-5 py-3 text-sm font-black text-white disabled:opacity-40 sm:w-auto">{sending ? "Processando fila..." : `Enviar ${files.length || ""} arquivo(s)`}</button>
      </section>

      {results.length > 0 && <section className="space-y-2"><h2 className="text-sm font-black text-text-primary">Resultado da ingestão</h2>{results.map((result, index) => <div key={`${result.fileName}-${index}`} className={`rounded-xl border p-3 ${result.error ? "border-alert-red/30 bg-alert-red/5" : "border-graphite/40 bg-navy-900"}`}><p className="text-sm font-bold text-text-primary">{result.fileName}</p>{result.error ? <p className="mt-1 text-xs text-alert-red">{result.error}</p> : <><p className="mt-1 text-xs text-text-secondary">{result.classification?.category} · {result.classification?.confidence}% · extração {result.extractionStatus ?? "-"}</p>{result.warning && <p className="mt-1 text-xs text-warning-gold">{result.warning}</p>}</>}</div>)}</section>}

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-text-muted">Controle de qualidade</p><h2 className="mt-1 text-lg font-black text-text-primary">Pendentes de validação</h2></div><button onClick={() => void refreshAll()} className="rounded-lg border border-graphite/40 px-3 py-2 text-xs font-bold text-text-secondary">Atualizar</button></div>
        {loading ? <p className="mt-4 text-sm text-text-muted">Carregando...</p> : pending.length === 0 ? <p className="mt-4 rounded-xl border border-success-green/20 bg-success-green/5 p-3 text-sm text-success-green">Nenhuma fonte pendente.</p> : <div className="mt-4 space-y-3">{pending.map((doc) => { const draft = draftFor(doc); const examLike = draft.category === "PROVA" || draft.category === "GABARITO"; return <article key={doc.sha256} className="rounded-xl border border-graphite/40 bg-navy-950 p-4"><p className="break-words text-sm font-black text-text-primary">{doc.original_name}</p><p className="mt-1 text-xs text-text-muted">Sugestão: {doc.category} · confiança {doc.confidence}% · extração {doc.extraction_status ?? "-"}</p><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs font-bold text-text-secondary">Categoria<select value={draft.category} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, category: e.target.value } }))} className="mt-1 w-full rounded-lg border border-graphite/40 bg-navy-900 p-2 text-sm text-text-primary">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-xs font-bold text-text-secondary">Órgão/fonte oficial<input value={draft.authority} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, authority: e.target.value } }))} placeholder="Ex.: PMESP, VUNESP" className="mt-1 w-full rounded-lg border border-graphite/40 bg-navy-900 p-2 text-sm text-text-primary" /></label>{examLike && <><label className="text-xs font-bold text-text-secondary">Ano<input inputMode="numeric" value={draft.year} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, year: e.target.value.replace(/\D/g, "").slice(0, 4) } }))} className="mt-1 w-full rounded-lg border border-graphite/40 bg-navy-900 p-2 text-sm text-text-primary" /></label><label className="text-xs font-bold text-text-secondary">Banca<input value={draft.board} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, board: e.target.value } }))} placeholder="Ex.: VUNESP" className="mt-1 w-full rounded-lg border border-graphite/40 bg-navy-900 p-2 text-sm text-text-primary" /></label></>}</div><div className="mt-3 flex flex-wrap gap-4 text-xs text-text-secondary"><label className="flex items-center gap-2"><input type="checkbox" checked={draft.official} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, official: e.target.checked } }))} /> Fonte oficial</label><label className="flex items-center gap-2"><input type="checkbox" checked={draft.cutoff} onChange={(e) => setDrafts((current) => ({ ...current, [doc.sha256]: { ...draft, cutoff: e.target.checked } }))} /> Aplicável ao corte do edital</label></div><button onClick={() => void validate(doc)} disabled={validating === doc.sha256} className="mt-4 rounded-lg bg-success-green px-4 py-2 text-xs font-black text-navy-950 disabled:opacity-50">{validating === doc.sha256 ? "Validando..." : "Confirmar fonte"}</button></article>; })}</div>}
      </section>

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Extração estruturada</p><h2 className="mt-1 text-lg font-black text-text-primary">Provas e gabaritos validados</h2>
        <div className="mt-4 space-y-2">{validated.filter((doc) => doc.category === "PROVA" || doc.category === "GABARITO").map((doc) => <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-graphite/30 bg-navy-950 p-3"><div><p className="text-sm font-bold text-text-primary">{doc.original_name}</p><p className="text-xs text-text-muted">{doc.category} · {doc.detected_year ?? "?"} · {doc.detected_board ?? "banca?"} · {doc.extraction_status ?? "-"}</p></div><button onClick={() => void parseSource(doc)} disabled={processing === doc.id || doc.extraction_status !== "EXTRACTED"} className="rounded-lg border border-electric-blue/40 px-3 py-2 text-xs font-black text-electric-blue disabled:opacity-40">{processing === doc.id ? "Processando..." : "Extrair candidatos"}</button></div>)}</div>
      </section>

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Rastreabilidade oficial</p><h2 className="mt-1 text-lg font-black text-text-primary">Vincular prova ao gabarito</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2"><select value={examSourceId} onChange={(e) => setExamSourceId(e.target.value)} className="rounded-xl border border-graphite/40 bg-navy-950 p-3 text-sm text-text-primary"><option value="">Selecione a prova</option>{validatedExams.map((doc) => <option key={doc.id} value={doc.id}>{doc.detected_year} · {doc.detected_board} · {doc.original_name}</option>)}</select><select value={answerSourceId} onChange={(e) => setAnswerSourceId(e.target.value)} className="rounded-xl border border-graphite/40 bg-navy-950 p-3 text-sm text-text-primary"><option value="">Selecione o gabarito</option>{validatedAnswers.map((doc) => <option key={doc.id} value={doc.id}>{doc.detected_year} · {doc.detected_board} · {doc.original_name}</option>)}</select></div><button onClick={() => void pairExam()} disabled={!examSourceId || !answerSourceId || processing === "pair"} className="mt-3 rounded-xl bg-gold-institution px-4 py-2.5 text-xs font-black text-navy-950 disabled:opacity-40">{processing === "pair" ? "Vinculando..." : "Confirmar par oficial"}</button>
      </section>

      <section className="rounded-2xl border border-graphite/40 bg-navy-900 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Validação humana</p><h2 className="mt-1 text-lg font-black text-text-primary">Promover candidatos para [QUESTÃO REAL]</h2>
        <select value={selectedExamId} onChange={(e) => void loadCandidates(e.target.value)} className="mt-4 w-full rounded-xl border border-graphite/40 bg-navy-950 p-3 text-sm text-text-primary"><option value="">Selecione uma prova vinculada</option>{exams.map((exam) => <option key={exam.id} value={exam.id}>{exam.year} · {exam.board}</option>)}</select>
        {processing === "candidates" && <p className="mt-3 text-xs text-text-muted">Carregando candidatos...</p>}
        <div className="mt-4 space-y-4">{candidates.map((candidate) => { const options = Array.isArray(candidate.question.options) ? candidate.question.options : []; return <article key={candidate.question.id} className="rounded-xl border border-graphite/30 bg-navy-950 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-black text-text-primary">Questão {candidate.question.question_number} · pág. {candidate.question.source_page ?? "?"}</p><span className="text-[10px] font-bold text-text-muted">parser {candidate.question.parser_confidence}%</span></div><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-text-primary">{candidate.question.statement}</p><div className="mt-3 space-y-1">{options.map((option, index) => <p key={index} className="text-xs text-text-secondary"><strong>{String.fromCharCode(65 + index)})</strong> {option}</p>)}</div>{candidate.answer ? <p className="mt-3 text-xs font-bold text-gold-institution">Gabarito extraído: {String.fromCharCode(65 + candidate.answer.correct_option_index)} · pág. {candidate.answer.source_page ?? "?"}</p> : <p className="mt-3 text-xs font-bold text-alert-red">Sem entrada correspondente no gabarito.</p>}<div className="mt-3 flex flex-wrap gap-2"><select value={candidateDisciplines[candidate.question.id] ?? ""} onChange={(e) => setCandidateDisciplines((current) => ({ ...current, [candidate.question.id]: e.target.value }))} className="rounded-lg border border-graphite/40 bg-navy-900 p-2 text-xs text-text-primary"><option value="">Confirmar matéria</option>{DISCIPLINES.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select><button onClick={() => void promote(candidate)} disabled={!candidate.answer || processing === candidate.question.id || candidate.question.status === "APPROVED"} className="rounded-lg bg-success-green px-3 py-2 text-xs font-black text-navy-950 disabled:opacity-40">{candidate.question.status === "APPROVED" ? "Validada" : processing === candidate.question.id ? "Validando..." : "Confirmar [QUESTÃO REAL]"}</button></div></article>; })}</div>
      </section>
    </div>
  );
}
