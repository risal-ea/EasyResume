import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import type { ResumeDocument } from "../resume/types";
import { joinNonEmpty } from "./format";
import { splitLabel } from "./markdown";

// Arial ships with every OS (Calibri only comes with Office) and matches the PDF.
const FONT = "Arial";
// Page sizes in twips (1/1440 inch).
const PAGE = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 },
};

/** Word document using real Title/Heading 1/list styles so ATS parsers can find the sections. */
export async function renderDocx(doc: ResumeDocument, info: { title: string; subject?: string }): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun(doc.name || "Resume")] }),
  ];
  if (doc.headline) children.push(new Paragraph({ children: [new TextRun({ text: doc.headline, size: 22 })] }));
  if (doc.contact.length) {
    children.push(new Paragraph({ children: [new TextRun({ text: doc.contact.join("  |  "), size: 19 })] }));
  }

  for (const section of doc.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(section.title)] }));
    if (section.paragraph) {
      children.push(new Paragraph({ children: [new TextRun(section.paragraph)], spacing: { after: 60 } }));
    }
    section.entries.forEach((e, i) => {
      children.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: i > 0 ? 140 : 0 },
          children: [
            new TextRun({ text: e.title, bold: true }),
            ...(e.subtitle ? [new TextRun({ text: ` — ${e.subtitle}` })] : []),
          ],
        }),
      );
      const meta = joinNonEmpty([e.dates, e.meta], "  |  ");
      if (meta) {
        children.push(
          new Paragraph({ keepNext: e.bullets.length > 0, children: [new TextRun({ text: meta, size: 19, color: "444444" })] }),
        );
      }
      for (const bullet of e.bullets) {
        children.push(new Paragraph({ numbering: { reference: "bullets", level: 0 }, children: [new TextRun(bullet)] }));
      }
    });
    for (const line of section.lines) {
      const [label, rest] = splitLabel(line, section.key === "skills");
      children.push(
        new Paragraph({
          spacing: { after: 30 },
          children: label ? [new TextRun({ text: `${label}: `, bold: true }), new TextRun(rest)] : [new TextRun(line)],
        }),
      );
    }
  }

  const document = new Document({
    creator: doc.name || "EasyResume",
    title: info.title,
    subject: info.subject,
    styles: {
      default: {
        document: { run: { font: FONT, size: 21 }, paragraph: { spacing: { after: 20, line: 264 } } },
        title: { run: { font: FONT, size: 40, bold: true, color: "111111" }, paragraph: { spacing: { after: 40 } } },
        heading1: {
          run: { font: FONT, size: 23, bold: true, allCaps: true, color: "111111" },
          paragraph: {
            keepNext: true,
            spacing: { before: 240, after: 100 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "999999", space: 1 } },
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 240 }, spacing: { after: 30 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: PAGE[doc.pageSize],
            margin: { top: 720, bottom: 720, left: 900, right: 900 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
