import { CheckCircle2, Clock3 } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvoicePaymentReturnState } from "@/lib/invoices/payment-return";
import { createClient } from "@/lib/supabase/server";

export default async function InvoicePaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_id?: string; session_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const state = await getInvoicePaymentReturnState({
    invoiceId: params.invoice_id,
    sessionId: params.session_id,
    supabase,
    userId: user.id,
  });

  const invoiceHref =
    state.kind === "not_found"
      ? "/dashboard/invoices"
      : `/dashboard/invoices?q=${encodeURIComponent(state.invoiceNumber)}`;

  return (
    <section className="mx-auto max-w-2xl py-8 sm:py-12">
      <Card>
        <CardHeader>
          <div
            className={`mb-3 flex size-12 items-center justify-center rounded-full ${
              state.kind === "confirmed"
                ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                : "bg-blue-100 text-brand-primary dark:bg-blue-950 dark:text-blue-300"
            }`}
          >
            {state.kind === "confirmed" ? (
              <CheckCircle2 aria-hidden="true" className="size-6" />
            ) : (
              <Clock3 aria-hidden="true" className="size-6" />
            )}
          </div>
          <CardTitle>
            {state.kind === "confirmed"
              ? "Payment confirmed"
              : state.kind === "pending"
                ? "Payment received"
                : "Invoice unavailable"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <p className="leading-7 text-slate-600 dark:text-slate-400">
            {state.kind === "confirmed"
              ? "Payment confirmed. The invoice is now marked as paid."
              : state.kind === "pending"
                ? "Payment received. Confirming invoice status... Refresh shortly if the invoice still shows as unpaid."
                : "We could not find that invoice in your workspace."}
          </p>
          <Link className={buttonVariants()} href={invoiceHref}>
            Back to invoice
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
