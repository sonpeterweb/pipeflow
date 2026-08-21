import { XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export default async function InvoicePaymentCancelledPage({
  searchParams,
}: {
  searchParams: Promise<{ invoice_id?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const parsedInvoiceId = z.guid().safeParse(params.invoice_id);
  const { data: invoice } = parsedInvoiceId.success
    ? await supabase
        .from("invoices")
        .select("invoice_number")
        .eq("id", parsedInvoiceId.data)
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };
  const invoiceHref = invoice?.invoice_number
    ? `/dashboard/invoices?q=${encodeURIComponent(invoice.invoice_number)}`
    : "/dashboard/invoices";

  return (
    <section className="mx-auto max-w-2xl py-8 sm:py-12">
      <Card>
        <CardHeader>
          <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <XCircle aria-hidden="true" className="size-6" />
          </div>
          <CardTitle>Payment cancelled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-4">
          <p className="leading-7 text-slate-600 dark:text-slate-400">
            Payment was cancelled. The invoice has not been marked as paid.
          </p>
          <Link className={buttonVariants()} href={invoiceHref}>
            Back to invoice and retry
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
