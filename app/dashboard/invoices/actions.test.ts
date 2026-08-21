import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createOrReuseInvoiceCheckout: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/invoices/payment", () => ({
  createOrReuseInvoiceCheckout: mocks.createOrReuseInvoiceCheckout,
}));
vi.mock("@/lib/stripe/config", () => ({
  getTrustedAppUrl: () => "http://localhost:3000",
}));
vi.mock("@/lib/stripe/server", () => ({
  getStripeClient: () => ({ checkout: {} }),
}));

import {
  deleteInvoice,
  startInvoicePayment,
} from "@/app/dashboard/invoices/actions";

const invoiceId = "40000000-0000-0000-0000-000000000013";
const userId = "70000000-0000-4000-8000-000000000001";

function authenticatedClient(email = "owner@example.co.nz") {
  const deleteQuery = {
    delete: vi.fn(),
    eq: vi.fn(),
  };
  deleteQuery.delete.mockReturnValue(deleteQuery);
  deleteQuery.eq.mockReturnValue(deleteQuery);

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { email, id: userId } },
      }),
    },
    from: vi.fn().mockReturnValue(deleteQuery),
  };
}

describe("startInvoicePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEMO_USER_EMAIL;
    mocks.createClient.mockResolvedValue(authenticatedClient());
  });

  it("requires authentication and redirects outside the payment helper", async () => {
    mocks.createClient.mockResolvedValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
    });

    await expect(startInvoicePayment(invoiceId)).rejects.toThrow(
      "REDIRECT:/login",
    );
    expect(mocks.createOrReuseInvoiceCheckout).not.toHaveBeenCalled();
  });

  it("opens the returned Stripe-hosted Checkout URL", async () => {
    mocks.createOrReuseInvoiceCheckout.mockResolvedValue({
      kind: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_example",
    });

    await expect(startInvoicePayment(invoiceId)).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/c/pay/cs_test_example",
    );
    expect(mocks.createOrReuseInvoiceCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ invoiceId, userId }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/invoices");
  });

  it("returns safe feedback for paid and ineligible invoices", async () => {
    mocks.createOrReuseInvoiceCheckout.mockResolvedValueOnce({
      kind: "already_paid",
    });
    await expect(startInvoicePayment(invoiceId)).rejects.toThrow(
      "REDIRECT:/dashboard/invoices?warning=This%20invoice%20is%20already%20paid.",
    );

    mocks.createOrReuseInvoiceCheckout.mockResolvedValueOnce({
      kind: "ineligible",
    });
    await expect(startInvoicePayment(invoiceId)).rejects.toThrow(
      "REDIRECT:/dashboard/invoices?warning=Only%20sent%20or%20overdue%20invoices%20can%20be%20paid%20online.",
    );
  });

  it("allows the configured demo user and preserves demo delete protection", async () => {
    process.env.DEMO_USER_EMAIL = "demo@pipeflow.app";
    mocks.createClient.mockResolvedValue(authenticatedClient("demo@pipeflow.app"));
    mocks.createOrReuseInvoiceCheckout.mockResolvedValue({
      kind: "redirect",
      url: "https://checkout.stripe.com/c/pay/cs_test_demo",
    });

    await expect(startInvoicePayment(invoiceId)).rejects.toThrow(
      "REDIRECT:https://checkout.stripe.com/c/pay/cs_test_demo",
    );
    expect(mocks.createOrReuseInvoiceCheckout).toHaveBeenCalledOnce();

    await expect(deleteInvoice(invoiceId)).rejects.toThrow(
      "REDIRECT:/dashboard/invoices?warning=Deleting%20records%20is%20disabled%20in%20the%20public%20demo.",
    );
  });
});
