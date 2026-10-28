import JSZip from "jszip";
import { PDFParse } from "pdf-parse";
import { describe, expect, it } from "vitest";
import { buildResume } from "../src/core/resume/build";
import { renderDocx } from "../src/core/render/docx";
import { renderHtml } from "../src/core/render/html";
import { renderMarkdown } from "../src/core/render/markdown";
import { pdfSafe, renderPdf, renderPdfToFit } from "../src/core/render/pdf";
import { MAX_FIT_LEVEL, resumeStyle } from "../src/core/render/templates";
import type { ResumeDocument } from "../src/core/resume/types";
import { normalizeDraft, TEMPLATE_IDS } from "../src/core/schema";
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

async function pdfText(data: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(data) });
  const { text } = await parser.getText();
  await parser.destroy();
  return text;
}

describe("PDF", () => {
  it("has extractable text with headings in reading order", async () => {
    const { data, pageCount } = await renderPdf(document, { title: "Resume" });
    expect(pageCount).toBe(1);
    const text = await pdfText(data);

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

describe("templates", () => {
  for (const template of TEMPLATE_IDS) {
    it(`${template}: extractable text with every heading in reading order`, async () => {
      const { data, pageCount } = await renderPdf({ ...document, template }, { title: "Resume" });
      expect(pageCount).toBe(1);
      const text = await pdfText(data);
      const positions = HEADINGS.map((h) => text.indexOf(h));
      expect(positions.every((p) => p >= 0)).toBe(true);
      expect([...positions].sort((a, b) => a - b)).toEqual(positions);
      // The title is read before its dates, whether they share its line or not.
      const title = text.indexOf("Senior Software Engineer — Fintrail");
      expect(title).toBeGreaterThan(0);
      expect(text.indexOf("Mar 2022 – Present")).toBeGreaterThan(title);
    });
  }

  it("traditional: serif fonts, centred header and dates on the title line in every format", async () => {
    const doc: ResumeDocument = { ...document, template: "traditional" };
    expect((await renderPdf(doc, { title: "Resume" })).data.toString("latin1")).toContain("/Times-Roman");

    const zip = await JSZip.loadAsync(await renderDocx(doc, { title: "Resume" }));
    const xml = await zip.file("word/document.xml")!.async("string");
    expect(xml).toContain('<w:jc w:val="center"/>');
    expect(xml).toContain("<w:tab/>"); // the right-aligned dates sit after a tab, not in a table
    expect(xml).not.toContain("<w:tbl>");
    expect(await zip.file("word/styles.xml")!.async("string")).toContain("Times New Roman");

    const html = renderHtml(doc);
    expect(html).toContain('<span class="dates">Mar 2022 – Present</span>');
    expect(html).toContain("Times New Roman");
  });

  it("falls back to classic for resumes saved before templates existed", () => {
    const old = { ...document } as Partial<ResumeDocument>;
    delete old.template;
    delete old.fitLevel;
    expect(resumeStyle(old as ResumeDocument)).toEqual(resumeStyle({ template: "classic", fitLevel: 0 }));
  });
});

describe("page limit", () => {
  const bullet = "Designed and shipped an event-driven settlement service in Go and Kafka that processes 4M transactions per day";
  const withJobs = (count: number): ResumeDocument => ({
    ...document,
    sections: [
      {
        key: "experience",
        title: "Work Experience",
        paragraph: "",
        lines: [],
        entries: Array.from({ length: count }, (_, i) => ({
          title: `Engineer ${i + 1}`,
          subtitle: "Acme",
          meta: "Remote",
          dates: "Jan 2020 – Dec 2021",
          bullets: Array<string>(5).fill(bullet),
        })),
      },
    ],
  });

  it("keeps a resume that fits as designed", async () => {
    const fitted = await renderPdfToFit(document, { title: "Resume" });
    expect(fitted.document.fitLevel).toBe(0);
  });

  it("tightens the layout until the resume fits on two pages", async () => {
    const doc = withJobs(10);
    expect((await renderPdf(doc, { title: "Resume" })).pageCount).toBe(3);
    const fitted = await renderPdfToFit(doc, { title: "Resume" });
    expect(fitted.pageCount).toBe(2);
    expect(fitted.document.fitLevel).toBeGreaterThan(0);
    // The DOCX and HTML follow the same, tighter style.
    expect(resumeStyle(fitted.document).size.body).toBeLessThanOrEqual(resumeStyle(doc).size.body);
    expect(resumeStyle(fitted.document).margin.x).toBeLessThan(resumeStyle(doc).margin.x);
  });

  it("reports the page count when even the tightest layout is too long", async () => {
    const fitted = await renderPdfToFit(withJobs(30), { title: "Resume" });
    expect(fitted.pageCount).toBeGreaterThan(2);
    expect(fitted.document.fitLevel).toBe(MAX_FIT_LEVEL);
  });

  it("never shrinks text below 8 pt", () => {
    for (const template of TEMPLATE_IDS) {
      const { size } = resumeStyle({ template, fitLevel: MAX_FIT_LEVEL });
      expect(Math.min(...Object.values(size))).toBeGreaterThanOrEqual(8);
    }
  });
});
