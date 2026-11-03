import "server-only";
import { getAuth } from "@/server/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInDestination } from "@/lib/return-destination";

export async function readSession(headers: Headers) {
  const session = await getAuth().api.getSession({
    headers,
    query: { disableCookieCache: true, disableRefresh: true },
  });
  return session?.user.emailVerified ? session : null;
}

export async function requirePageSession() {
  const requestHeaders = await headers();
  const session = await readSession(requestHeaders);
  if (!session) {
    redirect(signInDestination(requestHeaders.get("x-app-return-to")));
  }
  return session;
}
