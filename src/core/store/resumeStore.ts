import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { resumesDir } from "../../paths";
import type { ResumeFormat, ResumeRecord } from "../resume/types";
import { writeFileAtomic } from "./fs";

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{0,99}$/;

export function isValidResumeId(id: string): boolean {
  return ID_PATTERN.test(id);
}

export function resumeFolder(id: string): string {
  if (!isValidResumeId(id)) throw new Error(`Invalid resume id: ${id}`);
  return path.join(resumesDir(), id);
}

/** Readable, URL-safe id such as `2026-10-27-acme-senior-backend-engineer-k3f9`. */
export function newResumeId(company: string, targetTitle: string, now = new Date()): string {
  const date = now.toISOString().slice(0, 10);
  const slug = [company, targetTitle]
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/, "");
  const suffix = Math.random().toString(36).slice(2, 6).padEnd(4, "0");
  return [date, slug, suffix].filter(Boolean).join("-");
}

export function getResume(id: string): ResumeRecord | null {
  if (!isValidResumeId(id)) return null;
  const file = path.join(resumeFolder(id), "resume.json");
  if (!existsSync(file)) return null;
  const record = JSON.parse(readFileSync(file, "utf8")) as ResumeRecord;
  // Resumes saved before templates existed used the classic layout.
  record.draft.template ??= "classic";
  record.document.template ??= "classic";
  record.document.fitLevel ??= 0;
  return record;
}

/** All saved resumes, newest first. */
export function listResumes(): ResumeRecord[] {
  const dir = resumesDir();
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(isValidResumeId)
    .map((id) => {
      try {
        return getResume(id);
      } catch {
        return null; // skip folders with a broken resume.json
      }
    })
    .filter((r): r is ResumeRecord => r !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function saveResumeRecord(record: ResumeRecord): void {
  writeFileAtomic(path.join(resumeFolder(record.id), "resume.json"), JSON.stringify(record, null, 2) + "\n");
}

export function writeResumeFile(id: string, fileName: string, data: string | Uint8Array): void {
  writeFileAtomic(path.join(resumeFolder(id), path.basename(fileName)), data);
}

export function writeJobDescription(id: string, text: string): void {
  writeFileAtomic(path.join(resumeFolder(id), "job.txt"), text);
}

export function resumeFilePath(record: ResumeRecord, format: ResumeFormat): string {
  return path.join(resumeFolder(record.id), path.basename(record.files[format]));
}

export function deleteResume(id: string): boolean {
  const dir = resumeFolder(id);
  if (!existsSync(dir)) return false;
  rmSync(dir, { recursive: true, force: true });
  return true;
}
