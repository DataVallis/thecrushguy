import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { databaseUrl } from "@/lib/env";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

// One pool per server process (survives dev hot reloads via globalThis).
const globalForDb = globalThis as unknown as { __tcgSql?: postgres.Sql; __tcgDb?: Db };

export function sql(): postgres.Sql {
  globalForDb.__tcgSql ??= postgres(databaseUrl(), {
    max: Number(process.env.DATABASE_POOL_MAX ?? 10),
    connect_timeout: 5,
    idle_timeout: 30,
  });
  return globalForDb.__tcgSql;
}

export function db(): Db {
  globalForDb.__tcgDb ??= drizzle(sql(), { schema });
  return globalForDb.__tcgDb;
}

/** Cheap liveness check used by /api/health. Rejects if the DB does not answer within `timeoutMs`. */
export async function pingDb(timeoutMs = 2000): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("db ping timeout")), timeoutMs);
  });
  try {
    await Promise.race([sql()`select 1`, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
