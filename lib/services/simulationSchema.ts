// ============================================================
// CFS Tutor — DDL das tabelas de simulado
// Usado tanto pela migração real quanto pelos testes em memória
// ============================================================

export const SIMULATION_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS simulations (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id              INTEGER NOT NULL,
  simulation_type      TEXT    NOT NULL CHECK(simulation_type IN ('OFICIAL','ADAPTATIVO')),
  status               TEXT    NOT NULL DEFAULT 'PENDING'
                                CHECK(status IN ('PENDING','ACTIVE','FINISHED','ABANDONED')),
  target_questions     INTEGER NOT NULL,
  time_limit_seconds   INTEGER NOT NULL,
  started_at           TIMESTAMP,
  finished_at          TIMESTAMP,
  duration_seconds     INTEGER,
  score_portuguese     REAL,
  score_math           REAL,
  score_professional   REAL,
  weighted_final_score REAL,
  minimums_met         INTEGER,
  created_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS simulation_questions (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id INTEGER NOT NULL,
  question_id   INTEGER NOT NULL,
  discipline    TEXT    NOT NULL,
  order_number  INTEGER NOT NULL,
  weight        REAL    NOT NULL DEFAULT 1,
  answered      INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(simulation_id, question_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id),
  FOREIGN KEY (question_id)   REFERENCES questions(id)
);

CREATE TABLE IF NOT EXISTS simulation_attempts (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id   INTEGER NOT NULL UNIQUE,
  user_id         INTEGER NOT NULL,
  started_at      TIMESTAMP,
  finished_at     TIMESTAMP,
  elapsed_seconds INTEGER,
  completed       INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (simulation_id) REFERENCES simulations(id),
  FOREIGN KEY (user_id)       REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS simulation_answers (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  simulation_id         INTEGER NOT NULL,
  question_id           INTEGER NOT NULL,
  selected_option_index INTEGER NOT NULL,
  correct_option_index  INTEGER NOT NULL,
  is_correct            INTEGER NOT NULL DEFAULT 0,
  response_time_seconds INTEGER,
  answered_at           TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(simulation_id, question_id),
  FOREIGN KEY (simulation_id) REFERENCES simulations(id),
  FOREIGN KEY (question_id)   REFERENCES questions(id)
);

CREATE INDEX IF NOT EXISTS idx_simulations_user    ON simulations(user_id);
CREATE INDEX IF NOT EXISTS idx_simulations_status  ON simulations(status);
CREATE INDEX IF NOT EXISTS idx_sim_questions_sim   ON simulation_questions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_sim_answers_sim     ON simulation_answers(simulation_id);
`;
