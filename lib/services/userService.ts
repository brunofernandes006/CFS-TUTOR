// ============================================================
// CFS Tutor — Serviço de usuário local
// Garante que id=1 seja sempre o perfil principal "Aluno CFS".
// Nunca apaga outros usuários (podem ser histórico de testes).
// ============================================================

import { getDb } from "@/lib/db";
import type { User } from "@/lib/types";

export const DEFAULT_USER_ID = 1;
export const DEFAULT_USERNAME = "aluno_cfs";
export const DEFAULT_FULL_NAME = "Aluno CFS";

// Prefixos que identificam usuários criados por testes automatizados
const TEST_USERNAME_PREFIXES = ["teste_", "test_", "aluno_novo", "aluno_acertos",
  "aluno_erros", "aluno_revisao", "aluno_novo_conteudo",
  "aluno_ponto_fraco", "aluno_disciplinas", "aluno_prontidao"];

function isTestUser(username: string): boolean {
  const lower = username.toLowerCase();
  return TEST_USERNAME_PREFIXES.some((p) => lower.startsWith(p) || lower === p);
}

export function ensureDefaultUser(): User {
  const db = getDb();

  const existing = db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(DEFAULT_USER_ID) as User | undefined;

  if (!existing) {
    // id=1 não existe: criar perfil principal
    db.prepare(
      `INSERT OR IGNORE INTO users (id, username, full_name, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    ).run(DEFAULT_USER_ID, DEFAULT_USERNAME, DEFAULT_FULL_NAME);
  } else if (isTestUser(existing.username)) {
    // id=1 foi ocupado por um usuário de teste: corrigir sem apagar
    db.prepare(
      `UPDATE users SET username = ?, full_name = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(DEFAULT_USERNAME, DEFAULT_FULL_NAME, DEFAULT_USER_ID);
  }
  // Se username já é aluno_cfs mas full_name foi alterado acidentalmente, não toca.

  return db
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(DEFAULT_USER_ID) as User;
}

export function getUser(userId = DEFAULT_USER_ID): User | null {
  const db = getDb();
  return (
    (db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as
      | User
      | undefined) ?? null
  );
}

export function updateUserName(
  fullName: string,
  userId = DEFAULT_USER_ID
): void {
  const db = getDb();
  db.prepare(
    "UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
  ).run(fullName.trim(), userId);
}

export function isDefaultUserHealthy(): boolean {
  const db = getDb();
  const u = db.prepare("SELECT username FROM users WHERE id = ?").get(DEFAULT_USER_ID) as
    | { username: string }
    | undefined;
  return !!u && u.username === DEFAULT_USERNAME;
}
