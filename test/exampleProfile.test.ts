import { describe, expect, it } from "vitest";
import { EXAMPLE_PROFILE, exampleLeftovers, exampleProfileForForm, withoutExampleData } from "../src/core/exampleProfile";
import { emptyProfile } from "../src/core/schema";
import { sampleProfile } from "./helpers";

describe("example profile", () => {
  it("is a valid, A4 profile for new users", () => {
    const form = exampleProfileForForm();
    expect(form.basics.name).toBe("Jordan Lee");
    expect(form.settings.pageSize).toBe("A4");
    expect(form.experience.every((e) => e.id.startsWith("example-"))).toBe(true);
  });

  it("lists every unchanged part", () => {
    const left = exampleLeftovers(exampleProfileForForm());
    expect(left).toContain("contact details");
    expect(left).toContain("Senior Product Manager (Brightlane Software)");
    expect(left).toContain("notes");
    expect(exampleLeftovers(emptyProfile())).toEqual([]);
    expect(exampleLeftovers(sampleProfile())).toEqual([]);
  });

  it("treats an edited example item as the user's own", () => {
    const profile = exampleProfileForForm();
    profile.experience[0]!.company = "My Real Company";
    profile.experience[1]!.achievements.push(""); // a blank line from the form is not an edit
    const left = exampleLeftovers(profile);
    expect(left.join()).not.toContain("Brightlane");
    expect(left.join()).toContain("Northfield");
  });

  it("hides unchanged example data from the AI but keeps the user's data", () => {
    const profile = exampleProfileForForm();
    profile.basics.name = "Sam Rivera";
    profile.experience[0]!.title = "Head of Product";
    profile.experience.push({ ...sampleProfile().experience[0]! });

    const { profile: visible, removed } = withoutExampleData(profile);
    expect(visible.basics.name).toBe("Sam Rivera");
    expect(visible.basics.email).toBe("");
    expect(visible.basics.links).toEqual([]);
    expect(visible.experience.map((e) => e.title)).toEqual(["Head of Product", "Senior Software Engineer"]);
    expect(visible.education).toEqual([]);
    expect(visible.notes).toBe("");
    expect(removed).toBeGreaterThan(5);
  });

  it("removes nothing from a real profile", () => {
    expect(withoutExampleData(sampleProfile())).toEqual({ profile: sampleProfile(), removed: 0 });
    expect(EXAMPLE_PROFILE.basics.email).toMatch(/@example\.com$/);
  });
});
