import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_USER_ID } from "@/lib/services/userService";
import type { ErrorNotebookEntry, Question, QuestionOption } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = new URL(req.url);
    const discipline = searchParams.get("discipline");
    const theme = searchParams.get("theme");

    const conditions = ["en.user_id = ?"];
    const params: (string | number)[] = [DEFAULT_USER_ID];

    if (discipline) {
      conditions.push("q.discipline = ?");
      params.push(discipline);
    }
    if (theme) {
      conditions.push("en.theme = ?");
      params.push(theme);
    }

    const rows = db
      .prepare(
        `SELECT en.*,
                q.statement, q.discipline, q.theme as q_theme, q.origin, q.difficulty
         FROM error_notebook en
         JOIN questions q ON q.id = en.question_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY en.last_error_at DESC`
      )
      .all(...params) as Array<ErrorNotebookEntry & {
      statement: string;
      discipline: string;
      q_theme: string;
      origin: string;
      difficulty: number;
    }>;

    const enriched = rows.map((row) => {
      const options = db
        .prepare(
          "SELECT * FROM question_options WHERE question_id = ? ORDER BY option_index ASC"
        )
        .all(row.question_id) as QuestionOption[];
      return {
        ...row,
        options,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    console.error("[API /error-notebook]", err);
    return NextResponse.json({ error: "Erro ao carregar caderno de erros" }, { status: 500 });
  }
}
