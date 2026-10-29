import type postgres from "postgres";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { freshDb } from "../../../test/db";
import { EMAIL_LIMIT, IP_LIMIT, LOGIN_TOKEN_TTL_MS, SESSION_TTL_MS } from "./config";
import { consumeLoginToken, deleteSession, requestLoginLink, sessionEmail } from "./service";
import { hashToken } from "./tokens";

let db: Awaited<ReturnType<typeof freshDb>>;
let sql: postgres.Sql;

beforeAll(async () => {
  db = await freshDb();
  sql = db.sql;
});
afterAll(async () => {
  await db?.drop();
});

const ADMIN = "owner@example.com";
const OTHER_ADMIN = "second@example.com";
const T0 = new Date("2026-10-29T12:00:00Z");
const BASE = "https://dev.thecrushguy.com";
const at = (ms: number) => new Date(T0.getTime() + ms);

let sent: { to: string; link: string }[];
const send = async (to: string, link: string) => {
  sent.push({ to, link });
};
const tokenOf = (link: string) => new URL(link).searchParams.get("token")!;

let ipSeq = 0;
const freshIp = () => `10.0.0.${++ipSeq}`;

async function linkFor(email = ADMIN, now = T0) {
  sent = [];
  const outcome = await requestLoginLink(sql, { email, ip: freshIp(), baseUrl: BASE, send, now });
  expect(outcome).toBe("sent");
  return tokenOf(sent[0]!.link);
}

beforeEach(async () => {
  process.env.ADMIN_EMAILS = ` ${ADMIN.toUpperCase()} , ${OTHER_ADMIN},`;
  sent = [];
  await sql`truncate admin_login_tokens, admin_sessions, auth_rate_events`;
});
afterEach(() => {
  delete process.env.ADMIN_EMAILS;
});

