"use client";

import { cn } from "@/lib/utils";

type InvoiceFormatCardProps = {
  variant: "invoice_only" | "invoice_delivery";
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
};

export function InvoiceFormatCard({
  variant,
  title,
  description,
  selected,
  onSelect,
}: InvoiceFormatCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col gap-3 rounded-xl border bg-bg-surface px-5 py-5 text-left transition-colors",
        selected
          ? "border-primary bg-primary-lighter shadow-[0_0_0_2px_var(--primary-light)_inset]"
          : "border-border-default hover:border-primary/40"
      )}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className={cn(
            "flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-primary" : "border-border-default"
          )}
        >
          {selected && (
            <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          )}
        </span>
        <span className="text-[16px] font-bold text-text-primary">
          {title}
        </span>
      </div>
      <div className="text-[13px] leading-[1.5] text-text-secondary">
        {description}
      </div>
      <div className="mt-1 flex items-end gap-2" aria-hidden>
        {variant === "invoice_only" ? (
          <MiniPage label="請求書" lines={3} />
        ) : (
          <>
            <MiniPage label="請求書" lines={2} />
            <MiniPage label="納品書" lines={2} />
          </>
        )}
      </div>
    </button>
  );
}

function MiniPage({ label, lines }: { label: string; lines: number }) {
  return (
    <div className="flex h-[88px] w-[68px] flex-col gap-1.5 rounded-md border border-border-light bg-bg-surface px-2 py-2 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
      <div className="text-[8px] font-bold leading-none text-text-muted">
        {label}
      </div>
      <div className="flex flex-1 flex-col justify-start gap-1 pt-1">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn(
              "h-1 rounded-sm bg-border-default/80",
              i === lines - 1 ? "w-3/5" : "w-full"
            )}
          />
        ))}
      </div>
    </div>
  );
}
