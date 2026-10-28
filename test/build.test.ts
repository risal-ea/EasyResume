import { describe, expect, it } from "vitest";
import { buildResume, DraftError } from "../src/core/resume/build";
import { normalizeDraft } from "../src/core/schema";
import { sampleProfile } from "./helpers";

const base = { targetTitle: "Senior Backend Engineer", company: "Northwind Pay", jobDescription: "JD" };

describe("buildResume", () => {
  it("fills facts from the profile and uses the tailored bullets", () => {
    const { document, warnings } = buildResume(
      sampleProfile(),
      normalizeDraft({
        ...base,
        summary: "Tailored summary.",
        experience: [{ profileId: "exp-fintrail", bullets: ["- Built the thing", "• Shipped it"] }, { profileId: "exp-shopwise" }],
        education: [{ profileId: "edu-ut" }],
        certifications: [{ profileId: "cert-cka" }],
        skills: [{ category: "Languages", items: ["Go", "Python"] }],
      }),
    );
    expect(warnings).toEqual([]);
    expect(document.sections.map((s) => s.key)).toEqual(["summary", "skills", "experience", "education", "certifications"]);

    const experience = document.sections.find((s) => s.key === "experience")!;
    expect(experience.entries[0]).toMatchObject({
      title: "Senior Software Engineer",
      subtitle: "Fintrail",
      dates: "Mar 2022 – Present",
      bullets: ["Built the thing", "Shipped it"],
    });
    // Omitted bullets fall back to the profile achievements.
    expect(experience.entries[1]!.bullets).toHaveLength(3);

    const education = document.sections.find((s) => s.key === "education")!;
    expect(education.entries[0]).toMatchObject({
      title: "Bachelor of Science in Computer Science",
      subtitle: "University of Texas at Austin",
      bullets: ["GPA 3.7/4.0"],
    });
    expect(document.contact).toContain("linkedin.com/in/alex-morgan-example");
    expect(document.pageSize).toBe("Letter");
  });

  it("uses the job's title as the headline unless one is given", () => {
    const profile = sampleProfile();
    expect(profile.basics.headline).toBe("Backend Software Engineer");
    expect(buildResume(profile, normalizeDraft(base)).document.headline).toBe("Senior Backend Engineer");
    const custom = normalizeDraft({ ...base, headline: "Senior Backend Engineer | Payments" });
    expect(buildResume(profile, custom).document.headline).toBe("Senior Backend Engineer | Payments");
  });

  it("rejects ids that are not in the profile", () => {
    expect(() =>
      buildResume(sampleProfile(), normalizeDraft({ ...base, experience: [{ profileId: "exp-made-up" }] })),
    ).toThrow(DraftError);
  });

  it("warns about skills that are not in the profile", () => {
    const { warnings } = buildResume(
      sampleProfile(),
      normalizeDraft({ ...base, skills: [{ category: "Languages", items: ["Go", "Rust", "PagerDuty"] }] }),
    );
    expect(warnings.join(" ")).toContain("Rust");
    // PagerDuty is mentioned in the profile notes, so it counts.
    expect(warnings.join(" ")).not.toContain("PagerDuty");
  });

  it("honours sectionOrder and warns on non-chronological experience", () => {
    const { document, warnings } = buildResume(
      sampleProfile(),
      normalizeDraft({
        ...base,
        sectionOrder: ["education", "experience"],
        education: [{ profileId: "edu-ut" }],
        experience: [{ profileId: "exp-shopwise" }, { profileId: "exp-fintrail" }],
      }),
    );
    expect(document.sections.map((s) => s.key).slice(0, 2)).toEqual(["education", "experience"]);
    expect(warnings.join(" ")).toContain("reverse-chronological");
  });
});