describe("requestLoginLink", () => {
  it("sends a link for an allowlisted email (case/space-insensitive) and stores only the token hash", async () => {
    const outcome = await requestLoginLink(sql, {
      email: "  Owner@Example.com ",
      ip: freshIp(),
      baseUrl: BASE,
      send,
      now: T0,
    });
    expect(outcome).toBe("sent");
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe(ADMIN);
    const url = new URL(sent[0]!.link);
    expect(url.origin + url.pathname).toBe(`${BASE}/admin/auth/verify`);
    const raw = url.searchParams.get("token")!;
    expect(raw).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const rows = await sql`select email, token_hash, expires_at, used_at from admin_login_tokens`;
    expect(rows).toHaveLength(1);
    expect(rows[0]!.email).toBe(ADMIN);
    expect(rows[0]!.token_hash).toBe(hashToken(raw));
    expect(rows[0]!.token_hash).not.toContain(raw);
    expect((rows[0]!.expires_at as Date).getTime()).toBe(T0.getTime() + LOGIN_TOKEN_TTL_MS);
    expect(rows[0]!.used_at).toBeNull();
  });

  it("sends nothing and stores no token for an email that is not allowlisted", async () => {
    const outcome = await requestLoginLink(sql, {
      email: "stranger@example.com",
      ip: freshIp(),
      baseUrl: BASE,
      send,
      now: T0,
    });
    expect(outcome).toBe("ignored");
    expect(sent).toHaveLength(0);
    expect(await sql`select 1 from admin_login_tokens`).toHaveLength(0);
  });

  it("fails closed when ADMIN_EMAILS is empty or unset", async () => {
    for (const value of [undefined, "", " , "]) {
      if (value === undefined) delete process.env.ADMIN_EMAILS;
      else process.env.ADMIN_EMAILS = value;
      const outcome = await requestLoginLink(sql, { email: ADMIN, ip: freshIp(), baseUrl: BASE, send, now: T0 });
      expect(outcome).toBe("ignored");
    }
    expect(sent).toHaveLength(0);
  });

  it("rejects malformed input without touching the rate-limit table", async () => {
    for (const email of [null, 42, "", "not-an-email", `${"a".repeat(250)}@example.com`]) {
      expect(await requestLoginLink(sql, { email, ip: freshIp(), baseUrl: BASE, send, now: T0 })).toBe("invalid");
    }
    expect(await sql`select 1 from auth_rate_events`).toHaveLength(0);
    expect(sent).toHaveLength(0);
  });

  it(`limits one email to ${EMAIL_LIMIT.max} requests per window, then allows again after the window`, async () => {
    const outcomes = [];
    for (let i = 0; i < EMAIL_LIMIT.max + 1; i++) {
      outcomes.push(
        await requestLoginLink(sql, { email: ADMIN, ip: freshIp(), baseUrl: BASE, send, now: at(i * 1000) }),
      );
    }
    expect(outcomes).toEqual([...Array(EMAIL_LIMIT.max).fill("sent"), "limited"]);
    expect(sent).toHaveLength(EMAIL_LIMIT.max);
    // Exactly at the window edge the first requests no longer count.
    const later = at(EMAIL_LIMIT.windowMs + EMAIL_LIMIT.max * 1000);
    expect(await requestLoginLink(sql, { email: ADMIN, ip: freshIp(), baseUrl: BASE, send, now: later })).toBe("sent");
  });

  it("counts requests for non-allowlisted emails too (the limit is not an allowlist oracle)", async () => {
    const outcomes = [];
    for (let i = 0; i < EMAIL_LIMIT.max + 1; i++) {
      outcomes.push(
        await requestLoginLink(sql, { email: "probe@example.com", ip: freshIp(), baseUrl: BASE, send, now: T0 }),
      );
    }
    expect(outcomes).toEqual([...Array(EMAIL_LIMIT.max).fill("ignored"), "limited"]);
  });

  it(`limits one IP to ${IP_LIMIT.max} requests per hour across emails, and stores no raw IP or email`, async () => {
    const ip = "203.0.113.7";
    const outcomes = [];
    for (let i = 0; i < IP_LIMIT.max + 1; i++) {
      outcomes.push(await requestLoginLink(sql, { email: `u${i}@example.com`, ip, baseUrl: BASE, send, now: T0 }));
    }
    expect(outcomes.slice(0, IP_LIMIT.max).every((o) => o === "ignored")).toBe(true);
    expect(outcomes[IP_LIMIT.max]).toBe("limited");
    const buckets = await sql<{ bucket: string }[]>`select bucket from auth_rate_events`;
    for (const { bucket } of buckets) {
      expect(bucket).toMatch(/^(email|ip):[0-9a-f]{64}$/);
      expect(bucket).not.toContain(ip);
      expect(bucket).not.toContain("example.com");
    }
  });

  it("removes the token when the mail cannot be sent", async () => {
    const failing = async () => {
      throw new Error("SMTP down");
    };
    const outcome = await requestLoginLink(sql, { email: ADMIN, ip: freshIp(), baseUrl: BASE, send: failing, now: T0 });
    expect(outcome).toBe("mail_failed");
    expect(await sql`select 1 from admin_login_tokens`).toHaveLength(0);
  });
});

