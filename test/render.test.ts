import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import { describe, expect, it } from "vitest";
import { buildResume } from "../src/core/resume/build";
import { renderDocx } from "../src/core/render/docx";
import { renderHtml } from "../src/core/render/html";
import { renderMarkdown } from "../src/core/render/markdown";
import { pdfSafe, renderPdf } from "../src/core/render/pdf";
import { normalizeDraft } from "../src/core/schema";
import { fixture, sampleProfile } from "./helpers";

const { document } = buildResume(
  sampleProfile(),
  normalizeDraft({
    targetTitle: "Senior Backend Engineer",
    company: "Northwind Pay",
    jobDescription: fixture("sample-jd.txt"),
    summary: "Senior backend engineer with 7 years building payment systems in Go, Kafka and PostgreSQL.",
    experience: [{ profileId: "exp-fintrail" }, { profileId: "exp-shopwise" }, { profileId: "exp-datacore" }],
    projects: [{ profileId: "proj-ratelimit" }],
    education: [{ profileId: "edu-ut" }],
    certifications: [{ profileId: "cert-aws-sa" }, { profileId: "cert-cka" }],
    skills: [
      { category: "Languages", items: ["Go", "Python", "SQL"] },
      { category: "Infrastructure", items: ["AWS", "Kubernetes", "Terraform"] },
    ],
    languages: [{ profileId: "lang-en" }, { profileId: "lang-es" }],
  }),
);
const HEADINGS = ["SUMMARY", "SKILLS", "WORK EXPERIENCE", "PROJECTS", "EDUCATION", "CERTIFICATIONS", "LANGUAGES"];

describe("PDF", () => {
  it("has extractable text with headings in reading order", async () => {
    const { data, pageCount } = await renderPdf(document, { title: "Resume" });
    expect(pageCount).toBe(1);
    const parser = new PDFParse({ data: new Uint8Array(data) });
    const { text } = await parser.getText();
    await parser.destroy();

    const positions = HEADINGS.map((h) => text.indexOf(h));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(text).toContain("Alex Morgan");
    expect(text).toContain("alex.morgan@example.com");
    expect(text).toContain("Senior Software Engineer — Fintrail");
    expect(text).toContain("Mar 2022 – Present");
    expect(text).toContain("• Cut p99 API latency from 850 ms to 190 ms");
    expect(text).toContain("AWS Certified Solutions Architect – Associate");
  });

  it("keeps WinAnsi characters and replaces the rest", () => {
    expect(pdfSafe("José – “ok” • 5€")).toBe("José – “ok” • 5€");
    expect(pdfSafe("a → b ≥ c")).toBe("a -> b >= c");
    // ó is Latin-1 and kept, ź decomposes to z, Ł has no WinAnsi form.
    expect(pdfSafe("Łódź")).toBe("?ódz");
  });
});

describe("DOCX", () => {
  it("uses real heading and list styles", async () => {
    const zip = await JSZip.loadAsync(await renderDocx(document, { title: "Resume" }));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('w:val="Title"');
    expect(xml.match(/w:val="Heading1"/g)).toHaveLength(HEADINGS.length);
    expect(xml).toContain("<w:numPr>");
    expect(xml).toContain("Cut p99 API latency");
    expect(xml).not.toContain("<w:tbl>");
  });
});

describe("Markdown and HTML", () => {
  it("render every section", () => {
    const md = renderMarkdown(document);
    expect(md).toContain("# Alex Morgan");
    expect(md).toContain("### Senior Software Engineer — Fintrail");
    expect(md).toContain("- **Languages:** Go, Python, SQL");
    const html = renderHtml(document);
    for (const s of document.sections) expect(html).toContain(`<h2>${s.title}</h2>`);
  });

  it("escapes HTML", () => {
    expect(renderHtml({ ...document, name: "<script>x</script>" })).not.toContain("<script>x");
  });
});
