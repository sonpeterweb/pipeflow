import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { getInvoicePaymentReturnState } from "@/lib/invoices/payment-return";

const invoiceId = "40000000-0000-0000-0000-000000000013";
const userId = "70000000-0000-4000-8000-000000000001";

function createClient(data: Record<string, unknown> | null) {
  const query = {
    eq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    select: vi.fn(),
  };
  query.eq.mockReturnValue(query);
  query.select.mockReturnValue(query);

  return { from: vi.fn().mockReturnValue(query) } as unknown as SupabaseClient;
}

describe("getInvoicePaymentReturnState", () => {
  it("reports confirmed only from stored webhook-backed state", async () => {
    await expect(
      getInvoicePaymentReturnState({
        invoiceId,
        sessionId: "cs_test_paid",
        supabase: createClient({
          invoice_number: "INV-1036",
          status: "paid",
          stripe_checkout_session_id: "cs_test_paid",
          stripe_payment_intent_id: "pi_test_paid",
        }),
        userId,
      }),
    ).resolves.toEqual({ invoiceNumber: "INV-1036", kind: "confirmed" });
  });

  it("keeps a success-page visit pending without webhook-backed state", async () => {
    const client = createClient({
      invoice_number: "INV-1036",
      status: "sent",
      stripe_checkout_session_id: "cs_test_paid",
      stripe_payment_intent_id: null,
    });

    await expect(
      getInvoicePaymentReturnState({
        invoiceId,
        sessionId: "cs_test_paid",
        supabase: client,
        userId,
      }),
    ).resolves.toEqual({ invoiceNumber: "INV-1036", kind: "pending" });
    expect(client.from("invoices")).not.toHaveProperty("update");
  });
});
