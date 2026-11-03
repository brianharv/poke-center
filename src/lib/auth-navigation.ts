"use client";

import type { QueryClient } from "@tanstack/react-query";

export const AUTH_CHANGE_KEY = "poke-center.auth-change";

export function notifyAuthChange(action: "signin" | "signout") {
  try {
    localStorage.setItem(AUTH_CHANGE_KEY, `${action}:${crypto.randomUUID()}`);
  } catch {
    // Navigation still clears this tab when browser storage is unavailable.
  }
}

export function leaveProtectedView(
  queryClient: QueryClient,
  destination: string,
) {
  const content = document.querySelector<HTMLElement>("[data-protected-view]");
  if (content) content.hidden = true;
  queryClient.clear();
  window.location.replace(destination);
}
