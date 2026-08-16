import { NextRequest, NextResponse } from "next/server";
import {
  generateOfficialSimulation,
  generateAdaptiveSimulation,
  getSimulationHistory,
} from "@/lib/services/simulationService";
import { DEFAULT_USER_ID, ensureDefaultUser } from "@/lib/services/userService";

// GET /api/simulations → histórico
export async function GET() {
  try {
    ensureDefaultUser();
    const history = getSimulationHistory(DEFAULT_USER_ID);
    return NextResponse.json(history);
  } catch (err) {
    console.error("[GET /api/simulations]", err);
    return NextResponse.json({ error: "Erro ao buscar histórico." }, { status: 500 });
  }
}

// POST /api/simulations → criar simulado
export async function POST(req: NextRequest) {
  try {
    ensureDefaultUser();
    const body = await req.json();
    const type: string = body.type ?? "OFICIAL";
    const targetQuestions: number = body.target_questions ?? 30;

    if (type === "OFICIAL") {
      const result = generateOfficialSimulation(DEFAULT_USER_ID);
      if (!result.ok) {
        return NextResponse.json(result.error, { status: 422 });
      }
      return NextResponse.json({ simulation_id: result.simulation_id }, { status: 201 });
    }

    if (type === "ADAPTATIVO") {
      const result = generateAdaptiveSimulation(DEFAULT_USER_ID, targetQuestions);
      return NextResponse.json(result, { status: 201 });
    }

    return NextResponse.json({ error: "Tipo inválido. Use OFICIAL ou ADAPTATIVO." }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/simulations]", err);
    return NextResponse.json({ error: "Erro ao criar simulado." }, { status: 500 });
  }
}
