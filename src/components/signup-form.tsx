"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  signupSchema,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/lib/auth-validation";
import { useHydrated } from "@/lib/use-hydrated";

export function SignupForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const parsed = signupSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      return;
    }
    setErrors({});
    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-up/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.ok) {
        setPassword("");
        router.push("/verify-email");
        return;
      }
      setMessage(
        response.status === 429
          ? "Too many requests. Please wait a minute and try again."
          : "We couldn't create your account. Check your details and try again.",
      );
    } catch {
      setMessage("We couldn't reach the server. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex max-w-sm flex-col gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-email">Email</label>
        <input
          id="signup-email"
          type="email"
          autoComplete="email"
          required
          disabled={!hydrated || pending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="rounded border p-2"
        />
        {errors.email && (
          <p id="email-error" role="alert">
            {errors.email}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="signup-password">Password</label>
        <input
          id="signup-password"
          type="password"
          autoComplete="new-password"
          required
          disabled={!hydrated || pending}
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "password-help password-error" : "password-help"
          }
          className="rounded border p-2"
        />
        <p id="password-help">
          Use {MIN_PASSWORD_LENGTH}–{MAX_PASSWORD_LENGTH} characters. Spaces and
          passphrases are welcome.
        </p>
        {errors.password && (
          <p id="password-error" role="alert">
            {errors.password}
          </p>
        )}
      </div>
      {message && <p role="alert">{message}</p>}
      <button
        type="submit"
        disabled={!hydrated || pending}
        className="w-fit rounded border px-3 py-2 disabled:opacity-50"
      >
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
