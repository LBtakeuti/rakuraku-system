"use client";

import { ReactNode } from "react";
import { Chip } from "@/components/forms/chip";

export type ChipOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type ChipRowProps<T extends string> = {
  label: string;
  active: T;
  options: ChipOption<T>[];
  onChange: (value: T) => void;
};

export function ChipRow<T extends string>({
  label,
  active,
  options,
  onChange,
}: ChipRowProps<T>) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[13px] font-semibold text-text-secondary">
        {label}
      </span>
      {options.map((o) => (
        <Chip
          key={o.value}
          active={active === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
