"use client";

import { useQuery } from "@tanstack/react-query";
import { readinessSchema } from "@/lib/readiness";

export default function DevelopmentReadiness() {
  const readiness = useQuery({
    queryKey: ["development-readiness"],
    retry: false,
    queryFn: async () => {
      const response = await fetch("/api/health", { cache: "no-store" });
      if (!response.ok) throw new Error("Database unavailable");
      return readinessSchema.parse(await response.json());
    },
  });

  return (
    <section
      aria-label="Development environment"
      className="flex flex-col gap-2 rounded border p-4"
    >
      <h2 className="font-semibold">Development environment</h2>
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
    </section>
  );
}
