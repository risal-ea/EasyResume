import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  LevelFormat,
  Packer,
  Paragraph,
  Tab,
  TabStopType,
  TextRun,
} from "docx";
import type { ResumeDocument } from "../resume/types";
import { joinNonEmpty } from "./format";
import { splitLabel } from "./markdown";
import { resumeStyle } from "./templates";

// Page sizes in twips (1/1440 inch).
const PAGE = {
  A4: { width: 11906, height: 16838 },
  Letter: { width: 12240, height: 15840 },
};

const halfPoints = (pt: number) => Math.round(pt * 2);
const twips = (pt: number) => Math.round(pt * 20);
const hex = (color: string) => color.replace("#", "");

/** Word document using real Title/Heading 1/list styles so ATS parsers can find the sections. */
export async function renderDocx(doc: ResumeDocument, info: { title: string; subject?: string }): Promise<Buffer> {
  const style = resumeStyle(doc);
  const { size } = style;
  // Arial and Times New Roman ship with every OS (Calibri only comes with Office) and match the PDF fonts.
  const font = style.serif ? "Times New Roman" : "Arial";
  const page = PAGE[doc.pageSize];
  const margin = { x: twips(style.margin.x), y: twips(style.margin.y) };
  const headerAlign = style.centerHeader ? AlignmentType.CENTER : AlignmentType.LEFT;
  // Right-aligned dates use a tab stop at the right margin: no tables, which ATS parsers can scramble.
  const rightTab = [{ type: TabStopType.RIGHT, position: page.width - 2 * margin.x }];

  const children: Paragraph[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, alignment: headerAlign, children: [new TextRun(doc.name || "Resume")] }),
  ];
  if (doc.headline) {
    children.push(
      new Paragraph({ alignment: headerAlign, children: [new TextRun({ text: doc.headline, size: halfPoints(size.headline) })] }),
    );
  }
  if (doc.contact.length) {
    children.push(
      new Paragraph({
        alignment: headerAlign,
        children: [new TextRun({ text: doc.contact.join("  |  "), size: halfPoints(size.contact) })],
      }),
    );
  }

  for (const section of doc.sections) {
    children.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(section.title)] }));
    if (section.paragraph) {
      children.push(new Paragraph({ children: [new TextRun(section.paragraph)], spacing: { after: 60 } }));
    }
    section.entries.forEach((e, i) => {
      const dates = style.datesRight ? e.dates : "";
      children.push(
        new Paragraph({
          keepNext: true,
          spacing: { before: i > 0 ? twips(style.entryGap + 1.5) : 0 },
          tabStops: dates ? rightTab : undefined,
          children: [
            new TextRun({ text: e.title, bold: true, size: halfPoints(size.title) }),
            ...(e.subtitle ? [new TextRun({ text: ` — ${e.subtitle}`, size: halfPoints(size.title) })] : []),
            ...(dates ? [new TextRun({ children: [new Tab(), dates], size: halfPoints(size.meta), color: "444444" })] : []),
          ],
        }),
      );
      const meta = style.datesRight ? e.meta : joinNonEmpty([e.dates, e.meta], "  |  ");
      if (meta) {
        children.push(
          new Paragraph({
            keepNext: e.bullets.length > 0,
            children: [new TextRun({ text: meta, size: halfPoints(size.meta), color: "444444" })],
          }),
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
        document: { run: { font, size: halfPoints(size.body) }, paragraph: { spacing: { after: 20, line: 264 } } },
        title: {
          run: { font, size: halfPoints(size.name), bold: true, color: hex(style.accent) },
          paragraph: { spacing: { after: 40 } },
        },
        heading1: {
          run: { font, size: halfPoints(size.heading), bold: true, allCaps: true, color: hex(style.accent) },
          paragraph: {
            keepNext: true,
            spacing: { before: twips(style.sectionGap + 3), after: 100 },
            border: style.rule
              ? { bottom: { style: BorderStyle.SINGLE, size: 6, color: hex(style.rule), space: 1 } }
              : undefined,
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
            size: page,
            margin: { top: margin.y, bottom: margin.y, left: margin.x, right: margin.x },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}
