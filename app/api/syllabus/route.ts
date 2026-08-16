import { NextRequest, NextResponse } from "next/server";
import { getSyllabusWithProgress } from "@/lib/services/syllabusService";
import { ensureDefaultUser, DEFAULT_USER_ID } from "@/lib/services/userService";

export async function GET(req: NextRequest) {
  try {
    ensureDefaultUser();
    const { searchParams } = new URL(req.url);
    const filter = searchParams.get("filter") ?? "todos";
    const discipline = searchParams.get("discipline") ?? undefined;

    let items = getSyllabusWithProgress(DEFAULT_USER_ID);

    if (discipline) {
      items = items.filter((i) => i.discipline === discipline);
    }

    switch (filter) {
      case "nao_estudados":
        items = items.filter((i) => !i.progress?.studied);
        break;
      case "criticos":
        items = items.filter((i) => i.mastery_level === "CRÍTICO" && i.progress?.studied);
        break;
      case "fracos":
        items = items.filter((i) => i.mastery_level === "FRACO");
        break;
      case "dominados":
        items = items.filter((i) => i.mastery_level === "DOMINADO");
        break;
      case "revisao_pendente":
        items = items.filter(
          (i) => i.progress?.next_review && new Date(i.progress.next_review) < new Date()
        );
        break;
    }

    return NextResponse.json(items);
  } catch (err) {
    console.error("[API /syllabus]", err);
    return NextResponse.json({ error: "Erro ao carregar syllabus" }, { status: 500 });
  }
}
