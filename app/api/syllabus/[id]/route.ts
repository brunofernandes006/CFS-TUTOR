import { NextRequest, NextResponse } from "next/server";
import { getSyllabusItemById } from "@/lib/services/syllabusService";
import { getQuestionsForSyllabusItem } from "@/lib/services/questionService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const itemId = parseInt(id, 10);
    if (isNaN(itemId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const item = getSyllabusItemById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Item não encontrado" }, { status: 404 });
    }
    const questions = getQuestionsForSyllabusItem(itemId);
    return NextResponse.json({ item, questions });
  } catch (err) {
    console.error("[API /syllabus/:id]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
