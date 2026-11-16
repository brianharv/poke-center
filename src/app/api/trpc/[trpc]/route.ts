import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/router";
import { readRequestSession } from "@/server/session";

export const runtime = "nodejs";

function handler(req: Request) {
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: async () => {
      const { session, headers } = await readRequestSession(req.headers, true);
      for (const cookie of headers.getSetCookie())
        responseHeaders.append("Set-Cookie", cookie);
      return { session };
    },
    responseMeta: () => ({ headers: responseHeaders }),
  });
}

export { handler as GET, handler as POST };
