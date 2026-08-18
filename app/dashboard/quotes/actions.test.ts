import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  convertAcceptedQuoteToInvoice: vi.fn(),
  createClient: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/quotes/convert-to-invoice", () => ({
  convertAcceptedQuoteToInvoice: mocks.convertAcceptedQuoteToInvoice,
}));

import {
  convertQuoteToInvoice,
  deleteQuote,
} from "@/app/dashboard/quotes/actions";

const quoteId = "30000000-0000-0000-0000-000000000009";
const userId = "70000000-0000-4000-8000-000000000001";

function authenticatedClient(email = "owner@example.co.nz") {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: userId, email } },
      }),
    },
  };
}

describe("convertQuoteToInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEMO_USER_EMAIL;
    mocks.createClient.mockResolvedValue(authenticatedClient());
  });

  it("revalidates related pages and redirects success to invoices", async () => {
    mocks.convertAcceptedQuoteToInvoice.mockResolvedValue({
      kind: "created",
      invoice: { id: "invoice-id", invoice_number: "INV-1044" },
    });

    await expect(convertQuoteToInvoice(quoteId)).rejects.toThrow(
      "REDIRECT:/dashboard/invoices?success=Invoice%20created%20from%20quote.",
    );

    expect(mocks.convertAcceptedQuoteToInvoice).toHaveBeenCalledWith({
      quoteId,
      supabase: expect.any(Object),
      userId,
    });
    expect(mocks.revalidatePath.mock.calls).toEqual([
      ["/dashboard/quotes"],
      ["/dashboard/invoices"],
      ["/dashboard"],
    ]);
  });

  it("redirects a duplicate warning to the invoice list", async () => {
    mocks.convertAcceptedQuoteToInvoice.mockResolvedValue({
      kind: "duplicate",
      invoice: { id: "invoice-id", invoice_number: "INV-1044" },
    });

    await expect(convertQuoteToInvoice(quoteId)).rejects.toThrow(
      "REDIRECT:/dashboard/invoices?warning=An%20invoice%20already%20exists%20for%20this%20quote.",
    );

    expect(mocks.revalidatePath).toHaveBeenCalledTimes(3);
  });

  it("returns safe quote feedback for non-accepted and inaccessible quotes", async () => {
    mocks.convertAcceptedQuoteToInvoice.mockResolvedValueOnce({ kind: "ineligible" });

    await expect(convertQuoteToInvoice(quoteId)).rejects.toThrow(
      "REDIRECT:/dashboard/quotes?warning=Only%20accepted%20quotes%20can%20be%20converted%20to%20invoices.",
    );

    mocks.convertAcceptedQuoteToInvoice.mockResolvedValueOnce({ kind: "not_found" });

    await expect(convertQuoteToInvoice(quoteId)).rejects.toThrow(
      "REDIRECT:/dashboard/quotes?error=Quote%20not%20found.",
    );
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("requires authentication before starting conversion", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    await expect(convertQuoteToInvoice(quoteId)).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(mocks.convertAcceptedQuoteToInvoice).not.toHaveBeenCalled();
  });

  it("logs internal failures and redirects with a generic message", async () => {
    const error = new Error("sensitive database detail");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.convertAcceptedQuoteToInvoice.mockResolvedValue({ kind: "error", error });

    await expect(convertQuoteToInvoice(quoteId)).rejects.toThrow(
      "REDIRECT:/dashboard/quotes?error=Unable%20to%20create%20invoice%20from%20quote.%20Please%20try%20again.",
    );
    expect(consoleError).toHaveBeenCalledWith("[convertQuoteToInvoice]", error);
    consoleError.mockRestore();
  });

  it("does not block conversion for the configured demo user", async () => {
    process.env.DEMO_USER_EMAIL = "demo@pipeflow.app";
    mocks.createClient.mockResolvedValue(authenticatedClient("demo@pipeflow.app"));
    mocks.convertAcceptedQuoteToInvoice.mockResolvedValue({
      kind: "created",
      invoice: { id: "invoice-id", invoice_number: "INV-1044" },
    });

    await expect(convertQuoteToInvoice(quoteId)).rejects.toThrow(
      "REDIRECT:/dashboard/invoices?success=Invoice%20created%20from%20quote.",
    );
    expect(mocks.convertAcceptedQuoteToInvoice).toHaveBeenCalledOnce();
  });

  it("preserves demo delete protection", async () => {
    process.env.DEMO_USER_EMAIL = "demo@pipeflow.app";
    mocks.createClient.mockResolvedValue(authenticatedClient("demo@pipeflow.app"));

    await expect(deleteQuote(quoteId)).rejects.toThrow(
      "REDIRECT:/dashboard/quotes?warning=Deleting%20records%20is%20disabled%20in%20the%20public%20demo.",
    );
  });
});
