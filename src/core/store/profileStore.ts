import { existsSync, readFileSync, rmSync } from "node:fs";
import { profilePath } from "../../paths";
import { emptyProfile, ProfileSchema, type Profile } from "../schema";
import { writeFileAtomic } from "./fs";

export function profileExists(): boolean {
  return existsSync(profilePath());
}

/** Reads the profile from disk on every call so edits from other processes show up at once. */
export function loadProfile(): Profile {
  const file = profilePath();
  if (!existsSync(file)) return emptyProfile();
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (err) {
    throw new Error(`Could not read ${file}: ${(err as Error).message}`);
  }
  const parsed = ProfileSchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(`${file} is not a valid profile: ${parsed.error.message}`);
  }
  return parsed.data;
}

/** Puts the app back in the new-user state by permanently deleting the saved profile. */
export function deleteProfile(): void {
  rmSync(profilePath(), { force: true });
}

export function saveProfile(input: unknown): Profile {
  const profile = cleanProfile(ProfileSchema.parse(input));
  writeFileAtomic(profilePath(), JSON.stringify(profile, null, 2) + "\n");
  return profile;
}

/**
 * Trims text, drops blank lines from string lists and drops list items the
 * user left completely empty (e.g. an "Add experience" card never filled in).
 */
export function cleanProfile(profile: Profile): Profile {
  return clean(profile) as Profile;
}

function clean(value: unknown): unknown {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map(clean)
      .filter((item) => (typeof item === "string" ? item !== "" : !(isPlainObject(item) && isBlankItem(item))));
  }
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, clean(v)]));
  }
  return value;
}

function isBlankItem(item: Record<string, unknown>): boolean {
  return Object.entries(item).every(([key, v]) => {
    if (key === "id" || typeof v === "boolean") return true;
    if (typeof v === "string") return v === "";
    if (Array.isArray(v)) return v.length === 0;
    if (isPlainObject(v)) return isBlankItem(v);
    return false;
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
