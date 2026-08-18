import { expect, test } from "@playwright/test";

const documentId = "30000000-0000-0000-0000-000000000009";

test.describe("private PDF export routes", () => {
  for (const documentKind of ["quotes", "invoices"] as const) {
    test(`requires authentication for ${documentKind}`, async ({ request }) => {
      const response = await request.get(
        `/dashboard/${documentKind}/${documentId}/pdf`,
        { maxRedirects: 0 },
      );

      expect(response.status()).toBe(307);
      expect(response.headers().location).toContain("/login?redirectedFrom=");
      expect(response.headers().location).toContain(
        encodeURIComponent(`/dashboard/${documentKind}/${documentId}/pdf`),
      );
    });
  }
});
