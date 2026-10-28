"use server";

import { z } from "zod";
import { extractResumeText } from "@/core/import/extractText";
import type { Profile } from "@/core/schema";
import { clearImport, saveUpload } from "@/core/store/importStore";
import { deleteProfile, saveProfile } from "@/core/store/profileStore";

export type SaveProfileResult = { ok: true; profile: Profile } | { ok: false; error: string };

/** Saves the profile. `clearImport` is set when the form was filled from a resume import, which is then done. */
export async function saveProfileAction(data: unknown, options: { clearImport?: boolean } = {}): Promise<SaveProfileResult> {
  try {
    const profile = saveProfile(data);
    if (options.clearImport) clearImport();
    return { ok: true, profile };
  } catch (err) {
    const error = err instanceof z.ZodError ? z.prettifyError(err) : err instanceof Error ? err.message : String(err);
    return { ok: false, error };
  }
}

/** Deletes everything the user entered so the next load is a new user's. Resumes are kept. */
export async function resetToNewUserAction(): Promise<void> {
  deleteProfile();
  clearImport();
}

export type UploadResult = { ok: true } | { ok: false; error: string };

/** Reads the text out of an uploaded resume and keeps it for the AI assistant to import. */
export async function uploadResumeAction(formData: FormData): Promise<UploadResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a file to upload." };
  try {
    const text = await extractResumeText(file.name, new Uint8Array(await file.arrayBuffer()));
    saveUpload(file.name, text);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Throws away the uploaded resume and anything imported from it. */
export async function discardImportAction(): Promise<void> {
  clearImport();
}
