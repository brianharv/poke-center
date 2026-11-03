"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { signinSchema } from "@/lib/auth-validation";
import { safeReturnTo } from "@/lib/return-destination";
import { useHydrated } from "@/lib/use-hydrated";
import { leaveProtectedView, notifyAuthChange } from "@/lib/auth-navigation";

export function SigninForm({ returnTo }: { returnTo: string }) {
  const hydrated = useHydrated();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = signinSchema.safeParse({ email, password });
    if (!parsed.success) {
      setMessage("Enter a valid email address and your password.");
      return;
    }
    setMessage("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        setMessage(
          response.status === 429
            ? "Too many sign-in attempts. Please wait a minute and try again."
            : "Unable to sign in. Check your email and password, and verify your email address.",
        );
        setPassword("");
        setPending(false);
        return;
      }
      notifyAuthChange("signin");
      leaveProtectedView(queryClient, safeReturnTo(returnTo));
    } catch {
      setMessage("We couldn't reach the server. Please try again.");
      setPending(false);
    }
  }

  return (
    <form
      aria-label="Sign in"
      onSubmit={submit}
      noValidate
      className="flex max-w-sm flex-col gap-4"
    >
      <label htmlFor="signin-email">Email</label>
      <input
        id="signin-email"
        type="email"
        autoComplete="username"
        required
        disabled={!hydrated || pending}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-describedby={message ? "signin-error" : undefined}
        className="rounded border p-2"
      />
      <label htmlFor="signin-password">Password</label>
      <input
        id="signin-password"
        type="password"
        autoComplete="current-password"
        required
        disabled={!hydrated || pending}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-describedby={message ? "signin-error" : undefined}
        className="rounded border p-2"
      />
      {message && (
        <p id="signin-error" role="alert">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={!hydrated || pending}
        className="w-fit rounded border px-3 py-2 disabled:opacity-50"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
