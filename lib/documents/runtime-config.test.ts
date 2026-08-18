import { describe, expect, it } from "vitest";

import nextConfig from "../../next.config";

describe("PDF document runtime configuration", () => {
  it("keeps PDFKit external so its runtime font assets use real paths", () => {
    expect(nextConfig.serverExternalPackages).toContain("pdfkit");
  });
});
