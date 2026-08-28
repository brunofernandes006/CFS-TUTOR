import { NextRequest, NextResponse } from "next/server";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const COOKIE_NAME = "cfs_access";
const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/manifest.json", "/icon.svg", "/sw.js"]);

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === request.nextUrl.host;
  } catch {
    return false;
  }
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function hasValidSession(request: NextRequest): Promise<boolean> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) return false;
  const expected = await sha256(`${secret}:cfs-access-session:v1`);
  return request.cookies.get(COOKIE_NAME)?.value === expected;
}

function securityHeaders(response: NextResponse, isApi: boolean): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  if (isApi) response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (isApi && MUTATING_METHODS.has(request.method) && !isSameOrigin(request)) {
    return securityHeaders(NextResponse.json({ error: "Origem da requisição não autorizada." }, { status: 403 }), true);
  }

  const authenticated = isPublic ? false : await hasValidSession(request);
  if (!isPublic && !authenticated) {
    if (isApi) {
      return securityHeaders(NextResponse.json({ error: "Sessão necessária." }, { status: 401 }), true);
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return securityHeaders(NextResponse.redirect(loginUrl), false);
  }

  if (pathname === "/login" && await hasValidSession(request)) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return securityHeaders(NextResponse.redirect(homeUrl), false);
  }

  return securityHeaders(NextResponse.next(), isApi);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icons/).*)"],
};
