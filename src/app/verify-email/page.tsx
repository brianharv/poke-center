import Link from "next/link";
import { ResendVerificationForm } from "@/components/resend-verification-form";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; error?: string }>;
}) {
  const { result, error } = await searchParams;
  const verified = result === "success" && !error;
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">
        {error
          ? "Verification link unavailable"
          : verified
            ? "Email verified"
            : "Check your email"}
      </h1>
      {verified ? (
        <p>Your email address has been verified.</p>
      ) : (
        <>
          <p>
            {error
              ? "This link is invalid or has expired. Request a new one below."
              : "If your email needs verification, you'll receive a link. It expires in one hour."}
          </p>
          <ResendVerificationForm />
        </>
      )}
      <Link href="/" className="underline">
        Back to Poké Center
      </Link>
    </main>
  );
}
