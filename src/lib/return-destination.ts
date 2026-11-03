export const DEFAULT_RETURN_TO = "/pokemon";

export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\s\u0000-\u001f\u007f#]/.test(value)
  ) {
    return DEFAULT_RETURN_TO;
  }
  try {
    if (/[\\\u0000-\u001f\u007f]/.test(decodeURIComponent(value))) {
      return DEFAULT_RETURN_TO;
    }
    const url = new URL(value, "https://return.invalid");
    const allowed =
      url.pathname === "/pokemon" ||
      (process.env.NODE_ENV !== "production" &&
        url.pathname === "/development");
    if (!allowed || value.split("?")[0] !== url.pathname)
      return DEFAULT_RETURN_TO;
    return url.pathname + url.search;
  } catch {
    return DEFAULT_RETURN_TO;
  }
}

export function signInDestination(returnTo: unknown): string {
  return `/?${new URLSearchParams({ returnTo: safeReturnTo(returnTo) })}`;
}
