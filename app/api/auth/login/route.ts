import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseSelect } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";

const DEFAULT_USER_ID = process.env.CFS_DEFAULT_USER_ID ?? "00000000-0000-4000-8000-000000000001";
const COOKIE_NAME = "cfs_access";

function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function safeHexEqual(left: string, right: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(left) || !/^[0-9a-f]{64}$/i.test(right)) return false;
  return timingSafeEqual(Buffer.from(left, "hex"), Buffer.from(right, "hex"));
}

function sessionToken(): string | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? sha256(`${secret}:cfs-access-session:v1`) : null;
}

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Servidor não configurado." }, { status: 503 });
    }

    const body = (await request.json()) as { accessKey?: string };
    const accessKey = body.accessKey?.trim() ?? "";
    if (accessKey.length < 16 || accessKey.length > 160) {
      return NextResponse.json({ error: "Chave de acesso inválida." }, { status: 401 });
    }

    const users = await supabaseSelect<Array<{ access_key_hash: string | null }>>(
      "app_users",
      new URLSearchParams({ id: `eq.${DEFAULT_USER_ID}`, select: "access_key_hash", limit: "1" })
    );
    const storedHash = users[0]?.access_key_hash ?? "";
    const candidateHash = sha256(accessKey);
    if (!storedHash || !safeHexEqual(candidateHash, storedHash)) {
      return NextResponse.json({ error: "Chave de acesso inválida." }, { status: 401 });
    }

    const token = sessionToken();
    if (!token) return NextResponse.json({ error: "Servidor não configurado." }, { status: 503 });

    const response = NextResponse.json({ success: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json({ error: "Não foi possível validar o acesso." }, { status: 500 });
  }
}
