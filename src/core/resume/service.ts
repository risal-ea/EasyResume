// Creates and updates resumes: build → render PDF/DOCX/MD → ATS check → save.
// Used by the MCP server only; the web UI reads the saved files instead, so
// Next.js never has to bundle pdfkit or docx.
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { checkAts } from "../ats/check";
import { withoutExampleData } from "../exampleProfile";
import { renderDocx } from "../render/docx";
import { resumeFileBaseName } from "../render/format";
import { renderMarkdown } from "../render/markdown";
import { renderPdf } from "../render/pdf";
import { normalizeDraft, type ResumeDraft, type ResumeDraftInput } from "../schema";
import { loadProfile } from "../store/profileStore";
import {
  getResume,
  newResumeId,
  resumeFolder,
  saveResumeRecord,
  writeJobDescription,
  writeResumeFile,
} from "../store/resumeStore";
import { buildResume } from "./build";
import type { ResumeRecord } from "./types";

export async function createResume(input: ResumeDraftInput): Promise<ResumeRecord> {
  const draft = normalizeDraft(input);
  const id = newResumeId(draft.company, draft.targetTitle);
  return renderAndSave(id, draft, null);
}

/** Applies a partial draft. Lists given in `changes` replace the old ones entirely. */
export async function updateResume(id: string, changes: Partial<ResumeDraftInput>): Promise<ResumeRecord> {
  const existing = requireResume(id);
  const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
  const draft = normalizeDraft({ ...existing.draft, ...defined });
  return renderAndSave(id, draft, existing);
}

/** Re-runs the ATS check, optionally with a new keyword list (which is then saved). */
export function recheckResume(id: string, keywords?: string[]): ResumeRecord {
  const existing = requireResume(id);
  const draft = keywords ? { ...existing.draft, keywords } : existing.draft;
  const record: ResumeRecord = {
    ...existing,
    draft,
    ats: checkAts(existing.document, draft.keywords, existing.ats.pageCount),
    updatedAt: keywords ? new Date().toISOString() : existing.updatedAt,
  };
  if (keywords) saveResumeRecord(record);
  return record;
}

function requireResume(id: string): ResumeRecord {
  const record = getResume(id);
  if (!record) throw new Error(`No resume with id "${id}". Call list_resumes to see the saved ones.`);
  return record;
}

async function renderAndSave(id: string, draft: ResumeDraft, previous: ResumeRecord | null): Promise<ResumeRecord> {
  // Unchanged example entries are not the user's data: ids pointing at them are rejected.
  const { document, warnings } = buildResume(withoutExampleData(loadProfile()).profile, draft);
  const base = resumeFileBaseName(document.name, draft.company);
  const title = [document.name, "Resume", draft.targetTitle].filter(Boolean).join(" – ");
  const subject = [draft.targetTitle, draft.company].filter(Boolean).join(" at ");

  const [pdf, docx] = await Promise.all([
    renderPdf(document, { title, subject }),
    renderDocx(document, { title, subject }),
  ]);
  const files = { pdf: `${base}.pdf`, docx: `${base}.docx`, md: `${base}.md` };

  writeResumeFile(id, files.pdf, pdf.data);
  writeResumeFile(id, files.docx, docx);
  writeResumeFile(id, files.md, renderMarkdown(document));
  writeJobDescription(id, draft.jobDescription);

  // The file names follow the name/company, so an update can leave old files behind.
  if (previous) {
    for (const old of Object.values(previous.files)) {
      const file = path.join(resumeFolder(id), old);
      if (!Object.values(files).includes(old) && existsSync(file)) rmSync(file);
    }
  }

  const now = new Date().toISOString();
  const record: ResumeRecord = {
    id,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
    draft,
    document,
    ats: checkAts(document, draft.keywords, pdf.pageCount),
    warnings,
    files,
  };
  saveResumeRecord(record);
  return record;
}
