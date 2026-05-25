import { forwardRef, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  invalid?: boolean;
};

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ className, invalid, children, ...rest }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full appearance-none rounded-[10px] border bg-bg-surface px-3.5 py-2.5 text-[15px] text-text-primary transition-colors focus:outline-none focus:ring-2",
          invalid
            ? "border-danger focus:border-danger focus:ring-danger/30"
            : "border-border-default focus:border-primary focus:ring-primary/20",
          className
        )}
        {...rest}
      >
        {children}
      </select>
    );
  }
);
