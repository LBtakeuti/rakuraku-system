"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search as SearchIcon, Eye, PackagePlus, PackageCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { TextInput } from "@/components/forms/text-input";
import { Chip } from "@/components/forms/chip";
import { StatusBadge } from "@/components/common/status-badge";
import type {
  PurchaseOrderRow,
  PurchaseOrderStatus,
} from "@/types/purchase-order";
import { PO_STATUS_LABEL } from "@/types/purchase-order";
import { cn } from "@/lib/utils";

type PurchaseOrdersTableProps = {
  rows: PurchaseOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status: "all" | "ordered" | "partial" | "received" | "cancelled";
};

const statusVariant: Record<
  PurchaseOrderStatus,
  "success" | "warning" | "info" | "danger" | "muted"
> = {
  draft: "muted",
  ordered: "info",
  partial: "warning",
  received: "success",
  cancelled: "danger",
};

function formatDate(iso: string | null): string {
  return iso ? iso.replaceAll("-", "/") : "—";
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

function ProgressBar({
  received,
  total,
}: {
  received: number;
  total: number;
}) {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((received / total) * 100));
  const variant = pct === 0 ? "empty" : pct >= 100 ? "full" : "partial";
  return (
    <div className="min-w-[140px]">
      <div className="mb-1 flex items-center justify-between text-[12px] text-text-secondary">
        <span>
          {received.toLocaleString("ja-JP")} / {total.toLocaleString("ja-JP")} 個
        </span>
        <span className="font-mono tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            variant === "full" && "bg-success",
            variant === "partial" && "bg-warning",
            variant === "empty" && "bg-bg-muted"
          )}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export function PurchaseOrdersTable({
  rows,
  total,
  page,
  pageSize,
  query,
  status,
}: PurchaseOrdersTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(query);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setSearchTerm(query);
  }, [query]);

  const pushWith = (mods: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(mods)) {
      if (v === null || v === "") params.delete(k);
      else params.set(k, v);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  const onSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    pushWith({ q: searchTerm.trim() || null, page: null });
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href="/receivings"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <PackagePlus className="h-5 w-5" strokeWidth={2.5} />
          入荷を登録する
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-border-light bg-bg-surface p-5 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <form onSubmit={onSearch} className="mb-3 flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
              strokeWidth={2}
            />
            <TextInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="発注番号、仕入先で検索..."
              className="pl-10"
              aria-label="発注検索"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-5 py-2.5 text-[15px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
          >
            検索
          </button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-text-secondary">
            状態:
          </span>
          <Chip active={status === "all"} onClick={() => pushWith({ status: null, page: null })}>
            すべて
          </Chip>
          <Chip
            active={status === "ordered"}
            onClick={() => pushWith({ status: "ordered", page: null })}
          >
            発注済み
          </Chip>
          <Chip
            active={status === "partial"}
            onClick={() => pushWith({ status: "partial", page: null })}
          >
            一部入荷
          </Chip>
          <Chip
            active={status === "received"}
            onClick={() => pushWith({ status: "received", page: null })}
          >
            全量入荷
          </Chip>
          <Chip
            active={status === "cancelled"}
            onClick={() => pushWith({ status: "cancelled", page: null })}
          >
            取消し済み
          </Chip>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
          <strong className="font-bold text-text-primary">{total}</strong> 件の発注があります
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                <th className="px-4 py-3">発注番号</th>
                <th className="px-4 py-3">発注日</th>
                <th className="px-4 py-3">入荷予定日</th>
                <th className="px-4 py-3">仕入先</th>
                <th className="px-4 py-3 text-right">金額(税込)</th>
                <th className="px-4 py-3">入荷状況</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-text-muted">
                    発注が見つかりませんでした
                  </td>
                </tr>
              )}
              {rows.map((p) => (
                <tr
                  key={p.id}
                  className="cursor-pointer border-b border-border-light text-[14px] text-text-primary transition-colors last:border-b-0 hover:bg-primary-lighter"
                  onClick={() => router.push(`/purchase-orders/${p.id}`)}
                >
                  <td className="px-4 py-3 font-mono tabular-nums font-bold">
                    {p.purchaseOrderNo}
                  </td>
                  <td className="px-4 py-3">{formatDate(p.orderDate)}</td>
                  <td className="px-4 py-3">{formatDate(p.expectedDeliveryDate)}</td>
                  <td className="px-4 py-3 font-bold">{p.supplierName}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatYen(p.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <ProgressBar
                      received={p.receivedQuantity}
                      total={p.totalQuantity}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={statusVariant[p.status]}>
                      {PO_STATUS_LABEL[p.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    {p.status === "ordered" || p.status === "partial" ? (
                      <Link
                        href={`/receivings?po=${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-success px-3 py-1.5 text-[13px] font-semibold text-white shadow-[0_1px_3px_rgba(5,150,105,0.2)] transition-colors hover:bg-success/90"
                      >
                        <PackageCheck className="h-3.5 w-3.5" strokeWidth={2} />
                        入荷確定
                      </Link>
                    ) : (
                      <Link
                        href={`/purchase-orders/${p.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
                      >
                        <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                        詳細
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border-light px-5 py-3 text-[13px] text-text-secondary">
            <div>
              {page} / {totalPages} ページ
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => pushWith({ page: String(page - 1) })}
                className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                前へ
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => pushWith({ page: String(page + 1) })}
                className="rounded-lg border border-border-default bg-bg-surface px-3 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
