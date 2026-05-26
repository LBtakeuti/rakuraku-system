import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

export type BigButtonColor =
  | "blue"
  | "green"
  | "orange"
  | "purple"
  | "teal"
  | "pink"
  | "amber"
  | "indigo"
  | "rose"
  | "violet";

type BigButtonProps = {
  href: string;
  color: BigButtonColor;
  title: string;
  description: ReactNode;
  icon: LucideIcon;
};

const iconStyles: Record<BigButtonColor, string> = {
  blue: "bg-[#dbeafe] text-[#1d4ed8]",
  green: "bg-[#d1fae5] text-[#059669]",
  orange: "bg-[#fed7aa] text-[#c2410c]",
  purple: "bg-[#e9d5ff] text-[#7e22ce]",
  teal: "bg-[#ccfbf1] text-[#0d9488]",
  pink: "bg-[#fce7f3] text-[#be185d]",
  amber: "bg-[#fef3c7] text-[#b45309]",
  indigo: "bg-[#e0e7ff] text-[#4338ca]",
  rose: "bg-[#ffe4e6] text-[#be123c]",
  violet: "bg-[#ede9fe] text-[#6d28d9]",
};

export function BigButton({
  href,
  color,
  title,
  description,
  icon: Icon,
}: BigButtonProps) {
  return (
    <Link
      href={href}
      className="flex w-[200px] min-h-[200px] flex-col items-center justify-center gap-3.5 rounded-2xl border border-border-light bg-bg-surface px-4 py-7 text-center shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(15,23,42,0.1)] active:translate-y-0 active:shadow-[0_1px_3px_rgba(15,23,42,0.08)] active:duration-[50ms]"
    >
      <div
        className={cn(
          "flex h-[60px] w-[60px] items-center justify-center rounded-[14px]",
          iconStyles[color]
        )}
      >
        <Icon className="h-[30px] w-[30px]" strokeWidth={2} aria-hidden />
      </div>
      <div className="text-lg font-bold text-text-primary">{title}</div>
      <div className="text-[13px] leading-[1.5] text-text-secondary">
        {description}
      </div>
    </Link>
  );
}
