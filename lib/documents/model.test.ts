import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  fetchInvoiceDocument,
  fetchQuoteDocument,
} from "@/lib/documents/model";

const documentId = "30000000-0000-0000-0000-000000000009";
const userId = "70000000-0000-4000-8000-000000000001";

type QueryResponse = { data: unknown; error: unknown };

function createSupabaseMock(responses: Record<string, QueryResponse[]>) {
  const filters: Record<string, Array<[string, unknown]>> = {};
  const queues = Object.fromEntries(
    Object.entries(responses).map(([table, values]) => [table, [...values]]),
  );
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => {
      const tableFilters = (filters[table] ??= []);
      const response = queues[table]?.shift() ?? { data: null, error: null };
      const query = {
        eq: vi.fn((column: string, value: unknown) => {
          tableFilters.push([column, value]);
          return query;
        }),
        maybeSingle: vi.fn().mockResolvedValue(response),
      };

      return query;
    }),
  }));

  return {
    filters,
    from,
    supabase: { from } as unknown as SupabaseClient,
  };
}

describe("PDF document data mapping", () => {
  it("maps an owned quote and its owned relationships from server data", async () => {
    const mock = createSupabaseMock({
      customers: [
        {
          data: {
            address: "15 Millhouse Drive, Howick",
            company_name: null,
            email: "dan@example.co.nz",
            name: "Daniel Roberts",
            phone: "021 692 014",
          },
          error: null,
        },
      ],
      jobs: [
        {
          data: {
            address: "15 Millhouse Drive, Howick",
            description: "Replace the failed hot water cylinder element.",
            title: "Hot Water Cylinder Fault",
          },
          error: null,
        },
      ],
      profiles: [
        {
          data: {
            company_name: "Harbour Plumbing Ltd",
            email: "demo@pipeflow.app",
            full_name: "Sarah McKenzie",
          },
          error: null,
        },
      ],
      quotes: [
        {
          data: {
            accepted_at: "2026-08-18T02:00:00.000Z",
            amount: "2450.50",
            customer_id: "customer-id",
            id: documentId,
            issued_at: "2026-08-15T02:00:00.000Z",
            job_id: "job-id",
            quote_number: "Q-1050",
            status: "accepted",
          },
          error: null,
        },
      ],
    });

    const result = await fetchQuoteDocument({
      documentId,
      supabase: mock.supabase,
      userEmail: "owner@example.co.nz",
      userId,
    });

    expect(result).toEqual({
      kind: "found",
      document: {
        acceptedAt: "2026-08-18T02:00:00.000Z",
        amount: 2450.5,
        business: {
          companyName: "Harbour Plumbing Ltd",
          email: "demo@pipeflow.app",
          ownerName: "Sarah McKenzie",
        },
        customer: {
          address: "15 Millhouse Drive, Howick",
          companyName: null,
          email: "dan@example.co.nz",
          name: "Daniel Roberts",
          phone: "021 692 014",
        },
        id: documentId,
        issuedAt: "2026-08-15T02:00:00.000Z",
        job: {
          address: "15 Millhouse Drive, Howick",
          description: "Replace the failed hot water cylinder element.",
          title: "Hot Water Cylinder Fault",
        },
        kind: "quote",
        number: "Q-1050",
        status: "accepted",
      },
    });
    expect(mock.filters.quotes).toEqual([
      ["id", documentId],
      ["user_id", userId],
    ]);
    expect(mock.filters.customers).toContainEqual(["user_id", userId]);
    expect(mock.filters.jobs).toContainEqual(["user_id", userId]);
    expect(mock.filters.profiles).toContainEqual(["id", userId]);
  });

  it("maps invoice dates, payment state, and its owned source quote", async () => {
    const mock = createSupabaseMock({
      customers: [{ data: null, error: null }],
      invoices: [
        {
          data: {
            amount: 720,
            customer_id: "customer-id",
            due_at: "2026-09-01T02:00:00.000Z",
            id: documentId,
            invoice_number: "INV-1044",
            issued_at: "2026-08-18T02:00:00.000Z",
            job_id: null,
            paid_at: null,
            quote_id: "source-quote-id",
            status: "draft",
          },
          error: null,
        },
      ],
      profiles: [{ data: null, error: null }],
      quotes: [{ data: { quote_number: "Q-1050" }, error: null }],
    });

    const result = await fetchInvoiceDocument({
      documentId,
      supabase: mock.supabase,
      userEmail: "owner@example.co.nz",
      userId,
    });

    expect(result.kind).toBe("found");
    if (result.kind !== "found" || result.document.kind !== "invoice") {
      throw new Error("Expected an invoice document.");
    }
    expect(result.document).toMatchObject({
      amount: 720,
      business: {
        companyName: "PipeFlow",
        email: "owner@example.co.nz",
      },
      customer: null,
      dueAt: "2026-09-01T02:00:00.000Z",
      kind: "invoice",
      paidAt: null,
      sourceQuoteNumber: "Q-1050",
      status: "draft",
    });
    expect(mock.filters.invoices).toContainEqual(["user_id", userId]);
    expect(mock.filters.quotes).toContainEqual(["user_id", userId]);
    expect(mock.from).not.toHaveBeenCalledWith("jobs");
  });

  it("returns the same safe result for a missing or inaccessible document", async () => {
    const mock = createSupabaseMock({
      quotes: [{ data: null, error: null }],
    });

    await expect(
      fetchQuoteDocument({
        documentId,
        supabase: mock.supabase,
        userEmail: null,
        userId,
      }),
    ).resolves.toEqual({ kind: "not_found" });
    expect(mock.filters.quotes).toContainEqual(["user_id", userId]);
    expect(mock.from).toHaveBeenCalledTimes(1);
  });

  it("returns related-record query failures without exposing them", async () => {
    const internalError = new Error("private database detail");
    const mock = createSupabaseMock({
      profiles: [{ data: null, error: internalError }],
      quotes: [
        {
          data: {
            accepted_at: null,
            amount: 100,
            customer_id: null,
            id: documentId,
            issued_at: null,
            job_id: null,
            quote_number: null,
            status: "draft",
          },
          error: null,
        },
      ],
    });

    await expect(
      fetchQuoteDocument({
        documentId,
        supabase: mock.supabase,
        userEmail: null,
        userId,
      }),
    ).resolves.toEqual({ kind: "error", error: internalError });
  });
});
