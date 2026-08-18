import type { SupabaseClient } from "@supabase/supabase-js";

export type DocumentParty = {
  address: string | null;
  companyName: string | null;
  email: string | null;
  name: string;
  phone: string | null;
};

export type DocumentJob = {
  address: string | null;
  description: string | null;
  title: string;
};

type BusinessIdentity = {
  companyName: string;
  email: string | null;
  ownerName: string | null;
};

type BaseDocumentModel = {
  amount: number;
  business: BusinessIdentity;
  customer: DocumentParty | null;
  id: string;
  job: DocumentJob | null;
  number: string | null;
  status: string;
};

export type QuoteDocumentModel = BaseDocumentModel & {
  acceptedAt: string | null;
  issuedAt: string | null;
  kind: "quote";
};

export type InvoiceDocumentModel = BaseDocumentModel & {
  dueAt: string | null;
  issuedAt: string | null;
  kind: "invoice";
  paidAt: string | null;
  sourceQuoteNumber: string | null;
};

export type BusinessDocumentModel = QuoteDocumentModel | InvoiceDocumentModel;

export type DocumentFetchResult =
  | { kind: "found"; document: BusinessDocumentModel }
  | { kind: "not_found" }
  | { kind: "error"; error: unknown };

type ProfileRow = {
  company_name: string | null;
  email: string | null;
  full_name: string | null;
};

type CustomerRow = {
  address: string | null;
  company_name: string | null;
  email: string | null;
  name: string;
  phone: string | null;
};

type JobRow = {
  address: string | null;
  description: string | null;
  title: string;
};

type QuoteRow = {
  accepted_at: string | null;
  amount: number | string;
  customer_id: string | null;
  id: string;
  issued_at: string | null;
  job_id: string | null;
  quote_number: string | null;
  status: string;
};

type InvoiceRow = {
  amount: number | string;
  customer_id: string | null;
  due_at: string | null;
  id: string;
  invoice_number: string | null;
  issued_at: string | null;
  job_id: string | null;
  paid_at: string | null;
  quote_id: string | null;
  status: string;
};

type RelatedRows = {
  customer: CustomerRow | null;
  job: JobRow | null;
  profile: ProfileRow | null;
  sourceQuoteNumber: string | null;
};

function normalizeAmount(value: number | string) {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function mapCustomer(customer: CustomerRow | null): DocumentParty | null {
  if (!customer) {
    return null;
  }

  return {
    address: customer.address,
    companyName: customer.company_name,
    email: customer.email,
    name: customer.name,
    phone: customer.phone,
  };
}

function mapJob(job: JobRow | null): DocumentJob | null {
  if (!job) {
    return null;
  }

  return {
    address: job.address,
    description: job.description,
    title: job.title,
  };
}

function mapBusiness(
  profile: ProfileRow | null,
  userEmail: string | null,
): BusinessIdentity {
  return {
    companyName: profile?.company_name?.trim() || "PipeFlow",
    email: profile?.email?.trim() || userEmail,
    ownerName: profile?.full_name?.trim() || null,
  };
}

async function fetchRelatedRows({
  customerId,
  jobId,
  sourceQuoteId,
  supabase,
  userId,
}: {
  customerId: string | null;
  jobId: string | null;
  sourceQuoteId?: string | null;
  supabase: SupabaseClient;
  userId: string;
}): Promise<{ data: RelatedRows | null; error: unknown }> {
  const [profileResult, customerResult, jobResult, sourceQuoteResult] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("company_name,full_name,email")
        .eq("id", userId)
        .maybeSingle(),
      customerId
        ? supabase
            .from("customers")
            .select("name,company_name,email,phone,address")
            .eq("id", customerId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      jobId
        ? supabase
            .from("jobs")
            .select("title,description,address")
            .eq("id", jobId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      sourceQuoteId
        ? supabase
            .from("quotes")
            .select("quote_number")
            .eq("id", sourceQuoteId)
            .eq("user_id", userId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
  const error =
    profileResult.error ??
    customerResult.error ??
    jobResult.error ??
    sourceQuoteResult.error;

  if (error) {
    return { data: null, error };
  }

  const sourceQuote = sourceQuoteResult.data as {
    quote_number: string | null;
  } | null;

  return {
    data: {
      customer: customerResult.data as CustomerRow | null,
      job: jobResult.data as JobRow | null,
      profile: profileResult.data as ProfileRow | null,
      sourceQuoteNumber: sourceQuote?.quote_number ?? null,
    },
    error: null,
  };
}

export async function fetchQuoteDocument({
  documentId,
  supabase,
  userEmail,
  userId,
}: {
  documentId: string;
  supabase: SupabaseClient;
  userEmail: string | null;
  userId: string;
}): Promise<DocumentFetchResult> {
  const { data, error } = await supabase
    .from("quotes")
    .select(
      "id,quote_number,customer_id,job_id,amount,status,issued_at,accepted_at",
    )
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { kind: "error", error };
  }

  if (!data) {
    return { kind: "not_found" };
  }

  const quote = data as QuoteRow;
  const related = await fetchRelatedRows({
    customerId: quote.customer_id,
    jobId: quote.job_id,
    supabase,
    userId,
  });

  if (related.error || !related.data) {
    return { kind: "error", error: related.error };
  }

  return {
    kind: "found",
    document: {
      acceptedAt: quote.accepted_at,
      amount: normalizeAmount(quote.amount),
      business: mapBusiness(related.data.profile, userEmail),
      customer: mapCustomer(related.data.customer),
      id: quote.id,
      issuedAt: quote.issued_at,
      job: mapJob(related.data.job),
      kind: "quote",
      number: quote.quote_number,
      status: quote.status,
    },
  };
}

export async function fetchInvoiceDocument({
  documentId,
  supabase,
  userEmail,
  userId,
}: {
  documentId: string;
  supabase: SupabaseClient;
  userEmail: string | null;
  userId: string;
}): Promise<DocumentFetchResult> {
  const { data, error } = await supabase
    .from("invoices")
    .select(
      "id,invoice_number,customer_id,job_id,quote_id,amount,status,issued_at,due_at,paid_at",
    )
    .eq("id", documentId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { kind: "error", error };
  }

  if (!data) {
    return { kind: "not_found" };
  }

  const invoice = data as InvoiceRow;
  const related = await fetchRelatedRows({
    customerId: invoice.customer_id,
    jobId: invoice.job_id,
    sourceQuoteId: invoice.quote_id,
    supabase,
    userId,
  });

  if (related.error || !related.data) {
    return { kind: "error", error: related.error };
  }

  return {
    kind: "found",
    document: {
      amount: normalizeAmount(invoice.amount),
      business: mapBusiness(related.data.profile, userEmail),
      customer: mapCustomer(related.data.customer),
      dueAt: invoice.due_at,
      id: invoice.id,
      issuedAt: invoice.issued_at,
      job: mapJob(related.data.job),
      kind: "invoice",
      number: invoice.invoice_number,
      paidAt: invoice.paid_at,
      sourceQuoteNumber: related.data.sourceQuoteNumber,
      status: invoice.status,
    },
  };
}
