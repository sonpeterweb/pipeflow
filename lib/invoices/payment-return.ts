import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const invoiceIdSchema = z.guid();
const checkoutSessionIdSchema = z.string().regex(/^cs_test_/);

export type InvoicePaymentReturnState =
  | { kind: "confirmed"; invoiceNumber: string }
  | { kind: "not_found" }
  | { kind: "pending"; invoiceNumber: string };

export async function getInvoicePaymentReturnState({
  invoiceId,
  sessionId,
  supabase,
  userId,
}: {
  invoiceId: string | undefined;
  sessionId: string | undefined;
  supabase: SupabaseClient;
  userId: string;
}): Promise<InvoicePaymentReturnState> {
  const parsedInvoiceId = invoiceIdSchema.safeParse(invoiceId);
  const parsedSessionId = checkoutSessionIdSchema.safeParse(sessionId);

  if (!parsedInvoiceId.success || !parsedSessionId.success) {
    return { kind: "not_found" };
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "invoice_number,status,stripe_checkout_session_id,stripe_payment_intent_id",
    )
    .eq("id", parsedInvoiceId.data)
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return { kind: "not_found" };
  }

  const invoiceNumber = data.invoice_number ?? "Invoice";
  const confirmed =
    data.status === "paid" &&
    data.stripe_checkout_session_id === parsedSessionId.data &&
    Boolean(data.stripe_payment_intent_id);

  return confirmed
    ? { invoiceNumber, kind: "confirmed" }
    : { invoiceNumber, kind: "pending" };
}
