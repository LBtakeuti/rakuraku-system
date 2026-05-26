import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

function formatDateJp(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"] as const;
  const w = weekdays[date.getDay()];
  return `${y}年${m}月${d}日(${w})`;
}

export async function TopHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userName: string | null = null;
  if (user) {
    const { data: staff } = await supabase
      .from("staff")
      .select("name")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    userName = (staff?.name as string | null) ?? user.email ?? null;
  }

  const dateText = formatDateJp(new Date());

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
        {userName && (
          <div className="flex items-center gap-2.5 rounded-full bg-bg-muted px-3.5 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-light text-[15px] font-bold text-primary">
              {userName.charAt(0)}
            </div>
            <div className="text-[15px] font-semibold">{userName} さん</div>
            <LogoutButton />
          </div>
        )}
      </div>
    </header>
  );
}
