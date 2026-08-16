import { NextRequest, NextResponse } from "next/server";
import { generateTutorPrompt, type TutorRequest } from "@/lib/services/tutorIAPromptService";

const VALID_OBJECTIVES = [
  "explicar_tema",
  "resumir_conteudo",
  "plano_revisao",
  "explicar_erro",
  "flashcards",
  "questoes_ineditas",
  "comparar_temas",
  "preparar_sessao",
];

const VALID_DISCIPLINES = [
  "Língua Portuguesa",
  "Matemática e Raciocínio Lógico",
  "Conhecimentos Profissionais",
];

const VALID_DEPTHS = ["basico", "intermediario", "avancado"];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.objective || !VALID_OBJECTIVES.includes(body.objective)) {
      return NextResponse.json({ error: "Objetivo inválido." }, { status: 400 });
    }
    if (!body.discipline || !VALID_DISCIPLINES.includes(body.discipline)) {
      return NextResponse.json({ error: "Disciplina inválida." }, { status: 400 });
    }
    if (body.depth && !VALID_DEPTHS.includes(body.depth)) {
      return NextResponse.json({ error: "Nível de profundidade inválido." }, { status: 400 });
    }

    const request: TutorRequest = {
      objective: body.objective,
      discipline: body.discipline,
      syllabus_item_id: body.syllabus_item_id ? Number(body.syllabus_item_id) : undefined,
      depth: body.depth || "intermediario",
      notes: body.notes || undefined,
    };

    const result = generateTutorPrompt(request);
    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
