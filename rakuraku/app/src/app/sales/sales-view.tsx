"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search as SearchIcon,
  Eye,
  JapaneseYen,
  PackageCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { TextInput } from "@/components/forms/text-input";
import { StatusBadge } from "@/components/common/status-badge";
import type {
  SalesInvoiceRow,
  SalesSummary,
} from "@/types/sales-invoice";
import { cn } from "@/lib/utils";

type SalesViewProps = {
  rows: SalesInvoiceRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  period: "today" | "this_month" | "last_month" | "this_year" | "all";
  summary: SalesSummary;
  periodLabel: string;
};

function formatDate(iso: string): string {
  return iso.replaceAll("-", "/");
}

function formatYen(v: number): string {
  return `¥${Math.round(v).toLocaleString("ja-JP")}`;
}

export function SalesView({
  rows,
  total,
  page,
  pageSize,
  query,
  period,
  summary,
  periodLabel,
}: SalesViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(query);
  const [, startTransition] = useTransition();

  useEffect(() => setSearchTerm(query), [query]);

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
      <div className="mb-6 inline-flex rounded-xl border border-border-default bg-bg-surface p-1">
        {[
          { value: "today", label: "今日" },
          { value: "this_month", label: "今月" },
          { value: "last_month", label: "先月" },
          { value: "this_year", label: "今年" },
          { value: "all", label: "全期間" },
        ].map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() =>
              pushWith({ period: p.value === "this_month" ? null : p.value, page: null })
            }
            className={cn(
              "rounded-lg px-4 py-2 text-[14px] font-semibold transition-colors",
              period === p.value
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-primary"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          icon={<JapaneseYen className="h-6 w-6" strokeWidth={2} />}
          iconClass="bg-primary-light text-primary"
          label={`${periodLabel}の売上（税込）`}
          value={formatYen(summary.totalAmount)}
        />
        <SummaryCard
          icon={<PackageCheck className="h-6 w-6" strokeWidth={2} />}
          iconClass="bg-[#d1fae5] text-success"
          label="納品件数"
          value={`${summary.invoiceCount.toLocaleString("ja-JP")}件`}
        />
        <SummaryCard
          icon={<Users className="h-6 w-6" strokeWidth={2} />}
          iconClass="bg-[#fed7aa] text-[#c2410c]"
          label="取引したお客様"
          value={`${summary.customerCount.toLocaleString("ja-JP")}社`}
        />
      </div>

      <div className="mb-6 rounded-2xl border border-border-light bg-bg-surface p-5 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <form onSubmit={onSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted"
              strokeWidth={2}
            />
            <TextInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="納品書番号、お客様名で検索..."
              className="pl-10"
              aria-label="売上検索"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl border border-border-default bg-bg-surface px-5 py-2.5 text-[15px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
          >
            検索
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-border-light bg-bg-surface shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="border-b border-border-light px-5 py-3 text-[13px] text-text-secondary">
          <strong className="font-bold text-text-primary">{total}</strong>{" "}
          件の売上（{periodLabel}）
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border-light bg-bg-muted text-[13px] font-semibold text-text-secondary">
                <th className="px-4 py-3">納品書番号</th>
                <th className="px-4 py-3">納品日</th>
                <th className="px-4 py-3">お客様</th>
                <th className="px-4 py-3 text-right">商品数</th>
                <th className="px-4 py-3 text-right">税抜金額</th>
                <th className="px-4 py-3 text-right">消費税</th>
                <th className="px-4 py-3 text-right">合計（税込）</th>
                <th className="px-4 py-3">請求</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-text-muted"
                  >
                    対象期間に納品書がありません
                  </td>
                </tr>
              )}
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer border-b border-border-light text-[14px] text-text-primary transition-colors last:border-b-0 hover:bg-primary-lighter"
                  onClick={() => router.push(`/sales/${r.id}`)}
                >
                  <td className="px-4 py-3 font-mono tabular-nums font-bold">
                    {r.invoiceNo}
                  </td>
                  <td className="px-4 py-3">{formatDate(r.invoiceDate)}</td>
                  <td className="px-4 py-3 font-bold">{r.customerName}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {r.lineCount}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">
                    {formatYen(r.subtotal)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums text-text-secondary">
                    {formatYen(r.taxAmount)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                    {formatYen(r.totalAmount)}
                  </td>
                  <td className="px-4 py-3">
                    {r.billingStatus === "billed" ? (
                      <StatusBadge variant="success">請求済み</StatusBadge>
                    ) : (
                      <StatusBadge variant="muted">未請求</StatusBadge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/sales/${r.id}`}
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

function SummaryCard({
  icon,
  iconClass,
  label,
  value,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border-light bg-bg-surface p-5 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
      <div
        className={cn(
          "mb-3 flex h-12 w-12 items-center justify-center rounded-xl",
          iconClass
        )}
      >
        {icon}
      </div>
      <div className="text-[13px] text-text-secondary">{label}</div>
      <div className="mt-1 font-mono tabular-nums text-[24px] font-bold text-text-primary">
        {value}
      </div>
    </div>
  );
}
