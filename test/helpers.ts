import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach } from "vitest";
import { ProfileSchema, type Profile } from "../src/core/schema";

export const fixture = (name: string) => readFileSync(path.join(import.meta.dirname, "fixtures", name), "utf8");

export function sampleProfile(): Profile {
  return ProfileSchema.parse(JSON.parse(fixture("sample-profile.json")));
}

/** Points EASYRESUME_HOME at a fresh temp folder for each test. */
export function useTempHome(): { dir: () => string } {
  let dir = "";
  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), "easyresume-test-"));
    process.env.EASYRESUME_HOME = dir;
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    delete process.env.EASYRESUME_HOME;
  });
  return { dir: () => dir };
}
