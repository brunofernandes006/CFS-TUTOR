import { NextResponse } from "next/server";
import { getPendingReviews } from "@/lib/services/pedagogyService";
import { DEFAULT_USER_ID } from "@/lib/services/userService";

export async function GET() {
  try {
    const reviews = getPendingReviews(DEFAULT_USER_ID);
    const overdue = reviews.filter((r) => r.overdue);
    const today = reviews.filter(
      (r) =>
        !r.overdue &&
        r.next_review === new Date().toISOString().slice(0, 10)
    );
    const upcoming = reviews.filter(
      (r) =>
        !r.overdue &&
        r.next_review !== new Date().toISOString().slice(0, 10)
    );
    return NextResponse.json({ overdue, today, upcoming, all: reviews });
  } catch (err) {
    console.error("[API /reviews]", err);
    return NextResponse.json({ error: "Erro ao carregar revisões" }, { status: 500 });
  }
}
