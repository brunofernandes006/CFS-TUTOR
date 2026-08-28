import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/server/supabaseRest";
import { loadHomeDataV2 } from "@/lib/server/homeDataV2";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ date: new Date().toISOString().slice(0, 10), targetMinutes: 45, slots: [] });
    }
    const data = await loadHomeDataV2();
    return NextResponse.json(data.mission);
  } catch (err) {
    console.error("[API /mission V2]", err);
    return NextResponse.json({ error: "Erro ao gerar missão" }, { status: 500 });
  }
}
