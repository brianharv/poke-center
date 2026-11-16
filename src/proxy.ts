import { NextResponse, type NextRequest } from "next/server";
import { signInDestination } from "@/lib/return-destination";
import { readRequestSession } from "@/server/session";

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

  const { session, headers: sessionHeaders } = await readRequestSession(
    request.headers,
    true,
  );
  let response: NextResponse;
  if (session) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-app-return-to", pathname + search);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else if (pathname.startsWith("/api/")) {
    response = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } else {
    response = NextResponse.redirect(
      new URL(signInDestination(pathname + search), request.url),
    );
  }
  response.headers.set("Cache-Control", "private, no-store");
  for (const cookie of sessionHeaders.getSetCookie())
    response.headers.append("Set-Cookie", cookie);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
