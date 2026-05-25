"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search as SearchIcon, Plus, Eye } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { TextInput } from "@/components/forms/text-input";
import { Chip } from "@/components/forms/chip";
import { StatusBadge } from "@/components/common/status-badge";
import type { SalesOrderRow, SalesOrderStatus } from "@/types/sales-order";
import { SALES_ORDER_STATUS_LABEL } from "@/types/sales-order";

type OrdersTableProps = {
  rows: SalesOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status: "all" | "pending" | "fulfilled" | "cancelled";
  period: "today" | "this_week" | "this_month" | "last_month" | "all";
};

const statusVariant: Record<
  SalesOrderStatus,
  "success" | "warning" | "info" | "danger" | "muted"
> = {
  draft: "muted",
  pending: "warning",
  partial: "info",
  fulfilled: "success",
  cancelled: "danger",
};

function formatDate(iso: string): string {
  return iso.replaceAll("-", "/");
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export function OrdersTable({
  rows,
  total,
  page,
  pageSize,
  query,
  status,
  period,
}: OrdersTableProps) {
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
          href="/orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          新しい注文を受ける
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
              placeholder="伝票番号、お客様名で検索..."
              className="pl-10"
              aria-label="注文検索"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-5 py-2.5 text-[15px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
          >
            検索
          </button>
        </form>

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-text-secondary">
            状態:
          </span>
          <Chip active={status === "all"} onClick={() => pushWith({ status: null, page: null })}>
            すべて
          </Chip>
          <Chip
            active={status === "pending"}
            onClick={() => pushWith({ status: "pending", page: null })}
          >
            納品待ち
          </Chip>
          <Chip
            active={status === "fulfilled"}
            onClick={() => pushWith({ status: "fulfilled", page: null })}
          >
            納品済み
          </Chip>
          <Chip
            active={status === "cancelled"}
            onClick={() => pushWith({ status: "cancelled", page: null })}
          >
            取消し済み
          </Chip>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-text-secondary">
            期間:
          </span>
          <Chip active={period === "today"} onClick={() => pushWith({ period: "today", page: null })}>
            今日
          </Chip>
          <Chip
            active={period === "this_week"}
            onClick={() => pushWith({ period: "this_week", page: null })}
          >
            今週
          </Chip>
          <Chip
            active={period === "this_month"}
            onClick={() => pushWith({ period: "this_month", page: null })}
          >
            今月
          </Chip>
          <Chip
            active={period === "last_month"}
            onClick={() => pushWith({ period: "last_month", page: null })}
          >
            先月
          </Chip>
          <Chip
            active={period === "all"}
            onClick={() => pushWith({ period: null, page: null })}
          >
            すべて
          </Chip>
        </div>
      </div>

      <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
          <strong className="font-bold text-text-primary">{total}</strong> 件の注文があります
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                <th className="px-4 py-3">伝票番号</th>
                <th className="px-4 py-3">注文日</th>
                <th className="px-4 py-3">納品予定日</th>
                <th className="px-4 py-3">お客様</th>
                <th className="px-4 py-3 text-right">金額(税込)</th>
                <th className="px-4 py-3">状態</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    注文が見つかりませんでした
                  </td>
                </tr>
              )}
              {rows.map((o) => (
                <tr
                  key={o.id}
                  className="cursor-pointer border-b border-border-light text-[14px] text-text-primary transition-colors last:border-b-0 hover:bg-primary-lighter"
                  onClick={() => router.push(`/orders/${o.id}`)}
                >
                  <td className="px-4 py-3 font-mono tabular-nums font-bold">
                    {o.orderNo}
                  </td>
                  <td className="px-4 py-3">{formatDate(o.orderDate)}</td>
                  <td className="px-4 py-3">{formatDate(o.deliveryDate)}</td>
                  <td className="px-4 py-3 font-bold">{o.customerName}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatYen(o.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge variant={statusVariant[o.status]}>
                      {SALES_ORDER_STATUS_LABEL[o.status]}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/orders/${o.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
                    >
                      <Eye className="h-3.5 w-3.5" strokeWidth={2} />
                      詳細
                    </Link>
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
