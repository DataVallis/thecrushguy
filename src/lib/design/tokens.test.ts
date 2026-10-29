import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** Design-token guard (DEVELOPMENT-RULES §5 "design/token guard"): tokens.json ↔ globals.css, WCAG AA pairs. */
const root = process.cwd();
const tokens = JSON.parse(readFileSync(path.join(root, "design/tokens.json"), "utf8")) as {
  color: Record<string, { value: string }>;
  font: Record<string, { value: string }>;
  radius: Record<string, { value: string }>;
  contrast: { pairs: [string, string][] };
};
const css = readFileSync(path.join(root, "src/app/globals.css"), "utf8");
const theme = css.slice(css.indexOf("@theme"), css.indexOf("}", css.indexOf("@theme")));

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r!) + 0.7152 * f(g!) + 0.0722 * f(b!);
}
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
const resolve = (v: string) => (v.startsWith("#") ? v : tokens.color[v]!.value);

describe("design tokens", () => {
  it("every color, font and radius token in tokens.json is defined identically in globals.css @theme", () => {
    for (const [k, t] of Object.entries(tokens.color)) expect(theme, k).toContain(`--color-${k}: ${t.value};`);
    for (const [k, t] of Object.entries(tokens.font)) expect(theme, k).toContain(`--font-${k}: ${t.value};`);
    for (const [k, t] of Object.entries(tokens.radius)) expect(theme, k).toContain(`--radius-${k}: ${t.value};`);
  });

  it("globals.css defines no color token that tokens.json doesn't know", () => {
    const defined = [...theme.matchAll(/--color-([a-z-]+):/g)].map((m) => m[1]);
    expect(defined.sort()).toEqual(Object.keys(tokens.color).sort());
  });

  it("every text/background pair reaches WCAG AA (4.5:1)", () => {
    for (const [fg, bg] of tokens.contrast.pairs)
      expect(contrast(resolve(fg), resolve(bg)), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  });

  it("the contrast checker itself is right (black/white 21:1, white on bright coral fails)", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#ff4d6d")).toBeLessThan(4.5);
  });
});
