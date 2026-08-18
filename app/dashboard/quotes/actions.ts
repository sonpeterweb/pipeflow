"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  getSafeMutationErrorMessage,
  logServerActionError,
  redirectWithFeedback,
  type FeedbackType,
} from "@/lib/actions/action-result";
import {
  getQuoteValidationMessage,
  parseQuoteFormData,
} from "@/lib/quotes/validation";
import {
  convertAcceptedQuoteToInvoice,
  type QuoteToInvoiceResult,
} from "@/lib/quotes/convert-to-invoice";
import {
  demoDeleteDisabledMessage,
  isDemoUser,
} from "@/lib/auth/is-demo-user";
import { createClient } from "@/lib/supabase/server";

const quotesPath = "/dashboard/quotes";
const invoicesPath = "/dashboard/invoices";
const dashboardPath = "/dashboard";

function redirectWithMessage(type: FeedbackType, message: string): never {
  redirectWithFeedback(quotesPath, type, message);
}

async function getAuthenticatedUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createQuote(formData: FormData) {
  const parsed = parseQuoteFormData(formData);

  if (!parsed.success) {
    redirectWithMessage("error", getQuoteValidationMessage(parsed.error));
  }

  const { supabase, user } = await getAuthenticatedUserId();
  const { error } = await supabase.from("quotes").insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) {
    logServerActionError("createQuote", error);
    redirectWithMessage("error", getSafeMutationErrorMessage("create quote"));
  }

  revalidatePath(quotesPath);
  redirectWithMessage("success", "Quote created successfully.");
}

export async function updateQuote(quoteId: string, formData: FormData) {
  const parsed = parseQuoteFormData(formData);

  if (!parsed.success) {
    redirectWithMessage("error", getQuoteValidationMessage(parsed.error));
  }

  const { supabase, user } = await getAuthenticatedUserId();
  const { error } = await supabase
    .from("quotes")
    .update(parsed.data)
    .eq("id", quoteId)
    .eq("user_id", user.id);

  if (error) {
    logServerActionError("updateQuote", error);
    redirectWithMessage("error", getSafeMutationErrorMessage("update quote"));
  }

  revalidatePath(quotesPath);
  redirectWithMessage("success", "Quote updated.");
}

export async function deleteQuote(quoteId: string) {
  const { supabase, user } = await getAuthenticatedUserId();

  if (isDemoUser(user)) {
    redirectWithMessage("warning", demoDeleteDisabledMessage);
  }

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", quoteId)
    .eq("user_id", user.id);

  if (error) {
    logServerActionError("deleteQuote", error);
    redirectWithMessage("error", getSafeMutationErrorMessage("delete quote"));
  }

  revalidatePath(quotesPath);
  redirectWithMessage("success", "Quote deleted.");
}

export async function convertQuoteToInvoice(quoteId: string) {
  const { supabase, user } = await getAuthenticatedUserId();
  let result: QuoteToInvoiceResult;

  try {
    result = await convertAcceptedQuoteToInvoice({
      quoteId,
      supabase,
      userId: user.id,
    });
  } catch (error) {
    result = { kind: "error", error };
  }

  if (result.kind === "not_found") {
    redirectWithMessage("error", "Quote not found.");
  }

  if (result.kind === "ineligible") {
    redirectWithMessage(
      "warning",
      "Only accepted quotes can be converted to invoices.",
    );
  }

  if (result.kind === "error") {
    logServerActionError("convertQuoteToInvoice", result.error);
    redirectWithMessage(
      "error",
      "Unable to create invoice from quote. Please try again.",
    );
  }

  revalidatePath(quotesPath);
  revalidatePath(invoicesPath);
  revalidatePath(dashboardPath);

  if (result.kind === "duplicate") {
    redirectWithFeedback(
      invoicesPath,
      "warning",
      "An invoice already exists for this quote.",
    );
  }

  redirectWithFeedback(
    invoicesPath,
    "success",
    "Invoice created from quote.",
  );
}
