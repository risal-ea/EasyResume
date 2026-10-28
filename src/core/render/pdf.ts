import PDFDocument from "pdfkit";
import type { ResumeDocument } from "../resume/types";
import { joinNonEmpty } from "./format";
import { splitLabel } from "./markdown";

const REGULAR = "Helvetica";
const BOLD = "Helvetica-Bold";
const INK = "#111111";
const MUTED = "#444444";

export interface PdfResult {
  data: Buffer;
  pageCount: number;
}

/**
 * ATS-safe PDF: one column, real text (no images or tables), standard
 * headings and contact details in the body rather than a page header.
 */
export function renderPdf(doc: ResumeDocument, info: { title: string; subject?: string }): Promise<PdfResult> {
  const pdf = new PDFDocument({
    size: doc.pageSize === "Letter" ? "LETTER" : "A4",
    margins: { top: 46, bottom: 46, left: 54, right: 54 },
    bufferPages: true,
    info: { Title: info.title, Author: doc.name, Subject: info.subject ?? "", Creator: "EasyResume" },
  });

  const chunks: Uint8Array[] = [];
  pdf.on("data", (chunk: Uint8Array) => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => {
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
  });

  const left = pdf.page.margins.left;
  const width = pdf.page.width - left - pdf.page.margins.right;
  const bottom = () => pdf.page.height - pdf.page.margins.bottom;
  const ensureSpace = (height: number) => {
    if (pdf.y + height > bottom()) pdf.addPage();
  };
  const write = (text: string, font: string, size: number, color = INK, options: PDFKit.Mixins.TextOptions = {}) =>
    pdf.font(font).fontSize(size).fillColor(color).text(pdfSafe(text), { width, lineGap: 1.5, ...options });

  write(doc.name || "Resume", BOLD, 20);
  if (doc.headline) write(doc.headline, REGULAR, 11, "#333333");
  if (doc.contact.length) write(doc.contact.join("  |  "), REGULAR, 9.5, "#333333");

  for (const section of doc.sections) {
    pdf.moveDown(0.7);
    ensureSpace(56);
    pdf.x = left;
    write(section.title.toUpperCase(), BOLD, 11, INK, { characterSpacing: 0.4 });
    const ruleY = pdf.y + 1;
    pdf.moveTo(left, ruleY).lineTo(left + width, ruleY).lineWidth(0.7).strokeColor("#999999").stroke();
    pdf.y = ruleY + 4;

    if (section.paragraph) write(section.paragraph, REGULAR, 10);

    section.entries.forEach((e, i) => {
      if (i > 0) pdf.moveDown(0.45);
      ensureSpace(40);
      pdf.x = left;
      if (e.subtitle) {
        write(e.title, BOLD, 10.5, INK, { continued: true });
        write(` — ${e.subtitle}`, REGULAR, 10.5);
      } else {
        write(e.title, BOLD, 10.5);
      }
      const meta = joinNonEmpty([e.dates, e.meta], "  |  ");
      if (meta) write(meta, REGULAR, 9.5, MUTED);
      pdf.moveDown(0.15);
      for (const bullet of e.bullets) {
        ensureSpace(14);
        const y = pdf.y;
        pdf.font(REGULAR).fontSize(10).fillColor(INK).text("•", left + 4, y, { width: 10, lineBreak: false });
        pdf.text(pdfSafe(bullet), left + 16, y, { width: width - 16, lineGap: 1.5 });
        pdf.x = left;
        pdf.moveDown(0.1);
      }
    });

    for (const line of section.lines) {
      ensureSpace(14);
      pdf.x = left;
      const [label, rest] = splitLabel(line, section.key === "skills");
      if (label) {
        write(`${label}: `, BOLD, 10, INK, { continued: true });
        write(rest, REGULAR, 10);
      } else {
        write(line, REGULAR, 10);
      }
      pdf.moveDown(0.1);
    }
  }

  const pageCount = pdf.bufferedPageRange().count;
  pdf.end();
  return done.then((data) => ({ data, pageCount }));
}

// The built-in PDF fonts only cover the WinAnsi character set (Latin-1 plus a
// few typographic marks). Map common extras to ASCII, strip accents that have
// no WinAnsi glyph, and replace anything else so the text never turns to junk.
const WIN_ANSI_EXTRAS = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const REPLACEMENTS: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "≥": ">=",
  "≤": "<=",
  "≈": "~",
  "×": "x",
  "−": "-",
  "‑": "-",
  "‐": "-",
  " ": " ",
  " ": " ",
  " ": " ",
  "✓": "",
  "✔": "",
  "★": "*",
};

export function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRAS.has(ch) || ch === "\n") {
      out += ch;
    } else if (ch === "\t" || ch === "\r") {
      out += " ";
    } else if (ch in REPLACEMENTS) {
      out += REPLACEMENTS[ch];
    } else {
      const stripped = ch.normalize("NFKD").replace(/\p{M}/gu, "");
      out += [...stripped].every((c) => c.codePointAt(0)! <= 0xff) ? stripped : "?";
    }
  }
  return out;
}
