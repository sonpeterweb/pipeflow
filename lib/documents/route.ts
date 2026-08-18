import { logServerActionError } from "@/lib/actions/action-result";
import {
  createDocumentPdfResponse,
  createPrivateTextResponse,
  type PdfDocumentKind,
} from "@/lib/documents/response";
import { createClient } from "@/lib/supabase/server";

export async function handleDocumentPdfRequest({
  documentId,
  documentKind,
}: {
  documentId: string;
  documentKind: PdfDocumentKind;
}) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return createPrivateTextResponse("Authentication required.", 401);
    }

    return await createDocumentPdfResponse({
      documentId,
      documentKind,
      supabase,
      userEmail: user.email ?? null,
      userId: user.id,
    });
  } catch (error) {
    logServerActionError(`${documentKind}Pdf`, error);
    return createPrivateTextResponse(
      "Unable to generate PDF. Please try again.",
      500,
    );
  }
}
