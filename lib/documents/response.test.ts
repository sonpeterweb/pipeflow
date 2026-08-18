import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import {
  createDocumentPdfResponse,
  getPdfFilename,
} from "@/lib/documents/response";

const documentId = "30000000-0000-0000-0000-000000000009";
const userId = "70000000-0000-4000-8000-000000000001";
const pdfBytes = new TextEncoder().encode("%PDF-1.7\nPipeFlow\n%%EOF");

type QueryResponse = { data: unknown; error: unknown };

function createSupabaseMock(responses: Record<string, QueryResponse[]>) {
  const filters: Record<string, Array<[string, unknown]>> = {};
  const queues = Object.fromEntries(
    Object.entries(responses).map(([table, values]) => [table, [...values]]),
  );
  const from = vi.fn((table: string) => ({
    select: vi.fn(() => {
      const response = queues[table]?.shift() ?? { data: null, error: null };
      const query = {
        eq: vi.fn((column: string, value: unknown) => {
          (filters[table] ??= []).push([column, value]);
          return query;
        }),
        maybeSingle: vi.fn().mockResolvedValue(response),
      };
      return query;
    }),
  }));

  return {
    filters,
    supabase: { from } as unknown as SupabaseClient,
  };
}

function createBaseResponses(
  table: "invoices" | "quotes",
  document: Record<string, unknown> | null,
) {
  return {
    [table]: [{ data: document, error: null }],
    profiles: [{ data: null, error: null }],
  };
}

describe("document PDF responses", () => {
  it("returns an owned quote as a private PDF with a safe filename", async () => {
    const mock = createSupabaseMock(
      createBaseResponses("quotes", {
        accepted_at: null,
        amount: 1200,
        customer_id: null,
        id: documentId,
        issued_at: "2026-08-18T02:00:00.000Z",
        job_id: null,
        quote_number: "Q-1050",
        status: "sent",
      }),
    );
    const renderPdf = vi.fn().mockResolvedValue(pdfBytes);

    const response = await createDocumentPdfResponse({
      documentId,
      documentKind: "quote",
      renderPdf,
      supabase: mock.supabase,
      userEmail: "owner@example.co.nz",
      userId,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="quote-Q-1050.pdf"',
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(
      new TextDecoder().decode(await response.arrayBuffer()),
    ).toMatch(/^%PDF-/);
    expect(renderPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1200,
        kind: "quote",
        number: "Q-1050",
        status: "sent",
      }),
    );
    expect(mock.filters.quotes).toContainEqual(["user_id", userId]);
  });

  it("returns an owned invoice using only server-fetched invoice values", async () => {
    const mock = createSupabaseMock(
      createBaseResponses("invoices", {
        amount: "499.95",
        customer_id: null,
        due_at: "2026-09-01T02:00:00.000Z",
        id: documentId,
        invoice_number: "INV-1044",
        issued_at: "2026-08-18T02:00:00.000Z",
        job_id: null,
        paid_at: null,
        quote_id: null,
        status: "draft",
      }),
    );
    const renderPdf = vi.fn().mockResolvedValue(pdfBytes);

    const response = await createDocumentPdfResponse({
      documentId,
      documentKind: "invoice",
      renderPdf,
      supabase: mock.supabase,
      userEmail: null,
      userId,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="invoice-INV-1044.pdf"',
    );
    expect(renderPdf).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 499.95,
        kind: "invoice",
        paidAt: null,
        status: "draft",
      }),
    );
    expect(mock.filters.invoices).toContainEqual(["user_id", userId]);
  });

  it("uses the same safe 404 for invalid, missing, and inaccessible ids", async () => {
    const invalidMock = createSupabaseMock({});
    const missingMock = createSupabaseMock(
      createBaseResponses("quotes", null),
    );

    const invalid = await createDocumentPdfResponse({
      documentId: "not-a-guid",
      documentKind: "quote",
      supabase: invalidMock.supabase,
      userEmail: null,
      userId,
    });
    const missing = await createDocumentPdfResponse({
      documentId,
      documentKind: "quote",
      supabase: missingMock.supabase,
      userEmail: null,
      userId,
    });

    expect(invalid.status).toBe(404);
    expect(missing.status).toBe(404);
    await expect(invalid.text()).resolves.toBe("Document not found.");
    await expect(missing.text()).resolves.toBe("Document not found.");
    expect(missingMock.filters.quotes).toContainEqual(["user_id", userId]);
  });

  it("sanitizes hostile document numbers before using them in headers", () => {
    expect(
      getPdfFilename("invoice", '../../INV 10\r\nX-Evil: yes', documentId),
    ).toBe("invoice-INV-10-X-Evil-yes.pdf");
    expect(getPdfFilename("quote", null, documentId)).toBe(
      "quote-300000000000.pdf",
    );
  });
});
