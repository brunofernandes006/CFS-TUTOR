import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/services/dashboardService";
import { ensureDefaultUser } from "@/lib/services/userService";

export async function GET() {
  try {
    ensureDefaultUser();
    const stats = getDashboardStats();
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[API /dashboard]", err);
    return NextResponse.json({ error: "Erro ao carregar dashboard" }, { status: 500 });
  }
}
