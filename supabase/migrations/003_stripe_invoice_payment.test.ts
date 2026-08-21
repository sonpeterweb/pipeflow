import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/003_stripe_invoice_payment.sql"),
  "utf8",
);

describe("Stripe invoice payment migration", () => {
  it("adds nullable Stripe references with partial unique indexes", () => {
    expect(migration).toContain("ADD COLUMN stripe_checkout_session_id text");
    expect(migration).toContain("ADD COLUMN stripe_payment_intent_id text;");
    expect(migration).toContain(
      "CREATE UNIQUE INDEX invoices_stripe_checkout_session_unique_idx",
    );
    expect(migration).toContain(
      "CREATE UNIQUE INDEX invoices_stripe_payment_intent_unique_idx",
    );
  });

  it("attaches only test sessions to eligible owned invoices", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.attach_invoice_checkout_session(",
    );
    expect(migration).toContain("invoices.user_id = v_user_id");
    expect(migration).toContain("v_status NOT IN ('sent', 'overdue')");
    expect(migration).toContain("v_amount < 0.50");
    expect(migration).toContain("v_amount > 999999.99");
    expect(migration).toContain("p_new_session_id !~ '^cs_test_'");
    expect(migration).toContain("FOR UPDATE;");
  });

  it("keeps RLS enabled and protects payment references", () => {
    expect(migration).not.toContain("DISABLE ROW LEVEL SECURITY");
    expect(migration).toContain("CREATE TRIGGER protect_invoice_payment_references");
    expect(migration).toContain("current_user NOT IN ('postgres', 'service_role')");
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.attach_invoice_checkout_session(uuid, text, text)\nTO authenticated;",
    );
  });
});
