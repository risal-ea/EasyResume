import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { extractResumeText } from "../src/core/import/extractText";
import { mergeImported } from "../src/core/import/merge";
import { buildResume } from "../src/core/resume/build";
import { renderDocx } from "../src/core/render/docx";
import { formatDateRange } from "../src/core/render/format";
import { renderPdf } from "../src/core/render/pdf";
import { exampleLeftovers, exampleProfileForForm } from "../src/core/exampleProfile";
import { emptyProfile, ExperienceSchema, normalizeDraft, ProfileSchema } from "../src/core/schema";
import { clearImport, getPendingImport, getUpload, savePendingImport, saveUpload } from "../src/core/store/importStore";
import { sampleProfile, useTempHome } from "./helpers";

const { document } = buildResume(
  sampleProfile(),
  normalizeDraft({
    targetTitle: "Backend Engineer",
    jobDescription: "JD",
    experience: [{ profileId: "exp-fintrail" }],
    education: [{ profileId: "edu-ut" }],
    skills: [{ category: "Languages", items: ["Go", "Python"] }],
  }),
);

describe("extractResumeText", () => {
  it("reads PDF files", async () => {
    const { data } = await renderPdf(document, { title: "Resume" });
    const text = await extractResumeText("resume.PDF", new Uint8Array(data));
    expect(text).toContain("Alex Morgan");
    expect(text).toContain("Senior Software Engineer — Fintrail");
    expect(text).not.toMatch(/-- \d+ of \d+ --/);
  });

  it("reads DOCX files", async () => {
    const text = await extractResumeText("resume.docx", new Uint8Array(await renderDocx(document, { title: "Resume" })));
    expect(text).toContain("Alex Morgan");
    expect(text).toContain("Cut p99 API latency");
  });

  it("reads plain text and explains unsupported or empty files", async () => {
    const body = "Jane Doe\nSoftware engineer with 5 years of experience building web applications.";
    expect(await extractResumeText("cv.txt", new TextEncoder().encode(body))).toBe(body);
    await expect(extractResumeText("cv.doc", new Uint8Array(10))).rejects.toThrow(/\.docx/);
    await expect(extractResumeText("cv.png", new Uint8Array(10))).rejects.toThrow(/PDF, DOCX/);
    await expect(extractResumeText("cv.txt", new TextEncoder().encode("   hi  "))).rejects.toThrow(/No text/);
    await expect(extractResumeText("cv.pdf", new TextEncoder().encode("not a pdf at all"))).rejects.toThrow(/could not be read/);
  });
});

describe("mergeImported", () => {
  it("fills empty fields, appends new items and skips duplicates", () => {
    const base = sampleProfile();
    base.basics.phone = "";
    const imported = ProfileSchema.parse({
      basics: { name: "Someone Else", phone: "+1 555 999", links: [{ label: "GH", url: "github.com/alexmorgan-example/" }] },
      experience: [
        { company: "FINTRAIL", title: "Senior Software Engineer" }, // already there
        { company: "New Co", title: "Intern", startDate: "2016" },
      ],
      skills: [
        { category: "languages", items: ["go", "Rust"] },
        { category: "Soft skills", items: ["Mentoring"] },
      ],
      notes: "Plays chess.",
    });
    const merged = mergeImported(base, imported);
    expect(merged.basics.name).toBe("Alex Morgan");
    expect(merged.basics.phone).toBe("+1 555 999");
    expect(merged.basics.links).toHaveLength(2);
    expect(merged.experience.map((e) => e.company)).toEqual(["Fintrail", "Shopwise", "DataCore Labs", "New Co"]);
    expect(merged.skills.find((g) => g.category === "Languages")!.items).toEqual(["Go", "Python", "Java", "SQL", "TypeScript", "Rust"]);
    expect(merged.skills.at(-1)!.category).toBe("Soft skills");
    expect(merged.notes).toContain("Plays chess.");
    expect(base.experience).toHaveLength(3); // input untouched
  });

  it("replaces unchanged example data instead of keeping it", () => {
    // A saved example profile with an earlier import appended to it.
    const base = exampleProfileForForm();
    base.experience.push(ExperienceSchema.parse({ company: "RP2", title: "Data Analyst Intern" }));
    const imported = ProfileSchema.parse({
      basics: { name: "Risal EA", email: "risal@example.org", headline: "Data Analyst" },
      experience: [{ company: "RP2", title: "Data Analyst Intern" }],
    });

    const merged = mergeImported(base, imported);
    expect(merged.basics).toMatchObject({ name: "Risal EA", email: "risal@example.org", headline: "Data Analyst" });
    expect(merged.basics.links).toEqual([]);
    expect(merged.basics.location).toEqual({ city: "", region: "", country: "" });
    expect(merged.experience.map((e) => e.company)).toEqual(["RP2"]);
    expect(merged.education).toEqual([]);
    expect(merged.notes).toBe("");
    expect(exampleLeftovers(merged)).toEqual([]);
  });

  it("returns the import itself for an empty profile", () => {
    const imported = ProfileSchema.parse({ basics: { name: "Jane" }, education: [{ institution: "MIT" }] });
    expect(mergeImported(emptyProfile(), imported)).toEqual({ ...imported, settings: emptyProfile().settings });
  });
});

describe("import store", () => {
  const home = useTempHome();

  it("keeps the upload, replaces a stale import on re-upload, and clears", () => {
    expect(getUpload()).toBeNull();
    saveUpload("/tmp/evil/../My CV.pdf", "text");
    expect(getUpload()).toMatchObject({ fileName: "My CV.pdf", text: "text" });

    const pending = savePendingImport({ basics: { name: "Jane" }, experience: [{ company: "A", title: "B", startDate: "2019" }] });
    expect(pending.fileName).toBe("My CV.pdf");
    expect(pending.profile.experience[0]!.id).toMatch(/[0-9a-f-]{36}/);
    expect(getPendingImport()!.profile.basics.name).toBe("Jane");

    saveUpload("other.docx", "new text");
    expect(getPendingImport()).toBeNull();

    clearImport();
    expect(getUpload()).toBeNull();
    expect(existsSync(path.join(home.dir(), "import"))).toBe(false);
  });

  it("rejects malformed imports", () => {
    expect(() => savePendingImport({ experience: [{ startDate: "Jan 2020" }] })).toThrow();
  });
});

describe("year-only dates", () => {
  it("are valid and formatted as the year", () => {
    expect(ProfileSchema.parse({ experience: [{ startDate: "2019", endDate: "2021-06" }] }).experience[0]!.startDate).toBe("2019");
    expect(formatDateRange("2019", "2021-06")).toBe("2019 – Jun 2021");
    expect(formatDateRange("2019", "", true)).toBe("2019 – Present");
  });
});
