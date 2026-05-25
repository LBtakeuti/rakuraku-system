import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "muted";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  danger: "bg-danger-light text-danger",
  info: "bg-info-light text-info",
  muted: "bg-bg-muted text-text-secondary",
};

export function Badge({
  variant = "muted",
  className,
  children,
  ...rest
}: BadgeProps) {
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
