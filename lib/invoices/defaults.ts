export const invoiceDueDays = 14;

export function getDefaultInvoiceDates(now = new Date()) {
  const dueAt = new Date(now);
  dueAt.setUTCDate(dueAt.getUTCDate() + invoiceDueDays);

  return {
    dueAt: dueAt.toISOString(),
    issuedAt: now.toISOString(),
  };
}
