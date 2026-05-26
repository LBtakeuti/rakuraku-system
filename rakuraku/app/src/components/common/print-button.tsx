"use client";

import { Printer } from "lucide-react";

type PrintButtonProps = {
  href: string;
  label: string;
};

export function PrintButton({ href, label }: PrintButtonProps) {
  return (
    <button
      type="button"
      onClick={() => window.open(href, "_blank")}
      className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-5 py-2.5 text-[14px] font-bold text-text-primary shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors hover:bg-bg-muted"
    >
      <Printer className="h-4.5 w-4.5" strokeWidth={2} />
      {label}
    </button>
  );
}
