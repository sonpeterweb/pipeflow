import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createOrReuseInvoiceCheckout,
  invoiceAmountToMinorUnits,
} from "@/lib/invoices/payment";

const invoiceId = "40000000-0000-0000-0000-000000000013";
const userId = "70000000-0000-4000-8000-000000000001";
const checkoutUrl = "https://checkout.stripe.com/c/pay/cs_test_example";

function createSupabase(
  invoice: Record<string, unknown> | null,
  rpcResult: { data: boolean | null; error: unknown } = {
    data: true,
    error: null,
  },
) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: invoice, error: null });
  const query = {
    eq: vi.fn(),
    maybeSingle,
    select: vi.fn(),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);

  return {
    client: {
      from: vi.fn().mockReturnValue(query),
      rpc: vi.fn().mockResolvedValue(rpcResult),
    } as unknown as SupabaseClient,
    query,
  };
}

function createStripe({
  createSession,
  retrieveSession,
}: {
  createSession?: Record<string, unknown>;
  retrieveSession?: Record<string, unknown>;
} = {}) {
  return {
    checkout: {
      sessions: {
        create: vi.fn().mockResolvedValue(
          createSession ?? {
            id: "cs_test_new",
            url: checkoutUrl,
          },
        ),
        expire: vi.fn().mockResolvedValue({}),
        retrieve: vi.fn().mockResolvedValue(
          retrieveSession ?? {
            id: "cs_test_existing",
            status: "expired",
            url: null,
          },
        ),
      },
    },
  } as unknown as Stripe;
}

function eligibleInvoice(overrides: Record<string, unknown> = {}) {
  return {
    amount: "1180.00",
    customers: { email: "customer@example.co.nz" },
    invoice_number: "INV-1036",
    status: "sent",
    stripe_checkout_session_id: null,
    ...overrides,
  };
}

describe("invoiceAmountToMinorUnits", () => {
  it("converts NZD decimal amounts without floating-point rounding", () => {
    expect(invoiceAmountToMinorUnits("1180.05")).toBe(118005);
    expect(invoiceAmountToMinorUnits(0.5)).toBe(50);
    expect(invoiceAmountToMinorUnits("1.2")).toBe(120);
  });

  it("rejects negative, over-precise, and non-numeric values", () => {
    expect(invoiceAmountToMinorUnits("-1")).toBeNull();
    expect(invoiceAmountToMinorUnits("1.001")).toBeNull();
    expect(invoiceAmountToMinorUnits("not-money")).toBeNull();
  });
});

describe("createOrReuseInvoiceCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a card-only test Checkout Session from the owned database invoice", async () => {
    const { client } = createSupabase(eligibleInvoice());
    const stripe = createStripe();

    const result = await createOrReuseInvoiceCheckout({
      appUrl: "http://localhost:3000",
      invoiceId,
      stripe,
      supabase: client,
      userId,
    });

    expect(result).toEqual({ kind: "redirect", url: checkoutUrl });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({
        cancel_url:
          `http://localhost:3000/dashboard/invoices/payment/cancelled?invoice_id=${invoiceId}`,
        client_reference_id: invoiceId,
        customer_email: "customer@example.co.nz",
        line_items: [
          {
            price_data: {
              currency: "nzd",
              product_data: { name: "Invoice INV-1036" },
              unit_amount: 118000,
            },
            quantity: 1,
          },
        ],
        metadata: { invoice_id: invoiceId, user_id: userId },
        mode: "payment",
        payment_method_types: ["card"],
        success_url:
          `http://localhost:3000/dashboard/invoices/payment/success?invoice_id=${invoiceId}&session_id={CHECKOUT_SESSION_ID}`,
      }),
      { idempotencyKey: `pipeflow-invoice-${invoiceId}-initial` },
    );
    expect(client.rpc).toHaveBeenCalledWith(
      "attach_invoice_checkout_session",
      {
        p_expected_session_id: null,
        p_invoice_id: invoiceId,
        p_new_session_id: "cs_test_new",
      },
    );
  });

  it("safely rejects missing, inaccessible, paid, draft, and invalid invoices", async () => {
    for (const [invoice, kind] of [
      [null, "not_found"],
      [eligibleInvoice({ status: "paid" }), "already_paid"],
      [eligibleInvoice({ status: "draft" }), "ineligible"],
      [eligibleInvoice({ amount: "0" }), "invalid_amount"],
      [eligibleInvoice({ amount: "0.49" }), "invalid_amount"],
      [eligibleInvoice({ amount: "1000000.00" }), "invalid_amount"],
    ] as const) {
      const { client } = createSupabase(invoice);
      const stripe = createStripe();

      await expect(
        createOrReuseInvoiceCheckout({
          appUrl: "http://localhost:3000",
          invoiceId,
          stripe,
          supabase: client,
          userId,
        }),
      ).resolves.toEqual({ kind });
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    }
  });

  it("reuses a matching open session on repeated requests", async () => {
    const { client } = createSupabase(
      eligibleInvoice({ stripe_checkout_session_id: "cs_test_existing" }),
    );
    const stripe = createStripe({
      retrieveSession: {
        amount_total: 118000,
        client_reference_id: invoiceId,
        currency: "nzd",
        id: "cs_test_existing",
        metadata: { invoice_id: invoiceId, user_id: userId },
        status: "open",
        url: checkoutUrl,
      },
    });

    await expect(
      createOrReuseInvoiceCheckout({
        appUrl: "http://localhost:3000",
        invoiceId,
        stripe,
        supabase: client,
        userId,
      }),
    ).resolves.toEqual({ kind: "redirect", url: checkoutUrl });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    expect(client.rpc).not.toHaveBeenCalled();
  });

  it("replaces an expired session with a deterministic retry key", async () => {
    const { client } = createSupabase(
      eligibleInvoice({ stripe_checkout_session_id: "cs_test_expired" }),
    );
    const stripe = createStripe();

    await createOrReuseInvoiceCheckout({
      appUrl: "http://localhost:3000",
      invoiceId,
      stripe,
      supabase: client,
      userId,
    });

    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.any(Object),
      {
        idempotencyKey: `pipeflow-invoice-${invoiceId}-cs_test_expired`,
      },
    );
  });

  it("does not special-case or block the demo user", async () => {
    const { client } = createSupabase(eligibleInvoice());

    await expect(
      createOrReuseInvoiceCheckout({
        appUrl: "http://localhost:3000",
        invoiceId,
        stripe: createStripe(),
        supabase: client,
        userId: "bb9c657d-1022-4355-9b58-eabe6adc12a8",
      }),
    ).resolves.toEqual({ kind: "redirect", url: checkoutUrl });
  });
});
