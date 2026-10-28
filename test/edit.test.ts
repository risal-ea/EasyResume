import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { profilePath } from "../src/paths";
import { profileItemOptions } from "../src/core/resume/build";
import { createResume, previewResume, updateResume } from "../src/core/resume/service";
import { ResumeEditsSchema } from "../src/core/schema";
import { saveProfile } from "../src/core/store/profileStore";
import { getResume, resumeFolder } from "../src/core/store/resumeStore";
import { sampleProfile, useTempHome } from "./helpers";

describe("editing a resume in the web UI", () => {
  useTempHome();
  let id = "";

  beforeEach(async () => {
    saveProfile(sampleProfile());
    const record = await createResume({
      targetTitle: "Senior Backend Engineer",
      company: "Northwind Pay",
      jobDescription: "JD",
      keywords: ["Go", "Kafka"],
      summary: "Backend engineer with 7 years building payment systems.",
      experience: [{ profileId: "exp-fintrail" }, { profileId: "exp-shopwise" }],
      skills: [{ category: "Languages", items: ["Go", "Python"] }],
    });
    id = record.id;
  });

  it("previews edits without saving them", async () => {
    const before = getResume(id);
    const preview = await previewResume(id, ResumeEditsSchema.parse({ template: "traditional", summary: "Payments engineer." }));
    expect(preview.document.template).toBe("traditional");
    expect(preview.document.sections[0]!.paragraph).toBe("Payments engineer.");
    expect(preview.ats.pageCount).toBe(1);
    expect(getResume(id)).toEqual(before);
  });

  it("saves edits and keeps the target job and keywords", async () => {
    const edits = ResumeEditsSchema.parse({
      template: "compact",
      experience: [{ profileId: "exp-shopwise", bullets: ["Built REST APIs in Go"] }],
      // Users may leave a skill group unnamed.
      skills: [{ category: "", items: ["Go", "Kafka"] }],
      sectionOrder: ["experience", "skills"],
    });
    await updateResume(id, edits);

    const after = getResume(id)!;
    expect(after.draft.template).toBe("compact");
    expect(after.draft.keywords).toEqual(["Go", "Kafka"]);
    expect(after.draft.targetTitle).toBe("Senior Backend Engineer");
    expect(after.document.sections.map((s) => s.key)).toEqual(["experience", "skills", "summary"]);
    expect(after.document.sections[0]!.entries).toHaveLength(1);
    expect(after.document.sections[1]!.lines).toEqual(["Go, Kafka"]);
  });

  it("lets the user reword facts from the profile on this resume only", async () => {
    await updateResume(
      id,
      ResumeEditsSchema.parse({
        education: [{ profileId: "edu-ut" }],
        certifications: [{ profileId: "cert-aws-sa" }, { profileId: "cert-cka" }],
        languages: [{ profileId: "lang-en" }, { profileId: "lang-es" }],
        overrides: {
          "exp-fintrail": { title: "Staff Engineer (Payments)", meta: "" },
          "edu-ut": { grade: "", dates: "2014 – 2018" },
          "cert-aws-sa": { text: "AWS Solutions Architect – Associate" },
          // A blanked-out line is left off the resume.
          "cert-cka": { text: " " },
          "lang-es": { text: "Spanish (Fluent)" },
        },
      }),
    );

    const sections = Object.fromEntries(getResume(id)!.document.sections.map((s) => [s.key, s]));
    expect(sections.experience!.entries[0]).toMatchObject({ title: "Staff Engineer (Payments)", subtitle: "Fintrail", meta: "" });
    // Items without overrides still show the profile's text.
    expect(sections.experience!.entries[1]!.title).toBe("Software Engineer");
    expect(sections.education!.entries[0]!.dates).toBe("2014 – 2018");
    expect(sections.education!.entries[0]!.bullets.some((b) => /gpa/i.test(b))).toBe(false);
    expect(sections.certifications!.lines).toEqual(["AWS Solutions Architect – Associate"]);
    expect(sections.languages!.lines).toEqual(["English (Native), Spanish (Fluent)"]);
  });

  it("lets the user change the name, contact details and section headings", async () => {
    await updateResume(
      id,
      ResumeEditsSchema.parse({
        header: { name: "Alex J. Morgan", phone: "", links: ["alexmorgan.dev"] },
        sectionTitles: { experience: "Professional Experience", skills: "  " },
      }),
    );

    const { document, warnings } = getResume(id)!;
    expect(document.name).toBe("Alex J. Morgan");
    // The email and location still come from the profile; the phone was removed.
    expect(document.contact).toEqual(["alex.morgan@example.com", "Austin, TX, USA", "alexmorgan.dev"]);
    expect(warnings.some((w) => /no email or phone/.test(w))).toBe(false);
    const titles = Object.fromEntries(document.sections.map((s) => [s.key, s.title]));
    expect(titles.experience).toBe("Professional Experience");
    // A blank heading falls back to the standard one.
    expect(titles.skills).toBe("Skills");
  });

  it("keeps the user's rewording when the AI updates the resume", async () => {
    await updateResume(
      id,
      ResumeEditsSchema.parse({
        header: { name: "Alex J. Morgan" },
        sectionTitles: { experience: "Professional Experience" },
        overrides: { "exp-fintrail": { title: "Staff Engineer" } },
      }),
    );
    // update_resume's schema has none of these, so the AI cannot send or clear them.
    await updateResume(id, { experience: [{ profileId: "exp-fintrail", bullets: ["Built a Kafka pipeline"] }] });

    const { document } = getResume(id)!;
    const experience = document.sections.find((s) => s.key === "experience")!;
    expect(document.name).toBe("Alex J. Morgan");
    expect(experience.title).toBe("Professional Experience");
    expect(experience.entries[0]).toMatchObject({ title: "Staff Engineer", bullets: ["Built a Kafka pipeline"] });
  });

  it("changes only the resume being edited", async () => {
    const other = await createResume({
      targetTitle: "Platform Engineer",
      company: "Contoso",
      jobDescription: "JD",
      experience: [{ profileId: "exp-fintrail" }],
      certifications: [{ profileId: "cert-cka" }],
    });
    const profileBefore = readFileSync(profilePath(), "utf8");
    const otherBefore = getResume(other.id);

    await updateResume(
      id,
      ResumeEditsSchema.parse({
        header: { name: "Alex J. Morgan", email: "alex@alexmorgan.dev" },
        sectionTitles: { experience: "Professional Experience" },
        overrides: { "exp-fintrail": { title: "Staff Engineer" }, "cert-cka": { text: "CKA" } },
        summary: "Edited summary.",
        experience: [{ profileId: "exp-fintrail", bullets: ["Edited bullet"] }],
        certifications: [{ profileId: "cert-cka" }],
      }),
    );

    expect(readFileSync(profilePath(), "utf8")).toBe(profileBefore);
    expect(getResume(other.id)).toEqual(otherBefore);

    // Rebuilding another resume, or making a new one, starts from the profile, not from the edited resume.
    const rebuilt = await updateResume(other.id, { summary: "Platform engineer." });
    const created = await createResume({ targetTitle: "Engineer", jobDescription: "JD", experience: [{ profileId: "exp-fintrail" }] });
    for (const { document } of [rebuilt, created]) {
      const experience = document.sections.find((s) => s.key === "experience")!;
      expect(document.name).toBe("Alex Morgan");
      expect(document.contact[0]).toBe("alex.morgan@example.com");
      expect(experience.title).toBe("Work Experience");
      expect(experience.entries[0]!.title).toBe("Senior Software Engineer");
    }
    expect(rebuilt.document.sections.find((s) => s.key === "certifications")!.lines[0]).toMatch(/^Certified Kubernetes Administrator/);
  });

  it("rejects fields the editor may not change", () => {
    expect(ResumeEditsSchema.parse({ targetTitle: "CEO", headline: "Engineer" })).toEqual({ headline: "Engineer" });
  });

  it("reads resumes saved before templates existed as classic", () => {
    const file = path.join(resumeFolder(id), "resume.json");
    const json = JSON.parse(readFileSync(file, "utf8"));
    delete json.draft.template;
    delete json.document.template;
    delete json.document.fitLevel;
    writeFileSync(file, JSON.stringify(json));

    const record = getResume(id)!;
    expect(record.draft.template).toBe("classic");
    expect(record.document).toMatchObject({ template: "classic", fitLevel: 0 });
  });

  it("labels profile items for the editor", () => {
    const options = profileItemOptions(sampleProfile());
    expect(options.experience[0]).toMatchObject({
      id: "exp-fintrail",
      label: "Senior Software Engineer — Fintrail",
      detail: "Mar 2022 – Present",
    });
    expect(options.experience[0]!.bullets.length).toBeGreaterThan(0);
    expect(options.experience[0]!.defaults).toMatchObject({ title: "Senior Software Engineer", subtitle: "Fintrail", dates: "Mar 2022 – Present" });
    expect(options.education[0]!.label).toBe("Bachelor of Science in Computer Science — University of Texas at Austin");
    expect(options.certifications[0]!.defaults.text).toBe("AWS Certified Solutions Architect – Associate, Amazon Web Services (Apr 2023)");
  });
});
