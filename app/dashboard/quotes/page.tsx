import { redirect } from "next/navigation";
import Link from "next/link";
import { Download, FileText, Plus } from "lucide-react";

import {
  createQuote,
  convertQuoteToInvoice,
  deleteQuote,
  updateQuote,
} from "@/app/dashboard/quotes/actions";
import { ConfirmationDialog } from "@/components/feedback/confirmation-dialog";
import { SubmitButton } from "@/components/feedback/submit-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { CardSection } from "@/components/ui/card";
import {
  ActionPanel,
  ActionSummary,
  CrudPageHeader,
  CrudToolbar,
  DetailGrid,
  DetailItem,
  RecordCard,
  StatusBadge,
} from "@/components/ui/crud";
import { EmptyState as EmptyStateView } from "@/components/ui/empty-state";
import { Field, FieldLabel, Input, Select } from "@/components/ui/form-controls";
import { quoteStatuses } from "@/lib/quotes/validation";
import { createClient } from "@/lib/supabase/server";

type Quote = {
  id: string;
  quote_number: string | null;
  customer_id: string | null;
  job_id: string | null;
  amount: number;
  status: (typeof quoteStatuses)[number];
  issued_at: string | null;
  accepted_at: string | null;
  created_at: string;
};

type CustomerOption = {
  id: string;
  name: string;
  company_name: string | null;
};

type JobOption = {
  id: string;
  title: string;
  customer_id: string | null;
};

type SourceInvoice = {
  id: string;
  invoice_number: string | null;
  quote_id: string;
};

type QuotesPageProps = {
  searchParams: Promise<{
    error?: string;
    q?: string;
    status?: string;
    success?: string;
  }>;
};

const statusLabels: Record<(typeof quoteStatuses)[number], string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  declined: "Declined",
  expired: "Expired",
};

const statusTones: Record<
  (typeof quoteStatuses)[number],
  "blue" | "green" | "amber" | "red" | "slate"
> = {
  accepted: "green",
  declined: "red",
  draft: "slate",
  expired: "amber",
  sent: "blue",
};

function fieldValue(value: string | null) {
  return value ?? "";
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not set";
  }

  return new Intl.DateTimeFormat("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDateTimeLocal(value: string | null) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 16);
}

function formatAmount(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    currency: "NZD",
    style: "currency",
  }).format(value);
}

function getCustomerName(
  customerId: string | null,
  customersById: Map<string, CustomerOption>,
) {
  if (!customerId) {
    return "No customer";
  }

  return customersById.get(customerId)?.name ?? "Customer unavailable";
}

function getJobTitle(jobId: string | null, jobsById: Map<string, JobOption>) {
  if (!jobId) {
    return "No job";
  }

  return jobsById.get(jobId)?.title ?? "Job unavailable";
}

function quoteMatchesSearch(
  quote: Quote,
  customersById: Map<string, CustomerOption>,
  jobsById: Map<string, JobOption>,
  query: string,
) {
  if (!query) {
    return true;
  }

  return [
    quote.quote_number,
    getCustomerName(quote.customer_id, customersById),
    getJobTitle(quote.job_id, jobsById),
    String(quote.amount),
  ].some((value) => normalize(value).includes(query));
}

function Message({
  message,
  tone,
}: {
  message: string;
  tone: "error" | "success";
}) {
  const classes =
    tone === "error"
      ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300"
      : "border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300";

  return (
    <p className={`rounded-lg border px-4 py-3 text-sm font-medium ${classes}`}>
      {message}
    </p>
  );
}

function TextField({
  defaultValue,
  label,
  name,
  required,
  step,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  required?: boolean;
  step?: string;
  type?: string;
}) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Input
        defaultValue={defaultValue}
        name={name}
        required={required}
        step={step}
        type={type}
      />
    </Field>
  );
}

