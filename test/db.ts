import { randomBytes } from "node:crypto";
import postgres from "postgres";
import { runMigrations } from "@/lib/db/migrate";

/**
 * Creates a fresh, uniquely named database on the server behind DATABASE_URL, migrates it from zero
 * and returns a client plus a cleanup. A missing DATABASE_URL FAILS the test (DEVELOPMENT-RULES §6.2).
 */
export async function freshDb(): Promise<{ url: string; sql: postgres.Sql; drop: () => Promise<void> }> {
  const admin = process.env.DATABASE_URL;
  if (!admin) throw new Error("DATABASE_URL must point to a test Postgres server");
  const name = `tcg_t_${randomBytes(6).toString("hex")}`;
  const adminSql = postgres(admin, { max: 1, onnotice: () => {} });
  await adminSql.unsafe(`CREATE DATABASE ${name}`);
  const u = new URL(admin);
  u.pathname = `/${name}`;
  const url = u.toString();
  await runMigrations(url);
  const sql = postgres(url, { max: 2, onnotice: () => {} });
  return {
    url,
    sql,
    drop: async () => {
      await sql.end({ timeout: 2 });
      await adminSql.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      await adminSql.end({ timeout: 2 });
    },
  };
}
