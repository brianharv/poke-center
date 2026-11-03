"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AUTH_CHANGE_KEY, leaveProtectedView } from "@/lib/auth-navigation";
import { signInDestination } from "@/lib/return-destination";

export function ProtectedSessionBoundary({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const content = useRef<HTMLElement>(null);
  const [status, setStatus] = useState<"checking" | "ready" | "error">(
    "checking",
  );
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    let sequence = 0;
    async function check() {
      const current = ++sequence;
      if (content.current) content.current.hidden = true;
      setStatus("checking");
      try {
        const response = await fetch("/api/auth/get-session", {
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Session check unavailable");
        const session = await response.json();
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
      } catch {
        if (active && current === sequence) setStatus("error");
      }
    }
    function hide() {
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
    void check();
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", restored);
    window.addEventListener("focus", focused);
    window.addEventListener("storage", changed);
    return () => {
      active = false;
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", restored);
      window.removeEventListener("focus", focused);
      window.removeEventListener("storage", changed);
    };
  }, [userId, queryClient, attempt]);

  return (
    <>
      {status === "checking" && (
        <p role="status" className="p-8">
          Checking your session…
        </p>
      )}
      {status === "error" && (
        <div className="p-8">
          <p role="alert">
            We couldn&apos;t confirm your session. Please try again.
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="rounded border px-3 py-2"
          >
            Try again
          </button>
        </div>
      )}
      <section ref={content} hidden={status !== "ready"} data-protected-view>
        {children}
      </section>
    </>
  );
}
