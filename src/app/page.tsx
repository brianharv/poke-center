import { SignupForm } from "@/components/signup-form";
import { SigninForm } from "@/components/signin-form";
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
      <h2 className="text-xl">Sign in</h2>
      <SigninForm returnTo={safeReturnTo(returnTo)} />
      <h2 className="text-xl">Create an account</h2>
      <SignupForm />
    </main>
  );
}
