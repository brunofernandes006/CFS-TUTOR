import { NextRequest, NextResponse } from "next/server";
import { getRandomQuestion, countQuestions } from "@/lib/services/questionService";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const discipline = searchParams.get("discipline") ?? undefined;
    const origin = searchParams.get("origin") ?? undefined;

    const total = countQuestions({ discipline, origin });

    if (total === 0) {
      return NextResponse.json(
        {
          question: null,
          total: 0,
          message: "Banco de questões ainda não possui itens para este conteúdo.",
        },
        { status: 200 }
      );
    }

    const question = getRandomQuestion({ discipline, origin });
    return NextResponse.json({ question, total });
  } catch (err) {
    console.error("[API /questions]", err);
    return NextResponse.json({ error: "Erro ao carregar questão" }, { status: 500 });
  }
}
