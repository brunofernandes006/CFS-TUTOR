import { NextRequest, NextResponse } from "next/server";
import { SOURCE_CATEGORIES, SOURCE_DESTINATIONS, type SourceCategory } from "@/lib/services/documentClassifier";
import { isSupabaseConfigured, supabasePatch } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

function isCategory(value: unknown): value is SourceCategory {
  return typeof value === "string" && SOURCE_CATEGORIES.includes(value as SourceCategory);
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ sha256: string }> }) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase não configurado no servidor." }, { status: 503 });
    }

    const { sha256 } = await context.params;
    if (!/^[a-f0-9]{64}$/i.test(sha256)) return NextResponse.json({ error: "Hash inválido." }, { status: 400 });

    const body = await req.json();
    if (!isCategory(body.category)) return NextResponse.json({ error: "Categoria inválida." }, { status: 400 });

    const patch = {
      category: body.category,
      destination: SOURCE_DESTINATIONS[body.category],
      validation_status: "VALIDATED",
      is_official: Boolean(body.is_official),
      source_authority: typeof body.source_authority === "string" ? body.source_authority.slice(0, 180) : null,
      publication_date: body.publication_date || null,
      effective_from: body.effective_from || null,
      effective_to: body.effective_to || null,
      edital_cutoff_applicable: typeof body.edital_cutoff_applicable === "boolean" ? body.edital_cutoff_applicable : null,
      notes: typeof body.notes === "string" ? body.notes.slice(0, 2000) : null,
      validated_at: new Date().toISOString(),
    };

    const filter = new URLSearchParams({ sha256: `eq.${sha256}` });
    const rows = await supabasePatch<Array<Record<string, unknown>>>("source_documents", filter, patch);
    const document = Array.isArray(rows) ? rows[0] ?? null : rows;
    if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    return NextResponse.json({ success: true, document, storage: "supabase" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao validar documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
