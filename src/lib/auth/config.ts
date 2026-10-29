/**
 * Admin auth settings (TASK-011b, ADR-017/020/022). Values are read at request time so the same image runs in
 * dev and prod. Only variable NAMES live in the repo.
 */
/** Env source (process.env or a plain object in tests). */
export type Env = Readonly<Record<string, string | undefined>>;

export const LOGIN_TOKEN_TTL_MS = 15 * 60 * 1000; // ADR-017: link valid 15 minutes
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // ADR-017: session 7 days
export const EMAIL_LIMIT = { max: 3, windowMs: 15 * 60 * 1000 }; // link requests per email
export const IP_LIMIT = { max: 10, windowMs: 60 * 60 * 1000 }; // link requests per client IP
export const SESSION_COOKIE = "tcg_admin";

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Allowlist from `ADMIN_EMAILS` (comma-separated). Empty or unset → nobody can sign in (fail closed). */
export function adminEmails(env: Env = process.env): ReadonlySet<string> {
  const list = (env.ADMIN_EMAILS ?? "")
    .split(",")
    .map(normalizeEmail)
    .filter((e) => e.length > 0);
  return new Set(list);
}

export function isAdminEmail(email: string, env: Env = process.env): boolean {
  return adminEmails(env).has(normalizeEmail(email));
}
