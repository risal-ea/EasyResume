import type { PageSize, ResumeDraft, SectionKey, TemplateId } from "../schema";

/** One dated item in a section, e.g. a job, a degree or a project. */
export interface ResumeEntry {
  title: string;
  subtitle: string;
  /** Secondary detail shown next to the dates: a location or a URL. */
  meta: string;
  dates: string;
  bullets: string[];
}

export interface ResumeSection {
  key: SectionKey;
  title: string;
  /** Free-text body (used by the summary). */
  paragraph: string;
  entries: ResumeEntry[];
  /** Simple one-line items (skills, certifications, languages, …). */
  lines: string[];
}

/** A fully resolved resume. Every renderer consumes this shape. */
export interface ResumeDocument {
  name: string;
  headline: string;
  contact: string[];
  sections: ResumeSection[];
  pageSize: PageSize;
  template: TemplateId;
  /** How far the layout was tightened to fit the page limit: 0 is the template as designed. */
  fitLevel: number;
}

export interface AtsIssue {
  level: "error" | "warning";
  message: string;
}

export interface AtsReport {
  /** Percentage of keywords found, or null when no keywords were given. */
  keywordCoverage: number | null;
  foundKeywords: string[];
  missingKeywords: string[];
  issues: AtsIssue[];
  pageCount: number;
}

export type ResumeFormat = "pdf" | "docx" | "md";

export interface ResumeRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  draft: ResumeDraft;
  document: ResumeDocument;
  ats: AtsReport;
  /** Problems found while resolving the draft against the profile. */
  warnings: string[];
  /** File names inside the resume's folder. */
  files: Record<ResumeFormat, string>;
}
