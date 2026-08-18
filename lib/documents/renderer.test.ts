// @vitest-environment node

import { describe, expect, it } from "vitest";

import type { BusinessDocumentModel } from "@/lib/documents/model";
import {
  formatDocumentDate,
  formatDocumentMoney,
  renderBusinessDocumentPdf,
} from "@/lib/documents/renderer";

const baseDocument: BusinessDocumentModel = {
  acceptedAt: "2026-08-18T02:00:00.000Z",
  amount: 2450.5,
  business: {
    companyName: "Harbour Plumbing Ltd",
    email: "hello@harbourplumbing.co.nz",
    ownerName: "Sarah McKenzie",
  },
  customer: {
    address: "15 Millhouse Drive, Howick, Auckland 2014",
    companyName: null,
    email: "dan.roberts@example.co.nz",
    name: "Daniel Roberts",
    phone: "021 692 014",
  },
  id: "30000000-0000-0000-0000-000000000009",
  issuedAt: "2026-08-15T02:00:00.000Z",
  job: {
    address: "15 Millhouse Drive, Howick, Auckland 2014",
    description: "Replace the failed hot water cylinder element and test supply.",
    title: "Hot Water Cylinder Fault",
  },
  kind: "quote",
  number: "Q-1050",
  status: "accepted",
};

describe("business document PDF renderer", () => {
  it("creates a real A4 PDF for a quote", async () => {
    const pdf = await renderBusinessDocumentPdf(baseDocument);
    const source = new TextDecoder("latin1").decode(pdf);
    const signature = source.slice(0, 8);
    const pageCount = source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;

    expect(signature).toMatch(/^%PDF-/);
    expect(pdf.byteLength).toBeGreaterThan(5_000);
    expect(pageCount).toBe(1);
  });

  it("renders an invoice with missing optional relationships", async () => {
    const invoice: BusinessDocumentModel = {
      amount: 720,
      business: {
        companyName: "PipeFlow",
        email: null,
        ownerName: null,
      },
      customer: null,
      dueAt: null,
      id: "40000000-0000-0000-0000-000000000001",
      issuedAt: null,
      job: null,
      kind: "invoice",
      number: null,
      paidAt: null,
      sourceQuoteNumber: null,
      status: "draft",
    };

    const pdf = await renderBusinessDocumentPdf(invoice);

    expect(new TextDecoder("latin1").decode(pdf.slice(0, 8))).toMatch(/^%PDF-/);
  });

  it("adds pages rather than clipping very long content", async () => {
    const longDocument: BusinessDocumentModel = {
      ...baseDocument,
      customer: {
        ...baseDocument.customer!,
        name: "A very long customer name ".repeat(12),
      },
      job: {
        ...baseDocument.job!,
        description:
          "Long service description for predictable wrapping. ".repeat(350),
      },
    };

    const pdf = await renderBusinessDocumentPdf(longDocument);
    const source = new TextDecoder("latin1").decode(pdf);
    const pageCount = source.match(/\/Type\s*\/Page\b/g)?.length ?? 0;

    expect(pageCount).toBeGreaterThan(1);
  });

  it("formats NZ currency and dates without calculating new totals", () => {
    expect(formatDocumentMoney(2450.5).replace(/\s/g, " ")).toBe(
      "NZD 2,450.50",
    );
    expect(formatDocumentDate("2026-08-18T02:00:00.000Z")).toBe(
      "18 Aug 2026",
    );
    expect(formatDocumentDate(null)).toBe("Not set");
  });
});
