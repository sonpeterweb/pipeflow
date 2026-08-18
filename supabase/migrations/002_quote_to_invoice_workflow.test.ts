import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/002_quote_to_invoice_workflow.sql"),
  "utf8",
);

describe("quote-to-invoice migration", () => {
  it("adds the nullable source relationship and duplicate-protection indexes", () => {
    expect(migration).toMatch(
      /ADD COLUMN quote_id uuid REFERENCES public\.quotes \(id\) ON DELETE SET NULL;/,
    );
    expect(migration).toContain(
      "CREATE INDEX invoices_quote_id_idx\nON public.invoices (quote_id);",
    );
    expect(migration).toContain(
      "CREATE UNIQUE INDEX invoices_user_quote_unique_idx\nON public.invoices (user_id, quote_id)\nWHERE quote_id IS NOT NULL;",
    );
    expect(migration).toContain(
      "CREATE UNIQUE INDEX invoices_user_invoice_number_unique_idx\nON public.invoices (user_id, invoice_number)\nWHERE invoice_number IS NOT NULL;",
    );
  });

  it("retains relationship ownership and requires accepted source quotes", () => {
    expect(migration.match(/user_id = auth\.uid\(\)/g)?.length).toBeGreaterThanOrEqual(
      2,
    );
    expect(migration).toContain("customers.user_id = auth.uid()");
    expect(migration).toContain("jobs.user_id = auth.uid()");
    expect(migration).toContain("quotes.user_id = auth.uid()");
    expect(migration.match(/quotes\.status = 'accepted'/g)).toHaveLength(2);
    expect(migration).not.toContain("DISABLE ROW LEVEL SECURITY");
  });

  it("keeps an invoiced quote accepted", () => {
    expect(migration).toContain(
      "CREATE TRIGGER prevent_invoiced_quote_status_change",
    );
    expect(migration).toContain("NEW.status <> 'accepted'");
    expect(migration).toContain("invoices.quote_id = OLD.id");
  });

  it("creates invoices atomically from server-owned quote values", () => {
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.convert_quote_to_invoice(",
    );
    expect(migration).toContain(
      "PERFORM pg_advisory_xact_lock(hashtextextended(v_user_id::text, 24));",
    );
    expect(migration).toContain("AND quotes.user_id = v_user_id;");
    expect(migration).toContain("IF v_quote_status <> 'accepted' THEN");
    expect(migration).toMatch(
      /VALUES \(\s*v_user_id,\s*p_quote_id,\s*v_customer_id,\s*v_job_id,\s*v_invoice_number,\s*v_amount,\s*'draft',\s*p_issued_at,\s*p_due_at,\s*NULL\s*\)/,
    );
    expect(migration).toContain("WHEN unique_violation THEN");
    expect(migration).toContain(
      "RETURN QUERY SELECT 'duplicate'::text, v_invoice_id, v_invoice_number;",
    );
  });

  it("exposes the invoker-rights workflow only to authenticated users", () => {
    expect(migration).not.toContain("SECURITY DEFINER");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.convert_quote_to_invoice(uuid, timestamptz, timestamptz)\nFROM PUBLIC;",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.convert_quote_to_invoice(uuid, timestamptz, timestamptz)\nTO authenticated;",
    );
  });
});
