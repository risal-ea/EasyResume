// A resume import in progress: the text extracted from the uploaded file, and
// the structured profile the AI assistant made from it (pending user review).
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { dataDir } from "../../paths";
import { ProfileImportSchema, ProfileSchema, type Profile } from "../schema";
import { writeFileAtomic } from "./fs";

export interface UploadedResume {
  fileName: string;
  uploadedAt: string;
  text: string;
}

export interface PendingImport {
  fileName: string;
  importedAt: string;
  profile: Profile;
}

const importDir = () => path.join(dataDir(), "import");
const uploadFile = () => path.join(importDir(), "upload.json");
const pendingFile = () => path.join(importDir(), "imported.json");

/** Stores a new upload; any earlier AI import is dropped because it came from a different file. */
export function saveUpload(fileName: string, text: string): UploadedResume {
  const upload = { fileName: path.basename(fileName), uploadedAt: new Date().toISOString(), text };
  rmSync(pendingFile(), { force: true });
  writeFileAtomic(uploadFile(), JSON.stringify(upload, null, 2));
  return upload;
}

export function getUpload(): UploadedResume | null {
  return readJson(uploadFile()) as UploadedResume | null;
}

/** Stores what the AI extracted. Every item gets a fresh id. */
export function savePendingImport(data: unknown): PendingImport {
  const parsed = ProfileImportSchema.parse(data);
  const pending: PendingImport = {
    fileName: getUpload()?.fileName ?? "your AI assistant",
    importedAt: new Date().toISOString(),
    profile: ProfileSchema.parse(parsed), // assigns ids and default settings
  };
  writeFileAtomic(pendingFile(), JSON.stringify(pending, null, 2));
  return pending;
}

export function getPendingImport(): PendingImport | null {
  const raw = readJson(pendingFile()) as PendingImport | null;
  if (!raw) return null;
  const profile = ProfileSchema.safeParse(raw.profile);
  return profile.success ? { ...raw, profile: profile.data } : null;
}

/** Removes the upload and any pending import. */
export function clearImport(): void {
  rmSync(importDir(), { recursive: true, force: true });
}

function readJson(file: string): unknown {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
