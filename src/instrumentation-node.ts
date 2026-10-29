// Apply DB migrations before serving traffic when RUN_MIGRATIONS=1 (set in config/deploy.yml).
// A failed migration stops the container: kamal-proxy keeps the previous version live (fail safe and loud).
export async function runStartupMigrations(): Promise<void> {
  if (process.env.RUN_MIGRATIONS !== "1") return;
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[migrate] DATABASE_URL is not set");
    process.exit(1);
  }
  const { runMigrations } = await import("./lib/db/migrate");
  try {
    await runMigrations(url);
    console.log("[migrate] done");
  } catch (err) {
    // Message only — never the connection string.
    console.error("[migrate] failed:", err instanceof Error ? err.message : "unknown error");
    process.exit(1);
  }
}
