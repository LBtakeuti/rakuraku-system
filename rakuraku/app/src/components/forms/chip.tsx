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
        "inline-flex items-center rounded-full border border-transparent px-3.5 py-1.5 text-[13px] font-semibold transition-colors",
        active
          ? "bg-primary text-white"
          : "bg-bg-muted text-text-secondary hover:bg-primary-lighter hover:text-primary"
      )}
    >
      {children}
    </button>
  );
}
