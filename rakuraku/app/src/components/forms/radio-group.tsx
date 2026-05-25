"use client";

import { cn } from "@/lib/utils";

type RadioOption<T extends string> = {
  value: T;
  label: string;
};

type RadioGroupFieldProps<T extends string> = {
  value: T | "";
  onChange: (value: T) => void;
  options: RadioOption<T>[];
  name: string;
};

export function RadioGroupField<T extends string>({
  value,
  onChange,
  options,
  name,
}: RadioGroupFieldProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-[10px] border bg-bg-surface px-4 py-2.5 text-[15px] font-semibold transition-colors",
              selected
                ? "border-primary bg-primary-lighter text-primary"
                : "border-border-default text-text-primary hover:border-primary/40"
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="h-4 w-4 accent-primary"
            />
            {opt.label}
          </label>
        );
      })}
    </div>
  );
}
