"use client";

import { useRouter } from "next/navigation";
import {
  Eye,
  JapaneseYen,
  PackageCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DataTable,
  SearchBar,
  useTableParams,
  type DataColumn,
} from "@/components/common/data-table";
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
  const { pushWith } = useTableParams();

  const columns: DataColumn<SalesInvoiceRow>[] = [
    {
      key: "invoiceNo",
      header: "納品書番号",
      cell: (r) => (
        <span className="font-mono tabular-nums font-bold">{r.invoiceNo}</span>
      ),
    },
    { key: "date", header: "納品日", cell: (r) => formatDate(r.invoiceDate) },
    {
      key: "customer",
      header: "お客様",
      cell: (r) => <span className="font-bold">{r.customerName}</span>,
    },
    {
      key: "lineCount",
      header: "商品数",
      align: "right",
      cell: (r) => <span className="tabular-nums">{r.lineCount}</span>,
    },
    {
      key: "subtotal",
      header: "税抜金額",
      align: "right",
      cell: (r) => (
        <span className="font-mono tabular-nums">{formatYen(r.subtotal)}</span>
      ),
    },
    {
      key: "tax",
      header: "消費税",
      align: "right",
      cell: (r) => (
        <span className="font-mono tabular-nums text-text-secondary">
          {formatYen(r.taxAmount)}
        </span>
      ),
    },
    {
      key: "total",
      header: "合計（税込）",
      align: "right",
      cell: (r) => (
        <span className="font-mono tabular-nums font-bold">
          {formatYen(r.totalAmount)}
        </span>
      ),
    },
    {
      key: "billing",
      header: "請求",
      cell: (r) =>
        r.billingStatus === "billed" ? (
          <StatusBadge variant="success">請求済み</StatusBadge>
        ) : (
          <StatusBadge variant="muted">未請求</StatusBadge>
        ),
    },
  ];

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
              pushWith({
                period: p.value === "this_month" ? null : p.value,
                page: null,
              })
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

      <div className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <SearchBar
          initialValue={query}
          placeholder="納品書番号、お客様名で検索..."
          ariaLabel="売上検索"
          onSearch={(term) => pushWith({ q: term || null, page: null })}
        />
      </div>

      <DataTable
        rows={rows}
        total={total}
        columns={columns}
        rowKey={(r) => r.id}
        unitLabel={`件の売上（${periodLabel}）`}
        emptyMessage="対象期間に納品書がありません"
        onRowClick={(r) => router.push(`/sales/${r.id}`)}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => pushWith({ page: String(p) })}
        trailing={(r) => (
          <Link
            href={`/sales/${r.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border-default px-3 py-1.5 text-[13px] font-semibold text-text-primary transition-colors hover:bg-bg-muted"
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={2} />
            詳細
          </Link>
        )}
      />
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
    <div className="rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
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
