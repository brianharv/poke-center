import { ProtectedSessionBoundary } from "@/components/protected-session-boundary";
import { requirePageSession } from "@/server/session";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await requirePageSession();
  return (
    <ProtectedSessionBoundary userId={user.id}>
      {children}
    </ProtectedSessionBoundary>
  );
}
