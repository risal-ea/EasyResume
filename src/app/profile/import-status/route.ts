import { getPendingImport, getUpload } from "@/core/store/importStore";

export const dynamic = "force-dynamic";

/** Polled by the import panel while it waits for the AI assistant to finish. */
export function GET() {
  const upload = getUpload();
  const pending = getPendingImport();
  return Response.json(
    { uploadedAt: upload?.uploadedAt ?? null, importedAt: pending?.importedAt ?? null },
    { headers: { "Cache-Control": "no-store" } },
  );
}
