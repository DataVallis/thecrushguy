// Runs once per server start (Next.js instrumentation). Node-only work lives in instrumentation-node.ts.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { runStartupMigrations } = await import("./instrumentation-node");
    await runStartupMigrations();
  }
}
