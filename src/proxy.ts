import { NextResponse, type NextRequest } from "next/server";
import { signInDestination } from "@/lib/return-destination";
import { readSession } from "@/server/session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (
    pathname === "/" ||
    pathname === "/verify-email" ||
    pathname === "/api/health" ||
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/api/trpc/")
  ) {
    return NextResponse.next();
  }

  const session = await readSession(request.headers);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-app-return-to", pathname + search);
  const response = session
    ? NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    : pathname.startsWith("/api/")
      ? NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      : NextResponse.redirect(
          new URL(signInDestination(pathname + search), request.url),
        );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
