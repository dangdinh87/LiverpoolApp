import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../manifest";
import { BRAND } from "@/lib/brand";

describe("web app manifest", () => {
  const m = manifest();

  it("names the app after the brand constant", () => {
    expect(m.short_name).toBe(BRAND.name);
    expect(m.name).toContain(BRAND.name);
    expect(m.description).toBe(BRAND.description.vi);
  });

  it("uses only the own mark, never the club crest", () => {
    for (const icon of m.icons ?? []) expect(icon.src).toMatch(/^\/brand\//);
  });

  it("points every icon at a file that exists in public/", () => {
    for (const icon of m.icons ?? []) {
      expect(existsSync(join(process.cwd(), "public", icon.src)), icon.src).toBe(true);
    }
  });

  it("offers 192 and 512 icons, any and maskable", () => {
    const find = (sizes: string, purpose: string) => m.icons?.find((i) => i.sizes === sizes && (i.purpose ?? "any") === purpose);
    expect(find("192x192", "any")).toBeTruthy();
    expect(find("512x512", "any")).toBeTruthy();
    expect(find("512x512", "maskable")).toBeTruthy();
  });
});
