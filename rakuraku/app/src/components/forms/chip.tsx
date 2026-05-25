"use client";

import { cn } from "@/lib/utils";

type ChipProps = {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
};

export function Chip({ active = false, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        active
          ? "border-primary bg-primary text-white"
          : "border-border-default bg-bg-surface text-text-secondary hover:border-primary/40 hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}
