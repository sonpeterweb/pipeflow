import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import {
  fetchInvoiceDocument,
  fetchQuoteDocument,
  type BusinessDocumentModel,
} from "@/lib/documents/model";
import { renderBusinessDocumentPdf } from "@/lib/documents/renderer";

export type PdfDocumentKind = "invoice" | "quote";

const documentIdSchema = z.guid();
const privateHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, noarchive",
};

export function getPdfFilename(
  documentKind: PdfDocumentKind,
  documentNumber: string | null,
  documentId: string,
) {
  const safeReference = documentNumber
    ?.normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  const fallback = documentId.replace(/[^A-Za-z0-9]/g, "").slice(0, 12);

  return `${documentKind}-${safeReference || fallback || "document"}.pdf`;
}

export function createPrivateTextResponse(message: string, status: number) {
  return new Response(message, {
    headers: {
      ...privateHeaders,
      "Content-Type": "text/plain; charset=utf-8",
    },
    status,
  });
}

export async function createDocumentPdfResponse({
  documentId,
  documentKind,
  renderPdf = renderBusinessDocumentPdf,
  supabase,
  userEmail,
  userId,
}: {
  documentId: string;
  documentKind: PdfDocumentKind;
  renderPdf?: (document: BusinessDocumentModel) => Promise<Uint8Array>;
  supabase: SupabaseClient;
  userEmail: string | null;
  userId: string;
}) {
  if (!documentIdSchema.safeParse(documentId).success) {
    return createPrivateTextResponse("Document not found.", 404);
  }

  const result = await (documentKind === "quote"
    ? fetchQuoteDocument({ documentId, supabase, userEmail, userId })
    : fetchInvoiceDocument({ documentId, supabase, userEmail, userId }));

  if (result.kind === "not_found") {
    return createPrivateTextResponse("Document not found.", 404);
  }

  if (result.kind === "error") {
    throw result.error;
  }

  const pdf = await renderPdf(result.document);
  const filename = getPdfFilename(
    documentKind,
    result.document.number,
    documentId,
  );
  const responseBody = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(responseBody).set(pdf);

  return new Response(responseBody, {
    headers: {
      ...privateHeaders,
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(pdf.byteLength),
      "Content-Type": "application/pdf",
    },
    status: 200,
  });
}
