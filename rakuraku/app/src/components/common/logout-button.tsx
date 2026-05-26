"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      title="ログアウト"
      className="ml-1 flex h-7 w-7 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-bg-surface hover:text-text-primary"
    >
      <LogOut className="h-4 w-4" strokeWidth={2} />
    </button>
  );
}
