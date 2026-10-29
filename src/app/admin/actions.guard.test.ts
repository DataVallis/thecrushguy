import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Authorization guard (DEVELOPMENT-RULES §6.6): every exported server action under /admin must check the
 * session before doing anything. Only the sign-in/out actions in src/app/admin/actions.ts are exempt.
 */
const ADMIN_DIR = path.join(process.cwd(), "src/app/admin");
const PUBLIC_ACTIONS = new Set(["requestLinkAction", "verifyLinkAction", "logoutAction"]);

function serverActionFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) return serverActionFiles(p);
    if (!/\.(ts|tsx)$/.test(name) || name.endsWith(".test.ts")) return [];
    return /^\s*["']use server["']/.test(readFileSync(p, "utf8")) ? [p] : [];
  });
}

export function unguardedActions(source: string): string[] {
  const bad: string[] = [];
  const re = /export\s+async\s+function\s+(\w+)\s*\([^)]*\)[^{]*\{\s*([^\n]*)/g;
  for (const m of source.matchAll(re)) {
    const [, name, firstLine] = m;
    if (PUBLIC_ACTIONS.has(name!)) continue;
    if (!/^(const\s+\w+\s*=\s*)?await requireAdmin\(\);/.test(firstLine!.trim())) bad.push(name!);
  }
  return bad;
}

describe("admin server actions", () => {
  const files = serverActionFiles(ADMIN_DIR);

  it("finds the admin action files (the guard test must not pass vacuously)", () => {
    expect(files.map((f) => path.relative(ADMIN_DIR, f)).sort()).toEqual(["(console)/actions.ts", "actions.ts"]);
  });

  it("every exported action starts with `await requireAdmin()`", () => {
    for (const f of files) expect(unguardedActions(readFileSync(f, "utf8")), f).toEqual([]);
  });

  it("detects an action without the guard", () => {
    expect(unguardedActions(`export async function saveX(id: string) {\n  await doThing();\n}`)).toEqual(["saveX"]);
    expect(unguardedActions(`export async function ok() {\n  const a = await requireAdmin();\n}`)).toEqual([]);
  });
});
