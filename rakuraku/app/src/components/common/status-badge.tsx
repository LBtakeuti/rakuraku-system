import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type StatusBadgeVariant = "success" | "warning" | "danger" | "info" | "muted";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: StatusBadgeVariant;
};

const variantStyles: Record<StatusBadgeVariant, string> = {
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  info: "bg-info-light text-info",
  muted: "bg-bg-muted text-text-secondary",
};

export function StatusBadge({
  variant = "muted",
  className,
  children,
  ...rest
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-semibold",
        variantStyles[variant],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
