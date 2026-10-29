/**
 * Runtime environment. Read at request time (not inlined at build) so the same
 * Docker image can be promoted dev → prod (no uat, ADR-016).
 * Only variable NAMES live in the repo; values are set on the server.
 */
export type AppEnv = "local" | "dev" | "prod";

export function appEnv(): AppEnv {
  const v = process.env.APP_ENV;
  return v === "dev" || v === "prod" ? v : "local";
}

/** Everything except prod must stay out of search engines. */
export function isIndexable(): boolean {
  return appEnv() === "prod";
}

export function databaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  return url;
}

export function siteUrl(): string {
  return process.env.SITE_URL ?? "http://localhost:3000";
}
