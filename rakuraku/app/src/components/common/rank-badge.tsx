import { cn } from "@/lib/utils";

type Rank = "A" | "B" | "C" | "D";

type RankBadgeProps = {
  rank: Rank;
  className?: string;
};

const rankStyles: Record<Rank, string> = {
  A: "bg-[#fee2e2] text-[#991b1b]",
  B: "bg-[#ffedd5] text-[#9a3412]",
  C: "bg-[#dbeafe] text-[#1e40af]",
  D: "bg-[#f1f5f9] text-[#475569]",
};

export function RankBadge({ rank, className }: RankBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex h-[26px] w-[26px] items-center justify-center rounded-md text-xs font-bold",
        rankStyles[rank],
        className
      )}
      aria-label={`ランク${rank}`}
    >
      {rank}
    </span>
  );
}
