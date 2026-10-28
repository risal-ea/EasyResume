import { describe, expect, it } from "vitest";
import { checkAts } from "../src/core/ats/check";
import type { ResumeDocument } from "../src/core/resume/types";

function doc(bullets: string[], summary = "Backend engineer with 7 years of experience in payments."): ResumeDocument {
  return {
    name: "Alex Morgan",
    headline: "Backend Engineer",
    contact: ["alex@example.com", "+1 555 010 2030"],
    pageSize: "A4",
    template: "classic",
    fitLevel: 0,
    sections: [
      { key: "summary", title: "Summary", paragraph: summary, entries: [], lines: [] },
      { key: "skills", title: "Skills", paragraph: "", entries: [], lines: ["Languages: Go, C++, Node.js", "Infra: CI/CD, Kubernetes"] },
      {
        key: "experience",
        title: "Work Experience",
        paragraph: "",
        lines: [],
        entries: [{ title: "Engineer", subtitle: "Acme", meta: "", dates: "Jan 2020 – Present", bullets }],
      },
      {
        key: "education",
        title: "Education",
        paragraph: "",
        lines: [],
        entries: [{ title: "BSc", subtitle: "UT", meta: "", dates: "2017", bullets: [] }],
      },
    ],
  };
}

describe("checkAts", () => {
  it("measures keyword coverage with whole-term matching", () => {
    const report = checkAts(doc(["Built REST APIs serving 30M requests per day"]), ["Go", "C++", "node.js", "CI/CD", "API", "Rust", "Golang"], 1);
    expect(report.foundKeywords).toEqual(["Go", "C++", "node.js", "CI/CD", "API"]);
    expect(report.missingKeywords).toEqual(["Rust", "Golang"]);
    expect(report.keywordCoverage).toBe(71);
  });

  it("does not match a keyword inside another word", () => {
    const resume = doc(["Managed the Google Ads budget"]);
    resume.sections = resume.sections.filter((s) => s.key !== "skills");
    expect(checkAts(resume, ["Go"], 1).missingKeywords).toEqual(["Go"]);
  });

  it("returns null coverage without keywords", () => {
    expect(checkAts(doc(["Built X"]), [], 1).keywordCoverage).toBeNull();
  });

  it("flags weak openers, pronouns, missing metrics and length", () => {
    const report = checkAts(
      doc(
        ["Responsible for the billing system", "Worked on internal tools", "I improved the deploy process", "Helped the team"],
        "I am a passionate engineer.",
      ),
      [],
      3,
    );
    const messages = report.issues.map((i) => i.message).join("\n");
    expect(messages).toContain("weak phrase");
    expect(messages).toContain("first-person");
    expect(messages).toContain("include a number");
    expect(messages).toContain("3 pages");
  });

  it("is quiet for a clean resume", () => {
    const report = checkAts(
      doc(["Built a settlement service handling 4M transactions per day", "Reduced latency 78% with Redis caching", "Led migration of 14 services to Kubernetes"]),
      [],
      1,
    );
    expect(report.issues).toEqual([]);
  });
});
