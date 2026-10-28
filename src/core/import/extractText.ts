import path from "node:path";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

/** Plain text of an uploaded resume. Throws a user-facing message when it can't be read. */
export async function extractResumeText(fileName: string, data: Uint8Array): Promise<string> {
  if (data.byteLength > MAX_UPLOAD_BYTES) throw new Error("The file is larger than 10 MB.");
  const ext = path.extname(fileName).toLowerCase();

  let text: string;
  if (ext === ".pdf") {
    const parser = new PDFParse({ data });
    try {
      text = (await parser.getText()).text;
    } catch {
      throw new Error("This PDF could not be read. It may be damaged or password-protected.");
    } finally {
      await parser.destroy();
    }
  } else if (ext === ".docx") {
    try {
      text = (await mammoth.extractRawText({ buffer: Buffer.from(data) })).value;
    } catch {
      throw new Error("This Word file could not be read. Save it again as .docx and retry.");
    }
  } else if (ext === ".txt" || ext === ".md") {
    text = new TextDecoder().decode(data);
  } else if (ext === ".doc") {
    throw new Error("Old .doc files are not supported. Save it as .docx or PDF and upload that.");
  } else {
    throw new Error("Upload a PDF, DOCX, TXT or Markdown file.");
  }

  text = tidy(text);
  if (text.replace(/\s/g, "").length < 50) {
    throw new Error(
      "No text could be read from this file. If it is a scanned PDF (an image of a page), upload a DOCX or a text-based PDF instead.",
    );
  }
  return text;
}

function tidy(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/^-- \d+ of \d+ --$/gm, "") // page markers added by pdf-parse
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
