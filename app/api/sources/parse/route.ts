import { NextRequest, NextResponse } from "next/server";
import { parseAnswerKeyCandidates, parseQuestionCandidates, type ExtractedSourcePage } from "@/lib/services/examParserV2";
import { isSupabaseConfigured, supabaseSelect, supabaseUpsert } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

type SourceRow = {
  id: string;
  category: string;
  validation_status: string;
  extraction_status: string;
  is_official: boolean;
};

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
    }

    const body = (await req.json()) as { sourceDocumentId?: string; mode?: "PROVA" | "GABARITO" };
    const sourceDocumentId = body.sourceDocumentId ?? "";
    const mode = body.mode;
    if (!/^[0-9a-f-]{36}$/i.test(sourceDocumentId)) {
      return NextResponse.json({ error: "Documento inválido." }, { status: 400 });
    }
    if (mode !== "PROVA" && mode !== "GABARITO") {
      return NextResponse.json({ error: "Modo de parser inválido." }, { status: 400 });
    }

    const sourceRows = await supabaseSelect<SourceRow[]>(
      "source_documents",
      new URLSearchParams({ id: `eq.${sourceDocumentId}`, select: "id,category,validation_status,extraction_status,is_official", limit: "1" })
    );
    const source = sourceRows[0];
    if (!source) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });
    if (source.category !== mode) {
      return NextResponse.json({ error: `Documento está classificado como ${source.category}, não ${mode}.` }, { status: 409 });
    }
    if (source.validation_status !== "VALIDATED") {
      return NextResponse.json({ error: "Valide a fonte antes de executar o parser." }, { status: 409 });
    }
    if (source.extraction_status === "OCR_REQUIRED") {
      return NextResponse.json({ error: "Este PDF precisa de OCR antes da extração de questões." }, { status: 409 });
    }
    if (source.extraction_status !== "EXTRACTED") {
      return NextResponse.json({ error: `Extração de texto ainda não concluída (${source.extraction_status}).` }, { status: 409 });
    }

    const pages = await supabaseSelect<ExtractedSourcePage[]>(
      "source_document_pages",
      new URLSearchParams({
        source_document_id: `eq.${sourceDocumentId}`,
        select: "page_number,page_text",
        order: "page_number.asc",
      })
    );
    if (pages.length === 0) {
      return NextResponse.json({ error: "Documento não possui páginas extraídas." }, { status: 409 });
    }

    if (mode === "PROVA") {
      const candidates = parseQuestionCandidates(pages);
      if (candidates.length > 0) {
        await supabaseUpsert(
          "question_candidates",
          candidates.map((candidate) => ({
            source_document_id: sourceDocumentId,
            question_number: candidate.questionNumber,
            source_page: candidate.sourcePage,
            statement: candidate.statement,
            options: candidate.options,
            parser_confidence: candidate.confidence,
            raw_block: candidate.rawBlock,
            status: "NEEDS_REVIEW",
            updated_at: new Date().toISOString(),
          })),
          "source_document_id,question_number"
        );
      }
      return NextResponse.json({
        success: true,
        mode,
        sourceOfficial: source.is_official,
        extractedCandidates: candidates.length,
        message: candidates.length > 0
          ? "Candidatos extraídos. Nenhuma questão foi marcada como oficial automaticamente."
          : "Nenhum bloco confiável de questão foi identificado; revisão manual necessária.",
      });
    }

    const candidates = parseAnswerKeyCandidates(pages);
    if (candidates.length > 0) {
      await supabaseUpsert(
        "answer_key_candidates",
        candidates.map((candidate) => ({
          source_document_id: sourceDocumentId,
          question_number: candidate.questionNumber,
          correct_option_index: candidate.correctOptionIndex,
          source_page: candidate.sourcePage,
          parser_confidence: candidate.confidence,
          raw_fragment: candidate.rawFragment,
          status: "NEEDS_REVIEW",
          updated_at: new Date().toISOString(),
        })),
        "source_document_id,question_number"
      );
    }

    return NextResponse.json({
      success: true,
      mode,
      sourceOfficial: source.is_official,
      extractedCandidates: candidates.length,
      message: candidates.length > 0
        ? "Entradas de gabarito extraídas como candidatas; nenhuma resposta foi validada automaticamente."
        : "Nenhuma entrada de gabarito suficientemente estruturada foi identificada.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
