// Creates and updates resumes: build → render PDF/DOCX/MD → ATS check → save.
// Used by the MCP server and by the web UI's resume editor. Next.js loads
// pdfkit and docx from node_modules (serverExternalPackages) instead of bundling them.
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { checkAts } from "../ats/check";
import { withoutExampleData } from "../exampleProfile";
import { renderDocx } from "../render/docx";
import { resumeFileBaseName } from "../render/format";
import { renderMarkdown } from "../render/markdown";
import { renderPdfToFit } from "../render/pdf";
import { MAX_PAGES } from "../render/templates";
import { normalizeDraft, type ResumeDraft, type ResumeDraftInput, type UserOverrides } from "../schema";
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
import type { AtsReport, ResumeDocument, ResumeRecord } from "./types";

/** The content does not fit on MAX_PAGES pages, even with the tightest layout. */
export class PageLimitError extends Error {}

export async function createResume(input: ResumeDraftInput): Promise<ResumeRecord> {
  const draft = normalizeDraft(input);
  const id = newResumeId(draft.company, draft.targetTitle);
  return renderAndSave(id, draft, null);
}

/** What the AI sends, or the web editor's edits, which may also reword anything from the profile. */
type DraftChanges = Partial<ResumeDraftInput & UserOverrides>;

/** Applies a partial draft. Lists given in `changes` replace the old ones entirely. */
export async function updateResume(id: string, changes: DraftChanges): Promise<ResumeRecord> {
  const existing = requireResume(id);
  return renderAndSave(id, mergeDraft(existing.draft, changes), existing);
}

export interface ResumePreview {
  document: ResumeDocument;
  ats: AtsReport;
  warnings: string[];
}

/** Lays out a changed resume without saving anything, for the web editor's live preview. */
export async function previewResume(id: string, changes: DraftChanges): Promise<ResumePreview> {
  const draft = mergeDraft(requireResume(id).draft, changes);
  const { document, warnings, pdf } = await layOut(draft);
  return { document, warnings, ats: checkAts(document, draft.keywords, pdf.pageCount) };
}

function mergeDraft(draft: ResumeDraft, changes: DraftChanges): ResumeDraft {
  const defined = Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined));
  return normalizeDraft({ ...draft, ...defined });
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

/** Builds the resume from the profile and fits it to the page limit; the fit carries over to the DOCX and HTML. */
async function layOut(draft: ResumeDraft) {
  // Unchanged example entries are not the user's data: ids pointing at them are rejected.
  const built = buildResume(withoutExampleData(loadProfile()).profile, draft);
  const info = {
    title: [built.document.name, "Resume", draft.targetTitle].filter(Boolean).join(" – "),
    subject: [draft.targetTitle, draft.company].filter(Boolean).join(" at "),
  };
  const pdf = await renderPdfToFit(built.document, info);
  return { document: pdf.document, warnings: built.warnings, pdf, info };
}

async function renderAndSave(id: string, draft: ResumeDraft, previous: ResumeRecord | null): Promise<ResumeRecord> {
  const { document, warnings, pdf, info } = await layOut(draft);
  if (pdf.pageCount > MAX_PAGES) {
    throw new PageLimitError(
      `This resume needs ${pdf.pageCount} pages even with the tightest spacing, but resumes are limited to ${MAX_PAGES}. Nothing was saved. Shorten it: drop older or less relevant roles and projects, keep the strongest 3-5 bullets for recent roles and 1-2 for older ones, and tighten long bullets.`,
    );
  }
  const docx = await renderDocx(document, info);
  const base = resumeFileBaseName(document.name, draft.company);
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
