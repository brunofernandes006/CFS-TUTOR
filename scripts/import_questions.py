#!/usr/bin/env python3
"""
CFS Tutor — Importador Real de Banco de Questões
=================================================
Importa questões de arquivos JSON ou CSV para o banco SQLite do CFS Tutor.

Uso:
    python import_questions.py <arquivo> --dry-run [--verbose]
    python import_questions.py <arquivo> --write [--db <caminho>] [--verbose]

Flags:
    --dry-run   Apenas valida. NÃO escreve nada no banco.
    --write     Habilita gravação real. Sem esta flag, nada é escrito.
    --db        Caminho para o banco SQLite. Se omitido, busca o banco padrão.
    --verbose   Mostra detalhes das questões processadas.

Sem --write, NENHUMA alteração é feita ao banco.
"""

import json
import csv
import sys
import os
import argparse
import sqlite3
from datetime import datetime
from typing import Any

VALID_DISCIPLINES = {
    "Língua Portuguesa",
    "Matemática e Raciocínio Lógico",
    "Conhecimentos Profissionais",
}

VALID_ORIGINS = {"OFICIAL", "INEDITA", "DIDATICA"}

REQUIRED_FIELDS = [
    "question_uid", "origin", "discipline", "syllabus_uid",
    "statement", "options", "correct_option",
]


class ImportReport:
    def __init__(self):
        self.validated = 0
        self.imported = 0
        self.rejected = 0
        self.duplicated = 0
        self.invalid = 0
        self.reasons: list[str] = []
        self.seen_uids: set[str] = set()

    def add_rejected(self, uid: str, reason: str):
        self.rejected += 1
        self.reasons.append(f"REJEITADA [{uid}]: {reason}")

    def add_duplicated(self, uid: str):
        self.duplicated += 1
        self.reasons.append(f"DUPLICADA [{uid}]: question_uid já existe")

    def add_invalid(self, uid: str, reason: str):
        self.invalid += 1
        self.reasons.append(f"INVÁLIDA [{uid}]: {reason}")

    def add_validated(self, uid: str):
        self.validated += 1

    def add_imported(self, uid: str):
        self.imported += 1

    def summary(self, dry_run: bool) -> str:
        lines = [
            "=" * 60,
            "RELATÓRIO DE IMPORTAÇÃO — CFS Tutor",
            f"Data: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            f"Modo: {'DRY RUN (nenhuma alteração no banco)' if dry_run else 'GRAVAÇÃO REAL'}",
            "=" * 60,
            f"  VALIDADAS:     {self.validated}",
            f"  IMPORTADAS:    {self.imported}",
            f"  REJEITADAS:    {self.rejected}",
            f"  DUPLICADAS:    {self.duplicated}",
            f"  INVÁLIDAS:     {self.invalid}",
            "-" * 60,
        ]
        if self.reasons:
            lines.append("DETALHES:")
            for r in self.reasons:
                lines.append(f"  - {r}")
        else:
            lines.append("Nenhum erro encontrado.")
        lines.append("=" * 60)
        return "\n".join(lines)


def find_default_db() -> str | None:
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..",
                     "CFS_BIBLIOTECA_SISTEMA", "05_DADOS_DO_SISTEMA", "cfs_catalogo.db"),
        os.path.join(os.getcwd(), "..",
                     "CFS_BIBLIOTECA_SISTEMA", "05_DADOS_DO_SISTEMA", "cfs_catalogo.db"),
        os.path.join(os.getcwd(), "cfs_catalogo.db"),
    ]
    for c in candidates:
        if os.path.isfile(c):
            return os.path.abspath(c)
    return None


def get_table_columns(cursor: sqlite3.Cursor, table: str) -> set[str]:
    cursor.execute(f"PRAGMA table_info([{table}])")
    return {row[1] for row in cursor.fetchall()}


def load_json(filepath: str) -> list[dict[str, Any]]:
    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, dict) or "questions" not in data:
        raise ValueError("JSON deve conter campo 'questions' (array)")
    return data["questions"]


