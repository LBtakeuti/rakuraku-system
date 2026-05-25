import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type BigButtonVariant = "primary" | "default";

type BigButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BigButtonVariant;
};

const base =
  "inline-flex items-center gap-2.5 rounded-xl px-6 py-3.5 text-base font-bold border border-transparent shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-60";

const variantStyles: Record<BigButtonVariant, string> = {
  primary:
    "bg-primary text-white hover:bg-primary-hover hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(29,78,216,0.25)]",
  default:
    "bg-bg-surface border-border-default text-text-primary hover:bg-bg-muted hover:-translate-y-px hover:shadow-[0_4px_10px_rgba(15,23,42,0.08)]",
};

export const BigButton = forwardRef<HTMLButtonElement, BigButtonProps>(
  function BigButton({ variant = "default", className, type, ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cn(base, variantStyles[variant], className)}
        {...rest}
      />
    );
  }
);
