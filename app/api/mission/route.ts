import { NextResponse } from "next/server";
import { generateDailyMissionV2 } from "@/lib/services/missionServiceV2";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function GET() {
  try {
    const mission = generateDailyMissionV2(DEFAULT_USER_ID);
    return NextResponse.json(mission);
  } catch (err) {
    console.error("[API /mission]", err);
    return NextResponse.json({ error: "Erro ao gerar missão" }, { status: 500 });
  }
}
