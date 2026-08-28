import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import path from "path";
import { SOURCE_CATEGORIES, SOURCE_DESTINATIONS, type SourceCategory } from "@/lib/services/documentClassifier";

export const runtime = "nodejs";

function isCategory(value: unknown): value is SourceCategory {
  return typeof value === "string" && SOURCE_CATEGORIES.includes(value as SourceCategory);
}

async function patchLocal(sha256: string, patch: Record<string, unknown>) {
  const indexPath = path.join(process.cwd(), ".data", "sources", "index.json");
  const data = JSON.parse(await readFile(indexPath, "utf-8"));
  if (!Array.isArray(data)) throw new Error("Índice local inválido.");
  const index = data.findIndex((item) => item.sha256 === sha256);
  if (index < 0) return null;
  data[index] = { ...data[index], ...patch };
  await writeFile(indexPath, JSON.stringify(data, null, 2), "utf-8");
  return data[index];
}

async function patchSupabase(sha256: string, patch: Record<string, unknown>) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const response = await fetch(`${url}/rest/v1/source_documents?sha256=eq.${encodeURIComponent(sha256)}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(patch),
  });
  if (!response.ok) throw new Error(`Falha ao validar fonte: ${response.status} ${await response.text()}`);
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] ?? null : rows;
}

export async function PATCH(req: NextRequest, context: { params: Promise<{ sha256: string }> }) {
  try {
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

    const cloud = await patchSupabase(sha256, patch);
    const document = cloud ?? await patchLocal(sha256, patch);
    if (!document) return NextResponse.json({ error: "Documento não encontrado." }, { status: 404 });

    return NextResponse.json({ success: true, document, storage: cloud ? "supabase" : "local" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao validar documento.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
