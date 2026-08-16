import { NextRequest, NextResponse } from "next/server";
import { resetProgress } from "@/lib/services/backupService";
import { ensureDefaultUser } from "@/lib/services/userService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body?.confirm !== true) {
      return NextResponse.json({ error: "Confirmação necessária." }, { status: 400 });
    }

    const user = ensureDefaultUser();
    const result = resetProgress(user.id);

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
