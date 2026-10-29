/**
 * Magic-link login core (TASK-011b, ADR-017/022). Pure DB + crypto logic, no Next.js imports, so it is
 * tested directly against a real Postgres (DEVELOPMENT-RULES §6.8). The Next.js layer (`session.ts`,
 * `src/app/admin/actions.ts`) only adds cookies, headers and redirects.
 */
import type postgres from "postgres";
import { z } from "zod";
import { EMAIL_LIMIT, IP_LIMIT, LOGIN_TOKEN_TTL_MS, SESSION_TTL_MS, isAdminEmail, normalizeEmail } from "./config";
import { emailBucket, hashToken, ipBucket, isWellFormedToken, newRawToken } from "./tokens";

export type SendLoginMail = (to: string, link: string) => Promise<void>;

/**
 * Internal outcome — for tests and logs only. The UI must show the same response for every value
 * (no account enumeration, ADR-017).
 */
export type RequestOutcome = "sent" | "ignored" | "invalid" | "limited" | "mail_failed";

const emailSchema = z.email().max(254);

export async function requestLoginLink(
  sql: postgres.Sql,
  input: { email: unknown; ip: string; baseUrl: string; send: SendLoginMail; now?: Date },
): Promise<RequestOutcome> {
  const now = input.now ?? new Date();
  const parsed = emailSchema.safeParse(typeof input.email === "string" ? normalizeEmail(input.email) : null);
  if (!parsed.success) return "invalid";
  const email = parsed.data;

  // Count every request (allowed or not) so the limit can't be used to probe the allowlist.
  const limited = await sql.begin(async (tx) => {
    await tx`delete from auth_rate_events where at < ${new Date(now.getTime() - 24 * 3600_000)}`;
    const eb = emailBucket(email);
    const ib = ipBucket(input.ip, now.getTime());
    await tx`insert into auth_rate_events ${tx([
      { bucket: eb, at: now },
      { bucket: ib, at: now },
    ])}`;
    const [counts] = await tx<{ e: number; i: number }[]>`
      select
        count(*) filter (where bucket = ${eb} and at > ${new Date(now.getTime() - EMAIL_LIMIT.windowMs)})::int as e,
        count(*) filter (where bucket = ${ib} and at > ${new Date(now.getTime() - IP_LIMIT.windowMs)})::int as i
      from auth_rate_events where bucket in (${eb}, ${ib})`;
    return counts.e > EMAIL_LIMIT.max || counts.i > IP_LIMIT.max;
  });
  if (limited) return "limited";
  if (!isAdminEmail(email)) return "ignored";

  const raw = newRawToken();
  await sql`insert into admin_login_tokens ${sql({
    email,
    token_hash: hashToken(raw),
    expires_at: new Date(now.getTime() + LOGIN_TOKEN_TTL_MS),
    created_at: now,
  })}`;

  const link = new URL("/admin/auth/verify", input.baseUrl);
  link.searchParams.set("token", raw);
  try {
    await input.send(email, link.toString());
    return "sent";
  } catch (err) {
    // The token is useless without the mail; remove it. Log the reason, never the address or link.
    await sql`delete from admin_login_tokens where token_hash = ${hashToken(raw)}`;
    console.error("[auth] login mail failed:", err instanceof Error ? err.message : "unknown error");
    return "mail_failed";
  }
}

export type NewSession = { email: string; sessionToken: string; expiresAt: Date };

/**
 * Consumes a login token (single use, atomic) and opens a session. Returns null for unknown, used,
 * expired or malformed tokens, and when the email was removed from the allowlist in the meantime.
 */
export async function consumeLoginToken(
  sql: postgres.Sql,
  rawToken: unknown,
  now: Date = new Date(),
): Promise<NewSession | null> {
  if (!isWellFormedToken(rawToken)) return null;
  return sql.begin(async (tx) => {
    const [row] = await tx<{ email: string }[]>`
      update admin_login_tokens set used_at = ${now}
      where token_hash = ${hashToken(rawToken)} and used_at is null and expires_at > ${now}
      returning email`;
    if (!row || !isAdminEmail(row.email)) return null;

    // Any other outstanding link for this address dies with this login.
    await tx`update admin_login_tokens set used_at = ${now} where email = ${row.email} and used_at is null`;
    // Housekeeping: drop expired sessions and old tokens.
    await tx`delete from admin_sessions where expires_at <= ${now}`;
    await tx`delete from admin_login_tokens where created_at < ${new Date(now.getTime() - 24 * 3600_000)}`;

    const sessionToken = newRawToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
    await tx`insert into admin_sessions ${tx({
      email: row.email,
      token_hash: hashToken(sessionToken),
      expires_at: expiresAt,
    })}`;
    return { email: row.email, sessionToken, expiresAt };
  });
}

/** Email of a live session, or null. Removal from `ADMIN_EMAILS` revokes existing sessions immediately. */
export async function sessionEmail(
  sql: postgres.Sql,
  rawToken: unknown,
  now: Date = new Date(),
): Promise<string | null> {
  if (!isWellFormedToken(rawToken)) return null;
  const [row] = await sql<{ email: string }[]>`
    select email from admin_sessions where token_hash = ${hashToken(rawToken)} and expires_at > ${now}`;
  if (!row || !isAdminEmail(row.email)) return null;
  return row.email;
}

export async function deleteSession(sql: postgres.Sql, rawToken: unknown): Promise<void> {
  if (!isWellFormedToken(rawToken)) return;
  await sql`delete from admin_sessions where token_hash = ${hashToken(rawToken)}`;
}
