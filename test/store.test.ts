import { existsSync, readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { profilePath } from "../src/paths";
import { EducationSchema, emptyProfile, ProfileSchema } from "../src/core/schema";
import { deleteProfile, loadProfile, profileExists, saveProfile } from "../src/core/store/profileStore";
import { getResume, isValidResumeId, newResumeId, resumeFolder } from "../src/core/store/resumeStore";
import { sampleProfile, useTempHome } from "./helpers";

describe("profile store", () => {
  useTempHome();

  it("returns an empty profile when nothing is saved", () => {
    expect(loadProfile()).toEqual(emptyProfile());
  });

  it("round-trips the sample profile", () => {
    const profile = sampleProfile();
    saveProfile(profile);
    expect(loadProfile()).toEqual(profile);
  });

  it("fills defaults for partial JSON", () => {
    const parsed = ProfileSchema.parse({ basics: { name: "A" }, experience: [{ company: "X" }] });
    expect(parsed.basics.location.city).toBe("");
    expect(parsed.experience[0]!.id).toMatch(/[0-9a-f-]{36}/);
    expect(parsed.settings.pageSize).toBe("A4");
  });

  it("trims text and drops blank lines and empty items on save", () => {
    const profile = sampleProfile();
    profile.basics.name = "  Alex Morgan  ";
    profile.experience[0]!.achievements.push("", "   ");
    profile.education.push(EducationSchema.parse({}));
    const saved = saveProfile(profile);
    expect(saved.basics.name).toBe("Alex Morgan");
    expect(saved.experience[0]!.achievements).toHaveLength(4);
    expect(saved.education).toHaveLength(1);
    expect(JSON.parse(readFileSync(profilePath(), "utf8")).basics.name).toBe("Alex Morgan");
  });

  it("rejects invalid data", () => {
    expect(() => saveProfile({ basics: { email: "not-an-email" } })).toThrow();
    expect(existsSync(profilePath())).toBe(false);
  });
});

describe("resume ids", () => {
  useTempHome();

  it("are readable and URL-safe", () => {
    const id = newResumeId("Northwind Pay", "Senior Backend Engineer (Go/Kafka)", new Date("2026-10-27T10:00:00Z"));
    expect(id).toMatch(/^2026-10-27-northwind-pay-senior-backend-engineer-go-kafka-[a-z0-9]{4}$/);
    expect(isValidResumeId(id)).toBe(true);
  });

  it("refuse path traversal", () => {
    expect(isValidResumeId("../etc")).toBe(false);
    expect(() => resumeFolder("../../x")).toThrow();
    expect(getResume("../profile")).toBeNull();
  });
});

describe("deleteProfile", () => {
  const home = useTempHome();

  it("deletes everything entered and leaves no copy behind", () => {
    deleteProfile(); // no profile yet: nothing to do
    saveProfile(sampleProfile());
    deleteProfile();
    expect(profileExists()).toBe(false);
    expect(loadProfile()).toEqual(emptyProfile());
    expect(readdirSync(home.dir())).toEqual([]);
  });
});
