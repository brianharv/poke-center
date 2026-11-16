import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/router";

export const runtime = "nodejs";

function handler(req: Request) {
  const responseHeaders = new Headers({ "Cache-Control": "private, no-store" });
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: () => ({ headers: req.headers, responseHeaders }),
    responseMeta: () => ({ headers: responseHeaders }),
  });
}

export { handler as GET, handler as POST };
