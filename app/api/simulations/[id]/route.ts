import { NextRequest, NextResponse } from "next/server";
import { getSimulation } from "@/lib/services/simulationService";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const simId = parseInt(id, 10);
    if (isNaN(simId)) return NextResponse.json({ error: "ID inválido." }, { status: 400 });

    const data = getSimulation(simId, DEFAULT_USER_ID);
    if (!data) return NextResponse.json({ error: "Simulado não encontrado." }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[GET /api/simulations/:id]", err);
    return NextResponse.json({ error: "Erro interno." }, { status: 500 });
  }
}
