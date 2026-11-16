"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AUTH_CHANGE_KEY,
  clearProtectedView,
  leaveProtectedView,
} from "@/lib/auth-navigation";
import { signInDestination } from "@/lib/return-destination";
import { sessionStatusSchema } from "@/lib/session-status";

export function useProtectedSession(
  userId: string,
  checkIntervalSeconds: number,
) {
  const queryClient = useQueryClient();
  const { isError, refetch } = useQuery({
    queryKey: ["session", userId],
    initialData: { id: userId, emailVerified: true },
    refetchOnMount: false,
    refetchOnWindowFocus: "always",
    refetchInterval: checkIntervalSeconds * 1_000,
    refetchIntervalInBackground: false,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        "/api/auth/get-session?disableRefresh=true",
        { cache: "no-store", signal },
      );
      if (!response.ok) throw new Error("Session check unavailable");
      const session = sessionStatusSchema.parse(await response.json());
      signal.throwIfAborted();
      const current = window.location.pathname + window.location.search;
      if (!session?.user.emailVerified)
        leaveProtectedView(queryClient, signInDestination(current));
      else if (session.user.id !== userId)
        leaveProtectedView(queryClient, current);
      return session?.user ?? null;
    },
  });

  useEffect(() => {
    const events = new AbortController();
    function handle(event: Event) {
      if (event.type === "pagehide") clearProtectedView(queryClient);
      else if (event instanceof PageTransitionEvent && event.persisted)
        window.location.reload();
      else if (event instanceof StorageEvent && event.key === AUTH_CHANGE_KEY) {
        const destination = event.newValue?.startsWith("signout:")
          ? "/"
          : window.location.pathname + window.location.search;
        leaveProtectedView(queryClient, destination);
      } else if (event.type === "focus") void refetch({ cancelRefetch: false });
    }
    for (const type of ["pagehide", "pageshow", "storage", "focus"]) {
      window.addEventListener(type, handle, { signal: events.signal });
    }
    return () => events.abort();
  }, [queryClient, refetch]);

  return { error: isError, retry: refetch };
}
