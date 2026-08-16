import { NextRequest, NextResponse } from "next/server";
import { getQuestionById } from "@/lib/services/questionService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const qId = parseInt(id, 10);
    if (isNaN(qId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }
    const question = getQuestionById(qId);
    if (!question) {
      return NextResponse.json({ error: "Questão não encontrada" }, { status: 404 });
    }
    return NextResponse.json(question);
  } catch (err) {
    console.error("[API /questions/:id]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
