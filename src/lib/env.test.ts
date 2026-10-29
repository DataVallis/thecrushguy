import { afterEach, describe, expect, it } from "vitest";
import { appEnv, isIndexable } from "@/lib/env";

const saved = process.env.APP_ENV;
afterEach(() => {
  // Assigning undefined to process.env stores the string "undefined", so delete instead.
  if (saved === undefined) delete process.env.APP_ENV;
  else process.env.APP_ENV = saved;
});

describe("appEnv / isIndexable", () => {
  it.each([
    ["prod", "prod", true],
    ["dev", "dev", false],
    ["local", "local", false],
    ["uat", "local", false], // no uat (ADR-016): unknown values fall back to local
    ["PROD", "local", false], // exact match only
    ["", "local", false],
  ])("APP_ENV=%j → %s, indexable=%s", (value, env, indexable) => {
    process.env.APP_ENV = value;
    expect(appEnv()).toBe(env);
    expect(isIndexable()).toBe(indexable);
  });

  it("is not indexable when APP_ENV is unset", () => {
    delete process.env.APP_ENV;
    expect(isIndexable()).toBe(false);
  });
});
