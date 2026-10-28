import { notFound } from "next/navigation";
import { withoutExampleData } from "@/core/exampleProfile";
import { renderHtml } from "@/core/render/html";
import { profileHeader, profileItemOptions } from "@/core/resume/build";
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
  // Example entries the user never changed cannot go on a resume.
  const profile = withoutExampleData(loadProfile()).profile;
  // Each item carries the user's rewording of its profile text, if any.
  const withEdit = <R extends { profileId: string }>(refs: R[]) => refs.map((r) => ({ ...r, edit: draft.overrides[r.profileId] ?? {} }));

  return (
    <ResumeEditor
      // A fresh editor per resume, so unsaved edits can never carry over to another one.
      key={id}
      id={id}
      target={[draft.targetTitle, draft.company].filter(Boolean).join(" at ")}
      // Start from what the resume shows, including text that falls back to the profile.
      initial={{
        template: draft.template,
        header: draft.header,
        headline: document.headline,
        sectionTitles: draft.sectionTitles,
        summary: document.sections.find((s) => s.key === "summary")?.paragraph ?? "",
        skills: draft.skills,
        sectionOrder: [...new Set([...draft.sectionOrder, ...SECTION_KEYS])],
        experience: withEdit(draft.experience),
        projects: withEdit(draft.projects),
        education: withEdit(draft.education),
        volunteer: withEdit(draft.volunteer),
        certifications: withEdit(draft.certifications),
        awards: withEdit(draft.awards),
        publications: withEdit(draft.publications),
        languages: withEdit(draft.languages),
      }}
      profileHeader={profileHeader(profile)}
      options={profileItemOptions(profile)}
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
