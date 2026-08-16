// ============================================================
// CFS Tutor — Singleton de conexão ao SQLite (server-side only)
// Usa better-sqlite3 (síncrono) — nunca importar no cliente
// ============================================================

import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.resolve(
  process.cwd(),
  "..",
  "CFS_BIBLIOTECA_SISTEMA",
  "05_DADOS_DO_SISTEMA",
  "cfs_catalogo.db"
);

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(DB_PATH, { readonly: false });
    _db.pragma("foreign_keys = ON");
    _db.pragma("journal_mode = WAL");
  }
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}
