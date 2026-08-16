// ============================================================
// CFS Tutor — Serviço de XP e Gamificação
// Evita duplicação por idempotency_key
// ============================================================

import { getDb } from "@/lib/db";
import {
  XP_REWARDS,
  XP_THRESHOLDS,
  type GamificationLevel,
} from "@/lib/types";
import { DEFAULT_USER_ID } from "./userService";

// Garante tabela xp_events se não existir
function ensureXpTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS xp_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      idempotency_key TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_xp (
      user_id INTEGER PRIMARY KEY,
      total_xp INTEGER NOT NULL DEFAULT 0,
      streak_days INTEGER NOT NULL DEFAULT 0,
      last_activity_date TEXT,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export function getTotalXp(userId = DEFAULT_USER_ID): number {
  ensureXpTable();
  const db = getDb();
  const row = db
    .prepare("SELECT total_xp FROM user_xp WHERE user_id = ?")
    .get(userId) as { total_xp: number } | undefined;
  return row?.total_xp ?? 0;
}

export function getStreak(userId = DEFAULT_USER_ID): number {
  ensureXpTable();
  const db = getDb();
  const row = db
    .prepare("SELECT streak_days, last_activity_date FROM user_xp WHERE user_id = ?")
    .get(userId) as { streak_days: number; last_activity_date: string | null } | undefined;
  if (!row) return 0;
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  if (row.last_activity_date === today || row.last_activity_date === yesterday) {
    return row.streak_days;
  }
  return 0;
}

export function awardXp(
  amount: number,
  reason: string,
  idempotencyKey?: string,
  userId = DEFAULT_USER_ID
): { awarded: boolean; total: number } {
  ensureXpTable();
  const db = getDb();

  // Idempotência: se já foi registrado com essa chave, não duplicar
  if (idempotencyKey) {
    const exists = db
      .prepare("SELECT id FROM xp_events WHERE idempotency_key = ?")
      .get(idempotencyKey);
    if (exists) {
      return { awarded: false, total: getTotalXp(userId) };
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO xp_events (user_id, amount, reason, idempotency_key)
       VALUES (?, ?, ?, ?)`
    ).run(userId, amount, reason, idempotencyKey ?? null);

    const existing = db
      .prepare("SELECT total_xp, streak_days, last_activity_date FROM user_xp WHERE user_id = ?")
      .get(userId) as
      | { total_xp: number; streak_days: number; last_activity_date: string | null }
      | undefined;

    if (!existing) {
      db.prepare(
        `INSERT INTO user_xp (user_id, total_xp, streak_days, last_activity_date)
         VALUES (?, ?, 1, ?)`
      ).run(userId, amount, today);
    } else {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let newStreak = existing.streak_days;
      if (existing.last_activity_date !== today) {
        newStreak =
          existing.last_activity_date === yesterday ? newStreak + 1 : 1;
      }
      db.prepare(
        `UPDATE user_xp
         SET total_xp = total_xp + ?, streak_days = ?, last_activity_date = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ?`
      ).run(amount, newStreak, today, userId);
    }
  });

  tx();
  return { awarded: true, total: getTotalXp(userId) };
}

export function getLevelInfo(xp: number): {
  level: GamificationLevel;
  xp_to_next: number;
} {
  const levels = Object.entries(XP_THRESHOLDS) as [GamificationLevel, number][];
  let currentLevel: GamificationLevel = "Recruta";
  let nextThreshold = XP_THRESHOLDS["Patrulheiro"];

  for (let i = levels.length - 1; i >= 0; i--) {
    if (xp >= levels[i][1]) {
      currentLevel = levels[i][0];
      nextThreshold =
        i < levels.length - 1 ? levels[i + 1][1] : levels[i][1];
      break;
    }
  }

  return {
    level: currentLevel,
    xp_to_next: Math.max(0, nextThreshold - xp),
  };
}

export { XP_REWARDS };
