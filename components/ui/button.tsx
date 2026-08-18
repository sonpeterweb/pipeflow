import type { ComponentPropsWithRef } from "react";

import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-primary text-white shadow-sm hover:bg-brand-primary-hover dark:text-slate-950",
  secondary:
    "bg-slate-100 text-slate-950 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
  outline:
    "border border-slate-300 bg-white text-slate-950 shadow-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-900",
  ghost:
    "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-100",
  destructive:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 dark:bg-red-500 dark:text-slate-950 dark:hover:bg-red-400",
};

export function buttonVariants({
  variant = "primary",
  className,
}: {
  variant?: ButtonVariant;
  className?: string;
} = {}) {
  return cn(
    "inline-flex h-10 cursor-pointer items-center justify-center rounded-lg px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-60 dark:focus-visible:ring-offset-slate-950",
    variants[variant],
    className,
  );
}

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ComponentPropsWithRef<"button"> & {
  variant?: ButtonVariant;
}) {
  return (
    <button
      className={buttonVariants({ variant, className })}
      type={type}
      {...props}
    />
  );
}
