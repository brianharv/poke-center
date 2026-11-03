import { requirePageSession } from "@/server/session";
import { ProtectedShell } from "@/components/protected-shell";

export default async function PokemonPage() {
  const { user } = await requirePageSession();
  return <ProtectedShell viewer={{ id: user.id, email: user.email }} />;
}
