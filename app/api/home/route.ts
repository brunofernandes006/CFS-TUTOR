import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/server/supabaseRest";
import { loadHomeDataV2 } from "@/lib/server/homeDataV2";

export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        setupRequired: true,
        mission: { date: new Date().toISOString().slice(0, 10), targetMinutes: 45, slots: [] },
        stats: {
          questionsAnswered: 0,
          accuracy: null,
          topicsStudied: 0,
          pendingReviews: 0,
          readiness: null,
          evidenceSufficient: false,
        },
        weakPoint: null,
        disciplineWeights: [
          { name: "Conhecimentos Profissionais", share: 50 },
          { name: "Língua Portuguesa", share: 30 },
          { name: "Matemática", share: 20 },
        ],
      });
    }

    return NextResponse.json(await loadHomeDataV2());
  } catch (err) {
    console.error("[API /home V2]", err);
    return NextResponse.json({ error: "Erro ao carregar o plano estratégico." }, { status: 500 });
  }
}
