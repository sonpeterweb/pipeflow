import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { z } from "zod";

import {
  invoiceAmountToMinorUnits,
  invoicePaymentCurrency,
} from "@/lib/invoices/payment";

const checkoutMetadataSchema = z.object({
  invoice_id: z.guid(),
  user_id: z.guid(),
});

type WebhookInvoiceRow = {
  amount: number | string;
  paid_at: string | null;
  status: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
};

export type StripeWebhookResult =
  | { kind: "duplicate" }
  | { kind: "error"; error: unknown }
  | { kind: "ignored"; reason: string }
  | { kind: "processed" };

function getPaymentIntentId(session: Stripe.Checkout.Session) {
  if (typeof session.payment_intent === "string") {
    return session.payment_intent;
  }

  return session.payment_intent?.id ?? null;
}

export async function processStripeCheckoutCompleted({
  event,
  supabase,
}: {
  event: Stripe.Event;
  supabase: SupabaseClient;
}): Promise<StripeWebhookResult> {
  if (event.type !== "checkout.session.completed") {
    return { kind: "ignored", reason: "irrelevant_event" };
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = checkoutMetadataSchema.safeParse(session.metadata);
  const paymentIntentId = getPaymentIntentId(session);

  if (
    !metadata.success ||
    !session.id.startsWith("cs_test_") ||
    session.payment_status !== "paid" ||
    !paymentIntentId ||
    !session.currency ||
    session.amount_total === null
  ) {
    return { kind: "ignored", reason: "invalid_session" };
  }

  const { invoice_id: invoiceId, user_id: userId } = metadata.data;
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "amount,paid_at,status,stripe_checkout_session_id,stripe_payment_intent_id",
    )
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { error, kind: "error" };
  }

  if (!data) {
    return { kind: "ignored", reason: "invoice_not_found" };
  }

  const invoice = data as WebhookInvoiceRow;
  const expectedAmount = invoiceAmountToMinorUnits(invoice.amount);

  if (
    invoice.stripe_checkout_session_id !== session.id ||
    expectedAmount === null ||
    expectedAmount !== session.amount_total ||
    session.currency.toLowerCase() !== invoicePaymentCurrency
  ) {
    return { kind: "ignored", reason: "invoice_mismatch" };
  }

  if (invoice.status === "paid") {
    return invoice.stripe_payment_intent_id === paymentIntentId
      ? { kind: "duplicate" }
      : { kind: "ignored", reason: "conflicting_payment" };
  }

  const paidAt = new Date(event.created * 1000).toISOString();
  const { data: updated, error: updateError } = await supabase
    .from("invoices")
    .update({
      paid_at: paidAt,
      status: "paid",
      stripe_payment_intent_id: paymentIntentId,
    })
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .eq("amount", invoice.amount)
    .eq("stripe_checkout_session_id", session.id)
    .neq("status", "paid")
    .select("id")
    .maybeSingle();

  if (updateError) {
    return { error: updateError, kind: "error" };
  }

  if (updated) {
    return { kind: "processed" };
  }

  const { data: current, error: currentError } = await supabase
    .from("invoices")
    .select("status,stripe_payment_intent_id")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .maybeSingle();

  if (currentError) {
    return { error: currentError, kind: "error" };
  }

  return current?.status === "paid" &&
    current.stripe_payment_intent_id === paymentIntentId
    ? { kind: "duplicate" }
    : {
        error: new Error("Invoice changed before payment synchronization."),
        kind: "error",
      };
}
