"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { leaveProtectedView, notifyAuthChange } from "@/lib/auth-navigation";

export function ProtectedShell({
  viewer,
}: {
  viewer: { id: string; email: string };
}) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function signOut() {
    setPending(true);
    setMessage("");
    try {
      await queryClient.cancelQueries();
      const response = await fetch("/api/auth/sign-out", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!response.ok) throw new Error("Sign-out failed");
      notifyAuthChange("signout");
      leaveProtectedView(queryClient, "/");
    } catch {
      setPending(false);
      setMessage("We couldn't sign you out. Please try again.");
    }
  }

  if (pending)
    return (
      <p role="status" className="p-8">
        Signing out…
      </p>
    );
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-2xl font-semibold">Pokémon</h1>
      <p>Signed in as {viewer.email}</p>
      <p>Your Pokémon list will appear here.</p>
      {message && <p role="alert">{message}</p>}
      <button
        type="button"
        onClick={() => void signOut()}
        className="w-fit rounded border px-3 py-2"
      >
        Sign out
      </button>
    </main>
  );
}
