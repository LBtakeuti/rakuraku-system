import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type OptionCardProps = {
  selected: boolean;
  onSelect: () => void;
  title: ReactNode;
  description?: ReactNode;
  className?: string;
};

export function OptionCard({
  selected,
  onSelect,
  title,
  description,
  className,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "flex w-full flex-col items-start gap-1.5 rounded-xl border bg-bg-surface px-4 py-4 text-left transition-colors",
        selected
          ? "border-primary bg-primary-lighter shadow-[0_0_0_2px_var(--primary-light)_inset]"
          : "border-border-default hover:border-primary/40",
        className
      )}
    >
      <div className="text-[15px] font-bold text-text-primary">{title}</div>
      {description && (
        <div className="text-[13px] leading-[1.5] text-text-secondary">
          {description}
        </div>
      )}
    </button>
  );
}
