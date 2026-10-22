import { notFound } from "next/navigation";
import DevelopmentReadiness from "@/components/development-readiness";

export default function DevelopmentPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <DevelopmentReadiness />;
}
