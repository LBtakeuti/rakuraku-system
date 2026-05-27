import Link from "next/link";
import { ArrowLeft } from "lucide-react";

type PageBarProps = {
  title: string;
  backTo?: string;
};

export function PageBar({ title, backTo = "/" }: PageBarProps) {
  return (
    <div className="flex items-center gap-5 bg-bg-surface px-10 py-4 shadow-[0_1px_3px_rgba(15,23,42,0.08)]">
      <Link
        href={backTo}
        className="inline-flex items-center gap-2 rounded-[10px] border border-border-default bg-bg-surface px-[18px] py-2.5 text-[15px] font-semibold text-text-primary shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors hover:border-primary hover:bg-primary-lighter hover:text-primary"
      >
        <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={2.5} aria-hidden />
        ホームに戻る
      </Link>
      <div className="text-[22px] font-bold text-text-primary">{title}</div>
    </div>
  );
}
