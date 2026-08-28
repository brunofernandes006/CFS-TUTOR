import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { classifySourceDocument } from "@/lib/services/documentClassifier";
import {
  isSupabaseConfigured,
  supabaseInsert,
  supabaseInvokeFunction,
  supabaseSelect,
  supabaseStorageUpload,
} from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/json",
  "text/csv",
  "application/csv",
]);

function safeFileName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 160) || "documento";
}

function validateSignature(buffer: Buffer, mime: string): boolean {
  if (mime === "application/pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return buffer[0] === 0x50 && buffer[1] === 0x4b;
  }
  return true;
}

function extractSafeTextSample(buffer: Buffer, mime: string): { sample: string; status: string } {
  if (["text/plain", "text/csv", "application/csv", "application/json"].includes(mime)) {
    const sample = buffer.subarray(0, 64 * 1024).toString("utf-8").replace(/\0/g, "").slice(0, 16000);
    if (mime === "application/json") {
      try {
        JSON.parse(buffer.toString("utf-8"));
      } catch {
        throw new Error("JSON inválido.");
      }
    }
    return { sample, status: "EXTRACTED" };
  }
  if (mime === "application/pdf") return { sample: "", status: "PENDING_PDF_EXTRACTION" };
  if (mime.includes("wordprocessingml")) return { sample: "", status: "PENDING_DOCX_EXTRACTION" };
  return { sample: "", status: "PENDING_EXTRACTION" };
}

type ExtractionResult = {
  ok: boolean;
  extractionStatus: string;
  charCount: number;
  pageCount: number | null;
  needsOcr: boolean;
};

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Central de Fontes ainda não configurada no servidor. Configure o Supabase antes de enviar arquivos." },
        { status: 503 }
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Arquivo vazio ou acima do limite de 50 MB." }, { status: 413 });
    if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: `Tipo não permitido: ${file.type || "desconhecido"}.` }, { status: 415 });

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!validateSignature(buffer, file.type)) return NextResponse.json({ error: "O conteúdo do arquivo não corresponde ao tipo declarado." }, { status: 415 });

    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const duplicateQuery = new URLSearchParams({ sha256: `eq.${sha256}`, select: "*", limit: "1" });
    const duplicateRows = await supabaseSelect<Array<Record<string, unknown>>>("source_documents", duplicateQuery);
    if (duplicateRows.length > 0) {
      return NextResponse.json({ success: true, duplicate: true, storage: "supabase", document: duplicateRows[0] }, { status: 200 });
    }

    const originalName = file.name;
    const sanitizedName = safeFileName(originalName);
    const initialExtraction = extractSafeTextSample(buffer, file.type);
    const classification = classifySourceDocument(originalName, initialExtraction.sample);
    const storedName = `${sha256.slice(0, 12)}-${sanitizedName}`;
    const storagePath = `${classification.destination}/${storedName}`;
    const bucket = process.env.SUPABASE_SOURCE_BUCKET || "cfs-fontes";

    await supabaseStorageUpload(bucket, storagePath, buffer, file.type);

    const metadata = {
      original_name: originalName,
      sanitized_name: sanitizedName,
      stored_name: storedName,
      storage_path: storagePath,
      storage_provider: "supabase",
      sha256,
      file_size: file.size,
      mime_type: file.type,
      category: classification.category,
      confidence: classification.confidence,
      validation_status: classification.needsReview ? "NEEDS_REVIEW" : "CLASSIFIED",
      destination: classification.destination,
      detected_year: classification.detected.year ?? null,
      detected_board: classification.detected.board ?? null,
      detected_number: classification.detected.number ?? null,
      extraction_status: initialExtraction.status,
      text_excerpt: initialExtraction.sample ? initialExtraction.sample.slice(0, 4000) : null,
      uploaded_at: new Date().toISOString(),
    };

    const inserted = await supabaseInsert<Array<Record<string, unknown>>>("source_documents", metadata);
    const document = Array.isArray(inserted) ? inserted[0] : inserted;
    const documentId = typeof document?.id === "string" ? document.id : null;

    let extraction: ExtractionResult | null = null;
    let extractionWarning: string | undefined;
    const requiresDocumentExtractor = file.type === "application/pdf" || file.type.includes("wordprocessingml");

    if (requiresDocumentExtractor && documentId) {
      try {
        extraction = await supabaseInvokeFunction<ExtractionResult>("extract-source", { documentId });
      } catch (error) {
        extractionWarning = error instanceof Error
          ? `Arquivo armazenado, mas a extração automática falhou: ${error.message}`
          : "Arquivo armazenado, mas a extração automática falhou.";
      }
    }

    const warnings = [
      classification.needsReview
        ? "A classificação precisa ser confirmada antes de alimentar questões ou conteúdos de estudo."
        : undefined,
      extraction?.needsOcr
        ? "PDF sem texto suficiente detectado. OCR será necessário antes de usar o conteúdo."
        : undefined,
      extractionWarning,
    ].filter(Boolean);

    return NextResponse.json(
      {
        success: true,
        duplicate: false,
        storage: "supabase",
        classification,
        extractionStatus: extraction?.extractionStatus ?? initialExtraction.status,
        extraction,
        document,
        warning: warnings.length > 0 ? warnings.join(" ") : undefined,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha inesperada no upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
