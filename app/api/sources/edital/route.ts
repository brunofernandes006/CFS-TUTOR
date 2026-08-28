import { NextRequest, NextResponse } from "next/server";
import { parseSyllabusCandidates, type DisciplineCodeV2 } from "@/lib/services/editalParserV2";
import type { ExtractedSourcePage } from "@/lib/services/examParserV2";
import {
  isSupabaseConfigured,
  supabasePatch,
  supabaseSelect,
  supabaseUpsert,
} from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

type SourceRow = {
  id: string;
  category: string;
  validation_status: string;
  extraction_status: string;
  is_official: boolean;
};

type CandidateRow = {
  id: string;
  source_document_id: string;
  discipline_code: DisciplineCodeV2;
  edital_code: string;
  parent_edital_code: string | null;
  title: string;
  source_page: number | null;
  parser_confidence: number;
  status: string;
};

type DisciplineRow = { id: number; code: DisciplineCodeV2 };

async function getSource(sourceDocumentId: string): Promise<SourceRow | null> {
  const rows = await supabaseSelect<SourceRow[]>(
    "source_documents",
    new URLSearchParams({
      id: `eq.${sourceDocumentId}`,
      select: "id,category,validation_status,extraction_status,is_official",
      limit: "1",
    })
  );
  return rows[0] ?? null;
}

export async function POST(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
    const body = (await req.json()) as { sourceDocumentId?: string };
    const sourceDocumentId = body.sourceDocumentId ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(sourceDocumentId)) return NextResponse.json({ error: "Edital inválido." }, { status: 400 });

    const source = await getSource(sourceDocumentId);
    if (!source) return NextResponse.json({ error: "Edital não encontrado." }, { status: 404 });
    if (source.category !== "EDITAL" || source.validation_status !== "VALIDATED" || !source.is_official) {
      return NextResponse.json({ error: "A árvore do edital exige uma fonte EDITAL oficial e validada." }, { status: 409 });
    }
    if (source.extraction_status !== "EXTRACTED") {
      return NextResponse.json({ error: `Texto do edital ainda não está disponível (${source.extraction_status}).` }, { status: 409 });
    }

    const pages = await supabaseSelect<ExtractedSourcePage[]>(
      "source_document_pages",
      new URLSearchParams({ source_document_id: `eq.${sourceDocumentId}`, select: "page_number,page_text", order: "page_number.asc" })
    );
    const candidates = parseSyllabusCandidates(pages);
    if (candidates.length > 0) {
      await supabaseUpsert(
        "syllabus_candidates",
        candidates.map((candidate) => ({
          source_document_id: sourceDocumentId,
          discipline_code: candidate.disciplineCode,
          edital_code: candidate.editalCode,
          parent_edital_code: candidate.parentEditalCode,
          title: candidate.title,
          source_page: candidate.sourcePage,
          parser_confidence: candidate.confidence,
          status: "NEEDS_REVIEW",
          updated_at: new Date().toISOString(),
        })),
        "source_document_id,discipline_code,edital_code"
      );
    }

    return NextResponse.json({
      success: true,
      extractedCandidates: candidates.length,
      message: candidates.length
        ? "Itens do edital extraídos como candidatos. Confirme a lista antes de alimentar o plano de estudo."
        : "Nenhum item do edital foi promovido; revisão manual necessária.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao processar edital.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ candidates: [], error: "Supabase não configurado." }, { status: 503 });
    const sourceDocumentId = req.nextUrl.searchParams.get("sourceDocumentId") ?? "";
    if (!/^[0-9a-f-]{36}$/i.test(sourceDocumentId)) return NextResponse.json({ error: "Edital inválido.", candidates: [] }, { status: 400 });

    const candidates = await supabaseSelect<CandidateRow[]>(
      "syllabus_candidates",
      new URLSearchParams({
        source_document_id: `eq.${sourceDocumentId}`,
        select: "id,source_document_id,discipline_code,edital_code,parent_edital_code,title,source_page,parser_confidence,status",
        order: "discipline_code.asc,edital_code.asc",
      })
    );
    return NextResponse.json({ candidates });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao carregar itens do edital.";
    return NextResponse.json({ error: message, candidates: [] }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
    const body = (await req.json()) as { sourceDocumentId?: string; candidateIds?: string[] };
    const sourceDocumentId = body.sourceDocumentId ?? "";
    const candidateIds = Array.isArray(body.candidateIds) ? [...new Set(body.candidateIds)] : [];
    if (!/^[0-9a-f-]{36}$/i.test(sourceDocumentId) || candidateIds.length === 0 || candidateIds.some((id) => !/^[0-9a-f-]{36}$/i.test(id))) {
      return NextResponse.json({ error: "Seleção de itens inválida." }, { status: 400 });
    }

    const source = await getSource(sourceDocumentId);
    if (!source || source.category !== "EDITAL" || source.validation_status !== "VALIDATED" || !source.is_official) {
      return NextResponse.json({ error: "Edital oficial validado não encontrado." }, { status: 409 });
    }

    const allCandidates = await supabaseSelect<CandidateRow[]>(
      "syllabus_candidates",
      new URLSearchParams({
        source_document_id: `eq.${sourceDocumentId}`,
        id: `in.(${candidateIds.join(",")})`,
        select: "id,source_document_id,discipline_code,edital_code,parent_edital_code,title,source_page,parser_confidence,status",
      })
    );
    if (allCandidates.length !== candidateIds.length) {
      return NextResponse.json({ error: "Um ou mais itens não pertencem ao edital selecionado." }, { status: 409 });
    }

    const disciplines = await supabaseSelect<DisciplineRow[]>(
      "disciplines",
      new URLSearchParams({ select: "id,code", active: "eq.true" })
    );
    const disciplineIds = new Map(disciplines.map((discipline) => [discipline.code, discipline.id]));
    const ordered = [...allCandidates].sort((a, b) => {
      const depth = a.edital_code.split(".").length - b.edital_code.split(".").length;
      if (depth !== 0) return depth;
      return a.edital_code.localeCompare(b.edital_code, undefined, { numeric: true });
    });

    let order = 1;
    const promoted: Array<Record<string, unknown>> = [];
    for (const candidate of ordered) {
      const disciplineId = disciplineIds.get(candidate.discipline_code);
      if (!disciplineId) throw new Error(`Disciplina ${candidate.discipline_code} não cadastrada.`);

      let parentId: string | null = null;
      if (candidate.parent_edital_code) {
        const parents = await supabaseSelect<Array<{ id: string }>>(
          "syllabus_items",
          new URLSearchParams({
            discipline_id: `eq.${disciplineId}`,
            edital_code: `eq.${candidate.parent_edital_code}`,
            select: "id",
            limit: "1",
          })
        );
        parentId = parents[0]?.id ?? null;
      }

      const rows = await supabaseUpsert<Array<Record<string, unknown>>>(
        "syllabus_items",
        {
          discipline_id: disciplineId,
          edital_code: candidate.edital_code,
          title: candidate.title,
          parent_id: parentId,
          edital_order: order++,
          source_document_id: sourceDocumentId,
          source_page: candidate.source_page,
          active: true,
          updated_at: new Date().toISOString(),
        },
        "discipline_id,edital_code"
      );
      if (rows[0]) promoted.push(rows[0]);
    }

    await supabasePatch(
      "syllabus_candidates",
      new URLSearchParams({ source_document_id: `eq.${sourceDocumentId}`, id: `in.(${candidateIds.join(",")})` }),
      { status: "APPROVED", updated_at: new Date().toISOString() }
    );

    return NextResponse.json({ success: true, promoted: promoted.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha ao confirmar edital.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
