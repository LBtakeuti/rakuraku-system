import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
};

export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  function TextInput({ className, invalid, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full rounded-[10px] border bg-bg-surface px-3.5 py-2.5 text-[15px] text-text-primary placeholder:text-text-muted transition-colors focus:outline-none focus:ring-2",
          invalid
            ? "border-danger focus:border-danger focus:ring-danger/30"
            : "border-border-default focus:border-primary focus:ring-primary/20",
          className
        )}
        {...rest}
      />
    );
  }
);
