import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { z } from "zod";

export const invoicePaymentCurrency = "nzd";
export const invoicePaymentMinimumMinorUnits = 50;
export const invoicePaymentMaximumMinorUnits = 99_999_999;
export const payableInvoiceStatuses = new Set(["sent", "overdue"]);

const invoiceIdSchema = z.guid();

type InvoicePaymentRow = {
  amount: number | string;
  customers: { email: string | null } | { email: string | null }[] | null;
  invoice_number: string | null;
  status: string;
  stripe_checkout_session_id: string | null;
};

export type InvoiceCheckoutResult =
  | { kind: "already_paid" }
  | { kind: "error"; error: unknown }
  | { kind: "ineligible" }
  | { kind: "invalid_amount" }
  | { kind: "not_found" }
  | { kind: "redirect"; url: string };

export function invoiceAmountToMinorUnits(value: number | string) {
  const normalized = String(value).trim();
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(normalized);

  if (!match) {
    return null;
  }

  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const minorUnits = whole * 100 + fraction;

  return Number.isSafeInteger(minorUnits) ? minorUnits : null;
}

function getReturnUrls(appUrl: string, invoiceId: string) {
  const encodedInvoiceId = encodeURIComponent(invoiceId);

  return {
    cancelUrl: `${appUrl}/dashboard/invoices/payment/cancelled?invoice_id=${encodedInvoiceId}`,
    successUrl: `${appUrl}/dashboard/invoices/payment/success?invoice_id=${encodedInvoiceId}&session_id={CHECKOUT_SESSION_ID}`,
  };
}

function getCheckoutIdempotencyKey(
  invoiceId: string,
  previousSessionId: string | null,
) {
  return `pipeflow-invoice-${invoiceId}-${previousSessionId ?? "initial"}`;
}

function getCustomerEmail(
  customers: InvoicePaymentRow["customers"],
) {
  const customer = Array.isArray(customers) ? customers[0] : customers;
  const parsed = z.email().safeParse(customer?.email);

  return parsed.success ? parsed.data : null;
}

function isMissingStripeResource(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "resource_missing"
  );
}

function isStripeHostedCheckoutUrl(value: string | null): value is string {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "checkout.stripe.com";
  } catch {
    return false;
  }
}

async function getReusableSession(
  stripe: Stripe,
  sessionId: string,
  successUrl: string,
  amountMinorUnits: number,
  invoiceId: string,
  userId: string,
): Promise<string | null> {
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const matchesInvoice =
      session.amount_total === amountMinorUnits &&
      session.currency?.toLowerCase() === invoicePaymentCurrency &&
      session.client_reference_id === invoiceId &&
      session.metadata?.invoice_id === invoiceId &&
      session.metadata?.user_id === userId;

    if (
      session.status === "open" &&
      isStripeHostedCheckoutUrl(session.url) &&
      matchesInvoice
    ) {
      return session.url;
    }

    if (session.status === "complete" && matchesInvoice) {
      return successUrl.replace("{CHECKOUT_SESSION_ID}", session.id);
    }

    if (session.status === "open") {
      await stripe.checkout.sessions.expire(session.id);
    }

    return null;
  } catch (error) {
    if (isMissingStripeResource(error)) {
      return null;
    }

    throw error;
  }
}

export async function createOrReuseInvoiceCheckout({
  appUrl,
  invoiceId,
  stripe,
  supabase,
  userId,
}: {
  appUrl: string;
  invoiceId: string;
  stripe: Stripe;
  supabase: SupabaseClient;
  userId: string;
}): Promise<InvoiceCheckoutResult> {
  const parsedInvoiceId = invoiceIdSchema.safeParse(invoiceId);

  if (!parsedInvoiceId.success) {
    return { kind: "not_found" };
  }

  const { data, error } = await supabase
    .from("invoices")
    .select(
      "amount,invoice_number,status,stripe_checkout_session_id,customers(email)",
    )
    .eq("id", parsedInvoiceId.data)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { error, kind: "error" };
  }

  if (!data) {
    return { kind: "not_found" };
  }

  const invoice = data as InvoicePaymentRow;

  if (invoice.status === "paid") {
    return { kind: "already_paid" };
  }

  if (!payableInvoiceStatuses.has(invoice.status)) {
    return { kind: "ineligible" };
  }

  const amountMinorUnits = invoiceAmountToMinorUnits(invoice.amount);

  if (
    amountMinorUnits === null ||
    amountMinorUnits < invoicePaymentMinimumMinorUnits ||
    amountMinorUnits > invoicePaymentMaximumMinorUnits
  ) {
    return { kind: "invalid_amount" };
  }

  const { cancelUrl, successUrl } = getReturnUrls(appUrl, parsedInvoiceId.data);
  const customerEmail = getCustomerEmail(invoice.customers);

  try {
    if (invoice.stripe_checkout_session_id) {
      const reusableUrl = await getReusableSession(
        stripe,
        invoice.stripe_checkout_session_id,
        successUrl,
        amountMinorUnits,
        parsedInvoiceId.data,
        userId,
      );

      if (reusableUrl) {
        return { kind: "redirect", url: reusableUrl };
      }
    }

    const session = await stripe.checkout.sessions.create(
      {
        cancel_url: cancelUrl,
        client_reference_id: parsedInvoiceId.data,
        ...(customerEmail ? { customer_email: customerEmail } : {}),
        line_items: [
          {
            price_data: {
              currency: invoicePaymentCurrency,
              product_data: {
                name: `Invoice ${invoice.invoice_number ?? "payment"}`,
              },
              unit_amount: amountMinorUnits,
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoice_id: parsedInvoiceId.data,
          user_id: userId,
        },
        mode: "payment",
        payment_method_types: ["card"],
        success_url: successUrl,
      },
      {
        idempotencyKey: getCheckoutIdempotencyKey(
          parsedInvoiceId.data,
          invoice.stripe_checkout_session_id,
        ),
      },
    );

    if (
      !session.id.startsWith("cs_test_") ||
      !isStripeHostedCheckoutUrl(session.url)
    ) {
      return {
        error: new Error("Stripe returned an unusable test Checkout Session."),
        kind: "error",
      };
    }

    const { data: attached, error: attachError } = await supabase.rpc(
      "attach_invoice_checkout_session",
      {
        p_expected_session_id: invoice.stripe_checkout_session_id,
        p_invoice_id: parsedInvoiceId.data,
        p_new_session_id: session.id,
      },
    );

    if (attachError || attached !== true) {
      return {
        error:
          attachError ?? new Error("Checkout Session could not be attached."),
        kind: "error",
      };
    }

    return { kind: "redirect", url: session.url };
  } catch (checkoutError) {
    return { error: checkoutError, kind: "error" };
  }
}