describe("consumeLoginToken", () => {
  it("opens a 7-day session once, and the same link never works twice", async () => {
    const raw = await linkFor();
    const session = await consumeLoginToken(sql, raw, at(1000));
    expect(session?.email).toBe(ADMIN);
    expect(session!.expiresAt.getTime()).toBe(at(1000).getTime() + SESSION_TTL_MS);
    const [row] = await sql`select token_hash from admin_sessions`;
    expect(row!.token_hash).toBe(hashToken(session!.sessionToken));

    expect(await consumeLoginToken(sql, raw, at(2000))).toBeNull();
    expect(await sql`select 1 from admin_sessions`).toHaveLength(1);
  });

  it("accepts a link one millisecond before expiry and rejects it exactly at expiry", async () => {
    const a = await linkFor();
    expect(await consumeLoginToken(sql, a, at(LOGIN_TOKEN_TTL_MS - 1))).not.toBeNull();
    const b = await linkFor(OTHER_ADMIN);
    expect(await consumeLoginToken(sql, b, at(LOGIN_TOKEN_TTL_MS))).toBeNull();
  });

  it("only one of two concurrent uses of the same link wins", async () => {
    const raw = await linkFor();
    const results = await Promise.all([consumeLoginToken(sql, raw, at(1)), consumeLoginToken(sql, raw, at(1))]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await sql`select 1 from admin_sessions`).toHaveLength(1);
  });

  it("invalidates other outstanding links of the same email after a login", async () => {
    const first = await linkFor(ADMIN, T0);
    const second = await linkFor(ADMIN, at(1000));
    expect(await consumeLoginToken(sql, second, at(2000))).not.toBeNull();
    expect(await consumeLoginToken(sql, first, at(3000))).toBeNull();
  });

  it("rejects unknown, malformed and non-string tokens", async () => {
    for (const t of [undefined, null, 1, "", "short", "x".repeat(43), "!".repeat(43), "a".repeat(44)]) {
      expect(await consumeLoginToken(sql, t, T0)).toBeNull();
    }
  });

  it("rejects a valid link whose email was removed from ADMIN_EMAILS meanwhile (and burns it)", async () => {
    const raw = await linkFor();
    process.env.ADMIN_EMAILS = OTHER_ADMIN;
    expect(await consumeLoginToken(sql, raw, at(1000))).toBeNull();
    expect(await sql`select 1 from admin_sessions`).toHaveLength(0);
  });
});

describe("sessions", () => {
  it("resolves a live session to its email, and only that session", async () => {
    const a = (await consumeLoginToken(sql, await linkFor(ADMIN), at(1)))!;
    const b = (await consumeLoginToken(sql, await linkFor(OTHER_ADMIN), at(2)))!;
    expect(await sessionEmail(sql, a.sessionToken, at(10))).toBe(ADMIN);
    expect(await sessionEmail(sql, b.sessionToken, at(10))).toBe(OTHER_ADMIN);
  });

  it("expires exactly at expires_at", async () => {
    const s = (await consumeLoginToken(sql, await linkFor(), T0))!;
    expect(await sessionEmail(sql, s.sessionToken, at(SESSION_TTL_MS - 1))).toBe(ADMIN);
    expect(await sessionEmail(sql, s.sessionToken, at(SESSION_TTL_MS))).toBeNull();
  });

  it("is revoked immediately when the email leaves ADMIN_EMAILS", async () => {
    const s = (await consumeLoginToken(sql, await linkFor(), T0))!;
    process.env.ADMIN_EMAILS = OTHER_ADMIN;
    expect(await sessionEmail(sql, s.sessionToken, at(1))).toBeNull();
  });

  it("a login token is not a session token and vice versa", async () => {
    const raw = await linkFor();
    expect(await sessionEmail(sql, raw, at(1))).toBeNull();
    const s = (await consumeLoginToken(sql, raw, at(2)))!;
    expect(await consumeLoginToken(sql, s.sessionToken, at(3))).toBeNull();
  });

  it("logout deletes only the given session; user B's logout does not end user A's session", async () => {
    const a = (await consumeLoginToken(sql, await linkFor(ADMIN), at(1)))!;
    const b = (await consumeLoginToken(sql, await linkFor(OTHER_ADMIN), at(2)))!;
    await deleteSession(sql, b.sessionToken);
    expect(await sessionEmail(sql, b.sessionToken, at(3))).toBeNull();
    expect(await sessionEmail(sql, a.sessionToken, at(3))).toBe(ADMIN);
    const rows = await sql`select email from admin_sessions`;
    expect(rows.map((r) => r.email)).toEqual([ADMIN]);
  });

  it("rejects malformed session cookies without a DB hit", async () => {
    for (const t of [undefined, "", "abc", "z".repeat(100)]) expect(await sessionEmail(sql, t, T0)).toBeNull();
  });
});
