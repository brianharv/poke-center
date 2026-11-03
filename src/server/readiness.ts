import "server-only";
import { getDatabase } from "@/server/database";

export async function getReadiness() {
  const check = await getDatabase().developmentCheck.findUniqueOrThrow({
    where: { id: 1 },
  });
  return {
    status: "ready" as const,
    database: "connected" as const,
    initializedAt: check.initializedAt.toISOString(),
  };
}
