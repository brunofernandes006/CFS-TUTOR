import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Buffer } from "node:buffer";
import pdfParseImport from "npm:pdf-parse@1.1.1";
import mammoth from "npm:mammoth@1.9.1";

type SourceDocument = {
  id: string;
  storage_path: string | null;
  mime_type: string;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function extractPdf(bytes: Uint8Array): Promise<{ fullText: string; pages: string[]; pageCount: number }> {
  const pages: string[] = [];
  const pdfParse = pdfParseImport as unknown as (
    data: Buffer,
    options?: Record<string, unknown>,
  ) => Promise<{ text?: string; numpages?: number }>;

  const parsed = await pdfParse(Buffer.from(bytes), {
    pagerender: async (pageData: { getTextContent: () => Promise<{ items: Array<{ str?: string }> }> }) => {
      const textContent = await pageData.getTextContent();
      const pageText = normalizeText(textContent.items.map((item) => item.str ?? "").join(" "));
      pages.push(pageText);
      return pageText;
    },
  });

  const fullText = normalizeText(pages.filter(Boolean).join("\n\n")) || normalizeText(parsed.text ?? "");
  return { fullText, pages, pageCount: parsed.numpages ?? pages.length };
}

async function extractDocx(bytes: Uint8Array): Promise<{ fullText: string; pages: string[]; pageCount: number | null }> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  const fullText = normalizeText(result.value ?? "");
  return { fullText, pages: fullText ? [fullText] : [], pageCount: null };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bucket = Deno.env.get("SUPABASE_SOURCE_BUCKET") || "cfs-fontes";
  if (!supabaseUrl || !serviceRoleKey) return json({ error: "SERVER_NOT_CONFIGURED" }, 500);

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let documentId = "";
  try {
    const body = await req.json() as { documentId?: string };
    documentId = body.documentId ?? "";
    if (!documentId) return json({ error: "DOCUMENT_ID_REQUIRED" }, 400);

    const { data: document, error: documentError } = await supabase
      .from("source_documents")
      .select("id,storage_path,mime_type")
      .eq("id", documentId)
      .single<SourceDocument>();

    if (documentError || !document) return json({ error: "DOCUMENT_NOT_FOUND" }, 404);
    if (!document.storage_path) return json({ error: "STORAGE_PATH_MISSING" }, 409);

    await supabase
      .from("source_documents")
      .update({ extraction_status: "EXTRACTING", ingestion_error: null })
      .eq("id", documentId);

    const { data: blob, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(document.storage_path);
    if (downloadError || !blob) throw new Error(downloadError?.message || "Falha no download do arquivo.");

    const bytes = new Uint8Array(await blob.arrayBuffer());
    let extracted: { fullText: string; pages: string[]; pageCount: number | null };
    let extractor: string;

    if (document.mime_type === "application/pdf") {
      extracted = await extractPdf(bytes);
      extractor = "pdf-parse@1.1.1";
    } else if (document.mime_type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      extracted = await extractDocx(bytes);
      extractor = "mammoth@1.9.1";
    } else {
      return json({ error: "UNSUPPORTED_MIME", mimeType: document.mime_type }, 415);
    }

    const charCount = extracted.fullText.length;
    const needsOcr = document.mime_type === "application/pdf" && charCount < 80;

    const { error: extractionError } = await supabase
      .from("source_extractions")
      .upsert({
        source_document_id: documentId,
        full_text: extracted.fullText,
        char_count: charCount,
        page_count: extracted.pageCount,
        extractor,
        extracted_at: new Date().toISOString(),
      }, { onConflict: "source_document_id" });
    if (extractionError) throw new Error(extractionError.message);

    await supabase.from("source_document_pages").delete().eq("source_document_id", documentId);
    if (extracted.pages.length > 0) {
      const rows = extracted.pages.map((pageText, index) => ({
        source_document_id: documentId,
        page_number: index + 1,
        page_text: pageText,
        char_count: pageText.length,
      }));
      const { error: pagesError } = await supabase.from("source_document_pages").insert(rows);
      if (pagesError) throw new Error(pagesError.message);
    }

    const extractionStatus = needsOcr ? "OCR_REQUIRED" : (charCount > 0 ? "EXTRACTED" : "NEEDS_REVIEW_EMPTY");
    const { error: updateError } = await supabase
      .from("source_documents")
      .update({
        extraction_status: extractionStatus,
        text_excerpt: extracted.fullText.slice(0, 4000) || null,
        ingestion_error: null,
      })
      .eq("id", documentId);
    if (updateError) throw new Error(updateError.message);

    return json({
      ok: true,
      documentId,
      extractionStatus,
      charCount,
      pageCount: extracted.pageCount,
      needsOcr,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha de extração.";
    if (documentId) {
      await supabase
        .from("source_documents")
        .update({ extraction_status: "FAILED", ingestion_error: message.slice(0, 2000) })
        .eq("id", documentId);
    }
    return json({ error: "EXTRACTION_FAILED", message }, 500);
  }
});
