import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type StepIndicatorProps = {
  current: 1 | 2 | 3;
  steps: { num: 1 | 2 | 3; label: string }[];
};

export function StepIndicator({ current, steps }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-3">
      {steps.map((s, idx) => {
        const isCurrent = s.num === current;
        const isDone = s.num < current;
        return (
          <div key={s.num} className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full border-2 text-[15px] font-bold transition-colors",
                  isDone
                    ? "border-success bg-success text-white"
                    : isCurrent
                      ? "border-primary bg-primary text-white"
                      : "border-border-default bg-bg-surface text-text-muted"
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : s.num}
              </div>
              <div
                className={cn(
                  "text-[14px] font-semibold",
                  isDone
                    ? "text-success"
                    : isCurrent
                      ? "text-primary"
                      : "text-text-muted"
                )}
              >
                {s.label}
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-12 transition-colors",
                  isDone ? "bg-success" : "bg-border-light"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
