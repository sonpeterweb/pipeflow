import { describe, expect, it } from "vitest";

import {
  getDefaultInvoiceDates,
  invoiceDueDays,
} from "@/lib/invoices/defaults";

describe("invoice defaults", () => {
  it("uses a fourteen-day due date from the issue time", () => {
    const dates = getDefaultInvoiceDates(new Date("2026-08-18T02:00:00.000Z"));

    expect(invoiceDueDays).toBe(14);
    expect(dates).toEqual({
      dueAt: "2026-09-01T02:00:00.000Z",
      issuedAt: "2026-08-18T02:00:00.000Z",
    });
  });
});
