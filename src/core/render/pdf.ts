import PDFDocument from "pdfkit";
import type { ResumeDocument, ResumeEntry } from "../resume/types";
import { joinNonEmpty } from "./format";
import { splitLabel } from "./markdown";
import { MAX_FIT_LEVEL, MAX_PAGES, resumeStyle } from "./templates";

const INK = "#111111";
const MUTED = "#444444";

export interface PdfResult {
  data: Buffer;
  pageCount: number;
}

type PdfInfo = { title: string; subject?: string };

/**
 * Renders with the template's normal spacing, then tighter and tighter until
 * the resume fits on MAX_PAGES. The returned document carries the fit level
 * used, so the DOCX and HTML can match it. If even the tightest layout is too
 * long, the result has more than MAX_PAGES pages and the caller decides.
 */
export async function renderPdfToFit(doc: ResumeDocument, info: PdfInfo): Promise<PdfResult & { document: ResumeDocument }> {
  for (let fitLevel = 0; ; fitLevel++) {
    const document = { ...doc, fitLevel };
    const result = await renderPdf(document, info);
    if (result.pageCount <= MAX_PAGES || fitLevel >= MAX_FIT_LEVEL) return { ...result, document };
  }
}

/**
 * ATS-safe PDF: one column, real text (no images or tables), standard
 * headings and contact details in the body rather than a page header.
 */
export function renderPdf(doc: ResumeDocument, info: PdfInfo): Promise<PdfResult> {
  const style = resumeStyle(doc);
  const { size } = style;
  // The built-in PDF fonts: no embedding, and metrically equivalent to Arial / Times New Roman in the DOCX.
  const REGULAR = style.serif ? "Times-Roman" : "Helvetica";
  const BOLD = style.serif ? "Times-Bold" : "Helvetica-Bold";
  const headerAlign = style.centerHeader ? "center" : "left";

  const pdf = new PDFDocument({
    size: doc.pageSize === "Letter" ? "LETTER" : "A4",
    margins: { top: style.margin.y, bottom: style.margin.y, left: style.margin.x, right: style.margin.x },
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
  const write = (text: string, font: string, pt: number, color = INK, options: PDFKit.Mixins.TextOptions = {}) =>
    pdf.font(font).fontSize(pt).fillColor(color).text(pdfSafe(text), { width, lineGap: style.lineGap, ...options });

  // "Title — Company", with the dates at the right margin when the template asks for it.
  // The title is drawn first so text extraction reads it before the dates.
  const entryHeading = (e: ResumeEntry, dates: string) => {
    const top = pdf.y;
    const datesWidth = dates ? pdf.font(REGULAR).fontSize(size.meta).widthOfString(pdfSafe(dates)) : 0;
    const titleWidth = dates ? width - datesWidth - 12 : width;
    if (e.subtitle) {
      write(e.title, BOLD, size.title, INK, { continued: true, width: titleWidth });
      write(` — ${e.subtitle}`, REGULAR, size.title, INK, { width: titleWidth });
    } else {
      write(e.title, BOLD, size.title, INK, { width: titleWidth });
    }
    if (dates) {
      const below = pdf.y;
      // Line the smaller date text up with the title's baseline.
      const y = top + (size.title - size.meta) * 0.75;
      pdf.font(REGULAR).fontSize(size.meta).fillColor(MUTED).text(pdfSafe(dates), left + width - datesWidth, y, { lineBreak: false });
      pdf.x = left;
      pdf.y = below;
    }
  };

  write(doc.name || "Resume", BOLD, size.name, style.accent, { align: headerAlign });
  if (doc.headline) write(doc.headline, REGULAR, size.headline, "#333333", { align: headerAlign });
  if (doc.contact.length) write(doc.contact.join("  |  "), REGULAR, size.contact, "#333333", { align: headerAlign });

  for (const section of doc.sections) {
    pdf.y += style.sectionGap;
    // Keep a heading together with the start of its first entry.
    ensureSpace(size.heading + size.body * 4.5);
    pdf.x = left;
    write(section.title.toUpperCase(), BOLD, size.heading, style.accent, { characterSpacing: 0.4 });
    if (style.rule) {
      const ruleY = pdf.y + 1;
      pdf.moveTo(left, ruleY).lineTo(left + width, ruleY).lineWidth(0.7).strokeColor(style.rule).stroke();
      pdf.y = ruleY + 4;
    } else {
      pdf.y += 2;
    }

    if (section.paragraph) write(section.paragraph, REGULAR, size.body);

    section.entries.forEach((e, i) => {
      if (i > 0) pdf.y += style.entryGap;
      ensureSpace(size.body * 4);
      pdf.x = left;
      entryHeading(e, style.datesRight ? e.dates : "");
      const meta = style.datesRight ? e.meta : joinNonEmpty([e.dates, e.meta], "  |  ");
      if (meta) write(meta, REGULAR, size.meta, MUTED);
      pdf.y += size.body * 0.15;
      for (const bullet of e.bullets) {
        ensureSpace(size.body * 1.4);
        const y = pdf.y;
        pdf.font(REGULAR).fontSize(size.body).fillColor(INK).text("•", left + 4, y, { width: 10, lineBreak: false });
        pdf.text(pdfSafe(bullet), left + 16, y, { width: width - 16, lineGap: style.lineGap });
        pdf.x = left;
        pdf.y += size.body * 0.1;
      }
    });

    for (const line of section.lines) {
      ensureSpace(size.body * 1.4);
      pdf.x = left;
      const [label, rest] = splitLabel(line, section.key === "skills");
      if (label) {
        write(`${label}: `, BOLD, size.body, INK, { continued: true });
        write(rest, REGULAR, size.body);
      } else {
        write(line, REGULAR, size.body);
      }
      pdf.y += size.body * 0.1;
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
