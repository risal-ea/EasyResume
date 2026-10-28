import { notFound } from "next/navigation";
import { withoutExampleData } from "@/core/exampleProfile";
import { renderHtml } from "@/core/render/html";
import { profileItemOptions } from "@/core/resume/build";
import { SECTION_KEYS } from "@/core/schema";
import { loadProfile } from "@/core/store/profileStore";
import { getResume } from "@/core/store/resumeStore";
import { ResumeEditor } from "./ResumeEditor";

export const dynamic = "force-dynamic";

export default async function EditResumePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getResume(id);
  if (!record) notFound();
  const { draft, document, ats } = record;

  return (
    <ResumeEditor
      id={id}
      target={[draft.targetTitle, draft.company].filter(Boolean).join(" at ")}
      // Start from what the resume shows, including text that falls back to the profile.
      initial={{
        template: draft.template,
        headline: document.headline,
        summary: document.sections.find((s) => s.key === "summary")?.paragraph ?? "",
        skills: draft.skills,
        sectionOrder: [...new Set([...draft.sectionOrder, ...SECTION_KEYS])],
        experience: draft.experience,
        projects: draft.projects,
        education: draft.education,
        volunteer: draft.volunteer,
        certifications: draft.certifications,
        awards: draft.awards,
        publications: draft.publications,
        languages: draft.languages,
      }}
      // Example entries the user never changed cannot go on a resume.
      options={profileItemOptions(withoutExampleData(loadProfile()).profile)}
      initialPreview={{
        html: renderHtml(document),
        pageCount: ats.pageCount,
        coverage: ats.keywordCoverage,
        missingKeywords: ats.missingKeywords,
        warnings: record.warnings,
      }}
    />
  );
}
