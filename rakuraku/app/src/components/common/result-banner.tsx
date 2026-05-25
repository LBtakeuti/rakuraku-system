"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

type ResultBannerProps = {
  issued: number;
  failed: number;
  /** 成功件数の名詞（例: "件の納品を確定" / "件の請求書を発行"） */
  successLabel: string;
  /** 失敗件数の名詞（例: "件失敗" / "件で失敗"） */
  failedLabel?: string;
  /** クエリパラメータのキー（issued / failed のキー名を変える場合） */
  paramKeys?: { issued: string; failed: string };
};

/**
 * URL クエリパラメータで渡された処理結果（issued/failed）をバナー表示する共通部品。
 * X を押すと URL パラメータを削除して非表示にする。
 *
 * issued > 0 かつ failed === 0：成功（success スタイル）
 * issued > 0 かつ failed > 0：部分失敗（warning スタイル）
 * issued === 0 かつ failed > 0：全件失敗（danger スタイル）
 * issued === 0 かつ failed === 0：何も表示しない
 */
export function ResultBanner({
  issued,
  failed,
  successLabel,
  failedLabel = "件失敗",
  paramKeys = { issued: "issued", failed: "failed" },
}: ResultBannerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  if (issued <= 0 && failed <= 0) return null;

  const dismiss = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramKeys.issued);
    params.delete(paramKeys.failed);
    const next = params.toString();
    startTransition(() =>
      router.replace(next ? `${pathname}?${next}` : pathname)
    );
  };

  const variant: "success" | "warning" | "danger" =
    failed === 0 ? "success" : issued === 0 ? "danger" : "warning";

  const containerClass = cn(
    "mb-6 flex items-start gap-4 rounded-2xl border px-5 py-4",
    variant === "success" && "border-success bg-success-light",
    variant === "warning" && "border-warning bg-warning-light",
    variant === "danger" && "border-danger bg-danger-light"
  );

  const iconClass = cn(
    "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl text-white",
    variant === "success" && "bg-success",
    variant === "warning" && "bg-warning",
    variant === "danger" && "bg-danger"
  );

  const textColor = cn(
    "font-bold",
    variant === "success" && "text-success",
    variant === "warning" && "text-warning",
    variant === "danger" && "text-danger"
  );

  const Icon = variant === "success" ? CheckCircle2 : AlertTriangle;

  return (
    <div role="status" className={containerClass}>
      <div className={iconClass}>
        <Icon className="h-6 w-6" strokeWidth={2} />
      </div>
      <div className="flex-1">
        <div className={cn("text-[15px]", textColor)}>
          {issued > 0 && (
            <>
              <strong className="text-[18px]">{issued}</strong>
              {successLabel}しました
            </>
          )}
          {issued > 0 && failed > 0 && "、"}
          {failed > 0 && (
            <>
              <strong className="text-[18px]">{failed}</strong>
              {failedLabel}しました
            </>
          )}
        </div>
        {failed > 0 && (
          <div className="mt-1 text-[13px] text-text-secondary">
            失敗の詳細はサーバーログを確認してください。
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="このメッセージを閉じる"
        className="rounded-lg p-1 text-text-secondary transition-colors hover:bg-bg-muted"
      >
        <X className="h-5 w-5" strokeWidth={2} />
      </button>
    </div>
  );
}
