import { renderHtml } from "@/core/render/html";
import { getResume } from "@/core/store/resumeStore";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const record = getResume((await params).id);
  if (!record) return new Response("Not found", { status: 404 });
  return new Response(renderHtml(record.document), {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}
