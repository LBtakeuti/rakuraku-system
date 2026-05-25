type TopHeaderProps = {
  userName?: string;
  currentDate?: string;
};

function formatDateJp(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"] as const;
  const w = weekdays[date.getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

export function TopHeader({
  userName = "山田 太郎",
  currentDate,
}: TopHeaderProps) {
  const dateText = currentDate ?? formatDateJp(new Date());
  const initial = userName.trim().charAt(0) || "?";

  return (
    <header className="flex items-center justify-between border-b border-border-light bg-bg-surface px-8 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary text-lg font-bold text-white">
          楽
        </div>
        <div className="text-xl font-bold">らくらく受発注システム</div>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-[15px] text-text-secondary">{dateText}</div>
        <div className="flex items-center gap-2.5 rounded-full bg-bg-muted px-3.5 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-[15px] font-bold text-primary">
            {initial}
          </div>
          <div className="text-[15px] font-semibold">{userName} さん</div>
        </div>
      </div>
    </header>
  );
}
