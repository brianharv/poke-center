"use client";

import { useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/provider";

export default function Home() {
  const trpc = useTRPC();
  const readiness = useQuery(trpc.readiness.queryOptions({}, { retry: false }));

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Poké Center</h1>
      <p>Development environment</p>
      <p role="status">
        {readiness.isPending
          ? "Checking database…"
          : readiness.isError
            ? "Database unavailable"
            : "Database connected"}
      </p>
      {readiness.data && (
        <p data-testid="database-initialized-at">
          Database initialized: {readiness.data.initializedAt}
        </p>
      )}
      {readiness.isError && (
        <p>
          Check that PostgreSQL is running and migrations have been applied.
        </p>
      )}
      <button
        type="button"
        className="w-fit rounded border px-3 py-2 disabled:opacity-50"
        onClick={() => void readiness.refetch()}
        disabled={readiness.isFetching}
      >
        Check again
      </button>
    </main>
  );
}
