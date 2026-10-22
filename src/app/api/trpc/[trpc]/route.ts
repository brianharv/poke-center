import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/server/router";

// Next.js requires this exact lowercase export name and a literal value.
export const runtime = "nodejs";

function handler(req: Request) {
  return fetchRequestHandler({ endpoint: "/api/trpc", req, router: appRouter });
}

export { handler as GET, handler as POST };
