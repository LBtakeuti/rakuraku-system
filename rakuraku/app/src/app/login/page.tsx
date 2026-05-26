"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError("メールアドレスまたはパスワードが正しくありません");
        return;
      }

      router.push("/");
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg-page px-4">
      <div className="w-full max-w-[400px] rounded-2xl border border-border-light bg-bg-surface p-8 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-white">
            楽
          </div>
          <h1 className="text-xl font-bold text-text-primary">
            らくらく受発注システム
          </h1>
          <p className="text-[13px] text-text-secondary">
            メールアドレスとパスワードでログインしてください
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-danger bg-danger-light px-4 py-3 text-[14px] font-semibold text-danger">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-[13px] font-semibold text-text-secondary"
            >
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="例: yamada@example.com"
              required
              autoComplete="email"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1.5 block text-[13px] font-semibold text-text-secondary"
            >
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワードを入力してください"
              required
              autoComplete="current-password"
              className="w-full rounded-[10px] border border-border-default bg-bg-surface px-3.5 py-2.5 text-[15px] placeholder:text-text-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="mt-2 w-full rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending ? "ログイン中..." : "ログインする"}
          </button>
        </form>
      </div>
    </div>
  );
}
