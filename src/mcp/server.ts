import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { renderMarkdown } from "../core/render/markdown";
import { createResume, recheckResume, updateResume } from "../core/resume/service";
import type { ResumeRecord } from "../core/resume/types";
import { resumeDraftShape } from "../core/schema";
import { withoutExampleData } from "../core/exampleProfile";
import { loadProfile } from "../core/store/profileStore";
import { getResume, listResumes, resumeFilePath } from "../core/store/resumeStore";
import { webUrl } from "../paths";
import { RESUME_GUIDELINES, SERVER_INSTRUCTIONS, tailorResumePrompt } from "./guidelines";

export const SERVER_VERSION = "0.1.0";

/** Transport-agnostic server: stdio today, Streamable HTTP later. */
export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "easyresume", title: "EasyResume", version: SERVER_VERSION },
    { instructions: SERVER_INSTRUCTIONS },
  );

  server.registerTool(
    "get_resume_guidelines",
    {
      title: "Get resume guidelines",
      description:
        "Returns EasyResume's rules for writing ATS-friendly, truthful resumes and the step-by-step workflow. Call this once before creating a resume.",
      annotations: { readOnlyHint: true },
    },
    async () => text(RESUME_GUIDELINES),
  );

  server.registerTool(
    "get_profile",
    {
      title: "Get career profile",
      description:
        "Returns the user's full career profile as JSON: contact details, work experience, education, skills, certifications, projects, awards, languages, volunteering, publications and free-form notes. Each list item has an `id` to reference in create_resume.",
      annotations: { readOnlyHint: true },
    },
    run(async () => {
      const { profile, removed } = withoutExampleData(loadProfile());
      const empty = !profile.basics.name && profile.experience.length === 0 && profile.education.length === 0;
      if (empty) {
        return text(
          `The profile is empty${removed ? " (it only contains EasyResume's example data)" : ""}. Ask the user to fill in their details at ${webUrl("/profile")} (the EasyResume web UI) and then try again.`,
        );
      }
      const note = removed
        ? `\n\nNote: ${removed} unchanged example entr${removed === 1 ? "y" : "ies"} from EasyResume's sample profile were left out because they are not the user's data. Remind the user to replace or remove them at ${webUrl("/profile")}.`
        : "";
      return text(JSON.stringify(profile, null, 2) + note);
    }),
  );

  server.registerTool(
    "create_resume",
    {
      title: "Create tailored resume",
      description:
        "Creates an ATS-friendly resume for a job from the user's profile and renders it to PDF, DOCX and Markdown. Reference profile items by `id`; employers, titles, dates, schools and certificate names are filled in from the profile, you supply the tailored wording. Returns file paths, a web link, an ATS keyword/format report and warnings to act on.",
      inputSchema: resumeDraftShape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    run(async (input) => resumeResult("Resume created.", await createResume(input))),
  );

  const updateShape = Object.fromEntries(
    Object.entries(resumeDraftShape).map(([key, schema]) => [key, schema.optional()]),
  ) as { [K in keyof typeof resumeDraftShape]: z.ZodOptional<(typeof resumeDraftShape)[K]> };

  server.registerTool(
    "update_resume",
    {
      title: "Update tailored resume",
      description:
        "Changes a resume created earlier and re-renders all files. Send only the fields to change; a list you send (e.g. `experience` or `skills`) replaces the previous list completely. Re-reads the profile, so profile edits are picked up too.",
      inputSchema: { resumeId: z.string().describe("The resume id returned by create_resume or list_resumes."), ...updateShape },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    run(async ({ resumeId, ...changes }) => resumeResult("Resume updated.", await updateResume(resumeId, changes))),
  );

  server.registerTool(
    "check_ats",
    {
      title: "Check ATS readiness",
      description:
        "Re-runs the ATS check on a saved resume: keyword coverage against the job description's keywords plus format and wording issues. Pass `keywords` to check a different keyword list (it is saved with the resume).",
      inputSchema: {
        resumeId: z.string().describe("The resume id."),
        keywords: z.array(z.string().min(1)).optional().describe("Keywords to check. Omit to reuse the saved list."),
      },
      annotations: { readOnlyHint: false, idempotentHint: true, openWorldHint: false },
    },
    run(async ({ resumeId, keywords }) => {
      const record = recheckResume(resumeId, keywords);
      return text(`ATS report for ${record.id}\n\n${formatAts(record)}`);
    }),
  );

  server.registerTool(
    "list_resumes",
    {
      title: "List resumes",
      description: "Lists resumes created earlier, newest first, with their ids, target job and ATS keyword coverage.",
      annotations: { readOnlyHint: true },
    },
    run(async () => {
      const resumes = listResumes();
      if (resumes.length === 0) return text("No resumes yet.");
      return text(
        resumes
          .map((r) => {
            const coverage = r.ats.keywordCoverage === null ? "n/a" : `${r.ats.keywordCoverage}%`;
            const target = [r.draft.targetTitle, r.draft.company].filter(Boolean).join(" at ");
            return `- ${r.id}: ${target} (created ${r.createdAt.slice(0, 10)}, keyword coverage ${coverage})`;
          })
          .join("\n"),
      );
    }),
  );

  server.registerTool(
    "get_resume",
    {
      title: "Get resume",
      description:
        "Returns a saved resume: the draft (profile ids and tailored wording, useful before update_resume), the ATS report, file paths and a Markdown preview.",
      inputSchema: { resumeId: z.string().describe("The resume id.") },
      annotations: { readOnlyHint: true },
    },
    run(async ({ resumeId }) => {
      const record = getResume(resumeId);
      if (!record) throw new Error(`No resume with id "${resumeId}". Call list_resumes to see the saved ones.`);
      const { jobDescription, ...draft } = record.draft;
      return text(
        [
          formatHeader(record),
          `## Draft\n\`\`\`json\n${JSON.stringify(draft, null, 2)}\n\`\`\``,
          `## Job description\n${jobDescription}`,
          `## Preview\n${renderMarkdown(record.document)}`,
        ].join("\n\n"),
      );
    }),
  );

  server.registerPrompt(
    "tailor_resume",
    {
      title: "Tailor resume to a job",
      description: "Create an ATS-friendly resume from your EasyResume profile for a job description.",
      argsSchema: { job_description: z.string().describe("Paste the full job description.") },
    },
    ({ job_description }) => ({
      messages: [{ role: "user", content: { type: "text", text: tailorResumePrompt(job_description) } }],
    }),
  );

  return server;
}

function text(value: string): CallToolResult {
  return { content: [{ type: "text", text: value }] };
}

/** Turns thrown errors into tool errors the model can read and recover from. */
function run<A extends unknown[]>(fn: (...args: A) => Promise<CallToolResult>) {
  return async (...args: A): Promise<CallToolResult> => {
    try {
      return await fn(...args);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  };
}

function resumeResult(heading: string, record: ResumeRecord): CallToolResult {
  const parts = [`${heading}\n\n${formatHeader(record)}`, `## ATS report\n${formatAts(record)}`];
  if (record.warnings.length) parts.push(`## Warnings\n${record.warnings.map((w) => `- ${w}`).join("\n")}`);
  parts.push(`## Preview\n${renderMarkdown(record.document)}`);
  return text(parts.join("\n\n"));
}

function formatHeader(record: ResumeRecord): string {
  return [
    `Resume id: ${record.id}`,
    `Web page: ${webUrl(`/resumes/${record.id}`)} (the EasyResume web UI must be running)`,
    `PDF: ${resumeFilePath(record, "pdf")}`,
    `DOCX: ${resumeFilePath(record, "docx")}`,
    `Markdown: ${resumeFilePath(record, "md")}`,
  ].join("\n");
}

function formatAts(record: ResumeRecord): string {
  const { ats } = record;
  const lines = [];
  if (ats.keywordCoverage === null) {
    lines.push("- Keyword coverage: not checked (no keywords given)");
  } else {
    const total = ats.foundKeywords.length + ats.missingKeywords.length;
    lines.push(`- Keyword coverage: ${ats.keywordCoverage}% (${ats.foundKeywords.length}/${total})`);
    if (ats.missingKeywords.length) lines.push(`- Missing keywords: ${ats.missingKeywords.join(", ")}`);
  }
  lines.push(`- Pages: ${ats.pageCount}`);
  if (ats.issues.length === 0) lines.push("- Format issues: none");
  for (const issue of ats.issues) lines.push(`- ${issue.level === "error" ? "ERROR" : "Warning"}: ${issue.message}`);
  return lines.join("\n");
}
