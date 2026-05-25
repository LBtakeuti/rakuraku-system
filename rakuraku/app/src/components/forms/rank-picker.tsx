"use client";

import { cn } from "@/lib/utils";
import type { CustomerRank } from "@/types/customer";
import { RANK_LABEL } from "@/types/customer";

type RankPickerProps = {
  value: CustomerRank | "";
  onChange: (rank: CustomerRank) => void;
};

const RANKS: CustomerRank[] = ["A", "B", "C", "D"];

export function RankPicker({ value, onChange }: RankPickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {RANKS.map((r) => {
        const selected = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            aria-pressed={selected}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border bg-bg-surface px-3 py-4 transition-colors",
              selected
                ? "border-primary bg-primary-lighter"
                : "border-border-default hover:border-primary/40"
            )}
          >
            <span className="text-2xl font-bold text-text-primary">{r}</span>
            <span className="text-xs text-text-secondary">{RANK_LABEL[r]}</span>
          </button>
        );
      })}
    </div>
  );
}
