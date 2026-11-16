"use client";

import { useProtectedSession } from "@/lib/use-protected-session";

export function ProtectedSessionBoundary({
  userId,
  checkIntervalSeconds,
  children,
}: {
  userId: string;
  checkIntervalSeconds: number;
  children: React.ReactNode;
}) {
  const { error, retry } = useProtectedSession(userId, checkIntervalSeconds);

  return (
    <>
      {error && (
        <div className="p-8">
          <p role="alert">
            We couldn&apos;t confirm your session. Please try again.
          </p>
          <button
            type="button"
            onClick={() => void retry()}
            className="rounded border px-3 py-2"
          >
            Try again
          </button>
        </div>
      )}
      <section hidden={error} data-protected-view>
        {children}
      </section>
    </>
  );
}