function CustomerSelect({
  customers,
  defaultValue,
}: {
  customers: CustomerOption[];
  defaultValue?: string | null;
}) {
  return (
    <Field>
      <FieldLabel>Customer</FieldLabel>
      <Select
        defaultValue={defaultValue ?? ""}
        name="customer_id"
      >
        <option value="">No customer</option>
        {customers.map((customer) => (
          <option key={customer.id} value={customer.id}>
            {customer.company_name
              ? `${customer.name} (${customer.company_name})`
              : customer.name}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function JobSelect({
  defaultValue,
  jobs,
}: {
  defaultValue?: string | null;
  jobs: JobOption[];
}) {
  return (
    <Field>
      <FieldLabel>Job</FieldLabel>
      <Select
        defaultValue={defaultValue ?? ""}
        name="job_id"
      >
        <option value="">No job</option>
        {jobs.map((job) => (
          <option key={job.id} value={job.id}>
            {job.title}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function StatusSelect({ defaultValue }: { defaultValue?: string }) {
  return (
    <Field>
      <FieldLabel>Status</FieldLabel>
      <Select
        defaultValue={defaultValue ?? "draft"}
        name="status"
        required
      >
        {quoteStatuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function QuoteForm({
  action,
  customers,
  jobs,
  quote,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customers: CustomerOption[];
  jobs: JobOption[];
  quote?: Quote;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <TextField
        defaultValue={fieldValue(quote?.quote_number ?? null)}
        label="Quote number"
        name="quote_number"
      />
      <TextField
        defaultValue={quote ? String(quote.amount) : "0"}
        label="Amount"
        name="amount"
        required
        step="0.01"
        type="number"
      />
      <CustomerSelect customers={customers} defaultValue={quote?.customer_id} />
      <JobSelect defaultValue={quote?.job_id} jobs={jobs} />
      <StatusSelect defaultValue={quote?.status} />
      <TextField
        defaultValue={formatDateTimeLocal(quote?.issued_at ?? null)}
        label="Issued date"
        name="issued_at"
        type="datetime-local"
      />
      <TextField
        defaultValue={formatDateTimeLocal(quote?.accepted_at ?? null)}
        label="Accepted date"
        name="accepted_at"
        type="datetime-local"
      />
      <div className="sm:col-span-2">
        <SubmitButton pendingLabel={submitLabel.includes("Create") ? "Creating..." : "Saving..."}>
          {submitLabel}
        </SubmitButton>
      </div>
    </form>
  );
}

function EmptyState() {
  return (
    <EmptyStateView
      action={{ href: "#new-quote", label: "Create quote" }}
      icon={<FileText aria-hidden="true" size={20} />}
      description="Create your first quote and link it to a customer or job when needed."
      title="No quotes yet"
    />
  );
}

function QuoteCard({
  customers,
  customersById,
  jobs,
  jobsById,
  invoiceLinksAvailable,
  sourceInvoice,
  quote,
}: {
  customers: CustomerOption[];
  customersById: Map<string, CustomerOption>;
  jobs: JobOption[];
  jobsById: Map<string, JobOption>;
  invoiceLinksAvailable: boolean;
  sourceInvoice?: SourceInvoice;
  quote: Quote;
}) {
  const updateQuoteWithId = updateQuote.bind(null, quote.id);
  const deleteQuoteWithId = deleteQuote.bind(null, quote.id);
  const convertQuoteWithId = convertQuoteToInvoice.bind(null, quote.id);
  const quoteTitle = quote.quote_number || "Untitled quote";
  const invoiceHref = sourceInvoice?.invoice_number
    ? `/dashboard/invoices?q=${encodeURIComponent(sourceInvoice.invoice_number)}`
    : "/dashboard/invoices";

  return (
    <RecordCard
      actions={
        <>
          <Link
            aria-label={`Download PDF for ${quoteTitle}`}
            className={buttonVariants({
              className: "gap-2",
              variant: "outline",
            })}
            href={`/dashboard/quotes/${quote.id}/pdf`}
            rel="noreferrer"
            target="_blank"
          >
            <Download aria-hidden="true" className="size-4" />
            Download PDF
          </Link>
          {quote.status === "accepted" ? (
            !invoiceLinksAvailable ? (
              <Button disabled type="button" variant="outline">
                Invoice status unavailable
              </Button>
            ) : sourceInvoice ? (
              <Link
                className={buttonVariants({ variant: "outline" })}
                href={invoiceHref}
              >
                View Invoice
              </Link>
            ) : (
              <ConfirmationDialog
                action={convertQuoteWithId}
                confirmLabel="Create invoice"
                description="This will create a draft invoice using this quote’s customer, job, and amount details."
                pendingLabel="Creating invoice..."
                title="Create invoice from quote?"
                triggerLabel="Convert to Invoice"
                variant="primary"
              />
            )
          ) : null}
        </>
      }
      eyebrow={
        <StatusBadge tone={statusTones[quote.status]}>
          {statusLabels[quote.status]}
        </StatusBadge>
      }
      meta={
        <>
          {getCustomerName(quote.customer_id, customersById)} ·{" "}
          {getJobTitle(quote.job_id, jobsById)}
        </>
      }
      title={quoteTitle}
    >
      <DetailGrid>
        <DetailItem label="Amount" value={formatAmount(quote.amount)} />
        <DetailItem label="Issued" value={formatDate(quote.issued_at)} />
        <DetailItem label="Accepted" value={formatDate(quote.accepted_at)} />
      </DetailGrid>

      <div className="mt-5 grid gap-4 border-t border-slate-200 dark:border-slate-800 pt-5">
        <ActionPanel>
          <ActionSummary>Edit quote</ActionSummary>
          <div className="mt-4">
            <QuoteForm
              action={updateQuoteWithId}
              customers={customers}
              jobs={jobs}
              quote={quote}
              submitLabel="Save changes"
            />
          </div>
        </ActionPanel>

        <ActionPanel tone="danger">
          <ActionSummary tone="danger">Delete quote</ActionSummary>
          <div className="mt-4">
            <p className="mb-3 text-sm text-red-700 dark:text-red-300">
              This permanently removes {quoteTitle}.
            </p>
            <ConfirmationDialog
              action={deleteQuoteWithId}
              confirmLabel="Delete quote"
              description={`This will permanently delete ${quoteTitle}. This action cannot be undone.`}
              title="Delete quote?"
              triggerLabel="Delete quote"
            />
          </div>
        </ActionPanel>
      </div>
    </RecordCard>
  );
}

export default async function QuotesPage({ searchParams }: QuotesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [quotesResult, customersResult, jobsResult, invoiceLinksResult] =
    await Promise.all([
      supabase
        .from("quotes")
        .select(
          "id,quote_number,customer_id,job_id,amount,status,issued_at,accepted_at,created_at",
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("customers")
        .select("id,name,company_name")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("jobs")
        .select("id,title,customer_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("invoices")
        .select("id,invoice_number,quote_id")
        .eq("user_id", user.id)
        .not("quote_id", "is", null),
    ]);

  const quotes = (quotesResult.data ?? []) as Quote[];
  const customers = (customersResult.data ?? []) as CustomerOption[];
  const jobs = (jobsResult.data ?? []) as JobOption[];
  const sourceInvoices = (invoiceLinksResult.data ?? []) as SourceInvoice[];
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const invoicesByQuoteId = new Map(
    sourceInvoices.map((invoice) => [invoice.quote_id, invoice]),
  );
  const search = params.q ?? "";
  const normalizedSearch = normalize(search);
  const status =
    params.status && quoteStatuses.includes(params.status as (typeof quoteStatuses)[number])
      ? (params.status as (typeof quoteStatuses)[number])
      : "";
  const visibleQuotes = quotes.filter(
    (quote) =>
      quoteMatchesSearch(quote, customersById, jobsById, normalizedSearch) &&
      (!status || quote.status === status),
  );

  return (
    <section className="space-y-6">
      <CrudPageHeader
        action={
          <Link className={buttonVariants({ className: "gap-2" })} href="#new-quote">
            <Plus aria-hidden="true" className="size-4" />
            New Quote
          </Link>
        }
        description="Manage quote drafts, sent estimates, and acceptance status."
        eyebrow="Sales"
        title="Quotes"
      />

      {quotesResult.error ? (
        <Message
          message="Unable to load quotes. Refresh the page or try again shortly."
          tone="error"
        />
      ) : null}
      {customersResult.error ? (
        <Message
          message="Unable to load customer options. Refresh the page or try again shortly."
          tone="error"
        />
      ) : null}
      {jobsResult.error ? (
        <Message
          message="Unable to load job options. Refresh the page or try again shortly."
          tone="error"
        />
      ) : null}
      {invoiceLinksResult.error ? (
        <Message
          message="Unable to load quote invoice links. Invoice actions are temporarily unavailable."
          tone="error"
        />
      ) : null}

      <CardSection
        className="scroll-mt-6"
        description="Create a draft or sent estimate for a customer or job."
        title="Add quote"
      >
        <div id="new-quote">
          <QuoteForm
            action={createQuote}
            customers={customers}
            jobs={jobs}
            submitLabel="Create quote"
          />
        </div>
      </CardSection>

      <CrudToolbar
        clearHref="/dashboard/quotes"
        resultLabel={`${visibleQuotes.length} of ${quotes.length} quotes shown`}
        search={search}
        searchPlaceholder="Search quote number, customer, job, or amount"
        status={status}
        statusOptions={quoteStatuses.map((quoteStatus) => ({
          label: statusLabels[quoteStatus],
          value: quoteStatus,
        }))}
      />

      <div className="space-y-4">
        {visibleQuotes.length > 0 ? (
          visibleQuotes.map((quote) => (
            <QuoteCard
              customers={customers}
              customersById={customersById}
              jobs={jobs}
              jobsById={jobsById}
              invoiceLinksAvailable={!invoiceLinksResult.error}
              key={quote.id}
              quote={quote}
              sourceInvoice={invoicesByQuoteId.get(quote.id)}
            />
          ))
        ) : quotes.length > 0 ? (
          <EmptyStateView
            description="Try clearing search or status filters to see all quote records."
            title="No quotes match your filters"
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
