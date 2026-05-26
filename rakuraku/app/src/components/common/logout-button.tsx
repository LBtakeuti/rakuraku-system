"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      type="button"
      onClick={handleLogout}
      title="ログアウト"
      className="ml-1"
    >
      <LogOut className="h-4 w-4" strokeWidth={2} />
    </Button>
  );
}
