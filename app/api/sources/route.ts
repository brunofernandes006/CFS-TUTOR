import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";
import { SOURCE_CATEGORIES, type SourceCategory } from "@/lib/services/documentClassifier";

export const runtime = "nodejs";

function isCategory(value: string | null): value is SourceCategory {
  return Boolean(value && SOURCE_CATEGORIES.includes(value as SourceCategory));
}

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase não configurado no servidor.", documents: [] },
        { status: 503 }
      );
    }

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const category = req.nextUrl.searchParams.get("category");
    if (category && !isCategory(category)) {
      return NextResponse.json({ error: "Categoria inválida.", documents: [] }, { status: 400 });
    }

    const query = new URLSearchParams({
      select: "*",
      order: "uploaded_at.desc",
      limit: "200",
    });
    if (status) query.set("validation_status", `eq.${status}`);
    if (category) query.set("category", `eq.${category}`);

    const documents = await supabaseSelect<Array<Record<string, unknown>>>("source_documents", query);
    return NextResponse.json({ documents, storage: "supabase" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao listar fontes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
