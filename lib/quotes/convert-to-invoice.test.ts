import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { convertAcceptedQuoteToInvoice } from "@/lib/quotes/convert-to-invoice";

const quoteId = "30000000-0000-0000-0000-000000000009";
const userId = "70000000-0000-4000-8000-000000000001";

type QueryResponse = {
  data: unknown;
  error: unknown;
};

function createQuery(response: QueryResponse, filters: Array<[string, unknown]>) {
  const query = {
    eq: vi.fn((column: string, value: unknown) => {
      filters.push([column, value]);
      return query;
    }),
    maybeSingle: vi.fn().mockResolvedValue(response),
  };

  return query;
}

function createSupabaseMock({
  existingInvoices = [{ data: null, error: null }],
  quote = {
    id: quoteId,
    customer_id: "10000000-0000-0000-0000-000000000006",
    job_id: "20000000-0000-0000-0000-000000000006",
    amount: 2450,
    status: "accepted",
  },
  quoteError = null,
  rpcResponse = {
    data: [
      {
        created_invoice_number: "INV-1044",
        invoice_id: "40000000-0000-4000-8000-000000000001",
        outcome: "created",
      },
    ],
    error: null,
  },
}: {
  existingInvoices?: QueryResponse[];
  quote?: Record<string, unknown> | null;
  quoteError?: unknown;
  rpcResponse?: QueryResponse;
} = {}) {
  const quoteFilters: Array<[string, unknown]> = [];
  const invoiceFilters: Array<[string, unknown]> = [];
  const lookupResponses = [...existingInvoices];
  const rpc = vi.fn().mockResolvedValue(rpcResponse);

  const from = vi.fn((table: string) => {
    if (table === "quotes") {
      return {
        select: vi.fn(() =>
          createQuery({ data: quote, error: quoteError }, quoteFilters),
        ),
      };
    }

    return {
      select: vi.fn(() =>
        createQuery(
          lookupResponses.shift() ?? { data: null, error: null },
          invoiceFilters,
        ),
      ),
    };
  });

  return {
    from,
    invoiceFilters,
    quoteFilters,
    rpc,
    supabase: { from, rpc } as unknown as SupabaseClient,
  };
}

describe("convertAcceptedQuoteToInvoice", () => {
  it("uses the atomic database workflow for an accepted owned quote", async () => {
    const quote = {
      id: quoteId,
      customer_id: "10000000-0000-0000-0000-000000000006",
      job_id: "20000000-0000-0000-0000-000000000006",
      amount: 2450,
      status: "accepted",
    };
    const mock = createSupabaseMock({ quote });

    const result = await convertAcceptedQuoteToInvoice({
      now: new Date("2026-08-18T02:00:00.000Z"),
      quoteId,
      supabase: mock.supabase,
      userId,
    });

    expect(result).toEqual({
      kind: "created",
      invoice: {
        id: "40000000-0000-4000-8000-000000000001",
        invoice_number: "INV-1044",
      },
    });
    expect(mock.quoteFilters).toEqual([
      ["id", quoteId],
      ["user_id", userId],
    ]);
    expect(mock.rpc).toHaveBeenCalledWith("convert_quote_to_invoice", {
      p_due_at: "2026-09-01T02:00:00.000Z",
      p_issued_at: "2026-08-18T02:00:00.000Z",
      p_quote_id: quoteId,
    });
    expect(quote.status).toBe("accepted");
  });

  it("rejects a non-accepted quote before invoking the workflow", async () => {
    const mock = createSupabaseMock({
      quote: {
        id: quoteId,
        customer_id: null,
        job_id: null,
        amount: 500,
        status: "sent",
      },
    });

    const result = await convertAcceptedQuoteToInvoice({
      quoteId,
      supabase: mock.supabase,
      userId,
    });

    expect(result).toEqual({ kind: "ineligible" });
    expect(mock.from).toHaveBeenCalledTimes(1);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("returns the same safe not-found result for missing or inaccessible quotes", async () => {
    const mock = createSupabaseMock({ quote: null });

    const result = await convertAcceptedQuoteToInvoice({
      quoteId,
      supabase: mock.supabase,
      userId,
    });

    expect(result).toEqual({ kind: "not_found" });
    expect(mock.quoteFilters).toContainEqual(["user_id", userId]);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("validates the quote id before querying the database", async () => {
    const mock = createSupabaseMock();

    const result = await convertAcceptedQuoteToInvoice({
      quoteId: "not-a-uuid",
      supabase: mock.supabase,
      userId,
    });

    expect(result).toEqual({ kind: "not_found" });
    expect(mock.from).not.toHaveBeenCalled();
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("prevents a duplicate before invoking the workflow when an invoice is linked", async () => {
    const invoice = {
      id: "40000000-0000-4000-8000-000000000007",
      invoice_number: "INV-1044",
    };
    const mock = createSupabaseMock({
      existingInvoices: [{ data: invoice, error: null }],
    });

    const result = await convertAcceptedQuoteToInvoice({
      quoteId,
      supabase: mock.supabase,
      userId,
    });

    expect(result).toEqual({ kind: "duplicate", invoice });
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it("maps an authoritative database duplicate outcome", async () => {
    const mock = createSupabaseMock({
      rpcResponse: {
        data: [
          {
            created_invoice_number: "INV-1044",
            invoice_id: "40000000-0000-4000-8000-000000000009",
            outcome: "duplicate",
          },
        ],
        error: null,
      },
    });

    const result = await convertAcceptedQuoteToInvoice({
      quoteId,
      supabase: mock.supabase,
      userId,
    });

    expect(result).toEqual({
      kind: "duplicate",
      invoice: {
        id: "40000000-0000-4000-8000-000000000009",
        invoice_number: "INV-1044",
      },
    });
  });

  it("maps database status and ownership outcomes safely", async () => {
    const ineligible = createSupabaseMock({
      rpcResponse: {
        data: [
          {
            created_invoice_number: null,
            invoice_id: null,
            outcome: "ineligible",
          },
        ],
        error: null,
      },
    });
    const missing = createSupabaseMock({
      rpcResponse: {
        data: [
          {
            created_invoice_number: null,
            invoice_id: null,
            outcome: "not_found",
          },
        ],
        error: null,
      },
    });

    await expect(
      convertAcceptedQuoteToInvoice({
        quoteId,
        supabase: ineligible.supabase,
        userId,
      }),
    ).resolves.toEqual({ kind: "ineligible" });
    await expect(
      convertAcceptedQuoteToInvoice({
        quoteId,
        supabase: missing.supabase,
        userId,
      }),
    ).resolves.toEqual({ kind: "not_found" });
  });

  it("maps a surfaced unique violation to the linked invoice", async () => {
    const racedInvoice = {
      id: "40000000-0000-4000-8000-000000000009",
      invoice_number: "INV-1044",
    };
    const mock = createSupabaseMock({
      existingInvoices: [
        { data: null, error: null },
        { data: racedInvoice, error: null },
      ],
      rpcResponse: {
        data: null,
        error: { code: "23505", message: "internal database detail" },
      },
    });

    const result = await convertAcceptedQuoteToInvoice({
      quoteId,
      supabase: mock.supabase,
      userId,
    });

    expect(result).toEqual({ kind: "duplicate", invoice: racedInvoice });
  });
});
