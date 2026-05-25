import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FieldGroupProps = {
  label: string;
  required?: boolean;
  optional?: boolean;
  optionalLabel?: string;
  help?: ReactNode;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: ReactNode;
};

export function FieldGroup({
  label,
  required = false,
  optional = false,
  optionalLabel = "任意",
  help,
  error,
  htmlFor,
  className,
  children,
}: FieldGroupProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-2", className)}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={htmlFor}
          className="text-[15px] font-semibold text-text-primary"
        >
          {label}
        </label>
        {required && (
          <span className="inline-flex items-center rounded-md bg-danger-light px-2 py-0.5 text-[11px] font-semibold leading-none text-danger">
            必須
          </span>
        )}
        {!required && optional && (
          <span className="inline-flex items-center rounded-md bg-bg-muted px-2 py-0.5 text-[11px] font-semibold leading-none text-text-secondary">
            {optionalLabel}
          </span>
        )}
      </div>
      {help && (
        <div className="text-[13px] leading-[1.5] text-text-secondary">
          {help}
        </div>
      )}
      {children}
      {error && (
        <div className="text-[13px] font-semibold text-danger">{error}</div>
      )}
    </div>
  );
}
