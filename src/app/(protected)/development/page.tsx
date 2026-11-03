import { notFound } from "next/navigation";
import DevelopmentReadiness from "@/components/development-readiness";
import { requirePageSession } from "@/server/session";

export default async function DevelopmentPage() {
  if (process.env.NODE_ENV === "production") notFound();
  await requirePageSession();
  return <DevelopmentReadiness />;
}
