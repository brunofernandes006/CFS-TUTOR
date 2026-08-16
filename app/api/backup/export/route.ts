import { NextResponse } from "next/server";
import { exportBackup } from "@/lib/services/backupService";
import { ensureDefaultUser } from "@/lib/services/userService";

export async function GET() {
  try {
    const user = ensureDefaultUser();
    const data = exportBackup(user.id);
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro desconhecido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
