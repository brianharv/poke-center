"use client";

import { useProtectedSession } from "@/lib/use-protected-session";

export function ProtectedSessionBoundary({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  const { content, status, retry } = useProtectedSession(userId);

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
            onClick={retry}
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
