import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";

async function listLocal(status?: string) {
  const indexPath = path.join(process.cwd(), ".data", "sources", "index.json");
  try {
    const data = JSON.parse(await readFile(indexPath, "utf-8"));
    const items = Array.isArray(data) ? data : [];
    return status ? items.filter((item) => item.validation_status === status) : items;
  } catch {
    return [];
  }
}

async function listSupabase(status?: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  const query = new URLSearchParams({
    select: "*",
    order: "uploaded_at.desc",
    limit: "200",
  });
  if (status) query.set("validation_status", `eq.${status}`);

  const response = await fetch(`${url}/rest/v1/source_documents?${query.toString()}`, {
    headers: { Authorization: `Bearer ${key}`, apikey: key },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Falha ao consultar fontes: ${response.status}`);
  return response.json();
}

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status") || undefined;
    const cloud = await listSupabase(status);
    const documents = cloud ?? await listLocal(status);
    return NextResponse.json({ documents, storage: cloud ? "supabase" : "local" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha ao listar fontes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
