import { notFound } from "next/navigation";
import DevelopmentReadiness from "@/components/development-readiness";
import { ProtectedSessionBoundary } from "@/components/protected-session-boundary";
import { requirePageSession } from "@/server/session";
import { getSessionPolicy } from "@/server/session-policy";

export default async function DevelopmentPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const { user } = await requirePageSession();
  return (
    <ProtectedSessionBoundary
      userId={user.id}
      checkIntervalSeconds={getSessionPolicy().SESSION_CHECK_SECONDS}
    >
      <DevelopmentReadiness />
    </ProtectedSessionBoundary>
  );
}
