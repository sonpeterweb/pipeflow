import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard, Download, Plus, Receipt } from "lucide-react";

import {
  createInvoice,
  deleteInvoice,
  startInvoicePayment,
  updateInvoice,
} from "@/app/dashboard/invoices/actions";
import { ConfirmationDialog } from "@/components/feedback/confirmation-dialog";
import { SubmitButton } from "@/components/feedback/submit-button";
import { buttonVariants } from "@/components/ui/button";
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
import { invoiceStatuses } from "@/lib/invoices/validation";
import { payableInvoiceStatuses } from "@/lib/invoices/payment";
import { createClient } from "@/lib/supabase/server";

type Invoice = {
  id: string;
  invoice_number: string | null;
  customer_id: string | null;
  job_id: string | null;
  amount: number;
  status: (typeof invoiceStatuses)[number];
  issued_at: string | null;
  due_at: string | null;
  paid_at: string | null;
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

type InvoicesPageProps = {
  searchParams: Promise<{
    error?: string;
    q?: string;
    status?: string;
    success?: string;
  }>;
};

const statusLabels: Record<(typeof invoiceStatuses)[number], string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const statusTones: Record<
  (typeof invoiceStatuses)[number],
  "blue" | "green" | "amber" | "red" | "slate"
> = {
  cancelled: "red",
  draft: "slate",
  overdue: "red",
  paid: "green",
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

function invoiceMatchesSearch(
  invoice: Invoice,
  customersById: Map<string, CustomerOption>,
  jobsById: Map<string, JobOption>,
  query: string,
) {
  if (!query) {
    return true;
  }

  return [
    invoice.invoice_number,
    getCustomerName(invoice.customer_id, customersById),
    getJobTitle(invoice.job_id, jobsById),
    String(invoice.amount),
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
        {invoiceStatuses.map((status) => (
          <option key={status} value={status}>
            {statusLabels[status]}
          </option>
        ))}
      </Select>
    </Field>
  );
}

function InvoiceForm({
  action,
  customers,
  invoice,
  jobs,
  submitLabel,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customers: CustomerOption[];
  invoice?: Invoice;
  jobs: JobOption[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <TextField
        defaultValue={fieldValue(invoice?.invoice_number ?? null)}
        label="Invoice number"
        name="invoice_number"
      />
      <TextField
        defaultValue={invoice ? String(invoice.amount) : "0"}
        label="Amount"
        name="amount"
        required
        step="0.01"
        type="number"
      />
      <CustomerSelect customers={customers} defaultValue={invoice?.customer_id} />
      <JobSelect defaultValue={invoice?.job_id} jobs={jobs} />
      <StatusSelect defaultValue={invoice?.status} />
      <TextField
        defaultValue={formatDateTimeLocal(invoice?.issued_at ?? null)}
        label="Issued date"
        name="issued_at"
        type="datetime-local"
      />
      <TextField
        defaultValue={formatDateTimeLocal(invoice?.due_at ?? null)}
        label="Due date"
        name="due_at"
        type="datetime-local"
      />
      <TextField
        defaultValue={formatDateTimeLocal(invoice?.paid_at ?? null)}
        label="Paid date"
        name="paid_at"
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
      action={{ href: "#new-invoice", label: "Create invoice" }}
      icon={<Receipt aria-hidden="true" size={20} />}
      description="Create your first invoice and link it to a customer or job when needed."
      title="No invoices yet"
    />
  );
}

function InvoiceCard({
  customers,
  customersById,
  invoice,
  jobs,
  jobsById,
}: {
  customers: CustomerOption[];
  customersById: Map<string, CustomerOption>;
  invoice: Invoice;
  jobs: JobOption[];
  jobsById: Map<string, JobOption>;
}) {
  const updateInvoiceWithId = updateInvoice.bind(null, invoice.id);
  const deleteInvoiceWithId = deleteInvoice.bind(null, invoice.id);
  const startInvoicePaymentWithId = startInvoicePayment.bind(null, invoice.id);
  const invoiceTitle = invoice.invoice_number || "Untitled invoice";

  return (
    <RecordCard
      actions={
        <>
          {payableInvoiceStatuses.has(invoice.status) ? (
            <form action={startInvoicePaymentWithId}>
              <SubmitButton
                className="h-11 gap-2"
                pendingLabel="Opening Checkout..."
              >
                <CreditCard aria-hidden="true" className="size-4" />
                Pay Invoice
              </SubmitButton>
            </form>
          ) : null}
          <Link
            aria-label={`Download PDF for ${invoiceTitle}`}
            className={buttonVariants({
              className: "h-11 gap-2",
              variant: "outline",
            })}
            href={`/dashboard/invoices/${invoice.id}/pdf`}
            rel="noreferrer"
            target="_blank"
          >
            <Download aria-hidden="true" className="size-4" />
            Download PDF
          </Link>
        </>
      }
      eyebrow={
        <StatusBadge tone={statusTones[invoice.status]}>
          {statusLabels[invoice.status]}
        </StatusBadge>
      }
      meta={
        <>
          {getCustomerName(invoice.customer_id, customersById)} ·{" "}
          {getJobTitle(invoice.job_id, jobsById)}
        </>
      }
      title={invoiceTitle}
    >
      <DetailGrid>
        <DetailItem label="Amount" value={formatAmount(invoice.amount)} />
        <DetailItem label="Issued" value={formatDate(invoice.issued_at)} />
        <DetailItem label="Due" value={formatDate(invoice.due_at)} />
        <DetailItem label="Paid" value={formatDate(invoice.paid_at)} />
      </DetailGrid>

      <div className="mt-5 grid gap-4 border-t border-slate-200 dark:border-slate-800 pt-5">
        <ActionPanel>
          <ActionSummary>Edit invoice</ActionSummary>
          <div className="mt-4">
            <InvoiceForm
              action={updateInvoiceWithId}
              customers={customers}
              invoice={invoice}
              jobs={jobs}
              submitLabel="Save changes"
            />
          </div>
        </ActionPanel>

        <ActionPanel tone="danger">
          <ActionSummary tone="danger">Delete invoice</ActionSummary>
          <div className="mt-4">
            <p className="mb-3 text-sm text-red-700 dark:text-red-300">
              This permanently removes {invoiceTitle}.
            </p>
            <ConfirmationDialog
              action={deleteInvoiceWithId}
              confirmLabel="Delete invoice"
              description={`This will permanently delete ${invoiceTitle}. This action cannot be undone.`}
              title="Delete invoice?"
              triggerLabel="Delete invoice"
            />
          </div>
        </ActionPanel>
      </div>
    </RecordCard>
  );
}

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [invoicesResult, customersResult, jobsResult] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id,invoice_number,customer_id,job_id,amount,status,issued_at,due_at,paid_at,created_at",
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
  ]);

  const invoices = (invoicesResult.data ?? []) as Invoice[];
  const customers = (customersResult.data ?? []) as CustomerOption[];
  const jobs = (jobsResult.data ?? []) as JobOption[];
  const customersById = new Map(customers.map((customer) => [customer.id, customer]));
  const jobsById = new Map(jobs.map((job) => [job.id, job]));
  const search = params.q ?? "";
  const normalizedSearch = normalize(search);
  const status =
    params.status &&
    invoiceStatuses.includes(params.status as (typeof invoiceStatuses)[number])
      ? (params.status as (typeof invoiceStatuses)[number])
      : "";
  const visibleInvoices = invoices.filter(
    (invoice) =>
      invoiceMatchesSearch(invoice, customersById, jobsById, normalizedSearch) &&
      (!status || invoice.status === status),
  );

  return (
    <section className="space-y-6">
      <CrudPageHeader
        action={
          <Link className={buttonVariants({ className: "gap-2" })} href="#new-invoice">
            <Plus aria-hidden="true" className="size-4" />
            New Invoice
          </Link>
        }
        description="Manage invoice drafts, sent balances, due dates, and paid status."
        eyebrow="Finance"
        title="Invoices"
      />

      <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
        Online invoice payments use Stripe test mode. No real charge will be
        made.
      </p>

      {invoicesResult.error ? (
        <Message
          message="Unable to load invoices. Refresh the page or try again shortly."
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

      <CardSection
        className="scroll-mt-6"
        description="Create a draft or sent invoice for a customer or job."
        title="Add invoice"
      >
        <div id="new-invoice">
          <InvoiceForm
            action={createInvoice}
            customers={customers}
            jobs={jobs}
            submitLabel="Create invoice"
          />
        </div>
      </CardSection>

      <CrudToolbar
        clearHref="/dashboard/invoices"
        resultLabel={`${visibleInvoices.length} of ${invoices.length} invoices shown`}
        search={search}
        searchPlaceholder="Search invoice number, customer, job, or amount"
        status={status}
        statusOptions={invoiceStatuses.map((invoiceStatus) => ({
          label: statusLabels[invoiceStatus],
          value: invoiceStatus,
        }))}
      />

      <div className="space-y-4">
        {visibleInvoices.length > 0 ? (
          visibleInvoices.map((invoice) => (
            <InvoiceCard
              customers={customers}
              customersById={customersById}
              invoice={invoice}
              jobs={jobs}
              jobsById={jobsById}
              key={invoice.id}
            />
          ))
        ) : invoices.length > 0 ? (
          <EmptyStateView
            description="Try clearing search or status filters to see all invoice records."
            title="No invoices match your filters"
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </section>
  );
}
