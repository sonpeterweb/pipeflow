import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  createDocumentPdfResponse: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mocks.createClient }));
vi.mock("@/lib/documents/response", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("@/lib/documents/response")>();
  return {
    ...original,
    createDocumentPdfResponse: mocks.createDocumentPdfResponse,
  };
});

import { handleDocumentPdfRequest } from "@/lib/documents/route";

const documentId = "30000000-0000-0000-0000-000000000009";
const userId = "70000000-0000-4000-8000-000000000001";

describe("document PDF route handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requires authentication and disables private response caching", async () => {
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    });

    const response = await handleDocumentPdfRequest({
      documentId,
      documentKind: "quote",
    });

    expect(response.status).toBe(401);
    await expect(response.text()).resolves.toBe("Authentication required.");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(mocks.createDocumentPdfResponse).not.toHaveBeenCalled();
  });

  it("allows the demo user through normal authenticated ownership checks", async () => {
    const supabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "demo@pipeflow.app", id: userId } },
        }),
      },
    };
    const pdfResponse = new Response("pdf", { status: 200 });
    mocks.createClient.mockResolvedValue(supabase);
    mocks.createDocumentPdfResponse.mockResolvedValue(pdfResponse);

    const response = await handleDocumentPdfRequest({
      documentId,
      documentKind: "invoice",
    });

    expect(response).toBe(pdfResponse);
    expect(mocks.createDocumentPdfResponse).toHaveBeenCalledWith({
      documentId,
      documentKind: "invoice",
      supabase,
      userEmail: "demo@pipeflow.app",
      userId,
    });
  });

  it("logs internal failures and returns only the generic PDF error", async () => {
    const internalError = new Error("private renderer detail");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.createClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { email: "owner@example.co.nz", id: userId } },
        }),
      },
    });
    mocks.createDocumentPdfResponse.mockRejectedValue(internalError);

    const response = await handleDocumentPdfRequest({
      documentId,
      documentKind: "quote",
    });

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.toBe(
      "Unable to generate PDF. Please try again.",
    );
    expect(consoleError).toHaveBeenCalledWith("[quotePdf]", internalError);
    consoleError.mockRestore();
  });
});
