"use client";

import { useEffect, useState } from "react";
import { resendSchema } from "@/lib/auth-validation";
import { useHydrated } from "@/lib/use-hydrated";

const RESEND_COOLDOWN_SECONDS = 60;

export function ResendVerificationForm() {
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown === 0) return;
    const timer = setTimeout(
      () => setCooldown((value) => Math.max(0, value - 1)),
      1_000,
    );
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const parsed = resendSchema.safeParse({ email });
    if (!parsed.success) {
      setError("Enter a valid email address.");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.ok) {
        setMessage("If this email needs verification, a link has been sent.");
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else if (response.status === 429) {
        setError(
          "Too many requests. Please wait before requesting another email.",
        );
        setCooldown(RESEND_COOLDOWN_SECONDS);
      } else {
        setError("We couldn't send the request. Please try again.");
      }
    } catch {
      setError("We couldn't reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-sm flex-col gap-4">
      <label htmlFor="verification-email">Email</label>
      <input
        id="verification-email"
        type="email"
        autoComplete="email"
        required
        disabled={!hydrated || pending}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? "resend-error" : undefined}
        className="rounded border p-2"
      />
      {error && (
        <p id="resend-error" role="alert">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      <button
        type="submit"
        disabled={!hydrated || pending || cooldown > 0}
        className="w-fit rounded border px-3 py-2 disabled:opacity-50"
      >
        {pending
          ? "Sending…"
          : cooldown > 0
            ? `Resend verification email (${cooldown}s)`
            : "Resend verification email"}
      </button>
    </form>
  );
}
