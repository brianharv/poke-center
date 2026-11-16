import { ProtectedSessionBoundary } from "@/components/protected-session-boundary";
import { requirePageSession } from "@/server/session";
import { getSessionPolicy } from "@/server/session-policy";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePageSession();
  return (
    <ProtectedSessionBoundary
      userId={user.id}
      checkIntervalSeconds={getSessionPolicy().SESSION_CHECK_SECONDS}
    >
      {children}
    </ProtectedSessionBoundary>
  );
}
