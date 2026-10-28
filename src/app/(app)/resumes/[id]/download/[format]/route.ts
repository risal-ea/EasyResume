import { readFile } from "node:fs/promises";
import type { ResumeFormat } from "@/core/resume/types";
import { getResume, resumeFilePath } from "@/core/store/resumeStore";

export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<ResumeFormat, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  md: "text/markdown; charset=utf-8",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string; format: string }> }) {
  const { id, format } = await params;
  const record = getResume(id);
  if (!record || !(format in CONTENT_TYPES)) return new Response("Not found", { status: 404 });

  const fileName = record.files[format as ResumeFormat];
  let data: Buffer;
  try {
    data = await readFile(resumeFilePath(record, format as ResumeFormat));
  } catch {
    return new Response("File missing. Ask your AI assistant to update the resume to re-create it.", { status: 404 });
  }
  // ASCII fallback plus RFC 5987 UTF-8 name, so names like "José" survive.
  const ascii = fileName.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").replace(/"/g, "");
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[format as ResumeFormat],
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
      "Cache-Control": "no-store",
    },
  });
}
