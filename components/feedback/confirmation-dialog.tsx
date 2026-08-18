"use client";

import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";

import { Button, type ButtonVariant } from "@/components/ui/button";

function DialogActions({
  cancelLabel,
  cancelRef,
  confirmLabel,
  onCancel,
  pendingLabel,
  variant,
}: {
  cancelLabel: string;
  cancelRef: RefObject<HTMLButtonElement | null>;
  confirmLabel: string;
  onCancel: () => void;
  pendingLabel: string;
  variant: ButtonVariant;
}) {
  const { pending } = useFormStatus();

  return (
    <>
      <Button
        disabled={pending}
        onClick={onCancel}
        ref={cancelRef}
        type="button"
        variant="outline"
      >
        {cancelLabel}
      </Button>
      <Button
        aria-disabled={pending}
        disabled={pending}
        type="submit"
        variant={variant}
      >
        {pending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {pendingLabel}
          </span>
        ) : (
          confirmLabel
        )}
      </Button>
    </>
  );
}

export function ConfirmationDialog({
  action,
  cancelLabel = "Cancel",
  confirmLabel,
  description,
  pendingLabel,
  title,
  triggerLabel,
  variant = "destructive",
}: {
  action: () => void | Promise<void>;
  cancelLabel?: string;
  confirmLabel: string;
  description: string;
  pendingLabel?: string;
  title: string;
  triggerLabel: string;
  variant?: ButtonVariant;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const resolvedPendingLabel =
    pendingLabel ?? (variant === "destructive" ? "Deleting..." : "Working...");

  useEffect(() => {
    if (!open) {
      return;
    }

    const trigger = triggerRef.current;
    cancelRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key === "Tab") {
        const focusableElements = Array.from(
          dialogRef.current?.querySelectorAll<HTMLButtonElement>(
            "button:not(:disabled)",
          ) ?? [],
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements.at(-1);

        if (event.shiftKey && document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        } else if (!event.shiftKey && document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
        variant={variant}
      >
        {triggerLabel}
      </Button>
      {open ? (
        <div
          aria-labelledby={titleId}
          aria-describedby={descriptionId}
          aria-modal="true"
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4"
          ref={dialogRef}
          role="dialog"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-md dark:border-slate-800 dark:bg-slate-950">
            <h2
              className="text-lg font-semibold tracking-tight text-slate-950 dark:text-slate-100"
              id={titleId}
            >
              {title}
            </h2>
            <p
              className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400"
              id={descriptionId}
            >
              {description}
            </p>
            <form
              action={action}
              className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
            >
              <DialogActions
                cancelLabel={cancelLabel}
                cancelRef={cancelRef}
                confirmLabel={confirmLabel}
                onCancel={() => setOpen(false)}
                pendingLabel={resolvedPendingLabel}
                variant={variant}
              />
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
