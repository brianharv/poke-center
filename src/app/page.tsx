import { AuthForm } from "@/components/auth-form";
import DevelopmentReadiness from "@/components/development-readiness";
import { safeReturnTo } from "@/lib/return-destination";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const { returnTo } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Poké Center</h1>
      {process.env.NODE_ENV !== "production" && <DevelopmentReadiness />}
      <h2 className="text-xl">Sign in</h2>
      <AuthForm mode="signin" returnTo={safeReturnTo(returnTo)} />
      <h2 className="text-xl">Create an account</h2>
      <AuthForm mode="signup" />
    </main>
  );
}
