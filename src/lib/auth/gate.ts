import { SESSION_COOKIE } from "./config";

/** Admin pages reachable without a session. */
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/auth/verify"];

export function isAdminPath(pathname: string): boolean {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

/**
 * Early redirect in proxy.ts for requests without a session cookie. Optimistic only (no DB lookup) —
 * `requireAdmin()` in every page/action is the real check.
 */
export function adminGateRedirect(pathname: string, cookieNames: Iterable<string>): string | null {
  if (!isAdminPath(pathname)) return null;
  if (PUBLIC_ADMIN_PATHS.includes(pathname)) return null;
  for (const name of cookieNames) if (name === SESSION_COOKIE) return null;
  return "/admin/login";
}
