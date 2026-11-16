"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AUTH_CHANGE_KEY, leaveProtectedView } from "@/lib/auth-navigation";
import { signInDestination } from "@/lib/return-destination";
import { sessionStatusSchema } from "@/lib/session-status";

export function useProtectedSession(
  userId: string,
  checkIntervalSeconds: number,
) {
  const queryClient = useQueryClient();
  const content = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<"checking" | "ready" | "error">(
    "checking",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    async function check(background = false) {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      clearTimeout(timer);
      const current = ++sequence;
      if (!background) {
        if (content.current) content.current.hidden = true;
        setStatus("checking");
      }
      try {
        const response = await fetch(
          "/api/auth/get-session?disableRefresh=true",
          {
            cache: "no-store",
            signal,
          },
        );
        if (!response.ok) throw new Error("Session check unavailable");
        const session = sessionStatusSchema.parse(await response.json());
        if (!active || current !== sequence) return;
        if (!session?.user?.emailVerified) {
          leaveProtectedView(
            queryClient,
            signInDestination(
              window.location.pathname + window.location.search,
            ),
          );
          return;
        }
        if (session.user.id !== userId) {
          leaveProtectedView(
            queryClient,
            window.location.pathname + window.location.search,
          );
          return;
        }
        setStatus("ready");
        if (content.current) content.current.hidden = false;
        if (document.visibilityState === "visible") {
          const serverNow = Date.parse(response.headers.get("Date") ?? "");
          const untilExpiry =
            Date.parse(session.session.expiresAt) -
            (Number.isFinite(serverNow) ? serverNow : Date.now());
          timer = setTimeout(
            () => void check(true),
            Math.min(
              checkIntervalSeconds * 1_000,
              Math.max(1_000, untilExpiry),
            ),
          );
        }
      } catch {
        if (!signal.aborted && active && current === sequence)
          setStatus("error");
      }
    }
    function hide() {
      controller?.abort();
      clearTimeout(timer);
      sequence += 1;
      if (content.current) content.current.hidden = true;
      queryClient.clear();
    }
    function restored(event: PageTransitionEvent) {
      if (event.persisted) void check();
    }
    function changed(event: StorageEvent) {
      if (event.key !== AUTH_CHANGE_KEY) return;
      hide();
      if (event.newValue?.startsWith("signout:"))
        leaveProtectedView(queryClient, "/");
      else void check();
    }
    function focused() {
      void check();
    }
    function visibilityChanged() {
      if (document.visibilityState === "visible") void check();
      else clearTimeout(timer);
    }
    void check();
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", restored);
    window.addEventListener("focus", focused);
    window.addEventListener("storage", changed);
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      active = false;
      controller?.abort();
      clearTimeout(timer);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", restored);
      window.removeEventListener("focus", focused);
      window.removeEventListener("storage", changed);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [userId, queryClient, attempt, checkIntervalSeconds]);

  return { content, status, retry: () => setAttempt((value) => value + 1) };
}
