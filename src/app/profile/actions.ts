"use server";

import { z } from "zod";
import type { Profile } from "@/core/schema";
import { deleteProfile, saveProfile } from "@/core/store/profileStore";

export type SaveProfileResult = { ok: true; profile: Profile } | { ok: false; error: string };

export async function saveProfileAction(data: unknown): Promise<SaveProfileResult> {
  try {
    return { ok: true, profile: saveProfile(data) };
  } catch (err) {
    const error = err instanceof z.ZodError ? z.prettifyError(err) : err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  }
}

/** Deletes everything the user entered so the next load is a new user's. Resumes are kept. */
export async function resetToNewUserAction(): Promise<void> {
  deleteProfile();
}
