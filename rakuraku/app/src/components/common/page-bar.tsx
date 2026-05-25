import Link from "next/link";

type PageBarProps = {
  title: string;
  backTo?: string;
};

export function PageBar({ title, backTo = "/" }: PageBarProps) {
  return (
    <div className="flex items-center gap-5 border-b border-border-light bg-bg-surface px-8 py-4">
      <Link
        href={backTo}
        className="inline-flex items-center gap-2 rounded-[10px] border border-border-default bg-bg-surface px-[18px] py-2.5 text-[15px] font-semibold text-text-primary shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors hover:border-primary hover:bg-primary-lighter hover:text-primary"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px]"
          aria-hidden="true"
        >
          <path d="M19 12H5" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
        ホームに戻る
      </Link>
      <div className="text-[22px] font-bold text-text-primary">{title}</div>
    </div>
  );
}
