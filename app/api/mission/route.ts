import { NextResponse } from "next/server";
import { generateDailyMission } from "@/lib/services/pedagogyService";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function GET() {
  try {
    const mission = generateDailyMission(DEFAULT_USER_ID);
    return NextResponse.json(mission);
  } catch (err) {
    console.error("[API /mission]", err);
    return NextResponse.json({ error: "Erro ao gerar missão" }, { status: 500 });
  }
}
