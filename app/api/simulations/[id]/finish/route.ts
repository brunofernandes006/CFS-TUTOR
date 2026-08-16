import { NextRequest, NextResponse } from "next/server";
import { finishSimulation } from "@/lib/services/simulationService";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simId = parseInt(id, 10);
    if (isNaN(simId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const result = finishSimulation(simId, DEFAULT_USER_ID);
    if (!result.ok) return NextResponse.json({ error: result.message }, { status: 422 });
    return NextResponse.json(result.result);
  } catch (err) {
    console.error("[POST /api/simulations/:id/finish]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
