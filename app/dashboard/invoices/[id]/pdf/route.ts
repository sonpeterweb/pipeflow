import { handleDocumentPdfRequest } from "@/lib/documents/route";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return handleDocumentPdfRequest({ documentId: id, documentKind: "invoice" });
}
