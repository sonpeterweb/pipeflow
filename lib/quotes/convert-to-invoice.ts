import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { getDefaultInvoiceDates } from "@/lib/invoices/defaults";

type ExistingInvoice = {
  id: string;
  invoice_number: string | null;
};

type ConversionRpcRow = {
  created_invoice_number: string | null;
  invoice_id: string | null;
  outcome:
    | "created"
    | "duplicate"
    | "ineligible"
    | "not_found"
    | "unauthenticated";
};

export type QuoteToInvoiceResult =
  | { kind: "created"; invoice: ExistingInvoice }
  | { kind: "duplicate"; invoice: ExistingInvoice | null }
  | { kind: "ineligible" }
  | { kind: "not_found" }
  | { kind: "error"; error: unknown };

const quoteIdSchema = z.guid();

function isUniqueViolation(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

async function findExistingInvoice(
  supabase: SupabaseClient,
  userId: string,
  quoteId: string,
) {
  return supabase
    .from("invoices")
    .select("id,invoice_number")
    .eq("user_id", userId)
    .eq("quote_id", quoteId)
    .maybeSingle();
}

export async function convertAcceptedQuoteToInvoice({
  now = new Date(),
  quoteId,
  supabase,
  userId,
}: {
  now?: Date;
  quoteId: string;
  supabase: SupabaseClient;
  userId: string;
}): Promise<QuoteToInvoiceResult> {
  if (!quoteIdSchema.safeParse(quoteId).success) {
    return { kind: "not_found" };
  }

  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("id,customer_id,job_id,amount,status")
    .eq("id", quoteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (quoteError) {
    return { kind: "error", error: quoteError };
  }

  if (!quote) {
    return { kind: "not_found" };
  }

  if (quote.status !== "accepted") {
    return { kind: "ineligible" };
  }

  const { data: existingInvoice, error: existingInvoiceError } =
    await findExistingInvoice(supabase, userId, quoteId);

  if (existingInvoiceError) {
    return { kind: "error", error: existingInvoiceError };
  }

  if (existingInvoice) {
    return { kind: "duplicate", invoice: existingInvoice };
  }

  const { dueAt, issuedAt } = getDefaultInvoiceDates(now);
  const { data: conversionRows, error: conversionError } = await supabase.rpc(
    "convert_quote_to_invoice",
    {
      p_due_at: dueAt,
      p_issued_at: issuedAt,
      p_quote_id: quoteId,
    },
  );

  if (conversionError) {
    if (isUniqueViolation(conversionError)) {
      const { data: racedInvoice } = await findExistingInvoice(
        supabase,
        userId,
        quoteId,
      );

      return { kind: "duplicate", invoice: racedInvoice ?? null };
    }

    return { kind: "error", error: conversionError };
  }

  const conversion = (conversionRows?.[0] ?? null) as ConversionRpcRow | null;

  if (conversion?.outcome === "created" && conversion.invoice_id) {
    return {
      kind: "created",
      invoice: {
        id: conversion.invoice_id,
        invoice_number: conversion.created_invoice_number,
      },
    };
  }

  if (conversion?.outcome === "duplicate") {
    return {
      kind: "duplicate",
      invoice: conversion.invoice_id
        ? {
            id: conversion.invoice_id,
            invoice_number: conversion.created_invoice_number,
          }
        : null,
    };
  }

  if (conversion?.outcome === "ineligible") {
    return { kind: "ineligible" };
  }

  if (conversion?.outcome === "not_found") {
    return { kind: "not_found" };
  }

  if (!conversion || conversion.outcome === "unauthenticated") {
    return {
      kind: "error",
      error: new Error("Invoice conversion returned no usable result."),
    };
  }

  return {
    kind: "error",
    error: new Error("Invoice conversion returned an unknown outcome."),
  };
}
