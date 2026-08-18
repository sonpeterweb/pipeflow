import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ConfirmationDialog } from "@/components/feedback/confirmation-dialog";

describe("ConfirmationDialog", () => {
  it("requires confirmation before submitting a destructive action", async () => {
    const action = vi.fn();
    render(
      <ConfirmationDialog
        action={action}
        confirmLabel="Delete customer"
        description="This action cannot be undone."
        title="Delete customer?"
        triggerLabel="Delete customer"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Delete customer" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(action).not.toHaveBeenCalled();
    expect(screen.getAllByRole("button", { name: "Delete customer" })).toHaveLength(2);
  });

  it("moves focus into the dialog, closes with Escape, and restores focus", async () => {
    render(
      <ConfirmationDialog
        action={vi.fn()}
        confirmLabel="Delete quote"
        description="This action cannot be undone."
        title="Delete quote?"
        triggerLabel="Delete quote"
      />,
    );
    const trigger = screen.getByRole("button", { name: "Delete quote" });

    fireEvent.click(trigger);

    await waitFor(() => expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus());
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(screen.getAllByRole("button", { name: "Delete quote" })[1]).toHaveFocus();
    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("supports a non-destructive conversion confirmation", () => {
    render(
      <ConfirmationDialog
        action={vi.fn()}
        confirmLabel="Create invoice"
        description="This will create a draft invoice using this quote’s customer, job, and amount details."
        pendingLabel="Creating invoice..."
        title="Create invoice from quote?"
        triggerLabel="Convert to Invoice"
        variant="primary"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Convert to Invoice" }));

    expect(screen.getByRole("heading", { name: "Create invoice from quote?" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Create invoice" })).toHaveClass(
      "bg-brand-primary",
    );
    expect(screen.getByRole("button", { name: "Create invoice" })).not.toHaveClass(
      "bg-red-600",
    );
  });

  it("shows the supplied pending label and prevents repeated submission", async () => {
    let finishAction: (() => void) | undefined;
    const action = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishAction = resolve;
        }),
    );
    render(
      <ConfirmationDialog
        action={action}
        confirmLabel="Create invoice"
        description="Create a draft invoice."
        pendingLabel="Creating invoice..."
        title="Create invoice from quote?"
        triggerLabel="Convert to Invoice"
        variant="primary"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Convert to Invoice" }));
    fireEvent.click(screen.getByRole("button", { name: "Create invoice" }));

    const pendingButton = await screen.findByRole("button", {
      name: "Creating invoice...",
    });
    expect(pendingButton).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(action).toHaveBeenCalledOnce();

    fireEvent.click(pendingButton);
    expect(action).toHaveBeenCalledOnce();

    await act(async () => finishAction?.());
  });
});
