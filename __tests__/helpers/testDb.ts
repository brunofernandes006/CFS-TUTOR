/**
 * Banco SQLite em memória para testes.
 * Cria todas as tabelas necessárias e injeta o módulo db.ts com mock.
 */
import Database from "better-sqlite3";

export function createTestDb(): Database.Database {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL,
      email TEXT,
      full_name TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS syllabus_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      syllabus_uid TEXT,
      parent_id INTEGER,
      discipline TEXT NOT NULL,
      category TEXT,
      topic TEXT,
      subtopic TEXT,
      title TEXT NOT NULL,
      edital_text TEXT,
      edital_order INTEGER,
      weight REAL,
      question_count INTEGER,
      required INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      source_reference TEXT,
      coverage_status TEXT,
      created_at TEXT,
      updated_at TEXT
    );

    CREATE TABLE IF NOT EXISTS syllabus_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      syllabus_item_id INTEGER NOT NULL,
      studied INTEGER DEFAULT 0,
      mastery_score REAL DEFAULT 0,
      questions_answered INTEGER DEFAULT 0,
      correct_answers INTEGER DEFAULT 0,
      wrong_answers INTEGER DEFAULT 0,
      accuracy REAL DEFAULT 0,
      consecutive_correct INTEGER DEFAULT 0,
      consecutive_wrong INTEGER DEFAULT 0,
      max_consecutive_correct INTEGER DEFAULT 0,
      last_study TIMESTAMP,
      last_attempt TIMESTAMP,
      next_review TIMESTAMP,
      review_stage INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, syllabus_item_id)
    );

    CREATE TABLE IF NOT EXISTS questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_uid TEXT NOT NULL UNIQUE,
      origin TEXT NOT NULL CHECK(origin IN ('OFICIAL','INEDITA','DIDATICA')),
      syllabus_item_id INTEGER NOT NULL,
      discipline TEXT NOT NULL,
      theme TEXT,
      subtheme TEXT,
      difficulty INTEGER NOT NULL DEFAULT 2,
      statement TEXT NOT NULL,
      explanation TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      verified INTEGER NOT NULL DEFAULT 0,
      content_hash TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (syllabus_item_id) REFERENCES syllabus_items(id)
    );

    CREATE TABLE IF NOT EXISTS question_options (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      option_index INTEGER NOT NULL,
      option_text TEXT NOT NULL,
      is_correct INTEGER NOT NULL DEFAULT 0,
      UNIQUE(question_id, option_index),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS question_sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL UNIQUE,
      exam_year INTEGER,
      exam_name TEXT,
      exam_number INTEGER,
      source_text TEXT,
      verified INTEGER NOT NULL DEFAULT 0,
      document_uid TEXT,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS question_topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_id INTEGER NOT NULL,
      topic TEXT NOT NULL,
      UNIQUE(question_id, topic),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS question_attempts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      syllabus_item_id INTEGER NOT NULL,
      question_id INTEGER,
      is_correct INTEGER NOT NULL,
      response_time_seconds INTEGER,
      difficulty_perceived INTEGER,
      attempt_number INTEGER,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS error_notebook (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      chosen_option_index INTEGER,
      correct_option_index INTEGER,
      theme TEXT,
      subtheme TEXT,
      error_count INTEGER NOT NULL DEFAULT 1,
      confusion_type TEXT,
      last_error_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS question_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, question_id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_uid TEXT NOT NULL,
      sha256 TEXT NOT NULL DEFAULT '',
      tipo TEXT,
      categoria TEXT,
      subcategoria TEXT,
      numero TEXT,
      ano INTEGER,
      titulo TEXT,
      nome_original TEXT,
      caminho_original TEXT,
      cfs26_priority INTEGER DEFAULT 0,
      edital_reference TEXT,
      status_documento TEXT DEFAULT 'ATIVO'
    );

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

  return db;
}

/** Seed mínimo para a maioria dos testes */
export function seedMinimal(db: Database.Database): {
  userId: number;
  syllabusItemId: number;
  questionId: number;
} {
  db.prepare(
    "INSERT INTO users (id, username, full_name) VALUES (1, 'aluno_cfs', 'Aluno CFS')"
  ).run();

  db.prepare(
    `INSERT INTO syllabus_items (id, discipline, title, active)
     VALUES (1, 'Língua Portuguesa', 'Interpretação de textos', 1)`
  ).run();

  db.prepare(
    `INSERT INTO questions (id, question_uid, origin, syllabus_item_id, discipline, statement, difficulty)
     VALUES (1, 'test-q1', 'INEDITA', 1, 'Língua Portuguesa', 'Qual a capital do Brasil?', 2)`
  ).run();

  db.prepare(
    "INSERT INTO question_options (question_id, option_index, option_text, is_correct) VALUES (1,0,'Brasília',1)"
  ).run();
  db.prepare(
    "INSERT INTO question_options (question_id, option_index, option_text, is_correct) VALUES (1,1,'São Paulo',0)"
  ).run();

  return { userId: 1, syllabusItemId: 1, questionId: 1 };
}
