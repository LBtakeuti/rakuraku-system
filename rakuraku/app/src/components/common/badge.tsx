import { cn } from "@/lib/utils";
import { HTMLAttributes, ReactNode } from "react";

type BadgeVariant = "required" | "optional" | "default";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children?: ReactNode;
};

const variantStyles: Record<BadgeVariant, string> = {
  required: "bg-danger-light text-danger",
  optional: "bg-bg-muted text-text-secondary",
  default: "bg-primary-lighter text-primary",
};

const defaultLabel: Record<BadgeVariant, string> = {
  required: "必須",
  optional: "任意",
  default: "",
};

export function Badge({
  variant = "default",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold leading-none",
        variantStyles[variant],
        className
      )}
      {...rest}
    >
      {children ?? defaultLabel[variant]}
    </span>
  );
}
