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
  getInvoiceValidationMessage,
  parseInvoiceFormData,
} from "@/lib/invoices/validation";
import { createOrReuseInvoiceCheckout } from "@/lib/invoices/payment";
import {
  demoDeleteDisabledMessage,
  isDemoUser,
} from "@/lib/auth/is-demo-user";
import { getTrustedAppUrl } from "@/lib/stripe/config";
import { getStripeClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";

const invoicesPath = "/dashboard/invoices";

function redirectWithMessage(type: FeedbackType, message: string): never {
  redirectWithFeedback(invoicesPath, type, message);
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

export async function createInvoice(formData: FormData) {
  const parsed = parseInvoiceFormData(formData);

  if (!parsed.success) {
    redirectWithMessage("error", getInvoiceValidationMessage(parsed.error));
  }

  const { supabase, user } = await getAuthenticatedUserId();
  const { error } = await supabase.from("invoices").insert({
    ...parsed.data,
    user_id: user.id,
  });

  if (error) {
    logServerActionError("createInvoice", error);
    redirectWithMessage("error", getSafeMutationErrorMessage("create invoice"));
  }

  revalidatePath(invoicesPath);
  redirectWithMessage("success", "Invoice created successfully.");
}

export async function updateInvoice(invoiceId: string, formData: FormData) {
  const parsed = parseInvoiceFormData(formData);

  if (!parsed.success) {
    redirectWithMessage("error", getInvoiceValidationMessage(parsed.error));
  }

  const { supabase, user } = await getAuthenticatedUserId();
  const { error } = await supabase
    .from("invoices")
    .update(parsed.data)
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    logServerActionError("updateInvoice", error);
    redirectWithMessage("error", getSafeMutationErrorMessage("update invoice"));
  }

  revalidatePath(invoicesPath);
  redirectWithMessage("success", "Invoice updated.");
}

export async function deleteInvoice(invoiceId: string) {
  const { supabase, user } = await getAuthenticatedUserId();

  if (isDemoUser(user)) {
    redirectWithMessage("warning", demoDeleteDisabledMessage);
  }

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", invoiceId)
    .eq("user_id", user.id);

  if (error) {
    logServerActionError("deleteInvoice", error);
    redirectWithMessage("error", getSafeMutationErrorMessage("delete invoice"));
  }

  revalidatePath(invoicesPath);
  redirectWithMessage("success", "Invoice deleted.");
}

export async function startInvoicePayment(invoiceId: string) {
  const { supabase, user } = await getAuthenticatedUserId();
  let result;

  try {
    result = await createOrReuseInvoiceCheckout({
      appUrl: getTrustedAppUrl(),
      invoiceId,
      stripe: getStripeClient(),
      supabase,
      userId: user.id,
    });
  } catch (error) {
    logServerActionError("startInvoicePayment", error);
    redirectWithMessage(
      "error",
      "Unable to open secure Checkout. Please try again.",
    );
  }

  if (result.kind === "error") {
    logServerActionError("startInvoicePayment", result.error);
    redirectWithMessage(
      "error",
      "Unable to open secure Checkout. Please try again.",
    );
  }

  if (result.kind === "not_found") {
    redirectWithMessage("error", "Invoice not found.");
  }

  if (result.kind === "already_paid") {
    redirectWithMessage("warning", "This invoice is already paid.");
  }

  if (result.kind === "ineligible") {
    redirectWithMessage(
      "warning",
      "Only sent or overdue invoices can be paid online.",
    );
  }

  if (result.kind === "invalid_amount") {
    redirectWithMessage(
      "warning",
      "Invoice amount must be between NZ$0.50 and NZ$999,999.99 for online payment.",
    );
  }

  revalidatePath(invoicesPath);
  redirect(result.url);
}
