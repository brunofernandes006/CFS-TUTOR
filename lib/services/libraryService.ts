// ============================================================
// CFS Tutor — Serviço de Biblioteca
// ============================================================

import { getDb } from "@/lib/db";
import type { Document, LibraryFilters, LibraryResult } from "@/lib/types";

export function searchLibrary(filters: LibraryFilters = {}): LibraryResult {
  const db = getDb();
  const {
    search,
    tipo,
    categoria,
    cfs26_only,
    page = 1,
    per_page = 20,
  } = filters;

  const conditions: string[] = ["1=1"];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push(
      "(titulo LIKE ? OR numero LIKE ? OR edital_reference LIKE ?)"
    );
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (tipo) {
    conditions.push("tipo = ?");
    params.push(tipo);
  }
  if (categoria) {
    conditions.push("categoria = ?");
    params.push(categoria);
  }
  if (cfs26_only) {
    conditions.push("cfs26_priority = 1");
  }

  const where = conditions.join(" AND ");
  const offset = (page - 1) * per_page;

  const total = (
    db.prepare(`SELECT COUNT(*) as cnt FROM documents WHERE ${where}`).get(...params) as {
      cnt: number;
    }
  ).cnt;

  const documents = db
    .prepare(
      `SELECT id, document_uid, tipo, categoria, subcategoria, numero, ano,
              titulo, nome_original, caminho_original, cfs26_priority, edital_reference,
              status_documento
       FROM documents
       WHERE ${where}
       ORDER BY cfs26_priority DESC, ano DESC, numero ASC
       LIMIT ? OFFSET ?`
    )
    .all(...params, per_page, offset) as Document[];

  return { documents, total, page, per_page };
}

export function getDocumentTypes(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT DISTINCT tipo FROM documents WHERE tipo IS NOT NULL ORDER BY tipo ASC"
    )
    .all() as { tipo: string }[];
  return rows.map((r) => r.tipo).filter(Boolean);
}

export function getDocumentCategories(): string[] {
  const db = getDb();
  const rows = db
    .prepare(
      "SELECT DISTINCT categoria FROM documents WHERE categoria IS NOT NULL ORDER BY categoria ASC"
    )
    .all() as { categoria: string }[];
  return rows.map((r) => r.categoria).filter(Boolean);
}
