import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase não configurado no servidor.", documents: [] },
        { status: 503 }
      );
    }

    const status = req.nextUrl.searchParams.get("status") || undefined;
    const query = new URLSearchParams({
      select: "*",
      order: "uploaded_at.desc",
      limit: "200",
    });
    if (status) query.set("validation_status", `eq.${status}`);

    const documents = await supabaseSelect<Array<Record<string, unknown>>>("source_documents", query);
    return NextResponse.json({ documents, storage: "supabase" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao listar fontes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
