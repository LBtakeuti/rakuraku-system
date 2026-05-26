"use client";

import { useRouter } from "next/navigation";
import { Plus, Eye } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/common/status-badge";
import {
  DataTable,
  SearchBar,
  ChipRow,
  useTableParams,
  type DataColumn,
} from "@/components/common/data-table";
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
  const { pushWith } = useTableParams();

  const columns: DataColumn<SalesOrderRow>[] = [
    {
      key: "orderNo",
      header: "伝票番号",
      cell: (o) => (
        <span className="font-mono tabular-nums font-bold">{o.orderNo}</span>
      ),
    },
    { key: "orderDate", header: "注文日", cell: (o) => formatDate(o.orderDate) },
    {
      key: "deliveryDate",
      header: "納品予定日",
      cell: (o) => formatDate(o.deliveryDate),
    },
    {
      key: "customer",
      header: "お客様",
      cell: (o) => <span className="font-bold">{o.customerName}</span>,
    },
    {
      key: "amount",
      header: "金額(税込)",
      align: "right",
      cell: (o) => (
        <span className="font-mono tabular-nums">{formatYen(o.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      header: "状態",
      cell: (o) => (
        <StatusBadge variant={statusVariant[o.status]}>
          {SALES_ORDER_STATUS_LABEL[o.status]}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8 flex flex-wrap gap-3">
        <Link
          href="/orders/new"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-[15px] font-bold text-white shadow-[0_2px_6px_rgba(15,23,42,0.06)] transition-colors hover:bg-primary-hover"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
          新しい注文を受ける
        </Link>
      </div>

      <div className="mb-8 rounded-2xl border border-border-light bg-bg-surface p-6 shadow-[0_2px_6px_rgba(15,23,42,0.06)]">
        <div className="mb-4">
          <SearchBar
            initialValue={query}
            placeholder="伝票番号、お客様名で検索..."
            ariaLabel="注文検索"
            onSearch={(term) => pushWith({ q: term || null, page: null })}
          />
        </div>
        <div className="mb-2">
          <ChipRow
            label="状態:"
            active={status}
            options={[
              { value: "all", label: "すべて" },
              { value: "pending", label: "納品待ち" },
              { value: "fulfilled", label: "納品済み" },
              { value: "cancelled", label: "取消し済み" },
            ]}
            onChange={(v) =>
              pushWith({ status: v === "all" ? null : v, page: null })
            }
          />
        </div>
        <ChipRow
          label="期間:"
          active={period}
          options={[
            { value: "today", label: "今日" },
            { value: "this_week", label: "今週" },
            { value: "this_month", label: "今月" },
            { value: "last_month", label: "先月" },
            { value: "all", label: "すべて" },
          ]}
          onChange={(v) =>
            pushWith({ period: v === "all" ? null : v, page: null })
          }
        />
      </div>

      <DataTable
        rows={rows}
        total={total}
        columns={columns}
        rowKey={(o) => o.id}
        unitLabel="件の注文があります"
        emptyMessage="注文が見つかりませんでした"
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        page={page}
        pageSize={pageSize}
        onPageChange={(p) => pushWith({ page: String(p) })}
        trailing={(o) => (
          <Link
            href={`/orders/${o.id}`}
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
