import { NextRequest, NextResponse } from "next/server";
import { recordSimulationAnswer } from "@/lib/services/simulationService";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simId = parseInt(id, 10);
    if (isNaN(simId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const body = await req.json();
    const { question_id, selected_option_index, response_time_seconds } = body;

    if (question_id === undefined || selected_option_index === undefined) {
      return NextResponse.json(
        { error: "question_id e selected_option_index são obrigatórios." },
        { status: 400 }
      );
    }

    const result = recordSimulationAnswer({
      simulationId: simId,
      questionId: parseInt(question_id, 10),
      selectedOptionIndex: parseInt(selected_option_index, 10),
      responseTimeSecs: response_time_seconds,
      userId: DEFAULT_USER_ID,
    });

    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 422 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("[POST /api/simulations/:id/answer]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
