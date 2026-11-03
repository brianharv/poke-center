"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  signinSchema,
  signupSchema,
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
} from "@/lib/auth-validation";
import { safeReturnTo } from "@/lib/return-destination";
import { useHydrated } from "@/lib/use-hydrated";
import { leaveProtectedView, notifyAuthChange } from "@/lib/auth-navigation";

type AuthFormProps = { mode: "signin"; returnTo: string } | { mode: "signup" };

export function AuthForm(props: AuthFormProps) {
  const signup = props.mode === "signup";
  const prefix = signup ? "signup" : "signin";
  const label = signup ? "Create account" : "Sign in";
  const hydrated = useHydrated();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const pendingLabel = signup ? "Creating account…" : "Signing in…";
  let emailDescription = message ? `${prefix}-error` : undefined;
  let passwordDescription = emailDescription;
  if (signup) {
    emailDescription = errors.email ? `${prefix}-email-error` : undefined;
    passwordDescription = [
      `${prefix}-password-help`,
      errors.password && `${prefix}-password-error`,
    ]
      .filter(Boolean)
      .join(" ");
  }

  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const schema = signup ? signupSchema : signinSchema;
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path[0], issue.message]),
        ),
      );
      if (!signup) setMessage("Enter a valid email address and your password.");
      return;
    }
    setErrors({});
    setPending(true);
    let navigating = false;
    try {
      const response = await fetch(
        signup ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        },
      );
      if (!response.ok) {
        if (signup) {
          setMessage(
            response.status === 429
              ? "Too many requests. Please wait a minute and try again."
              : "We couldn't create your account. Check your details and try again.",
          );
        } else {
          setPassword("");
          setMessage(
            response.status === 429
              ? "Too many sign-in attempts. Please wait a minute and try again."
              : "Unable to sign in. Check your email and password, and verify your email address.",
          );
        }
        return;
      }
      setPassword("");
      if (props.mode === "signin") {
        notifyAuthChange("signin");
        leaveProtectedView(queryClient, safeReturnTo(props.returnTo));
      } else {
        router.push("/verify-email");
      }
      navigating = true;
    } catch {
      setMessage("We couldn't reach the server. Please try again.");
    } finally {
      if (!navigating) setPending(false);
    }
  }

  return (
    <form
      aria-label={label}
      onSubmit={submit}
      noValidate
      className="flex max-w-sm flex-col gap-4"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`${prefix}-email`}>Email</label>
        <input
          id={`${prefix}-email`}
          type="email"
          autoComplete={signup ? "email" : "username"}
          required
          disabled={!hydrated || pending}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={emailDescription}
          className="rounded border p-2"
        />
        {signup && errors.email && (
          <p id={`${prefix}-email-error`} role="alert">
            {errors.email}
          </p>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor={`${prefix}-password`}>Password</label>
        <input
          id={`${prefix}-password`}
          type="password"
          autoComplete={signup ? "new-password" : "current-password"}
          required
          disabled={!hydrated || pending}
          minLength={signup ? MIN_PASSWORD_LENGTH : undefined}
          maxLength={signup ? MAX_PASSWORD_LENGTH : undefined}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={passwordDescription}
          className="rounded border p-2"
        />
        {signup && (
          <p id={`${prefix}-password-help`}>
            Use {MIN_PASSWORD_LENGTH}–{MAX_PASSWORD_LENGTH} characters. Spaces
            and passphrases are welcome.
          </p>
        )}
        {signup && errors.password && (
          <p id={`${prefix}-password-error`} role="alert">
            {errors.password}
          </p>
        )}
      </div>
      {message && (
        <p id={`${prefix}-error`} role="alert">
          {message}
        </p>
      )}
      <button
        type="submit"
        disabled={!hydrated || pending}
        className="w-fit rounded border px-3 py-2 disabled:opacity-50"
      >
        {pending ? pendingLabel : label}
      </button>
    </form>
  );
}
