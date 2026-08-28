import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { classifySourceDocument } from "@/lib/services/documentClassifier";

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

async function persistLocal(buffer: Buffer, metadata: Record<string, unknown>, destination: string, fileName: string, hash: string) {
  const root = path.join(process.cwd(), ".data", "sources");
  const folder = path.join(root, destination);
  await mkdir(folder, { recursive: true });

  const indexPath = path.join(root, "index.json");
  let index: Array<Record<string, unknown>> = [];
  try { index = JSON.parse(await readFile(indexPath, "utf-8")); } catch { index = []; }

  const duplicate = index.find((item) => item.sha256 === hash);
  if (duplicate) return { storage: "local", duplicate: true, record: duplicate };

  const storedName = `${hash.slice(0, 12)}-${fileName}`;
  const storedPath = path.join(folder, storedName);
  await writeFile(storedPath, buffer);

  const record = { ...metadata, stored_name: storedName, storage_path: `${destination}/${storedName}`, storage_provider: "local" };
  index.push(record);
  await mkdir(root, { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2), "utf-8");
  return { storage: "local", duplicate: false, record };
}

async function persistSupabase(buffer: Buffer, metadata: Record<string, unknown>, destination: string, fileName: string, hash: string, mime: string) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_SOURCE_BUCKET || "cfs-fontes";
  if (!url || !key) return null;

  const storedName = `${hash.slice(0, 12)}-${fileName}`;
  const storagePath = `${destination}/${storedName}`;
  const headers = { Authorization: `Bearer ${key}`, apikey: key };

  const duplicateCheck = await fetch(`${url}/rest/v1/source_documents?sha256=eq.${hash}&select=*`, { headers, cache: "no-store" });
  if (duplicateCheck.ok) {
    const duplicates = await duplicateCheck.json();
    if (Array.isArray(duplicates) && duplicates.length > 0) return { storage: "supabase", duplicate: true, record: duplicates[0] };
  }

  const upload = await fetch(`${url}/storage/v1/object/${bucket}/${storagePath}`, {
    method: "POST",
    headers: { ...headers, "Content-Type": mime, "x-upsert": "false" },
    body: buffer,
  });
  if (!upload.ok) throw new Error(`Falha no armazenamento: ${upload.status} ${await upload.text()}`);

  const recordPayload = { ...metadata, stored_name: storedName, storage_path: storagePath, storage_provider: "supabase" };
  const insert = await fetch(`${url}/rest/v1/source_documents`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json", Prefer: "return=representation" },
    body: JSON.stringify(recordPayload),
  });
  if (!insert.ok) throw new Error(`Arquivo salvo, mas metadados falharam: ${insert.status} ${await insert.text()}`);
  const inserted = await insert.json();
  return { storage: "supabase", duplicate: false, record: Array.isArray(inserted) ? inserted[0] : inserted };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
    if (file.size <= 0 || file.size > MAX_FILE_SIZE) return NextResponse.json({ error: "Arquivo vazio ou acima do limite de 50 MB." }, { status: 413 });
    if (!ALLOWED_MIME.has(file.type)) return NextResponse.json({ error: `Tipo não permitido: ${file.type || "desconhecido"}.` }, { status: 415 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    const originalName = file.name;
    const sanitizedName = safeFileName(originalName);
    const classification = classifySourceDocument(originalName);

    const metadata = {
      original_name: originalName,
      sanitized_name: sanitizedName,
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
      uploaded_at: new Date().toISOString(),
    };

    const cloud = await persistSupabase(buffer, metadata, classification.destination, sanitizedName, sha256, file.type);
    const persisted = cloud ?? await persistLocal(buffer, metadata, classification.destination, sanitizedName, sha256);

    return NextResponse.json({
      success: true,
      duplicate: persisted.duplicate,
      storage: persisted.storage,
      classification,
      document: persisted.record,
      warning: classification.needsReview ? "A classificação precisa ser confirmada antes de alimentar questões ou conteúdos de estudo." : undefined,
    }, { status: persisted.duplicate ? 200 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Falha inesperada no upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
