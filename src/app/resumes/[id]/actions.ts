"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { renderHtml } from "@/core/render/html";
import { previewResume, updateResume } from "@/core/resume/service";
import { ResumeEditsSchema } from "@/core/schema";
import { deleteResume } from "@/core/store/resumeStore";

export async function deleteResumeAction(id: string): Promise<void> {
  deleteResume(id);
  redirect("/resumes");
}

export interface EditorPreview {
  html: string;
  pageCount: number;
  coverage: number | null;
  missingKeywords: string[];
  warnings: string[];
}

export type PreviewResult = { ok: true; preview: EditorPreview } | { ok: false; error: string };

/** Lays out unsaved edits for the editor's live preview. Nothing is written to disk. */
export async function previewResumeAction(id: string, edits: unknown): Promise<PreviewResult> {
  try {
    const { document, ats, warnings } = await previewResume(id, ResumeEditsSchema.parse(edits));
    return {
      ok: true,
      preview: {
        html: renderHtml(document),
        pageCount: ats.pageCount,
        coverage: ats.keywordCoverage,
        missingKeywords: ats.missingKeywords,
        warnings,
      },
    };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

export type SaveResumeResult = { ok: true } | { ok: false; error: string };

/** Saves edits (or just a new template) and re-renders the PDF, DOCX and Markdown files. */
export async function saveResumeAction(id: string, edits: unknown): Promise<SaveResumeResult> {
  try {
    await updateResume(id, ResumeEditsSchema.parse(edits));
    return { ok: true };
  } catch (err) {
    return { ok: false, error: errorMessage(err) };
  }
}

function errorMessage(err: unknown): string {
  return err instanceof z.ZodError ? z.prettifyError(err) : err instanceof Error ? err.message : String(err);
}
