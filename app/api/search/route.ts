import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") ?? "";
    const term = `%${q}%`;
    const db = getDb();

    const syllabus = db
      .prepare(
        `SELECT si.*, sp.studied, sp.mastery_score, sp.correct_answers, sp.wrong_answers,
                sp.consecutive_correct, sp.consecutive_wrong, sp.review_stage,
                sp.next_review, sp.last_study
         FROM syllabus_items si
         LEFT JOIN syllabus_progress sp ON sp.syllabus_item_id = si.id AND sp.user_id = ?
         WHERE si.title LIKE ? OR si.topic LIKE ? OR si.subtopic LIKE ?
         LIMIT 20`
      )
      .all(DEFAULT_USER_ID, term, term, term);

    const documents = db
      .prepare(
        `SELECT * FROM documents
         WHERE titulo LIKE ? OR numero LIKE ? OR edital_reference LIKE ?
         LIMIT 20`
      )
      .all(term, term, term);

    return NextResponse.json({ syllabus, documents });
  } catch (err) {
    console.error("[API /search]", err);
    return NextResponse.json({ error: "Erro ao pesquisar" }, { status: 500 });
  }
}
