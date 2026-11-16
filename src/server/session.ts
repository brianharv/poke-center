import "server-only";
import { getAuth } from "@/server/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { signInDestination } from "@/lib/return-destination";
import { cache } from "react";

export async function readSession(headers: Headers) {
  return (await readRequestSession(headers)).session;
}

export async function readRequestSession(headers: Headers, renew = false) {
  const result = await getAuth().api.getSession({
    headers,
    returnHeaders: true,
    query: { disableCookieCache: true, disableRefresh: !renew },
  });
  return {
    session: result.response?.user.emailVerified ? result.response : null,
    headers: result.headers,
  };
}

export const requirePageSession = cache(async () => {
  const requestHeaders = await headers();
  const session = await readSession(requestHeaders);
  if (!session) {
    redirect(signInDestination(requestHeaders.get("x-app-return-to")));
  }
  return session;
});
