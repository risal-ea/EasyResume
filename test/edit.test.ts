import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
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
    expect(options.education[0]!.label).toBe("Bachelor of Science in Computer Science — University of Texas at Austin");
  });
});