def load_csv(filepath: str) -> list[dict[str, Any]]:
    questions = []
    with open(filepath, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            opts_str = row.get("options", "")
            opts = [o.strip() for o in opts_str.split("|") if o.strip()]
            row["options"] = [{"option_text": o} for o in opts]
            try:
                row["correct_option"] = int(row.get("correct_option", -1))
            except ValueError:
                row["correct_option"] = -1
            try:
                row["difficulty"] = int(row.get("difficulty", 3))
            except ValueError:
                row["difficulty"] = 3
            try:
                if row.get("year"):
                    row["year"] = int(row["year"])
            except ValueError:
                pass
            try:
                if row.get("number"):
                    row["number"] = int(row["number"])
            except ValueError:
                pass
            row["verified"] = str(row.get("verified", "")).lower() in ("true", "1", "sim", "yes")
            questions.append(row)
    return questions


def validate_question(q: dict[str, Any], index: int, report: ImportReport,
                      existing_question_uids: set[str],
                      valid_syllabus_uids: set[str]) -> bool:
    uid = q.get("question_uid", f"#{index}")

    for field in REQUIRED_FIELDS:
        if field not in q or q[field] is None or (isinstance(q[field], str) and not q[field].strip()):
            report.add_invalid(uid, f"Campo obrigatório ausente: {field}")
            return False

    origin = q.get("origin", "")
    if origin not in VALID_ORIGINS:
        report.add_invalid(uid, f"Origem inválida: {origin}")
        return False

    discipline = q.get("discipline", "")
    if discipline not in VALID_DISCIPLINES:
        report.add_invalid(uid, f"Disciplina inválida: {discipline}")
        return False

    syllabus_uid = q.get("syllabus_uid", "")
    if valid_syllabus_uids and syllabus_uid not in valid_syllabus_uids:
        report.add_invalid(uid, f"syllabus_uid não encontrado: {syllabus_uid}")
        return False

    options = q.get("options", [])
    if not isinstance(options, list) or len(options) < 4 or len(options) > 5:
        report.add_invalid(uid, f"Alternativas inválidas: esperado 4-5, recebido {len(options) if isinstance(options, list) else 'N/A'}")
        return False
    for i, opt in enumerate(options):
        if not isinstance(opt, dict) or not opt.get("option_text", "").strip():
            report.add_invalid(uid, f"Alternativa {i} vazia ou mal formada")
            return False

    correct = q.get("correct_option")
    if not isinstance(correct, int) or correct < 0 or correct >= len(options):
        report.add_invalid(uid, f"Gabarito inválido: {correct} (range: 0-{len(options)-1})")
        return False

    if uid in existing_question_uids or uid in report.seen_uids:
        report.add_duplicated(uid)
        return False

    if origin == "OFICIAL":
        missing = []
        if not q.get("verified"):
            missing.append("verified=true")
        if not q.get("year"):
            missing.append("year")
        if not q.get("exam"):
            missing.append("exam")
        if not q.get("number"):
            missing.append("number")
        if not q.get("source"):
            missing.append("source")
        if missing:
            report.add_rejected(uid, f"OFICIAL sem campos obrigatórios: {', '.join(missing)}")
            return False

    report.seen_uids.add(uid)
    report.add_validated(uid)
    return True


def insert_questions(conn: sqlite3.Connection, questions: list[dict[str, Any]],
                     report: ImportReport, verbose: bool):
    cursor = conn.cursor()

    q_cols = get_table_columns(cursor, "questions")
    opt_cols = get_table_columns(cursor, "question_options")
    src_cols = get_table_columns(cursor, "question_sources")
    top_cols = get_table_columns(cursor, "question_topics")

    try:
        cursor.execute("BEGIN")

        for q in questions:
            uid = q.get("question_uid", "")

            q_data = {
                "question_uid": uid,
                "origin": q["origin"],
                "discipline": q["discipline"],
                "statement": q["statement"],
                "difficulty": q.get("difficulty", 3),
                "active": 1,
                "verified": 1 if q.get("verified") else 0,
            }

            if q.get("theme") and "theme" in q_cols:
                q_data["theme"] = q["theme"]
            if q.get("subtheme") and "subtheme" in q_cols:
                q_data["subtheme"] = q["subtheme"]
            if q.get("explanation") and "explanation" in q_cols:
                q_data["explanation"] = q["explanation"]

            # Resolve syllabus_item_id from syllabus_uid
            syllabus_uid = q.get("syllabus_uid", "")
            cursor.execute("SELECT id FROM syllabus_items WHERE syllabus_uid = ?", (syllabus_uid,))
            row = cursor.fetchone()
            if row:
                q_data["syllabus_item_id"] = row[0]
            else:
                # Fallback: try by title match or skip
                cursor.execute("SELECT id FROM syllabus_items WHERE title LIKE ? LIMIT 1",
                               (f"%{syllabus_uid}%",))
                row = cursor.fetchone()
                if row:
                    q_data["syllabus_item_id"] = row[0]
                else:
                    report.add_invalid(uid, f"Não foi possível resolver syllabus_uid: {syllabus_uid}")
                    continue

            insertable_q = {k: v for k, v in q_data.items() if k in q_cols}
            cols_q = ", ".join(f"[{k}]" for k in insertable_q)
            phs_q = ", ".join("?" * len(insertable_q))
            cursor.execute(
                f"INSERT INTO questions ({cols_q}) VALUES ({phs_q})",
                list(insertable_q.values())
            )
            question_id = cursor.lastrowid

            for i, opt in enumerate(q.get("options", [])):
                opt_data = {
                    "question_id": question_id,
                    "option_index": i,
                    "option_text": opt["option_text"],
                    "is_correct": 1 if i == q.get("correct_option") else 0,
                }
                insertable_opt = {k: v for k, v in opt_data.items() if k in opt_cols}
                cols_o = ", ".join(f"[{k}]" for k in insertable_opt)
                phs_o = ", ".join("?" * len(insertable_opt))
                cursor.execute(
                    f"INSERT INTO question_options ({cols_o}) VALUES ({phs_o})",
                    list(insertable_opt.values())
                )

            if q.get("source") and q.get("origin") == "OFICIAL":
                src_data = {
                    "question_id": question_id,
                    "exam_year": q.get("year"),
                    "exam_name": q.get("exam"),
                    "exam_number": q.get("number"),
                    "source_text": q.get("source"),
                    "verified": 1,
                }
                insertable_src = {k: v for k, v in src_data.items() if k in src_cols}
                if insertable_src:
                    cols_s = ", ".join(f"[{k}]" for k in insertable_src)
                    phs_s = ", ".join("?" * len(insertable_src))
                    cursor.execute(
                        f"INSERT INTO question_sources ({cols_s}) VALUES ({phs_s})",
                        list(insertable_src.values())
                    )

            if q.get("theme") and "topic" in top_cols:
                try:
                    cursor.execute(
                        "INSERT INTO question_topics (question_id, topic) VALUES (?, ?)",
                        (question_id, q["theme"])
                    )
                except sqlite3.IntegrityError:
                    pass

            report.add_imported(uid)
            if verbose:
                print(f"  [OK] {uid}: {q['statement'][:60]}...")

        cursor.execute("COMMIT")

    except Exception as e:
        cursor.execute("ROLLBACK")
        raise e


def main():
    parser = argparse.ArgumentParser(description="Importador de questões CFS Tutor")
    parser.add_argument("file", help="Arquivo JSON ou CSV para importar")
    parser.add_argument("--dry-run", action="store_true",
                        help="Apenas validar, NÃO escrever nada no banco")
    parser.add_argument("--write", action="store_true",
                        help="Habilita gravação real no banco")
    parser.add_argument("--db", type=str, default=None,
                        help="Caminho para o banco SQLite")
    parser.add_argument("--verbose", action="store_true",
                        help="Mostrar detalhes")
    args = parser.parse_args()

    if not args.dry_run and not args.write:
        print("ERRO: Especifique --dry-run ou --write.")
        print("Sem --write, NENHUMA alteração é feita ao banco.")
        sys.exit(1)

    if not os.path.exists(args.file):
        print(f"ERRO: Arquivo não encontrado: {args.file}")
        sys.exit(1)

    ext = os.path.splitext(args.file)[1].lower()
    if ext == ".json":
        questions = load_json(args.file)
    elif ext == ".csv":
        questions = load_csv(args.file)
    else:
        print(f"ERRO: Formato não suportado: {ext} (use .json ou .csv)")
        sys.exit(1)

    db_path = args.db or find_default_db()
    if not db_path:
        print("ERRO: Banco não encontrado. Use --db <caminho>.")
        sys.exit(1)

    if not os.path.exists(db_path):
        print(f"ERRO: Banco não encontrado: {db_path}")
        sys.exit(1)

    print(f"Banco: {db_path}")
    print(f"Arquivo: {args.file} ({len(questions)} questões)")

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = ON")

    # Load existing UIDs from DB
    existing_question_uids: set[str] = set()
    try:
        cursor = conn.execute("SELECT question_uid FROM questions")
        existing_question_uids = {row[0] for row in cursor.fetchall()}
    except Exception:
        pass

    # Load valid syllabus_uids from DB
    valid_syllabus_uids: set[str] = set()
    try:
        cursor = conn.execute("SELECT syllabus_uid FROM syllabus_items WHERE syllabus_uid IS NOT NULL AND syllabus_uid != ''")
        valid_syllabus_uids = {row[0] for row in cursor.fetchall()}
    except Exception:
        pass

    print(f"Syllabus UIDs no catálogo: {len(valid_syllabus_uids)}")
    print(f"Question UIDs existentes: {len(existing_question_uids)}")

    # Validate
    report = ImportReport()
    valid_questions = []

    for i, q in enumerate(questions):
        if validate_question(q, i, report, existing_question_uids, valid_syllabus_uids):
            valid_questions.append(q)

    if args.verbose:
        print("\nQuestões validadas:")
        for q in valid_questions:
            print(f"  - {q['question_uid']}: {q['statement'][:60]}...")

    # Insert
    if args.dry_run:
        report.imported = 0
        print(f"\n[DRY RUN] {report.validated} questões validadas. Nenhuma alteração realizada no banco.")
    else:
        if valid_questions:
            insert_questions(conn, valid_questions, report, args.verbose)
            conn.commit()
            print(f"\n[WRITE] {report.imported} questões inseridas com sucesso.")
        else:
            print("\n[WRITE] Nenhuma questão válida para inserir.")

    conn.close()

    print(report.summary(dry_run=args.dry_run))


if __name__ == "__main__":
    main()
